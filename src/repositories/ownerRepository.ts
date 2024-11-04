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
    } catch {
      return {
        status: 500,
        data: {
          message: 'Error',
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
}

export default new OwnerRepository();
