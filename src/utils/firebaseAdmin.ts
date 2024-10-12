// firebaseAdminUtil.ts

import * as admin from 'firebase-admin';
import serviceAccount from '../../firebase-admin.config.json';

class FirebaseAdminUtil {
  private initialized = false;

  initializeApp() {
    if (!this.initialized) {
      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount,
        ),
        databaseURL: 'https://dog-walker-9dd47-default-rtdb.firebaseio.com',
      });
      this.initialized = true;
      console.log('Firebase Admin initialized');
    }
  }

  getAdmin() {
    this.initializeApp();
    return admin;
  }

  async createChat({
    chatId,
    ownerId,
    dogWalkerId,
    dogWalkerToken,
    ownerToken,
  }: {
    chatId: string;
    ownerId: string;
    dogWalkerId: string;
    dogWalkerToken: string;
    ownerToken: string;
  }) {
    this.initializeApp();
    const db = admin.database();
    const chatRef = db.ref(`chats/${chatId}`);

    await chatRef.set({
      ownerId,
      dogWalkerId,
      dogWalkerToken,
      ownerToken,
    });

    return {status: 200, data: `Chat ${chatId} criado.`};
  }
}

export default new FirebaseAdminUtil();
