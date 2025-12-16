import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt';

export const setupSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      // Allow guest connections
      socket.data.isGuest = true;
      return next();
    }

    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      socket.data.isGuest = false;
      next();
    } catch (error) {
      // Allow guest connections even if token is invalid
      socket.data.isGuest = true;
      next();
    }
  });

  return io;
};

