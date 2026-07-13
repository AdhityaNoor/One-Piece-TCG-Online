/**
 * The unified pre-menu landing flow. Replaces the old, disconnected
 * AuthScreen (which dropped straight into a login form the instant the app
 * loaded, with no visual relationship to the main menu it handed off to).
 *
 * Flow:
 *   1. App loads -> only a "Start" button is shown (BrandLogo + Start).
 *   2. Start clicked -> login form appears (replaces the Start button).
 *   3. "New here? Create an account" clicked -> signup form replaces login.
 *   4. Login/signup succeeds -> App.tsx's gate flips (`status ===
 *      'authenticated'`) and swaps this whole screen out for the real
 *      nav stack, which defaults to MainMenuScreen -> the main menu buttons
 *      "appear" via that existing hand-off, not anything owned by this file.
 *
 * `stage` here is local UI state only, independent of authStore's `status`
 * — this screen never decides auth outcomes, only which of its own panels
 * is visible. App.tsx still owns the actual gate (status !== 'authenticated'
 * && !offlineMode) and is untouched by this stage machine.
 *
 * Shares BrandLogo + LandingBackdrop with MainMenuScreen so Start ->
 * Login/Signup -> Main Menu reads as one continuous page instead of a hard
 * cut between unrelated screens, which is the whole point of merging these
 * into "the landing page" rather than a separate auth screen.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { BrandLogo, Button, CanvasMenuButton, GameCanvasScreen, LandingBackdrop } from '../components';
import { useAuthStore } from '../store/authStore';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';

type Stage = 'start' | 'login' | 'signup';

export function LandingScreen() {
  const [stage, setStage] = useState<Stage>('start');

  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const continueOffline = useAuthStore((s) => s.continueOffline);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const isSignup = stage === 'signup';
  const configured = isBackendConfigured();

  function goTo(next: Stage): void {
    clearError();
    setStage(next);
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!configured) return;
    // On success authStore flips to `authenticated` and App.tsx swaps this
    // whole screen out for the main menu — nothing to navigate here.
    if (isSignup) await signup(email, username, password);
    else await login(email, password);
  }

  return (
    <GameCanvasScreen onBack={stage !== 'start' ? () => goTo('start') : undefined}>
      <LandingBackdrop />

      {stage === 'start' ? (
        <div className="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden">
          <BrandLogo />
          <nav className="relative z-10 flex w-full flex-col items-center gap-3" aria-label="Landing">
            <CanvasMenuButton label="Start" prominence="primary" onClick={() => goTo('login')} />
          </nav>
        </div>
      ) : (
        <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-md flex-col justify-center gap-5">
          <h1 className="text-center font-display text-3xl font-black uppercase tracking-[0.04em] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.55)] sm:text-4xl">
            {isSignup ? 'Sign Up' : 'Sign In'}
          </h1>
          {configured ? (
            <p className="text-center text-sm text-slate-200/70">
              {isSignup
                ? 'Create your crew. Your account name is your player handle.'
                : 'Sign in to play online. Your account name is your player handle.'}
            </p>
          ) : (
            <p className="border border-amber-300/30 bg-amber-500/10 p-3 text-center text-sm text-amber-100/90">
              Online play isn't configured for this build (no backend URL set). Set <code>VITE_API_BASE_URL</code> to
              enable accounts, or continue offline for local play.
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
              onClick={() => goTo(isSignup ? 'login' : 'signup')}
            >
              {isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          )}

          {!configured && (
            <div className="mt-1 border-t border-white/10 pt-4">
              <Button variant="ghost" fullWidth onClick={() => continueOffline()}>
                Continue offline (local play)
              </Button>
            </div>
          )}
        </div>
      )}
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
