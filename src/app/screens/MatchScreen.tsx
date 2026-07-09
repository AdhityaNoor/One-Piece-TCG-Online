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
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { CardDefinition } from '../../engine/state/card';
import { getActingPlayerId, projectPlayerBoard } from '../../board/projection';
import { getOpponentId } from '../../engine/rules/shared';
import { Button, CardDetailModal, Modal, ScaleToFit } from '../components';
import { ActionBar, ActionLogDock, BoardCardTile, CardBackArt, CardMovementOverlay, DockHand, PendingChoicePrompt, PhaseIndicator, PlayerBoardPanel, useBoardSelection } from '../components/match';
import { useMatchSetupStore } from '../store/matchSetupStore';
import { useCurrentScreen, useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { useMatchStore } from '../store/matchStore';
import { useSettingsStore } from '../store/settingsStore';
import type { CardView } from '../../board/projection';

export function MatchScreen({ leftPanelOverride }: { leftPanelOverride?: ReactNode } = {}) {
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
  // Presentation seat binding (null == hotseat). Drives fixed-perspective +
  // username labelling for Casual matches; never touches GameState.
  const localPlayerId = useMatchStore((s) => s.localPlayerId);
  const playerNames = useMatchStore((s) => s.playerNames);
  const isCasual = localPlayerId !== null;
  const playTestMode = useMatchStore((s) => s.playTestMode);
  const nameFor = (id: string): string => playerNames[id] ?? id;

  const [pauseOpen, setPauseOpen] = useState(false);
  const [zoomDefinitionId, setZoomDefinitionId] = useState<string | null>(null);
  const [hoveredAttackTargetId, setHoveredAttackTargetId] = useState<string | null>(null);
  // True while the mouse is over the playmat — forces both dock hands shut.
  const [boardHovered, setBoardHovered] = useState(false);
  const tableShellRef = useRef<HTMLDivElement | null>(null);
  const navyBackgroundEnabled = useSettingsStore((state) => state.matchNavyBackgroundEnabled);

  const isMatchScreen = current.screen === 'match' || current.screen === 'play-test';
  const deckIdA = current.screen === 'match' ? current.deckIdA : null;
  const deckIdB = current.screen === 'match' ? current.deckIdB : null;
  // Casual presentation config off the nav target (undefined == hotseat).
  const presentation = current.screen === 'match' ? current.presentation : undefined;
  // Serialize so the start effect only re-fires when the config actually changes.
  const presentationKey = presentation ? JSON.stringify(presentation) : '';

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
      startMatch(
        deckAResult.deck,
        deckBResult.deck,
        presentation ? { localPlayerId: presentation.localPlayerId, playerNames: presentation.playerNames } : undefined,
      );
    }
    // presentationKey stands in for the presentation object (stable string).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdA, deckIdB, presentationKey, startedWithDeckIds, load, startMatch]);

  // Hooks must run unconditionally on every render of this component (it
  // stays mounted across screen navigation and just returns null when
  // irrelevant) — so useBoardSelection is called here, before any of the
  // early returns below, even though its result is only used once we know
  // we're actually on the match screen with a live GameState.
  const selection = useBoardSelection(matchState ? getActingPlayerId(matchState) : null);

  useEffect(() => {
    if (selection.mode.kind !== 'selectAttackTarget') setHoveredAttackTargetId(null);
  }, [selection.mode.kind]);

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
    resetTo(playTestMode ? { screen: 'debug-tools' } : { screen: 'main-menu' });
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
      <MatchGameShell title="Match">
        <p className="p-6 text-sm text-white/50">Starting match…</p>
      </MatchGameShell>
    );
  }

  if (matchState.gameOver) {
    return (
      <VictoryScreen
        winnerId={matchState.gameOver.winnerId}
        winnerName={matchState.gameOver.winnerId ? nameFor(matchState.gameOver.winnerId) : null}
        reason={matchState.gameOver.reason}
        onReturn={handleQuit}
      />
    );
  }

  // Panel POSITION (which board renders top vs bottom).
  //
  // Hotseat (localPlayerId == null): anchored to whose TURN it is
  // (state.activePlayerId), NOT getActingPlayerId() — that function correctly
  // identifies who must act RIGHT NOW (e.g. the defending player during the
  // Block/Counter Steps), but using it for position caused the entire layout
  // to swap the instant DECLARE_ATTACK executed: the just-rested attacker's
  // board would jump into the slot the target's (untouched) board had
  // occupied a moment earlier, which reads exactly like "the wrong card got
  // rested" even though cardsById was always correct (see declareAttack.test
  // .ts's "never changes the target's orientation" regression tests). The
  // turn player's board stays in the same slot for their whole turn.
  //
  // Casual (localPlayerId set): the board is pinned to the LOCAL seat — this
  // client always views from its own side, so the layout never switches
  // regardless of whose turn/authority it is. This is the online-client
  // perspective and still preserves the invariant above (position is a fixed
  // seat, never getActingPlayerId()).
  const bottomPlayerId = localPlayerId ?? matchState.activePlayerId;
  const topPlayerId = getOpponentId(matchState, bottomPlayerId);
  const bottomPlayerBoard = projectPlayerBoard(matchState, defs, images, bottomPlayerId);
  const topPlayerBoard = projectPlayerBoard(matchState, defs, images, topPlayerId);

  // Action AUTHORITY (who may currently act, and whose hand/board ActionBar
  // should read for eligibility checks) still tracks getActingPlayerId() —
  // only the panels' on-screen position was the bug, not this.
  const actingPlayerId = getActingPlayerId(matchState);
  const actingBoard = actingPlayerId === bottomPlayerId ? bottomPlayerBoard : topPlayerBoard;

  const battleLabel = matchState.currentBattle ? ` · Battle: ${matchState.currentBattle.step}` : '';
  const attackArrow = matchState.currentBattle
    ? {
        attackerInstanceId: matchState.currentBattle.attackerInstanceId,
        targetInstanceId: matchState.currentBattle.targetInstanceId,
        committed: true,
      }
    : selection.mode.kind === 'selectAttackTarget' && hoveredAttackTargetId
      ? {
          attackerInstanceId: selection.mode.attackerInstanceId,
          targetInstanceId: hoveredAttackTargetId,
          committed: false,
        }
      : null;
  const battlePowerInstanceIds = matchState.currentBattle
    ? new Set([matchState.currentBattle.attackerInstanceId, matchState.currentBattle.targetInstanceId])
    : new Set<string>();

  return (
    <MatchGameShell title="Match">
      {/*
        <div className="flex items-center gap-3">
          <p className="hidden border-l-4 border-gold bg-black/24 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100/70 shadow-[0_10px_28px_rgba(0,0,0,0.22)] md:block">
            Turn {matchState.turnNumber} · {matchState.activePlayerId}'s turn · {matchState.currentPhase}
            {battleLabel}
          </p>
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="h-10 border border-white/15 bg-black/28 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
          >
            Log
          </button>
          <button
            type="button"
            onClick={() => setPauseOpen(true)}
            className="h-10 border border-white/15 bg-black/28 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
          >
            Pause
          </button>
        </div>
      */}
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="hidden">
          Turn {matchState.turnNumber} · {matchState.activePlayerId}'s turn · {matchState.currentPhase}
          {battleLabel}
        </p>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[330px_minmax(0,1fr)_330px]">
          {leftPanelOverride}
          <aside className={[leftPanelOverride ? 'hidden' : 'flex', 'min-h-0 flex-col border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]'].join(' ')}>
            <div className="border-b border-gold/25 bg-black/18 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{isCasual ? 'Casual Match' : 'Local Hotseat'}</p>
                  <h2 className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">Actions</h2>
                  <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/48">
                    Turn {matchState.turnNumber} · {nameFor(matchState.activePlayerId)} · {matchState.currentPhase}
                    {battleLabel}
                  </p>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex flex-col gap-2">
                <PhaseIndicator playerId={topPlayerId} label={nameFor(topPlayerId)} currentPhase={matchState.currentPhase} active={matchState.activePlayerId === topPlayerId} />
                <PhaseIndicator playerId={bottomPlayerId} label={nameFor(bottomPlayerId)} currentPhase={matchState.currentPhase} active={matchState.activePlayerId === bottomPlayerId} />
              </div>
              {matchState.gameOver ? (
                <p className="text-xs text-white/50">Match complete.</p>
              ) : isCasual && actingPlayerId !== localPlayerId ? (
                <WaitingForOpponent opponentName={nameFor(topPlayerId)} />
              ) : (
                <ActionBar
                  phase={matchState.currentPhase}
                  turnNumber={matchState.turnNumber}
                  battle={matchState.currentBattle}
                  actingBoard={actingBoard}
                  selection={selection}
                />
              )}
            </div>
            <div className="border-t border-gold/25 bg-black/18 p-3">
              <button
                type="button"
                onClick={() => setPauseOpen(true)}
                className="h-10 w-full border border-white/15 bg-black/28 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
              >
                Pause
              </button>
            </div>
          </aside>

          <div
            ref={tableShellRef}
            className={[
              'op-match-table-shell relative min-h-0 overflow-hidden rounded-xl border border-gold/20 p-2 shadow-inner shadow-black/40',
              navyBackgroundEnabled ? 'bg-[linear-gradient(180deg,_rgba(5,9,20,0.9),_rgba(3,7,16,0.96))]' : 'bg-transparent',
            ].join(' ')}
          >
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
            <ScaleToFit className="op-match-playmat-layer">
              <div
                className="flex h-full min-h-0 w-full flex-col justify-start gap-2 overflow-hidden"
                onMouseEnter={() => setBoardHovered(true)}
                onMouseLeave={() => setBoardHovered(false)}
              >
                <PlayerSideRow
                  board={topPlayerBoard}
                  // Casual: the top seat is the remote opponent — this client
                  // never controls it, so it is never "own" regardless of
                  // whose authority it is. Hotseat keeps the both-sides-local
                  // behaviour.
                  isOwn={isCasual ? false : actingPlayerId === topPlayerId}
                  isOpponent={isCasual ? true : actingPlayerId !== topPlayerId}
                  reverseRows={true}
                  mode={selection.mode}
                  canActivateCard={selection.hasActivateMain}
                  canOnOppAttackCard={selection.hasOnOpponentsAttack}
                  canAttackCard={selection.canDeclareAttackWith}
                  battlePowerInstanceIds={battlePowerInstanceIds}
                  onMatCardTap={(zone, card) => selection.handleCardTap(topPlayerId, zone, card)}
                  onMatCardAttack={selection.beginAttackWithCard}
                  onAttachedDonLabelTap={(card) => selection.handleAttachedDonLabelTap(topPlayerId, card)}
                  onCardZoom={openZoom}
                  onAttackTargetHover={(card) => setHoveredAttackTargetId(card?.instanceId ?? null)}
                  boardFocused={boardHovered}
                  canGiveDonOnCard={(card) => selection.canGiveDonOnCard(topPlayerBoard, card)}
                  onGiveDon={(card) => selection.giveDonToCard(topPlayerBoard, card)}
                  onReturnGivenDon={selection.returnGivenDonFromCard}
                  allowReturnGivenDon={!isCasual}
                />

                <div className="flex flex-shrink-0 items-center justify-center gap-3 py-0.5">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold/60">Battle Line</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                </div>

                <PlayerSideRow
                  board={bottomPlayerBoard}
                  isOwn={actingPlayerId === bottomPlayerId}
                  isOpponent={actingPlayerId !== bottomPlayerId}
                  reverseRows={false}
                  mode={selection.mode}
                  canActivateCard={selection.hasActivateMain}
                  canOnOppAttackCard={selection.hasOnOpponentsAttack}
                  canAttackCard={selection.canDeclareAttackWith}
                  battlePowerInstanceIds={battlePowerInstanceIds}
                  onMatCardTap={(zone, card) => selection.handleCardTap(bottomPlayerId, zone, card)}
                  onMatCardAttack={selection.beginAttackWithCard}
                  onAttachedDonLabelTap={(card) => selection.handleAttachedDonLabelTap(bottomPlayerId, card)}
                  onCardZoom={openZoom}
                  onAttackTargetHover={(card) => setHoveredAttackTargetId(card?.instanceId ?? null)}
                  boardFocused={boardHovered}
                  canGiveDonOnCard={(card) => selection.canGiveDonOnCard(bottomPlayerBoard, card)}
                  onGiveDon={(card) => selection.giveDonToCard(bottomPlayerBoard, card)}
                  onReturnGivenDon={selection.returnGivenDonFromCard}
                  allowReturnGivenDon={!isCasual}
                />
              </div>
            </ScaleToFit>
            {/* ── Dock hands ── rendered outside ScaleToFit so they aren't
                affected by cqh sizing; positioned absolute relative to
                op-match-table-shell (position:relative; overflow:hidden). */}
            <DockHand
              playerId={topPlayerId}
              cards={topPlayerBoard.hand}
              isOwn={isCasual ? false : actingPlayerId === topPlayerId}
              position="top"
              selectedIds={selectedHandIds(selection.mode)}
              selectable={(card) => (isCasual ? false : handSelectable(selection.mode, actingPlayerId === topPlayerId, card, selection.hasCounter))}
              canPlay={(card) => (isCasual ? false : actingPlayerId === topPlayerId && selection.canPlayHandCard(card))}
              onCardTap={(card) => selection.handleCardTap(topPlayerId, 'hand', card)}
              onPlayCard={selection.playHandCard}
              onCardZoom={openZoom}
              boardFocused={boardHovered}
            />
            <DockHand
              playerId={bottomPlayerId}
              cards={bottomPlayerBoard.hand}
              isOwn={actingPlayerId === bottomPlayerId}
              position="bottom"
              selectedIds={selectedHandIds(selection.mode)}
              selectable={(card) => handSelectable(selection.mode, actingPlayerId === bottomPlayerId, card, selection.hasCounter)}
              canPlay={(card) => actingPlayerId === bottomPlayerId && selection.canPlayHandCard(card)}
              onCardTap={(card) => selection.handleCardTap(bottomPlayerId, 'hand', card)}
              onPlayCard={selection.playHandCard}
              onCardZoom={openZoom}
              boardFocused={boardHovered}
            />
            <AttackArrowOverlay
              attackerInstanceId={attackArrow?.attackerInstanceId ?? null}
              targetInstanceId={attackArrow?.targetInstanceId ?? null}
              committed={attackArrow?.committed ?? false}
            />
            <CardMovementOverlay shellRef={tableShellRef} />
            {/* Portal root for board-scoped overlays (DonStack popup, etc.).
                Sits inside op-match-table-shell so overlays follow the board
                when it animates, are clipped to board bounds by overflow:hidden,
                and are above all board content via z-index. pointer-events:none
                so the invisible layer doesn't block board interaction by default;
                portal contents opt in with pointer-events:auto. */}
            <div
              id="board-overlay-root"
              style={{ position: 'absolute', inset: 0, zIndex: 110, pointerEvents: 'none', overflow: 'visible' }}
            />
          </div>

          <ActionLogDock log={matchState.log} playerNames={playerNames} viewerPlayerId={bottomPlayerId} />
        </div>
      </div>

      <TurnChangeBanner turnNumber={matchState.turnNumber} activePlayerId={matchState.activePlayerId} activePlayerName={nameFor(matchState.activePlayerId)} phase={matchState.currentPhase} gameOver={!!matchState.gameOver} />
      {/* Casual: a pending choice belonging to the opponent seat is theirs to
          resolve over the network, not this client's — suppress the prompt so
          the local human can't answer for the opponent (the WaitingForOpponent
          panel covers this state instead). */}
      {(!isCasual || actingPlayerId === localPlayerId) && <PendingChoicePrompt state={matchState} defs={defs} images={images} />}
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
    </MatchGameShell>
  );
}

