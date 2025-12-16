import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user.types';
import { authApi } from '../services/api';

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

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
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

