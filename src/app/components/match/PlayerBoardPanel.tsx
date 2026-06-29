/**
 * One player's half of the playmat, matching the official play sheet:
 * Character Area across the top, Life down the left side, Leader/Stage/Deck
 * in the middle-right, DON!! Deck bottom-left, Cost Area bottom-center, and
 * Trash bottom-right. The hand is not printed on the sheet, so it stays
 * outside the mat edge for playability.
 *
 * This component is presentational. It keeps the same tap/zoom callbacks and
 * selection predicates as before; rules still live in the engine.
 */
import type { ReactNode } from 'react';
import { BoardCardTile } from './BoardCardTile';
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
  onCardPreviewStart?: (card: CardView) => void;
  onCardPreviewEnd?: () => void;
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

const FIELD_CARD_WIDTH = 150;
const FIELD_CARD_HEIGHT = 210;

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

function LifeStack({ count }: { count: number }) {
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
          className="absolute left-0 right-0 mx-auto aspect-[63/88] rounded border border-blue-200/20 bg-[linear-gradient(145deg,_#17233f,_#0b1228)] shadow-[0_4px_10px_rgba(0,0,0,0.38)]"
          style={{
            top: `${index * 18}px`,
            width: FIELD_CARD_WIDTH,
            zIndex: index,
          }}
        >
          <div className="absolute inset-[10%] rounded border border-gold/25" />
          <div className="absolute inset-[23%] rounded-full border border-gold/40" />
          <div className="absolute bottom-[10%] left-1/2 h-px w-1/2 -translate-x-1/2 bg-gold/35" />
        </div>
      ))}
      {count === 0 && <span className="flex h-full w-full items-center justify-center rounded border border-dashed border-white/15 text-xs font-black text-white/25">0</span>}
    </div>
  );
}

function MatCell({ label, children, className = '', variant = 'light', labelClassName = '' }: { label: string; children?: ReactNode; className?: string; variant?: 'light' | 'dark'; labelClassName?: string }) {
  return (
    <section
      className={[
        'relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-lg border p-2',
        variant === 'dark' ? 'border-white/10 bg-white/12' : 'border-white/15 bg-white/[0.05]',
        className,
      ].join(' ')}
    >
      <span className={['pointer-events-none absolute left-2 top-1.5 z-0 text-[9px] font-black uppercase tracking-[0.18em] text-white/20', labelClassName].join(' ')}>{label}</span>
      <div className="relative z-10 flex h-full w-full min-h-0 min-w-0 items-center justify-center gap-2">{children}</div>
    </section>
  );
}

export function PlayerBoardPanel({ board, isOwn, isOpponent, reverseRows, mode, onCardTap, onCardZoom, onCardPreviewStart, onCardPreviewEnd }: PlayerBoardPanelProps) {
  const attackerSelected = selectedAttackerIds(mode);
  const leaderCard: CardView | null = board.leader;
  const stageCard: CardView | null = board.stageArea[0] ?? null;

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
      onPreviewStart={onCardPreviewStart}
      onPreviewEnd={onCardPreviewEnd}
    />
  ) : (
    <EmptySlot size="leader" label="Leader" />
  );

  const stageSlot = stageCard ? (
    <BoardCardTile card={stageCard} size="field" onZoom={() => onCardZoom(stageCard)} onPreviewStart={onCardPreviewStart} onPreviewEnd={onCardPreviewEnd} />
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
            onPreviewStart={onCardPreviewStart}
            onPreviewEnd={onCardPreviewEnd}
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

  const boardRow = (
    <div className="grid min-h-0 justify-center gap-2 grid-cols-[210px_210px_210px]">
      {reverseRows ? (
        <>
          {deckCell}
          {stageCell}
          {leaderCell}
        </>
      ) : (
        <>
          {leaderCell}
          {stageCell}
          {deckCell}
        </>
      )}
    </div>
  );

  const mat = (
    <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden">
      <div className={['grid h-full w-full max-w-full flex-1 grid-rows-2 gap-2 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] p-2 shadow-inner shadow-black/30', reverseRows ? 'grid-cols-[minmax(0,1fr)_170px]' : 'grid-cols-[170px_minmax(0,1fr)]'].join(' ')}>
        {reverseRows ? (
          <>
            {boardRow}
            <MatCell label="Life" variant="dark" className="row-span-2" labelClassName="sr-only">
              <LifeStack count={board.lifeAreaCount} />
            </MatCell>
            <div className="min-h-0">{characterZone}</div>
          </>
        ) : (
          <>
            <MatCell label="Life" variant="dark" className="row-span-2" labelClassName="sr-only">
              <LifeStack count={board.lifeAreaCount} />
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
