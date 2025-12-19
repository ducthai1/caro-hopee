import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayerResult {
  userId: mongoose.Types.ObjectId | null;
  guestId: string | null;
  score: number;
  result: 'win' | 'loss' | 'draw';
}

export interface IGameSession extends Document {
  gameId: string;
  sessionId: string;
  players: IPlayerResult[];
  gameData: any; // Game-specific data (flexible schema)
  startedAt: Date;
  finishedAt: Date | null;
  duration: number; // seconds
  isValid: boolean; // For anti-cheat validation
  createdAt: Date;
}

const PlayerResultSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  guestId: {
    type: String,
    default: null,
  },
  score: {
    type: Number,
    default: 0,
  },
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true,
  },
}, { _id: false });

const GameSessionSchema: Schema = new Schema({
  gameId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  players: {
    type: [PlayerResultSchema],
    required: true,
    validate: {
      validator: (players: IPlayerResult[]) => players.length > 0,
      message: 'At least one player is required',
    },
  },
  gameData: {
    type: Schema.Types.Mixed,
    default: {},
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  finishedAt: {
    type: Date,
    default: null,
  },
  duration: {
    type: Number,
    default: 0,
    min: 0,
  },
  isValid: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient queries
GameSessionSchema.index({ gameId: 1, finishedAt: -1 });
GameSessionSchema.index({ 'players.userId': 1 });
GameSessionSchema.index({ sessionId: 1 });
GameSessionSchema.index({ gameId: 1, createdAt: -1 });

// Calculate duration before save if finished
GameSessionSchema.pre('save', function (next) {
  const doc = this as any;
  if (doc.finishedAt && doc.startedAt) {
    const finished = doc.finishedAt instanceof Date 
      ? doc.finishedAt 
      : new Date(doc.finishedAt);
    const started = doc.startedAt instanceof Date 
      ? doc.startedAt 
      : new Date(doc.startedAt);
    doc.duration = Math.floor((finished.getTime() - started.getTime()) / 1000);
  }
  next();
});

export default mongoose.model<IGameSession>('GameSession', GameSessionSchema);

