/**
 * Admin sign-in. Visually matches the player-facing LandingScreen (same dark
 * navy/gold backdrop, same brand mark, same Poppins type) so the CMS reads
 * as part of the same product instead of a bare internal tool — while still
 * being a fully separate credential store (see src/admin/store/adminAuthStore.ts
 * and server/src/adminAuth/*). Reuses GameCanvasScreen/BrandLogo/Button
 * directly by file path rather than importing them, since those files carry
 * no game-state or navigation dependencies of their own.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { GameCanvasScreen } from '../../app/components/GameCanvasScreen';
import { BrandLogo } from '../../app/components/BrandLogo';
import { Button } from '../../app/components/Button';

export function AdminLoginPage() {
  const login = useAdminAuthStore((s) => s.login);
  const busy = useAdminAuthStore((s) => s.busy);
  const error = useAdminAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    await login(email, password);
  }

  return (
    <GameCanvasScreen dense>
      <div className="relative flex h-full flex-col items-center justify-center gap-8 overflow-y-auto py-4">
        <div className="relative flex flex-col items-center gap-2">
          <BrandLogo />
          <span className="op-section-title">Admin Console</span>
        </div>

        <form onSubmit={handleSubmit} className="op-panel relative z-10 w-full max-w-sm rounded-sm p-6">
          <p className="mb-5 text-center text-sm text-white/60">Sign in with your admin account. This is separate from player accounts.</p>

          <div className="flex flex-col gap-4">
            <Field label="Email" htmlFor="admin-email">
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="op-input w-full rounded-sm px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
            <Field label="Password" htmlFor="admin-password">
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="op-input w-full rounded-sm px-3 py-2 text-sm text-white outline-none"
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-center text-sm text-red-300">{error}</p>}

          <Button type="submit" variant="primary" fullWidth disabled={busy} className="mt-6">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </GameCanvasScreen>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[rgb(var(--op-gold-rgb))]">{label}</span>
      {children}
    </label>
  );
}