function DeckLoadErrorScreen({ reason, onBack }: { reason: string; onBack: () => void }) {
  return (
    <MatchGameShell title="Match">
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">Could not start the match: {reason}</p>
        <Button variant="secondary" onClick={onBack}>Back to Main Menu</Button>
      </div>
    </MatchGameShell>
  );
}

function formatGameOverReason(reason: string): string {
  const labels: Record<string, string> = {
    lifeDamageAtZero: 'Life damage',
    deckedOut: 'Deck out',
    concession: 'Concession',
    cardEffect: 'Card effect',
    draw: 'Draw',
  };
  return labels[reason] ?? reason;
}

/**
 * Casual-only: shown in the Actions panel when action authority belongs to
 * the opponent seat, not the local client. In a real online match the
 * opponent's move would arrive over the RoomService/transport and clear this;
 * in this single-client build there is no remote player, so the local seat's
 * controls simply stay disabled until it is the local player's turn again.
 * This IS the network seam — the place a NetworkTransport plugs in later.
 */
function WaitingForOpponent({ opponentName }: { opponentName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-white/10 bg-black/24 px-4 py-8 text-center">
      <span className="inline-flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2 w-2 animate-pulse rounded-full bg-gold/70"
            style={{ animationDelay: `${index * 160}ms` }}
          />
        ))}
      </span>
      <p className="text-sm font-black uppercase tracking-[0.16em] text-white/80">Waiting for {opponentName}</p>
      <p className="max-w-[16rem] text-[11px] leading-relaxed text-white/45">
        It's the opponent's turn. Their actions will arrive over the network once an online opponent is connected.
      </p>
    </div>
  );
}

