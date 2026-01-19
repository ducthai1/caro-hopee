import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { AuthResponse, User } from '../types/user.types';
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
  joinGame: async (roomId: string): Promise<Game> => {
    // Use getGuestId() from utils instead of localStorage
    const { getGuestId } = await import('../utils/guestId');
    const { getGuestName } = await import('../utils/guestName');
    const guestId = getGuestId();
    const guestName = getGuestName();
    const response = await api.post(`/games/${roomId}/join`, { guestId, guestName });
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
  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },
};

export default api;

