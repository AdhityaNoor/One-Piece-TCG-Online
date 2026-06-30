/**
 * Display/debug preferences. Every toggle here is UI/presentation state
 * only - see settingsStore.ts module doc - never GameState. `threeDEnabled`
 * is wired but disabled: no /src/renderer3d implementation exists yet
 * (project priority #12, after gameplay), so flipping it would currently do
 * nothing.
 */
import { CanvasMenuButton, GameCanvasScreen, Toggle } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSettingsStore } from '../store/settingsStore';

export function SettingsScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const settings = useSettingsStore();

  return (
    <GameCanvasScreen kicker="Options" status="Display only" title="Settings" onBack={goBack}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-center">
        <section className="border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] p-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Client Preferences</p>
          <div className="mt-3 flex flex-col gap-3">
            <Toggle
              label="Show both hands"
              description="Local hotseat debug aid - reveals both players' hands instead of hiding the off-turn player's. Affects display only, never what GameState marks as known/hidden."
              checked={settings.debugShowBothHands}
              onChange={settings.setDebugShowBothHands}
            />
            <Toggle
              label="Animations"
              description="The game stays fully playable with this off - animation state is tracked separately from game state."
              checked={settings.animationsEnabled}
              onChange={settings.setAnimationsEnabled}
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
      </div>
    </GameCanvasScreen>
  );
}
