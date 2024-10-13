import * as admin from 'firebase-admin';

class FirebaseAdminUtil {
  private initialized = false;

  initializeApp() {
    if (!this.initialized) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_REAL_TIME_DATABSE,
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
