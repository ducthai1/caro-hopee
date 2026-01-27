/**
 * Shared types for HomePage components
 */

export interface WaitingGame {
  _id: string;
  roomId: string;
  roomCode: string;
  boardSize: number;
  gameStatus: string;
  displayStatus?: 'waiting' | 'ready' | 'playing';
  statusLabel?: string;
  canJoin?: boolean;
  hasPlayer1: boolean;
  hasPlayer2: boolean;
  playerCount?: number;
  player1Username: string | null;
  hasPassword?: boolean; // Indicates if game has password
  createdAt: string;
}

export interface GameItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  color: string;
}

// Games list - shared across components
export const GAMES: GameItem[] = [
  {
    id: 'caro',
    name: 'Caro',
    icon: '🎯',
    description: 'home.caroDescription',
    available: true,
    color: '#7ec8e3',
  },
  {
    id: 'lucky-wheel',
    name: 'games.luckyWheel',
    icon: '🎡',
    description: 'home.luckyWheelDescription',
    available: true,
    color: '#f39c12',
  },
  {
    id: 'werewolf',
    name: 'games.werewolf',
    icon: '🐺',
    description: 'home.werewolfDescription',
    available: false,
    color: '#9b59b6',
  },
  {
    id: 'uno',
    name: 'games.uno',
    icon: '🃏',
    description: 'home.unoDescription',
    available: false,
    color: '#e74c3c',
  },
  {
    id: 'other',
    name: 'games.otherGames',
    icon: '🎮',
    description: 'home.otherGamesDescription',
    available: false,
    color: '#95a5a6',
  },
];
