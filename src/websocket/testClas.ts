import { Server, Socket } from 'socket.io';

export class SocketInit {
  private static instance: SocketInit;
  private socketIo: Server;

  constructor(io: Server) {
    this.socketIo = io;
    SocketInit.instance = this;
    this.socketIo.on('connection', (socket: Socket) => {
      console.log('User connected');

      const requestId = socket.handshake.query?.request_id ?? '';
      if (requestId) {
        const roomId = this.getRoomId(requestId as string);
        socket.join(roomId);
      }

      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    });
  }

  public static getInstance(): SocketInit {
    return SocketInit.instance;
  }

  public publishEvent(event: string, data: any) {
    this.socketIo.emit(event, data);
  }

  public publishEventToRoom(requestId: string, event: string, data: any) {
    const roomId = this.getRoomId(requestId);
    this.socketIo.to(roomId).emit(event, data);
  }

  private getRoomId(requestId: string): string {
    return `room-${requestId}`;
  }
}
