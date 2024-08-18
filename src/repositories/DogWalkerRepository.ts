import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import FirebaseRepository from './firebaseRepository';
import {getDistance} from 'geolib';
import {DogWalker} from '../interfaces/dogWalker';
import {calculateWalkCost} from '../utils/calculateWalkCost';
import stripePackage from 'stripe';
import {SocketInit} from '../websocket/testClas';
import {Location} from '../interfaces/location';
import {RideEvents} from '../enums/ride';
import {Owner} from '../interfaces/owner';

class DogWalkerRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalkers');
  }

  get feedbackCollection() {
    return this.db.collection('feedback');
  }

  get calculationRequestCollection() {
    return this.db.collection('calculationRequest');
  }

  get requestRideCollection() {
    return this.db.collection('requestRide');
  }

  get stripe() {
    return new stripePackage(process.env?.STRIPE_SECRET_KEY ?? '');
  }

  get ownerCollection() {
    return this.db.collection('owner');
  }

  get socket() {
    return SocketInit.getInstance();
  }

  currentDate = new Date();

  async addDogWalker(walker: any) {
    try {
      // collection.createIndex({ location: "2dsphere" })
      const location = {
        type: 'Point',
        coordinates: [walker.longitude, walker.latitude],
      };

      const newDogWalker = {
        ...walker,
        location,
        rate: 5,
        totalRatings: 0,
        isOnline: false,
        createdAt: this.currentDate,
        updatedAt: this.currentDate,
      };

      const data = await this.dogWalkersCollection.insertOne(newDogWalker);

      return {
        status: 201,
        data,
      };
    } catch (error) {
      console.error('Error adding dog walker:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async findNearestDogWalkers(
    latitude: number,
    longitude: number,
    radiusInMeters: number = 10000,
  ) {
    try {
      const nearestDogWalkers = await this.dogWalkersCollection
        .find({
          location: {
            $near: {
              $geometry: {type: 'Point', coordinates: [longitude, latitude]},
              $maxDistance: radiusInMeters,
            },
          },
          isOnline: true,
        })
        .toArray();

      const dogWalkersWithDistance = nearestDogWalkers.map(dogWalker => {
        const distanceInMeters = getDistance(
          {latitude, longitude},
          {
            latitude: dogWalker.location.coordinates[1],
            longitude: dogWalker.location.coordinates[0],
          },
        );
        const distanceInKilometers = (distanceInMeters / 1000).toFixed(2);
        return {
          ...dogWalker,
          distance: distanceInKilometers,
        };
      });

      return {
        status: 200,
        data: dogWalkersWithDistance,
      };
    } catch (error) {
      console.log(error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async findRecommededDogWalkers(
    latitude: number,
    longitude: number,
    radiusInMeters: number = 10000,
  ) {
    try {
      const recommedDogWalkers = await this.dogWalkersCollection
        .find({
          location: {
            $near: {
              $geometry: {type: 'Point', coordinates: [longitude, latitude]},
              $maxDistance: radiusInMeters,
            },
          },
          rate: {$gte: 4.5},
        })
        .toArray();

      const dogWalkersWithDistance = recommedDogWalkers.map(dogWalker => {
        const distanceInMeters = getDistance(
          {latitude, longitude},
          {
            latitude: dogWalker.location.coordinates[1],
            longitude: dogWalker.location.coordinates[0],
          },
        );
        const distanceInKilometers = (distanceInMeters / 1000).toFixed(2);

        return {
          ...(dogWalker as unknown as DogWalker),
          distance: distanceInKilometers,
        };
      });

      dogWalkersWithDistance.sort((a, b) => {
        if (a.isOnline === b.isOnline) {
          return parseFloat(a.distance) - parseFloat(b.distance);
        }
        return a.isOnline ? -1 : 1;
      });

      return {
        status: 200,
        data: dogWalkersWithDistance,
      };
    } catch (error) {
      console.log(error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async findDogWalkerById(id: string) {
    try {
      const dogWalker = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!dogWalker) {
        return {
          status: 404,
          data: 'Dog walker  não encontrado',
        };
      }

      return {
        status: 200,
        data: dogWalker,
      };
    } catch (error) {
      console.log('Error finding dog walker:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async sendNotificationDogWalker({
    dogWalkerId,
    title,
    body,
  }: {
    dogWalkerId: string;
    title: string;
    body: string;
  }) {
    try {
      const dogWalkerResult = await this.findDogWalkerById(dogWalkerId);

      if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
        return {
          status: 404,
          error: 'Dog walker não encontrado',
        };
      }

      const {token} = dogWalkerResult.data as any;

      const result = await FirebaseRepository.sendNotification({
        title,
        body,
        token,
      });

      return {
        status: 200,
        data: result,
      };
    } catch (err) {
      console.log('Got error =>', err);
    }
  }

  async saveFeedback({
    dogWalkerId,
    rate,
    comment,
  }: {
    dogWalkerId: string;
    rate: string;
    comment: string;
  }) {
    try {
      const dogWalkerResult = await this.findDogWalkerById(dogWalkerId);

      if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
        return {
          status: 404,
          error: 'Dog walker não encontrado',
        };
      }

      const feedbackResult = await this.feedbackCollection.insertOne({
        walker_id: dogWalkerId,
        rate,
        comment,
      });

      const dogWalker = dogWalkerResult.data as any;
      const newTotalRatings = dogWalker.totalRatings + 1;
      const newRate =
        ((dogWalker.rate * dogWalker.totalRatings + rate) as any) /
        newTotalRatings;

      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalkerId)},
        {
          $set: {
            rate: newRate,
            totalRatings: newTotalRatings,
          },
        },
      );

      return {
        status: 200,
        data: feedbackResult,
      };
    } catch (err) {
      console.log('Got error =>', err);
      return {
        status: 500,
        data: 'Error',
      };
    }
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
      const dogWalkerResult = await this.findDogWalkerById(dogWalkerId);

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

      const insertResult = await this.calculationRequestCollection.insertOne({
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
      const calculation = await this.calculationRequestCollection.findOne({
        _id: new ObjectId(calculationId),
      });

      if (!calculation) {
        return {
          status: 404,
          data: 'Requisição inválida',
        };
      }

      const {dogWalkerId, ownerId} = calculation;

      const dogWalkerResult = await this.findDogWalkerById(dogWalkerId);

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

      const requestRideCollection = await this.requestRideCollection.insertOne({
        calculation,
        createdAt: this.currentDate,
        updatedAt: this.currentDate,
      });

      const requestId = requestRideCollection.insertedId;

      const updateResult = await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId)},
        {$set: {currentWalk: requestId}},
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

  async acceptRide(requestId: string) {
    try {
      const requestRide = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!requestRide) {
        this.socket.publishEventToRoom(
          requestId,
          RideEvents.INVALID_REQUEST,
          'Requisição inválida',
        );
        return {
          status: 404,
          data: 'Requisição inválida',
        };
      }

      const {calculation} = requestRide;
      const {ownerId, costDetails} = calculation;

      const owner = await this.ownerCollection.findOne({
        _id: new ObjectId(ownerId as string),
      });

      if (!owner) {
        this.socket.publishEventToRoom(
          requestId,
          RideEvents.INVALID_REQUEST,
          'Requisição inválida',
        );
        return {
          status: 404,
          data: 'Requisição inválida',
        };
      }

      const {customerStripe, defaultPayment} = owner;

      const {totalCost} = costDetails;

      const valueInCents = Math.round(totalCost * 100);
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: valueInCents,
        currency: 'brl',
        customer: customerStripe.id,
        payment_method: defaultPayment,
        off_session: true,
        confirm: true,
        description: requestId,
      });

      if (
        paymentIntent.status !== 'succeeded' &&
        paymentIntent.status !== 'processing'
      ) {
        this.socket.publishEventToRoom(
          requestId,
          RideEvents.SERVER_ERROR,
          'Erro interno do servidor',
        );
        return {
          status: 500,
          data: 'Erro interno do servidor',
        };
      }

      this.socket.publishEventToRoom(
        requestId,
        RideEvents.SUCCESS,
        'Passeio aceito',
      );

      return {
        status: 200,
        data: requestId,
      };
    } catch (error) {
      console.error('Error aceitando o passeio:', error);
      this.socket.publishEventToRoom(
        requestId,
        RideEvents.SERVER_ERROR,
        'Erro interno do servidor',
      );
      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }
}

export default new DogWalkerRepository();
