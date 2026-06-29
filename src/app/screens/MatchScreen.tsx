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
 * DonChip/PileStack) instead of text rows. The DON!! Deck pile and the
 * Active/Rested DON!! piles used to live in their own standalone column here
 * (DonManagementColumn/DonCardStack, now removed) — they're now columns
 * inside PlayerBoardPanel's own leader's row (boardRow), so see that file for
 * DON!! layout/selection logic. CardRow/ZoneSection still exist for compact
 * list contexts (Trash inspector, Character Area overflow choice) where a
 * scannable text list is more useful than card art. Card zoom/preview
 * (small-screen requirement) reuses the existing CardDetailModal as-is.
 */
import { useEffect, useState } from 'react';
import type { CardDefinition } from '../../engine/state/card';
import { getActingPlayerId, projectPlayerBoard } from '../../board/projection';
import { getOpponentId } from '../../engine/rules/shared';
import { Button, CardDetailModal, Modal, ScaleToFit, ScreenShell } from '../components';
import { ActionBar, ActionLogPanel, BoardCardTile, PendingChoicePrompt, PhaseIndicator, PlayerBoardPanel, useBoardSelection } from '../components/match';
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
      bodyClassName="overflow-hidden p-2"
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
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="flex-shrink-0 text-center text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/70">
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

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-white/10 bg-black/25">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.12em] text-white">Actions</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex flex-col gap-2">
                <PhaseIndicator playerId={otherPlayerId} currentPhase={matchState.currentPhase} active={matchState.activePlayerId === otherPlayerId} />
                <PhaseIndicator playerId={turnPlayerId} currentPhase={matchState.currentPhase} active={matchState.activePlayerId === turnPlayerId} />
              </div>
              {!matchState.gameOver ? (
                <ActionBar
                  phase={matchState.currentPhase}
                  turnNumber={matchState.turnNumber}
                  battle={matchState.currentBattle}
                  actingBoard={actingBoard}
                  selection={selection}
                />
              ) : (
                <p className="text-xs text-white/50">Match complete.</p>
              )}
            </div>
          </aside>

          <div className="min-h-0 overflow-hidden rounded-xl border border-gold/20 bg-[linear-gradient(180deg,_rgba(5,9,20,0.9),_rgba(3,7,16,0.96))] p-2 shadow-inner shadow-black/40">
            {/* ScaleToFit no longer scales anything itself — it just turns this
                block into a CSS containment context (container-type: size) so
                every card-sized leaf inside (PlayerBoardPanel/DonChip/
                DonStack/PileStack/BoardCardTile) can size itself in `cqh`
                units (see boardScale.ts) instead of a literal px constant.
                Width stays completely fluid: PlayerSideRow's own grid
                (180px / minmax(0,1fr) / 180px) already stretches the board
                column to fill 100% of whatever width is available, which is
                what was being suppressed by the three earlier JS-transform
                attempts (frozen-measurement uniform scaling caused
                dead-space letterbox bars; per-axis stretching removed the
                dead space but visibly distorted DON!! chip art; reverting to
                a single uniform factor fixed the distortion but reintroduced
                the letterbox bars whenever the container was wider than the
                fixed reference ratio) — see ScaleToFit.tsx for the full
                history. Height is the one dimension cqh ties card size to,
                per the project's landscape-first requirement. */}
            <ScaleToFit>
              <div className="flex h-full min-h-0 w-full flex-col justify-start gap-2 overflow-hidden">
                <PlayerSideRow
                  board={otherPlayerBoard}
                  isOwn={actingPlayerId === otherPlayerId}
                  isOpponent={actingPlayerId !== otherPlayerId}
                  reverseRows={true}
                  mode={selection.mode}
                  onHandCardTap={(card) => selection.handleCardTap(otherPlayerId, 'hand', card)}
                  onMatCardTap={(zone, card) => selection.handleCardTap(otherPlayerId, zone, card)}
                  onCardZoom={openZoom}
                />

                <div className="flex flex-shrink-0 items-center justify-center gap-3 py-0.5">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold/60">Battle Line</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                </div>

                <PlayerSideRow
                  board={turnPlayerBoard}
                  isOwn={actingPlayerId === turnPlayerId}
                  isOpponent={actingPlayerId !== turnPlayerId}
                  reverseRows={false}
                  mode={selection.mode}
                  onHandCardTap={(card) => selection.handleCardTap(turnPlayerId, 'hand', card)}
                  onMatCardTap={(zone, card) => selection.handleCardTap(turnPlayerId, zone, card)}
                  onCardZoom={openZoom}
                />
              </div>
            </ScaleToFit>
          </div>
        </div>
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

