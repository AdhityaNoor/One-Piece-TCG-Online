import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { hasContinuousKeyword } from '../../engine/rules/shared';
import type { ContinuousKeyword } from '../../engine/state/game';
import type { GameState } from '../../engine/state/game';

export function hasEffectiveCombatKeyword(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
  keyword: Extract<ContinuousKeyword, 'blocker' | 'rush' | 'doubleAttack' | 'banish' | 'unblockable'>,
): boolean {
  const instance = state.cardsById[instanceId];
  const def = instance ? defs[instance.cardDefinitionId] : undefined;
  if (!instance || !def) return false;

  if (keyword === 'blocker' && def.hasBlocker) return true;
  if (keyword === 'rush' && def.hasRush) return true;
  if (keyword === 'doubleAttack' && def.hasDoubleAttack) return true;
  if (keyword === 'banish' && def.hasBanish) return true;
  if (keyword === 'unblockable' && def.isUnblockable) return true;

  return hasContinuousKeyword(defs, state, instanceId, keyword);
}
