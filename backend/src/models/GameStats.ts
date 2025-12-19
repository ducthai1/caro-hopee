import mongoose, { Document, Schema } from 'mongoose';

export interface IGameStats extends Document {
  userId: mongoose.Types.ObjectId;
  gameId: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  customStats: Map<string, any>;
  lastPlayed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GameStatsSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gameId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  wins: {
    type: Number,
    default: 0,
    min: 0,
  },
  losses: {
    type: Number,
    default: 0,
    min: 0,
  },
  draws: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  customStats: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
  },
  lastPlayed: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique compound index: one stats record per user per game
GameStatsSchema.index({ userId: 1, gameId: 1 }, { unique: true });

// Indexes for leaderboard queries
GameStatsSchema.index({ gameId: 1, totalScore: -1 });
GameStatsSchema.index({ gameId: 1, wins: -1 });
GameStatsSchema.index({ userId: 1 });

// Update updatedAt before save
GameStatsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IGameStats>('GameStats', GameStatsSchema);

