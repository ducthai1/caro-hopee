/**
 * TinhTuyGame — Mongoose model for Tinh Tuy Dai Chien (Monopoly-style board game).
 * Supports 2-4 players, turn-based gameplay, property ownership.
 */
import mongoose, { Schema } from 'mongoose';
import { ITinhTuyGame } from '../types/tinh-tuy.types';

// ─── Sub-schemas ───────────────────────────────────────────────

const TinhTuyPlayerSchema = new Schema({
  slot: { type: Number, required: true, min: 1, max: 4 },
  character: { type: String, enum: ['shiba', 'kungfu', 'fox', 'elephant'], required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  guestId: { type: String, default: null },
  guestName: { type: String, default: null, maxlength: 20 },
  points: { type: Number, required: true },
  position: { type: Number, default: 0 },
  properties: { type: [Number], default: [] },
  houses: { type: Schema.Types.Mixed, default: {} },
  hotels: { type: Schema.Types.Mixed, default: {} },
  // festivals removed — now game-level field
  islandTurns: { type: Number, default: 0 },
  cards: { type: [String], default: [] },
  isBankrupt: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: true },
  disconnectedAt: { type: Date, default: null },
  consecutiveDoubles: { type: Number, default: 0 },
  skipNextTurn: { type: Boolean, default: false },
  immunityNextRent: { type: Boolean, default: false },
  doubleRentTurns: { type: Number, default: 0 },
  pendingTravel: { type: Boolean, default: false },
  deviceType: { type: String, default: 'desktop' },
}, { _id: false });

const TinhTuySettingsSchema = new Schema({
  maxPlayers: { type: Number, default: 4, min: 2, max: 4 },
  startingPoints: { type: Number, default: 20000 },
  gameMode: { type: String, enum: ['classic', 'timed', 'rounds'], default: 'classic' },
  timeLimit: { type: Number, default: null },
  maxRounds: { type: Number, default: null },
  turnDuration: { type: Number, default: 60, min: 30, max: 120 },
  password: { type: String, default: null, select: false },
}, { _id: false });

// ─── Main Schema ───────────────────────────────────────────────

const TinhTuyGameSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  roomCode: {
    type: String, required: true, unique: true,
    uppercase: true, minlength: 6, maxlength: 6, index: true,
  },
  gameType: { type: String, required: true, default: 'tinh-tuy', immutable: true },
  hostPlayerId: { type: String, required: true },

  settings: { type: TinhTuySettingsSchema, required: true, default: () => ({}) },
  players: {
    type: [TinhTuyPlayerSchema], default: [],
    validate: { validator: (v: unknown[]) => v.length <= 4, message: 'Maximum 4 players' },
  },

  gameStatus: {
    type: String,
    enum: ['waiting', 'playing', 'finished', 'abandoned'],
    default: 'waiting',
  },
  currentPlayerSlot: { type: Number, default: 1 },
  turnPhase: {
    type: String,
    enum: ['ROLL_DICE', 'MOVING', 'AWAITING_ACTION', 'AWAITING_BUILD', 'AWAITING_FREE_HOUSE', 'AWAITING_CARD', 'AWAITING_CARD_DISPLAY', 'AWAITING_TRAVEL', 'AWAITING_FESTIVAL', 'AWAITING_SELL', 'AWAITING_DESTROY_PROPERTY', 'AWAITING_DOWNGRADE_BUILDING', 'AWAITING_BUYBACK', 'AWAITING_CARD_DESTINATION', 'AWAITING_FORCED_TRADE', 'AWAITING_RENT_FREEZE', 'ISLAND_TURN', 'END_TURN'],
    default: 'ROLL_DICE',
  },
  turnStartedAt: { type: Date, default: null },
  lastDiceResult: { type: Schema.Types.Mixed, default: null },

  // Card decks (Phase 3 — placeholder for now)
  luckCardDeck: { type: [String], default: [] },
  luckCardIndex: { type: Number, default: 0 },
  opportunityCardDeck: { type: [String], default: [] },
  opportunityCardIndex: { type: Number, default: 0 },

  round: { type: Number, default: 0 },
  gameStartedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },

  /** Global festival — only one on the board at a time { slot, cellIndex, multiplier } */
  festival: { type: Schema.Types.Mixed, default: null },

  /** Frozen properties — rent is 0 for these cells [{cellIndex, turnsRemaining}] */
  frozenProperties: { type: [Schema.Types.Mixed], default: [] },

  winner: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true });

// ─── Hooks ─────────────────────────────────────────────────────

TinhTuyGameSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─── Indexes ───────────────────────────────────────────────────

TinhTuyGameSchema.index({ gameStatus: 1, createdAt: -1 });

export default mongoose.model<ITinhTuyGame>('TinhTuyGame', TinhTuyGameSchema);
