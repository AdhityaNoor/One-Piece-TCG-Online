/**
 * A cheap, stable fingerprint of a GameState, used to detect replay divergence.
 *
 * `JSON.stringify(state)` is unusable for this: key order is insertion-ordered
 * and cardsById is rebuilt constantly, so two identical games hash differently.
 * Instead we project the state down to the facts that DEFINE a position —
 * whose turn, which cards sit where, in what orientation — in a canonical
 * order, and hash that.
 *
 * Deliberately excludes the log (presentation text, and entries carry actionIds
 * that differ between a live match and its replay) and continuous-effect
 * bookkeeping (internal record ids are not part of the position).
 */
import type { GameState } from '../state/game';

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Canonical, order-stable projection of the position. */
export function canonicalStateProjection(state: GameState): string {
  const parts: string[] = [
    `t${state.turnNumber}`,
    `p:${state.currentPhase}`,
    `a:${state.activePlayerId}`,
    `b:${state.currentBattle ? `${state.currentBattle.step}:${state.currentBattle.attackerInstanceId}>${state.currentBattle.targetInstanceId}` : '-'}`,
    `c:${state.pendingChoices.map((choice) => `${choice.id}/${choice.playerId}/${choice.kind}`).join(',')}`,
    `o:${state.gameOver ? `${state.gameOver.winnerId ?? 'draw'}/${state.gameOver.reason}` : '-'}`,
  ];

  for (const playerId of Object.keys(state.players).sort()) {
    const player = state.players[playerId];
    const zones: [string, readonly string[]][] = [
      ['leader', player.leaderInstanceId ? [player.leaderInstanceId] : []],
      ['char', player.characterArea.cardIds],
      ['stage', player.stageArea.cardIds],
      ['hand', player.hand.cardIds],
      ['deck', player.deck.cardIds],
      ['life', player.lifeArea.cardIds],
      ['trash', player.trash.cardIds],
      ['cost', player.costArea.cardIds],
      ['dondeck', player.donDeck.cardIds],
    ];
    for (const [name, ids] of zones) {
      // Card IDENTITY plus the per-card facts that change the position. Zone
      // order is preserved (deck order is a real, load-bearing fact).
      const cells = ids.map((id) => {
        const card = state.cardsById[id];
        if (!card) return `${id}:?`;
        return `${id}:${card.cardDefinitionId}:${card.orientation ?? '-'}:${card.faceState ?? '-'}:${card.donRested ?? '-'}:${card.donAttached.length}`;
      });
      parts.push(`${playerId}.${name}=${cells.join('|')}`);
    }
  }

  return parts.join(';');
}

export function checksumState(state: GameState): string {
  return fnv1a(canonicalStateProjection(state));
}
