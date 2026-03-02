/**
 * Go (Cờ Vây) game TypeScript interfaces and types.
 */
import { Document } from 'mongoose';
import mongoose from 'mongoose';

// ─── Board & Game Types ──────────────────────────────────────
export type GoBoardSize = 9 | 13 | 19;
export type GoCell = 0 | 1 | 2;  // 0=empty, 1=black, 2=white
export type GoPhase = 'play' | 'scoring';
export type GoGameStatus = 'waiting' | 'playing' | 'scoring' | 'finished' | 'abandoned';
export type GoColor = 'black' | 'white';
export type GoWinReason = 'score' | 'resign' | 'timeout';

// ─── Settings ────────────────────────────────────────────────
export interface IGoSettings {
  boardSize: GoBoardSize;
  komi: number;           // default 6.5 (Chinese rules)
  handicap: number;       // 0-9
  mainTime: number;       // seconds (0 = no timer)
  byoyomiPeriods: number; // default 3
  byoyomiTime: number;    // seconds per period
}

// ─── Player ──────────────────────────────────────────────────
export interface IGoPlayer {
  slot: 1 | 2;
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  guestName?: string;
  color: GoColor;
  captures: number;           // stones captured by this player
  mainTimeLeft: number;       // seconds remaining
  byoyomiPeriodsLeft: number;
  passed: boolean;            // last action was pass
  scoringAgreed: boolean;
  isConnected: boolean;
  disconnectedAt?: Date;
}

// ─── Move History ────────────────────────────────────────────
export interface IGoMove {
  row: number;
  col: number;
  color: GoColor;
  captures: { row: number; col: number }[];
  isPass: boolean;
  moveNumber: number;
  timestamp: Date;
}

// ─── Score ───────────────────────────────────────────────────
export interface IGoScore {
  black: { territory: number; stones: number; captures: number; total: number };
  white: { territory: number; stones: number; captures: number; komi: number; total: number };
}

// ─── Winner ──────────────────────────────────────────────────
export interface IGoWinner {
  slot: number;
  color: GoColor;
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  guestName?: string;
}

// ─── Game Document ───────────────────────────────────────────
export interface IGoGame extends Document {
  roomId: string;
  roomCode: string;
  gameType: 'go';
  hostPlayerId: string;

  settings: IGoSettings;
  players: IGoPlayer[];

  board: number[][];      // 2D GoCell array
  boardHistory: string[]; // board hashes for superko
  currentColor: GoColor;
  gameStatus: GoGameStatus;
  phase: GoPhase;
  consecutivePasses: number;
  koPoint: { row: number; col: number } | null;
  moveCount: number;

  // Scoring phase
  deadStones: string[];   // "row-col" keys
  territory: { black: string[]; white: string[]; neutral: string[] };

  moveHistory: IGoMove[];

  winner: IGoWinner | null;
  winReason: GoWinReason | null;
  finalScore: IGoScore | null;

  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}
