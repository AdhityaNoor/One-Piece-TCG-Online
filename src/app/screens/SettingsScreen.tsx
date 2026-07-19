/**
 * Display/debug preferences. Every toggle here is UI/presentation state
 * only - see settingsStore.ts module doc - never GameState. `threeDEnabled`
 * is wired but disabled: no /src/renderer3d implementation exists yet
 * (project priority #12, after gameplay), so flipping it would currently do
 * nothing.
 *
 * Avatar + username are deliberately NOT edited here — both live on the
 * Pirate Profile screen now (equipped cosmetic avatar via ProfileHeader's
 * picker; username follows the signed-in account, see authStore.ts's
 * adoptUsername). Keeping a second local-only editor here let them drift
 * from the account's real values and get silently overwritten on next
 * login, which was confusing. settingsStore.username/avatarId still exist
 * as the passive header/offline-mode fallback (see AppHeader.tsx), just
 * with no editor of their own.
 */
import { CanvasMenuButton, GameCanvasScreen, Toggle } from '../components';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';
import { useSettingsStore } from '../store/settingsStore';

export function SettingsScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const settings = useSettingsStore();

  return (
    <GameCanvasScreen>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-center gap-4 overflow-y-auto py-2">
        <section className="border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] p-5 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] sm:p-6">
          <div className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.6)]" />
            <p className="font-display text-lg font-black uppercase tracking-[0.18em] text-cyan-200 sm:text-xl">Client Preferences</p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Toggle
              label="Show both hands"
              description="Local hotseat debug aid - reveals both players' hands instead of hiding the off-turn player's. Affects display only, never what GameState marks as known/hidden."
              checked={settings.debugShowBothHands}
              onChange={settings.setDebugShowBothHands}
            />
            <Toggle
              label="3D rendering"
              description="Not implemented yet - optional polish layer planned for later."
              checked={settings.threeDEnabled}
              onChange={settings.setThreeDEnabled}
              disabled
            />
          </div>

          <div className="mt-5 flex justify-center">
            <CanvasMenuButton label="Reset Defaults" prominence="danger" size="sm" onClick={settings.resetToDefaults} />
          </div>
        </section>

        <section className="border-2 border-gold/25 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] p-5 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] sm:p-6">
          <div className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]" />
            <p className="font-display text-lg font-black uppercase tracking-[0.18em] text-gold sm:text-xl">Account</p>
          </div>
          <p className="mt-1.5 text-sm text-white/55">{authUser ? `Signed in as ${authUser.username}` : 'Local mode — playing offline.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CanvasMenuButton label="Pirate Profile" size="sm" onClick={() => navigateTo({ screen: 'profile' })} className="w-full max-w-none" />
            <CanvasMenuButton label="Debug Tools" size="sm" onClick={() => navigateTo({ screen: 'debug-tools' })} className="w-full max-w-none" />
            <CanvasMenuButton label="Credits" size="sm" onClick={() => navigateTo({ screen: 'credits' })} className="w-full max-w-none" />
            <CanvasMenuButton label="Log Out" prominence="danger" size="sm" onClick={logout} className="w-full max-w-none" />
          </div>
        </section>
      </div>
    </GameCanvasScreen>
  );
}
