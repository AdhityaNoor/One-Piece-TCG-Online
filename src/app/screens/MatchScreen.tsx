/**
 * Match screen — PLACEHOLDER ONLY. No rules engine exists yet (project
 * implementation priorities #1-9 — rules blueprint, GameState schema, action
 * dispatch, turn/phase system, battle flow — all come before board UI per
 * the project's own ordering). This screen exists purely to close the
 * navigation graph end-to-end (Main Menu -> Deck Builder -> Save -> Saved
 * Decks -> Play -> Deck Select -> Match) so every click is reachable from
 * the first run, per Task 11.
 *
 * The Pause Menu here is explicitly a stub: it can only quit to Main Menu.
 * Once the engine exists, this is where resign/forfeit, mid-match settings,
 * and a real GameState inspector belong.
 *
 * No `onBack` is wired on ScreenShell here, deliberately — leaving a match
 * (even a stub one) should always go through Pause, never an accidental tap
 * on a generic back arrow. This becomes load-bearing once real games can be
 * lost by leaving carelessly.
 */
import { useState } from 'react';
import type { DeckLoadResult } from '../../cards/decks';
import { Button, DeckListSummary, Modal, ScreenShell } from '../components';
import { useMatchSetupStore } from '../store/matchSetupStore';
import { useCurrentScreen, useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

function DeckSummaryCard({ label, result }: { label: string; result: DeckLoadResult }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-navy-900/40">{label}</h2>
      {result.ok ? (
        <DeckListSummary
          name={result.deck.name}
          updatedAt={result.deck.updatedAt}
          leaderName={result.deck.leader.definition.name}
          leaderImageUrl={result.deck.leader.imageUrl}
          colors={result.deck.leader.definition.colors}
          cardCount={result.deck.cards.reduce((sum, card) => sum + card.quantity, 0)}
        />
      ) : (
        <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">Could not load this deck: {result.reason}</p>
      )}
    </section>
  );
}

export function MatchScreen() {
  const current = useCurrentScreen();
  const resetTo = useNavigationStore((state) => state.resetTo);
  const load = useSavedDecksStore((state) => state.load);
  const resetMatchSetup = useMatchSetupStore((state) => state.reset);
  const [pauseOpen, setPauseOpen] = useState(false);

  // App.tsx only ever mounts this component for the 'match' nav target — this
  // guard is pure type-narrowing (so deckIdA/deckIdB below are safe to read),
  // matching the same defensive-default convention used in App.tsx's switch.
  if (current.screen !== 'match') {
    return null;
  }

  const deckAResult = load(current.deckIdA);
  const deckBResult = load(current.deckIdB);

  return (
    <ScreenShell
      title="Match"
      headerRight={
        <Button variant="ghost" size="sm" onClick={() => setPauseOpen(true)}>
          Pause
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          Gameplay engine not implemented yet — no phases, no action dispatch, no GameState. This screen only confirms the two decks selected for this seat
          setup and stands in for the future match board.
        </p>

        <DeckSummaryCard label="Player 1" result={deckAResult} />
        <DeckSummaryCard label="Player 2" result={deckBResult} />
      </div>

      <Modal open={pauseOpen} onClose={() => setPauseOpen(false)} title="Paused">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-navy-900/70">
            Stub Pause Menu. Resign/forfeit, mid-match settings, and a real GameState inspector belong here once the rules engine exists.
          </p>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              // Clear matchSetupStore on the way out — its own doc comment scopes it to
              // "between Deck Select and Match"; once this match ends, stale deckIdA/deckIdB
              // picks shouldn't silently pre-fill the next Deck Select visit.
              resetMatchSetup();
              resetTo({ screen: 'main-menu' });
            }}
          >
            Quit to Main Menu
          </Button>
        </div>
      </Modal>
    </ScreenShell>
  );
}
