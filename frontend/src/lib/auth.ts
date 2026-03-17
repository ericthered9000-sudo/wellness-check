const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  role: 'senior' | 'family';
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  details?: Array<{ path: string[]; message: string }>;
}

// Token is now stored in httpOnly cookie by backend
// These functions are kept for backward compatibility

export const getToken = (): string | null => {
  // Token is in httpOnly cookie, not accessible from JavaScript
  return null;
};

export const setToken = (_token: string): void => {
  // Token is set by backend as httpOnly cookie
  console.log('Token set by backend as httpOnly cookie');
};

export const clearToken = (): void => {
  // Token is cleared by backend on logout
  console.log('Token cleared by backend');
};

// API client with credentials (cookies)
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with request
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

  // Token is set by backend as httpOnly cookie
  return response;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Token is set by backend as httpOnly cookie
  return response;
}

export async function getCurrentUser(): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/auth/me');
}

export async function logout(): Promise<void> {
  // Call backend to clear cookie
  await apiClient('/api/auth/logout', {
    method: 'POST',
  });
  clearToken();
}

export function isAuthenticated(): boolean {
  // Check is done by backend via cookie
  // This is a placeholder - actual check happens on API calls
  return true;
}
