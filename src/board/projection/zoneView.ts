/**
 * Layer 3 (UI board projection): assembles one player's full board into the
 * shape PlayerBoardPanel renders. Pure function of (state, defs, images,
 * playerId) — no React, no store access, so it stays trivially testable and
 * reusable by both the debug board and any future renderer.
 */
import type { GameState } from '../../engine/state/game';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { buildCardView, type CardView } from './cardView';

export interface PlayerBoardView {
  playerId: string;
  leader: CardView | null;
  leaderLifeValue: number;
  lifeAreaCount: number;
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
  playerId: string
): PlayerBoardView {
  const player = state.players[playerId];
  const view = (id: string): CardView => buildCardView(defs, state, images, id);

  return {
    playerId,
    leader: player.leaderInstanceId ? view(player.leaderInstanceId) : null,
    leaderLifeValue: player.leaderLifeValue,
    lifeAreaCount: player.lifeArea.cardIds.length,
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
