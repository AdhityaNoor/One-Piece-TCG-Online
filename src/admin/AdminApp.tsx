/**
 * Admin CMS root, mounted at /admin/* by src/main.tsx's top-level router.
 * Owns its own auth gate (adminAuthStore — a completely separate session
 * from the player app) and its own nested routing; nothing here ever
 * touches navigationStore, matchStore, or any other player-app state.
 */
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAdminAuthStore } from './store/adminAuthStore';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminLayout } from './AdminLayout';
import { PlayerListPage } from './pages/players/PlayerListPage';
import { PlayerDetailPage } from './pages/players/PlayerDetailPage';
import { CardManagementPage } from './pages/cards/CardManagementPage';
import { FeatureFlagsPage } from './pages/game/FeatureFlagsPage';
import { BannerListPage } from './pages/banners/BannerListPage';
import { BugReportListPage } from './pages/bugs/BugReportListPage';
import { BugReportDetailPage } from './pages/bugs/BugReportDetailPage';

export function AdminApp() {
  const status = useAdminAuthStore((s) => s.status);
  const init = useAdminAuthStore((s) => s.init);

  useEffect(() => {
    if (status === 'unknown') void init();
  }, [status, init]);

  if (status === 'unknown') {
    return <div className="flex min-h-screen items-center justify-center bg-[#050914] text-white/55">Loading…</div>;
  }

  if (status !== 'authenticated') {
    return (
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Navigate to="players" replace />} />
        <Route path="login" element={<Navigate to="/admin/players" replace />} />
        <Route path="players" element={<PlayerListPage />} />
        <Route path="players/:userId" element={<PlayerDetailPage />} />
        <Route path="cards" element={<CardManagementPage />} />
        <Route path="game" element={<FeatureFlagsPage />} />
        <Route path="banners" element={<BannerListPage />} />
        <Route path="bugs" element={<BugReportListPage />} />
        <Route path="bugs/:id" element={<BugReportDetailPage />} />
        <Route path="*" element={<Navigate to="players" replace />} />
      </Routes>
    </AdminLayout>
  );
}
