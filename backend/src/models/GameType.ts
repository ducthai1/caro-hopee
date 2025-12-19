import mongoose, { Document, Schema } from 'mongoose';

export interface IGameType extends Document {
  gameId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

const GameTypeSchema: Schema = new Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster lookups
GameTypeSchema.index({ gameId: 1 });
GameTypeSchema.index({ isActive: 1 });

export default mongoose.model<IGameType>('GameType', GameTypeSchema);

