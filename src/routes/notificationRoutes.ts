import express from 'express';
import NotificationController from '../controllers/notificationController';

const notificatiohRouter = express.Router();

notificatiohRouter.put('/', NotificationController.updateDeviceToken);

export default notificatiohRouter;
