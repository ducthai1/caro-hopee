import mongoose, { Document, Schema } from 'mongoose';

export interface IRanking {
  userId: mongoose.Types.ObjectId;
  rank: number;
  score: number;
  wins: number;
  updatedAt: Date;
}

export interface ILeaderboard extends Document {
  gameId: string;
  period: 'daily' | 'weekly' | 'all-time';
  periodStart: Date;
  periodEnd: Date | null;
  rankings: IRanking[];
  updatedAt: Date;
}

const RankingSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rank: {
    type: Number,
    required: true,
    min: 1,
  },
  score: {
    type: Number,
    required: true,
    default: 0,
  },
  wins: {
    type: Number,
    required: true,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const LeaderboardSchema: Schema = new Schema({
  gameId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'all-time'],
    required: true,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    default: null,
  },
  rankings: {
    type: [RankingSchema],
    default: [],
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient queries
LeaderboardSchema.index({ gameId: 1, period: 1, periodStart: -1 });
LeaderboardSchema.index({ gameId: 1, period: 1 });

// Update updatedAt before save
LeaderboardSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);

