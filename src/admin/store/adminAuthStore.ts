/**
 * Admin CMS session state. Deliberately a completely separate store/token
 * from src/app/store/authStore.ts (player session) — different storage key,
 * different token, different backend collection on the other end (project
 * decision: "fully separate admin credential store"). Nothing in here ever
 * touches authStore or vice versa.
 */
import { create } from 'zustand';
import type { PublicAdmin } from '../../../shared/admin';
import { AdminApiError } from '../net/shared';
import { adminLogin, fetchAdminMe } from '../net/adminAuthClient';
import { browserStorage } from '../../app/lib/runtime';

const ADMIN_TOKEN_KEY = 'optcg.admin.token';

export type AdminAuthStatus = 'unknown' | 'anonymous' | 'authenticated';

interface AdminAuthState {
  status: AdminAuthStatus;
  admin: PublicAdmin | null;
  token: string | null;
  busy: boolean;
  error: string | null;

  init(): Promise<void>;
  login(email: string, password: string): Promise<boolean>;
  logout(): void;
  clearError(): void;
}

function persistToken(token: string | null): void {
  if (token) browserStorage.setItem(ADMIN_TOKEN_KEY, token);
  else browserStorage.removeItem(ADMIN_TOKEN_KEY);
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  status: 'unknown',
  admin: null,
  token: null,
  busy: false,
  error: null,

  async init() {
    const token = browserStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      set({ status: 'anonymous' });
      return;
    }
    try {
      const { admin } = await fetchAdminMe(token);
      set({ status: 'authenticated', admin, token });
    } catch {
      persistToken(null);
      set({ status: 'anonymous', admin: null, token: null });
    }
  },

  async login(email, password) {
    set({ busy: true, error: null });
    try {
      const { token, admin } = await adminLogin({ email, password });
      persistToken(token);
      set({ status: 'authenticated', admin, token, busy: false });
      return true;
    } catch (cause) {
      set({ busy: false, error: cause instanceof AdminApiError ? cause.message : 'Something went wrong. Please try again.' });
      return false;
    }
  },

  logout() {
    persistToken(null);
    set({ status: 'anonymous', admin: null, token: null, busy: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
