import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../utils/jwt';
import { checkSocketRateLimit } from '../middleware/rateLimiter';

// Shared io instance for use across the application
let ioInstance: SocketIOServer | null = null;

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized. Call setupSocketIO first.');
  }
  return ioInstance;
};

export const setupSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket rate limiting middleware (M4 fix: prevent connection spam)
  io.use((socket, next) => {
    const ip = socket.handshake.address || 'unknown';
    const rateCheck = checkSocketRateLimit(ip);

    if (!rateCheck.allowed) {
      return next(new Error(`Rate limited. Retry after ${rateCheck.retryAfter}s`));
    }

    next();
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
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
      socket.data.isGuest = true;
      next();
    }
  });

  // Store instance for getIO()
  ioInstance = io;
  return io;
};

