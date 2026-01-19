export type GameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type PlayerNumber = 1 | 2;
export type Winner = PlayerNumber | null | 'draw';

export interface GameRules {
  blockTwoEnds: boolean;
  allowUndo: boolean;
  maxUndoPerGame: number;
  timeLimit: number | null;
}

export interface GameScore {
  player1: number;
  player2: number;
}

export interface Game {
  _id: string;
  roomId: string;
  roomCode: string;
  player1: string | null;
  player2: string | null;
  player1GuestId: string | null;
  player2GuestId: string | null;
  player1Marker: string | null;
  player2Marker: string | null;
  boardSize: number;
  board: number[][];
  currentPlayer: PlayerNumber;
  gameStatus: GameStatus;
  winner: Winner;
  winningLine?: Array<{ row: number; col: number }>;
  rules: GameRules;
  score: GameScore;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface GameMove {
  _id: string;
  gameId: string;
  player: PlayerNumber;
  row: number;
  col: number;
  moveNumber: number;
  timestamp: string;
  isUndone: boolean;
}

export interface PlayerInfo {
  id: string;
  username: string;
  isGuest: boolean;
  playerNumber: PlayerNumber;
}

export interface GameHistory {
  _id: string;
  roomId: string;
  roomCode: string;
  boardSize: number;
  board: number[][];
  winner: Winner;
  winningLine?: Array<{ row: number; col: number }>;
  result: 'win' | 'loss' | 'draw';
  opponentUsername: string;
  finishedAt: string | null;
  createdAt: string;
  score: GameScore;
}

