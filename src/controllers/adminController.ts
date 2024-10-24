import {Request, Response} from 'express';
import AdminRepository from '../repositories/adminRepository';
import {UserRole} from '../enums/role';
import {ApiResponse} from '../interfaces/apitResponse';

class Admin {
  async store(req: Request, res: Response) {
    if (req.user.role !== UserRole.Admin) {
      return res.status(500).send({error: 'Error'});
    }

    const {password, email} = req.body;

    if (!password || !email) {
      return res.status(400).send({error: 'Requisição inválida'});
    }

    const response = await AdminRepository.add({password, email});
    const {status} = response;

    return res.status(status).send(response);
  }

  async login(req: Request, res: Response): Promise<Response<ApiResponse>> {
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status(400).send({
        status: 500,
        data: 'Error',
      });
    }

    const response = await AdminRepository.auth({email, password});
    const {status} = response;
    return res.status(status).send(response);
  }

  async resetUserPassword(
    req: Request,
    res: Response,
  ): Promise<Response<ApiResponse>> {
    const {email, newPassword, role} = req.body;

    if (!email || !newPassword || !role) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida.',
      });
    }

    if (role !== UserRole.DogWalker && role !== UserRole.Owner) {
      return res.status(400).send({
        status: 400,
        data: 'Error',
      });
    }

    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/;
    if (!passwordPattern.test(newPassword)) {
      return res.status(400).send({
        status: 400,
        data: 'A senha deve conter pelo menos uma letra minúscula, uma letra maiúscula, um número e um caractere especial.',
      });
    }

    const response = await AdminRepository.resetPassoword({
      email,
      newPassword,
      role,
    });

    const {status} = response;
    return res.status(status).send(response);
  }
}

export default new Admin();
