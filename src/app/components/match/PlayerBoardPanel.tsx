/**
 * One player's half of the playmat: a spatial layout — Trash pile | Stage +
 * Leader + Deck/DON!! Deck piles | Character row | DON!! Area row | Hand
 * row — built from real card art (BoardCardTile/DonChip/PileStack) instead
 * of the original text-row layout. CardRow/ZoneSection remain in use for
 * compact list contexts where a scannable text list is genuinely more
 * useful than card art: the Trash inspector below, and the Character Area
 * overflow choice in PendingChoicePrompt.tsx.
 *
 * The opponent's panel renders the exact same five rows in REVERSE order,
 * so both players' Leader rows end up nearest the shared ActionBar in the
 * middle of the screen — mirroring how a real two-sided tabletop reads
 * (your Leader and the opponent's Leader face off across the middle; each
 * player's Hand is furthest from the middle, closest to that player's own
 * screen edge).
 *
 * Every "is this card tappable right now" decision is derived here from the
 * current BoardSelectionMode (Layer 4) plus whether this panel belongs to
 * the acting player or their opponent — never from card text or effect
 * logic (there isn't any yet; see project decision "stub everything").
 */
import { useState } from 'react';
import { BoardCardTile } from './BoardCardTile';
import { DonChip } from './DonChip';
import { PileStack } from './PileStack';
import { ZoneRow } from './ZoneRow';
import { ZoneSection } from './ZoneSection';
import type { BoardSelectionMode } from './useBoardSelection';
import type { CardView, PlayerBoardView } from '../../../board/projection';
import { Pill } from '../Pill';
import { Modal } from '../Modal';

