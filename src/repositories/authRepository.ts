import {compare, hash} from 'bcrypt';
import MongoConnection from '../database/mongoConnection';
import {UserRole} from '../enums/role';
import {generateAccessToken, generateRefreshToken} from '../utils/authToken';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {sendPasswordResetEmail} from '../utils/sendPasswordResetEmail';
import jwt, {JwtPayload} from 'jsonwebtoken';
import {ObjectId} from 'mongodb';

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
    try {
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
    } catch (error) {
      console.log('Algo de errado ao fazer logion:', error);
      return {
        status: 500,
        data: 'Erro interno',
      };
    }
  }

  async recoveryPassword({email, role}: {email: string; role: UserRole}) {
    try {
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
          status: 404,
          data: 'Usuário não encontrado.',
        };
      }

      const resetToken = generateAccessToken(user._id);

      const emailResult = await sendPasswordResetEmail({
        to: email,
        token: resetToken,
        role,
      });

      const {status, data} = emailResult;

      return {
        status: status,
        data,
      };
    } catch (error) {
      console.log('Erro ao enviar o email de recuperação de senha', error);
      return {
        status: 500,
        data: 'Erro interno ao tentar recuperar senha',
      };
    }
  }

  async resetPassoword({
    newPassword,
    token,
    role,
  }: {
    newPassword: string;
    token: string;
    role: UserRole;
  }) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET_ACCESS_TOKEN!,
      ) as JwtPayload;

      if (!decoded) {
        return {
          status: 400,
          data: 'Token inválido ou expirado.',
        };
      }

      const userId = decoded.id;

      const collection =
        role === UserRole.DogWalker
          ? this.dogWalkersCollection
          : this.ownerCollection;
      const user = await collection.findOne({_id: new ObjectId(userId)});

      if (!user) {
        return {
          status: 404,
          data: 'Usuário não encontrado.',
        };
      }

      const hashedPassword = await hash(newPassword, 10);

      await collection.updateOne(
        {_id: new ObjectId(userId)},
        {$set: {password: hashedPassword}},
      );

      return {
        status: 200,
        data: 'Senha redefinida com sucesso.',
      };
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      return {
        status: 500,
        data: 'Erro ao redefinir senha.',
      };
    }
  }
}

export default new AuthRepository();
