import {ObjectId} from 'mongodb';

export interface DogWalkerProps {
  _id?: ObjectId | undefined;
  name: string;
  lastName: string;
  email?: string;
  document?: string;
  password?: string;
  rate?: number;
  distance?: string;
  birthdate: string;
  isOnline?: boolean;
}
