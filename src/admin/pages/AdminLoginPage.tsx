import { useState, type FormEvent } from 'react';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { AdminButton, AdminInput } from '../components/ui';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h1 className="mb-1 text-lg font-bold text-white">One Piece TCG — Admin</h1>
        <p className="mb-5 text-sm text-slate-400">Sign in with your admin account. This is separate from player accounts.</p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
            <AdminInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Password</label>
            <AdminInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <AdminButton type="submit" disabled={busy} className="mt-5 w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </AdminButton>
      </form>
    </div>
  );
}
