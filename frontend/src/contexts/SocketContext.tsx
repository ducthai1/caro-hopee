import React, { createContext, useContext, useEffect, useRef, useMemo, ReactNode, useCallback } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';

/**
 * SocketContext - Manages WebSocket connection lifecycle
 * Fixes Critical Issue C5: Socket Connection Leak
 *
 * Key improvements:
 * - Proper socket disconnection on auth changes
 * - Cleanup on component unmount
 * - Connection state tracking with refs to prevent stale closures
 */

interface SocketContextType {
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);

  // Track last token to detect auth changes
  const lastTokenRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const connectionAttemptRef = useRef(0);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    const token = localStorage.getItem('token');
    socketService.disconnect();
    socketService.connect(token || undefined);
    lastTokenRef.current = token;
    connectionAttemptRef.current++;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const token = localStorage.getItem('token');
    const socket = socketService.getSocket();

    // Track if token changed (user logged in/out)
    const tokenChanged = lastTokenRef.current !== token;
    const needsReconnect = !socket || !socket.connected || tokenChanged;

    if (needsReconnect) {
      // CRITICAL FIX C5: Always disconnect old socket before creating new one
      // This prevents zombie connections from accumulating
      if (socket && socket.connected) {
        logger.log('[SocketContext] Disconnecting old socket before reconnect');
        socketService.disconnect();
      }

      socketService.connect(token || undefined);
      lastTokenRef.current = token;
    }

    const currentSocket = socketService.getSocket();
    if (!currentSocket) return;

    // Set initial connected state
    if (isMountedRef.current) {
      setIsConnected(currentSocket.connected);
    }

    const handleConnect = () => {
      if (isMountedRef.current) {
        logger.log('[SocketContext] Socket connected');
        setIsConnected(true);
      }
    };

    const handleDisconnect = (reason: string) => {
      if (isMountedRef.current) {
        logger.log('[SocketContext] Socket disconnected:', reason);
        setIsConnected(false);
      }
    };

    const handleConnectError = (error: Error) => {
      logger.error('[SocketContext] Connection error:', error.message);
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    };

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('connect_error', handleConnectError);

    return () => {
      isMountedRef.current = false;

      if (currentSocket) {
        currentSocket.off('connect', handleConnect);
        currentSocket.off('disconnect', handleDisconnect);
        currentSocket.off('connect_error', handleConnectError);
      }

      // CRITICAL FIX C5: Disconnect on auth change to prevent zombie sockets
      // Only disconnect if this cleanup is due to auth change (tokenChanged will be true on next render)
      const currentToken = localStorage.getItem('token');
      if (currentToken !== lastTokenRef.current) {
        logger.log('[SocketContext] Auth changed, disconnecting socket');
        socketService.disconnect();
      }
    };
  }, [isAuthenticated]);

  // Cleanup socket on page unload
  useEffect(() => {
    const handleUnload = () => {
      socketService.disconnect();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const contextValue = useMemo(() => ({ isConnected, reconnect }), [isConnected, reconnect]);

  return (
    <SocketContext.Provider value={contextValue}>
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