type MatchSelectionMode = ReturnType<typeof useBoardSelection>['mode'];

function handSelectable(mode: MatchSelectionMode, isOwn: boolean, card: CardView): boolean {
  if (!isOwn) return false;
  if (mode.kind === 'idle') {
    return card.category === 'character' || card.category === 'stage' || card.category === 'event';
  }
  if (mode.kind === 'selectCounterCard') {
    return card.category === 'character' && !!card.counter && card.counter > 0;
  }
  return false;
}

function selectedHandIds(mode: MatchSelectionMode): Set<string> {
  if (mode.kind === 'payingCost') return new Set([mode.handCardInstanceId]);
  if (mode.kind === 'selectCounterBoostTarget') return new Set([mode.handCardInstanceId]);
  return new Set();
}

function PlayerSideRow({
  board,
  isOwn,
  isOpponent,
  reverseRows,
  mode,
  onHandCardTap,
  onMatCardTap,
  onCardZoom,
}: {
  board: ReturnType<typeof projectPlayerBoard>;
  isOwn: boolean;
  isOpponent: boolean;
  reverseRows: boolean;
  mode: MatchSelectionMode;
  onHandCardTap: (card: CardView) => void;
  onMatCardTap: (zone: 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea', card: CardView) => void;
  onCardZoom: (card: CardView) => void;
}) {
  const selectedIds = selectedHandIds(mode);

  // The standalone Trash list column that used to flank the board on its
  // outer edge is gone (Trash is now a face-up pile inside PlayerBoardPanel
  // itself, in the old Deck slot — see TrashPile.tsx/PlayerBoardPanel.tsx).
  // That column used to exist specifically so Hand could mirror sides
  // (Hand left/Trash right on the bottom row, flipped on the top row) while
  // still giving the board column the SAME fixed-width flanking on both
  // sides — which is what kept both players' Leaders landing on the same
  // screen X (PlayerBoardPanel.tsx centers Leader at the literal middle of
  // its own board column; that column only lines up across rows if its
  // start-X is identical on both rows).
  //
  // With Trash gone, mirroring Hand's side per-row would break that exact
  // invariant again (a single fixed Hand column at one end means the board
  // column's start-X differs by 180px depending on which side Hand sits on
  // for a given row) — so Hand no longer mirrors; it's pinned to the same
  // physical edge for both rows, and the board column always starts right
  // after it. The board also gets to fully reclaim the old Trash column's
  // width instead of leaving a dead 180px gap. The one visible consequence:
  // the opponent's (top row's) hand now renders on the same side as the
  // turn player's, instead of the mirrored opposite side it used to.
  const handCell = (
    <HandSection
      board={board}
      isOwn={isOwn}
      selectedIds={selectedIds}
      mode={mode}
      onCardTap={onHandCardTap}
      onCardZoom={onCardZoom}
    />
  );
  const boardCell = (
    <PlayerBoardPanel
      board={board}
      isOwn={isOwn}
      isOpponent={isOpponent}
      reverseRows={reverseRows}
      mode={mode}
      onCardTap={onMatCardTap}
      onCardZoom={onCardZoom}
    />
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)] gap-2 overflow-hidden">
      {handCell}
      {boardCell}
    </div>
  );
}

function HandSection({
  board,
  isOwn,
  selectedIds,
  mode,
  onCardTap,
  onCardZoom,
}: {
  board: ReturnType<typeof projectPlayerBoard>;
  isOwn: boolean;
  selectedIds: Set<string>;
  mode: MatchSelectionMode;
  onCardTap: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-2 py-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{board.playerId}</span>
        <span className="text-[10px] font-bold text-white/35">{board.hand.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {board.hand.length === 0 ? (
          <p className="py-8 text-center text-[10px] text-white/25">No cards</p>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {board.hand.map((card) => (
              <BoardCardTile
                key={card.instanceId}
                card={card}
                size="board"
                selectable={handSelectable(mode, isOwn, card)}
                selected={selectedIds.has(card.instanceId)}
                onSelect={() => onCardTap(card)}
                onZoom={() => onCardZoom(card)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
