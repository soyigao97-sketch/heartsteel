import { create } from 'zustand';
import api from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (account: string, password: string) => Promise<void>;
  register: (data: { phone: string; password: string; nickname: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: !!localStorage.getItem('accessToken'),
  loading: false,

  login: async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, isLoggedIn: true });
  },

  register: async (registerData) => {
    const { data } = await api.post('/auth/register', registerData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isLoggedIn: false });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, isLoggedIn: true });
    } catch {
      localStorage.clear();
      set({ user: null, isLoggedIn: false });
    }
  },

  updateUser: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },
}));
