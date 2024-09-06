import {ObjectId} from 'mongodb';

export interface DogWalkerProps {
  _id?: ObjectId | undefined;
  name: string;
  lastName: string;
  email?: string;
  address: {
    zipCode: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  document?: string;
  password?: string;
  rate?: number;
  distance?: string;
  birthdate: string;
  isOnline?: boolean;
}
