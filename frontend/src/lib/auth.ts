const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  role: 'senior' | 'family';
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  details?: Array<{ path: string[]; message: string }>;
}

// Token storage
export const getToken = (): string | null => localStorage.getItem('auth_token');
export const setToken = (token: string): void => localStorage.setItem('auth_token', token);
export const clearToken = (): void => localStorage.removeItem('auth_token');

// API client with auth headers
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

// Auth functions
export async function register(email: string, password: string, role: 'senior' | 'family'): Promise<AuthResponse> {
  const response = await apiClient<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });

  if (response.success && response.token) {
    setToken(response.token);
  }

  return response;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.success && response.token) {
    setToken(response.token);
  }

  return response;
}

export async function getCurrentUser(): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/auth/me');
}

export function logout(): void {
  clearToken();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}