export interface PlayerBoardPanelProps {
  board: PlayerBoardView;
  isOwn: boolean;
  isOpponent: boolean;
  /**
   * Purely spatial: true for whichever of the two panels sits in the
   * "far/top" screen slot, so its rows render in mirrored order (Leader row
   * nearest the shared ActionBar). Intentionally a SEPARATE signal from
   * isOwn/isOpponent (action authority) — MatchScreen.tsx anchors panel
   * SLOT to the turn player, not to who currently must act, precisely so
   * this never flips mid-battle. If row order were derived from isOpponent
   * instead, the Block/Counter Step's authority handoff to the defender
   * would also yank the Leader row from one edge of the screen to the
   * other on top of the (separately fixed) attacker-orientation bug.
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

function handSelectable(mode: BoardSelectionMode, isOwn: boolean, card: CardView): boolean {
  if (!isOwn) return false;
  if (mode.kind === 'idle') {
    return card.category === 'character' || card.category === 'stage' || card.category === 'event';
  }
  if (mode.kind === 'selectCounterCard') {
    return card.category === 'character' && !!card.counter && card.counter > 0;
  }
  return false;
}

function costAreaSelectable(mode: BoardSelectionMode, isOwn: boolean, card: CardView): boolean {
  if (!isOwn) return false;
  if (mode.kind === 'payingCost' || mode.kind === 'selectDonToGive') {
    return !card.donRested;
  }
  return false;
}

function selectedDonIds(mode: BoardSelectionMode): Set<string> {
  if (mode.kind === 'payingCost') return new Set(mode.selectedDonIds);
  if (mode.kind === 'selectGiveDonTarget') return new Set([mode.donInstanceId]);
  return new Set();
}

function selectedAttackerIds(mode: BoardSelectionMode): Set<string> {
  if (mode.kind === 'selectAttackTarget') return new Set([mode.attackerInstanceId]);
  return new Set();
}

function selectedHandIds(mode: BoardSelectionMode): Set<string> {
  if (mode.kind === 'payingCost') return new Set([mode.handCardInstanceId]);
  if (mode.kind === 'selectCounterBoostTarget') return new Set([mode.handCardInstanceId]);
  return new Set();
}

function EmptySlot({ size, label }: { size: 'leader' | 'board'; label: string }) {
  const dims = size === 'leader' ? 118 : 84;
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 text-center text-[8px] uppercase leading-tight tracking-wide text-white/20"
      style={{ width: dims, height: dims }}
    >
      {label}
    </div>
  );
}

export function PlayerBoardPanel({ board, isOwn, isOpponent, reverseRows, mode, onCardTap, onCardZoom }: PlayerBoardPanelProps) {
  const [trashOpen, setTrashOpen] = useState(false);

  const costSelected = selectedDonIds(mode);
  const attackerSelected = selectedAttackerIds(mode);
  const handSelected = selectedHandIds(mode);

  // Local consts (not inline `board.leader`/`board.stageArea[0]` accesses) so
  // the narrowed, non-null type survives unchanged into the onSelect/onZoom
  // closures below — narrowing a property/index access does not persist
  // through a nested function body the way narrowing a plain const does.
  const leaderCard: CardView | null = board.leader;
  const stageCard: CardView | null = board.stageArea[0] ?? null;

  const statsRow = (
    <div className="flex items-center justify-center gap-2 px-1 py-0.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
        {board.playerId}
        {isOpponent ? ' · Opponent' : ''}
      </span>
      <Pill tone="navy">Life {board.leaderLifeValue}</Pill>
    </div>
  );

  const leaderRow = (
    <div className="flex items-center justify-center gap-3 py-1">
      <PileStack label="Trash" count={board.trash.length} variant="trash" onClick={() => setTrashOpen(true)} />

      {stageCard ? (
        <BoardCardTile card={stageCard} size="board" onZoom={() => onCardZoom(stageCard)} />
      ) : (
        <EmptySlot size="board" label="Stage" />
      )}

      {leaderCard ? (
        <BoardCardTile
          card={leaderCard}
          size="leader"
          selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'leaderArea', leaderCard)}
          selected={attackerSelected.has(leaderCard.instanceId)}
          onSelect={() => onCardTap('leaderArea', leaderCard)}
          onZoom={() => onCardZoom(leaderCard)}
        />
      ) : (
        <EmptySlot size="leader" label="Leader" />
      )}

      <div className="flex flex-shrink-0 flex-col gap-1.5">
        <PileStack label="Deck" count={board.deckCount} variant="deck" />
        <PileStack label="DON!!" count={board.donDeckCount} variant="don" />
      </div>
    </div>
  );

  const characterRow = (
    <ZoneRow label="Characters" isEmpty={board.characterArea.length === 0} emptyLabel="No characters">
      {board.characterArea.map((card) => (
        <BoardCardTile
          key={card.instanceId}
          card={card}
          size="board"
          selectable={leaderCharacterSelectable(mode, isOwn, isOpponent, 'characterArea', card)}
          selected={attackerSelected.has(card.instanceId)}
          onSelect={() => onCardTap('characterArea', card)}
          onZoom={() => onCardZoom(card)}
        />
      ))}
    </ZoneRow>
  );

  const donRow = (
    <ZoneRow label="DON!! Area" isEmpty={board.costArea.length === 0} emptyLabel="No DON!! in play">
      {board.costArea.map((don) => (
        <DonChip
          key={don.instanceId}
          card={don}
          selectable={costAreaSelectable(mode, isOwn, don)}
          selected={costSelected.has(don.instanceId)}
          onSelect={() => onCardTap('costArea', don)}
        />
      ))}
    </ZoneRow>
  );

  const handRow = (
    <ZoneRow label="Hand" isEmpty={board.hand.length === 0} emptyLabel="No cards in hand">
      {board.hand.map((card) => (
        <BoardCardTile
          key={card.instanceId}
          card={card}
          size="board"
          selectable={handSelectable(mode, isOwn, card)}
          selected={handSelected.has(card.instanceId)}
          onSelect={() => onCardTap('hand', card)}
          onZoom={() => onCardZoom(card)}
        />
      ))}
    </ZoneRow>
  );

  const rows = [statsRow, leaderRow, characterRow, donRow, handRow];
  const ordered = reverseRows ? [...rows].reverse() : rows;

  return (
    <div className={['flex flex-col gap-2 rounded-2xl border border-white/10 bg-navy-950/60 p-2', isOwn ? 'ring-1 ring-gold/30' : ''].join(' ')}>
      {ordered.map((row, index) => (
        <div key={index}>{row}</div>
      ))}

      <Modal open={trashOpen} onClose={() => setTrashOpen(false)} title={`Trash (${board.trash.length})`}>
        <div className="p-5">
          <ZoneSection label="Trash" cards={board.trash} emptyLabel="Empty" onCardZoom={onCardZoom} />
        </div>
      </Modal>
    </div>
  );
}
