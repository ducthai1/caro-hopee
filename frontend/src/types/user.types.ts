export interface UserAvatar {
  type: 'preset' | 'gravatar';
  value: string; // preset ID or gravatar email hash
}

export interface UserSettings {
  language: 'en' | 'vi';
  emailNotifications: boolean;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role?: 'user' | 'admin';
  displayName?: string;
  bio?: string;
  avatar?: UserAvatar;
  settings?: UserSettings;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  createdAt: string;
  lastLogin: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  avatar?: UserAvatar;
  settings?: UserSettings;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

