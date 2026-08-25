/**
 * One player's half of the playmat, matching the official play sheet. It is a
 * three-row grid (see `mat` at the bottom of this file):
 *   row 1  Character Area, alone, across the whole non-Life column
 *   row 2  Leader in the middle, Stage + Deck pinned to the far edge
 *   row 3  Trash on that same far edge, with the Cost Area splitting the rest
 *          50:50 — Active nearer Life, Rested nearer Trash (see donRow)
 * with Life running down one side, spanning all three rows. All three rows
 * are the same height and every card on the mat is the same size, DON!!
 * chips included. The DON!! piles used to share row 2 with the Leader;
 * giving them their own row is what pushed every card size down by
 * DESKTOP_BOARD_CARD_SCALE (boardScale.ts) — a variable this component sets
 * on its own root, so the shrink applies to the desktop mat and NOT to the
 * mobile board, which renders the same card leaves at their original size
 * under its own container. Cost Area taps still
 * route through onCardTap('costArea', card) exactly like Leader/Character
 * taps; only the visual position moved. The hand is not printed on the sheet,
 * so it stays outside the mat edge for playability. There's no separate
 * "P1 / Life" label row anymore — Life is the count badge on the Life pile
 * itself, and player identity is shown by MatchScreen.tsx's HandSection
 * header instead.
 *
 * The mat is width-capped at MAT_MAX_WIDTH — exactly enough for a full
 * Character Area of five RESTED (rotated, so square-footprint) Characters
 * plus Deck and Life — and centred in whatever space it gets. Past that width
 * it was only inflating gaps and dragging Deck/Life toward the screen edges.
 *
 * The DON!! Deck pile is rendered inside the Life cell (see LifeStack),
 * pinned to that cell's outer edge, since both are sealed/unbrowsable piles a
 * player rarely touches directly. The Active/Rested DON!! piles stack
 * sideways, with their MatCell wrappers made visually invisible
 * (variant="invisible") so only the chips themselves show on the mat.
 * Leader's MatCell is invisible for a different reason: MatCell's default
 * chrome clips anything past its edge via overflow-hidden, and a field tile
 * fills its whole row track now (rows are one card tall exactly), so every
 * card cell in rows 1-2 also runs padding="p-0" — with p-2 the Trash pile,
 * whose cell is the one that still clips, would lose 8px top and bottom.
 *
 * See TrashPile.tsx for why Trash shows real face-up card art rather than a
 * sealed back like Deck/DON!! Deck.
 *
 * This component is presentational. It keeps the same tap/zoom callbacks and
 * selection predicates as before; rules still live in the engine. The
 * hover/focus card-preview side panel that used to live in MatchScreen.tsx
 * has been removed; card zoom (onCardZoom) is the one remaining detail-view
 * affordance. The Trash gallery popup (TrashGalleryModal) is the one other
 * piece of local-only UI state this component owns — opening/closing it
 * never touches game state, exactly like onCardZoom.
 */
import { memo, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AttachedDonHoverStack } from './AttachedDonHoverStack';
import { useSeatDonArtUrl } from './MatchAccessoriesContext';
import { BoardCardTile } from './BoardCardTile';
import { CardBackArt } from './CardBackArt';
import { CardImage } from '../CardImage';
import { BOARD_CARD_SCALE_VAR, BOARD_WIDTH_GAIN_VAR, cqh, DESKTOP_BOARD_CARD_SCALE, DESKTOP_BOARD_WIDTH_GAIN } from './boardScale';
import { matShadeGradient } from '../../lib/cardColors';
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
  /**
   * ownerPlayerId is supplied by THIS component (from its own `board.playerId`
   * prop) rather than pre-bound by the caller into a wrapper closure — see
   * docs/08-match-performance-plan.md Phase 1. Passing the raw, stable
   * useBoardSelection function straight through (e.g. `onCardTap={selection.handleCardTap}`)
   * lets MatchScreen avoid creating a new per-render closure just to bind
   * "which side this panel is" ahead of time.
   */
  onCardTap: (ownerPlayerId: string, zone: 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea' | 'attachedDon', card: CardView) => void;
  onCardAttack?: (card: CardView) => void;
  /** See onCardTap's doc comment — same ownerPlayerId-supplied-internally pattern. Currently unused by this component's own render (kept for the mobile board's equivalent flow); still declared here so its identity is stabilizable at the call site. */
  onAttachedDonLabelTap?: (ownerPlayerId: string, card: CardView) => void;
  onCardZoom: (card: CardView) => void;
  onAttackTargetHover?: (card: CardView | null) => void;
  /** See onCardTap's doc comment — `board` is supplied internally (this component already has it as a prop) instead of being pre-bound by the caller. */
  canGiveDonOnCard?: (board: PlayerBoardView, card: CardView) => boolean;
  onGiveDon?: (board: PlayerBoardView, card: CardView) => void;
  onReturnGivenDon?: (card: CardView) => void;
  /** Hotseat-only undo for mis-clicks; disabled in Casual matches. */
  allowReturnGivenDon?: boolean;
}

/**
 * Exported because the mobile mat (MatchScreen's MobileCardZone) must ask the
 * exact same question about the exact same modes. It used to keep a private
 * `mobileLeaderCharacterSelectable` copy of this switch, and the copy silently
 * fell behind: it had no 'resolvingFieldChoice' case, so on mobile an effect
 * that asks you to pick a Character on the field ("K.O. up to 1 of your
 * opponent's Characters") rendered the banner and dimmed nothing, and no card
 * was tappable — the choice was unresolvable. One shared function instead, so a
 * new selection mode can't be wired into one breakpoint only.
 */
