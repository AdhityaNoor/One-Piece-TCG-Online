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
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CardDefinition } from '../../engine/state/card';
import type { GameState } from '../../engine/state/game';
import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { MatchModeTag } from '../../../shared/support';
import { countAvailableDon, getActingPlayerId, projectPlayerBoard } from '../../board/projection';
import { getOpponentId } from '../../engine/rules/shared';
import { Button, CardDetailModal, CardImage, GlitterWrap, Modal, ScaleToFit } from '../components';
import {
  ActionBar,
  ActionLogDock,
  actionBarHasBlockingPrompt,
  BoardCardTile,
  CardBackArt,
  CardMovementOverlay,
  DockHand,
  fieldChoiceDimmed,
  fieldChoiceSelected,
  leaderCharacterSelectable,
  MatchAccessoriesProvider,
  MatchChatPanel,
  PendingChoicePrompt,
  PhaseIndicator,
  PlayerBoardPanel,
  ReportBugModal,
  TrashGalleryModal,
  useBoardSelection,
} from '../components/match';
import { SETTINGS_PANEL_SHELL, SETTINGS_PANEL_TITLE } from '../components/settingsPanelStyles';
import { useCpuTurnController } from '../hooks/useCpuTurnController';
import { useCurrentScreen, useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { useMatchStore } from '../store/matchStore';
import { useMatchSetupStore } from '../store/matchSetupStore';
import { useSettingsStore } from '../store/settingsStore';
import { useOnlineStore } from '../store/onlineStore';
import { usePhaseAnnounceStore } from '../store/phaseAnnounceStore';
import type { CardView, PlayerBoardView } from '../../board/projection';
import { logEffectText, logSourceCardLabel } from '../lib/logDisplay';
import { buildBugReportCardOptions } from '../lib/bugReportCardOptions';
import { EFFECT_RUNTIME_LABEL, EFFECT_RUNTIME_MODE } from '../config/effectRuntimeMode';
import type { AssetCacheManager } from '../../cards/assets/assetCache';
import { createCacheStorageAssetManager } from '../../cards/assets/cacheStorageAssetManager';
import { preloadMatchAssets } from '../lib/matchAssetPreload';
import { useHexDriftDelay } from '../hooks/useHexDriftDelay';

function EffectRuntimeBadge() {
  const summary = useMatchStore((s) => s.v2EffectRuntime?.summary);
  const primitiveUsage = summary?.primitiveUsage;
  const label = EFFECT_RUNTIME_MODE === 'v2' && summary
    ? primitiveUsage
      ? `${EFFECT_RUNTIME_LABEL} sidecar: ${summary.v2AbilityCount} abilities, ${primitiveUsage.implementedUsages} native / ${primitiveUsage.bridgeOnlyUsages} bridge / ${primitiveUsage.plannedUsages} planned`
      : `${EFFECT_RUNTIME_LABEL} sidecar: ${summary.v2AbilityCount} abilities, ${summary.legacyWarningCount} bridge gaps`
    : EFFECT_RUNTIME_LABEL;
  return (
    <span
      className={[
        'rounded-sm border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em]',
        EFFECT_RUNTIME_MODE === 'v2'
          ? 'border-cyan-200/40 bg-cyan-950/50 text-cyan-100'
          : 'border-white/10 bg-white/5 text-white/45',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

export function MatchScreen({ leftPanelOverride }: { leftPanelOverride?: ReactNode } = {}) {
  const current = useCurrentScreen();
  const resetTo = useNavigationStore((state) => state.resetTo);
  const load = useSavedDecksStore((state) => state.load);
  const resetMatchSetup = useMatchSetupStore((state) => state.reset);

  const matchState = useMatchStore((s) => s.state);
  const defs = useMatchStore((s) => s.defs);
  const images = useMatchStore((s) => s.cardImagesByDefinitionId);
  // Needed by the projection so in-hand self statics (cost/Counter) display the
  // modified value rather than the printed one — see buildCardView's `registry`.
  const effectRegistry = useMatchStore((s) => s.registry);
  const accessoriesByPlayerId = useMatchStore((s) => s.accessoriesByPlayerId);
  const startedWithDeckIds = useMatchStore((s) => s.startedWithDeckIds);
  const startError = useMatchStore((s) => s.startError);
  const startMatch = useMatchStore((s) => s.startMatch);
  const resetMatch = useMatchStore((s) => s.reset);
  const v2EffectSidecars = useMatchStore((s) => s.v2EffectSidecars);
  // Presentation seat binding (null == hotseat). Drives fixed-perspective +
  // username labelling for Casual matches; never touches GameState.
  const localPlayerId = useMatchStore((s) => s.localPlayerId);
  const playerNames = useMatchStore((s) => s.playerNames);
  const cpuPlayerIds = useMatchStore((s) => s.cpuPlayerIds);
  const onlineMode = useMatchStore((s) => s.onlineMode);
  const leaveOnlineRoom = useOnlineStore((s) => s.leave);
  const chatMessages = useOnlineStore((s) => s.chatMessages);
  const sendChat = useOnlineStore((s) => s.sendChat);
  const onlineStatus = useOnlineStore((s) => s.status);
  const onlineRoomCode = useOnlineStore((s) => s.roomCode);
  // Ranked-only per-seat chess clock (PhaseIndicator's 3rd row). isRanked/seats
  // come from the synced Colyseus room state (see onlineStore.ts's
  // wireRoom/onStateChange) — never derived or ticked client-side, just
  // rendered as given (project rule: UI never mutates game state).
  const isRankedMatch = useOnlineStore((s) => s.isRanked);
  const onlineSeats = useOnlineStore((s) => s.seats);
  const timerMsFor = (pid: string): number | null => {
    if (!isRankedMatch) return null;
    const seat = onlineSeats.find((s) => s.seatId === pid);
    return seat && seat.remainingMs >= 0 ? seat.remainingMs : null;
  };
  const isCasual = localPlayerId !== null && cpuPlayerIds.length === 0;
  const isCpuMatch = cpuPlayerIds.length > 0;
  /** Casual + VS CPU: board stays on the local seat; never hotseat-flip by turn. */
  const isPinnedPerspective = localPlayerId !== null;
  const matchModeLabel = onlineMode ? 'Online Match' : isCpuMatch ? 'VS CPU' : isCasual ? 'Casual Match' : 'Local Hotseat';
  const playTestMode = useMatchStore((s) => s.playTestMode);
  const nameFor = (id: string): string => playerNames[id] ?? id;
  const phaseQueueFront = usePhaseAnnounceStore((s) => s.queue[0] ?? null);

  const [pauseOpen, setPauseOpen] = useState(false);
  const [reportBugOpen, setReportBugOpen] = useState(false);
  // Card-play history for the bug-report picker (CARD_PLAYED log entries,
  // both Leaders, and the reporter's own hand — see bugReportCardOptions.ts
  // doc comment). "Own hand" resolves the same way DockHand's
  // bottomHandIsOwn does: the pinned local seat when isPinnedPerspective
  // (Casual/VS CPU/Online), otherwise whoever currently has agency in
  // hotseat (there's no fixed "local" seat there — the reporter is
  // whoever's turn/choice it is right now). Recomputed whenever the log or
  // cardsById changes; a match's log is small (a few hundred entries at
  // most) so this is cheap enough to keep unconditional rather than gating
  // it behind reportBugOpen.
  const bugReportHandOwnerId = isPinnedPerspective ? localPlayerId : matchState ? getActingPlayerId(matchState) : null;
  const bugReportCardOptions = useMemo(
    () => (matchState ? buildBugReportCardOptions(matchState.log, matchState, defs, bugReportHandOwnerId) : []),
    [matchState, defs, bugReportHandOwnerId],
  );
  const bugReportMatchMode: MatchModeTag = onlineMode ? 'online' : isCpuMatch ? 'vs-cpu' : isCasual ? 'casual-mock' : 'local-hotseat';
  // Left Actions aside: online matches (Casual + Ranked) get an always-visible
  // Chat dock below the action content (see MatchChatPanel doc). Mobile still
  // gates chat behind a bubble/fullscreen panel (mobilePanel === 'chat'),
  // since there's no room for a permanent dock there — seenChatCount only
  // drives that mobile unread badge now.
  const [seenChatCount, setSeenChatCount] = useState(0);
  const [zoomDefinitionId, setZoomDefinitionId] = useState<string | null>(null);
  const [hoveredAttackTargetId, setHoveredAttackTargetId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'actions' | 'log' | 'chat' | null>(null);
  const [battleLinePromptOpen, setBattleLinePromptOpen] = useState(false);
  const [mobileLogNotifications, setMobileLogNotifications] = useState<GameLogEntry[]>([]);
  // True while the mouse is over the playmat — forces both dock hands shut.
  const [boardHovered, setBoardHovered] = useState(false);
  const [handsHidden, setHandsHidden] = useState(false);
  // Desktop-only collapsible battle-log sidebar (mobile keeps its own
  // separate log panel via mobilePanel==='log', untouched). Default
  // collapsed per design — the log is opt-in, not something that eats
  // 330px of board width every match.
  const [desktopLogOpen, setDesktopLogOpen] = useState(false);
  // Desktop-only floating prompt popup for ActionBar's inline "must respond"
  // instructions (hovers over the board instead of living inline in the
  // Actions aside — see actionBarHasBlockingPrompt's doc comment).
  // PendingChoicePrompt's own ChoicePromptShell popups hide themselves
  // independently now (see ChoicePromptPanel.tsx), on every breakpoint.
  // Hidden=false by default so a fresh prompt is never accidentally
  // suppressed; the player can still toggle it away to see the board
  // underneath.
  const [promptPopupHidden, setPromptPopupHidden] = useState(false);
  // Browser Fullscreen API toggle for the Actions aside's Fullscreen button.
  // Presentation-only — never touches GameState/the engine. `isFullscreen`
  // tracks the real DOM state (not just "did we last click the button") so
  // it stays correct if the browser exits fullscreen on its own (Esc key,
  // OS gesture, etc — the fullscreenchange listener below is what catches
  // that).
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleFullscreenChange = (): void => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  const toggleFullscreen = (): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };
  const [handToggleHovered, setHandToggleHovered] = useState(false);
  const tableShellRef = useRef<HTMLDivElement | null>(null);
  const mobileLogNotificationCursorRef = useRef<number | null>(null);
  const navyBackgroundEnabled = useSettingsStore((state) => state.matchNavyBackgroundEnabled);
  const applyCardImages = useMatchStore((s) => s.applyCardImages);

  // Phase 2 asset preload (see matchAssetPreload.ts doc comment): before a
  // standard hotseat/CPU match's board mounts, every deck's card art is
  // fetched into Cache Storage once and swapped for local data: URLs, so
  // no image request happens mid-battle. Scoped to `current.screen ===
  // 'match'` only — Online/Casual matches hydrate via hydrateOnlineMatch()
  // (art is already being fetched incrementally as opponents' cards
  // reveal, and blocking on a full-deck preload would stall room join) and
  // Play Test's generated decks restart so often that preloading would
  // fight its own churn. Both are explicitly out of scope for this pass.
  //
  // Resolved URLs are data: URLs, not blob: object URLs — an earlier
  // version of this used blob: URLs and broke in production (a blob: URL
  // stored in matchStore to be read much later, once a card's <img> with
  // loading="lazy" actually decides to load, turned out to be unreliable —
  // see cacheStorageAssetManager.ts's doc comment). data: URLs are
  // self-contained strings with no such lifecycle, so unlike blob: URLs
  // there is nothing here to explicitly revoke/clean up — the previous
  // match's image map is simply replaced and garbage-collected normally
  // when matchStore.applyCardImages()/reset() overwrite it.
  const assetCacheManagerRef = useRef<AssetCacheManager | null>(null);
  if (!assetCacheManagerRef.current) {
    assetCacheManagerRef.current = createCacheStorageAssetManager();
  }
  const [assetPreload, setAssetPreload] = useState<{ ready: boolean; loaded: number; total: number }>({
    ready: false,
    loaded: 0,
    total: 0,
  });

  // 'tutorial' embeds this same board (see features/tutorial/TutorialManager.tsx)
  // for its scripted scenarios, exactly like 'play-test' already does for its
  // generated ones — deckIdA/deckIdB stay null for both, so the startMatch
  // effect below never fires; TutorialManager/PlayTestScreen own the GameState instead.
  const isMatchScreen = current.screen === 'match' || current.screen === 'online-match' || current.screen === 'play-test' || current.screen === 'tutorial';
  const deckIdA = current.screen === 'match' ? current.deckIdA : null;
  const deckIdB = current.screen === 'match' ? current.deckIdB : null;
  // Casual presentation config off the nav target (undefined == hotseat).
  const presentation = current.screen === 'match' ? current.presentation : undefined;
  // Serialize so the start effect only re-fires when the config actually changes.
  const presentationKey = presentation ? JSON.stringify(presentation) : '';

  useEffect(() => {
    document.documentElement.classList.toggle('op-match-screen-active', isMatchScreen);
    return () => document.documentElement.classList.remove('op-match-screen-active');
  }, [isMatchScreen]);

  // Start (or restart, if navigated here with a different deck pairing) the
  // engine match exactly once per distinct {deckIdA, deckIdB} pair — never
  // on every render (startMatch mints a fresh GameState + RNG seed).
  useEffect(() => {
    if (!deckIdA || !deckIdB) return;
    const alreadyStarted =
      startedWithDeckIds?.a === deckIdA &&
      startedWithDeckIds?.b === deckIdB &&
      startedWithDeckIds?.presentationKey === presentationKey;
    if (alreadyStarted) return;
    const deckAResult = load(deckIdA);
    const deckBResult = load(deckIdB);
    if (deckAResult.ok && deckBResult.ok) {
      startMatch(
        deckAResult.deck,
        deckBResult.deck,
        presentation,
      );
    }
    // presentationKey stands in for the presentation object (stable string).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdA, deckIdB, presentationKey, startedWithDeckIds, load, startMatch]);

  // Fires once per distinct startMatch() call (startedWithDeckIds is a fresh
  // object identity each time matchStore.startMatch() succeeds — see
  // matchStore.ts) — never on every render. `startedWithDeckIds` going back
  // to null (reset()/handleQuit(), or a not-yet-started match) resets the
  // gate so the NEXT match shows its own loading screen instead of
  // inheriting `ready: true` from whatever match just ended.
  useEffect(() => {
    if (current.screen !== 'match' || !startedWithDeckIds) {
      setAssetPreload({ ready: false, loaded: 0, total: 0 });
      return;
    }

    let cancelled = false;
    setAssetPreload({ ready: false, loaded: 0, total: 0 });
    const sourceImages = useMatchStore.getState().cardImagesByDefinitionId;
    const cacheManager = assetCacheManagerRef.current as AssetCacheManager;

    preloadMatchAssets(sourceImages, cacheManager, (progress) => {
      if (!cancelled) setAssetPreload({ ready: false, loaded: progress.loaded, total: progress.total });
    }).then((result) => {
      if (cancelled) return;
      applyCardImages(result.images);
      const total = Object.values(sourceImages).filter((url) => typeof url === 'string' && url.length > 0).length;
      setAssetPreload({ ready: true, loaded: total, total });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.screen, startedWithDeckIds, applyCardImages]);

  // Hooks must run unconditionally on every render of this component (it
  // stays mounted across screen navigation and just returns null when
  // irrelevant) — so useBoardSelection is called here, before any of the
  // early returns below, even though its result is only used once we know
  // we're actually on the match screen with a live GameState.
  const selection = useBoardSelection(matchState ? getActingPlayerId(matchState) : null);
  const { thinking: cpuThinking } = useCpuTurnController(isCpuMatch && !!matchState && !matchState.gameOver);

  useEffect(() => {
    if (selection.mode.kind !== 'selectAttackTarget') setHoveredAttackTargetId(null);
  }, [selection.mode.kind]);

  useEffect(() => {
    if (
      selection.mode.kind === 'confirmPlayCost' ||
      selection.mode.kind === 'selectCounterCard' ||
      selection.mode.kind === 'payingActivateEffectCost' ||
      selection.mode.kind === 'payingEventMainCost' ||
      selection.mode.kind === 'payingCounterEventCost' ||
      selection.mode.kind === 'payingOnOppAttackCost'
    ) {
      setMobilePanel('actions');
    }
  }, [selection.mode.kind]);

  const previousMobileActionModeRef = useRef(selection.mode.kind);
  const previousLogLengthRef = useRef(matchState?.log.length ?? 0);

  useEffect(() => {
    const previousMode = previousMobileActionModeRef.current;
    previousMobileActionModeRef.current = selection.mode.kind;
    if (mobilePanel === 'actions' && previousMode !== 'idle' && selection.mode.kind === 'idle') {
      setMobilePanel(null);
    }
    if (battleLinePromptOpen && previousMode !== 'idle' && selection.mode.kind === 'idle') {
      setBattleLinePromptOpen(false);
    }
  }, [battleLinePromptOpen, mobilePanel, selection.mode.kind]);

  useEffect(() => {
    const logLength = matchState?.log.length ?? 0;
    const previousLogLength = previousLogLengthRef.current;
    previousLogLengthRef.current = logLength;
    if (mobilePanel === 'actions' && logLength > previousLogLength) {
      setMobilePanel(null);
    }
    if (battleLinePromptOpen && logLength > previousLogLength) {
      setBattleLinePromptOpen(false);
    }
  }, [battleLinePromptOpen, matchState?.log.length, mobilePanel]);

  useEffect(() => {
    if (!matchState) {
      mobileLogNotificationCursorRef.current = null;
      setMobileLogNotifications([]);
      return;
    }

    const previousLength = mobileLogNotificationCursorRef.current;
    const currentLength = matchState.log.length;
    mobileLogNotificationCursorRef.current = currentLength;
    if (previousLength === null || currentLength <= previousLength) return;

    const added = matchState.log.slice(previousLength);
    setMobileLogNotifications((current) => [...added, ...current].slice(0, 3));

    const timers = added.map((entry) =>
      window.setTimeout(() => {
        setMobileLogNotifications((current) => current.filter((item) => item.id !== entry.id));
      }, 3600),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [matchState]);

  // Keep the mobile chat bubble's unread badge in sync: mark everything
  // "seen" the moment the fullscreen chat panel is open, including as new
  // messages stream in while already open. The desktop dock (below) is
  // always visible when onlineMode, so it never needs its own unread
  // counter — only the mobile bubble hides chat behind a tap. Reset when a
  // new online match/room starts fresh.
  useEffect(() => {
    if (mobilePanel === 'chat') setSeenChatCount(chatMessages.length);
  }, [mobilePanel, chatMessages.length]);
  useEffect(() => {
    if (!onlineMode) {
      setSeenChatCount(0);
      setMobilePanel((panel) => (panel === 'chat' ? null : panel));
    }
  }, [onlineMode]);

  // --- Phase 1 performance: memoized/stabilized derived values ----------
  // Everything in this block MUST be computed here (before the early
  // returns below) — these are hooks (useMemo/useCallback), and Rules of
  // Hooks forbids calling a hook after a conditional return. Each is
  // null-safe since `matchState` may not exist yet on this render. This is
  // what lets React.memo on PlayerBoardPanel/DockHand/ActionBar actually
  // skip re-rendering when something UNRELATED to the board changes (a
  // modal open/close, a hover, a chat message) — see
  // docs/08-match-performance-plan.md Phase 1 for the full writeup of why
  // this was necessary (React.memo alone does nothing against a fresh
  // closure/object every render).
  const actingPlayerIdSafe = matchState ? getActingPlayerId(matchState) : null;
  const bottomPlayerIdSafe = matchState ? (localPlayerId ?? matchState.activePlayerId) : null;
  const topPlayerIdSafe = matchState && bottomPlayerIdSafe ? getOpponentId(matchState, bottomPlayerIdSafe) : null;

  const bottomPlayerBoard = useMemo(() => {
    if (!matchState || !bottomPlayerIdSafe) return null;
    const v2Projection = EFFECT_RUNTIME_MODE === 'v2' ? { sidecars: v2EffectSidecars } : undefined;
    return projectPlayerBoard(matchState, defs, images, bottomPlayerIdSafe, v2Projection, effectRegistry);
  }, [matchState, defs, images, bottomPlayerIdSafe, v2EffectSidecars, effectRegistry]);

  const topPlayerBoard = useMemo(() => {
    if (!matchState || !topPlayerIdSafe) return null;
    const v2Projection = EFFECT_RUNTIME_MODE === 'v2' ? { sidecars: v2EffectSidecars } : undefined;
    return projectPlayerBoard(matchState, defs, images, topPlayerIdSafe, v2Projection, effectRegistry);
  }, [matchState, defs, images, topPlayerIdSafe, v2EffectSidecars, effectRegistry]);

  const battlePowerInstanceIds = useMemo(() => {
    if (!matchState?.currentBattle) return new Set<string>();
    return new Set([matchState.currentBattle.attackerInstanceId, matchState.currentBattle.targetInstanceId]);
  }, [matchState?.currentBattle]);

  // Zero real dependencies beyond React's own guaranteed-stable state
  // setters — hoisted + useCallback purely so their IDENTITY is stable for
  // the PlayerBoardPanel React.memo boundary below, not because their
  // behavior needed to change.
  const openZoom = useCallback((card: CardView) => setZoomDefinitionId(card.cardDefinitionId), []);
  const handleAttackTargetHover = useCallback((card: CardView | null) => setHoveredAttackTargetId(card?.instanceId ?? null), []);

  const selectedHandIdsMemo = useMemo(() => selectedHandIds(selection.mode), [selection.mode]);

  // One bundle per side (rather than 4 separate useCallback hooks per side)
  // — DockHand calls selectable/canPlay/dimmed/cardBadge per hand card
  // during ITS OWN render, so these need to be stable, but they're only
  // ever consumed together, so bundling them into one memoized object is
  // simpler than 8 individual useCallback calls. Mirrors the exact
  // isPinnedPerspective-gating asymmetry the original inline closures had
  // (top seat is never "ours" under a pinned/Casual perspective; bottom
  // always is) — see the pre-Phase-1 version of this file for the
  // original per-JSX-site closures this replaces.
  const bottomHandCallbacks = useMemo(() => {
    if (!bottomPlayerIdSafe) return null;
    const isActingSide = actingPlayerIdSafe === bottomPlayerIdSafe;
    return {
      onCardTap: (card: CardView) => selection.handleCardTap(bottomPlayerIdSafe, 'hand', card),
      selectable: (card: CardView) => handSelectable(selection.mode, isActingSide, card, selection.isCounterCardApplicable),
      canPlay: (card: CardView) => isActingSide && selection.canPlayHandCard(card),
      dimmed: (card: CardView) => isActingSide && selection.mode.kind === 'selectCounterCard' && !selection.isCounterCardApplicable(card),
      cardBadge: (card: CardView) => (actingPlayerIdSafe !== bottomPlayerIdSafe ? null : counterEventBadge(selection.mode, selection.counterEventDonInfo, card)),
    };
  }, [bottomPlayerIdSafe, actingPlayerIdSafe, selection.mode, selection.isCounterCardApplicable, selection.canPlayHandCard, selection.counterEventDonInfo, selection.handleCardTap]);

  const topHandCallbacks = useMemo(() => {
    if (!topPlayerIdSafe) return null;
    const isActingSide = actingPlayerIdSafe === topPlayerIdSafe;
    return {
      onCardTap: (card: CardView) => selection.handleCardTap(topPlayerIdSafe, 'hand', card),
      selectable: (card: CardView) => (isPinnedPerspective ? false : handSelectable(selection.mode, isActingSide, card, selection.isCounterCardApplicable)),
      canPlay: (card: CardView) => (isPinnedPerspective ? false : isActingSide && selection.canPlayHandCard(card)),
      dimmed: (card: CardView) => !isPinnedPerspective && isActingSide && selection.mode.kind === 'selectCounterCard' && !selection.isCounterCardApplicable(card),
      cardBadge: (card: CardView) => (isPinnedPerspective || actingPlayerIdSafe !== topPlayerIdSafe ? null : counterEventBadge(selection.mode, selection.counterEventDonInfo, card)),
    };
  }, [topPlayerIdSafe, actingPlayerIdSafe, isPinnedPerspective, selection.mode, selection.isCounterCardApplicable, selection.canPlayHandCard, selection.counterEventDonInfo, selection.handleCardTap]);

  if (!isMatchScreen) {
    return null;
  }

  const deckAResult = deckIdA ? load(deckIdA) : null;
  const deckBResult = deckIdB ? load(deckIdB) : null;

  const zoomDefinition: CardDefinition | null = zoomDefinitionId ? defs[zoomDefinitionId] ?? null : null;
  const zoomImageUrl = zoomDefinitionId ? images[zoomDefinitionId] ?? null : null;
  // openZoom is now defined above (hoisted + useCallback, Phase 1 performance) — not redefined here.

  function handleQuit(): void {
    if (onlineMode) leaveOnlineRoom();
    resetMatch();
    resetMatchSetup();
    resetTo(playTestMode ? { screen: 'debug-tools' } : onlineMode ? { screen: 'play-menu' } : { screen: 'main-menu' });
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
        {current.screen === 'online-match' ? <OnlineSyncLoading onCancel={handleQuit} /> : <p className="p-6 text-sm text-white/50">Starting match...</p>}
      </MatchGameShell>
    );
  }

  // Phase 2 asset-preload gate — standard hotseat/CPU matches only (see the
  // effect above for why Online/Casual and Play Test are excluded). Blocks
  // the board from mounting until every deck's card art is cached, so the
  // very first paint of the match already has zero pending image requests.
  if (current.screen === 'match' && !assetPreload.ready) {
    const percent = assetPreload.total > 0 ? Math.round((assetPreload.loaded / assetPreload.total) * 100) : 100;
    return (
      <MatchGameShell title="Match">
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-sm text-white/70">
          <p>Loading card art…</p>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-white/60 transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-white/40">
            {assetPreload.total > 0 ? `${assetPreload.loaded} / ${assetPreload.total} images cached` : 'No card art to cache'}
          </p>
        </div>
      </MatchGameShell>
    );
  }

  // Narrows the *Safe hook-computed values above from nullable back to
  // non-null now that matchState is confirmed — they're all derived purely
  // from matchState, so this is unreachable in practice, but keeps
  // TypeScript's narrowing honest without an unsafe `!` assertion.
  if (!bottomPlayerIdSafe || !topPlayerIdSafe || !actingPlayerIdSafe || !bottomPlayerBoard || !topPlayerBoard || !bottomHandCallbacks || !topHandCallbacks) {
    return null;
  }

  // PhaseIndicator (both boards) shows the phase currently being announced by
  // TurnAndPhaseBanner while its queue is draining, not just the final
  // settled matchState.currentPhase — a single dispatch can run Refresh ->
  // Draw -> DON!! -> Main in one go (see buildTurnSequence.ts), so watching
  // currentPhase alone would only ever show the end result and never glide
  // through the phases in between. Falls back to the true state once the
  // queue is empty (steady-state Main Phase, mid-battle, etc).
  //
  // While ANY step of the sequence is active (turnChange OR a phase step
  // for the OTHER player), this deliberately does NOT fall back to the raw
  // matchState for either board — matchState.activePlayerId/currentPhase
  // already reflect the fully-settled END of the whole cascade (set in one
  // shot), so without this guard the new active player's board would light
  // up as "active" the instant End Turn is clicked, before their Refresh
  // step even reaches the front of the queue. `active: false` here doesn't
  // hide anything — PhaseIndicator freezes at its last real position while
  // inactive, so both boards just hold still until the sequence actually
  // reaches them.
  // (The hook itself is called up top with the rest of MatchScreen's hooks —
  // React's Rules of Hooks forbid calling it after the early returns above;
  // this closure just reuses that value once matchState is narrowed non-null.)
  const phaseDisplayFor = (pid: string): { phase: GameState['currentPhase']; active: boolean } => {
    if (phaseQueueFront) {
      if (phaseQueueFront.kind === 'phase' && phaseQueueFront.playerId === pid) {
        return { phase: phaseQueueFront.phase, active: true };
      }
      return { phase: matchState.currentPhase, active: false };
    }
    return { phase: matchState.currentPhase, active: matchState.activePlayerId === pid };
  };

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
  // bottomPlayerId/topPlayerId/bottomPlayerBoard/topPlayerBoard are computed
  // above (hoisted, memoized — Phase 1 performance) as the *Safe variants;
  // aliased here to the names the rest of this function already uses.
  const bottomPlayerId = bottomPlayerIdSafe;
  const topPlayerId = topPlayerIdSafe;

  // Action AUTHORITY (who may currently act, and whose hand/board ActionBar
  // should read for eligibility checks) still tracks getActingPlayerId() —
  // only the panels' on-screen position was the bug, not this.
  const actingPlayerId = actingPlayerIdSafe;
  const actingBoard = actingPlayerId === bottomPlayerId ? bottomPlayerBoard : topPlayerBoard;
  const isCpuTurn = cpuPlayerIds.includes(actingPlayerId);
  const canUseLocalActions = !isCpuTurn && (!isPinnedPerspective || actingPlayerId === localPlayerId);
  // Online-only (casual queue and ranked alike — both hydrate through the
  // same onlineMode/hydrateOnlineMatch path, see onlineStore.ts) loader
  // popup. Scoped tightly to the pre-game "going first" coin-flip decision
  // (Comprehensive Rules 5-2-1-4/5-2-1-5, engine: setupState.stage ===
  // 'awaitingGoingFirstChoice') — NOT the rest of the opponent's turn.
  // Originally this fired for the opponent's entire turn/Block/Counter
  // window (any time !canUseLocalActions), which meant it sat over the
  // board continuously while the opponent just played normally; the live
  // per-seat state stream already shows their moves as they happen, so a
  // "deciding" overlay for ordinary turns was redundant and blocked the
  // view. Mulligan (the other setup sub-step) intentionally does NOT show
  // this either — each seat's mulligan is its own private decision, not
  // something to visually wait on. Deliberately NOT gated on the older
  // single-client isPinnedPerspective mock (that has no real opponent to
  // wait on) — see WaitingForOpponent's doc comment for that seam.
  const opponentDeciding =
    onlineMode &&
    !matchState.gameOver &&
    matchState.currentPhase === 'setup' &&
    matchState.setupState?.stage === 'awaitingGoingFirstChoice' &&
    !canUseLocalActions;

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
  // battlePowerInstanceIds is computed above (hoisted, memoized — Phase 1 performance).
  const mobileBattleLineLabel = `${nameFor(matchState.activePlayerId)}:${matchState.currentPhase}`;
  const actionContent = matchState.gameOver ? (
    <p className="text-xs text-white/50">Match complete.</p>
  ) : isCpuTurn ? (
    <CpuThinking opponentName={nameFor(actingPlayerId)} />
  ) : !canUseLocalActions ? (
    <WaitingForOpponent opponentName={nameFor(topPlayerId)} />
  ) : (
    <ActionBar
      phase={matchState.currentPhase}
      turnNumber={matchState.turnNumber}
      battle={matchState.currentBattle}
      actingBoard={actingBoard}
      selection={selection}
    />
  );
  // Desktop-only: whether ActionBar (above) is currently a "must respond"
  // prompt rather than its idle End-Main-Phase state — exactly mirrors when
  // `actionContent` above resolves to the plain <ActionBar/> branch (the
  // canUseLocalActions/isCpuTurn/gameOver guard is identical on purpose), so
  // this never fires for CpuThinking/WaitingForOpponent/"Match complete."
  // Despite the desktop-flavoured name below, this condition is purely "the
  // Actions panel is currently a must-respond prompt, and this client is the
  // one who has to respond" — which is exactly what the mobile header's
  // Actions button highlights too (the panel is behind a tap there, so without
  // the highlight a waiting prompt is completely invisible).
  const actionPromptPending =
    canUseLocalActions && !isCpuTurn && !matchState.gameOver && actionBarHasBlockingPrompt(selection, matchState.currentBattle, actingBoard);
  const desktopActionPromptVisible = actionPromptPending;
  // Same "may this client see it" gate PendingChoicePrompt's own render site
  // already used (Casual: only the seat whose choice it actually is) —
  // reused for both the floating-popup visibility signal below AND the real
  // render further down, so the two can never disagree.
  const mayViewPendingChoice = !isPinnedPerspective || actingPlayerId === localPlayerId;
  // The floating popup below now only ever carries ActionBar's inline "must
  // respond" content — PendingChoicePrompt's ChoicePromptShell popups
  // (search galleries, mulligan, K.O. replacement, etc.) manage their own
  // minimize/reopen state internally (see ChoicePromptPanel.tsx) so they can
  // be hidden-to-view-the-board on mobile too, not just desktop. So this
  // widget's visibility is just desktopActionPromptVisible now.
  const anyDesktopPromptVisible = desktopActionPromptVisible;
  const battleLineActions = buildMobileBattleLineActions({
    phase: matchState.currentPhase,
    turnNumber: matchState.turnNumber,
    battle: matchState.currentBattle,
    actingBoard,
    hasActivateMain: selection.hasActivateMain,
    hasUnusedActivateMain: selection.hasUnusedActivateMain,
    hasCounter: selection.hasCounter,
  });
  // Nothing left for the acting player to do this phase — every summary line
  // buildMobileBattleLineActions can produce (unused DON!!, eligible attackers,
  // activatable effects, blockers, counters) is absent. Gated on this client
  // actually being the one to move, so it can't pulse while the opponent is
  // thinking. The battle line is the control that ends the phase / passes the
  // step, so it becomes the one thing worth pointing at.
  const battleLineAlert = canUseLocalActions && !isCpuTurn && !matchState.gameOver && battleLineActions.length === 0;
  const handleBattleLineEndPhase = (): void => {
    if (!canUseLocalActions || matchState.currentPhase !== 'main' || matchState.currentBattle) return;
    selection.endMainPhase();
    setBattleLinePromptOpen(false);
  };
  const mobileActionsPanel = (
    <aside className="op-mobile-fullscreen-dock flex h-full min-h-0 flex-col border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
      <div className="border-b border-gold/25 bg-black/18 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{matchModeLabel}</p>
              <EffectRuntimeBadge />
            </div>
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
          <PhaseIndicator playerId={topPlayerId} label={nameFor(topPlayerId)} currentPhase={phaseDisplayFor(topPlayerId).phase} active={phaseDisplayFor(topPlayerId).active} timerMs={timerMsFor(topPlayerId)} />
          <PhaseIndicator playerId={bottomPlayerId} label={nameFor(bottomPlayerId)} currentPhase={phaseDisplayFor(bottomPlayerId).phase} active={phaseDisplayFor(bottomPlayerId).active} timerMs={timerMsFor(bottomPlayerId)} />
        </div>
        {actionContent}
      </div>
    </aside>
  );
  const unreadChatCount = Math.max(0, chatMessages.length - seenChatCount);
  const chatDisconnected = onlineMode && onlineStatus !== 'connected';

  return (
    <MatchAccessoriesProvider value={accessoriesByPlayerId}>
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

        <div className="xl:hidden">
          <MobileActionHeader
            onOpenActions={() => setMobilePanel((panel) => (panel === 'actions' ? null : 'actions'))}
            onOpenLog={() => setMobilePanel((panel) => (panel === 'log' ? null : 'log'))}
            actionsPending={actionPromptPending && mobilePanel !== 'actions'}
            showChat={onlineMode}
            unreadChatCount={unreadChatCount}
            onOpenChat={() => setMobilePanel((panel) => (panel === 'chat' ? null : 'chat'))}
            onOpenPause={() => setPauseOpen(true)}
          />
        </div>

        <MobileMatchLayout
          topBoard={topPlayerBoard}
          bottomBoard={bottomPlayerBoard}
          topPlayerId={topPlayerId}
          bottomPlayerId={bottomPlayerId}
          actingPlayerId={actingPlayerId}
          isPinnedPerspective={isPinnedPerspective}
          mode={selection.mode}
          selectedHandIds={selectedHandIdsMemo}
          battlePowerInstanceIds={battlePowerInstanceIds}
          onMatCardTap={selection.handleCardTap}
          onMatCardAttack={selection.beginAttackWithCard}
          onCardZoom={openZoom}
          onDonGroupTap={selection.tapDonGroup}
          donSelectionBudget={selection.donSelectionBudgetNow}
          selectedDonCountIn={selection.selectedDonCountIn}
          eligibleDonCountIn={selection.eligibleDonCountIn}
          canAttackCard={selection.canDeclareAttackWith}
          canActivateCard={selection.hasActivateMain}
          canOnOppAttackCard={selection.hasOnOpponentsAttack}
          canPlayHandCard={selection.canPlayHandCard}
          onPlayHandCard={selection.playHandCard}
          canGiveDonOnCard={selection.canGiveDonOnCard}
          onGiveDon={selection.giveDonToCard}
          onReturnGivenDon={selection.returnGivenDonFromCard}
          allowReturnGivenDon={!isCasual}
          handSelectable={(playerId, card) => handSelectable(selection.mode, actingPlayerId === playerId, card, selection.isCounterCardApplicable)}
          counterEventDonInfo={selection.counterEventDonInfo}
          battleLineLabel={mobileBattleLineLabel}
          battleLineAlert={battleLineAlert}
          handsHidden={handsHidden}
          onToggleHands={() => setHandsHidden((hidden) => !hidden)}
          mobilePanel={mobilePanel}
          attackArrow={attackArrow}
          actionsPanel={mobileActionsPanel}
          logPanel={<ActionLogDock log={matchState.log} playerNames={playerNames} viewerPlayerId={bottomPlayerId} className="op-mobile-fullscreen-dock h-full max-h-none" />}
          chatPanel={<MatchChatPanel messages={chatMessages} localPlayerId={localPlayerId} nameFor={nameFor} onSend={sendChat} disabled={chatDisconnected} className="h-full" />}
          onOpenBattleActions={() => setBattleLinePromptOpen(true)}
          onClosePanel={() => setMobilePanel(null)}
          cpuThinking={cpuThinking}
          cpuThinkingLabel={nameFor(actingPlayerId)}
          opponentDeciding={opponentDeciding}
          opponentDecidingLabel={nameFor(topPlayerId)}
        />
        <MobileBattleLogNotifications
          entries={mobileLogNotifications}
          playerNames={playerNames}
          viewerPlayerId={bottomPlayerId}
        />

        <div
          className="hidden min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid"
          style={{ gridTemplateColumns: `330px minmax(0,1fr) ${desktopLogOpen ? '330px' : '2.75rem'}` }}
        >
          {leftPanelOverride}
          <aside className={[leftPanelOverride ? 'hidden' : 'flex', 'min-h-0 flex-col border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]'].join(' ')}>
            <div className="border-b border-gold/25 bg-black/18 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{matchModeLabel}</p>
                    <EffectRuntimeBadge />
                  </div>
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
                <PhaseIndicator playerId={topPlayerId} label={nameFor(topPlayerId)} currentPhase={matchState.currentPhase} active={matchState.activePlayerId === topPlayerId} timerMs={timerMsFor(topPlayerId)} />
                <PhaseIndicator playerId={bottomPlayerId} label={nameFor(bottomPlayerId)} currentPhase={matchState.currentPhase} active={matchState.activePlayerId === bottomPlayerId} timerMs={timerMsFor(bottomPlayerId)} />
              </div>
              {desktopActionPromptVisible ? (
                <div className="flex flex-col items-center gap-2 border border-dashed border-gold/30 bg-black/18 px-3 py-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Action Required</p>
                  <p className="text-xs text-white/55">Respond to the prompt hovering over the board.</p>
                  {promptPopupHidden && (
                    <Button variant="secondary" size="sm" onClick={() => setPromptPopupHidden(false)}>
                      Show Prompt
                    </Button>
                  )}
                </div>
              ) : (
                actionContent
              )}
            </div>
            {onlineMode && (
              <div className="flex min-h-0 flex-1 flex-col border-t border-gold/25">
                <p className="flex-shrink-0 border-b border-gold/15 bg-black/18 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-gold/80">
                  Chat
                </p>
                <MatchChatPanel
                  messages={chatMessages}
                  localPlayerId={localPlayerId}
                  nameFor={nameFor}
                  onSend={sendChat}
                  disabled={chatDisconnected}
                  className="min-h-0 flex-1"
                />
              </div>
            )}
            <div className="flex gap-2 border-t border-gold/25 bg-black/18 p-3">
              <button
                type="button"
                onClick={() => setPauseOpen(true)}
                className="h-10 flex-1 border border-white/15 bg-black/28 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-pressed={isFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-white/15 bg-black/28 text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
              >
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 4v3a2 2 0 0 1-2 2H4M20 9h-3a2 2 0 0 1-2-2V4M4 15h3a2 2 0 0 1 2 2v3M15 20v-3a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 1-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
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
            {/* Layer 5 (visual polish): starfield warp AS the match board
                background — rendered above the shell's own navy fill but below
                the playmat/cards (which sit at z-[1]+). This is the visible
                copy; the MatchGameShell-level GlitterWrap only shows in the
                gutters and on loading/error sub-screens. */}
            <GlitterWrap className="z-0" particleCount={320} brightness={90} starSize={16} glitterIntensity={4} />
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
            <ScaleToFit className="op-match-playmat-layer relative z-[1]">
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
                  isOwn={isPinnedPerspective ? false : actingPlayerId === topPlayerId}
                  isOpponent={isPinnedPerspective ? true : actingPlayerId !== topPlayerId}
                  reverseRows={true}
                  mode={selection.mode}
                  canActivateCard={selection.hasActivateMain}
                  canOnOppAttackCard={selection.hasOnOpponentsAttack}
                  canAttackCard={selection.canDeclareAttackWith}
                  battlePowerInstanceIds={battlePowerInstanceIds}
                  onMatCardTap={selection.handleCardTap}
                  onMatCardAttack={selection.beginAttackWithCard}
                  onAttachedDonLabelTap={selection.handleAttachedDonLabelTap}
                  onCardZoom={openZoom}
                  onAttackTargetHover={handleAttackTargetHover}
                  boardFocused={boardHovered}
                  canGiveDonOnCard={selection.canGiveDonOnCard}
                  onGiveDon={selection.giveDonToCard}
                  onReturnGivenDon={selection.returnGivenDonFromCard}
                  allowReturnGivenDon={!isCasual}
                />

                <div className="flex flex-shrink-0 items-center justify-center gap-3 py-0.5">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold/60">Battle Line</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                </div>

                {/* data-play-drop marks the acting player's own half of the
                    field as the drop target for dragging a card out of hand;
                    DockHand hit-tests for it (see handOrder.isOverPlayDropZone)
                    and routes the drop through the normal playHandCard path, so
                    cost/legality checks are unchanged. `contents` adds no box
                    of its own, leaving the existing layout untouched. */}
                <div data-play-drop="true" className="contents">
                <PlayerSideRow
                  board={bottomPlayerBoard}
                  isOwn={isPinnedPerspective ? true : actingPlayerId === bottomPlayerId}
                  isOpponent={isPinnedPerspective ? false : actingPlayerId !== bottomPlayerId}
                  reverseRows={false}
                  mode={selection.mode}
                  canActivateCard={selection.hasActivateMain}
                  canOnOppAttackCard={selection.hasOnOpponentsAttack}
                  canAttackCard={selection.canDeclareAttackWith}
                  battlePowerInstanceIds={battlePowerInstanceIds}
                  onMatCardTap={selection.handleCardTap}
                  onMatCardAttack={selection.beginAttackWithCard}
                  onAttachedDonLabelTap={selection.handleAttachedDonLabelTap}
                  onCardZoom={openZoom}
                  onAttackTargetHover={handleAttackTargetHover}
                  boardFocused={boardHovered}
                  canGiveDonOnCard={selection.canGiveDonOnCard}
                  onGiveDon={selection.giveDonToCard}
                  onReturnGivenDon={selection.returnGivenDonFromCard}
                  allowReturnGivenDon={!isCasual}
                />
                </div>
              </div>
            </ScaleToFit>
            {cpuThinking && (
              <CpuThinkingOverlay opponentName={nameFor(actingPlayerId)} />
            )}
            {!cpuThinking && opponentDeciding && (
              <OnlineOpponentTurnOverlay opponentName={nameFor(topPlayerId)} />
            )}
            {/* ── Dock hands ── rendered outside ScaleToFit so they aren't
                affected by cqh sizing; positioned absolute relative to
                op-match-table-shell (position:relative; overflow:hidden). */}
            <HandToggle
              position="top"
              handsHidden={handsHidden}
              handCount={topPlayerBoard.hand.length}
              onToggle={() => setHandsHidden((hidden) => !hidden)}
              onHoverChange={setHandToggleHovered}
            />
            <HandToggle
              position="bottom"
              handsHidden={handsHidden}
              handCount={bottomPlayerBoard.hand.length}
              onToggle={() => setHandsHidden((hidden) => !hidden)}
              onHoverChange={setHandToggleHovered}
            />
            <DockHand
              playerId={topPlayerId}
              cards={topPlayerBoard.hand}
              isOwn={isPinnedPerspective ? false : actingPlayerId === topPlayerId}
              allowHoverReveal={!isPinnedPerspective}
              position="top"
              selectedIds={selectedHandIdsMemo}
              selectable={topHandCallbacks.selectable}
              canPlay={topHandCallbacks.canPlay}
              dimmed={topHandCallbacks.dimmed}
              cardBadge={topHandCallbacks.cardBadge}
              onCardTap={topHandCallbacks.onCardTap}
              onPlayCard={selection.playHandCard}
              onCardZoom={openZoom}
              boardFocused={handsHidden}
              forceOpen={handToggleHovered && !handsHidden}
            />
            <DockHand
              playerId={bottomPlayerId}
              cards={bottomPlayerBoard.hand}
              isOwn={isPinnedPerspective ? true : actingPlayerId === bottomPlayerId}
              allowHoverReveal={!isPinnedPerspective}
              position="bottom"
              selectedIds={selectedHandIdsMemo}
              selectable={bottomHandCallbacks.selectable}
              canPlay={bottomHandCallbacks.canPlay}
              dimmed={bottomHandCallbacks.dimmed}
              cardBadge={bottomHandCallbacks.cardBadge}
              onCardTap={bottomHandCallbacks.onCardTap}
              onPlayCard={selection.playHandCard}
              onCardZoom={openZoom}
              boardFocused={handsHidden}
              forceOpen={handToggleHovered && !handsHidden}
              // Keeps the dropped card shown on the field while its play cost
              // awaits confirmation; cancelling the DON!! prompt returns the
              // mode to idle, which clears this and removes the ghost.
              pendingPlayInstanceId={
                selection.mode.kind === 'confirmPlayCost' ? selection.mode.handCardInstanceId : null
              }
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

          {/* Collapsible battle-log sidebar — default collapsed to a slim
              strip; opening it doesn't reflow the board (the middle column
              is minmax(0,1fr), so it just gives up 330px-44px of width). See
              desktopLogOpen's declaration doc comment. Collapsed state is a
              single button spanning the whole strip (chevron + "Battle Log"
              label together, both toggle it) rather than a separate
              floating chevron over inert filler — the entire closed bar is
              the affordance, not just a sliver of it. */}
          <div className="relative min-h-0">
            {desktopLogOpen ? (
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={() => setDesktopLogOpen(false)}
                  aria-expanded={true}
                  aria-label="Collapse battle log"
                  className="absolute -left-3 top-1/2 z-20 flex h-11 w-6 -translate-y-1/2 items-center justify-center border border-cyan-200/25 bg-[rgba(10,28,66,0.94)] text-cyan-100/75 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-gold/55 hover:text-gold"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <ActionLogDock log={matchState.log} playerNames={playerNames} viewerPlayerId={bottomPlayerId} className="h-full" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDesktopLogOpen(true)}
                aria-expanded={false}
                aria-label="Expand battle log"
                className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] py-4 text-white/40 transition-colors hover:border-gold/45 hover:bg-black/30 hover:text-gold"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="[writing-mode:vertical-rl] text-[9px] font-black uppercase tracking-[0.24em]">Battle Log</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <TurnAndPhaseBanner nameFor={nameFor} gameOver={!!matchState.gameOver} />
      {/* On-field SELECT_CARDS choices (see useBoardSelection.ts's
          'resolvingFieldChoice') resolve via board dimming, not this banner
          — but the banner is what tells the player WHAT they're choosing and
          WHY (source card + effect text). Deliberately rendered unconditionally
          (unlike PendingChoicePrompt below): the whole point of
          'resolvingFieldChoice' being viewer-agnostic is that an online
          opponent also sees this — as a read-only "they're selecting a card"
          indicator — instead of nothing at all. */}
      {selection.fieldChoiceInfo && (
        <FieldChoiceBanner
          info={selection.fieldChoiceInfo}
          viewerLabel={isPinnedPerspective && selection.fieldChoiceInfo.playerId !== localPlayerId ? `${nameFor(selection.fieldChoiceInfo.playerId)} is selecting a card…` : null}
        />
      )}
      {/* Desktop-only floating prompt popup: hovers over the board instead
          of living inline in the left Actions aside (ActionBar's "must
          respond" branches, via actionBarHasBlockingPrompt). Only carries
          ActionBar's inline instructions now — PendingChoicePrompt's own
          ChoicePromptShell popups hide/reopen themselves independently (see
          ChoicePromptPanel.tsx), on every breakpoint, not just desktop.
          z-[45] is deliberately BELOW TurnAndPhaseBanner (z-[108]) and the
          board-overlay-root layer (zIndex 110) so this can never visually
          cover either of them, and anchored to top-3 (very close to the top
          edge) rather than viewport-center to stay clear of the turn
          banner's dead-center flash and the board's own card-play
          animations — see actionBarHasBlockingPrompt's doc comment for the
          OTHER half of this fix (it also no longer fires on every
          Block/Counter Step, only when there's a real decision). Hidden
          entirely on mobile/tablet (`hidden xl:flex`) — that layout keeps
          its existing inline ActionBar. */}
      {anyDesktopPromptVisible && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[45] hidden justify-center px-4 xl:flex">
          <div className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setPromptPopupHidden((hidden) => !hidden)}
              aria-expanded={!promptPopupHidden}
              className="flex h-7 items-center gap-1.5 border border-white/15 bg-black/55 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all hover:border-gold/55 hover:text-gold"
            >
              <svg viewBox="0 0 24 24" className={['h-3 w-3 transition-transform duration-200', promptPopupHidden ? 'rotate-180' : ''].join(' ')} fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {promptPopupHidden ? 'Show Prompt' : 'Hide (view board)'}
            </button>

            {!promptPopupHidden && desktopActionPromptVisible && (
              <div className={`w-full p-3 ${SETTINGS_PANEL_SHELL}`}>
                <p className={SETTINGS_PANEL_TITLE}>Action Required</p>
                <div className="mt-3 flex flex-col gap-3">
                  <ActionBar
                    phase={matchState.currentPhase}
                    turnNumber={matchState.turnNumber}
                    battle={matchState.currentBattle}
                    actingBoard={actingBoard}
                    selection={selection}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Casual: a pending choice belonging to the opponent seat is theirs to
          resolve over the network, not this client's — suppress the prompt so
          the local human can't answer for the opponent (the WaitingForOpponent
          panel covers this state instead). ChoicePromptShell handles its own
          hide-to-view-the-board minimize internally now (mobile + desktop). */}
      {mayViewPendingChoice && <PendingChoicePrompt state={matchState} defs={defs} images={images} />}
      <CardDetailModal open={zoomDefinitionId !== null} onClose={() => setZoomDefinitionId(null)} definition={zoomDefinition} imageUrl={zoomImageUrl} mobileImageOnly />

      <Modal open={battleLinePromptOpen} onClose={() => setBattleLinePromptOpen(false)} title={mobileBattleLineLabel} rootClassName="op-mobile-battle-actions-modal" maxWidthClassName="max-w-md">
        <div className="op-mobile-battle-actions-content p-4">
          <p className="mb-3 border-l-4 border-gold/60 bg-black/18 py-2 pl-3 pr-2 text-sm font-semibold leading-relaxed text-white/78">
            Current legal-looking actions before passing priority.
          </p>
          {battleLineActions.length === 0 ? (
            <p className="border border-white/12 bg-black/18 px-3 py-4 text-sm font-semibold text-white/58">No obvious actions remain.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {battleLineActions.map((action) => (
                <li key={action.id} className="relative overflow-hidden border border-white/14 bg-black/18 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-[3px]">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{action.title}</p>
                    {action.count !== undefined && (
                      <span className="border border-white/12 bg-black/18 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.16em] text-white/60">
                        {action.count}
                      </span>
                    )}
                  </div>
                  <p className="px-3 py-3 text-sm text-white/72">{action.detail}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end border-t border-gold/25 pt-4">
            <Button
              variant="primary"
              disabled={!canUseLocalActions || matchState.currentPhase !== 'main' || !!matchState.currentBattle}
              onClick={handleBattleLineEndPhase}
            >
              End Phase
            </Button>
          </div>
        </div>
      </Modal>

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
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setPauseOpen(false);
              setReportBugOpen(true);
            }}
          >
            Report a Bug
          </Button>
        </div>
      </Modal>

      {matchState && (
        <ReportBugModal
          open={reportBugOpen}
          onClose={() => setReportBugOpen(false)}
          matchMode={bugReportMatchMode}
          matchId={onlineMode ? onlineRoomCode : null}
          turnNumber={matchState.turnNumber}
          phase={matchState.currentPhase}
          log={matchState.log}
          cardOptions={bugReportCardOptions}
        />
      )}
    </MatchGameShell>
    </MatchAccessoriesProvider>
  );
}

type PlayerBoardViewForMatch = ReturnType<typeof projectPlayerBoard>;
type MatchBoardZone = 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea';
/** The three zones MobileCardZone renders, matching leaderCharacterSelectable's own zone parameter. */
type MatchFieldZone = Extract<MatchBoardZone, 'leaderArea' | 'characterArea' | 'stageArea'>;

interface MobileBattleLineActionSummary {
  id: string;
  title: string;
  detail: string;
  count?: number;
}

function isMobileCardView(card: CardView | null): card is CardView {
  return card !== null;
}

function formatMobileActionCardNames(cards: CardView[]): string {
  const names = cards.slice(0, 3).map((card) => card.name);
  const rest = cards.length - names.length;
  return rest > 0 ? `${names.join(', ')} +${rest} more` : names.join(', ');
}

function buildMobileBattleLineActions({
  phase,
  turnNumber,
  battle,
  actingBoard,
  hasActivateMain,
  hasUnusedActivateMain,
  hasCounter,
}: {
  phase: GameState['currentPhase'];
  turnNumber: number;
  battle: GameState['currentBattle'];
  actingBoard: PlayerBoardViewForMatch;
  hasActivateMain: (card: CardView) => boolean;
  hasUnusedActivateMain: (card: CardView) => boolean;
  hasCounter: (card: CardView) => boolean;
}): MobileBattleLineActionSummary[] {
  if (battle?.step === 'block') {
    const blockers = actingBoard.characterArea.filter((card) => card.orientation === 'active' && card.hasBlocker);
    return blockers.length > 0
      ? [{
          id: 'blockers',
          title: 'Blockers available',
          detail: `${formatMobileActionCardNames(blockers)} ${blockers.length === 1 ? 'can' : 'can'} block this attack.`,
          count: blockers.length,
        }]
      : [];
  }

  if (battle?.step === 'counter') {
    const counters = actingBoard.hand.filter((card) => (card.category === 'character' && !!card.counter && card.counter > 0) || (card.category === 'event' && hasCounter(card)));
    return counters.length > 0
      ? [{
          id: 'counters',
          title: 'Counters available',
          detail: `${formatMobileActionCardNames(counters)} ${counters.length === 1 ? 'is' : 'are'} available for the Counter Step.`,
          count: counters.length,
        }]
      : [];
  }

  if (phase !== 'main') {
    return [{
      id: 'phase',
      title: `${phase} phase`,
      detail: `The game is resolving the ${phase} phase.`,
    }];
  }

  const summaries: MobileBattleLineActionSummary[] = [];
  const availableDon = countAvailableDon(actingBoard);
  const attackers = turnNumber > 2
    ? [actingBoard.leader, ...actingBoard.characterArea].filter(isMobileCardView).filter((card) => card.orientation === 'active' && !card.summoningSick)
    : [];
  const activatable = [actingBoard.leader, ...actingBoard.characterArea, ...actingBoard.stageArea].filter(isMobileCardView).filter(hasActivateMain);
  const unusedActivatable = [actingBoard.leader, ...actingBoard.characterArea, ...actingBoard.stageArea].filter(isMobileCardView).filter(hasUnusedActivateMain);

  if (availableDon > 0) {
    summaries.push({
      id: 'active-don',
      title: 'Unused active DON!!',
      detail: `${availableDon} active DON!! still available in your cost area.`,
      count: availableDon,
    });
  }
  if (attackers.length > 0) {
    summaries.push({
      id: 'attackers',
      title: 'Cards can still attack',
      detail: `${formatMobileActionCardNames(attackers)} ${attackers.length === 1 ? 'is' : 'are'} still active and eligible to attack.`,
      count: attackers.length,
    });
  }
  if (activatable.length > 0) {
    const namedCards = unusedActivatable.length > 0 ? unusedActivatable : activatable;
    summaries.push({
      id: 'effects',
      title: 'Activatable effects remain',
      detail: `${formatMobileActionCardNames(namedCards)} still ${namedCards.length === 1 ? 'has' : 'have'} an [Activate: Main] effect available.`,
      count: namedCards.length,
    });
  }

  return summaries;
}

interface MobileMatchLayoutProps {
  topBoard: PlayerBoardViewForMatch;
  bottomBoard: PlayerBoardViewForMatch;
  topPlayerId: string;
  bottomPlayerId: string;
  actingPlayerId: string;
  isPinnedPerspective: boolean;
  mode: MatchSelectionMode;
  selectedHandIds: Set<string>;
  battlePowerInstanceIds: Set<string>;
  onMatCardTap: (playerId: string, zone: MatchBoardZone, card: CardView) => void;
  onMatCardAttack: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  /**
   * One tap = one more DON!! from this group (a Cost Area box, or one card's
   * attached-DON!! pile), cycling back to none once the cost is covered. The
   * desktop mat draws a chip per DON!! and taps a specific instance instead;
   * mobile collapses each pile into a single control, which is why it needs
   * the group form — see useBoardSelection's tapDonGroup.
   */
  onDonGroupTap: (playerId: string, donIds: string[]) => void;
  /** Non-null while an effect is collecting DON!!, and equal to how many it wants. */
  donSelectionBudget: number | null;
  /**
   * How many of a group's DON!! are currently selected. The desktop mat shows
   * this by highlighting individual chips; a collapsed mobile pile has no chip
   * to highlight, so the count is the only feedback that a tap landed — without
   * it, tapping a Cost Area box three times looks identical to tapping it once.
   */
  selectedDonCountIn: (donIds: string[]) => number;
  /** How many of a group's DON!! this mode would accept — 0 means the pile is not a legal source right now, so its box stays a plain box. */
  eligibleDonCountIn: (donIds: string[]) => number;
  canAttackCard: (card: CardView) => boolean;
  canActivateCard: (card: CardView) => boolean;
  canOnOppAttackCard: (card: CardView) => boolean;
  canPlayHandCard: (card: CardView) => boolean;
  onPlayHandCard: (card: CardView) => void;
  canGiveDonOnCard: (board: PlayerBoardViewForMatch, card: CardView) => boolean;
  onGiveDon: (board: PlayerBoardViewForMatch, card: CardView) => void;
  onReturnGivenDon: (card: CardView) => void;
  allowReturnGivenDon: boolean;
  handSelectable: (playerId: string, card: CardView) => boolean;
  counterEventDonInfo: (card: CardView) => { cost: number; donMinus: number; available: number } | null;
  battleLineLabel: string;
  /** The acting player has no eligible action left this phase, so the battle line (which ends the phase / passes the step) is the only thing left to do. */
  battleLineAlert: boolean;
  /** Shared with the desktop mat's HandToggle — one flag hides/reveals both hands on either layout. */
  handsHidden: boolean;
  onToggleHands: () => void;
  mobilePanel: 'actions' | 'log' | 'chat' | null;
  attackArrow: MobileAttackArrowState | null;
  actionsPanel: ReactNode;
  logPanel: ReactNode;
  chatPanel: ReactNode;
  onOpenBattleActions: () => void;
  onClosePanel: () => void;
  cpuThinking?: boolean;
  cpuThinkingLabel?: string;
  opponentDeciding?: boolean;
  opponentDecidingLabel?: string;
}

interface MobileAttackArrowState {
  attackerInstanceId: string;
  targetInstanceId: string;
  committed: boolean;
}

/** Mobile hand card width (px). The dock's height follows from the 63/88 face. */
const MOBILE_HAND_CARD_W = 76;

/** Gap between the hand dock and the screen edge — mirrors DockHand's inset. */
const MOBILE_HAND_EDGE_INSET = 10;

/**
 * Card-on-card overlap in the mobile hand. Much shallower than the desktop
 * dock's 0.30: there is no hover magnification under a finger, so anything a
 * neighbour covers is simply unreadable. The strip scrolls horizontally, so
 * the cost of the shallower fan is a swipe, not lost cards.
 */
const MOBILE_HAND_OVERLAP = 0.14;

/**
 * Vertical band each hand dock occupies, published to CSS as
 * --op-mobile-hand-band so .op-mobile-board-shell can reserve it as padding
 * and the mat is never drawn underneath a hand. Derived from the same numbers
 * the dock itself uses, so the two can't drift apart.
 */
const MOBILE_HAND_BAND_PX = Math.round((MOBILE_HAND_CARD_W * 88) / 63) + MOBILE_HAND_EDGE_INSET;

/**
 * How much of a mobile hand card stays tucked behind the screen edge at rest.
 * Zero: the hands are permanently docked and fully readable — nothing is cut
 * off at the edge, which was the point of dropping the reveal tabs. (The prop
 * still exists because the desktop dock peeks at 50%.)
 */
const HAND_DOCK_PEEK = 0;

function MobileMatchLayout({
  topBoard,
  bottomBoard,
  topPlayerId,
  bottomPlayerId,
  actingPlayerId,
  isPinnedPerspective,
  mode,
  selectedHandIds,
  battlePowerInstanceIds,
  onMatCardTap,
  onMatCardAttack,
  onCardZoom,
  onDonGroupTap,
  donSelectionBudget,
  selectedDonCountIn,
  eligibleDonCountIn,
  canAttackCard,
  canActivateCard,
  canOnOppAttackCard,
  canPlayHandCard,
  onPlayHandCard,
  canGiveDonOnCard,
  onGiveDon,
  onReturnGivenDon,
  allowReturnGivenDon,
  handSelectable,
  counterEventDonInfo,
  battleLineLabel,
  battleLineAlert,
  handsHidden,
  onToggleHands,
  mobilePanel,
  attackArrow,
  actionsPanel,
  logPanel,
  chatPanel,
  onOpenBattleActions,
  onClosePanel,
  cpuThinking = false,
  cpuThinkingLabel = 'CPU',
  opponentDeciding = false,
  opponentDecidingLabel = 'Opponent',
}: MobileMatchLayoutProps) {
  const topHandIsOwn = isPinnedPerspective ? false : actingPlayerId === topPlayerId;
  const bottomHandIsOwn = isPinnedPerspective ? true : actingPlayerId === bottomPlayerId;
  const topIsOwn = isPinnedPerspective ? false : actingPlayerId === topPlayerId;
  const bottomIsOwn = isPinnedPerspective ? true : actingPlayerId === bottomPlayerId;

  return (
    <div className="op-mobile-match xl:hidden" style={{ ['--op-mobile-hand-band']: `${MOBILE_HAND_BAND_PX}px` } as CSSProperties}>
      <div className="op-mobile-match-center">
        <div className="op-mobile-board-shell">
          <MobilePlayerBoard
            board={topBoard}
            playerId={topPlayerId}
            isOwn={topIsOwn}
            isOpponent={isPinnedPerspective ? true : actingPlayerId !== topPlayerId}
            // Whose move it is, NOT whose seat this is: isOwn is perspective-
            // pinned (always false for the top board in an online match), so it
            // can't answer "which mat is the game waiting on right now".
            isActingSide={actingPlayerId === topPlayerId}
            inverted
            mode={mode}
            battlePowerInstanceIds={battlePowerInstanceIds}
            onMatCardTap={onMatCardTap}
            onMatCardAttack={onMatCardAttack}
            onCardZoom={onCardZoom}
            onDonGroupTap={onDonGroupTap}
            donSelectionBudget={donSelectionBudget}
            selectedDonCountIn={selectedDonCountIn}
            eligibleDonCountIn={eligibleDonCountIn}
            canAttackCard={canAttackCard}
            canActivateCard={canActivateCard}
            canOnOppAttackCard={canOnOppAttackCard}
            canGiveDonOnCard={canGiveDonOnCard}
            onGiveDon={onGiveDon}
            onReturnGivenDon={onReturnGivenDon}
            allowReturnGivenDon={allowReturnGivenDon}
          />

          {/* The battle line belongs to whoever's turn it is, so it carries the
              half of the acting frame that closes around it — is-acting-above
              when the mat above is acting, is-acting-below when it's the mat
              below (see .op-mobile-battle-line.is-acting-* in index.css). */}
          <button
            type="button"
            className={[
              'op-mobile-battle-line',
              actingPlayerId === topPlayerId ? 'is-acting-above' : actingPlayerId === bottomPlayerId ? 'is-acting-below' : '',
              battleLineAlert ? 'is-alert' : '',
            ].filter(Boolean).join(' ')}
            onClick={onOpenBattleActions}
            aria-label={battleLineAlert ? `Open actions for ${battleLineLabel}, no actions remaining` : `Open actions for ${battleLineLabel}`}
          >
            <span />
            <strong>{battleLineLabel}</strong>
            <span />
          </button>

          <MobilePlayerBoard
            board={bottomBoard}
            playerId={bottomPlayerId}
            isOwn={bottomIsOwn}
            isOpponent={isPinnedPerspective ? false : actingPlayerId !== bottomPlayerId}
            isActingSide={actingPlayerId === bottomPlayerId}
            inverted={false}
            mode={mode}
            battlePowerInstanceIds={battlePowerInstanceIds}
            onMatCardTap={onMatCardTap}
            onMatCardAttack={onMatCardAttack}
            onCardZoom={onCardZoom}
            onDonGroupTap={onDonGroupTap}
            donSelectionBudget={donSelectionBudget}
            selectedDonCountIn={selectedDonCountIn}
            eligibleDonCountIn={eligibleDonCountIn}
            canAttackCard={canAttackCard}
            canActivateCard={canActivateCard}
            canOnOppAttackCard={canOnOppAttackCard}
            canGiveDonOnCard={canGiveDonOnCard}
            onGiveDon={onGiveDon}
            onReturnGivenDon={onReturnGivenDon}
            allowReturnGivenDon={allowReturnGivenDon}
          />
        </div>

        {cpuThinking && <CpuThinkingOverlay opponentName={cpuThinkingLabel} />}
        {!cpuThinking && opponentDeciding && <OnlineOpponentTurnOverlay opponentName={opponentDecidingLabel} />}

        {/* The desktop mat's control, dropped in as-is: docked flush to the
            board edge, eye icon + live "Hand: N", and both instances driving
            the one shared handsHidden flag. Sits above the hand dock so it
            stays visible and tappable whether the hands are out or away. */}
        <HandToggle
          position="top"
          mobile
          handsHidden={handsHidden}
          handCount={topBoard.hand.length}
          onToggle={onToggleHands}
          onHoverChange={() => {}}
        />
        <HandToggle
          position="bottom"
          mobile
          handsHidden={handsHidden}
          handCount={bottomBoard.hand.length}
          onToggle={onToggleHands}
          onHoverChange={() => {}}
        />

        {/* Both hands stay docked in view at all times — no reveal tab, no
            auto-hide timer. Tapping a card raises it and opens its action
            bubble rather than magnifying it (see DockHand's tapActions). */}
        <DockHand
          playerId={topPlayerId}
          cards={topBoard.hand}
          isOwn={topHandIsOwn}
          allowHoverReveal={!isPinnedPerspective}
          position="top"
          selectedIds={selectedHandIds}
          selectable={(card) => handSelectable(topPlayerId, card)}
          canPlay={(card) => topHandIsOwn && canPlayHandCard(card)}
          dimmed={(card) => topHandIsOwn && mode.kind === 'selectCounterCard' && !handSelectable(topPlayerId, card)}
          cardBadge={(card) => (topHandIsOwn ? counterEventBadge(mode, counterEventDonInfo, card) : null)}
          onCardTap={(card) => onMatCardTap(topPlayerId, 'hand', card)}
          onPlayCard={onPlayHandCard}
          onCardZoom={onCardZoom}
          boardFocused={handsHidden}
          cardWidthPx={MOBILE_HAND_CARD_W}
          overlapRatio={MOBILE_HAND_OVERLAP}
          maxVisibleCards={8}
          restPeekRatio={HAND_DOCK_PEEK}
          touchReveal
          tapActions
          selectionActive={mode.kind !== 'idle'}
        />
        <DockHand
          playerId={bottomPlayerId}
          cards={bottomBoard.hand}
          isOwn={bottomHandIsOwn}
          allowHoverReveal={!isPinnedPerspective}
          position="bottom"
          selectedIds={selectedHandIds}
          selectable={(card) => handSelectable(bottomPlayerId, card)}
          canPlay={(card) => bottomHandIsOwn && canPlayHandCard(card)}
          dimmed={(card) => bottomHandIsOwn && mode.kind === 'selectCounterCard' && !handSelectable(bottomPlayerId, card)}
          cardBadge={(card) => (bottomHandIsOwn ? counterEventBadge(mode, counterEventDonInfo, card) : null)}
          onCardTap={(card) => onMatCardTap(bottomPlayerId, 'hand', card)}
          onPlayCard={onPlayHandCard}
          onCardZoom={onCardZoom}
          boardFocused={handsHidden}
          cardWidthPx={MOBILE_HAND_CARD_W}
          overlapRatio={MOBILE_HAND_OVERLAP}
          maxVisibleCards={8}
          restPeekRatio={HAND_DOCK_PEEK}
          touchReveal
          tapActions
          selectionActive={mode.kind !== 'idle'}
        />

        <AttackArrowOverlay
          attackerInstanceId={attackArrow?.attackerInstanceId ?? null}
          targetInstanceId={attackArrow?.targetInstanceId ?? null}
          committed={attackArrow?.committed ?? false}
        />
      </div>

      {mobilePanel && (
        <div className="op-mobile-panel-backdrop" role="presentation" onClick={onClosePanel}>
          <section
            className="op-mobile-panel"
            role="dialog"
            aria-modal="true"
            aria-label={mobilePanel === 'actions' ? 'Actions' : mobilePanel === 'chat' ? 'Chat' : 'Log'}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="op-mobile-panel-title">
              <strong>{mobilePanel === 'actions' ? 'Actions' : mobilePanel === 'chat' ? 'Chat' : 'Log'}</strong>
              {mobilePanel === 'actions' && <div id="mobile-action-settings-slot" className="op-mobile-action-settings-slot" />}
              <button type="button" onClick={onClosePanel} aria-label="Close panel">
                x
              </button>
            </div>
            <div className="op-mobile-panel-body">{mobilePanel === 'actions' ? actionsPanel : mobilePanel === 'chat' ? chatPanel : logPanel}</div>
          </section>
        </div>
      )}
    </div>
  );
}

function MobileActionHeader({
  onOpenActions,
  onOpenLog,
  onOpenChat,
  onOpenPause,
  actionsPending = false,
  showChat = false,
  unreadChatCount = 0,
}: {
  onOpenActions: () => void;
  onOpenLog: () => void;
  /** The Actions panel is holding a decision this client has to make. Mobile keeps that panel behind a tap, so the button itself has to say so. */
  actionsPending?: boolean;
  onOpenChat?: () => void;
  /** Opens the Paused modal (Concede / Quit / Report a Bug) — on desktop this lives as a standing button in the left aside, but that aside is `hidden` below `xl` (see the wrapping `<div className="xl:hidden">`), so mobile had NO way to reach it at all until this button was added. */
  onOpenPause: () => void;
  showChat?: boolean;
  unreadChatCount?: number;
}) {
  return (
    <div className={['op-mobile-action-header', showChat ? 'has-chat' : ''].join(' ')}>
      <button
        type="button"
        className={['op-mobile-header-icon-button', actionsPending ? 'is-pending' : ''].filter(Boolean).join(' ')}
        onClick={onOpenActions}
        aria-label={actionsPending ? 'Open actions, action required' : 'Open actions'}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10 3L5 8l5 5" />
        </svg>
        <span>Actions</span>
      </button>
      <button type="button" className="op-mobile-header-icon-button" onClick={onOpenLog} aria-label="Open log">
        <span>Battle Logs</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 3l5 5-5 5" />
        </svg>
      </button>
      {showChat && (
        <button
          type="button"
          className="op-mobile-header-icon-button op-mobile-chat-button"
          onClick={onOpenChat}
          aria-label={unreadChatCount > 0 ? `Open chat, ${unreadChatCount} unread` : 'Open chat'}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v4A1.5 1.5 0 0 1 11.5 10H7l-2.5 2.5V10h-1A1.5 1.5 0 0 1 3 8.5v-4z" />
          </svg>
          {unreadChatCount > 0 && (
            <span className="op-mobile-chat-badge">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>
          )}
        </button>
      )}
      <button type="button" className="op-mobile-header-icon-button op-mobile-menu-button" onClick={onOpenPause} aria-label="Open menu">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
      </button>
    </div>
  );
}

function MobileBattleLogNotifications({
  entries,
  playerNames,
  viewerPlayerId,
}: {
  entries: GameLogEntry[];
  playerNames: Record<string, string>;
  viewerPlayerId: string;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="op-mobile-log-toast-stack" aria-live="polite" aria-atomic="false">
      {entries.map((entry) => {
        const actorName = entry.actorPlayerId ? (playerNames[entry.actorPlayerId] ?? entry.actorPlayerId) : 'System';
        const own = entry.actorPlayerId === viewerPlayerId;
        const sourceCardLabel = logSourceCardLabel(entry);
        const effectText = logEffectText(entry);
        return (
          <article key={entry.id} className={['op-mobile-log-toast', own ? 'is-own' : ''].join(' ')}>
            <div className="op-mobile-log-toast-meta">
              <span>#{entry.sequence}</span>
              <span>{entry.type}</span>
              <span>{actorName}</span>
            </div>
            <p>{entry.message}</p>
            {effectText && (
              <div className="op-mobile-log-toast-effect">
                {sourceCardLabel && <strong>{sourceCardLabel}</strong>}
                <span>{effectText}</span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function MobilePlayerBoard({
  board,
  playerId,
  isOwn,
  isOpponent,
  isActingSide,
  inverted,
  mode,
  battlePowerInstanceIds,
  onMatCardTap,
  onMatCardAttack,
  onCardZoom,
  onDonGroupTap,
  donSelectionBudget,
  selectedDonCountIn,
  eligibleDonCountIn,
  canAttackCard,
  canActivateCard,
  canOnOppAttackCard,
  canGiveDonOnCard,
  onGiveDon,
  onReturnGivenDon,
  allowReturnGivenDon,
}: {
  board: PlayerBoardViewForMatch;
  playerId: string;
  isOwn: boolean;
  isOpponent: boolean;
  /** This mat belongs to the player the game is currently waiting on — outlined so you can tell at a glance whose move it is. */
  isActingSide: boolean;
  inverted: boolean;
  mode: MatchSelectionMode;
  battlePowerInstanceIds: Set<string>;
  onMatCardTap: (playerId: string, zone: MatchBoardZone, card: CardView) => void;
  onMatCardAttack: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  onDonGroupTap: (playerId: string, donIds: string[]) => void;
  donSelectionBudget: number | null;
  selectedDonCountIn: (donIds: string[]) => number;
  /** How many of a group's DON!! this mode would accept — 0 means the pile is not a legal source right now, so its box stays a plain box. */
  eligibleDonCountIn: (donIds: string[]) => number;
  canAttackCard: (card: CardView) => boolean;
  canActivateCard: (card: CardView) => boolean;
  canOnOppAttackCard: (card: CardView) => boolean;
  canGiveDonOnCard: (board: PlayerBoardViewForMatch, card: CardView) => boolean;
  onGiveDon: (board: PlayerBoardViewForMatch, card: CardView) => void;
  onReturnGivenDon: (card: CardView) => void;
  allowReturnGivenDon: boolean;
}) {
  const [trashGalleryOpen, setTrashGalleryOpen] = useState(false);
  const stage = board.stageArea[0] ?? null;
  const activeDon = mobileCostAreaCards(board, false);
  const restedDon = mobileCostAreaCards(board, true);
  // The whole pile is handed to tapDonGroup, which takes ONE more DON!! from it
  // per tap. Previously each box resolved a single fixed instance (the first
  // candidate) and tapped that same instance forever, so a second tap just
  // deselected the first — a 2+ DON!! cost could not be paid from the Cost Area
  // on a phone at all.
  const activeDonIds = activeDon.map((don) => don.instanceId);
  const restedDonIds = restedDon.map((don) => don.instanceId);
  const donSelectable = isOwn && donSelectionBudget !== null;

  return (
    <>
      <section className={['op-mobile-player-board', inverted ? 'is-inverted' : '', isActingSide ? 'is-acting' : ''].filter(Boolean).join(' ')}>
        <MobileCharacterZone
          cards={board.characterArea}
          board={board}
          playerId={playerId}
          isOwn={isOwn}
          isOpponent={isOpponent}
          mode={mode}
          battlePowerInstanceIds={battlePowerInstanceIds}
          onMatCardTap={onMatCardTap}
          onMatCardAttack={onMatCardAttack}
          onCardZoom={onCardZoom}
          onDonGroupTap={onDonGroupTap}
          donSelectionBudget={donSelectionBudget}
          selectedDonCountIn={selectedDonCountIn}
          eligibleDonCountIn={eligibleDonCountIn}
          canAttackCard={canAttackCard}
          canActivateCard={canActivateCard}
          canOnOppAttackCard={canOnOppAttackCard}
          canGiveDonOnCard={canGiveDonOnCard}
          onGiveDon={onGiveDon}
          onReturnGivenDon={onReturnGivenDon}
          allowReturnGivenDon={allowReturnGivenDon}
        />

        <div className="op-mobile-support-grid">
          <MobileLifeStack count={board.lifeAreaCount} />
          <MobileCardZone
            label="Leader"
            card={board.leader}
            zone="leaderArea"
            board={board}
            playerId={playerId}
            isOwn={isOwn}
            isOpponent={isOpponent}
            mode={mode}
            battlePowerInstanceIds={battlePowerInstanceIds}
            onMatCardTap={onMatCardTap}
            onMatCardAttack={onMatCardAttack}
            onCardZoom={onCardZoom}
            onDonGroupTap={onDonGroupTap}
            donSelectionBudget={donSelectionBudget}
            selectedDonCountIn={selectedDonCountIn}
            eligibleDonCountIn={eligibleDonCountIn}
            canAttackCard={canAttackCard}
            canActivateCard={canActivateCard}
            canOnOppAttackCard={canOnOppAttackCard}
            canGiveDonOnCard={canGiveDonOnCard}
            onGiveDon={onGiveDon}
            onReturnGivenDon={onReturnGivenDon}
            allowReturnGivenDon={allowReturnGivenDon}
          />
          <MobileCardZone
            label="Stage"
            card={stage}
            zone="stageArea"
            board={board}
            playerId={playerId}
            isOwn={isOwn}
            isOpponent={isOpponent}
            mode={mode}
            battlePowerInstanceIds={battlePowerInstanceIds}
            onMatCardTap={onMatCardTap}
            onMatCardAttack={onMatCardAttack}
            onCardZoom={onCardZoom}
            onDonGroupTap={onDonGroupTap}
            donSelectionBudget={donSelectionBudget}
            selectedDonCountIn={selectedDonCountIn}
            eligibleDonCountIn={eligibleDonCountIn}
            canAttackCard={canAttackCard}
            canActivateCard={canActivateCard}
            canOnOppAttackCard={canOnOppAttackCard}
            canGiveDonOnCard={canGiveDonOnCard}
            onGiveDon={onGiveDon}
            onReturnGivenDon={onReturnGivenDon}
            allowReturnGivenDon={allowReturnGivenDon}
          />
          <MobileDeckBox count={board.deckCount} />
          <MobileCountBox
            label="Active DON!!"
            count={activeDon.length}
            className="op-mobile-active-don-zone"
            selectedCount={selectedDonCountIn(activeDonIds)}
            onClick={donSelectable && eligibleDonCountIn(activeDonIds) > 0 ? () => onDonGroupTap(playerId, activeDonIds) : undefined}
          />
          <MobileCountBox
            label="Rested DON!!"
            count={restedDon.length}
            className="op-mobile-rested-don-zone"
            selectedCount={selectedDonCountIn(restedDonIds)}
            onClick={donSelectable && eligibleDonCountIn(restedDonIds) > 0 ? () => onDonGroupTap(playerId, restedDonIds) : undefined}
          />
          <MobileTrashPile cards={board.trash} playerId={playerId} onClick={() => setTrashGalleryOpen(true)} />
        </div>
      </section>
      <TrashGalleryModal
        open={trashGalleryOpen}
        onClose={() => setTrashGalleryOpen(false)}
        playerId={playerId}
        cards={board.trash}
        onCardZoom={onCardZoom}
      />
    </>
  );
}

function MobileCharacterZone({
  cards,
  board,
  playerId,
  isOwn,
  isOpponent,
  mode,
  battlePowerInstanceIds,
  onMatCardTap,
  onMatCardAttack,
  onCardZoom,
  onDonGroupTap,
  donSelectionBudget,
  selectedDonCountIn,
  eligibleDonCountIn,
  canAttackCard,
  canActivateCard,
  canOnOppAttackCard,
  canGiveDonOnCard,
  onGiveDon,
  onReturnGivenDon,
  allowReturnGivenDon,
}: {
  cards: CardView[];
  board: PlayerBoardViewForMatch;
  playerId: string;
  isOwn: boolean;
  isOpponent: boolean;
  mode: MatchSelectionMode;
  battlePowerInstanceIds: Set<string>;
  onMatCardTap: (playerId: string, zone: MatchBoardZone, card: CardView) => void;
  onMatCardAttack: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  onDonGroupTap: (playerId: string, donIds: string[]) => void;
  donSelectionBudget: number | null;
  selectedDonCountIn: (donIds: string[]) => number;
  /** How many of a group's DON!! this mode would accept — 0 means the pile is not a legal source right now, so its box stays a plain box. */
  eligibleDonCountIn: (donIds: string[]) => number;
  canAttackCard: (card: CardView) => boolean;
  canActivateCard: (card: CardView) => boolean;
  canOnOppAttackCard: (card: CardView) => boolean;
  canGiveDonOnCard: (board: PlayerBoardViewForMatch, card: CardView) => boolean;
  onGiveDon: (board: PlayerBoardViewForMatch, card: CardView) => void;
  onReturnGivenDon: (card: CardView) => void;
  allowReturnGivenDon: boolean;
}) {
  return (
    <section className="op-mobile-character-zone" data-board-zone="characterArea" data-board-player={playerId}>
      <span className="op-mobile-zone-label">Character Area</span>
      <div className="op-mobile-character-cards">
        {cards.map((card) => (
          <MobileCardZone
            key={card.instanceId}
            label="Character"
            card={card}
            zone="characterArea"
            board={board}
            playerId={playerId}
            isOwn={isOwn}
            isOpponent={isOpponent}
            mode={mode}
            battlePowerInstanceIds={battlePowerInstanceIds}
            onMatCardTap={onMatCardTap}
            onMatCardAttack={onMatCardAttack}
            onCardZoom={onCardZoom}
            onDonGroupTap={onDonGroupTap}
            donSelectionBudget={donSelectionBudget}
            selectedDonCountIn={selectedDonCountIn}
            eligibleDonCountIn={eligibleDonCountIn}
            canAttackCard={canAttackCard}
            canActivateCard={canActivateCard}
            canOnOppAttackCard={canOnOppAttackCard}
            canGiveDonOnCard={canGiveDonOnCard}
            onGiveDon={onGiveDon}
            onReturnGivenDon={onReturnGivenDon}
            allowReturnGivenDon={allowReturnGivenDon}
          />
        ))}
      </div>
    </section>
  );
}

function MobileCardZone({
  label,
  card,
  zone,
  board,
  playerId,
  isOwn,
  isOpponent,
  mode,
  battlePowerInstanceIds,
  onMatCardTap,
  onMatCardAttack,
  onCardZoom,
  onDonGroupTap,
  donSelectionBudget,
  selectedDonCountIn,
  eligibleDonCountIn,
  canAttackCard,
  canActivateCard,
  canOnOppAttackCard,
  canGiveDonOnCard,
  onGiveDon,
  onReturnGivenDon,
  allowReturnGivenDon,
}: {
  label: string;
  card: CardView | null;
  zone: MatchFieldZone;
  board: PlayerBoardViewForMatch;
  playerId: string;
  isOwn: boolean;
  isOpponent: boolean;
  mode: MatchSelectionMode;
  battlePowerInstanceIds: Set<string>;
  onMatCardTap: (playerId: string, zone: MatchBoardZone, card: CardView) => void;
  onMatCardAttack: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  onDonGroupTap: (playerId: string, donIds: string[]) => void;
  donSelectionBudget: number | null;
  selectedDonCountIn: (donIds: string[]) => number;
  /** How many of a group's DON!! this mode would accept — 0 means the pile is not a legal source right now, so its box stays a plain box. */
  eligibleDonCountIn: (donIds: string[]) => number;
  canAttackCard: (card: CardView) => boolean;
  canActivateCard: (card: CardView) => boolean;
  canOnOppAttackCard: (card: CardView) => boolean;
  canGiveDonOnCard: (board: PlayerBoardViewForMatch, card: CardView) => boolean;
  onGiveDon: (board: PlayerBoardViewForMatch, card: CardView) => void;
  onReturnGivenDon: (card: CardView) => void;
  allowReturnGivenDon: boolean;
}) {
  const [actionBubbleOpen, setActionBubbleOpen] = useState(false);

  useEffect(() => {
    setActionBubbleOpen(false);
  }, [mode.kind, card?.instanceId]);

  if (!card) {
    return <div className="op-mobile-zone op-mobile-card-zone op-mobile-empty-zone" aria-label={label} />;
  }

  const canActivate = isOwn && canActivateCard(card);
  const canOnOppAttack = isOwn && canOnOppAttackCard(card);
  const canAttack = isOwn && canAttackCard(card);
  // eligibleDonCountIn, not just donAttachedCount: during a DON!! choice only
  // the choice's own candidates can be paid with, so a card whose attached
  // DON!! are all outside them shows an inert badge instead of a live one.
  const attachedDonSelectable = isOwn && donSelectionBudget !== null && eligibleDonCountIn(card.donAttachedIds) > 0;
  // From the hook rather than a local re-listing of the DON!!-collecting modes:
  // that kind of local copy is exactly what left on-field effect targeting
  // broken on mobile (see leaderCharacterSelectable).
  const selectedAttachedDonCount = selectedDonCountIn(card.donAttachedIds);
  // Shared with the desktop mat (PlayerBoardPanel) rather than reimplemented —
  // see leaderCharacterSelectable's doc comment for the mode this copy missed.
  const selectable = leaderCharacterSelectable(mode, isOwn, isOpponent, zone, card, canActivate, canOnOppAttack);
  const attackerSelected = mode.kind === 'selectAttackTarget' && mode.attackerInstanceId === card.instanceId;
  const canGiveDon = isOwn && canGiveDonOnCard(board, card);
  const canReturnGivenDon = isOwn && allowReturnGivenDon && card.donAttachedCount > 0;
  const activeDonCount = mobileCostAreaCards(board, false).length;

  const closeAfter = (action: () => void): void => {
    setActionBubbleOpen(false);
    action();
  };

  return (
    <div
      className={[
        'op-mobile-zone op-mobile-card-zone',
        zone === 'characterArea' ? 'op-mobile-character-card-zone' : '',
        card.orientation === 'rested' ? 'is-rested' : 'is-active',
      ].filter(Boolean).join(' ')}
      data-card-instance-id={card.instanceId}
      onClick={(event) => {
        if (mode.kind !== 'idle') return;
        event.stopPropagation();
        setActionBubbleOpen((open) => !open);
      }}
    >
      <BoardCardTile
        card={card}
        size="field"
        selectable={mode.kind !== 'idle' && selectable}
        // Field-choice picks get the same selected ring the desktop mat draws,
        // so a multi-card selection is readable on mobile too.
        selected={attackerSelected || fieldChoiceSelected(mode, card)}
        // "Dim, don't hide" the cards a field choice can't target, so the
        // eligible one stands out on the mat — same call the desktop mat makes.
        dimmed={fieldChoiceDimmed(mode, card)}
        activatable={mode.kind === 'idle' && canActivate}
        attackable={mode.kind === 'idle' && canAttack}
        showBattlePower={battlePowerInstanceIds.has(card.instanceId)}
        attachedDonSelectable={attachedDonSelectable}
        attachedDonSelectedCount={selectedAttachedDonCount}
        compactBadges
        onSelect={() => onMatCardTap(playerId, zone, card)}
        onAttachedDonSelect={attachedDonSelectable ? () => onDonGroupTap(playerId, card.donAttachedIds) : undefined}
      />
      {actionBubbleOpen && (
        <div className="op-mobile-card-action-bubble" onClick={(event) => event.stopPropagation()}>
          {canAttack && (
            <button type="button" onClick={() => closeAfter(() => onMatCardAttack(card))}>
              Attack
            </button>
          )}
          {canActivate && (
            <button type="button" onClick={() => closeAfter(() => onMatCardTap(playerId, zone, card))}>
              Activate
            </button>
          )}
          {canGiveDon && activeDonCount > 0 && (
            <button type="button" onClick={() => closeAfter(() => onGiveDon(board, card))}>
              Give DON!!
            </button>
          )}
          {canReturnGivenDon && (
            <button type="button" onClick={() => closeAfter(() => onReturnGivenDon(card))}>
              Return DON!!
            </button>
          )}
          {attachedDonSelectable && (
            <button type="button" onClick={() => closeAfter(() => onDonGroupTap(playerId, card.donAttachedIds))}>
              Select DON!!
            </button>
          )}
          <button type="button" onClick={() => closeAfter(() => onCardZoom(card))}>
            View
          </button>
        </div>
      )}
    </div>
  );
}


// The fan offset used to be an inline `left: index * 10%`, which only worked
// while the zone was a fixed 2-column-wide box: a percentage offset needs a
// width to resolve against, so the zone could never size itself to its own
// contents. The backs are now in normal flow and the overlap lives in CSS
// (.op-mobile-life-stack span + span), letting the zone shrink-wrap the fan.
function MobileLifeStack({ count }: { count: number }) {
  const visible = Math.min(count, 5);
  return (
    <div className="op-mobile-life-stack" aria-label={`Life stack ${count}`}>
      {Array.from({ length: visible }).map((_, index) => (
        <span key={index}>
          <CardBackArt tone="navy" className="h-full w-full rounded-[0.2rem]" />
        </span>
      ))}
      <em>{count}</em>
    </div>
  );
}

function MobileDeckBox({ count }: { count: number }) {
  return (
    <div className="op-mobile-deck-zone" aria-label={`Deck ${count}`}>
      <CardBackArt tone="navy" className="op-mobile-deck-back" />
      <span>{count}</span>
    </div>
  );
}

function MobileTrashPile({ cards, playerId, onClick }: { cards: CardView[]; playerId: string; onClick: () => void }) {
  const topCard = cards[0] ?? null;
  return (
    <button
      type="button"
      className={['op-mobile-trash-zone op-mobile-trash-pile', topCard ? 'has-card' : 'is-empty'].join(' ')}
      onClick={onClick}
      disabled={!topCard}
      data-board-zone="trash"
      data-board-player={playerId}
      aria-label={topCard ? `Trash, ${cards.length} cards, top card ${topCard.name} - open gallery` : 'Trash, empty'}
    >
      {topCard ? (
        <>
          <CardImage src={topCard.imageUrl} alt={topCard.name} className="h-full w-full" />
          <span className="op-mobile-trash-count">{cards.length}</span>
        </>
      ) : null}
    </button>
  );
}

function MobileCountBox({
  label,
  count,
  className,
  selectedCount = 0,
  onClick,
}: {
  label: string;
  count: number;
  className?: string;
  /** How many DON!! in this pile are currently selected — the pile's only tap feedback, since it draws no per-DON!! chip. */
  selectedCount?: number;
  onClick?: () => void;
}) {
  const showLabel = label.includes('DON');
  const isDon = label.includes('DON');
  const contents = (
    <>
      {isDon && (
        <span className="op-mobile-don-count-art" aria-hidden="true">
          <img src="/ui/don-token.png" alt="" draggable={false} />
        </span>
      )}
      <span className="op-mobile-count-content">
        {showLabel && <strong>{label}</strong>}
        <span>{count}</span>
      </span>
      {selectedCount > 0 && <span className="op-mobile-count-selected">{selectedCount}</span>}
    </>
  );

  const classes = [
    'op-mobile-count-zone',
    isDon ? 'op-mobile-don-count-zone' : '',
    selectedCount > 0 ? 'is-don-selected' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        aria-label={selectedCount > 0 ? `${label} ${count}, ${selectedCount} selected` : `${label} ${count}`}
      >
        {contents}
      </button>
    );
  }

  return <div className={classes}>{contents}</div>;
}

function mobileAttachedDonIds(board: PlayerBoardViewForMatch): Set<string> {
  const ids = new Set<string>();
  if (board.leader) {
    for (const id of board.leader.donAttachedIds) ids.add(id);
  }
  for (const card of board.characterArea) {
    for (const id of card.donAttachedIds) ids.add(id);
  }
  return ids;
}

function mobileCostAreaCards(board: PlayerBoardViewForMatch, rested: boolean): CardView[] {
  const attached = mobileAttachedDonIds(board);
  return board.costArea.filter((card) => card.donRested === rested && !attached.has(card.instanceId));
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

function OnlineSyncLoading({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <CpuSpinner size="lg" />
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gold">Online Match</p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-[0.12em] text-white">Syncing Board</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
          Waiting for both players to receive their redacted server state. Your board will stay locked to your seat at the bottom.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onCancel}>
        Leave Room
      </Button>
    </div>
  );
}

function formatGameOverReason(reason: string): string {
  const labels: Record<string, string> = {
    lifeDamageAtZero: 'Life damage',
    deckedOut: 'Deck out',
    concession: 'Concession',
    cardEffect: 'Card effect',
    draw: 'Draw',
    timeout: 'Timed out',
  };
  return labels[reason] ?? reason;
}

function CpuSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  return (
    <span
      className={`op-cpu-spinner inline-block rounded-full border-2 border-cyan-200/25 border-t-cyan-300 ${dim}`}
      role="status"
      aria-label="CPU is thinking"
    />
  );
}

function CpuThinking({ opponentName }: { opponentName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-white/10 bg-black/24 px-4 py-8 text-center">
      <CpuSpinner />
      <p className="text-sm font-black uppercase tracking-[0.16em] text-white/80">{opponentName} is thinking…</p>
      <p className="max-w-[16rem] text-[11px] leading-relaxed text-white/45">
        The CPU opponent is evaluating legal moves through the same rules engine as a human player.
      </p>
    </div>
  );
}

function CpuThinkingOverlay({ opponentName }: { opponentName: string }) {
  return (
    <div
      className="absolute inset-0 z-[105] flex items-center justify-center bg-[rgba(2,8,22,0.42)] backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(8,24,58,0.92),_rgba(3,9,24,0.96))] px-6 py-5 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
        <CpuSpinner size="lg" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/90">{opponentName} is thinking…</p>
      </div>
    </div>
  );
}

/**
 * Online (casual queue + ranked) loader popup: a full-board overlay telling
 * the local player the opponent is currently deciding who goes first (the
 * pre-game coin-flip choice, setupState.stage === 'awaitingGoingFirstChoice'
 * — see the `opponentDeciding` computation in MatchScreen for the exact
 * gate). Deliberately narrow: this used to fire for the opponent's entire
 * turn/Block/Counter window too, which meant it sat over the board the
 * whole time the opponent was just playing normally — redundant with the
 * live per-seat state stream and mostly just blocked the view. Ordinary
 * "not my turn" states are covered by WaitingForOpponent in the side Actions
 * panel instead; this overlay is reserved for the one genuinely blocking,
 * un-observable moment (their coin-flip decision has no board state to
 * watch happen). Gold spinner (vs. CPU's cyan) keeps this and
 * CpuThinkingOverlay visually distinct at a glance.
 */
function OnlineOpponentTurnOverlay({ opponentName }: { opponentName: string }) {
  return (
    <div
      className="absolute inset-0 z-[105] flex items-center justify-center bg-[rgba(2,8,22,0.42)] backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 border border-gold/25 bg-[linear-gradient(180deg,_rgba(8,24,58,0.92),_rgba(3,9,24,0.96))] px-6 py-5 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
        <span className="inline-flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-gold/80"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </span>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-gold/90">{opponentName} is deciding…</p>
      </div>
    </div>
  );
}

/**
 * Compact hand show/hide toggle docked at the top (opponent) or bottom
 * (player) center edge of the board. Small square-ish control: an eye icon
 * plus the live hand count ("Hand: N"); the Show/Hide label is surfaced only
 * as a hover tooltip over the icon, not as a permanent inline label. Both
 * instances drive the same shared `handsHidden` state, so toggling either
 * hides/reveals both hands.
 */
function HandToggle({
  position,
  handsHidden,
  handCount,
  onToggle,
  onHoverChange,
  mobile = false,
}: {
  position: 'top' | 'bottom';
  handsHidden: boolean;
  handCount: number;
  onToggle: () => void;
  onHoverChange: (hovered: boolean) => void;
  /**
   * Mobile variant: the identical control, docked to the same board edge with
   * the same chrome — the only differences are the breakpoint it shows at
   * (the desktop instance is `hidden xl:block`) and a z-index that clears the
   * mobile hand dock (z-100) while staying under the mobile panels (z-140).
   */
  mobile?: boolean;
}) {
  const isTop = position === 'top';
  const tooltip = handsHidden ? 'Show hands' : 'Hide hands';
  return (
    <div
      className={[
        'absolute left-1/2 -translate-x-1/2',
        mobile ? 'z-[110] xl:hidden' : 'z-[180] hidden xl:block',
        isTop ? 'top-0' : 'bottom-0',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        className={[
          'group relative flex items-center gap-1.5 border border-white/15 bg-black/72 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80 shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-gold/60 hover:text-gold',
          // Flush with the board edge, so the edge-facing side is squared off.
          isTop ? 'rounded-b-lg border-t-0' : 'rounded-t-lg border-b-0',
        ].join(' ')}
        aria-pressed={!handsHidden}
        aria-label={tooltip}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          {handsHidden ? (
            <>
              <path d="M3 3l18 18" strokeLinecap="round" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" />
              <path d="M9.2 5.4A9.6 9.6 0 0 1 12 5c5 0 8.5 4.4 9.5 7a10.5 10.5 0 0 1-2.1 3.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.4 6.8A10.8 10.8 0 0 0 2.5 12c1 2.6 4.5 7 9.5 7a9.9 9.9 0 0 0 4.1-.9" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <path d="M2.5 12c1-2.6 4.5-7 9.5-7s8.5 4.4 9.5 7c-1 2.6-4.5 7-9.5 7s-8.5-4.4-9.5-7Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
        <span>Hand: {handCount}</span>
        <span
          role="tooltip"
          className={[
            'pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100',
            isTop ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          ].join(' ')}
        >
          {tooltip}
        </span>
      </button>
    </div>
  );
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

/**
 * Non-blocking prompt banner shown over the field while a
 * 'resolvingFieldChoice' selection mode is active (see useBoardSelection.ts)
 * — tells the player WHAT they're choosing and WHY. Pinned near the top
 * (not centered like TurnAndPhaseBanner) so it never covers the mat cards it's
 * describing; pointer-events-none throughout so it can never block a tap on
 * the dimmed/eligible cards underneath. `viewerLabel`, when set, means this
 * client is the non-deciding online opponent looking in — same underlying
 * banner, just with an attributed prefix instead of a bare instruction (see
 * MatchScreen's call site for the exact condition).
 */
function FieldChoiceBanner({
  info,
  viewerLabel,
}: {
  info: { prompt: string; attribution: string | null };
  viewerLabel: string | null;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[108] flex justify-center px-4" aria-live="polite">
      <div className="pointer-events-none max-w-[92vw] border border-gold/35 bg-black/60 px-4 py-2.5 text-center shadow-[0_18px_42px_rgba(0,0,0,0.4)] backdrop-blur-md sm:max-w-2xl">
        {viewerLabel && <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-gold/85">{viewerLabel}</p>}
        <p className="text-xs font-bold leading-snug text-white sm:text-sm">
          {info.prompt}
          {info.attribution && <span className="font-normal text-white/60"> ({info.attribution})</span>}
        </p>
      </div>
    </div>
  );
}

/**
 * Plays back phaseAnnounceStore's queue one step at a time — [Turn N begins
 * ->] "Refresh Phase" -> "Draw Phase" -> "DON!! Phase" -> "Main Phase" — as
 * ONE strict sequence: each step's banner appears, its own card flights (if
 * any) play, the banner is dismissed, then the next one appears. This used
 * to be two independent components (TurnChangeBanner reacting to prop
 * diffs, this one draining a separate queue) with nothing keeping them from
 * showing at once; now both banner "looks" are just two renders of the same
 * queue-driven component, so there is only ever ONE thing on screen at a
 * time, in order. Advancing from one queued step to the next (including
 * releasing a phase step's own card flights) is owned entirely by
 * phaseAnnounceStore's own timer, not by this component — this only handles
 * the fade in/out for whichever step is currently at the front (see
 * phaseAnnounceStore.ts doc comment for why that split matters). Not gated
 * by animationsEnabled — see phaseAnnounceStore.ts doc comment.
 */
function TurnAndPhaseBanner({ nameFor, gameOver }: { nameFor: (id: string) => string; gameOver: boolean }) {
  const current = usePhaseAnnounceStore((s) => s.queue[0] ?? null);
  const clearQueue = usePhaseAnnounceStore((s) => s.clear);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (gameOver) clearQueue();
  }, [gameOver, clearQueue]);

  useEffect(() => {
    if (!current || gameOver) {
      setVisible(false);
      return;
    }
    setVisible(false);
    const showFrame = window.requestAnimationFrame(() => setVisible(true));
    // Fade out a little before the step's actual dwell ends, so it's fully gone (not
    // mid-transition) by the time the next step's flights/banner are released.
    const hideTimer = window.setTimeout(() => setVisible(false), Math.max(0, current.durationMs - 200));

    return () => {
      window.cancelAnimationFrame(showFrame);
      window.clearTimeout(hideTimer);
    };
  }, [current?.id, gameOver]);

  if (!current || gameOver) return null;

  // Resolved here (not inline below) so the current.kind narrowing actually happens where the
  // union is discriminated — reading current.turnNumber/current.label back out through a
  // boolean flag elsewhere wouldn't type-check, since TS can't correlate an arbitrary boolean
  // with which arm of the union it came from.
  const content =
    current.kind === 'turnChange'
      ? {
          isTurnChange: true as const,
          kicker: `Turn ${current.turnNumber}`,
          headline: `${nameFor(current.playerId).toUpperCase()} Turn`,
          footer: 'Begin',
          detail: null as string | null,
        }
      : {
          isTurnChange: false as const,
          kicker: nameFor(current.playerId),
          headline: current.label,
          footer: null as string | null,
          detail: current.detail,
        };

  return (
    <div className="pointer-events-none fixed inset-0 z-[108] flex items-center justify-center px-5" aria-live="polite">
      <div
        key={current.id}
        className={[
          'relative overflow-hidden text-center transition-all duration-300 ease-out',
          content.isTurnChange ? 'min-w-[min(34rem,88vw)] px-7 py-5' : 'min-w-[min(30rem,88vw)] px-7 py-5',
          visible ? 'translate-x-0 scale-100 opacity-100' : '-translate-x-16 scale-105 opacity-0',
        ].join(' ')}
      >
        <div className="absolute inset-0 skew-x-[-12deg] border-y-2 border-gold/60 bg-[linear-gradient(90deg,_transparent_0%,_rgba(255,211,74,0.13)_16%,_rgba(14,28,62,0.34)_48%,_rgba(185,29,34,0.18)_74%,_transparent_100%)] shadow-[0_0_42px_rgba(255,211,74,0.22)] backdrop-blur-[2px]" />
        <div className="absolute inset-x-[-18%] top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,_transparent,_rgba(255,255,255,0.75),_transparent)]" />
        {content.isTurnChange && (
          <>
            <div className="absolute left-[-8%] top-1/2 h-10 w-24 -translate-y-1/2 skew-x-[-18deg] bg-gold/25 blur-sm" />
            <div className="absolute right-[-10%] top-1/2 h-12 w-28 -translate-y-1/2 skew-x-[-18deg] bg-brand/25 blur-sm" />
          </>
        )}
        <div className="relative">
          <p
            className={[
              'font-black uppercase drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]',
              content.isTurnChange ? 'mb-1 text-[10px] tracking-[0.34em] text-gold' : 'mb-1 text-[10px] tracking-[0.3em] text-gold',
            ].join(' ')}
          >
            {content.kicker}
          </p>
          <p
            className={[
              'font-display font-black uppercase leading-none tracking-[0.05em] text-white',
              content.isTurnChange ? 'text-[clamp(2rem,7vw,4.75rem)] drop-shadow-[0_6px_0_rgba(0,0,0,0.62)]' : 'text-[clamp(1.8rem,6vw,3.5rem)] drop-shadow-[0_5px_0_rgba(0,0,0,0.6)]',
            ].join(' ')}
          >
            {content.headline}
          </p>
          {content.footer && <p className="mt-2 text-xs font-black uppercase tracking-[0.3em] text-white/72">{content.footer}</p>}
          {content.detail && <p className="mt-2 text-[11px] font-black uppercase tracking-[0.25em] text-white/72">{content.detail}</p>}
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
      background.addColorStop(0.48, '#13329a');
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
  const hexDriftDelay = useHexDriftDelay();
  void headerRight;
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#13329a] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('/ui/bg.png')] bg-cover bg-center op-bg-tint opacity-70" />
      {/* Animated honeycomb as its own layer rather than `op-hex-bg` on <main>:
          as an element background it painted UNDERNEATH the photo wash above,
          which muddied it. Sits above the photo, below the z-10 board. */}
      <div aria-hidden="true" style={hexDriftDelay} className="op-hex-bg pointer-events-none absolute inset-0" />
      {/* Layer 5 (animation/visual polish) — decorative starfield warp, below
          the actual board content (z-10 section). Reads/writes nothing in
          GameState. */}
      <GlitterWrap />
      <h1 className="sr-only">{title}</h1>
      <section className="absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden p-0 xl:p-2">{children}</section>
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
  const glowFilterId = `${pathId}-glow`;

  return (
    <svg ref={overlayRef} className="pointer-events-none absolute inset-0 z-40 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        {/* Plain feGaussianBlur only — deliberately NOT feDropShadow with
            floodColor. WebKit/Safari (the mobile-first target platform) has
            a long-standing bug where chained feDropShadow primitives ignore
            flood-color and paint solid black instead of the intended
            yellow/red tint, which is exactly the "arrow is just black"
            regression reported here. Blurring an already-colored copy of
            the shape sidesteps flood-color entirely, so the glow keeps its
            hue on every renderer. */}
        <filter id={glowFilterId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>
      {arrowPath && (
        <>
          <path id={pathId} d={arrowPath} fill="none" stroke="none" />
          {arrowHeads.map((index) => (
            <g key={index} opacity="0">
              {/* Drop shadow: flat dark silhouette, offset — no filter, so
                  there is nothing here that can turn the actual arrow color
                  black. */}
              <polygon points="24,0 -18,-14 -8,0 -18,14" fill="#000000" opacity={headShadowOpacity} transform="translate(2 4)" />
              {/* Glow: blurred copy already filled with the target hue. */}
              <polygon points="24,0 -18,-14 -8,0 -18,14" fill={glow} opacity="0.85" filter={`url(#${glowFilterId})`} />
              {/* Crisp arrowhead on top, unfiltered — this is what guarantees
                  the yellow (uncommitted target) / red (committed attack)
                  color always renders correctly. */}
              <polygon points="24,0 -18,-14 -8,0 -18,14" fill={stroke} />
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

function handSelectable(mode: MatchSelectionMode, isOwn: boolean, card: CardView, isCounterCardApplicable: (card: CardView) => boolean): boolean {
  if (!isOwn) return false;
  if (mode.kind === 'idle') {
    return card.category === 'character' || card.category === 'stage' || card.category === 'event';
  }
  if (mode.kind === 'selectCounterCard') {
    return isCounterCardApplicable(card);
  }
  return false;
}

function selectedHandIds(mode: MatchSelectionMode): Set<string> {
  if (mode.kind === 'confirmPlayCost') return new Set([mode.handCardInstanceId]);
  if (mode.kind === 'payingEventMainCost') return new Set([mode.handCardInstanceId]);
  if (mode.kind === 'payingCounterEventCost') return new Set([mode.handCardInstanceId]);
  return new Set();
}

/**
 * Counter Step DON!! warning badge (7-1-3-2): shown on Counter Event hand
 * cards only, reading "{cost}/{available} DON" plus a "-N" suffix when the
 * card's [Counter] ability also returns DON!! to the DON!! deck (donMinus,
 * see AbilityCost) — the "2/5 don" / "-1 don" / both-at-once warning called
 * for in the design. Green when currently affordable, red otherwise (mirrors
 * DockHand's dimming of the same card, which already gates on affordability).
 */
function counterEventBadge(
  mode: MatchSelectionMode,
  counterEventDonInfo: (card: CardView) => { cost: number; donMinus: number; available: number } | null,
  card: CardView,
): ReactNode | null {
  if (mode.kind !== 'selectCounterCard') return null;
  const info = counterEventDonInfo(card);
  if (!info) return null;
  const affordable = info.available >= info.cost + info.donMinus;
  const label = info.donMinus > 0 ? `${info.cost}/${info.available} DON −${info.donMinus}` : `${info.cost}/${info.available} DON`;
  return (
    <span
      className={[
        'block rounded-sm border px-1 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.04em] shadow-[0_2px_6px_rgba(0,0,0,0.55)]',
        affordable ? 'border-emerald-300/50 bg-emerald-950/85 text-emerald-200' : 'border-red-300/50 bg-red-950/85 text-red-200',
      ].join(' ')}
    >
      {label}
    </span>
  );
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
  onMatCardTap: (ownerPlayerId: string, zone: 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea' | 'attachedDon', card: CardView) => void;
  onMatCardAttack: (card: CardView) => void;
  onAttachedDonLabelTap: (ownerPlayerId: string, card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  onAttackTargetHover: (card: CardView | null) => void;
  canActivateCard: (card: CardView) => boolean;
  canOnOppAttackCard: (card: CardView) => boolean;
  canAttackCard: (card: CardView) => boolean;
  battlePowerInstanceIds: Set<string>;
  boardFocused: boolean;
  canGiveDonOnCard: (board: PlayerBoardView, card: CardView) => boolean;
  onGiveDon: (board: PlayerBoardView, card: CardView) => void;
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
