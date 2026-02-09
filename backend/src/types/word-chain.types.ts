import { Document } from 'mongoose';
import mongoose from 'mongoose';

// ─── Word Type & Game Mode ─────────────────────────────────────
export type WordType = '2+' | '3+' | 'all';
export type WordChainGameMode = 'classic' | 'speed';
export type WordChainGameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type RejectionReason = 'not_in_dictionary' | 'wrong_type' | 'wrong_chain' | 'already_used';

// ─── Room Rules ────────────────────────────────────────────────
export interface IWordChainRules {
  wordType: WordType;
  allowProperNouns: boolean;
  allowSlang: boolean;
  turnDuration: number;        // seconds: 15, 30, 60, 90, 120
  lives: number;               // 1-5
  gameMode: WordChainGameMode;
  allowRepeat: boolean;
  showHint: boolean;
}

// ─── Player ────────────────────────────────────────────────────
export interface IWordChainPlayer {
  slot: number;                // 1-8, seat order
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  guestName?: string;
  lives: number;
  score: number;
  wordsPlayed: number;
  isEliminated: boolean;
  isConnected: boolean;
  disconnectedAt?: Date;
}

// ─── Winner ────────────────────────────────────────────────────
export interface IWordChainWinner {
  slot: number;
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  guestName?: string;
}

// ─── Game Document ─────────────────────────────────────────────
export interface IWordChainGame extends Document {
  roomId: string;
  roomCode: string;
  gameType: 'word-chain';
  hostPlayerId: string;        // creator's usedId or guestId

  // Room settings
  maxPlayers: number;          // 2-8
  rules: IWordChainRules;
  password?: string;           // hashed, optional

  // Players (array for 2-8)
  players: IWordChainPlayer[];

  // Game state
  gameStatus: WordChainGameStatus;
  currentPlayerSlot: number;
  wordChain: string[];         // ordered words played
  usedWords: string[];         // for duplicate check
  currentWord: string;         // last word played
  turnStartedAt: Date;
  roundNumber: number;

  // Result
  winner: IWordChainWinner | 'draw' | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

// ─── Dictionary Index ──────────────────────────────────────────
export interface DictionaryIndex {
  allWords: Set<string>;                     // O(1) existence check
  byFirstSyllable: Map<string, string[]>;    // "hồng" → ["hồng hà", "hồng phúc", ...]
  bySyllableCount: Map<number, Set<string>>; // 2 → Set(["hoa hồng", ...])
  totalWords: number;
  totalCompound: number;   // 2+ syllables
  totalSingle: number;     // 1 syllable
}

// ─── Validation Result ─────────────────────────────────────────
export interface WordValidationResult {
  valid: boolean;
  reason?: RejectionReason;
}
