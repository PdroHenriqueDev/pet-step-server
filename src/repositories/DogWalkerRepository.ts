import MongoConnection from '../database/MongoConnection';

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
}

export default DogWalkerRepository;