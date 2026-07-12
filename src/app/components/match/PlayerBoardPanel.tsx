/**
 * One player's half of the playmat, matching the official play sheet:
 * Character Area across the top (Deck now sits beside it as its own sibling
 * box, pinned to one edge — see characterRow below), Life down the left
 * side, and the
 * leader's row in the middle-right holding Leader/Stage/Trash plus the
 * Active/Rested DON!! piles as further columns (moved in from a standalone
 * column outside the mat — see MatchScreen.tsx history — so the whole "my
 * own resources" row reads left-to-right in one place). Cost Area taps
 * still route through onCardTap('costArea', card) exactly like
 * Leader/Character taps; only the visual position moved. The hand is not
 * printed on the sheet, so it stays outside the mat edge for playability.
 * There's no separate "P1 / Life" label row anymore — Life is the count
 * badge on the Life pile itself, and player identity is shown by
 * MatchScreen.tsx's HandSection header instead.
 *
 * The DON!! Deck pile no longer lives in this row — it's rendered inside the
 * Life cell instead (see LifeStack), pinned to that cell's bottom edge,
 * since both are sealed/unbrowsable piles a player rarely touches directly.
 * The Active/Rested DON!! piles both stack sideways now and render at full
 * card size (DonChip.tsx), with their MatCell wrappers made visually
 * invisible (variant="invisible") so only the chips themselves show on the
 * mat — see donGroup below. Leader's MatCell is invisible for a different
 * reason: BoardCardTile's stat badges (cost/power/counter) sit on negative
 * offsets just outside the card's own box, and MatCell's default chrome
 * clips anything past its edge via overflow-hidden — variant="invisible"
 * drops that clipping the same way it already does for the DON!! cells.
 *
 * Within boardRow, the DON!! group and the Stage+Trash group are each
 * independently anchored to the screen edge they thematically belong next to
 * (DON!! near Life, Stage+Trash on the opposite edge) rather than living
 * inside one centered block — see the boardRow assembly below for exactly
 * how. Trash now sits in the slot Deck used to occupy here (Deck moved up to
 * the Character Area row instead); see TrashPile.tsx for why it shows real
 * face-up card art rather than a sealed back like Deck/DON!! Deck.
 *
 * This component is presentational. It keeps the same tap/zoom callbacks and
 * selection predicates as before; rules still live in the engine. The
 * hover/focus card-preview side panel that used to live in MatchScreen.tsx
 * has been removed; card zoom (onCardZoom) is the one remaining detail-view
 * affordance. The Trash gallery popup (TrashGalleryModal) is the one other
 * piece of local-only UI state this component owns — opening/closing it
 * never touches game state, exactly like onCardZoom.
 */
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BoardCardTile } from './BoardCardTile';
import { CardBackArt } from './CardBackArt';
import { CardImage } from '../CardImage';
import { cqh } from './boardScale';
import { CountBadge } from './CountBadge';
import { DonStack } from './DonStack';
import { PileStack } from './PileStack';
import { TrashGalleryModal } from './TrashGalleryModal';
import { TrashPile } from './TrashPile';
import type { BoardSelectionMode } from './useBoardSelection';
import type { CardView, PlayerBoardView } from '../../../board/projection';
import { countAvailableDon } from '../../../board/projection';

