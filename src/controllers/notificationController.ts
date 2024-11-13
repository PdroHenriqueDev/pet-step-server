import {Request, Response} from 'express';
import {UserRole} from '../enums/role';
import OwnerRepository from '../repositories/ownerRepository';
import DogWalkerRepository from '../repositories/dogWalkerRepository';
import NotificatinUtils from '../utils/notification';
import NotificationRepository from '../repositories/notificationRepository';

class NotificationController {
  async updateDeviceToken(req: Request, res: Response): Promise<Response> {
    const {deviceToken, role} = req.body;
    const userId = req?.user?.id;

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
    const senderRole = req.user.role;

    if (senderRole !== UserRole.Admin) {
      return res.status(401).send({data: 'Usuário não autorizado'});
    }

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

  async addNotification(req: Request, res: Response): Promise<Response> {
    const senderRole = req.user.role;

    if (senderRole !== UserRole.Admin) {
      return res.status(401).send({data: 'Usuário não autorizado'});
    }

    const {userId, role, title, message, type, extraData} = req.body;

    if (!userId || !role || !title || !message || !type) {
      return res.status(400).send({
        status: 400,
        data: 'Requisição inválida. Todos os campos obrigatórios devem ser preenchidos.',
      });
    }

    const response = await NotificationRepository.addNotification({
      userId,
      role,
      title,
      message,
      type,
      extraData,
    });

    const {status} = response;

    return res.status(status).send(response);
  }

  async markAllAsRead(req: Request, res: Response): Promise<Response> {
    const {id: userId} = req.user;

    const response = await NotificationRepository.markAllAsRead(userId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async markNotificationAsRead(req: Request, res: Response): Promise<Response> {
    const {id: notificationId} = req.params;

    if (!notificationId) {
      return res.status(400).send({
        status: 400,
        data: 'ID da notificação é obrigatório.',
      });
    }

    const response =
      await NotificationRepository.markNotificationAsRead(notificationId);

    const {status} = response;
    return res.status(status).send(response);
  }

  async hasUnreadNotifications(req: Request, res: Response): Promise<Response> {
    const {id} = req.user;

    const response = await NotificationRepository.hasUnreadNotifications(id);

    const {status} = response;
    return res.status(status).send(response);
  }

  async listNotifications(req: Request, res: Response): Promise<Response> {
    const {id} = req.user;
    const {page} = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;

    const response = await NotificationRepository.notificationsByUser(
      id,
      pageNumber,
    );

    const {status} = response;
    return res.status(status).send(response);
  }
}

export default new NotificationController();
