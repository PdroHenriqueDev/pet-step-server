import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import StripeUtils from '../utils/stripe';
import {Owner} from '../interfaces/owner';

class OwnerRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get ownerCollection() {
    return this.db.collection('owner');
  }

  currentDate = new Date();

  async add(owner: any) {
    try {
      const {email, name} = owner;

      const ownerExists = await this.ownerCollection.findOne({email});

      if (ownerExists) {
        return {
          status: 400,
          data: 'Usuário já cadastrado',
        };
      }

      const location = {
        type: 'Point',
        coordinates: [owner.longitude, owner.latitude],
      };

      const customerStripe = await StripeUtils.createStripeCustomer({
        email,
        name,
      });

      const dogsWithId = owner.dogs.map((dog: any) => ({
        ...dog,
        _id: new ObjectId(),
      }));

      const newOwner = {
        ...owner,
        customerStripe,
        location,
        dogs: dogsWithId,
        rate: 5,
        totalRatings: 0,
        currentWalk: null,
        createdAt: this.currentDate,
        updatedAt: this.currentDate,
      };

      const data = await this.ownerCollection.insertOne(newOwner);

      return {
        status: 201,
        data,
      };
    } catch (error) {
      console.error('Error adding owner:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async findOwnerById(id: string) {
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
        data: {
          message: 'Error',
        },
      };
    }
  }

  async listPayments(id: string) {
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

      const {customerStripe, defaultPayment} = owner;

      const paymentMethods = await StripeUtils.listPayments(customerStripe.id);

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
    paymentMethodId: string;
  }) {
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
}

export default new OwnerRepository();
