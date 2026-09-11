import api from './api';
import type { Admin } from '../types';

interface LoginRequest {
  phone: string;
  password: string;
}

interface RegisterRequest {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  role: 'ADMIN';
}

interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: Admin;
  };
}

export const adminAuthService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/api/admin/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/api/admin/auth/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    const response = await api.post('/api/admin/auth/logout');
    return response.data;
  },

  async getMe(): Promise<{ success: boolean; data: Admin }> {
    const response = await api.get('/api/admin/auth/me');
    return response.data;
  },

  setToken(token: string): void {
    localStorage.setItem('admin_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('admin_token');
  },

  clearToken(): void {
    localStorage.removeItem('admin_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};