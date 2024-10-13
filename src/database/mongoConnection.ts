import {MongoClient, Db} from 'mongodb';

class MongoConnection {
  private static instance: MongoConnection;
  db: Db | null = null;
  client: MongoClient;
  mongoUri: string;

  constructor() {
    this.mongoUri = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB_NAME}?retryWrites=true&writeConcern=majority&authSource=admin`;
    this.client = new MongoClient(this.mongoUri);
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
    } catch (error) {
      console.log('Error connecting to MongoDB', error);
    }
  }

  public getdataBase(): Db {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public getClient(): MongoClient {
    return this.client;
  }
}

export default MongoConnection;