export interface PlayerBoardPanelProps {
  board: PlayerBoardView;
  isOwn: boolean;
  isOpponent: boolean;
  /**
   * Purely spatial: true for the far/top screen slot. The hand stays on that
   * player's outside edge while the printed mat stays intact.
   */
  reverseRows: boolean;
  mode: BoardSelectionMode;
  /** True for own in-play cards whose curated program exposes an [Activate: Main] ability. */
  canActivateCard?: (card: CardView) => boolean;
  /** True for own in-play cards whose curated program exposes an [On Your Opponent's Attack] ability. */
  canOnOppAttackCard?: (card: CardView) => boolean;
  canAttackCard?: (card: CardView) => boolean;
  battlePowerInstanceIds?: Set<string>;
  /** Passed down to PileStack — hides ghost layers while board is active. */
  boardFocused?: boolean;
  onCardTap: (zone: 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea', card: CardView) => void;
  onCardAttack?: (card: CardView) => void;
  onAttachedDonLabelTap?: (card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  onAttackTargetHover?: (card: CardView | null) => void;
  canGiveDonOnCard?: (card: CardView) => boolean;
  onGiveDon?: (card: CardView) => void;
  onReturnGivenDon?: (card: CardView) => void;
  /** Hotseat-only undo for mis-clicks; disabled in Casual matches. */
  allowReturnGivenDon?: boolean;
}

function leaderCharacterSelectable(
  mode: BoardSelectionMode,
  isOwn: boolean,
  isOpponent: boolean,
  zone: 'leaderArea' | 'characterArea' | 'stageArea',
  card: CardView,
  canActivate: boolean,
  canOnOppAttack: boolean,
): boolean {
  switch (mode.kind) {
    case 'selectAttacker':
      return zone !== 'stageArea' && isOwn && card.orientation === 'active' && !card.summoningSick;
    case 'selectAttackTarget':
      if (!isOpponent) return false;
      if (zone === 'leaderArea') return true;
      return zone === 'characterArea' && card.orientation === 'rested';
    case 'selectCounterBoostTarget':
      return zone !== 'stageArea' && isOwn;
    case 'selectBlocker':
      return isOwn && zone === 'characterArea' && card.orientation === 'active' && card.hasBlocker;
    case 'selectActivateSource':
      // The "Activate Effect" flow: own Leader/Character with a curated [Activate: Main] ability.
      return isOwn && canActivate;
    case 'selectOnOppAttackSource':
      return isOwn && canOnOppAttack;
    case 'idle':
      // Idle: an own card with a ready [Activate: Main] effect is tappable directly (the ⚡ badge).
      return isOwn && canActivate;
    default:
      return false;
  }
}

function selectedAttackerIds(mode: BoardSelectionMode): Set<string> {
  if (mode.kind === 'selectAttackTarget') return new Set([mode.attackerInstanceId]);
  return new Set();
}

// Moved verbatim from MatchScreen.tsx's old DonManagementColumn/DonCardStack
// (now living in the leader's row instead of a standalone column) — same
// rule, just relocated alongside leaderCharacterSelectable above.
function donSelectable(mode: BoardSelectionMode, isOwn: boolean, card: CardView): boolean {
  if (!isOwn) return false;
  if (mode.kind === 'payingCounterEventCost') {
    return !card.donRested;
  }
  if (mode.kind === 'payingActivateEffectCost' || mode.kind === 'payingOnOppAttackCost') {
    return true;
  }
  return false;
}

function selectedDonInstanceIds(mode: BoardSelectionMode): Set<string> {
  if (mode.kind === 'payingCounterEventCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'payingActivateEffectCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'payingOnOppAttackCost') return new Set(mode.selectedDonIds);
  return new Set();
}

function attachedDonIds(board: PlayerBoardView): Set<string> {
  const ids = new Set<string>();
  for (const id of board.leader?.donAttachedIds ?? []) ids.add(id);
  for (const character of board.characterArea) {
    for (const id of character.donAttachedIds) ids.add(id);
  }
  return ids;
}

// Raw px-equivalent constants, kept as plain numbers so ratio math (the
// DON!! Deck's 0.8x, the Life fan's per-card offset, etc.) stays exact —
// see boardScale.ts. Only at the point a value is actually assigned to a
// style do we wrap it in cqh(), so it scales with the board's live height.
const FIELD_CARD_WIDTH_PX = 150;
const FIELD_CARD_HEIGHT_PX = 210;
const BOARD_ZONE_TRACK_PX = 210;
const FIELD_CARD_WIDTH = cqh(FIELD_CARD_WIDTH_PX);
const FIELD_CARD_HEIGHT = cqh(FIELD_CARD_HEIGHT_PX);
const BOARD_ZONE_TRACK = cqh(BOARD_ZONE_TRACK_PX);
// A Life card lies sideways (90deg, same convention as a rested field card).
// Rotating swaps its bounding box: what was FIELD_CARD_WIDTH_PX (150) tall
// becomes the on-screen width, and what was FIELD_CARD_HEIGHT_PX (210) wide
// becomes the on-screen height... i.e. a full-size rotated card's footprint
// is FIELD_CARD_HEIGHT_PX wide x FIELD_CARD_WIDTH_PX tall. The card is kept
// at its FULL/unscaled size — the Life column's own grid track
// (LIFE_COLUMN_TRACK_PX below) is widened to fit that footprint instead of
// shrinking the card down to the old upright-card column width.
const LIFE_COLUMN_TRACK_PX = FIELD_CARD_HEIGHT_PX + 20;
const LIFE_COLUMN_TRACK = cqh(LIFE_COLUMN_TRACK_PX);
// DON!! Deck visual (inside LifeStack) reads 20% smaller than a Life/field
// card — it's a sealed pile a player barely touches, so it doesn't need to
// read at full card size the way Active/Rested DON!! chips now do.
const DON_DECK_CARD_WIDTH = cqh(FIELD_CARD_WIDTH_PX * 0.8);

function EmptySlot({ label }: { size: 'leader' | 'board'; label: string }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-white/15 text-center text-[9px] font-black uppercase leading-tight tracking-wide text-white/25"
      style={{ width: FIELD_CARD_WIDTH, height: FIELD_CARD_HEIGHT }}
    >
      {label}
    </div>
  );
}

function LifeStack({ playerId, life, count, donDeckCount, donDeckFirst = false }: { playerId: string; life: CardView[]; count: number; donDeckCount: number; donDeckFirst?: boolean }) {
  const visibleCards = Math.max(0, Math.min(count, 5));
  const slots = Array.from({ length: visibleCards });

  return (
    <div
      className="relative h-full flex-shrink-0"
      style={{ width: FIELD_CARD_HEIGHT }}
      aria-label={`${count} Life cards`}
      data-board-zone="life"
      data-board-player={playerId}
    >
      {slots.map((_, index) => {
        // life[index] lines up with this slot 1:1 (both walk top-of-stack
        // first). A card turned face-up by an effect (e.g. "turn the top
        // Life card face-up") shows its real art here instead of a sealed
        // back — Life is otherwise secret (3-1-5), so every other slot stays
        // CardBackArt regardless of debug "both hands visible" posture.
        const card = life[index];
        const faceUp = card?.faceState === 'faceUp';
        // Life cards lie sideways now (same 90deg rotation as a rested field
        // card), rendered at FULL size — the anchor is sized to the rotated
        // card's actual footprint (FIELD_CARD_HEIGHT wide x FIELD_CARD_WIDTH
        // tall, since rotating swaps the two) rather than shrinking the card
        // to fit the old upright-card width. The Life column's own grid
        // track (LIFE_COLUMN_TRACK) was widened to match, so this footprint
        // fits without being clipped. The fan offset itself keeps stepping
        // in the same direction as before (top/bottom, by index) — only the
        // card's own orientation/size changed. Index 0 is the top of the
        // Life stack (zone.ts "cardIds[0] = top of stack" convention) and
        // gets the HIGHEST z-index so it renders as the frontmost card,
        // matching a real fanned pile.
        return (
          <div
            key={card?.instanceId ?? index}
            className="absolute left-0 right-0 mx-auto flex items-center justify-center"
            style={{
              [donDeckFirst ? 'bottom' : 'top']: cqh(index * 18),
              width: FIELD_CARD_HEIGHT,
              height: FIELD_CARD_WIDTH,
              zIndex: visibleCards - index,
            }}
            aria-label={faceUp ? card.name : undefined}
          >
            <div className="rotate-90" style={{ width: FIELD_CARD_WIDTH }}>
              <div className="aspect-[63/88] overflow-hidden rounded shadow-[0_4px_10px_rgba(0,0,0,0.38)]">
                {faceUp ? <CardImage src={card.imageUrl} alt={card.name} className="h-full w-full" /> : <CardBackArt tone="navy" />}
              </div>
            </div>
          </div>
        );
      })}
      {/* Single count overlay for the whole fan (same CountBadge used by
          PileStack/DonStack) — replaces the old "0"-only fallback, shown
          regardless of count so Life always reads a number. */}
      <CountBadge count={count} />

      {/* DON!! Deck, relocated here by design: it rides inside the Life cell
          (which doesn't move) pinned to the cell's own bottom edge, sized
          20% smaller than a Life/field card. Uses the teal colorway of
          CardBackArt (distinct from the navy Life/Deck card back) so this
          pile reads as its own zone.
          Known limitation: with a full 5-card Life fan, the bottom-pinned
          DON!! card can visually overlap the lowest Life card on very short
          viewports — z-index keeps the DON!! card on top, but this hasn't
          been measured/avoided dynamically. */}
      <div
        className={['absolute inset-x-0 mx-auto aspect-[63/88] overflow-hidden rounded shadow-[0_4px_10px_rgba(0,0,0,0.45)]', donDeckFirst ? 'top-0' : 'bottom-0'].join(' ')}
        style={{ width: DON_DECK_CARD_WIDTH, zIndex: 10 }}
        aria-label={`${donDeckCount} DON!! Deck`}
        data-board-zone="donDeck"
        data-board-player={playerId}
        data-board-card-anchor
      >
        <CardBackArt tone="teal" />
        <CountBadge count={donDeckCount} />
      </div>
    </div>
  );
}

function MatCell({
  label,
  children,
  className = '',
  variant = 'light',
  labelClassName = '',
  style,
  allowOverflow = false,
  padding = 'p-2',
}: {
  label: string;
  children?: ReactNode;
  className?: string;
  /** 'invisible' drops the border/background chrome but keeps the same layout box (used for the Active/Rested DON!! cells, which should show only the chips). */
  variant?: 'light' | 'dark' | 'invisible';
  labelClassName?: string;
  /** Explicit sizing (e.g. a fixed cqh() width) for cells that must match another cell's box exactly rather than shrink-to-fit their content — see deckCell. */
  style?: CSSProperties;
  /** When true, removes overflow-hidden so children (e.g. the stacked deck ghost layers) can render outside the cell boundary without being clipped. */
  allowOverflow?: boolean;
  /** Padding utility for the cell box; pass 'p-0' for a full-bleed card (e.g. Stage). */
  padding?: string;
}) {
  const isInvisible = variant === 'invisible';

  return (
    <section
      style={style}
      className={[
        'relative flex min-h-0 min-w-0 items-center justify-center rounded-lg',
        padding,
        isInvisible ? 'border-0 bg-transparent' : (allowOverflow ? 'border' : 'overflow-hidden border'),
        variant === 'dark' ? 'border-white/10 bg-white/12' : variant === 'light' ? 'border-white/15 bg-white/[0.05]' : '',
        className,
      ].join(' ')}
    >
      <span className={['pointer-events-none absolute left-2 top-1.5 z-0 text-[9px] font-black uppercase tracking-[0.18em] text-white/20', labelClassName].join(' ')}>{label}</span>
      <div className="relative z-10 flex h-full w-full min-h-0 min-w-0 items-center justify-center gap-2">{children}</div>
    </section>
  );
}

export function PlayerBoardPanel({ board, isOwn, isOpponent, reverseRows, mode, canActivateCard, canOnOppAttackCard, canAttackCard, battlePowerInstanceIds, boardFocused = false, onCardTap, onCardAttack, onAttachedDonLabelTap, onCardZoom, onAttackTargetHover, canGiveDonOnCard, onGiveDon, onReturnGivenDon, allowReturnGivenDon = true }: PlayerBoardPanelProps) {
  const attackerSelected = selectedAttackerIds(mode);
  // Mark/select own in-play cards that can activate a [Activate: Main] effect.
  const canActivate = (card: CardView): boolean => isOwn && !!canActivateCard?.(card);
  const canOnOppAttack = (card: CardView): boolean => isOwn && !!canOnOppAttackCard?.(card);
  const canAttack = (card: CardView): boolean => isOwn && !!canAttackCard?.(card);
  const availableActiveDon = countAvailableDon(board);
  const giveDonControlsFor = (card: CardView) =>
    canGiveDonOnCard?.(card)
      ? {
          availableActiveDon,
          allowReturnGivenDon,
          onGive: () => onGiveDon?.(card),
          onReturn: () => onReturnGivenDon?.(card),
        }
      : undefined;
  const leaderCard: CardView | null = board.leader;
  const stageCard: CardView | null = board.stageArea[0] ?? null;
  const attachedDon = attachedDonIds(board);
  const unattachedDon = board.costArea.filter((don) => !attachedDon.has(don.instanceId));
  const activeDon = unattachedDon.filter((don) => !don.donRested);
  const restedDon = unattachedDon.filter((don) => don.donRested);
  const selectedDon = selectedDonInstanceIds(mode);
  const [trashGalleryOpen, setTrashGalleryOpen] = useState(false);
  const attachedDonSelectable = (card: CardView): boolean =>
    isOwn && (mode.kind === 'payingActivateEffectCost' || mode.kind === 'payingOnOppAttackCost') && card.donAttachedCount > 0;
  const selectedAttachedDonCount = (card: CardView): number =>
    card.donAttachedIds.filter((id) => selectedDon.has(id)).length;

  const leaderSlot = leaderCard ? (
    <BoardCardTile
      card={leaderCard}
      size="field"
      selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'leaderArea', leaderCard, canActivate(leaderCard), canOnOppAttack(leaderCard))}
      selected={attackerSelected.has(leaderCard.instanceId)}
      activatable={mode.kind === 'idle' && canActivate(leaderCard)}
      attackable={mode.kind === 'idle' && canAttack(leaderCard)}
      showBattlePower={battlePowerInstanceIds?.has(leaderCard.instanceId)}
      attachedDonSelectable={attachedDonSelectable(leaderCard)}
      attachedDonSelectedCount={selectedAttachedDonCount(leaderCard)}
      onActivate={mode.kind === 'idle' && canActivate(leaderCard) ? () => onCardTap('leaderArea', leaderCard) : undefined}
      onAttack={mode.kind === 'idle' && canAttack(leaderCard) ? () => onCardAttack?.(leaderCard) : undefined}
      onAttachedDonSelect={attachedDonSelectable(leaderCard) ? () => onAttachedDonLabelTap?.(leaderCard) : undefined}
      onSelect={() => onCardTap('leaderArea', leaderCard)}
      onZoom={() => onCardZoom(leaderCard)}
      onHoverStart={mode.kind === 'selectAttackTarget' && isOpponent ? () => onAttackTargetHover?.(leaderCard) : undefined}
      onHoverEnd={mode.kind === 'selectAttackTarget' && isOpponent ? () => onAttackTargetHover?.(null) : undefined}
      giveDonControls={giveDonControlsFor(leaderCard)}
    />
  ) : (
    <EmptySlot size="leader" label="Leader" />
  );

  const stageSlot = stageCard ? (
    <BoardCardTile
      card={stageCard}
      size="field"
      selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'stageArea', stageCard, canActivate(stageCard), canOnOppAttack(stageCard))}
      activatable={mode.kind === 'idle' && canActivate(stageCard)}
      showBattlePower={battlePowerInstanceIds?.has(stageCard.instanceId)}
      onActivate={mode.kind === 'idle' && canActivate(stageCard) ? () => onCardTap('stageArea', stageCard) : undefined}
      onSelect={() => onCardTap('stageArea', stageCard)}
      onZoom={() => onCardZoom(stageCard)}
    />
  ) : (
    <EmptySlot size="board" label="Stage" />
  );

  // Deck used to sit in boardRow next to Stage; it now lives in the
  // Character Area's own row instead, as a separate MatCell sitting BESIDE
  // characterZone (own border/box, own panel) rather than layered inside
  // it — characterZone keeps its own complete bordered box for just the
  // character cards, and deckCell is a plain flex sibling next to it (see
  // the characterRow assembly in `mat` below). flex-shrink-0 keeps Deck at
  // its natural card-pile size while characterZone (flex-1) takes the rest
  // of the row; items-stretch on their shared row makes both boxes match
  // the row's full height, with Deck's own MatCell centering the pile
  // vertically inside that height exactly like every other MatCell does.
  // Anchored to the same edge stageTrashGroup sits on in boardRow below, so
  // Deck stays visually stacked above Stage/Trash rather than landing on a
  // disconnected side.
  const deckCell = (
    <MatCell label="Deck" className="flex-shrink-0" labelClassName="sr-only" style={{ width: BOARD_ZONE_TRACK }} allowOverflow>
      <div data-board-zone="deck" data-board-player={board.playerId}>
        <PileStack label="Deck" count={board.deckCount} variant="deck" size="field" reverseRows={reverseRows} boardFocused={boardFocused} />
      </div>
    </MatCell>
  );

  const characterZone = (
    <MatCell label="Character Area" className="h-full flex-1" labelClassName="sr-only" allowOverflow>
      <div
        className="flex h-full w-full min-w-0 items-center justify-center gap-2 overflow-visible"
        data-board-zone="characterArea"
        data-board-player={board.playerId}
      >
        {board.characterArea.map((card) => (
          <BoardCardTile
            key={card.instanceId}
            card={card}
            size="field"
            selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'characterArea', card, canActivate(card), canOnOppAttack(card))}
            selected={attackerSelected.has(card.instanceId)}
            activatable={mode.kind === 'idle' && canActivate(card)}
            attackable={mode.kind === 'idle' && canAttack(card)}
            showBattlePower={battlePowerInstanceIds?.has(card.instanceId)}
            attachedDonSelectable={attachedDonSelectable(card)}
            attachedDonSelectedCount={selectedAttachedDonCount(card)}
            onActivate={mode.kind === 'idle' && canActivate(card) ? () => onCardTap('characterArea', card) : undefined}
            onAttack={mode.kind === 'idle' && canAttack(card) ? () => onCardAttack?.(card) : undefined}
            onAttachedDonSelect={attachedDonSelectable(card) ? () => onAttachedDonLabelTap?.(card) : undefined}
            onSelect={() => onCardTap('characterArea', card)}
            onZoom={() => onCardZoom(card)}
            onHoverStart={mode.kind === 'selectAttackTarget' && isOpponent && card.orientation === 'rested' ? () => onAttackTargetHover?.(card) : undefined}
            onHoverEnd={mode.kind === 'selectAttackTarget' && isOpponent && card.orientation === 'rested' ? () => onAttackTargetHover?.(null) : undefined}
            giveDonControls={giveDonControlsFor(card)}
          />
        ))}
        {board.characterArea.length === 0 && <span className="font-display text-xl font-black uppercase tracking-[0.08em] text-white/20">Character Area</span>}
      </div>
    </MatCell>
  );

  const characterRow = (
    <div className="flex h-full min-h-0 items-stretch gap-2 overflow-visible">
      {reverseRows ? (
        <>
          {deckCell}
          {characterZone}
        </>
      ) : (
        <>
          {characterZone}
          {deckCell}
        </>
      )}
    </div>
  );

  const leaderCell = <MatCell label="Leader Card" variant="invisible" labelClassName="sr-only">{leaderSlot}</MatCell>;
  const stageCell = <MatCell label="Stage Card" variant="invisible" labelClassName="sr-only">{stageSlot}</MatCell>;
  const trashCell = (
    <MatCell label="Trash" labelClassName="sr-only">
      <TrashPile cards={board.trash} playerId={board.playerId} onClick={() => setTrashGalleryOpen(true)} />
    </MatCell>
  );
  // Active and Rested DON!! both stack sideways now (see DonStack.tsx) and
  // render at full card size, so their wrapper cells go variant="invisible"
  // — no border/background panel, just the chips floating directly on the
  // mat. sr-only label keeps them announced for screen readers regardless.
  const activeDonCell = (
    <MatCell label="Active DON!!" variant="invisible" labelClassName="sr-only">
      <DonStack
        label="Active"
        playerId={board.playerId}
        cards={activeDon}
        direction="horizontal"
        selectable={(card) => donSelectable(mode, isOwn, card)}
        selectedIds={selectedDon}
        onDonSelect={(card) => onCardTap('costArea', card)}
        reverseRows={reverseRows}
      />
    </MatCell>
  );
  const restedDonCell = (
    <MatCell label="Rested DON!!" variant="invisible" labelClassName="sr-only">
      <DonStack
        label="Rested"
        playerId={board.playerId}
        cards={restedDon}
        direction="horizontal"
        selectable={(card) => donSelectable(mode, isOwn, card)}
        selectedIds={selectedDon}
        onDonSelect={(card) => onCardTap('costArea', card)}
        reverseRows={reverseRows}
      />
    </MatCell>
  );

  // boardRow used to be a flex row where leaderGroup claimed flex-1 and
  // centered itself in whatever space donGroup/stageTrashGroup left behind.
  // That broke once DON!! stacking went uncapped (DonStack.tsx): a growing
  // donGroup ate into the "leftover space" leaderGroup centers in, so Leader
  // visually slid sideways every time a DON!! was added/removed. Leader's
  // screen position must stay put regardless of pile size, and both
  // players' Leaders must land on the same X so they face off across the
  // Battle Line (MatchScreen.tsx) — neither is possible with sibling-width-
  // dependent flex centering.
  //
  // Fix: boardRow is now a `relative` box with a fixed track size (it's
  // still a CSS grid item in `mat` below, so it still stretches to fill its
  // row/column exactly like before). Each group is `absolute` inside it:
  // - donGroup pins to the edge next to Life (right for reversed/top, left
  //   for bottom — same mirroring as before) via left-0/right-0. Being
  //   absolute, it can grow with the pile (DonStack.tsx's now-uncapped span)
  //   without pushing on anything else in the row. Active/Rested swap their
  //   left-right order specifically for the reversed/top row, so the visual
  //   scan order mirrors rather than repeats between the two players.
  // - stageTrashGroup pins to the opposite edge the same way.
  // - leaderGroup pins to left-1/2 + -translate-x-1/2 — dead center of
  //   boardRow's own box, which is sized purely by the mat's grid track, not
  //   by sibling content. That's what makes Leader's position independent of
  //   donGroup's width, and identical between the top and bottom panel
  //   (assuming both panels' boardRow boxes are the same width, which
  //   MatchScreen.tsx's PlayerSideRow now guarantees by giving both rows'
  //   Hand the same fixed column width and pinning it to the same edge).
  // Known limitation: because donGroup/stageTrashGroup no longer participate
  // in flex flow, a very large DON!! pile can grow inward far enough to
  // visually overlap Leader or Stage/Trash instead of pushing them aside.
  // leaderGroup gets z-10 so Leader stays on top if that happens; this is an
  // accepted trade-off for keeping Leader's position stable.
  const donGroup = (
    <div className={['absolute inset-y-0 flex items-stretch gap-2', reverseRows ? 'right-0' : 'left-0'].join(' ')}>
      {reverseRows ? (
        <>
          {restedDonCell}
          {activeDonCell}
        </>
      ) : (
        <>
          {activeDonCell}
          {restedDonCell}
        </>
      )}
    </div>
  );

  const stageTrashGroup = (
    <div
      className={['absolute inset-y-0 grid gap-8', reverseRows ? 'left-0' : 'right-0'].join(' ')}
      style={{ gridTemplateColumns: `${BOARD_ZONE_TRACK} ${BOARD_ZONE_TRACK}` }}
    >
      {reverseRows ? (
        <>
          {trashCell}
          {stageCell}
        </>
      ) : (
        <>
          {stageCell}
          {trashCell}
        </>
      )}
    </div>
  );

  const leaderGroup = (
    <div className="absolute inset-y-0 left-1/2 z-10 grid -translate-x-1/2" style={{ gridTemplateColumns: BOARD_ZONE_TRACK }}>
      {leaderCell}
    </div>
  );

  const boardRow = (
    <div className="relative min-h-0 h-full w-full">
      {donGroup}
      {leaderGroup}
      {stageTrashGroup}
    </div>
  );

  const mat = (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden">
      <div
        className="grid h-full w-full max-w-full flex-1 grid-rows-2 gap-2 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] p-2 shadow-inner shadow-black/30"
        style={{ gridTemplateColumns: reverseRows ? `minmax(0,1fr) ${LIFE_COLUMN_TRACK}` : `${LIFE_COLUMN_TRACK} minmax(0,1fr)` }}
      >
        {reverseRows ? (
          <>
            {boardRow}
            <MatCell label="Life" variant="dark" className="row-span-2" labelClassName="sr-only" allowOverflow>
              <LifeStack playerId={board.playerId} life={board.life} count={board.lifeAreaCount} donDeckCount={board.donDeckCount} donDeckFirst />
            </MatCell>
            <div className="min-h-0">{characterRow}</div>
          </>
        ) : (
          <>
            <MatCell label="Life" variant="dark" className="row-span-2" labelClassName="sr-only" allowOverflow>
              <LifeStack playerId={board.playerId} life={board.life} count={board.lifeAreaCount} donDeckCount={board.donDeckCount} />
            </MatCell>
            {/* relative z-10: characterRow must paint above boardRow (which comes later in DOM
                and would otherwise cover the deck ghost layers that extend downward into row 1) */}
            <div className="relative z-10 min-h-0">{characterRow}</div>
            {boardRow}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col" data-board-player={board.playerId}>
      {mat}
      <TrashGalleryModal
        open={trashGalleryOpen}
        onClose={() => setTrashGalleryOpen(false)}
        playerId={board.playerId}
        cards={board.trash}
        onCardZoom={onCardZoom}
      />
    </div>
  );
}
