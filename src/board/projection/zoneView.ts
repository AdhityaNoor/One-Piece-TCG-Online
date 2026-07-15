/**
 * Layer 3 (UI board projection): assembles one player's full board into the
 * shape PlayerBoardPanel renders. Pure function of (state, defs, images,
 * playerId) — no React, no store access, so it stays trivially testable and
 * reusable by both the debug board and any future renderer.
 */
import type { GameState } from '../../engine/state/game';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { V2ProjectionContext } from '../../engine/effects_V2/projectionAdapter_V2';
import { buildCardView, type CardView } from './cardView';

export interface PlayerBoardView {
  playerId: string;
  leader: CardView | null;
  leaderLifeValue: number;
  lifeAreaCount: number;
  /**
   * Life cards, top of stack first (matches player.lifeArea.cardIds order).
   * Every entry's identity is exposed here regardless of faceState — this is
   * the local-hotseat "both hands visible" debug posture the rest of this
   * projection already takes (see zoneView.ts file header); it's on the
   * renderer (LifeStack) to only actually show art for faceState==='faceUp'
   * cards and keep the rest as a generic card back, matching 10-1-5-2's
   * "Life cards are secret unless turned face-up" rule.
   */
  life: CardView[];
  deckCount: number;
  donDeckCount: number;
  hand: CardView[];
  characterArea: CardView[];
  stageArea: CardView[];
  /** DON!! cards currently in this player's cost area (both active and rested). */
  costArea: CardView[];
  trash: CardView[];
  hasGoneFirst: boolean;
  hasMulliganed: boolean;
}

export function projectPlayerBoard(
  state: GameState,
  defs: CardDefinitionLookup,
  images: Record<string, string | null>,
  playerId: string,
  v2Projection?: V2ProjectionContext,
): PlayerBoardView {
  const player = state.players[playerId];
  const view = (id: string): CardView => buildCardView(defs, state, images, id, v2Projection);

  return {
    playerId,
    leader: player.leaderInstanceId ? view(player.leaderInstanceId) : null,
    leaderLifeValue: player.leaderLifeValue,
    lifeAreaCount: player.lifeArea.cardIds.length,
    life: player.lifeArea.cardIds.map(view),
    deckCount: player.deck.cardIds.length,
    donDeckCount: player.donDeck.cardIds.length,
    hand: player.hand.cardIds.map(view),
    characterArea: player.characterArea.cardIds.map(view),
    stageArea: player.stageArea.cardIds.map(view),
    costArea: player.costArea.cardIds.map(view),
    trash: player.trash.cardIds.map(view),
    hasGoneFirst: player.hasGoneFirst,
    hasMulliganed: player.hasMulliganed,
  };
}

function attachedDonIds(board: PlayerBoardView): Set<string> {
  const ids = new Set<string>();
  if (board.leader) {
    for (const id of board.leader.donAttachedIds) ids.add(id);
  }
  for (const card of board.characterArea) {
    for (const id of card.donAttachedIds) ids.add(id);
  }
  return ids;
}

/** Active (non-rested), unattached DON!! a player could pay a cost with. */
export function countAvailableDon(board: PlayerBoardView): number {
  const attached = attachedDonIds(board);
  return board.costArea.filter((don) => !don.donRested && !attached.has(don.instanceId)).length;
}

/** First active, unattached DON!! in cost area — stable pick for GIVE_DON dispatch. */
export function findFirstAvailableDonId(board: PlayerBoardView): string | null {
  const attached = attachedDonIds(board);
  const don = board.costArea.find((entry) => !entry.donRested && !attached.has(entry.instanceId));
  return don?.instanceId ?? null;
}
