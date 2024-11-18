import express from 'express';
import NotificationController from '../controllers/notificationController';

const notificatiohRouter = express.Router();

notificatiohRouter.put(
  '/mark-all-as-read',
  NotificationController.markAllAsRead,
);
notificatiohRouter.put(
  '/read/:id',
  NotificationController.markNotificationAsRead,
);
notificatiohRouter.put('/', NotificationController.updateDeviceToken);

notificatiohRouter.post('/add', NotificationController.addNotification);
notificatiohRouter.post('/', NotificationController.sendNotification);

notificatiohRouter.get(
  '/unread',
  NotificationController.hasUnreadNotifications,
);
notificatiohRouter.get('/list', NotificationController.listNotifications);

export default notificatiohRouter;
