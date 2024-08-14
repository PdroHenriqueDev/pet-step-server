import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import setupWebSocket from './websocket';
import routes from './routes';
import dotenv from 'dotenv';
import MongoConnection from './database/mongoConnection';
import {SocketInit} from './websocket/testClas';

dotenv.config();

const app = express();
app.use(express.json());
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['*'],
  },
});
const port = 3000;

app.use('/', routes);

// setupWebSocket(io);
new SocketInit(io);

(async () => {
  try {
    const mongoConnection = MongoConnection.getInstance();
    await mongoConnection.initialize();

    const db = mongoConnection.db;
    console.log(`Database connected: ${db?.databaseName}`);

    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port} 🔥`);
    });
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1);
  }
})();
