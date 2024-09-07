import {compare} from 'bcrypt';
import MongoConnection from '../database/mongoConnection';
import {UserRole} from '../enums/role';
import {generateAccessToken, generateRefreshToken} from '../utils/authToken';
import {RepositoryResponse} from '../interfaces/apitResponse';

class AuthRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalkers');
  }

  get ownerCollection() {
    return this.db.collection('owner');
  }

  async auth({
    email,
    password,
    role,
  }: {
    email: string;
    password: string;
    role: UserRole;
  }): Promise<RepositoryResponse> {
    const user =
      role === UserRole.DogWalker
        ? await this.dogWalkersCollection.findOne({
            email,
          })
        : await this.ownerCollection.findOne({
            email,
          });

    if (!user) {
      return {
        status: 401,
        data: 'Credenciais inválidas.',
      };
    }

    const {password: hashPassword} = user;

    const isPasswordValid = await compare(password, hashPassword);

    if (!isPasswordValid) {
      return {
        status: 401,
        data: 'Credenciais inválidas.',
      };
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return {
      status: 200,
      data: {accessToken, refreshToken},
    };
  }
}

export default new AuthRepository();
