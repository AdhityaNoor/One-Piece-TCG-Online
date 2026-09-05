/**
 * The 'tutorial' NavigationTarget's screen: picker first, then the scripted
 * match for whichever scenario was chosen. Keeping the choice here (rather
 * than inside TutorialManager) means TutorialManager always has a scenario
 * and never renders a half-built match.
 */
import { useState } from 'react';
import { useNavigationStore } from '../../app/store/navigationStore';
import { TutorialHome } from './TutorialHome';
import { TutorialManager } from './TutorialManager';
import type { TutorialScenarioId } from './types';

export function TutorialRoot() {
  const resetTo = useNavigationStore((state) => state.resetTo);
  const [scenarioId, setScenarioId] = useState<TutorialScenarioId | null>(null);

  if (!scenarioId) {
    return <TutorialHome onPick={setScenarioId} onExit={() => resetTo({ screen: 'hub', tab: 'play' })} />;
  }
  // Remounting per scenario keeps every beat/board ref scoped to one run.
  return <TutorialManager key={scenarioId} scenarioId={scenarioId} onLeaveScenario={() => setScenarioId(null)} />;
}
