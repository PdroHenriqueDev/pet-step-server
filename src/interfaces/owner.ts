import { Dog } from './dog';

export interface Owner {
  _id: string;
  name: string;
  email: string;
  longitude: number;
  latitude: number;
  dogs: Dog[];
  rate: number;
  totalRatings: number;
  defaultPayment: string;
  customerStripe: {
    id: string;
  };
}
