import {ObjectId} from 'mongodb';

export interface WalkProps {
  _id: ObjectId;
  dogWalker: {
    name: string;
    profileUrl?: string;
  };
  price: number;
  startDate: Date | string;
}
