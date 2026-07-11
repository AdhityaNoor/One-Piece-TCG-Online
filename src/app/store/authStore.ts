/**
 * Authenticated session state for online play. Persists ONLY the JWT (via the
 * same injected browserStorage the rest of the app uses — never window
 * directly), never the password. On boot it revalidates the token against
 * GET /auth/me so a stale/expired token silently logs the user out.
 *
 * Launch gate: the app shows the login/signup screen BEFORE the main menu
 * whenever there is no session (see App.tsx). To keep local / hot-seat play
 * working with no backend, the gate offers `continueOffline()` — a per-session
 * bypass that drops the player at the main menu with online features disabled.
 *
 * Username integration: the signed-in ACCOUNT username is the source of truth
 * for the player's display handle, so on every successful auth we push it into
 * the Settings store (settingsStore.username).
 *
 * Logout is purely client-side (drop the token) — matches the stateless-JWT
 * backend, which has no server session to destroy.
 */
import { create } from 'zustand';
import type { PublicUser } from '../../../shared/auth';
import { AuthApiError, fetchMe, login as apiLogin, signup as apiSignup } from '../../multiplayer/net/authClient';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { browserStorage } from '../lib/runtime';
import { useSettingsStore } from './settingsStore';

const TOKEN_KEY = 'optcg.auth.token';

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  token: string | null;
  busy: boolean;
  error: string | null;
  /** Per-session bypass of the launch gate for local-only play. */
  offlineMode: boolean;

  init(): Promise<void>;
  login(email: string, password: string): Promise<boolean>;
  signup(email: string, username: string, password: string): Promise<boolean>;
  logout(): void;
  continueOffline(): void;
  clearError(): void;
}

function persistToken(token: string | null): void {
  if (token) browserStorage.setItem(TOKEN_KEY, token);
  else browserStorage.removeItem(TOKEN_KEY);
}

/** Make the account name the app-wide display handle. */
function adoptUsername(user: PublicUser): void {
  useSettingsStore.getState().setUsername(user.username);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  user: null,
  token: null,
  busy: false,
  error: null,
  offlineMode: false,

  async init() {
    // Only try to restore a session when a backend exists to validate against.
    if (!isBackendConfigured()) {
      set({ status: 'anonymous' });
      return;
    }
    const token = browserStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ status: 'anonymous' });
      return;
    }
    try {
      const user = await fetchMe(token);
      adoptUsername(user);
      set({ status: 'authenticated', user, token });
    } catch {
      persistToken(null);
      set({ status: 'anonymous', user: null, token: null });
    }
  },

  async login(email, password) {
    set({ busy: true, error: null });
    try {
      const { token, user } = await apiLogin({ email, password });
      persistToken(token);
      adoptUsername(user);
      set({ status: 'authenticated', user, token, busy: false, offlineMode: false });
      return true;
    } catch (cause) {
      set({ busy: false, error: messageFor(cause) });
      return false;
    }
  },

  async signup(email, username, password) {
    set({ busy: true, error: null });
    try {
      const { token, user } = await apiSignup({ email, username, password });
      persistToken(token);
      adoptUsername(user);
      set({ status: 'authenticated', user, token, busy: false, offlineMode: false });
      return true;
    } catch (cause) {
      set({ busy: false, error: messageFor(cause) });
      return false;
    }
  },

  logout() {
    persistToken(null);
    set({ status: 'anonymous', user: null, token: null, busy: false, error: null, offlineMode: false });
    void get;
  },

  continueOffline() {
    set({ offlineMode: true, error: null });
  },

  clearError: () => set({ error: null }),
}));

function messageFor(cause: unknown): string {
  if (cause instanceof AuthApiError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return 'Something went wrong. Please try again.';
}
