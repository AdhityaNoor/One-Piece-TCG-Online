/**
 * Sign in / sign up gate. Shown by App BEFORE the main menu whenever there is
 * no session — so online identity is established up front and the account
 * username becomes the app-wide handle (see authStore.adoptUsername).
 *
 * It is a soft gate: no "back", but a "Continue offline" button drops the
 * player at the main menu for local / hot-seat play when they don't want (or
 * can't) sign in. When no backend is configured, the form explains that online
 * is unavailable and points the player to the offline button.
 *
 * One component toggles between login and signup via internal state (no nav
 * involvement — the gate lives outside the navigation stack). Uses the shared
 * canvas shell + Button so it matches the title flow.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, GameCanvasScreen } from '../components';
import { useAuthStore } from '../store/authStore';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';

export function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const continueOffline = useAuthStore((s) => s.continueOffline);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const isSignup = mode === 'signup';
  const configured = isBackendConfigured();

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!configured) return;
    // On success the auth store flips to `authenticated` and App swaps this
    // gate out for the main menu — nothing to navigate.
    if (isSignup) await signup(email, username, password);
    else await login(email, password);
  }

  function switchMode(): void {
    clearError();
    setMode(isSignup ? 'login' : 'signup');
  }

  return (
    <GameCanvasScreen
      kicker="One Piece TCG Online"
      status={configured ? (isSignup ? 'Create your crew' : 'Welcome back') : 'Online unavailable'}
      title={isSignup ? 'Sign Up' : 'Sign In'}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col justify-center gap-5">
        {configured ? (
          <p className="text-center text-sm text-slate-200/70">
            Sign in to play online. Your account name is your player handle.
          </p>
        ) : (
          <p className="border border-amber-300/30 bg-amber-500/10 p-3 text-center text-sm text-amber-100/90">
            Online play isn't configured for this build (no backend URL set). Set
            {' '}<code>VITE_API_BASE_URL</code> to enable accounts, or continue offline for local play.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="auth-email">
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              disabled={!configured}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError();
              }}
              className={inputClass}
            />
          </Field>

          {isSignup && (
            <Field label="Username" htmlFor="auth-username">
              <input
                id="auth-username"
                type="text"
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={20}
                disabled={!configured}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearError();
                }}
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Password" htmlFor="auth-password" hint={isSignup ? 'At least 8 characters' : undefined}>
            <input
              id="auth-password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={8}
              disabled={!configured}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError();
              }}
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <Button type="submit" variant="primary" fullWidth disabled={busy || !configured}>
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        {configured && (
          <button
            type="button"
            className="text-center text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
            onClick={switchMode}
          >
            {isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
        )}

        <div className="mt-1 border-t border-white/10 pt-4">
          <Button variant="ghost" fullWidth onClick={() => continueOffline()}>
            Continue offline (local play)
          </Button>
        </div>
      </div>
    </GameCanvasScreen>
  );
}

const inputClass =
  'w-full border border-white/25 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-gold/70 disabled:opacity-40';

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-white/45">{hint}</span>}
    </label>
  );
}
