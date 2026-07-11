import type { GameAction } from '../../engine/actions';
import { validateAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';

export function isLegalAction(
  state: GameState,
  action: GameAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): boolean {
  return validateAction(state, action, defs, registry).legal;
}

export function uniqueActions(actions: GameAction[]): GameAction[] {
  const seen = new Set<string>();
  const out: GameAction[] = [];
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}
