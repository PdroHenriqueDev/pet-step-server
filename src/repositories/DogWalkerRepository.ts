import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
// import FirebaseRepository from './firebaseRepository';
import {getDistance} from 'geolib';
import {DogWalkerProps} from '../interfaces/dogWalker';
import stripePackage from 'stripe';
import {SocketInit} from '../websocket/testClas';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {hash, genSalt} from 'bcrypt';
import StripeUtils from '../utils/stripe';

class DogWalkerRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalkers');
  }

  get feedbackCollection() {
    return this.db.collection('feedback');
  }

  get calculationRequestCollection() {
    return this.db.collection('calculationRequest');
  }

  get requestRideCollection() {
    return this.db.collection('requestRide');
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

  currentDate = new Date();

  async addDogWalker(
    dogWalker: DogWalkerProps,
    reqIp: string,
  ): Promise<RepositoryResponse> {
    try {
      // collection.createIndex({ location: "2dsphere" })

      const {password, email, document, name, lastName, address, phone} =
        dogWalker;

      const dogWalkerExists = await this.dogWalkersCollection.findOne({
        $or: [{email}, {document}],
      });

      if (dogWalkerExists) {
        return {
          status: 400,
          data: 'Dog Walker já cadastrado',
        };
      }

      const createStripeAccount = await StripeUtils.createAccount({
        email: email as string,
        firstName: name,
        lastName,
        dob: {
          day: 20,
          month: 10,
          year: 1999,
        },
        address: {
          city: address.city,
          country: 'BR',
          state: address.state,
          postal_code: address.zipCode,
          line1: address.street,
        },
        reqIp,
        idNumber: String(document),
        phone,
      });

      const {id: stripeAccountId} = createStripeAccount;

      const salt = await genSalt();
      const hashedPassword = await hash(password!, salt);

      const newDogWalker = {
        ...dogWalker,
        password: hashedPassword,
        stripeAccountId,
        rate: 5,
        totalRatings: 0,
        isOnline: false,
        createdAt: this.currentDate,
        updatedAt: this.currentDate,
      };

      const data = await this.dogWalkersCollection.insertOne(newDogWalker);

      return {
        status: 201,
        data,
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

  async findNearestDogWalkers(
    latitude: number,
    longitude: number,
    radiusInMeters: number = 10000,
  ) {
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
      console.log(error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async findRecommededDogWalkers(
    latitude: number,
    longitude: number,
    radiusInMeters: number = 10000,
  ) {
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
        })
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

      dogWalkersWithDistance.sort((a, b) => {
        if (a.isOnline === b.isOnline) {
          return parseFloat(a.distance) - parseFloat(b.distance);
        }
        return a.isOnline ? -1 : 1;
      });

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
      const dogWalker = await this.dogWalkersCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!dogWalker) {
        return {
          status: 404,
          data: 'Dog walker  não encontrado',
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

  // async sendNotificationDogWalker({
  //   dogWalkerId,
  //   title,
  //   body,
  // }: {
  //   dogWalkerId: string;
  //   title: string;
  //   body: string;
  // }) {
  //   try {
  //     const dogWalkerResult = await this.findDogWalkerById(dogWalkerId);

  //     if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
  //       return {
  //         status: 404,
  //         error: 'Dog walker não encontrado',
  //       };
  //     }

  //     const {token} = dogWalkerResult.data as any;

  //     const result = await FirebaseRepository.sendNotification({
  //       title,
  //       body,
  //       token,
  //     });

  //     return {
  //       status: 200,
  //       data: result,
  //     };
  //   } catch (err) {
  //     console.log('Got error =>', err);
  //   }
  // }

  async saveFeedback({
    dogWalkerId,
    rate,
    comment,
  }: {
    dogWalkerId: string;
    rate: string;
    comment: string;
  }) {
    try {
      const dogWalkerResult = await this.findDogWalkerById(dogWalkerId);

      if (dogWalkerResult.status !== 200 || !dogWalkerResult.data) {
        return {
          status: 404,
          error: 'Dog walker não encontrado',
        };
      }

      const feedbackResult = await this.feedbackCollection.insertOne({
        walker_id: dogWalkerId,
        rate,
        comment,
      });

      const dogWalker = dogWalkerResult.data as any;
      const newTotalRatings = dogWalker.totalRatings + 1;
      const newRate =
        ((dogWalker.rate * dogWalker.totalRatings + rate) as any) /
        newTotalRatings;

      await this.dogWalkersCollection.updateOne(
        {_id: new ObjectId(dogWalkerId)},
        {
          $set: {
            rate: newRate,
            totalRatings: newTotalRatings,
          },
        },
      );

      return {
        status: 200,
        data: feedbackResult,
      };
    } catch (err) {
      console.log('Got error =>', err);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }
}

export default new DogWalkerRepository();
