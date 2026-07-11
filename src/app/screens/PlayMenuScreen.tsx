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
    <GameCanvasScreen kicker="Play" status="Choose a mode" headerTitle="Play" onBack={goBack} dense>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-2 overflow-y-auto px-0 pb-0 pt-1 sm:justify-center sm:gap-4 sm:px-0 sm:pt-0">
        <ModeCard
          label="vs Self"
          tag="Local Hotseat"
          description="Local Hotseat. Best for testing decks and learning the rules. Latest Cards available"
          onClick={() => navigateTo({ screen: 'deck-select' })}
          disabled={deckCount < 1}
        />
        <ModeCard
          label="vs CPU"
          tag="Single Player"
          description="Play against a local CPU opponent that uses the same rules engine — no hidden information, fully modular AI."
          onClick={() => navigateTo({ screen: 'cpu-deck-select' })}
          disabled={deckCount < 1}
        />
        <ModeCard
          label="Online"
          tag="Multiplayer"
          description="Sign in, bring one saved deck, host a room, or join another player by room code through the live backend lobby."
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
    <section className="flex flex-col gap-2 border border-white/10 bg-[#08101f] p-3 sm:gap-3 sm:border-2 sm:border-cyan-200/20 sm:bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] sm:p-5 sm:shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold sm:text-[10px] sm:tracking-[0.24em]">{tag}</p>
        <h2 className="font-display text-base font-black uppercase tracking-[0.12em] text-white sm:text-lg">{label}</h2>
        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">{description}</p>
      </div>
      <div className="flex-shrink-0">
        <CanvasMenuButton label={label} prominence="primary" size="sm" disabled={disabled} onClick={onClick} expandOnHover={false} className="h-10 max-w-none sm:h-11" />
      </div>
    </section>
  );
}
