import admin from 'firebase-admin';
import serviceAccount from '../../firebase-admin.config.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

class NotificationUtils {
  async sendNotification({
    title,
    body,
    token,
    data,
  }: {
    title: string;
    body: string;
    token: string;
    data?: {
      requestId?: string;
    };
  }): Promise<{status: number; data: string}> {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      token,
      data: {
        requestId: data?.requestId ?? '',
      },
      android: {
        priority: 'high',
        notification: {
          color: '#F7CE45',
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            priority: 10,
          },
        },
      },
    };

    try {
      await admin.messaging().send(message);

      return {
        status: 200,
        data: 'Notificação enviada',
      };
    } catch (error) {
      console.log('Erro ao enviar notificação', error);
      return {
        status: 500,
        data: 'Erro ao enviar notificação',
      };
    }
  }
}

export default new NotificationUtils();
