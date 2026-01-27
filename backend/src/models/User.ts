import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAvatar {
  type: 'preset' | 'gravatar';
  value: string; // preset ID or gravatar email hash
}

export interface IUserSettings {
  language: 'en' | 'vi';
  emailNotifications: boolean;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  // Profile fields
  displayName?: string;
  bio?: string;
  avatar: IUserAvatar;
  settings: IUserSettings;
  // Legacy fields - kept for backward compatibility, will be deprecated
  wins?: number;
  losses?: number;
  draws?: number;
  totalScore?: number;
  createdAt: Date;
  lastLogin: Date;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  // Profile fields
  displayName: {
    type: String,
    trim: true,
    maxlength: 30,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  avatar: {
    type: {
      type: String,
      enum: ['preset', 'gravatar'],
      default: 'preset',
    },
    value: {
      type: String,
      default: 'default-1',
    },
  },
  settings: {
    language: {
      type: String,
      enum: ['en', 'vi'],
      default: 'en',
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  // Legacy fields - kept for backward compatibility during migration
  wins: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  draws: {
    type: Number,
    default: 0,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IUser>('User', UserSchema);

