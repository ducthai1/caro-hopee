import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  connect(token?: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token || null,
      },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();

