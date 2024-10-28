import {Server, Socket} from 'socket.io';
import {SocketResponse} from '../enums/socketResponse';

export class SocketInit {
  private static instance: SocketInit;
  private socketIo: Server;

  constructor(io: Server) {
    this.socketIo = io;
    SocketInit.instance = this;
    this.socketIo.on('connection', (socket: Socket) => {
      console.log('User connected');
      // this.simulateWalk(socket);

      const requestId = socket.handshake.query?.request_id ?? '';
      if (requestId) {
        const roomId = this.getRoomId(requestId as string);
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
      }

      socket.on(SocketResponse.DogWalkerLocation, data => {
        const requestId = socket.handshake.query?.request_id as string;
        if (requestId) {
          const {longitude, latitude} = data;
          console.log('User sent location', {
            requestId,
            longitude,
            latitude,
          });
          this.publishEventToRoom(requestId, SocketResponse.DogWalkerLocation, {
            longitude,
            latitude,
          });
        }
      });

      socket.on(SocketResponse.Walk, data => {
        const requestId = socket.handshake.query?.request_id as string;
        if (requestId) {
          this.publishEventToRoom(requestId, SocketResponse.Walk, data);
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    });
  }

  public static getInstance(): SocketInit {
    return SocketInit.instance;
  }

  public publishEvent(event: SocketResponse, data: any) {
    this.socketIo.emit(event, data);
  }

  public publishEventToRoom(requestId: string, event: string, data: any) {
    const roomId = this.getRoomId(requestId);
    this.socketIo.to(roomId).emit(event, data);
  }

  private getRoomId(requestId: string): string {
    return `room-${requestId}`;
  }

  simulateWalk(socket: Socket) {
    let latitude = -23.5505;
    let longitude = -46.6333;

    const interval = setInterval(() => {
      latitude += 0.0001;
      longitude += 0.0001;

      socket.emit(SocketResponse.DogWalkerLocation, {latitude, longitude});
      console.log('Enviando coordenadas:', {latitude, longitude});

      if (latitude >= -23.5485 || longitude >= -46.6313) {
        clearInterval(interval);
        socket.disconnect();
        console.log('Passeio simulado finalizado.');
      }
    }, 1000);
  }
}
