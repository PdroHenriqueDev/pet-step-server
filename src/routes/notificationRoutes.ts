import express from 'express';
import NotificationController from '../controllers/notificationController';

const notificatiohRouter = express.Router();

notificatiohRouter.put('/', NotificationController.updateDeviceToken);

notificatiohRouter.post('/', NotificationController.sendNotification);

export default notificatiohRouter;