export function leaderCharacterSelectable(
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
      // A forced-target effect (OP17-044 Captain John) narrows the legal set to
      // exactly one Character. declareAttack already refuses everything else, so
      // offering the Leader and every rested Character here just produced a
      // validation error on tap that reads as "I can't attack at all".
      if (mode.forcedTargetInstanceId) return card.instanceId === mode.forcedTargetInstanceId;
      if (zone === 'leaderArea') return true;
      return zone === 'characterArea' && card.orientation === 'rested';
    case 'selectBlocker':
      return isOwn && zone === 'characterArea' && card.orientation === 'active' && card.hasBlocker;
    case 'selectActivateSource':
      // The "Activate Effect" flow: own Leader/Character with a curated [Activate: Main] ability.
      return isOwn && canActivate;
    case 'selectOnOppAttackSource':
      return isOwn && canOnOppAttack;
    case 'resolvingFieldChoice':
      // Unlike every other case here, NOT gated on isOwn — a field choice's
      // candidates can belong to either player (e.g. "K.O. up to 1 opponent
      // Character"); candidateInstanceIds is the sole authority.
      // Already-selected cards stay selectable so they can be tapped off again;
      // a candidate that would break the combined budget is not pickable.
      if (mode.selectedIds.includes(card.instanceId)) return true;
      if (mode.blockedInstanceIds.includes(card.instanceId)) return false;
      return mode.candidateInstanceIds.includes(card.instanceId);
    case 'idle':
      // Idle: an own card with a ready [Activate: Main] effect is tappable directly (the ⚡ badge).
      return isOwn && canActivate;
    default:
      return false;
  }
}

/**
 * "Dim, don't hide" for field cards (mirrors DockHand's `dimmed` for hand
 * cards): true for every card on EITHER board that is not one of the
 * current field choice's candidates, so the eligible card(s) visually pop
 * out of the rest of the mat. Deliberately independent of `isOwn`/selectable
 * — an online opponent's client renders this identically (see
 * BoardSelectionMode's 'resolvingFieldChoice' doc comment), it just can't
 * click through it.
 */
export function fieldChoiceDimmed(mode: BoardSelectionMode, card: CardView): boolean {
  if (mode.kind !== 'resolvingFieldChoice') return false;
  // Already picked: never dim — it carries the selected ring instead.
  if (mode.selectedIds.includes(card.instanceId)) return false;
  // Not a candidate at all, OR a candidate the current selection has priced out
  // of the combined budget ("a total cost of 4 or less"). Both read the same to
  // the player: this card cannot be chosen right now.
  return !mode.candidateInstanceIds.includes(card.instanceId)
    || mode.blockedInstanceIds.includes(card.instanceId);
}

/** True while `card` is one of the current field choice's picked cards (drives the selected ring). */
export function fieldChoiceSelected(mode: BoardSelectionMode, card: CardView): boolean {
  return mode.kind === 'resolvingFieldChoice' && mode.selectedIds.includes(card.instanceId);
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
  if (mode.kind === 'payingActivateEffectCost' || mode.kind === 'payingOnOppAttackCost') {
    return true;
  }
  if (mode.kind === 'payingEventMainCost') return mode.candidateInstanceIds.includes(card.instanceId);
  if (mode.kind === 'payingCounterEventCost') return mode.candidateInstanceIds.includes(card.instanceId);
  // donMinus pending choice: only the choice's own candidate DON!! are
  // pickable — candidateInstanceIds already encodes activeOnly (see
  // interpreter.ts's suspendOrPayAbilityCost / donMinusCandidateIds), so a
  // rested Cost Area DON!! simply won't appear here when the cost requires
  // active DON!! specifically.
  if (mode.kind === 'resolvingDonChoice') return mode.candidateInstanceIds.includes(card.instanceId);
  return false;
}

