/**
 * Display/debug preferences. Every toggle here is UI/presentation state
 * only — see settingsStore.ts module doc — never GameState. `threeDEnabled`
 * is wired but disabled: no /src/renderer3d implementation exists yet
 * (project priority #12, after gameplay), so flipping it would currently do
 * nothing.
 */
import { Button, ScreenShell, Toggle } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSettingsStore } from '../store/settingsStore';

export function SettingsScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const settings = useSettingsStore();

  return (
    <ScreenShell title="Settings" onBack={goBack}>
      <div className="flex flex-col gap-3">
        <Toggle
          label="Show both hands"
          description="Local hotseat debug aid — reveals both players' hands instead of hiding the off-turn player's. Affects display only, never what GameState marks as known/hidden."
          checked={settings.debugShowBothHands}
          onChange={settings.setDebugShowBothHands}
        />
        <Toggle
          label="Animations"
          description="The game stays fully playable with this off — animation state is tracked separately from game state."
          checked={settings.animationsEnabled}
          onChange={settings.setAnimationsEnabled}
        />
        <Toggle
          label="3D rendering"
          description="Not implemented yet — optional polish layer planned for later."
          checked={settings.threeDEnabled}
          onChange={settings.setThreeDEnabled}
          disabled
        />

        <div className="mt-2">
          <Button variant="danger" size="sm" onClick={settings.resetToDefaults}>
            Reset to defaults
          </Button>
        </div>
      </div>
    </ScreenShell>
  );
}
