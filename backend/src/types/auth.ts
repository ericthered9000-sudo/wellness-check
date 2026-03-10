import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  role: 'senior' | 'family';
  password_hash?: string;
  created_at: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'senior' | 'family';
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'senior' | 'family';
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: 'senior' | 'family';
  };
  token?: string;
  error?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: 'senior' | 'family';
  iat: number;
  exp: number;
}