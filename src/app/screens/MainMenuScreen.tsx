/**
 * App entry point — the root of the navigation stack (navigationStore's
 * initial `stack: [{ screen: 'main-menu' }]`), so this screen renders with
 * no back button. Every other screen is reached from here, directly or via
 * Saved Decks / Deck Builder.
 */
import { Button, MenuRow, Pill, ScreenShell } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function MainMenuScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCount = useSavedDecksStore((state) => state.entries.length);

  return (
    <ScreenShell title="One Piece TCG Online">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-navy-900/60">Local hotseat simulator — one device, two seats, alternating turns.</p>

        <div className="flex flex-col gap-3">
          <MenuRow
            title="Play"
            description="Pick two saved decks and start a local match"
            onClick={() => navigateTo({ screen: 'deck-select' })}
            disabled={deckCount < 1}
          />
          <MenuRow title="Deck Builder" description="Build a new deck from the live card database" onClick={() => navigateTo({ screen: 'deck-builder' })} />
          <MenuRow title="Card Library" description="Browse and search every printed card" onClick={() => navigateTo({ screen: 'card-library' })} />
          <MenuRow
            title="Saved Decks"
            description="View, edit, or delete decks you've built"
            onClick={() => navigateTo({ screen: 'saved-decks' })}
            trailing={<Pill tone="neutral">{deckCount}</Pill>}
          />
          <MenuRow title="Settings" description="Display and debug preferences" onClick={() => navigateTo({ screen: 'settings' })} />
        </div>

        <div className="mt-2 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => navigateTo({ screen: 'debug-tools' })}>
            Debug Tools
          </Button>
        </div>
      </div>
    </ScreenShell>
  );
}
