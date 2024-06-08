import { ObjectId } from 'mongodb';
import MongoConnection from '../database/MongoConnection';
import FirebaseRepository from './firebaseRepository';

class DogWalkerRepository {
    get db() {
        return MongoConnection.getInstance().getdataBase();
    }

    constructor() {
    }

    async addDogWalker(walker: any) {
        try {
            const collection = this.db.collection('dogwalkers');
            // collection.createIndex({ location: "2dsphere" })
            const location = {
                type: "Point",
                coordinates: [walker.longitude, walker.latitude]
            };
            const data = await collection.insertOne({ ...walker, location });
           
            return {
                status: 201,
                data,
            }
        } catch (error) {
            console.error('Error adding dog walker:', error);
            return {
                status: 500,
                data: 'Error'
            }
        }
    }

    async findNearestDogWalkers(latitude: number, longitude: number, radiusInMeters: number = 10000) {  
        try {
            const collection = this.db.collection('dogwalkers');
            
            const nearestDogWalkers = await collection.find({
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [longitude, latitude] },
                        $maxDistance: radiusInMeters,
                    }
                }
            }).toArray();
   
            return {
                status: 200,
                data: nearestDogWalkers,
            }
        } catch (error) {
            console.log(error)
            return {
                status: 500,
                data: 'Error'
            }
        }      
    }

    async findDogWalkerById(id: string) {
        try {
            const collection = this.db.collection('dogwalkers');
            const dogWalker = await collection.findOne({ _id: new ObjectId(id) });

            if (!dogWalker) {
                return {
                    status: 404,
                    data: 'Dog walker not found',
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

    async sendNotificationDogWalker({ dogWalkerId, title, body }: { dogWalkerId: string; title: string; body: string; }) {
        try {
            const dogWalkerResult = await this.findDogWalkerById(dogWalkerId);

            if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
                return {
                    status: 404,
                    error: 'Dog walker não encontrado'
                }
            }

            const { token } = dogWalkerResult.data as any;
        
            const result = await FirebaseRepository.sendNotification({ title, body, token });

            return {
                status: 200,
                data: result,
            }

        } catch(err) {
            console.log('Got error =>', err)
        }
    }
}

export default new DogWalkerRepository();