import { Server, Socket } from 'socket.io';

const setupWebSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    // socket.timeout(60000).emit('wake_up', () => {
    //   console.log('disconnect socketId =>', socket.id);
    //   socket.disconnect();
    // });

    const userId = socket.handshake.query?.user_id ?? '';
    if (!userId) return;

    console.log('got here', socket.id);

    const room = `room_${userId}`;
    const clients = io.sockets.adapter.rooms.get(room) || new Set();

    if (clients.size >= 2) {
      socket.disconnect();
      return;
    }

    socket.join(room);

    socket.on('location', (location: any) => {
      console.log('location =>', location);
      io.to(room).emit('receive_location', location);
    });

    socket.on('disconnect', () => {
      console.log('disconnect =>', socket.id);
      socket.leave(room);
    });
  });
};

export default setupWebSocket;
