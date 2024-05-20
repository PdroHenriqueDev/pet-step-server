import express from 'express';
import { createServer } from 'node:http';
import { Server } from "socket.io";
import setupWebSocket from './websocket';
import routes from './routes';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["*"],
  }
});
const port = 3000;

app.use('/', routes);

setupWebSocket(io);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
