import {Request, Response} from 'express';
import {ApiResponse} from '../interfaces/apitResponse';
import AuthRepository from '../repositories/authRepository';
import {isEmailValid} from '../utils/validateEmail';
import jwt, {JwtPayload} from 'jsonwebtoken';
import {generateAccessToken, generateRefreshToken} from '../utils/authToken';
import FirebaseAdminUtil from '../utils/firebaseAdmin';

class AuthController {
  async login(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {email, password, role} = req.body;

    if (!email || !password || !role) {
      return res.status(400).send({
        status: 400,
        data: 'Email e senha são obrigatórios.',
      });
    }

    if (!isEmailValid(email)) {
      return res.status(400).send({
        status: 400,
        data: 'Formato de email inválido.',
      });
    }

    const response = await AuthRepository.auth({email, password, role});
    const {status} = response;
    return res.status(status).send(response);
  }

  async forgotPassword(req: Request, res: Response): Promise<Response> {
    const {email, role} = req.body;

    if (!email || !role) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida.',
      });
    }

    if (!isEmailValid(email)) {
      return res.status(400).send({
        status: 400,
        data: 'Formato de email inválido.',
      });
    }

    const response = await AuthRepository.recoveryPassword({email, role});

    const {status, data} = response;
    return res.status(status).send(data);
  }

  async refreshToken(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {refreshToken, role} = req.body;

    if (!refreshToken || !role) {
      return res.status(400).send({
        status: 400,
        data: !refreshToken
          ? 'Refresh token é obrigatório.'
          : 'Requisição inválida',
      });
    }

    try {
      const user = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!,
      ) as JwtPayload;

      if (!user) {
        console.log('goth here !user');
        return res.status(403).send({
          status: 403,
          data: 'Faça login novamente',
        });
      }

      const accessToken = generateAccessToken(user.id, role);
      const newRefreshToken = generateRefreshToken(user.id, role);

      const firebaseAdmin = FirebaseAdminUtil.getAdmin();
      const firebaseToken = await firebaseAdmin
        .auth()
        .createCustomToken(user.id);

      return res.status(200).json({
        status: 200,
        data: {accessToken, refreshToken: newRefreshToken, firebaseToken},
      });
    } catch (error) {
      console.log('Error ao renovar token', error);
      return res.status(403).send({
        status: 403,
        data: 'Token expirado ou inválido',
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    const {token, newPassword} = req.body;

    if (!token || !newPassword) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida',
      });
    }

    const response = await AuthRepository.resetPassoword({
      token,
      newPassword,
    });

    const {status} = response;

    return res.status(status).send(response);
  }

  async removeAccount(req: Request, res: Response): Promise<Response> {
    const {id, role} = req.user;

    if (!id || !role) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida',
      });
    }

    const response = await AuthRepository.deleteAccount(id, role);

    const {status} = response;

    return res.status(status).send(response);
  }

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    const {token} = req.body;

    if (!token) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida',
      });
    }

    const response = await AuthRepository.checkEmail(token);

    const {status} = response;

    return res.status(status).send(response);
  }
}

export default new AuthController();
