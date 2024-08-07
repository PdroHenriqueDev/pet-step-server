import { ObjectId } from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import StripeUtils from '../utils/stripe';


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
            const { email, name } = owner;

            const ownerExists = await this.ownerCollection.findOne({ email, });

            if (ownerExists) {
                return {
                    status: 201,
                    data: 'Usuário já cadastrado',
                }
            }

            const location = {
                type: "Point",
                coordinates: [owner.longitude, owner.latitude]
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
                createdAt: this.currentDate,
                updatedAt: this.currentDate,
            };

            const data = await this.ownerCollection.insertOne(newOwner);
           
            return {
                status: 201,
                data,
            }
        } catch (error) {
            console.error('Error adding owner:', error);
            return {
                status: 500,
                data: 'Error'
            }
        }
    }

    async findOwnerById(id: string) {
        try {
            const owner = await this.ownerCollection.findOne({ _id: new ObjectId(id) });

            if (!owner) {
                return {
                    status: 404,
                    data: 'Owner not found',
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
}

export default new OwnerRepository();