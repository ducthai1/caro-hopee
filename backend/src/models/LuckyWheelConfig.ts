import mongoose, { Document, Schema } from 'mongoose';

export interface IWheelItem {
  label: string;
  weight: number;
}

export interface ILuckyWheelConfig extends Document {
  userId?: mongoose.Types.ObjectId;  // null nếu là guest
  guestId?: string;                  // null nếu là authenticated user
  guestName?: string;                 // Tên hiển thị của guest
  items: IWheelItem[];
  lastActivityAt?: Date;             // Track last activity for session cleanup
  createdAt: Date;
  updatedAt: Date;
}

const WheelItemSchema = new Schema({
  label: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 1,
  },
}, { _id: false });

const LuckyWheelConfigSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  guestId: {
    type: String,
    default: null,
    index: true,
  },
  guestName: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  items: {
    type: [WheelItemSchema],
    required: true,
    validate: {
      validator: (items: IWheelItem[]) => items.length >= 2 && items.length <= 12,
      message: 'Items must be between 2 and 12',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
});

// Index để query nhanh
LuckyWheelConfigSchema.index({ userId: 1 });
LuckyWheelConfigSchema.index({ guestId: 1 });
LuckyWheelConfigSchema.index({ updatedAt: -1 });
LuckyWheelConfigSchema.index({ lastActivityAt: 1 }); // For cleanup queries

// Update updatedAt và lastActivityAt trước khi save
LuckyWheelConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (!this.lastActivityAt) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Ensure only one config per user (either userId or guestId)
LuckyWheelConfigSchema.index({ userId: 1 }, { unique: true, sparse: true });
LuckyWheelConfigSchema.index({ guestId: 1 }, { unique: true, sparse: true });

export default mongoose.model<ILuckyWheelConfig>('LuckyWheelConfig', LuckyWheelConfigSchema);
