import {Request, Response} from 'express';
import {UserRole} from '../enums/role';
import OwnerRepository from '../repositories/ownerRepository';
import DogWalkerRepository from '../repositories/dogWalkerRepository';
import NotificatinUtils from '../utils/notification';

class NotificationController {
  async updateDeviceToken(req: Request, res: Response): Promise<Response> {
    const {deviceToken, role} = req.body;
    const userId = req.user.id;

    if (!deviceToken || !userId || !role) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida',
      });
    }

    const repository =
      role === UserRole.DogWalker ? DogWalkerRepository : OwnerRepository;

    const response = await repository.updateDeviceToken(userId, deviceToken);

    const {status} = response;

    return res.status(status).send(response);
  }

  async sendNotification(req: Request, res: Response): Promise<Response> {
    const {deviceToken, title, body, data} = req.body;

    if (!deviceToken || !title || !body) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida',
      });
    }

    const response = await NotificatinUtils.sendNotification({
      title,
      body,
      data,
      token: deviceToken,
    });

    const {status} = response;

    return res.status(status).send(response);
  }
}

export default new NotificationController();