function TurnChangeBanner({
  turnNumber,
  activePlayerId,
  activePlayerName,
  phase,
  gameOver,
}: {
  turnNumber: number;
  activePlayerId: string;
  /** Display label for the turn player (username in Casual, else the raw id). */
  activePlayerName: string;
  phase: string;
  gameOver: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [banner, setBanner] = useState<{ key: string; playerName: string; turnNumber: number } | null>(null);

  useEffect(() => {
    if (gameOver || phase === 'setup') {
      setVisible(false);
      return;
    }

    const key = `${turnNumber}:${activePlayerId}`;
    setBanner({ key, playerName: activePlayerName, turnNumber });
    setVisible(false);

    const showFrame = window.requestAnimationFrame(() => setVisible(true));
    const hideTimer = window.setTimeout(() => setVisible(false), 1250);

    return () => {
      window.cancelAnimationFrame(showFrame);
      window.clearTimeout(hideTimer);
    };
  }, [activePlayerId, activePlayerName, gameOver, phase, turnNumber]);

  if (!banner) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-5" aria-live="polite">
      <div
        key={banner.key}
        className={[
          'relative min-w-[min(34rem,88vw)] overflow-hidden px-7 py-5 text-center transition-all duration-300 ease-out',
          visible ? 'translate-x-0 scale-100 opacity-100' : '-translate-x-28 scale-105 opacity-0',
        ].join(' ')}
      >
        <div className="absolute inset-0 skew-x-[-12deg] border-y-2 border-gold/60 bg-[linear-gradient(90deg,_transparent_0%,_rgba(255,211,74,0.13)_16%,_rgba(14,28,62,0.34)_48%,_rgba(185,29,34,0.18)_74%,_transparent_100%)] shadow-[0_0_42px_rgba(255,211,74,0.22)] backdrop-blur-[2px]" />
        <div className="absolute inset-x-[-18%] top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,_transparent,_rgba(255,255,255,0.75),_transparent)]" />
        <div className="absolute left-[-8%] top-1/2 h-10 w-24 -translate-y-1/2 skew-x-[-18deg] bg-gold/25 blur-sm" />
        <div className="absolute right-[-10%] top-1/2 h-12 w-28 -translate-y-1/2 skew-x-[-18deg] bg-brand/25 blur-sm" />
        <div className="relative">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.34em] text-gold drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]">Turn {banner.turnNumber}</p>
          <p className="font-display text-[clamp(2rem,7vw,4.75rem)] font-black uppercase leading-none tracking-[0.05em] text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.62)]">
          {banner.playerName.toUpperCase()} Turn
          </p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.3em] text-white/72">Begin</p>
        </div>
      </div>
    </div>
  );
}

