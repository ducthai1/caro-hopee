import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';

interface SocketContextType {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketService.connect(token || undefined);

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

