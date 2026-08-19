import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BaseUser, UserRole } from '../types';

interface AuthState {
  user: BaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: BaseUser) => void;
  logout: () => void;
}

// Generate JWT-like token (simplified for client-side)
const generateToken = (user: BaseUser): string => {
  const payload = {
    id: user.id,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  return btoa(JSON.stringify(payload));
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user: BaseUser) => {
        const token = generateToken(user);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'sip-auth',
    }
  )
);

// Helper to check if user has specific role
export const hasRole = (user: BaseUser | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role);
};

// Check if token is valid
export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
};
