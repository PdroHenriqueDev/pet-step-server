import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import StripeUtils from '../utils/stripe';
import {Owner} from '../interfaces/owner';
import DogWalkerRepository from './dogWalkerRepository';
import {calculateWalkCost} from '../utils/calculateWalkCost';
import {SocketInit} from '../websocket/testClas';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {WalkProps} from '../interfaces/walk';
import NotificatinUtils from '../utils/notification';
import {DogWalkerProps} from '../interfaces/dogWalker';
import {UserRole} from '../enums/role';
import {SocketResponse} from '../enums/socketResponse';
import {WalkEvents} from '../enums/walk';

class WalkRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get client() {
    return MongoConnection.getInstance().getClient();
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

  async getRequestById(requestId: string): Promise<RepositoryResponse> {
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
  }): Promise<RepositoryResponse> {
    try {
      const dogWalkerResult =
        await DogWalkerRepository.findDogWalkerById(dogWalkerId);

      if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
        return {
          status: 404,
          data: 'Dog walker não encontrado',
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
          data: 'Algo de errado.',
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
    } catch (error) {
      console.log('Error calculating walk:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async requestWalk(calculationId: string): Promise<RepositoryResponse> {
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

      const dogWalker = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalker) {
        return {
          status: 404,
          data: 'Dog walker não encontrado',
        };
      }

      const {currentWalk: dogWalkerIsBusy} = dogWalker;

      if (dogWalkerIsBusy) {
        return {
          status: 409,
          data: 'Dog walker não está mais disponível',
        };
      }

      const owner = await this.ownerCollection.findOne<Owner>({
        _id: new ObjectId(ownerId),
      });

      if (!owner) {
        return {
          status: 404,
          data: 'Usuário não encontrado',
        };
      }

      const {currentWalk} = owner;

      if (currentWalk) {
        return {
          status: 409,
          data: 'Já tem um passeio em andamento',
        };
      }

      const {costDetails, receivedLocation} = calculation;

      const TAX_PERCENTAGE = 0.3;

      const totalCost = costDetails.totalCost;
      const serviceFee = parseFloat((totalCost * TAX_PERCENTAGE).toFixed(2));
      const finalCost = parseFloat((totalCost - serviceFee).toFixed(2));

      const durationMinutes = costDetails.walkPrice.durationMinutes;
      const numberOfDogs = costDetails.dogPrice.numberOfDogs;

      const displayData = {
        dogWalker: {
          _id: dogWalkerId,
          name: dogWalker.name,
          rate: dogWalker.rate,
        },
        owner: {
          _id: ownerId,
          name: owner.name,
          rate: owner.rate,
        },
        walk: {
          totalCost,
          serviceFee: TAX_PERCENTAGE,
          finalCost,
          durationMinutes,
          numberOfDogs,
          receivedLocation,
        },
      };

      const requestRideCollection = await this.requestRideCollection.insertOne({
        calculationId: calculation._id,
        displayData,
        status: WalkEvents.PENDING,
        createdAt: this.currentDate,
        updatedAt: this.currentDate,
      });

      const requestId = requestRideCollection.insertedId;

      const {deviceToken} = dogWalker as DogWalkerProps;

      if (!deviceToken) {
        return {
          status: 500,
          data: 'Não conseguimos notificar o Dog Walker',
        };
      }

      const result = await NotificatinUtils.sendNotification({
        title: 'Novo Passeio Disponível!',
        body: 'Você recebeu uma solicitação de passeio. Aceita o passeio?',
        token: deviceToken,
        data: {
          requestId: requestId.toString(),
        },
      });

      if (result.status !== 200) {
        await this.requestRideCollection.updateOne(
          {_id: requestId},
          {
            $set: {
              status: WalkEvents.SERVER_ERROR,
            },
          },
        );

        return {
          status: 500,
          data: 'Não conseguimos notificar o Dog Walker',
        };
      }

      const updateResults = await Promise.all([
        this.ownerCollection.updateOne(
          {_id: new ObjectId(ownerId)},
          {
            $set: {
              currentWalk: {
                requestId,
                status: WalkEvents.PENDING,
              },
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalkerId)},
          {
            $set: {
              currentWalk: {
                requestId,
                status: WalkEvents.PENDING,
              },
            },
          },
        ),
      ]);

      if (updateResults.some(result => result.modifiedCount === 0)) {
        return {
          status: 500,
          data: 'Não foi possível solicitar o passeio.',
        };
      }

      return {
        status: 200,
        data: {
          requestId,
        },
      };
    } catch (err) {
      console.log(`Error ao solicitar passeio: ${err}`);
      return {
        status: 500,
        data: 'Algo de errado.',
      };
    }
  }

  private async handleInvalidRideRequest(requestId: string) {
    await this.requestRideCollection.updateOne(
      {_id: new ObjectId(requestId)},
      {$set: {status: WalkEvents.INVALID_REQUEST}},
    );

    this.socket.publishEventToRoom(
      requestId,
      SocketResponse.DogWalker,
      WalkEvents.INVALID_REQUEST,
    );
  }

  private async handleFailedRideRequest(requestId: string, status: WalkEvents) {
    const requestRide = await this.requestRideCollection.findOne({
      _id: new ObjectId(requestId),
    });

    if (!requestRide) return;

    const {displayData} = requestRide;
    const {owner, dogWalker} = displayData;

    await Promise.all([
      this.ownerCollection.updateOne(
        {_id: new ObjectId(owner._id as string)},
        {$set: {currentWalk: null}},
      ),
      this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalker._id as string)},
        {$set: {currentWalk: null}},
      ),
      this.requestRideCollection.updateOne(
        {_id: new ObjectId(requestId)},
        {$set: {status}},
      ),
    ]);

    this.socket.publishEventToRoom(requestId, SocketResponse.DogWalker, status);
  }

  async acceptRide(requestId: string): Promise<RepositoryResponse> {
    try {
      const requestRide = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!requestRide) {
        await this.handleInvalidRideRequest(requestId);

        this.socket.publishEventToRoom(
          requestId,
          SocketResponse.DogWalker,
          WalkEvents.INVALID_REQUEST,
        );

        return {
          status: 404,
          data: 'Requisição inválida',
        };
      }

      const {status, displayData} = requestRide;

      if (
        status === WalkEvents.ACCEPTED_SUCCESSFULLY ||
        status === WalkEvents.CANCELLED
      ) {
        return {
          status: 400,
          data:
            status === WalkEvents.ACCEPTED_SUCCESSFULLY
              ? 'Passeio já foi aceito.'
              : 'Passeio foi cancelado.',
        };
      }

      const {dogWalker, owner, walk} = displayData;

      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(owner._id as string),
      });

      if (!ownerExists) {
        await this.handleInvalidRideRequest(requestId);

        return {
          status: 404,
          data: 'Requisição inválida.',
        };
      }

      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalker._id as string),
      });

      if (!dogWalkerExists) {
        await this.handleInvalidRideRequest(requestId);

        return {
          status: 404,
          data: 'Requisição inválida.',
        };
      }

      const {customerStripe, defaultPayment} = ownerExists;
      const {stripeAccountId} = dogWalkerExists;
      const {totalCost} = walk;

      const valueInCents = Math.round(totalCost * 100);

      const paymentStatus = await StripeUtils.handlePayment({
        requestId,
        valueInCents,
        customerStripeId: customerStripe.id,
        defaultPayment,
        dogWalkerStripeAccountId: stripeAccountId,
      });

      if (
        paymentStatus.status !== 'succeeded' &&
        paymentStatus.status !== 'processing'
      ) {
        await this.requestRideCollection.updateOne(
          {_id: new ObjectId(requestId)},
          {$set: {status: WalkEvents.PAYMENT_FAILURE}},
        );

        await this.ownerCollection.updateOne(
          {_id: new ObjectId(owner._id as string)},
          {$set: {currentWalk: null}},
        );

        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalker._id as string)},
          {$set: {currentWalk: null}},
        );

        this.socket.publishEventToRoom(
          requestId,
          SocketResponse.DogWalker,
          WalkEvents.PAYMENT_FAILURE,
        );

        return {
          status: 400,
          data: 'Erro no pagamento',
        };
      }

      const paymentIntentId = paymentStatus.id;

      await Promise.all([
        this.requestRideCollection.updateOne(
          {_id: new ObjectId(requestId)},
          {$set: {status: WalkEvents.ACCEPTED_SUCCESSFULLY, paymentIntentId}},
        ),
        this.ownerCollection.updateOne(
          {_id: new ObjectId(owner._id)},
          {
            $set: {
              currentWalk: {
                requestId,
                status: WalkEvents.ACCEPTED_SUCCESSFULLY,
              },
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalker._id)},
          {
            $set: {
              currentWalk: {
                requestId,
                status: WalkEvents.ACCEPTED_SUCCESSFULLY,
              },
            },
          },
        ),
      ]);

      this.socket.publishEventToRoom(
        requestId,
        SocketResponse.DogWalker,
        WalkEvents.ACCEPTED_SUCCESSFULLY,
      );

      return {
        status: 200,
        data: requestId,
      };
    } catch (error) {
      console.error(`Error aceitando o passeio ${requestId}:`, error);
      await this.handleFailedRideRequest(requestId, WalkEvents.SERVER_ERROR);

      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }

  async getRequestData(requestId: string): Promise<RepositoryResponse> {
    try {
      const requestRide = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!requestRide)
        return {
          status: 404,
          data: 'Solicitação não existe',
        };

      const {dogWalker, calculation} = requestRide;
      const {_id, name, rate} = dogWalker ?? {};

      const {costDetails} = calculation ?? {};
      const {walkPrice} = costDetails ?? {};
      const {durationMinutes} = walkPrice ?? {};

      const response = {
        dogWalker: {
          _id: _id ?? null,
          name: name ?? null,
          rate: rate ?? null,
        },
        durationMinutes: durationMinutes ?? null,
      };

      return {
        status: 200,
        data: response,
      };
    } catch (error) {
      console.error('Erro ao obter dados da solicitação:', error);
      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }

  async requestsByOwner(
    ownerId: string,
    page: number = 1,
  ): Promise<RepositoryResponse<WalkProps[]>> {
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    try {
      const requests = await this.requestRideCollection
        .find(
          {
            'calculation.ownerId': ownerId,
            status: WalkEvents.COMPLETED,
          },
          {
            projection: {
              _id: 1,
              'dogWalker.name': 1,
              'dogWalker.profileUrl': 1,
              'calculation.costDetails.walkPrice.price': 1,
              createdAt: 1,
            },
          },
        )
        .skip(skip)
        .limit(pageSize)
        .toArray();

      const responses = requests.map(request => {
        const {_id, dogWalker, calculation, createdAt} = request;
        const {name, profileUrl} = dogWalker ?? {};

        const {costDetails} = calculation ?? {};
        const {walkPrice} = costDetails ?? {};
        const {price} = walkPrice ?? {};

        return {
          _id,
          dogWalker: {
            name: name ?? null,
            profileUrl: profileUrl ?? null,
          },
          price: price ?? null,
          startDate: createdAt ?? null,
        };
      });

      return {
        status: 200,
        data: responses,
      };
    } catch (error) {
      console.error('Erro ao listar solicitação:', error);
      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }

  async denyWalk(
    requestId: string,
    role: UserRole,
  ): Promise<RepositoryResponse> {
    try {
      const request = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!request) {
        return {
          status: 400,
          data: 'Solicitação não encontrada.',
        };
      }

      if (request?.status !== WalkEvents.PENDING) {
        return {
          status: 400,
          data: 'Solicitação não pode ser negada.',
        };
      }

      const {owner, dogWalker} = request.displayData;

      if (!owner || !dogWalker) {
        return {
          status: 400,
          data: 'Informações de proprietário ou passeador estão ausentes.',
        };
      }

      await Promise.all([
        this.requestRideCollection.updateOne(
          {_id: new ObjectId(requestId)},
          {
            $set: {
              status: WalkEvents.REQUEST_DENIED,
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalker._id)},
          {
            $set: {
              currentWalk: null,
            },
          },
        ),
        this.ownerCollection.updateOne(
          {_id: new ObjectId(owner._id)},
          {
            $set: {
              currentWalk: null,
            },
          },
        ),
      ]);

      this.socket.publishEventToRoom(
        requestId,
        role === UserRole.DogWalker
          ? SocketResponse.DogWalker
          : SocketResponse.Owner,
        WalkEvents.REQUEST_DENIED,
      );

      return {
        status: 200,
        data: 'Solicitação negada.',
      };
    } catch (error) {
      console.log('Erro ao negar solicitação:', error);
      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }

  async cancelWalk(
    requestId: string,
    role: UserRole,
  ): Promise<RepositoryResponse> {
    try {
      const request = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!request) {
        return {
          status: 400,
          data: 'Solicitação não encontrada.',
        };
      }

      if (
        request?.status === WalkEvents.CANCELLED ||
        request?.status === WalkEvents.IN_PROGRESS
      ) {
        return {
          status: 400,
          data:
            request?.status === WalkEvents.CANCELLED
              ? 'Solicitação já cancelada.'
              : 'Não é possível cancelar um passeio em andamento.',
        };
      }

      const {displayData, paymentIntentId} = request;

      const {owner, dogWalker, walk} = displayData;

      if (!owner || !dogWalker || !paymentIntentId || !walk) {
        return {
          status: 500,
          data: 'Erro interno.',
        };
      }

      const {finalCost} = walk;

      const finalCostInCents = Math.round(finalCost * 100);

      const refund = await StripeUtils.handleRefund({
        paymentIntentId,
        requestId,
        amountInCents: finalCostInCents,
      });

      const {status: refundStatus, data: refundData} = refund;

      if (refundStatus !== 200) {
        return {
          status: refundStatus,
          data: refundData,
        };
      }

      await Promise.all([
        this.requestRideCollection.updateOne(
          {_id: new ObjectId(requestId)},
          {
            $set: {
              status: WalkEvents.CANCELLED,
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalker._id)},
          {
            $set: {
              currentWalk: null,
            },
          },
        ),
        this.ownerCollection.updateOne(
          {_id: new ObjectId(owner._id)},
          {
            $set: {
              currentWalk: null,
            },
          },
        ),
      ]);

      this.socket.publishEventToRoom(
        requestId,
        role === UserRole.DogWalker
          ? SocketResponse.DogWalker
          : SocketResponse.Owner,
        WalkEvents.CANCELLED,
      );

      return {
        status: 200,
        data: 'Passeio cancelado.',
      };
    } catch (error) {
      console.log('Erro ao cancelar passeio:', error);
      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }

  async startWalk(
    requestId: string,
    role: UserRole,
  ): Promise<RepositoryResponse> {
    try {
      const request = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!request || request?.status !== WalkEvents.ACCEPTED_SUCCESSFULLY) {
        return {
          status: 400,
          data: !request
            ? 'Solicitação não encontrada.'
            : 'Solicitação não pode ser aceita.',
        };
      }

      const {displayData} = request;

      const {owner, dogWalker} = displayData;

      await Promise.all([
        this.requestRideCollection.updateOne(
          {_id: new ObjectId(requestId)},
          {
            $set: {
              status: WalkEvents.IN_PROGRESS,
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalker._id)},
          {
            $set: {
              currentWalk: {
                requestId,
                status: WalkEvents.IN_PROGRESS,
              },
            },
          },
        ),
        this.ownerCollection.updateOne(
          {_id: new ObjectId(owner._id)},
          {
            $set: {
              currentWalk: {
                requestId,
                status: WalkEvents.IN_PROGRESS,
              },
            },
          },
        ),
      ]);

      this.socket.publishEventToRoom(
        requestId,
        role === UserRole.DogWalker
          ? SocketResponse.DogWalker
          : SocketResponse.Owner,
        WalkEvents.IN_PROGRESS,
      );

      return {
        status: 200,
        data: 'Passeio iniciado com sucesso.',
      };
    } catch (error) {
      console.log('Error starting walk:', error);
      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }
}

export default new WalkRepository();
