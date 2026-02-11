import mongoose, { Schema, Document } from 'mongoose';

export interface IMissingWord extends Document {
  word: string;
  source: string;
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

const MissingWordSchema = new Schema({
  word: { type: String, required: true, unique: true, trim: true, lowercase: true },
  source: { type: String, default: 'word-chain' },
  count: { type: Number, default: 1 },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending',
    index: true 
  },
}, {
  timestamps: true // adds createdAt, updatedAt automatically but we use custom fields too
});

// Index for frequent queries
MissingWordSchema.index({ count: -1 });
MissingWordSchema.index({ status: 1 });

export default mongoose.model<IMissingWord>('MissingWord', MissingWordSchema);
