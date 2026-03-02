/**
 * GoGame — Mongoose model for Go (Cờ Vây) game.
 * Supports 2 players, full board state, scoring phase, superko detection.
 */
import mongoose, { Schema } from 'mongoose';
import { IGoGame } from '../types/go.types';

// ─── Sub-schemas ───────────────────────────────────────────────

const GoPlayerSchema = new Schema({
  slot: { type: Number, required: true, min: 1, max: 2 },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  guestId: { type: String, default: null },
  guestName: { type: String, default: null, maxlength: 20 },
  color: { type: String, enum: ['black', 'white'], required: true },
  captures: { type: Number, default: 0 },
  mainTimeLeft: { type: Number, default: 0 },
  byoyomiPeriodsLeft: { type: Number, default: 3 },
  passed: { type: Boolean, default: false },
  scoringAgreed: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: true },
  disconnectedAt: { type: Date, default: null },
}, { _id: false });

const GoSettingsSchema = new Schema({
  boardSize: { type: Number, enum: [9, 13, 19], default: 19 },
  komi: { type: Number, default: 6.5 },
  handicap: { type: Number, default: 0, min: 0, max: 9 },
  mainTime: { type: Number, default: 0, min: 0 },     // 0 = no timer
  byoyomiPeriods: { type: Number, default: 3, min: 0 },
  byoyomiTime: { type: Number, default: 30, min: 5 }, // seconds per period
}, { _id: false });

const GoMoveSchema = new Schema({
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  color: { type: String, enum: ['black', 'white'], required: true },
  captures: { type: [Schema.Types.Mixed], default: [] }, // { row, col }[]
  isPass: { type: Boolean, default: false },
  moveNumber: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// ─── Main Schema ───────────────────────────────────────────────

const GoGameSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  roomCode: {
    type: String, required: true, unique: true,
    uppercase: true, minlength: 6, maxlength: 6, index: true,
  },
  gameType: { type: String, required: true, default: 'go', immutable: true },
  hostPlayerId: { type: String, required: true },

  settings: { type: GoSettingsSchema, required: true, default: () => ({}) },
  players: {
    type: [GoPlayerSchema], default: [],
    validate: { validator: (v: unknown[]) => v.length <= 2, message: 'Maximum 2 players' },
  },

  // Board state — stored as flat array of arrays
  board: { type: [[Number]], default: null },
  boardHistory: { type: [String], default: [] }, // board hashes for superko
  currentColor: { type: String, enum: ['black', 'white'], default: 'black' },

  gameStatus: {
    type: String,
    enum: ['waiting', 'playing', 'scoring', 'finished', 'abandoned'],
    default: 'waiting',
  },
  phase: {
    type: String,
    enum: ['play', 'scoring'],
    default: 'play',
  },
  consecutivePasses: { type: Number, default: 0 },
  koPoint: { type: Schema.Types.Mixed, default: null }, // { row, col } | null
  moveCount: { type: Number, default: 0 },

  // Scoring phase
  deadStones: { type: [String], default: [] },          // "row-col" keys
  territory: {
    type: Schema.Types.Mixed,
    default: () => ({ black: [], white: [], neutral: [] }),
  },

  moveHistory: { type: [GoMoveSchema], default: [] },

  winner: { type: Schema.Types.Mixed, default: null },
  winReason: { type: String, enum: ['score', 'resign', 'timeout', null], default: null },
  finalScore: { type: Schema.Types.Mixed, default: null },

  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },

  // Room password (hidden from reads by default)
  password: { type: String, default: null, select: false },
}, { timestamps: true });

// ─── Hooks ─────────────────────────────────────────────────────

GoGameSchema.pre('save', function (next) {
  // Initialize board on first save if not set
  if (!this.board || (this.board as unknown[]).length === 0) {
    const size = (this.settings as { boardSize: number }).boardSize ?? 19;
    (this as unknown as { board: number[][] }).board = Array.from(
      { length: size },
      () => Array(size).fill(0) as number[]
    );
  }
  next();
});

// ─── Indexes ───────────────────────────────────────────────────

GoGameSchema.index({ gameStatus: 1, createdAt: -1 });

export default mongoose.model<IGoGame>('GoGame', GoGameSchema);
