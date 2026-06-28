/**
 * Main menu with a more game-like presentation.
 */
import { Button, MenuRow, Pill, ScreenShell } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function MainMenuScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCount = useSavedDecksStore((state) => state.entries.length);

  return (
    <ScreenShell title="One Piece TCG Online">
      <div className="flex flex-col gap-5">
        <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.12),_rgba(255,255,255,0.06))] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/70">Hotseat Simulator</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Build decks, battle locally, and keep the rules engine clean.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200/75">
            One device, two seats, alternating turns. The first playable version is all about the core card game loop.
          </p>
        </section>

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
          <Button variant="ghost" size="sm" onClick={() => navigateTo({ screen: 'debug-tools' })} className="text-slate-200/70">
            Debug Tools
          </Button>
        </div>
      </div>
    </ScreenShell>
  );
}
