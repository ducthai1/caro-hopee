import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User } from '../types/user.types';
import { authApi } from '../services/api';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshUser().catch(() => {
        localStorage.removeItem('token');
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Periodic token validation - runs independently of user state to ensure cleanup on unmount
  // Fix H1: Interval now always cleans up on unmount, not dependent on user state change
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up interval if user is logged in
    if (!user) {
      // CRITICAL FIX: Return empty cleanup to ensure cleanup is always registered
      // This prevents memory leak when user logs out (early return without cleanup)
      return () => {
        // Ensure interval is cleared even if user is null
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    let isMounted = true;

    const checkTokenValidity = async () => {
      if (!isMounted) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (isMounted) setUser(null);
          return;
        }
        await authApi.getMe();
      } catch (error: any) {
        if (error?.response?.status === 401 && isMounted) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    };

    // Check every 5 minutes
    intervalRef.current = setInterval(checkTokenValidity, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      logger.error('Failed to refresh user:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    const response = await authApi.login(email, password);
    localStorage.setItem('token', response.token);
    setUser(response.user);
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    const response = await authApi.register(username, email, password);
    localStorage.setItem('token', response.token);
    setUser(response.user);
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

