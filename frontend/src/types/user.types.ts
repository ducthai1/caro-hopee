export interface User {
  _id: string;
  username: string;
  email: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  createdAt: string;
  lastLogin: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