function VictoryScreen({ winnerId, winnerName, reason, onReturn }: { winnerId: string | null; winnerName?: string | null; reason: string; onReturn: () => void }) {
  const winnerLabel = winnerId ? `${winnerName ?? winnerId} wins!` : 'Game over';

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#030713] font-body text-white">
      <VictoryCanvas winnerId={winnerId ?? 'draw'} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,_rgba(255,211,74,0.22),_transparent_28%),linear-gradient(180deg,_rgba(3,7,19,0.18)_0%,_rgba(3,7,19,0.84)_72%,_#030713_100%)]" />
      <div className="pointer-events-none absolute inset-x-[-10%] bottom-[-18%] h-[45%] rotate-[-2deg] border-t-2 border-gold/35 bg-[linear-gradient(180deg,_rgba(12,30,68,0.72),_rgba(3,7,19,0.98))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)]" />

      <section className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <div className="mb-5 h-1 w-[min(34rem,74vw)] bg-[linear-gradient(90deg,_transparent,_rgba(255,211,74,0.95),_transparent)] shadow-[0_0_24px_rgba(255,211,74,0.55)]" />
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-gold drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]">Match Complete</p>
        <h1 className="font-display text-[clamp(3.5rem,14vw,11rem)] font-black uppercase leading-[0.82] tracking-[0.02em] text-white drop-shadow-[0_10px_0_rgba(0,0,0,0.62)]">
          {winnerLabel}
        </h1>
        <p className="mt-5 text-base font-bold uppercase tracking-[0.14em] text-white/72 sm:text-xl">
          Reason: <span className="text-gold">{formatGameOverReason(reason)}</span>
        </p>
        <Button variant="primary" size="lg" className="pointer-events-auto mt-8 min-w-[18rem]" onClick={onReturn}>
          Return to Main Menu
        </Button>
      </section>
    </main>
  );
}

