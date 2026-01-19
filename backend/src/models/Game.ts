import mongoose, { Document, Schema } from 'mongoose';

export interface IGameRules {
  blockTwoEnds: boolean;
  allowUndo: boolean;
  maxUndoPerGame: number;
  timeLimit: number | null;
}

export interface IGameScore {
  player1: number;
  player2: number;
}

export interface IGame extends Document {
  roomId: string;
  roomCode: string;
  gameType: string; // 'caro', 'wheel', etc.
  player1: mongoose.Types.ObjectId | null;
  player2: mongoose.Types.ObjectId | null;
  player1GuestId: string | null;
  player2GuestId: string | null;
  player1GuestName: string | null; // Guest display name for player 1
  player2GuestName: string | null; // Guest display name for player 2
  player1Marker: string | null; // Custom marker for player 1
  player2Marker: string | null; // Custom marker for player 2
  password: string | null; // Hashed password for the game room (only host can set)
  boardSize: number;
  board: number[][];
  currentPlayer: 1 | 2;
  gameStatus: 'waiting' | 'playing' | 'finished' | 'abandoned';
  winner: 1 | 2 | null | 'draw';
  winningLine?: Array<{ row: number; col: number }>;
  rules: IGameRules;
  score: IGameScore;
  moves: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
}

const GameRulesSchema: Schema = new Schema({
  blockTwoEnds: {
    type: Boolean,
    default: false,
  },
  allowUndo: {
    type: Boolean,
    default: true,
  },
  maxUndoPerGame: {
    type: Number,
    default: 3,
  },
  timeLimit: {
    type: Number,
    default: null,
  },
});

const GameScoreSchema: Schema = new Schema({
  player1: {
    type: Number,
    default: 0,
  },
  player2: {
    type: Number,
    default: 0,
  },
});

const GameSchema: Schema = new Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true, // Explicit index for faster lookups (fixes Issue #8)
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6,
    index: true, // Index for room code lookups
  },
  gameType: {
    type: String,
    required: true,
    default: 'caro',
    trim: true,
    lowercase: true,
  },
  player1: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  player2: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  player1GuestId: {
    type: String,
    default: null,
  },
  player2GuestId: {
    type: String,
    default: null,
  },
  player1GuestName: {
    type: String,
    default: null,
    maxlength: 20,
  },
  player2GuestName: {
    type: String,
    default: null,
    maxlength: 20,
  },
  player1Marker: {
    type: String,
    default: null,
    maxlength: 200000, // Support base64 images (up to ~150KB image)
  },
  player2Marker: {
    type: String,
    default: null,
    maxlength: 200000, // Support base64 images (up to ~150KB image)
  },
  password: {
    type: String,
    default: null,
    select: false, // Don't return password by default in queries
  },
  boardSize: {
    type: Number,
    required: true,
    default: 15,
  },
  board: {
    type: [[Number]],
    required: true,
  },
  currentPlayer: {
    type: Number,
    enum: [1, 2],
    default: 1,
  },
  gameStatus: {
    type: String,
    enum: ['waiting', 'playing', 'finished', 'abandoned'],
    default: 'waiting',
  },
  winner: {
    type: Schema.Types.Mixed,
    default: null,
  },
  winningLine: {
    type: [{
      row: { type: Number, required: true },
      col: { type: Number, required: true },
    }],
    default: undefined,
  },
  rules: {
    type: GameRulesSchema,
    required: true,
  },
  score: {
    type: GameScoreSchema,
    default: { player1: 0, player2: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  finishedAt: {
    type: Date,
    default: null,
  },
});

GameSchema.virtual('moves', {
  ref: 'GameMove',
  localField: '_id',
  foreignField: 'gameId',
});

GameSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Compound index for getWaitingGames query (fixes Issue #8)
GameSchema.index({ gameStatus: 1, createdAt: -1 });

export default mongoose.model<IGame>('Game', GameSchema);

