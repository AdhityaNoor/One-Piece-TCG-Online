import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuthStore } from './store/adminAuthStore';

const NAV_SECTIONS: { to: string; label: string }[] = [
  { to: '/admin/players', label: 'Players' },
  { to: '/admin/cards', label: 'Cards' },
  { to: '/admin/game', label: 'Games' },
  { to: '/admin/banners', label: 'Banner & News' },
  { to: '/admin/bugs', label: 'Bugs & Reports' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const admin = useAdminAuthStore((s) => s.admin);
  const logout = useAdminAuthStore((s) => s.logout);

  return (
    <div className="flex h-dvh bg-[#050914] font-body text-white">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-[rgb(var(--op-gold-rgb)/0.18)] bg-[linear-gradient(180deg,_rgba(17,43,83,0.6),_rgba(5,13,29,0.9))]">
        <div className="border-b border-[rgb(var(--op-gold-rgb)/0.18)] px-4 py-4">
          <p className="font-heading text-sm font-black uppercase tracking-[0.06em] text-white">One Piece TCG</p>
          <p className="op-section-title mt-1 text-[10px]">Admin Console</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                `rounded-sm px-3 py-2 font-heading text-sm font-semibold uppercase tracking-wide transition-colors ${
                  isActive ? 'bg-brand text-white' : 'text-white/65 hover:bg-[rgb(var(--op-gold-rgb)/0.1)] hover:text-white'
                }`
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[rgb(var(--op-gold-rgb)/0.18)] p-3">
          <p className="mb-2 truncate text-xs text-white/50">{admin?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-sm border border-[rgb(var(--op-gold-rgb)/0.35)] px-3 py-1.5 font-heading text-sm font-semibold uppercase tracking-wide text-white/80 transition-colors hover:border-[rgb(var(--op-gold-rgb)/0.7)] hover:bg-[rgb(var(--op-gold-rgb)/0.1)]"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,_rgba(255,211,74,0.06),_transparent_35%)] p-6">{children}</main>
    </div>
  );
}
