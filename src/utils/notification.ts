import FirebaseAdminUtil from './firebaseAdmin';

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
    if (!token) {
      return {
        status: 500,
        data: 'Erro interno.',
      };
    }

    const admin = FirebaseAdminUtil.getAdmin();

    try {
      const message = {
        notification: {
          title,
          body,
        },
        token,
        data: {
          requestId: data?.requestId ?? '',
        },
        android: {
          priority: 'high' as const,
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
