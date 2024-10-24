import {compare, genSalt, hash} from 'bcrypt';
import MongoConnection from '../database/mongoConnection';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {UserRole} from '../enums/role';
import {generateAccessToken, generateRefreshToken} from '../utils/authToken';

class AdminRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get adminCollection() {
    return this.db.collection('admin');
  }

  get dogWalkersCollection() {
    return this.db.collection('dogwalker');
  }

  get ownerCollection() {
    return this.db.collection('owner');
  }

  currentDate = new Date();

  async add(admin: {
    email: string;
    password: string;
  }): Promise<RepositoryResponse> {
    try {
      const {email, password} = admin;

      const adminExists = await this.adminCollection.findOne({email});

      if (adminExists) {
        return {
          status: 500,
          data: 'Error',
        };
      }

      const salt = await genSalt();
      const hashedPassword = await hash(password, salt);

      const newAdmin = {
        email,
        password: hashedPassword,
      };

      const data = await this.adminCollection.insertOne(newAdmin);

      return {
        status: 201,
        data,
      };
    } catch (error) {
      console.log('Error adding owner:', error);
      return {
        status: 500,
        data: 'Error',
      };
    }
  }

  async auth({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<RepositoryResponse> {
    try {
      const user = await this.adminCollection.findOne({
        email,
      });

      if (!user) {
        return {
          status: 500,
          data: 'Error',
        };
      }

      const {password: hashPassword} = user;

      const isPasswordValid = await compare(password, hashPassword);

      if (!isPasswordValid) {
        return {
          status: 500,
          data: 'Error',
        };
      }

      const accessToken = generateAccessToken(user._id, UserRole.Admin);
      const refreshToken = generateRefreshToken(user._id, UserRole.Admin);

      return {
        status: 200,
        data: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.log('Algo de errado ao fazer logion:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async resetPassoword({
    email,
    newPassword,
    role,
  }: {
    email: string;
    newPassword: string;
    role: UserRole;
  }) {
    try {
      const collection =
        role === UserRole.DogWalker
          ? this.dogWalkersCollection
          : this.ownerCollection;

      const user = await collection.findOne({email});

      if (!user) {
        return {
          status: 404,
          data: 'Usuário não encontrado.',
        };
      }

      const salt = await genSalt();
      const hashedPassword = await hash(newPassword, salt);

      await collection.updateOne({email}, {$set: {password: hashedPassword}});

      return {
        status: 200,
        data: 'Senha redefinida com sucesso.',
      };
    } catch (error) {
      console.log('Erro ao redefinir senha:', error);
      return {
        status: 500,
        data: 'Erro ao redefinir senha.',
      };
    }
  }
}

export default new AdminRepository();
