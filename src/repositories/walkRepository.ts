import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import StripeUtils from '../utils/stripe';
import {Owner} from '../interfaces/owner';
import DogWalkerRepository from '../repositories/dogWalkerRepository';
import {calculateWalkCost} from '../utils/calculateWalkCost';
import {RideEvents} from '../enums/ride';
import FirebaseRepository from './firebaseRepository';
import {SocketInit} from '../websocket/testClas';

class WalkRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get ownerCollection() {
    return this.db.collection('owner');
  }

  get requestRideCollection() {
    return this.db.collection('requestRide');
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalkers');
  }

  get socket() {
    return SocketInit.getInstance();
  }

  currentDate = new Date();

  async getRequestById(requestId: string) {
    const requestRide = await this.requestRideCollection.findOne({
      _id: new ObjectId(requestId),
    });

    if (!requestRide)
      return {
        status: 404,
        data: 'Solicitação não existe',
      };

    return {
      status: 200,
      data: requestRide,
    };
  }

  async calculateWalk({
    dogWalkerId,
    numberOfDogs,
    walkDurationMinutes,
    ownerId,
    receivedLocation,
  }: {
    ownerId: string;
    dogWalkerId: string;
    numberOfDogs: number;
    walkDurationMinutes: number;
    receivedLocation: Location;
  }) {
    try {
      const dogWalkerResult =
        await DogWalkerRepository.findDogWalkerById(dogWalkerId);

      if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
        return {
          status: 404,
          error: 'Dog walker não encontrado',
        };
      }

      const costDetails = calculateWalkCost({
        numberOfDogs,
        walkDurationMinutes,
      });

      const insertResult =
        await DogWalkerRepository.calculationRequestCollection.insertOne({
          ownerId,
          dogWalkerId,
          costDetails,
          receivedLocation,
          createdAt: this.currentDate,
          updatedAt: this.currentDate,
        });

      if (!insertResult.insertedId) {
        return {
          status: 500,
          error: 'Algo de errado.',
        };
      }

      const request = {
        costDetails,
        receivedLocation,
        calculationId: insertResult.insertedId,
      };

      return {
        status: 200,
        data: request,
      };
    } catch (err) {
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async requestWalk(calculationId: string) {
    try {
      const calculation =
        await DogWalkerRepository.calculationRequestCollection.findOne({
          _id: new ObjectId(calculationId),
        });

      if (!calculation) {
        return {
          status: 404,
          data: 'Requisição inválida',
        };
      }

      const {dogWalkerId, ownerId} = calculation;

      const dogWalkerResult =
        await DogWalkerRepository.findDogWalkerById(dogWalkerId);

      if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
        return {
          status: 404,
          error: 'Dog walker não encontrado',
        };
      }

      const owner = await this.ownerCollection.findOne<Owner>({
        _id: new ObjectId(ownerId),
      });

      if (!owner)
        return {
          status: 404,
          error: 'Usuário não encontrado',
        };

      const {currentWalk} = owner;

      if (currentWalk)
        return {
          status: 400,
          error: 'Já tem um passeio em andamento',
        };

      const requestRideCollection = await this.requestRideCollection.insertOne({
        calculation,
        createdAt: this.currentDate,
        updatedAt: this.currentDate,
      });

      const requestId = requestRideCollection.insertedId;

      const updateResult = await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId)},
        {
          $set: {
            currentWalk: {
              requestId,
              status: RideEvents.PENDING,
            },
          },
        },
      );

      if (updateResult.modifiedCount === 0) {
        return {
          status: 500,
          error: 'Não foi possível solicitar o passeio.',
        };
      }

      const {token} = dogWalkerResult.data as any;
      const result = await FirebaseRepository.sendNotification({
        title: 'Passeio',
        body: 'Aceita o passeio?',
        token,
      });

      if (result.status !== 200) {
        return {
          status: 500,
          error: 'Não conseguimos notificar o Dog Walker',
        };
      }

      return {
        status: 200,
        data: {
          requestId,
        },
      };
    } catch (err) {
      console.log(`Error: ${err}`);
      return {
        status: 500,
        data: 'Algo de errado.',
      };
    }
  }

  private async handleInvalidRideRequest(requestId: string) {
    await this.requestRideCollection.updateOne(
      {_id: new ObjectId(requestId)},
      {$set: {status: RideEvents.INVALID_REQUEST}},
    );

    this.socket.publishEventToRoom(
      requestId,
      'dog_walker_response',
      RideEvents.INVALID_REQUEST,
    );
  }

  private async handleFailedRideRequest(requestId: string, status: RideEvents) {
    const requestRide = await this.requestRideCollection.findOne({
      _id: new ObjectId(requestId),
    });

    if (!requestRide) return;

    const {calculation} = requestRide;
    const {ownerId} = calculation;

    await Promise.all([
      this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId as string)},
        {$set: {currentWalk: null}},
      ),
      this.requestRideCollection.updateOne(
        {_id: new ObjectId(requestId)},
        {$set: {status}},
      ),
    ]);

    this.socket.publishEventToRoom(requestId, 'dog_walker_response', status);
  }

  async acceptRide(requestId: string) {
    try {
      const requestRide = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!requestRide) {
        await this.handleInvalidRideRequest(requestId);

        this.socket.publishEventToRoom(
          requestId,
          'dog_walker_response',
          RideEvents.INVALID_REQUEST,
        );

        return {
          status: 404,
          data: 'Requisição inválida',
        };
      }

      const {calculation, status} = requestRide;

      if (
        status === RideEvents.ACCEPTED_SUCCESSFULLY ||
        status === RideEvents.CANCELLED
      ) {
        return {
          status: 400,
          data:
            status === RideEvents.ACCEPTED_SUCCESSFULLY
              ? 'Passeio já foi aceito'
              : 'Passeio foi cancelado',
        };
      }

      const {ownerId, costDetails} = calculation;

      const owner = await this.ownerCollection.findOne({
        _id: new ObjectId(ownerId as string),
      });

      if (!owner) {
        await this.handleInvalidRideRequest(requestId);

        return {
          status: 404,
          data: 'Requisição inválida',
        };
      }

      const {customerStripe, defaultPayment} = owner;

      const {totalCost} = costDetails;

      const valueInCents = Math.round(totalCost * 100);

      const paymentStatus = await StripeUtils.handlePayment({
        requestId,
        valueInCents,
        customerStripeId: customerStripe.id,
        defaultPayment,
      });

      if (
        paymentStatus.status !== 'succeeded' &&
        paymentStatus.status !== 'processing'
      ) {
        await this.requestRideCollection.updateOne(
          {_id: new ObjectId(requestId)},
          {$set: {status: RideEvents.PAYMENT_FAILURE}},
        );

        await this.ownerCollection.updateOne(
          {_id: new ObjectId(ownerId as string)},
          {$set: {currentWalk: null}},
        );

        this.socket.publishEventToRoom(
          requestId,
          'dog_walker_response',
          RideEvents.PAYMENT_FAILURE,
        );

        return {
          status: 400,
          data: 'Erro no pagamento',
        };
      }

      await this.requestRideCollection.updateOne(
        {_id: new ObjectId(requestId)},
        {$set: {status: RideEvents.ACCEPTED_SUCCESSFULLY}},
      );

      await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId)},
        {
          $set: {
            currentWalk: {requestId, status: RideEvents.ACCEPTED_SUCCESSFULLY},
          },
        },
      );

      this.socket.publishEventToRoom(
        requestId,
        'dog_walker_response',
        RideEvents.ACCEPTED_SUCCESSFULLY,
      );

      return {
        status: 200,
        data: requestId,
      };
    } catch (error) {
      console.error(`Error aceitando o passeio ${requestId}:`, error);
      await this.handleFailedRideRequest(requestId, RideEvents.SERVER_ERROR);

      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }
}

export default new WalkRepository();
