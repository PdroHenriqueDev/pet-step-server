import admin from 'firebase-admin';
import serviceAccount from '../../firebase-admin.config.json';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

class FirebaseRepository {
    async sendNotification({ title, body, token }: { title: string; body: string; token: string }) {
    const message: admin.messaging.Message = {
        notification: {
            title,
            body,
        },
        token,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              priority: 10,
            }
          }
        }
    };

      try {
        const response = await admin.messaging().send(message);

        return {
            status: 200,
            data: response,
        };
      } catch (error) {
        throw new Error('Erro ao enviar notificação: ' + error);
      }
    }
  }
  
export default new FirebaseRepository();