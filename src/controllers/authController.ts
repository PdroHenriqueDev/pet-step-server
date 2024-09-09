import {Request, Response} from 'express';
import {ApiResponse} from '../interfaces/apitResponse';
import AuthRepository from '../repositories/authRepository';
import {isEmailValid} from '../utils/validateEmail';
import jwt, {JwtPayload} from 'jsonwebtoken';
import {generateAccessToken, generateRefreshToken} from '../utils/authToken';

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

    const {status, data} = response;
    return res.status(status).send(data);
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
    const {refreshToken} = req.body;

    if (!refreshToken) {
      return res.status(400).send({
        status: 400,
        data: 'Refresh token é obrigatório.',
      });
    }

    try {
      const user = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!,
      ) as JwtPayload;

      if (!user) {
        return res.status(403).send({
          status: 403,
          data: 'Token inválido ou expirado',
        });
      }

      const accessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      return res.status(200).json({
        status: 200,
        data: {accessToken, refreshToken: newRefreshToken},
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
    const {token, newPassword, role} = req.body;

    if (!token || !newPassword || !role) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida',
      });
    }

    const response = await AuthRepository.resetPassoword({
      token,
      newPassword,
      role,
    });

    const {status, data} = response;

    return res.status(status).send(data);
  }
}

export default new AuthController();
