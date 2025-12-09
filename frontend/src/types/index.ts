// User Types
export interface User {
  id: string | number;
  username: string;
  email?: string;
  name?: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// Add more types as needed based on your domain

