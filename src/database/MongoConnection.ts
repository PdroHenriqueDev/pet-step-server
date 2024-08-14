import { MongoClient, Db } from 'mongodb';

class MongoConnection {
  private static instance: MongoConnection;
  db: Db | null = null;
  client: MongoClient;
  url: string;

  constructor() {
    this.url = process.env.MONGODB_URI ?? '';
    this.client = new MongoClient(this.url);
  }

  public static getInstance(): MongoConnection {
    if (!this.instance) {
      this.instance = new MongoConnection();
    }

    return this.instance;
  }

  async initialize() {
    if (this.db) return;

    try {
      await this.client.connect();
      this.db = this.client.db();
      console.log('Connected to MongoDB');
    } catch (e) {
      console.log('Error connecting to MongoDB', this.url);
    }
  }

  public getdataBase(): Db {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }
}

export default MongoConnection;
