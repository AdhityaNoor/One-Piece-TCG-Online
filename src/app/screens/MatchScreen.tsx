/**
 * The real gameplay screen: wires the rules engine (via matchStore) into a
 * playable hotseat board. Layer 3 (board projection) + Layer 4 (interaction)
 * only — every actual game-state change still flows through
 * matchStore.dispatch(), which is the only thing allowed to call
 * validateAction/executeAction (project rule: "the UI must never directly
 * mutate game state").
 *
 * Board fidelity was upgraded from the original "Functional debug-style
 * board" text-row decision to a spatial playmat: PlayerBoardPanel now lays
 * zones out the way a real OPTCG table reads (Leader facing the opponent's
 * Leader across the middle ActionBar, Character/DON!!/Hand rows fanning out
 * behind it) and renders cards as real card-art tiles (BoardCardTile/
 * DonChip/PileStack) instead of text rows. CardRow/ZoneSection still exist
 * for compact list contexts (Trash inspector, Character Area overflow
 * choice) where a scannable text list is more useful than card art. Card
 * zoom/preview (small-screen requirement) reuses the existing
 * CardDetailModal as-is.
 */
import { useEffect, useState } from 'react';
import type { CardDefinition } from '../../engine/state/card';
import { getActingPlayerId, projectPlayerBoard } from '../../board/projection';
import { getOpponentId } from '../../engine/rules/shared';
import { Button, CardDetailModal, Modal, ScreenShell } from '../components';
import { ActionBar, ActionLogPanel, PendingChoicePrompt, PlayerBoardPanel, useBoardSelection } from '../components/match';
import { useMatchSetupStore } from '../store/matchSetupStore';
import { useCurrentScreen, useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { useMatchStore } from '../store/matchStore';
import type { CardView } from '../../board/projection';

export function MatchScreen() {
  const current = useCurrentScreen();
  const resetTo = useNavigationStore((state) => state.resetTo);
  const load = useSavedDecksStore((state) => state.load);
  const resetMatchSetup = useMatchSetupStore((state) => state.reset);

  const matchState = useMatchStore((s) => s.state);
  const defs = useMatchStore((s) => s.defs);
  const images = useMatchStore((s) => s.cardImagesByDefinitionId);
  const startedWithDeckIds = useMatchStore((s) => s.startedWithDeckIds);
  const startError = useMatchStore((s) => s.startError);
  const startMatch = useMatchStore((s) => s.startMatch);
  const resetMatch = useMatchStore((s) => s.reset);

  const [pauseOpen, setPauseOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [zoomDefinitionId, setZoomDefinitionId] = useState<string | null>(null);

  const isMatchScreen = current.screen === 'match';
  const deckIdA = current.screen === 'match' ? current.deckIdA : null;
  const deckIdB = current.screen === 'match' ? current.deckIdB : null;

  // Start (or restart, if navigated here with a different deck pairing) the
  // engine match exactly once per distinct {deckIdA, deckIdB} pair — never
  // on every render (startMatch mints a fresh GameState + RNG seed).
  useEffect(() => {
    if (!deckIdA || !deckIdB) return;
    const alreadyStarted = startedWithDeckIds?.a === deckIdA && startedWithDeckIds?.b === deckIdB;
    if (alreadyStarted) return;
    const deckAResult = load(deckIdA);
    const deckBResult = load(deckIdB);
    if (deckAResult.ok && deckBResult.ok) {
      startMatch(deckAResult.deck, deckBResult.deck);
    }
  }, [deckIdA, deckIdB, startedWithDeckIds, load, startMatch]);

  // Hooks must run unconditionally on every render of this component (it
  // stays mounted across screen navigation and just returns null when
  // irrelevant) — so useBoardSelection is called here, before any of the
  // early returns below, even though its result is only used once we know
  // we're actually on the match screen with a live GameState.
  const selection = useBoardSelection(matchState ? getActingPlayerId(matchState) : null);

  if (!isMatchScreen) {
    return null;
  }

  const deckAResult = deckIdA ? load(deckIdA) : null;
  const deckBResult = deckIdB ? load(deckIdB) : null;

  const zoomDefinition: CardDefinition | null = zoomDefinitionId ? defs[zoomDefinitionId] ?? null : null;
  const zoomImageUrl = zoomDefinitionId ? images[zoomDefinitionId] ?? null : null;
  const openZoom = (card: CardView) => setZoomDefinitionId(card.cardDefinitionId);

  function handleQuit(): void {
    resetMatch();
    resetMatchSetup();
    resetTo({ screen: 'main-menu' });
  }

  // --- Deck load failure: nothing to play, surface the reason and bail out. ---
  if (deckAResult && !deckAResult.ok) {
    return <DeckLoadErrorScreen reason={deckAResult.reason} onBack={handleQuit} />;
  }
  if (deckBResult && !deckBResult.ok) {
    return <DeckLoadErrorScreen reason={deckBResult.reason} onBack={handleQuit} />;
  }

  // --- Engine rejected createPreGameState (malformed deck reaching setup). ---
  if (!matchState && startError) {
    return <DeckLoadErrorScreen reason={startError.join(' ')} onBack={handleQuit} />;
  }

  if (!matchState) {
    return (
      <ScreenShell title="Match">
        <p className="p-6 text-sm text-white/50">Starting match…</p>
      </ScreenShell>
    );
  }

  // Panel POSITION (which board renders top vs bottom) is intentionally
  // anchored to whose TURN it is (state.activePlayerId), not to
  // getActingPlayerId() — that function correctly identifies who must act
  // RIGHT NOW (e.g. the defending player during the Block/Counter Steps),
  // but using it for position too caused the entire layout to swap the
  // instant DECLARE_ATTACK executed: the just-rested attacker's board would
  // jump into the slot the target's (untouched) board had occupied a moment
  // earlier, which reads exactly like "the wrong card got rested" even
  // though cardsById was always correct (see declareAttack.test.ts's
  // "never changes the target's orientation" regression tests). The turn
  // player's board now stays in the same slot for their whole turn,
  // including the sub-steps where the opponent acts on it.
  const turnPlayerId = matchState.activePlayerId;
  const otherPlayerId = getOpponentId(matchState, turnPlayerId);
  const turnPlayerBoard = projectPlayerBoard(matchState, defs, images, turnPlayerId);
  const otherPlayerBoard = projectPlayerBoard(matchState, defs, images, otherPlayerId);

  // Action AUTHORITY (who may currently act, and whose hand/board ActionBar
  // should read for eligibility checks) still tracks getActingPlayerId() —
  // only the panels' on-screen position was the bug, not this.
  const actingPlayerId = getActingPlayerId(matchState);
  const actingBoard = actingPlayerId === turnPlayerId ? turnPlayerBoard : otherPlayerBoard;

  const battleLabel = matchState.currentBattle ? ` · Battle: ${matchState.currentBattle.step}` : '';

  return (
    <ScreenShell
      title="Match"
      headerRight={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLogOpen(true)} className="text-slate-200/75">
            Log
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPauseOpen(true)} className="text-slate-200/75">
            Pause
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/70">
          Turn {matchState.turnNumber} · {matchState.activePlayerId}'s turn · {matchState.currentPhase}
          {battleLabel}
        </p>

        {matchState.gameOver && (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-center">
            <p className="text-lg font-bold text-white">
              {matchState.gameOver.winnerId ? `${matchState.gameOver.winnerId} wins!` : 'Game over'}
            </p>
            <p className="text-xs text-white/60">Reason: {matchState.gameOver.reason}</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={handleQuit}>
              Return to Main Menu
            </Button>
          </div>
        )}

        <PlayerBoardPanel
          board={otherPlayerBoard}
          isOwn={actingPlayerId === otherPlayerId}
          isOpponent={actingPlayerId !== otherPlayerId}
          reverseRows={true}
          mode={selection.mode}
          onCardTap={(zone, card) => selection.handleCardTap(otherPlayerId, zone, card)}
          onCardZoom={openZoom}
        />

        {!matchState.gameOver && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <ActionBar
              phase={matchState.currentPhase}
              turnNumber={matchState.turnNumber}
              battle={matchState.currentBattle}
              actingBoard={actingBoard}
              selection={selection}
            />
          </div>
        )}

        <PlayerBoardPanel
          board={turnPlayerBoard}
          isOwn={actingPlayerId === turnPlayerId}
          isOpponent={actingPlayerId !== turnPlayerId}
          reverseRows={false}
          mode={selection.mode}
          onCardTap={(zone, card) => selection.handleCardTap(turnPlayerId, zone, card)}
          onCardZoom={openZoom}
        />
      </div>

      <PendingChoicePrompt state={matchState} defs={defs} images={images} />
      <ActionLogPanel open={logOpen} onClose={() => setLogOpen(false)} log={matchState.log} />
      <CardDetailModal open={zoomDefinitionId !== null} onClose={() => setZoomDefinitionId(null)} definition={zoomDefinition} imageUrl={zoomImageUrl} />

      <Modal open={pauseOpen} onClose={() => setPauseOpen(false)} title="Paused">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-200/75">
            Conceding ends the match immediately (CONCEDE is always legal, even mid-battle — dispatch.ts's pending-choice gate explicitly allows it).
          </p>
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              selection.concede();
              setPauseOpen(false);
            }}
          >
            Concede Match
          </Button>
          <Button variant="secondary" fullWidth onClick={handleQuit}>
            Quit to Main Menu (without conceding)
          </Button>
        </div>
      </Modal>
    </ScreenShell>
  );
}

function DeckLoadErrorScreen({ reason, onBack }: { reason: string; onBack: () => void }) {
  return (
    <ScreenShell title="Match">
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">Could not start the match: {reason}</p>
        <Button variant="secondary" onClick={onBack}>Back to Main Menu</Button>
      </div>
    </ScreenShell>
  );
}
