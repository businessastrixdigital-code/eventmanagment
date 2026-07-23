import { Server } from 'socket.io';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust in production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Join room for couple dashboard
    socket.on('join-couple-room', (coupleId) => {
      socket.join(`couple-${coupleId}`);
      console.log(`[SOCKET] Client ${socket.id} joined couple room: couple-${coupleId}`);
    });

    // Join room for SuperAdmin dashboard
    socket.on('join-superadmin-room', () => {
      socket.join('superadmin-room');
      console.log(`[SOCKET] Client ${socket.id} joined SuperAdmin room`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};
