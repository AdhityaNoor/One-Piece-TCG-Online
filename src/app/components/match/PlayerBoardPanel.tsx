/**
 * One player's half of the playmat, matching the official play sheet:
 * Character Area across the top, Life down the left side, and the leader's
 * row in the middle-right holding Leader/Stage/Deck plus the Active/Rested
 * DON!! piles as further columns (moved in from a standalone column outside
 * the mat — see MatchScreen.tsx history — so the whole "my own resources"
 * row reads left-to-right in one place). Cost Area taps still route through
 * onCardTap('costArea', card) exactly like Leader/Character taps; only the
 * visual position moved. The hand is not printed on the sheet, so it stays
 * outside the mat edge for playability.
 *
 * The DON!! Deck pile no longer lives in this row — it's rendered inside the
 * Life cell instead (see LifeStack), pinned to that cell's bottom edge,
 * since both are sealed/unbrowsable piles a player rarely touches directly.
 * The Active/Rested DON!! piles both stack sideways now and render at full
 * card size (DonChip.tsx), with their MatCell wrappers made visually
 * invisible (variant="invisible") so only the chips themselves show on the
 * mat — see donGroup below.
 *
 * Within boardRow, the DON!! group and the Stage+Deck group are each
 * independently anchored to the screen edge they thematically belong next to
 * (DON!! near Life, Stage+Deck near Trash) rather than living inside one
 * centered block — see the boardRow assembly below for exactly how.
 *
 * This component is presentational. It keeps the same tap/zoom callbacks and
 * selection predicates as before; rules still live in the engine. The
 * hover/focus card-preview side panel that used to live in MatchScreen.tsx
 * has been removed; card zoom (onCardZoom) is the one remaining detail-view
 * affordance.
 */
import type { ReactNode } from 'react';
import { BoardCardTile } from './BoardCardTile';
import { CardBackArt } from './CardBackArt';
import { CountBadge } from './CountBadge';
import { DonStack } from './DonStack';
import { PileStack } from './PileStack';
import type { BoardSelectionMode } from './useBoardSelection';
import type { CardView, PlayerBoardView } from '../../../board/projection';
import { Pill } from '../Pill';

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
  onCardTap: (zone: 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea', card: CardView) => void;
  onCardZoom: (card: CardView) => void;
}

