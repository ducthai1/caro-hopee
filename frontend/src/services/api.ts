import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { AuthResponse, User, UpdateProfileData, ChangePasswordData } from '../types/user.types';
import { Game, GameHistory } from '../types/game.types';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// Auth APIs
export const authApi = {
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Game APIs
export const gameApi = {
  create: async (boardSize: number, rules: any): Promise<Game> => {
    try {
    // Use getGuestId() from utils instead of localStorage
    const { getGuestId } = await import('../utils/guestId');
    const { getGuestName } = await import('../utils/guestName');
    const guestId = getGuestId();
    const guestName = getGuestName();
      const { logger } = await import('../utils/logger');
      logger.log('[gameApi.create] Calling API with:', { boardSize, rules, guestId, guestName });
    const response = await api.post('/games/create', { boardSize, rules, guestId, guestName });
      logger.log('[gameApi.create] Response received:', response.data);
    return response.data;
    } catch (error: any) {
      const { logger } = await import('../utils/logger');
      logger.error('[gameApi.create] API call failed:', error);
      logger.error('[gameApi.create] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      throw error;
    }
  },
  getGame: async (roomId: string): Promise<Game> => {
    const response = await api.get(`/games/${roomId}`);
    return response.data;
  },
  getGameByCode: async (roomCode: string): Promise<Game> => {
    const response = await api.get(`/games/code/${roomCode}`);
    return response.data;
  },
  getUserGames: async (userId: string): Promise<Game[]> => {
    const response = await api.get(`/games/user/${userId}`);
    return response.data;
  },
  joinGame: async (roomId: string, password?: string): Promise<Game> => {
    // Use getGuestId() from utils instead of localStorage
    const { getGuestId } = await import('../utils/guestId');
    const { getGuestName } = await import('../utils/guestName');
    const guestId = getGuestId();
    const guestName = getGuestName();
    const response = await api.post(`/games/${roomId}/join`, { guestId, guestName, password });
    return response.data;
  },
  setPassword: async (roomId: string, password: string | null): Promise<{ message: string; hasPassword: boolean }> => {
    // Use getGuestId() from utils instead of localStorage
    const { getGuestId } = await import('../utils/guestId');
    const guestId = getGuestId();
    const response = await api.post(`/games/${roomId}/password`, { password, guestId });
    return response.data;
  },
  leaveGame: async (roomId: string): Promise<{ message: string; gameDeleted: boolean; gameData?: any }> => {
    // Use getGuestId() from utils instead of localStorage
    const { getGuestId } = await import('../utils/guestId');
    const guestId = getGuestId();
    const response = await api.post(`/games/${roomId}/leave`, { guestId });
    return response.data;
  },
  getWaitingGames: async (): Promise<any[]> => {
    const response = await api.get('/games/waiting');
    return response.data;
  },
  getGameHistory: async (): Promise<{ history: GameHistory[]; total: number }> => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const isAuthenticated = !!token;
    
    if (isAuthenticated) {
      // Authenticated user - get from API
      try {
        const response = await api.post('/games/history', {});
        const { logger } = await import('../utils/logger');
        logger.log('[API] getGameHistory (authenticated) response:', response.data);
        return response.data;
      } catch (error: any) {
        const { logger } = await import('../utils/logger');
        logger.error('[API] Failed to get game history from server:', error);
        // Fallback to empty if API fails
        return { history: [], total: 0 };
      }
    } else {
      // Guest user - get from localStorage
      const { getGuestHistory } = await import('../utils/guestHistory');
      const history = getGuestHistory();
      const { logger } = await import('../utils/logger');
      logger.log('[API] getGameHistory (guest) from localStorage:', history.length, 'games');
      return { history, total: history.length };
    }
  },
  updateMarker: async (roomId: string, marker: string): Promise<{ message: string; player1Marker: string | null; player2Marker: string | null }> => {
    const { getGuestId } = await import('../utils/guestId');
    const guestId = getGuestId();
    const response = await api.post(`/games/${roomId}/marker`, { marker, guestId });
    return response.data;
  },
};

// Game Stats APIs
export const gameStatsApi = {
  getUserGameStats: async (gameId: string, userId: string) => {
    const response = await api.get(`/games/${gameId}/stats/${userId}`);
    return response.data;
  },
  getMyGameStats: async (gameId: string) => {
    const response = await api.get(`/games/${gameId}/stats/my-stats`);
    return response.data;
  },
  submitGameResult: async (gameId: string, result: 'win' | 'loss' | 'draw', score?: number, customStats?: any, gameData?: any) => {
    const response = await api.post(`/games/${gameId}/stats/submit`, {
      result,
      score,
      customStats,
      gameData,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7),
    });
    return response.data;
  },
};

