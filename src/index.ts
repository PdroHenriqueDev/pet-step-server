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
    // origin: process.env.PET_STEP_FRONT,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    // credentials: true,
  }),
);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['*'],
  },
});

const port = 3000;

app.use('/', routes);

new SocketInit(io);

(async () => {
  try {
    const mongoConnection = MongoConnection.getInstance();
    await mongoConnection.initialize();

    server.listen(port, () => {
      console.log('Server is running 🔥');
    });
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1);
  }
})();
