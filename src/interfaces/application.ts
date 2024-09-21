import {Availability, DogExperience, Transport} from '../types/application';

export interface DogWalkerProfile {
  dogWalkerId: string;
  availability: Availability;
  transport: Transport;
  dogExperience: DogExperience;
}