// Leaderboard APIs
export const leaderboardApi = {
  getLeaderboard: async (gameId: string, period: 'daily' | 'weekly' | 'all-time' = 'all-time', limit: number = 50, offset: number = 0) => {
    const response = await api.get(`/leaderboard/${gameId}?period=${period}&limit=${limit}&offset=${offset}`);
    return response.data;
  },
  getUserRank: async (gameId: string, userId: string, period: 'daily' | 'weekly' | 'all-time' = 'all-time') => {
    const response = await api.get(`/leaderboard/${gameId}/rank/${userId}?period=${period}`);
    return response.data;
  },
  getRankAroundUser: async (gameId: string, userId: string, period: 'daily' | 'weekly' | 'all-time' = 'all-time', range: number = 5) => {
    const response = await api.get(`/leaderboard/${gameId}/around/${userId}?period=${period}&range=${range}`);
    return response.data;
  },
  // Legacy endpoints for backward compatibility
  getTopPlayers: async (limit: number = 10, gameId?: string): Promise<User[]> => {
    const url = gameId ? `/leaderboard/${gameId}?limit=${limit}` : `/leaderboard/top?limit=${limit}${gameId ? `&gameId=${gameId}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },
};

// User APIs
export const userApi = {
  getProfile: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },
  getUserGames: async (userId: string) => {
    const response = await api.get(`/users/${userId}/games`);
    return response.data;
  },
  getUserGameStats: async (userId: string, gameId: string) => {
    const response = await api.get(`/users/${userId}/games/${gameId}`);
    return response.data;
  },
  getMyProfile: async (): Promise<User> => {
    const response = await api.get(`/users/me/profile`);
    return response.data;
  },
  updateMyProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await api.put(`/users/me/profile`, data);
    return response.data;
  },
  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    const response = await api.put(`/users/me/password`, data);
    return response.data;
  },
  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },
  getMyAchievements: async (gameId = 'caro') => {
    const response = await api.get(`/users/me/achievements?gameId=${gameId}`);
    return response.data;
  },
  getAllAchievements: async () => {
    const response = await api.get(`/users/achievements`);
    return response.data;
  },
};

// Lucky Wheel APIs
export interface WheelItem {
  label: string;
  weight: number;
}

export const luckyWheelApi = {
  saveConfig: async (items: WheelItem[]): Promise<{ message: string; config: any }> => {
    const { getGuestId } = await import('../utils/guestId');
    const { getGuestName } = await import('../utils/guestName');
    const guestId = getGuestId();
    const guestName = getGuestName();
    const response = await api.post('/lucky-wheel/config', {
      items,
      guestId,
      guestName,
    });
    return response.data;
  },
  getMyConfig: async (): Promise<{ config: any; items: WheelItem[]; isDefault: boolean }> => {
    const { getGuestId } = await import('../utils/guestId');
    const guestId = getGuestId();
    const response = await api.get(`/lucky-wheel/config?guestId=${guestId}`);
    return response.data;
  },
  getUserConfig: async (userId: string): Promise<{ config: any; items: WheelItem[] }> => {
    const response = await api.get(`/lucky-wheel/config/${userId}`);
    return response.data;
  },
  deleteGuestConfig: async (guestId: string): Promise<{ message: string }> => {
    const response = await api.delete('/lucky-wheel/config', {
      data: { guestId },
    });
    return response.data;
  },
  updateActivity: async (guestId?: string, guestName?: string): Promise<{ message: string; isNew?: boolean }> => {
    const { getGuestId } = await import('../utils/guestId');
    const { getGuestName } = await import('../utils/guestName');
    const finalGuestId = guestId || getGuestId();
    const finalGuestName = guestName || getGuestName();
    const response = await api.post('/lucky-wheel/activity', {
      guestId: finalGuestId,
      guestName: finalGuestName,
    });
    return response.data;
  },
};

// Admin APIs
export const adminApi = {
  listLuckyWheelUsers: async (page: number = 1, limit: number = 50, search?: string): Promise<{
    users: Array<{
      id: string;
      userId: string | null;
      guestId: string | null;
      username: string | null;
      guestName: string | null;
      displayName: string;
      userType: 'authenticated' | 'guest';
      itemCount: number;
      lastUpdated: Date;
      createdAt: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    const response = await api.get(`/admin/lucky-wheel/users?${params.toString()}`);
    return response.data;
  },
  getUserConfig: async (userId: string, guestId?: string): Promise<{
    id: string;
    userId: string | null;
    guestId: string | null;
    username: string | null;
    guestName: string | null;
    displayName: string;
    userType: 'authenticated' | 'guest';
    items: WheelItem[];
    createdAt: Date;
    updatedAt: Date;
  }> => {
    const params = guestId ? `?guestId=${guestId}` : '';
    const response = await api.get(`/admin/lucky-wheel/users/${userId}${params}`);
    return response.data;
  },
  updateUserConfig: async (userId: string, items: WheelItem[], guestId?: string): Promise<{
    message: string;
    config: any;
  }> => {
    const response = await api.put(`/admin/lucky-wheel/users/${userId}/config`, {
      items,
      guestId,
    });
    return response.data;
  },
};

export default api;