function VictoryCanvas({ winnerId }: { winnerId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    const seed = winnerId.split('').reduce((total, char) => total + char.charCodeAt(0), 0) || 1;
    const streaks = Array.from({ length: 28 }, (_, index) => ({
      x: (index * 137 + seed * 17) % 1800,
      y: (index * 89 + seed * 29) % 900,
      length: 120 + ((index * 37 + seed) % 260),
      speed: 0.35 + ((index * 11) % 18) / 24,
      alpha: 0.12 + ((index * 7) % 12) / 48,
    }));
    const sparks = Array.from({ length: 90 }, (_, index) => ({
      x: (index * 71 + seed * 31) % 1800,
      y: (index * 113 + seed * 13) % 900,
      size: 1 + ((index * 5 + seed) % 4),
      speed: 0.22 + ((index * 17) % 20) / 40,
      hue: index % 3 === 0 ? '#ffd34a' : index % 3 === 1 ? '#ef4444' : '#7dd3fc',
    }));

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (): void => {
      context.clearRect(0, 0, width, height);

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#202838');
      background.addColorStop(0.48, '#071126');
      background.addColorStop(1, '#02040d');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.14;
      context.strokeStyle = '#d9a441';
      context.lineWidth = 1;
      for (let x = -height; x < width + height; x += 96) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + height, height);
        context.stroke();
      }
      context.restore();

      for (const streak of streaks) {
        const x = ((streak.x + frame * streak.speed) % (width + streak.length + 220)) - streak.length;
        const y = (streak.y % Math.max(height, 1));
        const gradient = context.createLinearGradient(x, y, x + streak.length, y - 34);
        gradient.addColorStop(0, 'rgba(255,211,74,0)');
        gradient.addColorStop(0.5, `rgba(255,211,74,${streak.alpha})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.strokeStyle = gradient;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + streak.length, y - 34);
        context.stroke();
      }

      for (const spark of sparks) {
        const x = ((spark.x + frame * spark.speed) % (width + 40)) - 20;
        const y = (spark.y + Math.sin((frame + spark.x) / 38) * 12) % Math.max(height, 1);
        context.globalAlpha = 0.34;
        context.fillStyle = spark.hue;
        context.fillRect(x, y, spark.size, spark.size);
      }
      context.globalAlpha = 1;

      frame += 1;
      animationFrame = window.requestAnimationFrame(draw);
    };

    let animationFrame = 0;
    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [winnerId]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function MatchGameShell({ title, headerRight, children }: { title: string; headerRight?: ReactNode; children: ReactNode }) {
  void headerRight;
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#071126] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-24 grayscale" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_rgba(255,211,74,0.14),_transparent_24%),linear-gradient(180deg,_rgba(5,9,20,0.36)_0%,_rgba(5,10,24,0.92)_72%,_#030713_100%)]" />
      <h1 className="sr-only">{title}</h1>
      <section className="absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden p-2">{children}</section>
    </main>
  );
}

type MatchSelectionMode = ReturnType<typeof useBoardSelection>['mode'];

interface AttackArrowOverlayProps {
  attackerInstanceId: string | null;
  targetInstanceId: string | null;
  committed: boolean;
}

interface AttackArrowPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function buildAttackArrowPath(points: AttackArrowPoints): string {
  const dx = points.x2 - points.x1;
  const dy = points.y2 - points.y1;
  const length = Math.hypot(dx, dy);
  const startInset = 22;
  const endInset = 34;
  if (length <= startInset + endInset) return `M ${points.x1} ${points.y1} L ${points.x2} ${points.y2}`;

  const ux = dx / length;
  const uy = dy / length;
  const x1 = points.x1 + ux * startInset;
  const y1 = points.y1 + uy * startInset;
  const x2 = points.x2 - ux * endInset;
  const y2 = points.y2 - uy * endInset;
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function AttackArrowOverlay({ attackerInstanceId, targetInstanceId, committed }: AttackArrowOverlayProps) {
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const pathId = useId().replace(/:/g, '-');
  const [points, setPoints] = useState<AttackArrowPoints | null>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const board = overlay?.parentElement;
    if (!overlay || !board || !attackerInstanceId || !targetInstanceId) {
      setPoints(null);
      return;
    }

    let frame = 0;

    const findCard = (instanceId: string): HTMLElement | null => {
      const cards = board.querySelectorAll<HTMLElement>('[data-card-instance-id]');
      for (const card of cards) {
        if (card.dataset.cardInstanceId === instanceId) return card;
      }
      return null;
    };

    const measure = (): void => {
      frame = 0;
      const attacker = findCard(attackerInstanceId);
      const target = findCard(targetInstanceId);
      if (!attacker || !target) {
        setPoints(null);
        return;
      }

      const boardRect = board.getBoundingClientRect();
      const attackerRect = attacker.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      setPoints({
        x1: attackerRect.left + attackerRect.width / 2 - boardRect.left,
        y1: attackerRect.top + attackerRect.height / 2 - boardRect.top,
        x2: targetRect.left + targetRect.width / 2 - boardRect.left,
        y2: targetRect.top + targetRect.height / 2 - boardRect.top,
      });
    };

    const scheduleMeasure = (): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(board);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [attackerInstanceId, targetInstanceId]);

  const stroke = committed ? '#f43f5e' : '#fbbf24';
  const glow = committed ? '#fb7185' : '#facc15';
  const arrowPath = points ? buildAttackArrowPath(points) : null;
  const headShadowOpacity = 0.32;
  const arrowHeads = [0, 1, 2, 3, 4, 5, 6];
  const durationSeconds = 1.15;

  return (
    <svg ref={overlayRef} className="pointer-events-none absolute inset-0 z-40 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <filter id="attack-arrow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={glow} floodOpacity="0.85" />
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>
      {arrowPath && (
        <>
          <path id={pathId} d={arrowPath} fill="none" stroke="none" />
          {arrowHeads.map((index) => (
            <g key={index} opacity="0">
              <polygon points="24,0 -18,-14 -8,0 -18,14" fill="#000000" opacity={headShadowOpacity} transform="translate(2 4)" />
              <polygon points="24,0 -18,-14 -8,0 -18,14" fill={stroke} filter="url(#attack-arrow-glow)" />
              <animateMotion dur={`${durationSeconds}s`} repeatCount="indefinite" rotate="auto" begin={`${index * -0.16}s`}>
                <mpath href={`#${pathId}`} />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur={`${durationSeconds}s`} repeatCount="indefinite" begin={`${index * -0.16}s`} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

function handSelectable(mode: MatchSelectionMode, isOwn: boolean, card: CardView, hasCounter: (card: CardView) => boolean): boolean {
  if (!isOwn) return false;
  if (mode.kind === 'idle') {
    return card.category === 'character' || card.category === 'stage' || card.category === 'event';
  }
  if (mode.kind === 'selectCounterCard') {
    return (card.category === 'character' && !!card.counter && card.counter > 0) || (card.category === 'event' && hasCounter(card));
  }
  return false;
}

function selectedHandIds(mode: MatchSelectionMode): Set<string> {
  if (mode.kind === 'confirmPlayCost') return new Set([mode.handCardInstanceId]);
  if (mode.kind === 'payingCounterEventCost') return new Set([mode.handCardInstanceId]);
  if (mode.kind === 'selectCounterBoostTarget') return new Set([mode.handCardInstanceId]);
  return new Set();
}

function PlayerSideRow({
  board,
  isOwn,
  isOpponent,
  reverseRows,
  mode,
  onMatCardTap,
  onMatCardAttack,
  onAttachedDonLabelTap,
  onCardZoom,
  onAttackTargetHover,
  canActivateCard,
  canOnOppAttackCard,
  canAttackCard,
  battlePowerInstanceIds,
  boardFocused,
  canGiveDonOnCard,
  onGiveDon,
  onReturnGivenDon,
  allowReturnGivenDon,
}: {
  board: ReturnType<typeof projectPlayerBoard>;
  isOwn: boolean;
  isOpponent: boolean;
  reverseRows: boolean;
  mode: MatchSelectionMode;
  onMatCardTap: (zone: 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea', card: CardView) => void;
  onMatCardAttack: (card: CardView) => void;
  onAttachedDonLabelTap: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  onAttackTargetHover: (card: CardView | null) => void;
  canActivateCard: (card: CardView) => boolean;
  canOnOppAttackCard: (card: CardView) => boolean;
  canAttackCard: (card: CardView) => boolean;
  battlePowerInstanceIds: Set<string>;
  boardFocused: boolean;
  canGiveDonOnCard: (card: CardView) => boolean;
  onGiveDon: (card: CardView) => void;
  onReturnGivenDon: (card: CardView) => void;
  allowReturnGivenDon: boolean;
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-visible">
      <PlayerBoardPanel
        board={board}
        isOwn={isOwn}
        isOpponent={isOpponent}
        reverseRows={reverseRows}
        mode={mode}
        canActivateCard={canActivateCard}
        canOnOppAttackCard={canOnOppAttackCard}
        canAttackCard={canAttackCard}
        battlePowerInstanceIds={battlePowerInstanceIds}
        boardFocused={boardFocused}
        onCardTap={onMatCardTap}
        onCardAttack={onMatCardAttack}
        onAttachedDonLabelTap={onAttachedDonLabelTap}
        onCardZoom={onCardZoom}
        onAttackTargetHover={onAttackTargetHover}
        canGiveDonOnCard={canGiveDonOnCard}
        onGiveDon={onGiveDon}
        onReturnGivenDon={onReturnGivenDon}
        allowReturnGivenDon={allowReturnGivenDon}
      />
    </div>
  );
}
