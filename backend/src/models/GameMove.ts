import mongoose, { Document, Schema } from 'mongoose';

export interface IGameMove extends Document {
  gameId: mongoose.Types.ObjectId;
  player: 1 | 2;
  row: number;
  col: number;
  moveNumber: number;
  timestamp: Date;
  isUndone: boolean;
}

const GameMoveSchema: Schema = new Schema({
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
  },
  player: {
    type: Number,
    enum: [1, 2],
    required: true,
  },
  row: {
    type: Number,
    required: true,
  },
  col: {
    type: Number,
    required: true,
  },
  moveNumber: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isUndone: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model<IGameMove>('GameMove', GameMoveSchema);

