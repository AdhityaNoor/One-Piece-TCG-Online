/**
 * The "Play" submenu. Splits the old single Play button into the two match
 * flavours:
 *   - "vs Self"  -> the existing local hotseat (Deck Select -> Match), where
 *                   one human drives both seats and the board follows whose
 *                   turn it is.
 *   - "Casual"   -> the online-shaped lobby (deck pick + room list). Same
 *                   engine, but the board is pinned to the local player's
 *                   perspective and seats are labelled by username — the shape
 *                   a networked client will use.
 *
 * Navigation-only; no game state. Reuses the shared menu chrome so it matches
 * the rest of the title flow.
 */
import { CanvasMenuButton, GameCanvasScreen } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function PlayMenuScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCount = useSavedDecksStore((state) => state.entries.length);

  return (
    <GameCanvasScreen kicker="Play" status="Choose a mode" title="Play" onBack={goBack}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-center gap-4">
        <ModeCard
          label="vs Self"
          tag="Local Hotseat"
          description="One device, both sides. Play a full game against yourself — the board flips to whoever's turn it is. Best for testing decks and learning the rules."
          onClick={() => navigateTo({ screen: 'deck-select' })}
          disabled={deckCount < 1}
        />
        <ModeCard
          label="Casual"
          tag="Online-ready"
          description="Bring one deck, pick a room from the lobby, and play from your own side of the table — the board stays put and every action is tagged with the players' usernames. The shape online multiplayer will use."
          onClick={() => navigateTo({ screen: 'casual-lobby' })}
          disabled={deckCount < 1}
        />
        {deckCount < 1 && (
          <p className="text-center text-xs text-white/50">Save at least one deck first to play.</p>
        )}
      </div>
    </GameCanvasScreen>
  );
}

function ModeCard({
  label,
  tag,
  description,
  onClick,
  disabled,
}: {
  label: string;
  tag: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3 border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] p-5 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{tag}</p>
        <h2 className="font-display text-lg font-black uppercase tracking-[0.12em] text-white">{label}</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-200/72">{description}</p>
      </div>
      <div className="flex-shrink-0">
        <CanvasMenuButton label={label} prominence="primary" size="sm" disabled={disabled} onClick={onClick} />
      </div>
    </section>
  );
}
