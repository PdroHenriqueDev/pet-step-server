import {ObjectId} from 'mongodb';
import MongoConnection from '../database/mongoConnection';
import {UserRole} from '../enums/role';
import {RepositoryResponse} from '../interfaces/apitResponse';
import {NotificationEnum} from '../enums/notification';

class NotificationRepository {
  get db() {
    return MongoConnection.getInstance().getdataBase();
  }

  get notificationCollection() {
    return this.db.collection('notification');
  }

  async addNotification({
    userId,
    role,
    title,
    message,
    type,
    extraData = {},
  }: {
    userId: string;
    role: UserRole;
    title: string;
    message: string;
    type: NotificationEnum;
    extraData?: Record<string, unknown>;
  }): Promise<RepositoryResponse> {
    try {
      const notification = {
        userId: new ObjectId(userId),
        role,
        title,
        message,
        type,
        createdAt: new Date(),
        read: false,
        extraData,
      };

      await this.notificationCollection.insertOne(notification);

      return {
        status: 200,
        data: 'Notificação adicionada com sucesso.',
      };
    } catch (error) {
      console.log('Error adding notification:', error);
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }
  }

  async notificationsByUser(
    userId: string,
    page: number = 1,
  ): Promise<RepositoryResponse> {
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    try {
      const notifications = await this.notificationCollection
        .find(
          {userId: new ObjectId(userId)},
          {
            projection: {
              _id: 1,
              title: 1,
              message: 1,
              type: 1,
              createdAt: 1,
              read: 1,
              extraData: 1,
            },
          },
        )
        .sort({createdAt: -1})
        .skip(skip)
        .limit(pageSize)
        .toArray();

      const totalNotificationsCount =
        await this.notificationCollection.countDocuments({
          userId: new ObjectId(userId),
        });

      const hasMore = totalNotificationsCount > skip + notifications.length;

      return {
        status: 200,
        data: {
          results: notifications,
          hasMore,
        },
      };
    } catch (error) {
      console.log('Error retrieving notifications by user:', error);
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }
  }

  async markAllAsRead(userId: string): Promise<RepositoryResponse> {
    try {
      const result = await this.notificationCollection.updateMany(
        {userId: new ObjectId(userId), read: false},
        {$set: {read: true}},
      );

      return {
        status: 200,
        data: `${result.modifiedCount} notificações marcadas como lidas.`,
      };
    } catch (error) {
      console.log('Error marking notifications as read:', error);
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }
  }

  async markNotificationAsRead(
    notificationId: string,
  ): Promise<RepositoryResponse> {
    try {
      await this.notificationCollection.updateOne(
        {_id: new ObjectId(notificationId), read: false},
        {$set: {read: true}},
      );

      return {
        status: 200,
        data: 'Notificação marcada como lida com sucesso.',
      };
    } catch (error) {
      console.log('Error marking notification as read:', error);
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }
  }

  async hasUnreadNotifications(userId: string): Promise<RepositoryResponse> {
    try {
      const hasUnread = await this.notificationCollection.findOne({
        userId: new ObjectId(userId),
        read: false,
      });

      return {
        status: 200,
        data: {hasUnread: !!hasUnread},
      };
    } catch (error) {
      console.error('Error checking unread notifications:', error);
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }
  }
}

export default new NotificationRepository();
