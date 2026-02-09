/**
 * WordChainGame - Mongoose model for Word Chain (Nối Từ) games.
 * Supports 2-8 players with turn rotation, lives system, configurable rules.
 */
import mongoose, { Schema } from 'mongoose';
import { IWordChainGame } from '../types/word-chain.types';

// ─── Sub-schemas ───────────────────────────────────────────────

const WordChainPlayerSchema = new Schema({
  slot: { type: Number, required: true, min: 1, max: 8 },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  guestId: { type: String, default: null },
  guestName: { type: String, default: null, maxlength: 20 },
  lives: { type: Number, required: true, default: 3 },
  score: { type: Number, default: 0 },
  wordsPlayed: { type: Number, default: 0 },
  isEliminated: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: true },
  disconnectedAt: { type: Date, default: null },
}, { _id: false });

const WordChainRulesSchema = new Schema({
  wordType: { type: String, enum: ['2+', '3+', 'all'], default: '2+' },
  allowProperNouns: { type: Boolean, default: false },
  allowSlang: { type: Boolean, default: false },
  turnDuration: { type: Number, default: 60, min: 15, max: 120 },
  lives: { type: Number, default: 3, min: 1, max: 5 },
  gameMode: { type: String, enum: ['classic', 'speed'], default: 'classic' },
  allowRepeat: { type: Boolean, default: false },
  showHint: { type: Boolean, default: true },
}, { _id: false });

const WordChainWinnerSchema = new Schema({
  slot: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  guestId: { type: String, default: null },
  guestName: { type: String, default: null },
}, { _id: false });

// ─── Main Schema ───────────────────────────────────────────────

const WordChainGameSchema = new Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6,
    index: true,
  },
  gameType: {
    type: String,
    required: true,
    default: 'word-chain',
    immutable: true,
  },
  hostPlayerId: {
    type: String,
    required: true,
  },

  // Room settings
  maxPlayers: {
    type: Number,
    required: true,
    default: 2,
    min: 2,
    max: 8,
  },
  rules: {
    type: WordChainRulesSchema,
    required: true,
    default: () => ({}),
  },
  password: {
    type: String,
    default: null,
    select: false, // Don't return password by default in queries
  },

  // Players (array for 2-8)
  players: {
    type: [WordChainPlayerSchema],
    default: [],
    validate: {
      validator: (v: unknown[]) => v.length <= 8,
      message: 'Maximum 8 players allowed',
    },
  },

  // Game state
  gameStatus: {
    type: String,
    enum: ['waiting', 'playing', 'finished', 'abandoned'],
    default: 'waiting',
  },
  currentPlayerSlot: {
    type: Number,
    default: 1,
  },
  wordChain: {
    type: [String],
    default: [],
  },
  usedWords: {
    type: [String],
    default: [],
  },
  currentWord: {
    type: String,
    default: '',
  },
  turnStartedAt: {
    type: Date,
    default: null,
  },
  roundNumber: {
    type: Number,
    default: 0,
  },

  // Result
  winner: {
    type: Schema.Types.Mixed, // IWordChainWinner | 'draw' | null
    default: null,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  finishedAt: {
    type: Date,
    default: null,
  },
});

// ─── Hooks ─────────────────────────────────────────────────────

WordChainGameSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─── Indexes ───────────────────────────────────────────────────

// For listing waiting rooms efficiently
WordChainGameSchema.index({ gameStatus: 1, createdAt: -1 });

export default mongoose.model<IWordChainGame>('WordChainGame', WordChainGameSchema);
