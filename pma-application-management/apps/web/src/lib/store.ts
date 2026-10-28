import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'PREPARER' | 'REVIEWER' | 'ADMIN';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'pma-auth' },
  ),
);

// Theme + font-scale, persisted (design system §14).
export function applySettings(): void {
  const theme = localStorage.getItem('ce-theme') || 'dark';
  const font = localStorage.getItem('ce-font') || 'default';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-font', font);
}
export function setFont(s: string): void {
  document.documentElement.setAttribute('data-font', s);
  localStorage.setItem('ce-font', s);
}
export function toggleTheme(): void {
  const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('ce-theme', n);
}