function leaderCharacterSelectable(mode: BoardSelectionMode, isOwn: boolean, isOpponent: boolean, zone: 'leaderArea' | 'characterArea', card: CardView): boolean {
  switch (mode.kind) {
    case 'selectAttacker':
      return isOwn && card.orientation === 'active' && !card.summoningSick;
    case 'selectAttackTarget':
      if (!isOpponent) return false;
      if (zone === 'leaderArea') return true;
      return card.orientation === 'rested';
    case 'selectGiveDonTarget':
    case 'selectCounterBoostTarget':
      return isOwn;
    case 'selectBlocker':
      return isOwn && zone === 'characterArea' && card.orientation === 'active' && card.hasBlocker;
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
  if (mode.kind === 'payingCost' || mode.kind === 'selectDonToGive') {
    return !card.donRested;
  }
  return false;
}

function selectedDonInstanceIds(mode: BoardSelectionMode): Set<string> {
  if (mode.kind === 'payingCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'selectGiveDonTarget') return new Set([mode.donInstanceId]);
  return new Set();
}

const FIELD_CARD_WIDTH = 150;
const FIELD_CARD_HEIGHT = 210;
// DON!! Deck visual (inside LifeStack) reads 20% smaller than a Life/field
// card — it's a sealed pile a player barely touches, so it doesn't need to
// read at full card size the way Active/Rested DON!! chips now do.
const DON_DECK_CARD_WIDTH = Math.round(FIELD_CARD_WIDTH * 0.8);

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

function LifeStack({ count, donDeckCount }: { count: number; donDeckCount: number }) {
  const visibleCards = Math.max(0, Math.min(count, 5));
  const cards = Array.from({ length: visibleCards });

  return (
    <div
      className="relative h-full flex-shrink-0"
      style={{ width: FIELD_CARD_WIDTH }}
      aria-label={`${count} Life cards`}
    >
      {cards.map((_, index) => (
        <div
          key={index}
          className="absolute left-0 right-0 mx-auto aspect-[63/88] overflow-hidden rounded shadow-[0_4px_10px_rgba(0,0,0,0.38)]"
          style={{
            top: `${index * 18}px`,
            width: FIELD_CARD_WIDTH,
            zIndex: index,
          }}
        >
          <CardBackArt tone="navy" />
        </div>
      ))}
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
        className="absolute inset-x-0 bottom-0 mx-auto aspect-[63/88] overflow-hidden rounded shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
        style={{ width: DON_DECK_CARD_WIDTH, zIndex: 10 }}
        aria-label={`${donDeckCount} DON!! Deck`}
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
}: {
  label: string;
  children?: ReactNode;
  className?: string;
  /** 'invisible' drops the border/background chrome but keeps the same layout box (used for the Active/Rested DON!! cells, which should show only the chips). */
  variant?: 'light' | 'dark' | 'invisible';
  labelClassName?: string;
}) {
  const isInvisible = variant === 'invisible';

  return (
    <section
      className={[
        'relative flex min-h-0 min-w-0 items-center justify-center rounded-lg p-2',
        isInvisible ? 'border-0 bg-transparent' : 'overflow-hidden border',
        variant === 'dark' ? 'border-white/10 bg-white/12' : variant === 'light' ? 'border-white/15 bg-white/[0.05]' : '',
        className,
      ].join(' ')}
    >
      <span className={['pointer-events-none absolute left-2 top-1.5 z-0 text-[9px] font-black uppercase tracking-[0.18em] text-white/20', labelClassName].join(' ')}>{label}</span>
      <div className="relative z-10 flex h-full w-full min-h-0 min-w-0 items-center justify-center gap-2">{children}</div>
    </section>
  );
}

export function PlayerBoardPanel({ board, isOwn, isOpponent, reverseRows, mode, onCardTap, onCardZoom }: PlayerBoardPanelProps) {
  const attackerSelected = selectedAttackerIds(mode);
  const leaderCard: CardView | null = board.leader;
  const stageCard: CardView | null = board.stageArea[0] ?? null;
  const activeDon = board.costArea.filter((don) => !don.donRested);
  const restedDon = board.costArea.filter((don) => don.donRested);
  const selectedDon = selectedDonInstanceIds(mode);

  const statsRow = (
    <div className="flex items-center justify-center gap-2 px-1 py-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
        {board.playerId}
        {isOpponent ? ' - Opponent' : ''}
      </span>
      <Pill tone="navy">Life {board.leaderLifeValue}</Pill>
    </div>
  );

  const leaderSlot = leaderCard ? (
    <BoardCardTile
      card={leaderCard}
      size="field"
      selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'leaderArea', leaderCard)}
      selected={attackerSelected.has(leaderCard.instanceId)}
      onSelect={() => onCardTap('leaderArea', leaderCard)}
      onZoom={() => onCardZoom(leaderCard)}
    />
  ) : (
    <EmptySlot size="leader" label="Leader" />
  );

  const stageSlot = stageCard ? (
    <BoardCardTile card={stageCard} size="field" onZoom={() => onCardZoom(stageCard)} />
  ) : (
    <EmptySlot size="board" label="Stage" />
  );

  const characterZone = (
    <MatCell label="Character Area" className="h-full" labelClassName="sr-only">
      <div className="flex h-full w-full min-w-0 items-center justify-center gap-2 overflow-hidden">
        {board.characterArea.map((card) => (
          <BoardCardTile
            key={card.instanceId}
            card={card}
            size="field"
            selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'characterArea', card)}
            selected={attackerSelected.has(card.instanceId)}
            onSelect={() => onCardTap('characterArea', card)}
            onZoom={() => onCardZoom(card)}
          />
        ))}
        {board.characterArea.length === 0 && <span className="font-display text-xl font-black uppercase tracking-[0.08em] text-white/20">Character Area</span>}
      </div>
    </MatCell>
  );

  const leaderCell = <MatCell label="Leader Card" labelClassName="sr-only">{leaderSlot}</MatCell>;
  const stageCell = <MatCell label="Stage Card" labelClassName="sr-only">{stageSlot}</MatCell>;
  const deckCell = (
    <MatCell label="Deck" labelClassName="sr-only">
      <PileStack label="Deck" count={board.deckCount} variant="deck" size="field" />
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
        cards={activeDon}
        direction="horizontal"
        selectable={(card) => donSelectable(mode, isOwn, card)}
        selectedIds={selectedDon}
        onDonSelect={(card) => onCardTap('costArea', card)}
      />
    </MatCell>
  );
  const restedDonCell = (
    <MatCell label="Rested DON!!" variant="invisible" labelClassName="sr-only">
      <DonStack
        label="Rested"
        cards={restedDon}
        direction="horizontal"
        selectable={(card) => donSelectable(mode, isOwn, card)}
        selectedIds={selectedDon}
        onDonSelect={(card) => onCardTap('costArea', card)}
      />
    </MatCell>
  );

  // boardRow used to be a flex row where leaderGroup claimed flex-1 and
  // centered itself in whatever space donGroup/stageDeckGroup left behind.
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
  //   without pushing on anything else in the row.
  // - stageDeckGroup pins to the opposite edge (next to Trash, external
  //   mirror via reverseRows) the same way.
  // - leaderGroup pins to left-1/2 + -translate-x-1/2 — dead center of
  //   boardRow's own box, which is sized purely by the mat's grid track, not
  //   by sibling content. That's what makes Leader's position independent of
  //   donGroup's width, and identical between the top and bottom panel
  //   (assuming both panels' boardRow boxes are the same width, which
  //   MatchScreen.tsx's PlayerSideRow now guarantees by giving Hand and
  //   Trash the same fixed column width on both rows).
  // Known limitation: because donGroup/stageDeckGroup no longer participate
  // in flex flow, a very large DON!! pile can grow inward far enough to
  // visually overlap Leader or Stage/Deck instead of pushing them aside.
  // leaderGroup gets z-10 so Leader stays on top if that happens; this is an
  // accepted trade-off for keeping Leader's position stable.
  const donGroup = (
    <div className={['absolute inset-y-0 flex items-stretch gap-2', reverseRows ? 'right-0' : 'left-0'].join(' ')}>
      {activeDonCell}
      {restedDonCell}
    </div>
  );

  const stageDeckGroup = (
    <div className={['absolute inset-y-0 grid grid-cols-[210px_210px] gap-2', reverseRows ? 'left-0' : 'right-0'].join(' ')}>
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

  const leaderGroup = (
    <div className="absolute inset-y-0 left-1/2 z-10 grid -translate-x-1/2 grid-cols-[210px]">
      {leaderCell}
    </div>
  );

  const boardRow = (
    <div className="relative min-h-0 h-full w-full">
      {donGroup}
      {leaderGroup}
      {stageDeckGroup}
    </div>
  );

  const mat = (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden">
      <div className={['grid h-full w-full max-w-full flex-1 grid-rows-2 gap-2 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] p-2 shadow-inner shadow-black/30', reverseRows ? 'grid-cols-[minmax(0,1fr)_170px]' : 'grid-cols-[170px_minmax(0,1fr)]'].join(' ')}>
        {reverseRows ? (
          <>
            {boardRow}
            <MatCell label="Life" variant="dark" className="row-span-2" labelClassName="sr-only">
              <LifeStack count={board.lifeAreaCount} donDeckCount={board.donDeckCount} />
            </MatCell>
            <div className="min-h-0">{characterZone}</div>
          </>
        ) : (
          <>
            <MatCell label="Life" variant="dark" className="row-span-2" labelClassName="sr-only">
              <LifeStack count={board.lifeAreaCount} donDeckCount={board.donDeckCount} />
            </MatCell>
            <div className="min-h-0">{characterZone}</div>
            {boardRow}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className={['flex min-h-0 min-w-0 flex-1 flex-col gap-1 rounded-xl border border-white/10 bg-navy-950/60 p-2 shadow-inner shadow-black/30', isOwn ? 'ring-1 ring-gold/30' : ''].join(' ')}>
      {reverseRows ? (
        <>
          {statsRow}
          {mat}
        </>
      ) : (
        <>
          {mat}
          {statsRow}
        </>
      )}

    </div>
  );
}
