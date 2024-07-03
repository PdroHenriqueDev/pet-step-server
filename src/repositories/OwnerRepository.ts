import { ObjectId } from 'mongodb';
import MongoConnection from '../database/mongoConnection';

class OwnerRepository {
    get db() {
        return MongoConnection.getInstance().getdataBase();
    }

    get ownerCollection() {
        return this.db.collection('owner');
    }

    async add(owner: any) {
        try {

            const location = {
                type: "Point",
                coordinates: [owner.longitude, owner.latitude]
            };

            const newOwner = {
                ...owner,
                location,
                rate: 5,
                totalRatings: 0,
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