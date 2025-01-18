import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import {getDistance} from 'geolib';
import {DogWalkerProps} from '../interfaces/dogWalker';
import stripePackage from 'stripe';
import {SocketInit} from '../websocket';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {hash, genSalt} from 'bcrypt';
import StripeUtils from '../utils/stripe';
import {DogWalkerApplicationStatus} from '../enums/dogWalkerApplicationStatus';
import {uploadToS3} from '../utils/s3Utils';
import {generateAccessToken} from '../utils/authToken';
import {UserRole} from '../enums/role';
import {
  sendAccountClosureEmail,
  sendEmailVerification,
} from '../utils/sendEmail';

class DogWalkerRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalker');
  }

  get calculationRequestCollection() {
    return this.db.collection('calculationRequest');
  }

  get requestRideCollection() {
    return this.db.collection('requestRide');
  }

  get dogWalkerApplicationCollection() {
    return this.db.collection('dogWalkerApplication');
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

  async addDogWalker(dogWalker: DogWalkerProps): Promise<RepositoryResponse> {
    try {
      // this.dogWalkersCollection.createIndex({location: '2dsphere'});

      const {password, email, document} = dogWalker;

      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        $or: [{email}, {document}],
      });

      if (dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker já cadastrado',
        };
      }

      const salt = await genSalt();
      const hashedPassword = await hash(password!, salt);

      const newDogWalker = {
        ...dogWalker,
        password: hashedPassword,
        rate: 5,
        totalRatings: 0,
        isOnline: false,
        status: DogWalkerApplicationStatus.PendingDocuments,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const data = await this.dogWalkersCollection.insertOne(newDogWalker);

      const emailToken = generateAccessToken(
        data.insertedId,
        UserRole.DogWalker,
      );

      await sendEmailVerification({
        to: email as string,
        token: emailToken,
      });

      return {
        status: 201,
        data: 'Verifique seu e-mail antes de fazer login.',
      };
    } catch (error) {
      console.error('Error adding dog walker:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async addLocationToDogWalker({
    walkerId,
    longitude,
    latitude,
  }: {
    walkerId: string;
    longitude: number;
    latitude: number;
  }): Promise<RepositoryResponse> {
    try {
      // this.dogWalkersCollection.createIndex({location: '2dsphere'});

      const location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };

      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(walkerId)},
        {$set: {location, updatedAt: new Date()}},
      );

      return {
        status: 200,
        data: 'Localização atualizada',
      };
    } catch (error) {
      console.error('Error adding location:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async updateOnlineStatus({
    dogWalkerId,
    isOnline,
    longitude,
    latitude,
  }: {
    dogWalkerId: string;
    isOnline: boolean;
    longitude: string;
    latitude: string;
  }): Promise<RepositoryResponse> {
    try {
      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker não existe',
        };
      }

      const {stripeAccountId, bank} = dogWalkerExists;

      if (!stripeAccountId) {
        return {
          status: 400,
          data: 'Você precisa adicionar uma conta bancária para que possa receber os valores dos passeios.',
        };
      }

      if (!bank?.bankDocumentVerified) {
        const status = await StripeUtils.checkDocumentStatus(stripeAccountId);

        if (status !== 'verified') {
          return {
            status: 400,
            data: 'Sua conta bancária precisa ser verificada para que você possa receber os valores dos passeios.',
          };
        }
      }

      const updateFields: {
        isOnline: boolean;
        updatedAt: Date;
        location?: {type: string; coordinates: string[]};
      } = {
        isOnline,
        updatedAt: new Date(),
      };

      if (isOnline) {
        updateFields.location = {
          type: 'Point',
          coordinates: [longitude, latitude],
        };
      }

      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalkerId)},
        {$set: updateFields},
      );

      return {
        status: 200,
        data: 'Status online atualizado com sucesso',
      };
    } catch (error) {
      console.log('Error updating status online:', error);
      return {
        status: 500,
        data: 'Error interno ao atualizar status online',
      };
    }
  }

  async findNearestDogWalkers({
    latitude,
    longitude,
    radiusInMeters = 10000,
    limit = 10,
    skip = 0,
  }: {
    latitude: number;
    longitude: number;
    radiusInMeters?: number;
    limit?: number;
    skip?: number;
  }) {
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
        .skip(skip)
        .limit(limit)
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
      console.log('Error getting nearest dog walkers:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async findRecommendedDogWalkers({
    latitude,
    longitude,
    radiusInMeters = 10000,
    limit = 10,
    skip = 0,
  }: {
    latitude: number;
    longitude: number;
    radiusInMeters?: number;
    limit?: number;
    skip?: number;
  }) {
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
          isOnline: true,
        })
        .skip(skip)
        .limit(limit)
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
          ...(dogWalker as unknown as DogWalkerProps),
          distance: distanceInKilometers,
        };
      });

      dogWalkersWithDistance.sort(
        (a, b) => parseFloat(a.distance) - parseFloat(b.distance),
      );

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
      const dogWalker = await this.dogWalkersCollection.findOne(
        {
          _id: new ObjectId(id),
        },
        {projection: {password: 0}},
      );

      if (!dogWalker) {
        return {
          status: 404,
          data: 'Dog walker  não encontrado',
        };
      }

      const data = dogWalker?.location
        ? {
            ...dogWalker,
            location: {
              longitude: dogWalker.location.coordinates[0],
              latitude: dogWalker.location.coordinates[1],
            },
          }
        : dogWalker;

      return {
        status: 200,
        data,
      };
    } catch (error) {
      console.log('Error finding dog walker:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async updateDeviceToken(
    walkerId: string,
    deviceToken: string,
  ): Promise<RepositoryResponse> {
    try {
      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(walkerId)},
        {$set: {deviceToken, updatedAt: new Date()}},
      );

      return {
        status: 200,
        data: 'Token atualizado',
      };
    } catch (error) {
      console.error('Error adding device token:', error);
      return {
        status: 500,
        data: 'Error interno',
      };
    }
  }

  async termsAcceptance(dogwalkerId: string): Promise<RepositoryResponse> {
    try {
      await Promise.all([
        this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogwalkerId)},
          {
            $set: {
              status: DogWalkerApplicationStatus.Approved,
              termsAccepted: {
                version: '1.0',
                acceptedAt: new Date(),
              },
              updatedAt: new Date(),
            },
          },
        ),
        this.dogWalkerApplicationCollection.updateOne(
          {dogWalkerId: new ObjectId(dogwalkerId)},
          {
            $set: {
              status: DogWalkerApplicationStatus.Approved,
              updatedAt: new Date(),
            },
          },
        ),
      ]);

      return {
        status: 200,
        data: 'Termo aceito com sucesso',
      };
    } catch (error) {
      console.log('Error accepting term: ', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async updateDogWalker({
    dogWalkerId,
    field,
    newValue,
  }: {
    dogWalkerId: string;
    field: string;
    newValue: unknown;
  }): Promise<RepositoryResponse> {
    try {
      const updateFields = {
        [field]: newValue,
        updatedAt: new Date(),
      };

      const result = await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalkerId)},
        {$set: updateFields},
      );

      if (result.modifiedCount === 0) {
        return {
          status: 404,
          data: 'Dog walker não encontrado ou nenhum campo foi modificado',
        };
      }

      return {
        status: 200,
        data: 'Dog walker atualizado com sucesso',
      };
    } catch (error) {
      console.log('Erro ao atualizar dog walker:', error);
      return {
        status: 500,
        data: 'Erro interno ao atualizar dog walker',
      };
    }
  }

  async addStripeAccount({
    dogWalkerId,
    reqIp,
    dob,
    bankCode,
    agencyNumber,
    accountNumber,
    zipCode,
  }: {
    dogWalkerId: string;
    reqIp: string;
    bankCode: string;
    agencyNumber: string;
    accountNumber: string;
    dob: {
      day: number;
      month: number;
      year: number;
    };
    zipCode?: number;
  }): Promise<RepositoryResponse> {
    try {
      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker não existe',
        };
      }

      const {email, name, lastName, phone, address, document, stripeAccountId} =
        dogWalkerExists;

      let stripeAccountIdToUse = stripeAccountId;
      if (!stripeAccountIdToUse) {
        const createStripeAccount = await StripeUtils.createAccount({
          email: email as string,
          firstName: name,
          lastName,
          dob,
          address: {
            city: address.city,
            country: 'BR',
            state: address.state,
            postal_code: zipCode ?? address.zipCode,
            line1: address.street,
          },
          reqIp,
          idNumber: String(document),
          phone,
        });

        stripeAccountIdToUse = createStripeAccount.id;

        await this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalkerId)},
          {
            $set: {
              stripeAccountId: stripeAccountIdToUse,
              updatedAt: new Date(),
            },
          },
        );
      }

      const [agencyWithoutDV, agencyDV] = [
        agencyNumber.slice(0, 4),
        agencyNumber.length === 5 ? agencyNumber.slice(-1) : null,
      ];

      await StripeUtils.addExternalAccount({
        accountId: stripeAccountIdToUse,
        name,
        lastName,
        routingNumber: agencyDV
          ? `${bankCode}-${agencyWithoutDV}-${agencyDV}`
          : `${bankCode}-${agencyWithoutDV}`,
        accountNumber,
      });

      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalkerId)},
        {
          $set: {
            birthdate: {
              day: dob.day,
              month: dob.month,
              year: dob.year,
            },
            bank: {
              bankCode,
              agencyNumber,
              accountNumber,
            },
            updatedAt: new Date(),
          },
        },
      );

      return {
        status: 200,
        data: 'Conta adicionada com sucesso',
      };
    } catch (error) {
      console.log('Error adding Stripe account:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  private getTranslatedMessage(requirement: string): string {
    const messages: {[key: string]: string} = {
      'individual.verification.document':
        'É necessário enviar um documento de verificação.',
      'individual.verification.additional_document':
        'É necessário enviar um documento adicional de verificação.',
    };

    return messages[requirement] || 'Requisito desconhecido.';
  }

  async accountRequirements(dogWalkerId: string) {
    try {
      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker não existe',
        };
      }

      const errorMessages: string[] = [];
      const {stripeAccountId} = dogWalkerExists;

      if (!stripeAccountId) {
        errorMessages.push('É necessário adicionar uma conta');
        return {
          status: 200,
          data: errorMessages,
        };
      }

      const stripeRequirements =
        await StripeUtils.accountRequirements(stripeAccountId);

      if (stripeRequirements && stripeRequirements.length > 0) {
        stripeRequirements.forEach(requirement => {
          errorMessages.push(this.getTranslatedMessage(requirement));
        });

        return {
          status: 200,
          data: errorMessages,
        };
      }

      return {
        status: 200,
        data: errorMessages,
      };
    } catch (error) {
      console.log('Erro dog walkers account:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async accountDocumentUpload(
    dogWalkerId: string,
    document: Express.Multer.File,
  ) {
    try {
      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker não existe',
        };
      }

      const {stripeAccountId} = dogWalkerExists;

      if (!stripeAccountId) {
        return {
          status: 400,
          data: 'É necessário adicionar uma conta primeiro.',
        };
      }

      await StripeUtils.uploadDocument(stripeAccountId, document);

      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalkerId)},
        {$set: {'bank.bankDocumentSent': true}},
      );

      return {
        status: 200,
        data: 'Documento enviado com sucesso.',
      };
    } catch (error) {
      console.log('Erro uploading dog walkers accounts document:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async accountCheckStatus(dogWalkerId: string) {
    try {
      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker não existe',
        };
      }

      const {stripeAccountId} = dogWalkerExists;

      if (!stripeAccountId) {
        return {
          status: 400,
          data: 'É necessário adicionar uma conta primeiro.',
        };
      }

      const status = await StripeUtils.checkDocumentStatus(stripeAccountId);

      const message: {[key: string]: string} = {
        unverified: 'Envie novamente',
        pending: 'Aguarde a confirmação',
        verified: 'Verificado com sucesso',
      };

      if (status === 'verified') {
        await this.dogWalkersCollection.updateOne(
          {_id: new ObjectId(dogWalkerId)},
          {$set: {'bank.bankDocumentVerified': true}},
        );
      }

      return {
        status: 200,
        data: message[status as string],
      };
    } catch (error) {
      console.log('Erro checking dog walkers account status:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async updateProfileImage(
    dogWalkerId: string,
    file: Express.Multer.File,
  ): Promise<RepositoryResponse> {
    try {
      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(dogWalkerId),
      });

      if (!dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker não existe',
        };
      }

      const uploadResult = await uploadToS3({
        fileBuffer: file.buffer,
        key: dogWalkerId,
        storageClass: 'STANDARD',
        fileType: file.mimetype,
        bucketName: process.env.S3_BUCKET_PROFILE as string,
      });

      const publicUrl = uploadResult.Location;

      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalkerId)},
        {
          $set: {
            profileUrl: publicUrl,
            updatedAt: new Date(),
          },
        },
      );

      return {
        status: 200,
        data: publicUrl,
      };
    } catch (error) {
      console.log('Error updating dog walker profile image:', error);
      return {
        status: 500,
        data: 'Erro interno ao atualizar a imagem de perfil',
      };
    }
  }

  async notifyDogWalkersAboutClosure(): Promise<RepositoryResponse> {
    try {
      const dogWalkers = await this.dogWalkersCollection
        .find({
          status: {
            $in: [
              DogWalkerApplicationStatus.Approved,
              DogWalkerApplicationStatus.PendingReview,
              DogWalkerApplicationStatus.PendingTerms,
            ],
          },
        })
        .toArray();

      if (dogWalkers.length === 0) {
        return {
          status: 200,
          data: 'Nenhum Dog Walker encontrado com os status especificados.',
        };
      }

      const emailResults = await Promise.allSettled(
        dogWalkers.map(async dogWalker => {
          const email = dogWalker.email;
          if (email) {
            return await sendAccountClosureEmail(email);
          }
        }),
      );

      const successfulEmails = emailResults.filter(
        result =>
          result.status === 'fulfilled' &&
          (result as unknown as PromiseFulfilledResult<{status: number}>).value
            .status === 200,
      );
      const failedEmails = emailResults.filter(
        result =>
          result.status === 'rejected' ||
          (result as unknown as PromiseFulfilledResult<{status: number}>).value
            .status !== 200,
      );

      return {
        status: 200,
        data: {
          sucess: `${successfulEmails.length} e-mails enviados com sucesso.`,
          fail: `${failedEmails.length} e-mails falharam.`,
          failedEmails,
        },
      };
    } catch (error) {
      console.error('Error notifying Dog Walkers about the end:', error);
      return {
        status: 500,
        data: 'Erro ao notificar Dog Walkers sobre o encerramento',
      };
    }
  }
}

export default new DogWalkerRepository();