function selectedDonInstanceIds(mode: BoardSelectionMode): Set<string> {
  if (mode.kind === 'payingActivateEffectCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'payingOnOppAttackCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'payingEventMainCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'payingCounterEventCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'resolvingDonChoice') return new Set(mode.selectedDonIds);
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
// (3) How far apart the Life fan's cards sit. Each Life card lies sideways
// and is FIELD_CARD_WIDTH_PX tall on screen, so a step well below that keeps
// the pile reading as one fanned stack while still showing a wide band of
// every card under the top one. The whole fan is 4 * this + FIELD_CARD_WIDTH_PX
// tall; the Life cell spans all three mat rows and also has to hold the DON!!
// Deck at the far end, so this cannot grow without checking that budget:
//   fan (4*48 + 150 = 342) + DON!! Deck (~210) = 552, of ~622 available.
const LIFE_FAN_STEP_PX = 48;
// Smallest per-card step the Cost Area will squeeze a DON!! pile down to — the
// clickable sliver every buried card has to keep. Each half of the row is
// floored at one chip box plus this much per gap, so a pile can be given the
// minority share of the row and still be pickable card by card. ~16% of a card.
const DON_MIN_STEP_PX = 34;
// All three mat rows (Character Area / Leader+Stage+Trash / DON!!) are the
// same height: exactly one field-card box, which is also exactly one DON!!
// chip box — every card on the mat is one size. The cells in those rows
// therefore run p-0: at this track height MatCell's old p-2 would clip the
// Trash pile (its cell is the one with overflow-hidden) and push every other
// card 8px past its cell. DonStack likewise paints no caption at all for the
// same reason — the pile has exactly one card box of height to work with.
const CARD_ROW_TRACK = BOARD_ZONE_TRACK;
// Widest the mat ever needs to be: the Character Area's own worst case is 5
// RESTED Characters, and a rested card's footprint is BoardCardTile's square
// cqh(210) box (the square exists so a rotate-90 card doesn't overflow its
// neighbours — see BoardCardTile), i.e. the same BOARD_ZONE_TRACK the Deck,
// Stage and Trash cells use. Row 1 holds nothing else, which is why Deck
// moved down to the Leader's row. Past this width the mat was only stretching
// the gaps between cards, which pushed Life out toward the screen edge and
// away from the play field it belongs to. The `+ 64px` is every fixed
// (rem/px) gutter in that widest row, none of which scale with cqh:
//   mat p-1 left+right                 8
//   mat grid column gap (gap-x-2)      8
//   Character Area cell px-2          16
//   4 gaps between 5 character cards  32
const MAT_MAX_WIDTH = `calc(${LIFE_COLUMN_TRACK} + ${cqh(5 * BOARD_ZONE_TRACK_PX)} + 64px)`;

/**
 * Thin pass-through wrapper around a Leader/Character BoardCardTile that
 * registers its own real DOM node (via registerEl) so PlayerBoardPanel can
 * get an accurate getBoundingClientRect() for anchoring AttachedDonHoverStack
 * — see registerCardEl/revealAttachedDonStack above. Same box-sizing
 * classes BoardCardTile's own root already uses in this flex-row context
 * (h-full so it fills the row's height, flex-shrink-0 so it doesn't get
 * squeezed), so inserting it changes nothing visually; it only adds one
 * more DOM node whose rect we can read directly instead of searching the
 * document for it.
 */
function HoverableFieldCard({
  instanceId,
  registerEl,
  active,
  onEnter,
  onLeave,
  children,
}: {
  instanceId: string;
  registerEl: (instanceId: string, el: HTMLDivElement | null) => void;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={(el) => registerEl(instanceId, el)}
      // `flex items-center` matters: this wrapper is h-full (it stretches to
      // the zone's row height) but BoardCardTile's root is a FIXED square box,
      // so as a plain block the card sat at the top of the stretched wrapper
      // and read as vertically off-centre in its field. The parent's
      // items-center only centres this wrapper, which fills the row, not the
      // fixed-size card inside it — so the centring has to happen here.
      className="flex h-full flex-shrink-0 items-center justify-center"
      onMouseEnter={active ? onEnter : undefined}
      onMouseLeave={active ? onLeave : undefined}
    >
      {children}
    </div>
  );
}

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
        // fits without being clipped. The fan steps along the column
        // (top/bottom, by index) by LIFE_FAN_STEP_PX. Index 0 is the top of the
        // Life stack (zone.ts "cardIds[0] = top of stack" convention) and
        // gets the HIGHEST z-index so it renders as the frontmost card,
        // matching a real fanned pile.
        return (
          <div
            key={card?.instanceId ?? index}
            className="absolute left-0 right-0 mx-auto flex items-center justify-center"
            style={{
              [donDeckFirst ? 'bottom' : 'top']: cqh(index * LIFE_FAN_STEP_PX),
              width: FIELD_CARD_HEIGHT,
              height: FIELD_CARD_WIDTH,
              zIndex: visibleCards - index,
            }}
            aria-label={faceUp ? card.name : undefined}
          >
            <div className="rotate-90" style={{ width: FIELD_CARD_WIDTH }}>
              <div className="aspect-[63/88] overflow-hidden rounded shadow-[0_4px_10px_rgba(0,0,0,0.38)]">
                {faceUp ? <CardImage src={card.imageUrl} alt={card.name} className="h-full w-full" /> : <CardBackArt tone="navy" playerId={playerId} />}
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
          (which doesn't move) pinned to the cell's own far edge, at FULL card
          width — the same size as every other card on the mat, Life fan
          included. It used to render 20% smaller on the grounds that it is a
          sealed pile a player barely touches, but a lone undersized card read
          as a rendering bug rather than as a deliberate de-emphasis. Uses the
          teal colorway of CardBackArt (distinct from the navy Life/Deck card
          back) so this pile still reads as its own zone. */}
      <div
        className={['absolute inset-x-0 mx-auto aspect-[63/88] overflow-hidden rounded shadow-[0_4px_10px_rgba(0,0,0,0.45)]', donDeckFirst ? 'top-0' : 'bottom-0'].join(' ')}
        style={{ width: FIELD_CARD_WIDTH, zIndex: 10 }}
        aria-label={`${donDeckCount} DON!! Deck`}
        data-board-zone="donDeck"
        data-board-player={playerId}
        data-board-card-anchor
      >
        <CardBackArt tone="teal" playerId={playerId} />
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

/**
 * Wrapped in React.memo (default shallow prop comparison) — this is the
 * primary re-render firewall for the board: as of Phase 1, every prop
 * passed in from MatchScreen/PlayerSideRow is reference-stable when
 * nothing relevant to THIS side changed (see docs/08-match-performance-plan.md),
 * so a re-render triggered by unrelated MatchScreen state (mobile panel
 * toggle, chat, hover elsewhere) no longer re-renders this panel — or
 * anything inside it (BoardCardTile/DonStack/PileStack per card) — at all.
 */
export const PlayerBoardPanel = memo(function PlayerBoardPanel({ board, isOwn, isOpponent, reverseRows, mode, canActivateCard, canOnOppAttackCard, canAttackCard, battlePowerInstanceIds, boardFocused = false, onCardTap, onCardAttack, onAttachedDonLabelTap, onCardZoom, onAttackTargetHover, canGiveDonOnCard, onGiveDon, onReturnGivenDon, allowReturnGivenDon = true }: PlayerBoardPanelProps) {
  const attackerSelected = selectedAttackerIds(mode);
  // Mark/select own in-play cards that can activate a [Activate: Main] effect.
  const canActivate = (card: CardView): boolean => isOwn && !!canActivateCard?.(card);
  const canOnOppAttack = (card: CardView): boolean => isOwn && !!canOnOppAttackCard?.(card);
  const canAttack = (card: CardView): boolean => isOwn && !!canAttackCard?.(card);
  const availableActiveDon = countAvailableDon(board);
  const giveDonControlsFor = (card: CardView) =>
    canGiveDonOnCard?.(board, card)
      ? {
          availableActiveDon,
          allowReturnGivenDon,
          onGive: () => onGiveDon?.(board, card),
          onReturn: () => onReturnGivenDon?.(card),
        }
      : undefined;
  const donArtUrl = useSeatDonArtUrl(board.playerId);
  const leaderCard: CardView | null = board.leader;
  const stageCard: CardView | null = board.stageArea[0] ?? null;
  const attachedDon = attachedDonIds(board);
  const unattachedDon = board.costArea.filter((don) => !attachedDon.has(don.instanceId));
  const activeDon = unattachedDon.filter((don) => !don.donRested);
  const restedDon = unattachedDon.filter((don) => don.donRested);
  const selectedDon = selectedDonInstanceIds(mode);
  const [trashGalleryOpen, setTrashGalleryOpen] = useState(false);
  const attachedDonSelectable = (card: CardView): boolean =>
    isOwn && (mode.kind === 'payingActivateEffectCost' || mode.kind === 'payingOnOppAttackCost' || mode.kind === 'payingEventMainCost' || mode.kind === 'payingCounterEventCost' || mode.kind === 'resolvingDonChoice') && card.donAttachedCount > 0;
  const selectedAttachedDonCount = (card: CardView): number =>
    card.donAttachedIds.filter((id) => selectedDon.has(id)).length;

  // Attached DON!! hover stack (see AttachedDonHoverStack.tsx doc comment):
  // replaces the old "tap the DON!! x N badge to bulk-select" flow with
  // per-DON!! chip selection, revealed by hovering the owning Leader/
  // Character (desktop) or tapping its badge (touch — no hover to fire).
  // Purely local UI state; never touches GameState, same as trashGalleryOpen
  // above and onCardZoom throughout this file.
  const [donStackCard, setDonStackCard] = useState<CardView | null>(null);
  const [donStackAnchor, setDonStackAnchor] = useState<{ x: number; y: number } | null>(null);
  // instanceId -> CardView for every DON!! this player owns, attached or
  // not — board.costArea already includes attached DON!! (attachment is
  // layered on top via CardInstance.donAttached, not a separate zone; see
  // zoneView.ts), so this is a plain lookup, not a second projection.
  const donCardById = new Map(board.costArea.map((don) => [don.instanceId, don]));
  // Real DOM nodes for every Leader/Character card this panel renders,
  // registered by HoverableFieldCard's ref callback below. Looking these up
  // directly (instead of a global document.querySelector by
  // data-card-instance-id) sidesteps any chance of a stale/duplicate DOM
  // match and keeps the anchor calculation working even if this panel is
  // portal-nested or re-parented later.
  const cardElRefs = useRef(new Map<string, HTMLDivElement>());
  function registerCardEl(instanceId: string, el: HTMLDivElement | null): void {
    if (el) cardElRefs.current.set(instanceId, el);
    else cardElRefs.current.delete(instanceId);
  }
  // The hover stack renders into a portal a few px below the card, so the
  // pointer has to cross a small physical gap to reach it — without a grace
  // window, leaving the card's own hitbox (even briefly, mid-transit toward
  // the stack) would fire hideAttachedDonStack and the stack would vanish
  // out from under the cursor before the click lands. Cleared by both
  // revealAttachedDonStack (re-entering the card) and the stack's own
  // onMouseEnter (successfully reaching it).
  const donStackCloseTimerRef = useRef<number | null>(null);

  function clearDonStackCloseTimer(): void {
    if (donStackCloseTimerRef.current !== null) {
      window.clearTimeout(donStackCloseTimerRef.current);
      donStackCloseTimerRef.current = null;
    }
  }
  function revealAttachedDonStack(card: CardView): void {
    clearDonStackCloseTimer();
    const portalEl = document.getElementById('board-overlay-root');
    const cardEl = cardElRefs.current.get(card.instanceId);
    if (!portalEl || !cardEl) return;
    const pr = portalEl.getBoundingClientRect();
    const cr = cardEl.getBoundingClientRect();
    setDonStackAnchor({ x: cr.left + cr.width / 2 - pr.left, y: cr.bottom - pr.top });
    setDonStackCard(card);
  }
  function hideAttachedDonStack(): void {
    clearDonStackCloseTimer();
    donStackCloseTimerRef.current = window.setTimeout(() => {
      setDonStackCard(null);
      setDonStackAnchor(null);
      donStackCloseTimerRef.current = null;
    }, 160);
  }
  function toggleAttachedDonStack(card: CardView): void {
    if (donStackCard?.instanceId === card.instanceId) {
      clearDonStackCloseTimer();
      setDonStackCard(null);
      setDonStackAnchor(null);
    } else {
      revealAttachedDonStack(card);
    }
  }
  // Safety net: if the mode that made this card's DON!! selectable ends
  // while the stack is still open (e.g. a donMinus choice auto-submits the
  // instant its last DON!! is picked — see useBoardSelection.ts's
  // toggleDonChoiceCard), close the now-stale stack instead of leaving it
  // hovering over the board with nothing left to select.
  useEffect(() => {
    if (donStackCard && !attachedDonSelectable(donStackCard)) {
      clearDonStackCloseTimer();
      setDonStackCard(null);
      setDonStackAnchor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.kind]);

  const leaderSlot = leaderCard ? (
    <HoverableFieldCard
      instanceId={leaderCard.instanceId}
      registerEl={registerCardEl}
      active={attachedDonSelectable(leaderCard)}
      onEnter={() => revealAttachedDonStack(leaderCard)}
      onLeave={hideAttachedDonStack}
    >
      <BoardCardTile
        card={leaderCard}
        size="field"
        selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'leaderArea', leaderCard, canActivate(leaderCard), canOnOppAttack(leaderCard))}
        selected={attackerSelected.has(leaderCard.instanceId) || fieldChoiceSelected(mode, leaderCard)}
        dimmed={fieldChoiceDimmed(mode, leaderCard)}
        activatable={mode.kind === 'idle' && canActivate(leaderCard)}
        attackable={mode.kind === 'idle' && canAttack(leaderCard)}
        showBattlePower={battlePowerInstanceIds?.has(leaderCard.instanceId)}
        attachedDonSelectable={attachedDonSelectable(leaderCard)}
        attachedDonSelectedCount={selectedAttachedDonCount(leaderCard)}
        onActivate={mode.kind === 'idle' && canActivate(leaderCard) ? () => onCardTap(board.playerId, 'leaderArea', leaderCard) : undefined}
        onAttack={mode.kind === 'idle' && canAttack(leaderCard) ? () => onCardAttack?.(leaderCard) : undefined}
        onAttachedDonSelect={attachedDonSelectable(leaderCard) ? () => toggleAttachedDonStack(leaderCard) : undefined}
        onSelect={() => onCardTap(board.playerId, 'leaderArea', leaderCard)}
        onZoom={() => onCardZoom(leaderCard)}
        onHoverStart={mode.kind === 'selectAttackTarget' && isOpponent ? () => onAttackTargetHover?.(leaderCard) : undefined}
        onHoverEnd={mode.kind === 'selectAttackTarget' && isOpponent ? () => onAttackTargetHover?.(null) : undefined}
        giveDonControls={giveDonControlsFor(leaderCard)}
      />
    </HoverableFieldCard>
  ) : (
    <EmptySlot size="leader" label="Leader" />
  );

  const stageSlot = stageCard ? (
    <BoardCardTile
      card={stageCard}
      size="field"
      selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'stageArea', stageCard, canActivate(stageCard), canOnOppAttack(stageCard))}
      dimmed={fieldChoiceDimmed(mode, stageCard)}
      activatable={mode.kind === 'idle' && canActivate(stageCard)}
      showBattlePower={battlePowerInstanceIds?.has(stageCard.instanceId)}
      onActivate={mode.kind === 'idle' && canActivate(stageCard) ? () => onCardTap(board.playerId, 'stageArea', stageCard) : undefined}
      onSelect={() => onCardTap(board.playerId, 'stageArea', stageCard)}
      onZoom={() => onCardZoom(stageCard)}
    />
  ) : (
    <EmptySlot size="board" label="Stage" />
  );

  // Deck rides in the Leader's row (row 2), pinned to the far edge next to
  // Stage — see stageDeckGroup below. It briefly lived beside the Character
  // Area instead, but that cost row 1 a whole card track: the Character Area
  // is the one zone that genuinely needs the mat's full width (five RESTED
  // Characters are five SQUARE card boxes, not five upright ones), and a Deck
  // sitting next to them ate the room the fifth one needs. In row 2 it costs
  // nothing — Leader is centred and Stage was already at that edge with a
  // spare track beside it. allowOverflow stays because the pile's ghost
  // layers deliberately draw outside their cell.
  const deckCell = (
    <MatCell label="Deck" className="flex-shrink-0" labelClassName="sr-only" allowOverflow padding="p-0">
      <div data-board-zone="deck" data-board-player={board.playerId}>
        <PileStack label="Deck" count={board.deckCount} variant="deck" size="field" reverseRows={reverseRows} boardFocused={boardFocused} playerId={board.playerId} />
      </div>
    </MatCell>
  );

  const characterZone = (
    <MatCell label="Character Area" className="h-full w-full" labelClassName="sr-only" allowOverflow padding="px-2 py-0">
      <div
        className="flex h-full w-full min-w-0 items-center justify-center gap-2 overflow-visible"
        data-board-zone="characterArea"
        data-board-player={board.playerId}
      >
        {board.characterArea.map((card) => (
          <HoverableFieldCard
            key={card.instanceId}
            instanceId={card.instanceId}
            registerEl={registerCardEl}
            active={attachedDonSelectable(card)}
            onEnter={() => revealAttachedDonStack(card)}
            onLeave={hideAttachedDonStack}
          >
            <BoardCardTile
              card={card}
              size="field"
              selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'characterArea', card, canActivate(card), canOnOppAttack(card))}
              selected={attackerSelected.has(card.instanceId) || fieldChoiceSelected(mode, card)}
              dimmed={fieldChoiceDimmed(mode, card)}
              activatable={mode.kind === 'idle' && canActivate(card)}
              attackable={mode.kind === 'idle' && canAttack(card)}
              showBattlePower={battlePowerInstanceIds?.has(card.instanceId)}
              attachedDonSelectable={attachedDonSelectable(card)}
              attachedDonSelectedCount={selectedAttachedDonCount(card)}
              onActivate={mode.kind === 'idle' && canActivate(card) ? () => onCardTap(board.playerId, 'characterArea', card) : undefined}
              onAttack={mode.kind === 'idle' && canAttack(card) ? () => onCardAttack?.(card) : undefined}
              onAttachedDonSelect={attachedDonSelectable(card) ? () => toggleAttachedDonStack(card) : undefined}
              onSelect={() => onCardTap(board.playerId, 'characterArea', card)}
              onZoom={() => onCardZoom(card)}
              onHoverStart={mode.kind === 'selectAttackTarget' && isOpponent && card.orientation === 'rested' ? () => onAttackTargetHover?.(card) : undefined}
              onHoverEnd={mode.kind === 'selectAttackTarget' && isOpponent && card.orientation === 'rested' ? () => onAttackTargetHover?.(null) : undefined}
              giveDonControls={giveDonControlsFor(card)}
            />
          </HoverableFieldCard>
        ))}
        {board.characterArea.length === 0 && (
          // Empty-state watermark. data-zone-empty-hint lets styles/index.css
          // pull it out of flow while a hand-drag landing ghost is portalled
          // into this zone, so the ghost occupies the real card slot instead
          // of sharing the row with the label.
          <span
            data-zone-empty-hint="characterArea"
            className="font-display text-xl font-black uppercase tracking-[0.08em] text-white/20"
          >
            Character Area
          </span>
        )}
      </div>
    </MatCell>
  );

  // Row 1 is the Character Area and nothing else — see deckCell's comment for
  // why Deck moved out of it. Five rested Characters are the widest thing the
  // mat ever has to hold (MAT_MAX_WIDTH is sized off exactly that), so the row
  // hands them every pixel of the non-Life column.
  const characterRow = (
    <div className="flex h-full min-h-0 items-stretch overflow-visible">{characterZone}</div>
  );

  const leaderCell = <MatCell label="Leader Card" variant="invisible" labelClassName="sr-only" padding="p-0">{leaderSlot}</MatCell>;
  // data-board-zone marks this as the Stage drop target for hand drags (see
  // DockHand's play-drop hit-test); the other zones already carry one.
  const stageCell = (
    <MatCell label="Stage Card" variant="invisible" labelClassName="sr-only" padding="p-0">
      <div className="flex h-full w-full items-center justify-center" data-board-zone="stageArea" data-board-player={board.playerId}>
        {stageSlot}
      </div>
    </MatCell>
  );
  // h-full + the same BOARD_ZONE_TRACK width its wrapper gives it makes this
  // box identical to deckCell's, one row down: same track, same edge, same
  // centred card inside. Trash and Deck are the mat's two face-up/face-down
  // pile slots and they read as one column when they line up exactly.
  const trashCell = (
    <MatCell label="Trash" className="h-full" labelClassName="sr-only" padding="p-0">
      <TrashPile cards={board.trash} playerId={board.playerId} onClick={() => setTrashGalleryOpen(true)} />
    </MatCell>
  );
  // Active and Rested DON!! each fan sideways inside their own half of the
  // row (see DonStack.tsx), so their wrapper cells go variant="invisible" —
  // no border/background panel, just the chips floating directly on the mat.
  // The sr-only label keeps them announced for screen readers regardless. They own row 3 of the mat now
  // instead of riding along in the Leader's row, and that row is exactly one
  // card tall like the other two — hence padding="p-0", which is what keeps a
  // full-size chip inside its track.
  const activeDonCell = (
    <MatCell label="Active DON!!" variant="invisible" labelClassName="sr-only" padding="p-0">
      <DonStack
        label="Active"
        playerId={board.playerId}
        cards={activeDon}
        orientation="active"
        selectable={(card) => donSelectable(mode, isOwn, card)}
        selectedIds={selectedDon}
        onDonSelect={(card) => onCardTap(board.playerId, 'costArea', card)}
      />
    </MatCell>
  );
  const restedDonCell = (
    <MatCell label="Rested DON!!" variant="invisible" labelClassName="sr-only" padding="p-0">
      <DonStack
        label="Rested"
        playerId={board.playerId}
        cards={restedDon}
        orientation="rested"
        selectable={(card) => donSelectable(mode, isOwn, card)}
        selectedIds={selectedDon}
        onDonSelect={(card) => onCardTap(board.playerId, 'costArea', card)}
      />
    </MatCell>
  );

  // Row 2 of the mat (leaderRow, below) used to be a single flex row that ALSO
  // held the DON!! piles, with leaderGroup claiming flex-1 and centering
  // itself in whatever space the DON!! and Stage/Trash groups left behind.
  // That broke back when DON!! stacking was uncapped (DonStack.tsx): a growing
  // DON!! group ate into the "leftover space" leaderGroup centers in, so
  // Leader visually slid sideways every time a DON!! was added/removed.
  // Leader's screen position must stay put regardless of pile size, and both
  // players' Leaders must land on the same X so they face off across the
  // Battle Line (MatchScreen.tsx) — neither is possible with sibling-width-
  // dependent flex centering.
  //
  // Fix: each row is a `relative` box with a fixed track size (it's still a
  // CSS grid item in `mat` below, so it still stretches to fill its
  // row/column exactly like before). Each group inside is `absolute`:
  // - stageDeckGroup pins to the edge opposite Life via left-0/right-0.
  //   Being absolute, it can sit at a fixed edge without pushing on anything.
  // - leaderGroup pins to left-1/2 + -translate-x-1/2 — dead center of the
  //   row's own box, which is sized purely by the mat's grid track, not by
  //   sibling content. That's what makes Leader's position independent of
  //   everything else in the row, and identical between the top and bottom
  //   panel (assuming both panels' rows are the same width, which
  //   MatchScreen.tsx's PlayerSideRow plus MAT_MAX_WIDTH now guarantee).
  // - The DON!! piles moved out of this row entirely — they are row 3 now
  //   (donRow), which is what removed the last way a growing pile could
  //   reach Leader at all. The old "a very large DON!! pile can overlap
  //   Leader" limitation is therefore gone; leaderGroup keeps its z-10
  //   anyway so Leader stays on top of anything that ever does reach it.

  // Stage + Deck, pinned to the edge opposite Life. Deck takes the outermost
  // track (it is the pile a player reaches for, and it keeps the ghost layers
  // away from Stage's art); Stage sits inboard of it, where it has always
  // been. Mirrored for the top panel so both players' Stage/Deck read as
  // mirror images across the Battle Line rather than repeats.
  const stageDeckGroup = (
    <div
      className={['absolute inset-y-0 grid gap-8', reverseRows ? 'left-0' : 'right-0'].join(' ')}
      style={{ gridTemplateColumns: `${BOARD_ZONE_TRACK} ${BOARD_ZONE_TRACK}` }}
    >
      {reverseRows ? (
        <>
          {deckCell}
          {stageCell}
        </>
      ) : (
        <>
          {stageCell}
          {deckCell}
        </>
      )}
    </div>
  );

  // leaderGroup must sit in the horizontal middle of the WHOLE mat, not just
  // of leaderRow. leaderRow only spans the mat grid's non-Life column, so a
  // plain left-1/2 centers Leader within that column — which lands it off to
  // one side of the true play-field center by exactly half the Life column
  // (plus the grid gap). Worse, since the Life column is mirrored to the
  // opposite edge for the top/reversed panel, that same left-1/2 pushed the
  // two players' Leaders to OPPOSITE sides of center, so they didn't line up
  // across the Battle Line. Anchoring at 50% ± half-the-Life-column (toward
  // the Life edge) puts Leader at the real mat center and makes both panels'
  // Leaders share one X. gap-2 = 0.5rem is the mat grid's column gap.
  const leaderCenterOffset = `calc((${LIFE_COLUMN_TRACK} + 0.5rem) / 2)`;
  const leaderGroup = (
    <div
      className="absolute inset-y-0 z-10 grid -translate-x-1/2"
      style={{
        gridTemplateColumns: BOARD_ZONE_TRACK,
        left: reverseRows ? `calc(50% + ${leaderCenterOffset})` : `calc(50% - ${leaderCenterOffset})`,
      }}
      data-board-zone="leaderArea"
      data-board-player={board.playerId}
    >
      {leaderCell}
    </div>
  );

  const leaderRow = (
    <div className="relative min-h-0 h-full w-full">
      {leaderGroup}
      {stageDeckGroup}
    </div>
  );

  // Row 3: Trash on the far edge (opposite Life — the same edge Stage/Deck
  // occupy in row 2, so the whole "piles" side of the mat lines up), and the
  // Cost Area splitting everything left over 50:50 — Active in the half
  // nearer Life, Rested in the half nearer Trash, mirrored for the top panel.
  //
  // How the Cost Area's width is divided between the two piles. The row starts
  // 50:50 and then shifts toward whichever pile has more DON!! to spread, so a
  // big pile gets the room its fan needs instead of being crushed against a
  // half-empty neighbour.
  //
  // Each half is `minmax(floor, weight fr)`:
  //
  // - The WEIGHT is the pile's GAP count (cards - 1), not its card count, because
  //   gaps are what the space is actually spent on: DonStack's fan step is
  //   `free / (n - 1)`, so sharing free space in proportion to (n - 1) lands both
  //   piles on the same step and every DON!! on the mat keeps the same clickable
  //   sliver. A 0- or 1-card pile has no gap and no claim on the extra room —
  //   which is what gives a 9/1 board almost the whole row for the nine. When
  //   NEITHER pile has a gap (both empty, both single, one of each) there is
  //   nothing to weigh and it falls back to an even 1:1.
  //
  // - The FLOOR is one chip box plus DON_MIN_STEP_PX per gap: the width at which
  //   this pile's own cards are still individually clickable. Flooring at a bare
  //   chip box instead was a real bug — a 2-vs-8 board handed the pair exactly
  //   one card's width, DonStack's `(100% - chipBox) / gaps` came out as 0, and
  //   the second DON!! sat perfectly hidden under the first with no way to pick
  //   it. The floor is then capped at 50% so two long piles can't demand more
  //   than the row has; the two halves sum to exactly 100% (this grid has no gap).
  //
  // Because the floor uses one step constant for both orientations, equal card
  // counts always produce identical tracks — the default really is 50:50.
  const activeDonGaps = Math.max(activeDon.length - 1, 0);
  const restedDonGaps = Math.max(restedDon.length - 1, 0);
  const [activeDonWeight, restedDonWeight] = activeDonGaps + restedDonGaps === 0
    ? [1, 1]
    : [activeDonGaps, restedDonGaps];
  const donHalfFloor = (gaps: number): string =>
    `min(${cqh(BOARD_ZONE_TRACK_PX + gaps * DON_MIN_STEP_PX)},50%)`;
  // Track order follows the piles, so both mirror together (see donArea's children).
  const donTracks = [
    `minmax(${donHalfFloor(reverseRows ? restedDonGaps : activeDonGaps)},${reverseRows ? restedDonWeight : activeDonWeight}fr)`,
    `minmax(${donHalfFloor(reverseRows ? activeDonGaps : restedDonGaps)},${reverseRows ? activeDonWeight : restedDonWeight}fr)`,
  ].join(' ');

  // The two DON!! halves are plain grid tracks rather than the absolutely
  // positioned, content-sized boxes they used to be. That is the whole point:
  // a DON!! pile's width is now decided by its container instead of by its
  // card count (DonStack tightens its own fan to fit), so a growing pile can
  // no longer creep across the row toward Leader or Trash. What the card count
  // does influence is how the row is DIVIDED between the two piles — see
  // donTracks below.
  //
  // The halves themselves stay invisible; the printed box goes around BOTH of
  // them, because the Cost Area is one zone on the play sheet, not two. Same
  // MatCell treatment as characterZone — default 'light' chrome, sr-only
  // label, px-2 py-0 so the box hugs the row's one-card height, allowOverflow
  // so nothing inside is clipped — so rows 1 and 3 read as the same kind of
  // bordered play area.
  const donArea = (
    <MatCell label="Cost Area" className="h-full w-full" labelClassName="sr-only" allowOverflow padding="px-2 py-0">
      <div
        className="grid h-full min-h-0 w-full"
        style={{
          gridTemplateColumns: donTracks,
          // The split changes whenever a DON!! is played, rested or returned.
          // Animating it reads as the two piles making room for each other;
          // without it the whole Cost Area jumps on every DON!! spent.
          transition: 'grid-template-columns 0.25s ease',
        }}
      >
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
    </MatCell>
  );

  const donRow = (
    <div className="relative min-h-0 h-full w-full">
      <div
        className={['absolute inset-y-0', reverseRows ? 'left-0' : 'right-0'].join(' ')}
        style={{ width: BOARD_ZONE_TRACK }}
      >
        {trashCell}
      </div>
      {/* Everything the Trash slot (plus one gap) doesn't take. */}
      <div
        className="absolute inset-y-0"
        style={reverseRows
          ? { left: `calc(${BOARD_ZONE_TRACK} + 0.5rem)`, right: 0 }
          : { left: 0, right: `calc(${BOARD_ZONE_TRACK} + 0.5rem)` }}
      >
        {donArea}
      </div>
    </div>
  );

  // The mat is a 3-row grid per player (it was 2 until the DON!! piles were
  // given a row of their own):
  //   row 1  Character Area (the full width of the non-Life column)
  //   row 2  Leader, with Stage + Deck pinned to the far edge
  //   row 3  Trash on that same far edge, Active/Rested DON!! splitting the rest
  // Life spans all three in its own column, since it is one tall fanned pile
  // rather than a per-row zone. The reversed/top panel emits the rows in the
  // opposite order so the Character Areas of both players end up adjacent to
  // the Battle Line and the two mats read as mirror images.
  //
  // Row heights: all three rows are `minmax(CARD_ROW_TRACK,1fr)`, so they are
  // equal to each other, split any slack evenly (a card is centred in whatever
  // the row ends up being, exactly as before), and can never be squeezed below
  // one card. Fitting three of them is what DESKTOP_BOARD_CARD_SCALE was
  // introduced to pay for — see boardScale.ts for the arithmetic that picks
  // its value, and note that it is set on THIS component's root (below) so it
  // reaches the desktop mat's cards and nothing else, mobile included.
  //
  // The mat's own padding dropped to p-1 and the row gap to gap-y-0.5 as part
  // of that budget. Those are fixed px, so they do NOT shrink with the board:
  // at 720p they are a much larger share of a player's half than at 1080p,
  // which is exactly what made an earlier, larger card scale fit on a big
  // monitor and overflow on a small one. Shrinking them buys back card size at
  // every height. The column gap stays gap-x-2 — leaderCenterOffset below
  // assumes 0.5rem there.
  //
  // Colour: the mat is washed in its own Leader's colour(s) — see
  // matShadeGradient (cardColors.ts) for the gradient, including the 50:50
  // horizontal split a two-colour Leader gets. It replaces a neutral white
  // wash and reuses that wash's exact alpha envelope, so the mat is tinted,
  // not made more opaque. Set as backgroundImage rather than the `background`
  // shorthand so it can't clear a background-color someone adds later, and
  // read from `board.leader` so each half of the board carries its own
  // player's colours.
  //
  // Width: capped at MAT_MAX_WIDTH rather than 100%. Past that width the grid
  // was only inflating the gaps around a Character Area that already had room
  // for its worst case (5 rested Characters), which dragged Deck and Life out
  // to the screen edges. `justify-center` on the wrapper keeps the capped mat
  // centred, and because BOTH panels use the same cap they stay the same
  // width — which is what leaderGroup's centring relies on to put the two
  // Leaders on one X across the Battle Line.
  const lifeCell = (
    <MatCell label="Life" variant="dark" className="row-span-3" labelClassName="sr-only" allowOverflow>
      <LifeStack playerId={board.playerId} life={board.life} count={board.lifeAreaCount} donDeckCount={board.donDeckCount} donDeckFirst={reverseRows} />
    </MatCell>
  );

  const mat = (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden">
      <div
        className="grid h-full w-full flex-1 gap-x-2 gap-y-0.5 overflow-hidden rounded-xl border border-white/10 p-1 shadow-inner shadow-black/30"
        style={{
          backgroundImage: matShadeGradient(leaderCard?.colors ?? []),
          maxWidth: MAT_MAX_WIDTH,
          gridTemplateColumns: reverseRows ? `minmax(0,1fr) ${LIFE_COLUMN_TRACK}` : `${LIFE_COLUMN_TRACK} minmax(0,1fr)`,
          gridTemplateRows: `repeat(3, minmax(${CARD_ROW_TRACK},1fr))`,
        }}
      >
        {reverseRows ? (
          <>
            {donRow}
            {lifeCell}
            {leaderRow}
            {/* relative z-10: see the non-reversed branch — same reason, and
                here characterRow is also the row nearest the Battle Line. */}
            <div className="relative z-10 min-h-0">{characterRow}</div>
          </>
        ) : (
          <>
            {lifeCell}
            {/* relative z-10: characterRow must paint above the rows that come
                later in DOM order, which would otherwise cover the deck ghost
                layers that extend out of row 1 */}
            <div className="relative z-10 min-h-0">{characterRow}</div>
            {leaderRow}
            {donRow}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
      data-board-player={board.playerId}
      // Desktop-only card metrics, both read by cqh(): the scale every length
      // is multiplied by, and the gain on its width-driven half, which is what
      // decides the aspect ratio below which the board starts shrinking to fit
      // its width instead of its height. Every cqh consumer on this mat —
      // BoardCardTile, DonChip/DonStack, PileStack, TrashPile, CountBadge, and
      // this file's own track constants — is a descendant of this element. The
      // mobile mat renders the same leaves under its own container, never sees
      // either variable, falls back to 1 for both, and is unchanged. See
      // boardScale.ts for how the two values are derived.
      style={{
        [BOARD_CARD_SCALE_VAR]: DESKTOP_BOARD_CARD_SCALE,
        [BOARD_WIDTH_GAIN_VAR]: DESKTOP_BOARD_WIDTH_GAIN,
      } as CSSProperties}
    >
      {mat}
      <TrashGalleryModal
        open={trashGalleryOpen}
        onClose={() => setTrashGalleryOpen(false)}
        playerId={board.playerId}
        cards={board.trash}
        onCardZoom={onCardZoom}
      />
      <AttachedDonHoverStack
        anchor={donStackAnchor}
        cards={(donStackCard?.donAttachedIds ?? []).map((id) => donCardById.get(id)).filter((don): don is CardView => !!don)}
        selectable={(don) => donSelectable(mode, isOwn, don)}
        selectedIds={selectedDon}
        onSelect={(don) => onCardTap(board.playerId, 'attachedDon', don)}
        onMouseEnter={clearDonStackCloseTimer}
        onMouseLeave={hideAttachedDonStack}
        donArtUrl={donArtUrl}
      />
    </div>
  );
});
