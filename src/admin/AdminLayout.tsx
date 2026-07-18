import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuthStore } from './store/adminAuthStore';

const NAV_SECTIONS: { to: string; label: string }[] = [
  { to: '/admin/players', label: 'Player Data' },
  { to: '/admin/cards', label: 'Card Management' },
  { to: '/admin/game', label: 'Game Management' },
  { to: '/admin/banners', label: 'Banner & News Management' },
  { to: '/admin/bugs', label: 'Bugs & Reports Management' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const logout = useAdminAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-4">
          <p className="text-sm font-bold text-white">One Piece TCG</p>
          <p className="text-xs text-slate-400">Admin CMS</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <p className="mb-2 truncate text-xs text-slate-500">{admin?.email}</p>
          <button type="button" onClick={logout} className="w-full rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
            Log out
          </button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
