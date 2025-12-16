import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { AuthResponse, User } from '../types/user.types';
import { Game } from '../types/game.types';

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
    // Use getGuestId() from utils instead of localStorage
    const { getGuestId } = await import('../utils/guestId');
    const guestId = getGuestId();
    const response = await api.post('/games/create', { boardSize, rules, guestId });
    return response.data;
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
    const guestId = getGuestId();
    const response = await api.post(`/games/${roomId}/join`, { guestId });
    return response.data;
  },
};

// Leaderboard APIs
export const leaderboardApi = {
  getTopPlayers: async (limit: number = 10): Promise<User[]> => {
    const response = await api.get(`/leaderboard?limit=${limit}`);
    return response.data;
  },
  getUserRank: async (userId: string): Promise<{ rank: number; user: User }> => {
    const response = await api.get(`/leaderboard/user/${userId}`);
    return response.data;
  },
};

// User APIs
export const userApi = {
  getProfile: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },
};

export default api;

