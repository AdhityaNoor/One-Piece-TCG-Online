/**
 * Placeholder for navigation destinations that exist in NavigationTarget
 * (navigationStore.ts) but haven't been built yet this milestone — Card
 * Library, Deck Builder, Saved Decks, Deck Select, Match. Keeps every
 * MenuRow/Button clickable end-to-end without dead-ending or crashing while
 * Tasks 9-11 fill these in one at a time.
 */
import { ScreenShell } from '../components';
import { useNavigationStore } from '../store/navigationStore';

export interface ComingSoonScreenProps {
  title: string;
}

export function ComingSoonScreen({ title }: ComingSoonScreenProps) {
  const goBack = useNavigationStore((state) => state.goBack);

  return (
    <ScreenShell title={title} onBack={goBack}>
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-semibold text-navy-900/60">Coming soon</p>
        <p className="max-w-xs text-xs text-navy-900/40">This screen hasn't been built yet in this milestone.</p>
      </div>
    </ScreenShell>
  );
}
