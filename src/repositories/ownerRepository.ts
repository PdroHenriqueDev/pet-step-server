import {ObjectId, PushOperator} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import StripeUtils from '../utils/stripe';
import {Owner} from '../interfaces/owner';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {Dog} from '../interfaces/dog';
import {genSalt, hash} from 'bcrypt';
import {generateAccessToken} from '../utils/authToken';
import {UserRole} from '../enums/role';
import {sendEmailVerification} from '../utils/sendEmail';
import {uploadToS3} from '../utils/s3Utils';

class OwnerRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get ownerCollection() {
    return this.db.collection('owner');
  }

  currentDate = new Date();

  async add(owner: Owner): Promise<RepositoryResponse> {
    try {
      const {email, document, password} = owner;

      const ownerExists = await this.ownerCollection.findOne({
        $or: [{email}, {document}],
      });

      if (ownerExists) {
        return {
          status: 400,
          data: 'Usuário já cadastrado',
        };
      }

      // const location = {
      //   type: 'Point',
      //   coordinates: [owner.longitude, owner.latitude],
      // };

      // const customerStripe = await StripeUtils.createStripeCustomer({
      //   email,
      //   name,
      // });

      // const dogsWithId = owner.dogs.map((dog: Dog) => ({
      //   ...dog,
      //   _id: new ObjectId(),
      // }));

      const salt = await genSalt();
      const hashedPassword = await hash(password!, salt);

      const newOwner = {
        ...owner,
        password: hashedPassword,
        // stripeAccountId: customerStripe.id,
        // location,
        // dogs: dogsWithId,
        rate: 5,
        totalRatings: 0,
        currentWalk: null,
        createdAt: this.currentDate,
        updatedAt: this.currentDate,
      };

      const data = await this.ownerCollection.insertOne(newOwner);

      const emailToken = generateAccessToken(data.insertedId, UserRole.Owner);

      await sendEmailVerification({
        to: email as string,
        token: emailToken,
      });

      return {
        status: 201,
        data: 'Verifique seu e-mail antes de fazer login.',
      };
    } catch (error) {
      console.error('Error adding owner:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async findOwnerById(id: string): Promise<RepositoryResponse<Owner>> {
    try {
      const owner = await this.ownerCollection.findOne<Owner>({
        _id: new ObjectId(id),
      });

      if (!owner) {
        return {
          status: 404,
          data: 'Usuário não existe',
        };
      }

      return {
        status: 200,
        data: owner,
      };
    } catch (error) {
      console.log('Error finding owner:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async listPayments(id: string): Promise<RepositoryResponse> {
    try {
      const owner = await this.ownerCollection.findOne<Owner>({
        _id: new ObjectId(id),
      });

      if (!owner) {
        return {
          status: 404,
          data: 'Usuário não existe',
        };
      }

      const {customerStripeId, defaultPayment} = owner;

      if (!customerStripeId) {
        return {
          status: 200,
          data: [],
        };
      }

      const paymentMethods = await StripeUtils.listPayments(customerStripeId!);

      const methods = paymentMethods.map(({id, card, type}) => {
        const {brand, exp_month, exp_year, last4, funding} = card ?? {};

        const isSelected = defaultPayment === id;

        return {
          id,
          type,
          isSelected,
          card: {
            brand,
            exp_month,
            exp_year,
            last4,
            funding,
          },
        };
      });

      return {
        status: 200,
        data: methods,
      };
    } catch (error) {
      console.log('Error list payment:', error);
      return {
        status: 500,
        data: {
          data: 'Erro interono',
        },
      };
    }
  }

  async updateDefaultPaymentMethod({
    ownerId,
    paymentMethodId,
  }: {
    ownerId: string;
    paymentMethodId: string | null;
  }): Promise<RepositoryResponse> {
    try {
      const result = await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId)},
        {$set: {defaultPayment: paymentMethodId}},
      );

      if (result.matchedCount === 0) {
        return {
          status: 404,
          data: 'Usuário não encontrado',
        };
      }

      return {
        status: 200,
        data: 'Método de pagamento padrão atualizado com sucesso',
      };
    } catch (error) {
      console.error('Error updating default payment method:', error);
      return {
        status: 500,
        data: 'Erro ao atualizar o método de pagamento padrão',
      };
    }
  }

  async updateDeviceToken(
    walkerId: string,
    deviceToken: string,
  ): Promise<RepositoryResponse> {
    try {
      await this.ownerCollection.updateOne(
        {_id: new ObjectId(walkerId)},
        {$set: {deviceToken, updatedAt: this.currentDate}},
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

  async addDog(ownerId: string, dog: Dog): Promise<RepositoryResponse> {
    try {
      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(ownerId),
      });

      if (!ownerExists) {
        return {
          status: 400,
          data: 'Tutor não encontrado',
        };
      }

      const {dogs} = ownerExists;

      if (dogs && dogs.length > 10) {
        return {
          status: 400,
          data: 'É permitido cadastrar até 10 dogs. Exclua um antes de adicionar outro.',
        };
      }

      const dogWithId = {...dog, _id: new ObjectId()};

      await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId)},
        {
          $push: {dogs: dogWithId} as unknown as PushOperator<Document>,
          $set: {updatedAt: this.currentDate},
        },
      );

      return {
        status: 200,
        data: dogWithId,
      };
    } catch (error) {
      console.log('Error adding dog:', error);
      return {
        status: 500,
        data: 'Erro ao adicionar o cachorro',
      };
    }
  }

  async setupIntent(ownerId: string): Promise<RepositoryResponse> {
    try {
      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(ownerId),
      });

      if (!ownerExists) {
        return {
          status: 400,
          data: 'Tutor não encontrado',
        };
      }

      const {customerStripeId, email, name} = ownerExists;

      let customerId = customerStripeId;

      if (!customerStripeId) {
        const customerStripe = await StripeUtils.createStripeCustomer({
          email,
          name,
        });

        await this.ownerCollection.updateOne(
          {_id: new ObjectId(ownerId)},
          {
            $set: {customerStripeId: customerStripe.id},
          },
        );

        customerId = customerStripe.id;
      }

      const customerStripe = await StripeUtils.setupIntent(customerId);

      return {
        status: 200,
        data: customerStripe,
      };
    } catch (error) {
      console.log('Error adding payment:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async updateDogWalker({
    ownerId,
    field,
    newValue,
  }: {
    ownerId: string;
    field: string;
    newValue: unknown;
  }): Promise<RepositoryResponse> {
    try {
      const updateFields = {
        [field]: newValue,
        updatedAt: new Date(),
      };

      const result = await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId)},
        {$set: updateFields},
      );

      if (result.modifiedCount === 0) {
        return {
          status: 404,
          data: 'Tutor não encontrado ou nenhum campo foi modificado',
        };
      }

      return {
        status: 200,
        data: 'Tutor atualizado com sucesso',
      };
    } catch (error) {
      console.log('Erro updating owner:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async updateDog(ownerId: string, dog: Dog): Promise<RepositoryResponse> {
    try {
      const ownerExists = await this.ownerCollection.findOne({
        _id: new ObjectId(ownerId),
      });

      if (!ownerExists) {
        return {
          status: 400,
          data: 'Tutor não encontrado',
        };
      }

      const result = await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId), 'dogs._id': new ObjectId(dog._id)},
        {
          $set: {
            'dogs.$.name': dog.name,
            'dogs.$.breed': dog.breed,
            'dogs.$.size': dog.size,
            updatedAt: this.currentDate,
          },
        },
      );

      if (result.modifiedCount === 0) {
        return {
          status: 404,
          data: 'Cão não encontrado ou nenhuma alteração realizada',
        };
      }

      return {
        status: 200,
        data: dog,
      };
    } catch (error) {
      console.log('Erro updating dog:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async deleteDog(ownerId: string, dogId: string): Promise<RepositoryResponse> {
    try {
      const result = await this.ownerCollection.updateOne(
        {_id: new ObjectId(ownerId)},
        {
          $pull: {
            dogs: {_id: new ObjectId(dogId)},
          } as unknown as PushOperator<Document>,
          $set: {updatedAt: this.currentDate},
        },
      );

      if (result.modifiedCount === 0) {
        return {
          status: 404,
          data: 'Cão não encontrado ou tutor não possui este cão',
        };
      }

      return {
        status: 200,
        data: 'Cão excluído com sucesso',
      };
    } catch (error) {
      console.log('Erro deleting dog:', error);
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
      const dogWalkerExists = await this.ownerCollection.findOne({
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

      await this.ownerCollection.updateOne(
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
      console.log('Error updating owner profile image:', error);
      return {
        status: 500,
        data: 'Erro interno ao atualizar a imagem de perfil',
      };
    }
  }
}

export default new OwnerRepository();
