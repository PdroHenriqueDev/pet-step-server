import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import routes from './routes';
import dotenv from 'dotenv';
import MongoConnection from './database/mongoConnection';
import {SocketInit} from './websocket';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }),
);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['*'],
  },
});

app.use('/', routes);

new SocketInit(io);

(async () => {
  try {
    const mongoConnection = MongoConnection.getInstance();
    await mongoConnection.initialize();

    server.listen(process.env?.APP_PORT ?? 3000, () => {
      console.log('Server is running 🔥');
    });
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1);
  }
})();
