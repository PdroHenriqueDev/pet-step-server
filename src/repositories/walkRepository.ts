import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import StripeUtils from '../utils/stripe';
import {Owner} from '../interfaces/owner';
import DogWalkerRepository from './dogWalkerRepository';
import {calculateWalkCost} from '../utils/calculateWalkCost';
import {SocketInit} from '../websocket';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {WalkProps} from '../interfaces/walk';
import NotificatinUtils from '../utils/notification';
import {DogWalkerProps} from '../interfaces/dogWalker';
import {UserRole} from '../enums/role';
import {SocketResponse} from '../enums/socketResponse';
import {WalkEvents} from '../enums/walk';
import FirebaseAdminUtil from '../utils/firebaseAdmin';
import {NotificationEnum} from '../enums/notification';

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
    return this.db.collection('dogwalker');
  }

  get socket() {
    return SocketInit.getInstance();
  }

  get notificationCollection() {
    return this.db.collection('notification');
  }

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
    dogs,
    walkDurationMinutes,
    ownerId,
    receivedLocation,
  }: {
    ownerId: string;
    dogWalkerId: string;
    dogs: string[];
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

      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(ownerId),
      });

      if (!ownerExists) {
        return {
          status: 400,
          data: 'Tutor não encontrado.',
        };
      }

      const costDetails = calculateWalkCost({
        numberOfDogs: dogs.length,
        walkDurationMinutes,
      });

      const insertResult =
        await DogWalkerRepository.calculationRequestCollection.insertOne({
          ownerId,
          dogWalkerId,
          dogs,
          costDetails,
          receivedLocation,
          createdAt: new Date(),
          updatedAt: new Date(),
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

      const {dogWalkerId, ownerId, dogs: dogsIds} = calculation;

      const dogWalker = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalker) {
        return {
          status: 404,
          data: 'Dog walker não encontrado',
        };
      }

      const {currentWalk: dogWalkerIsBusy, isOnline} = dogWalker;

      if (dogWalkerIsBusy || !isOnline) {
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

      const {currentWalk, dogs, defaultPayment} = owner;

      if (currentWalk) {
        return {
          status: 409,
          data: 'Já tem um passeio em andamento',
        };
      }

      if (!defaultPayment) {
        return {
          status: 400,
          data: 'Selecione um meio de pagamento.',
        };
      }

      const selectedDogs =
        dogs?.filter(dog => dogsIds.includes(dog._id?.toString())) || [];

      const {costDetails, receivedLocation} = calculation;

      const TAX_PERCENTAGE = 0.3;

      const totalCost = costDetails.totalCost;
      const serviceFee = parseFloat((totalCost * TAX_PERCENTAGE).toFixed(2));
      const finalCost = parseFloat((totalCost - serviceFee).toFixed(2));

      const durationMinutes = costDetails.walkPrice.durationMinutes;
      const numberOfDogs = costDetails.dogPrice.numberOfDogs;

      const displayData = {
        dogWalker: {
          _id: new ObjectId(dogWalkerId),
          name: dogWalker.name,
          rate: dogWalker.rate,
        },
        owner: {
          _id: new ObjectId(ownerId),
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
          dogs: selectedDogs.map(dog => ({
            _id: dog._id,
            name: dog.name,
            breed: dog.breed,
            size: dog.size,
          })),
        },
      };

      const requestRideCollection = await this.requestRideCollection.insertOne({
        calculationId: calculation._id,
        displayData,
        status: WalkEvents.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
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

      const notification = {
        userId: new ObjectId(dogWalkerId as string),
        role: UserRole.DogWalker,
        title: 'Novo Passeio Disponível!',
        message: 'Você recebeu uma solicitação de passeio. Aceita o passeio?',
        type: NotificationEnum.Walk,
        createdAt: new Date(),
        read: false,
        extraData: requestId,
      };

      this.notificationCollection.insertOne(notification);

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
      SocketResponse.Walk,
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

    this.socket.publishEventToRoom(requestId, SocketResponse.Walk, status);
  }

  async acceptRide(requestId: string): Promise<RepositoryResponse> {
    try {
      const requestRide = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!requestRide) {
        this.socket.publishEventToRoom(
          requestId,
          SocketResponse.Walk,
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

      const {
        customerStripeId,
        defaultPayment,
        deviceToken: ownerDeviceToken,
      } = ownerExists;
      const {stripeAccountId} = dogWalkerExists;
      const {totalCost} = walk;

      const valueInCents = Math.round(totalCost * 100);

      const paymentStatus = await StripeUtils.handlePayment({
        requestId,
        valueInCents,
        customerStripeId,
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
          SocketResponse.Walk,
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
              isOnline: false,
            },
          },
        ),
      ]);

      this.socket.publishEventToRoom(
        requestId,
        SocketResponse.Walk,
        WalkEvents.ACCEPTED_SUCCESSFULLY,
      );

      await FirebaseAdminUtil.createChat({
        chatId: requestId,
        dogWalkerId: dogWalker._id.toString(),
        ownerId: owner._id.toString(),
        dogWalkerToken: dogWalkerExists.deviceToken,
        ownerToken: ownerExists?.deviceToken ?? '',
      });

      await NotificatinUtils.sendNotification({
        title: 'Passeio Aceito!',
        body: 'Seu dog walker aceitou a solicitação. O passeio começará em breve.',
        token: ownerDeviceToken,
        data: {
          requestId: requestId.toString(),
        },
      });

      const notification = {
        userId: owner._id,
        role: UserRole.Owner,
        title: 'Passeio Aceito!',
        message:
          'Seu dog walker aceitou a solicitação. O passeio começará em breve.',
        type: NotificationEnum.Walk,
        createdAt: new Date(),
        read: false,
        extraData: requestId,
      };

      this.notificationCollection.insertOne(notification);

      return {
        status: 200,
        data: requestId,
      };
    } catch (error) {
      console.log(`Error accepting walk ${requestId}:`, error);
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

      const {dogWalker, walk, owner} = requestRide.displayData;
      const {
        _id: dogWalkerId,
        name: dogWalkerName,
        rate: dogWalkerRate,
      } = dogWalker;
      const {_id: ownerId, name: ownerName, rate: ownerRate} = owner;

      const {durationMinutes} = walk;

      const response = {
        dogWalker: {
          _id: dogWalkerId,
          name: dogWalkerName,
          rate: dogWalkerRate,
        },
        owner: {
          _id: ownerId,
          name: ownerName,
          rate: ownerRate,
        },
        durationMinutes: durationMinutes,
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
            'displayData.owner._id': new ObjectId(ownerId),
            status: WalkEvents.COMPLETED,
          },
          {
            projection: {
              _id: 1,
              'displayData.dogWalker.name': 1,
              'displayData.dogWalker._id': 1,
              'displayData.walk.totalCost': 1,
              'displayData.walk.durationMinutes': 1,
              createdAt: 1,
            },
          },
        )
        .skip(skip)
        .limit(pageSize)
        .toArray();

      const responses = requests.map(request => {
        const {
          _id,
          displayData: {dogWalker, walk},
          createdAt,
        } = request;

        return {
          _id,
          dogWalker,
          walk,
          startDate: createdAt,
        };
      });

      return {
        status: 200,
        data: responses as unknown as WalkProps[],
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

      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(owner._id as string),
      });

      if (!ownerExists || !dogWalker) {
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
        SocketResponse.Walk,
        WalkEvents.REQUEST_DENIED,
      );

      const {deviceToken} = ownerExists;

      await NotificatinUtils.sendNotification({
        title: 'Passeio Não Aceito',
        body: 'Infelizmente, o dog walker não pôde aceitar sua solicitação. Tente novamente ou escolha outro dog walker.',
        token: deviceToken,
        data: {
          requestId: requestId.toString(),
        },
      });

      const notification = {
        userId: owner._id,
        role: UserRole.Owner,
        title: 'Passeio Não Aceito',
        message:
          'Infelizmente, o dog walker não pôde aceitar sua solicitação. Tente novamente ou escolha outro dog walker.',
        type: NotificationEnum.Walk,
        createdAt: new Date(),
        read: false,
        extraData: requestId,
      };

      this.notificationCollection.insertOne(notification);

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

      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(owner._id as string),
      });

      if (!ownerExists || !dogWalker || !paymentIntentId || !walk) {
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
        SocketResponse.Walk,
        WalkEvents.CANCELLED,
      );

      const {deviceToken} = ownerExists;

      await NotificatinUtils.sendNotification({
        title: 'Passeio Cancelado',
        body: 'O dog walker precisou cancelar o passeio, mas não se preocupe! Escolha outro dog walker e continue garantindo momentos felizes para seu pet!',
        token: deviceToken,
        data: {
          requestId: requestId.toString(),
        },
      });

      const notification = {
        userId: owner._id,
        role: UserRole.Owner,
        title: 'Passeio Cancelado',
        message:
          'O dog walker precisou cancelar o passeio, mas não se preocupe! Escolha outro dog walker e continue garantindo momentos felizes para seu pet!',
        type: NotificationEnum.Walk,
        createdAt: new Date(),
        read: false,
        extraData: requestId,
      };

      this.notificationCollection.insertOne(notification);

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

      if (role !== UserRole.DogWalker) {
        return {
          status: 401,
          data: 'Você não está autorizado a aceitar o passeii',
        };
      }

      const {displayData} = request;

      const {owner, dogWalker} = displayData;

      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(owner._id as string),
      });

      if (!ownerExists) {
        return {
          status: 500,
          data: 'Erro interno.',
        };
      }

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
        SocketResponse.Walk,
        WalkEvents.IN_PROGRESS,
      );

      const {deviceToken} = ownerExists;

      await NotificatinUtils.sendNotification({
        title: 'Passeio Iniciado!',
        body: 'O passeio começou! Acompanhe o trajeto em tempo real e aproveite essa experiência incrível para seu pet!',
        token: deviceToken,
        data: {
          requestId: request._id.toString(),
        },
      });

      const notification = {
        userId: owner._id,
        role: UserRole.Owner,
        title: 'Passeio Iniciado!',
        message:
          'O passeio começou! Acompanhe o trajeto em tempo real e aproveite essa experiência incrível para seu pet!',
        type: NotificationEnum.Walk,
        createdAt: new Date(),
        read: false,
        extraData: request._id,
      };

      this.notificationCollection.insertOne(notification);

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

  async getWalkStatus(requestId: string): Promise<RepositoryResponse> {
    try {
      const request = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!request) {
        return {
          status: 404,
          data: 'Solicitação não encontrada.',
        };
      }

      const {status} = request;

      return {
        status: 200,
        data: status,
      };
    } catch (error) {
      console.error('Erro ao obter status da solicitação:', error);
      return {
        status: 500,
        data: 'Erro interno ao buscar o status do passeio.',
      };
    }
  }

  async completeWalk(requestId: string): Promise<RepositoryResponse> {
    try {
      const request = await this.requestRideCollection.findOne({
        _id: new ObjectId(requestId),
      });

      if (!request || request.status !== WalkEvents.IN_PROGRESS) {
        return {
          status: 400,
          data: !request
            ? 'Solicitação não encontrada.'
            : 'Passeio não está em andamento.',
        };
      }

      const {displayData} = request;
      const {owner, dogWalker, walk} = displayData;

      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(owner._id as string),
      });

      if (!ownerExists || !dogWalker || !walk) {
        return {
          status: 500,
          data: 'Erro interno.',
        };
      }

      await Promise.all([
        this.requestRideCollection.updateOne(
          {_id: new ObjectId(requestId)},
          {
            $set: {
              status: WalkEvents.COMPLETED,
              updatedAt: new Date(),
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: dogWalker._id},
          {
            $set: {
              currentWalk: null,
              pendingReview: {
                reviewedId: owner._id,
                profileUrl: owner?.profileUrl,
                requestId: new ObjectId(requestId),
              },
            },
          },
        ),
        this.ownerCollection.updateOne(
          {_id: owner._id},
          {
            $set: {
              currentWalk: null,
              pendingReview: {
                reviewedId: dogWalker._id,
                profileUrl: dogWalker?.profileUrl,
                requestId: new ObjectId(requestId),
              },
            },
          },
        ),
      ]);

      this.socket.publishEventToRoom(
        requestId,
        SocketResponse.Walk,
        WalkEvents.COMPLETED,
      );

      const {deviceToken} = ownerExists;

      await NotificatinUtils.sendNotification({
        title: 'Passeio Concluído!',
        body: `O passeio com ${dogWalker.name} foi concluído com sucesso.`,
        token: deviceToken,
        data: {
          requestId: requestId.toString(),
        },
      });

      const notification = {
        userId: owner._id,
        role: UserRole.Owner,
        title: 'Passeio Concluído!',
        message: `O passeio com ${dogWalker.name} foi concluído com sucesso.`,
        type: NotificationEnum.Walk,
        createdAt: new Date(),
        read: false,
        extraData: request._id,
      };

      this.notificationCollection.insertOne(notification);

      return {
        status: 200,
        data: 'Passeio finalizado com sucesso.',
      };
    } catch (error) {
      console.log('Error finalizing walk:', error);
      return {
        status: 500,
        data: 'Erro interno ao finalizar o passeio.',
      };
    }
  }

  async requestsByDogWalker(
    dogWalkerId: string,
    page: number = 1,
  ): Promise<RepositoryResponse> {
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    try {
      const requests = await this.requestRideCollection
        .find(
          {
            'displayData.dogWalker._id': new ObjectId(dogWalkerId),
            status: WalkEvents.COMPLETED,
          },
          {
            projection: {
              _id: 1,
              'displayData.owner.name': 1,
              'displayData.walk.finalCost': 1,
              createdAt: 1,
            },
          },
        )
        .skip(skip)
        .limit(pageSize)
        .toArray();

      const totalRequestsCount =
        await this.requestRideCollection.countDocuments({
          'displayData.dogWalker._id': new ObjectId(dogWalkerId),
          status: WalkEvents.COMPLETED,
        });

      const hasMore = totalRequestsCount > skip + requests.length;

      const responses = requests.map(request => {
        const {_id, displayData, createdAt} = request;

        return {
          _id,
          ownerName: displayData.owner.name,
          price: displayData.walk.finalCost,
          startDate: createdAt,
        };
      });

      return {
        status: 200,
        data: {
          results: responses,
          hasMore,
        },
      };
    } catch (error) {
      console.log('Error retrieving requests by dog walker:', error);
      return {
        status: 500,
        data: 'Erro interno do servidor',
      };
    }
  }

  async ownerCancelWalk(userId: string): Promise<RepositoryResponse> {
    try {
      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(userId),
      });

      if (!ownerExists) {
        return {
          status: 400,
          data: 'Tutor não encontrada.',
        };
      }

      const {currentWalk} = ownerExists;

      const request = await this.requestRideCollection.findOne({
        _id: new ObjectId(currentWalk.requestId),
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

      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalker._id as string),
      });

      if (!owner || !dogWalkerExists) {
        return {
          status: 400,
          data: 'Informações de proprietário ou passeador estão ausentes.',
        };
      }

      await Promise.all([
        this.requestRideCollection.updateOne(
          {_id: request._id},
          {
            $set: {
              status: WalkEvents.CANCELLED,
            },
          },
        ),
        this.dogWalkersCollection.updateOne(
          {_id: dogWalker._id},
          {
            $set: {
              currentWalk: null,
            },
          },
        ),
        this.ownerCollection.updateOne(
          {_id: owner._id},
          {
            $set: {
              currentWalk: null,
            },
          },
        ),
      ]);

      this.socket.publishEventToRoom(
        request._id.toString(),
        SocketResponse.Walk,
        WalkEvents.REQUEST_DENIED,
      );

      const {deviceToken} = dogWalkerExists;

      await NotificatinUtils.sendNotification({
        title: 'Passeio Cancelado',
        body: 'O tutor precisou cancelar o passeio. Fique disponível para outras oportunidades e continue proporcionando momentos incríveis para os pets!',
        token: deviceToken,
        data: {
          requestId: request._id.toString(),
        },
      });

      const notification = {
        userId: dogWalker._id,
        role: UserRole.DogWalker,
        title: 'Passeio Cancelado',
        message:
          'O tutor precisou cancelar o passeio. Fique disponível para outras oportunidades e continue proporcionando momentos incríveis para os pets!',
        type: NotificationEnum.Walk,
        createdAt: new Date(),
        read: false,
        extraData: request._id,
      };

      this.notificationCollection.insertOne(notification);

      return {
        status: 200,
        data: 'Solicitação cancelada.',
      };
    } catch (error) {
      console.log('Error owner cancelling request:', error);
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }
  }
}

export default new WalkRepository();
