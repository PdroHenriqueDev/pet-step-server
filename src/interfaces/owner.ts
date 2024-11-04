import {ObjectId} from 'mongodb';
import {Dog} from './dog';

export interface Owner {
  _id?: ObjectId | undefined;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  document: string;
  address: {
    zipCode: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  // longitude: number;
  // latitude: number;
  dogs?: Dog[];
  rate?: number;
  totalRatings?: number;
  defaultPayment?: string;
  currentWalk?: null | {
    status: string;
    requestId: string;
  };
  password?: string;
  customerStripeId?: string;
}
