import {Request, Response} from 'express';
import {ApiResponse} from '../interfaces/apitResponse';
import AuthRepository from '../repositories/authRepository';

class AuthController {
  async login(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {email, password, role} = req.body;

    if (!email || !password || !role) {
      return res.status(400).send({
        status: 400,
        data: 'Email e senha são obrigatórios.',
      });
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return res.status(400).send({
        status: 400,
        data: 'Formato de email inválido.',
      });
    }

    const response = await AuthRepository.auth({email, password, role});

    const {status, data} = response;
    return res.status(status).send(data);
  }
}

export default new AuthController();
