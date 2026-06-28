/**
 * CardDefinition lookup contract for the rules engine.
 *
 * GameState intentionally never stores full CardDefinition data — only
 * CardInstance.cardDefinitionId references (see card.ts). This mirrors the
 * setup layer's own pattern (PlayerSetupInput carries full CardDefinitions
 * in from outside; the engine never fetches/caches them itself) and keeps
 * "card API is data only" true for the action-dispatch layer too: the
 * dispatcher receives a lookup table as a plain argument on every call
 * rather than smuggling card data into GameState.
 *
 * Architectural note (not explicitly specified in the blueprint doc —
 * flagging as a deliberate design decision made during dispatcher
 * implementation): callers (the app layer) are responsible for assembling
 * this table from every CardDefinition that could possibly be referenced —
 * both players' decks/leaders/DON!! card — before dispatching any action.
 */
import type { CardDefinition, CardInstance } from '../../state/card';

export type CardDefinitionLookup = Record<string, CardDefinition>;

export function getDefinition(defs: CardDefinitionLookup, instance: CardInstance): CardDefinition {
  const def = defs[instance.cardDefinitionId];
  if (!def) {
    throw new Error(`No CardDefinition found for cardDefinitionId '${instance.cardDefinitionId}' (instance '${instance.instanceId}').`);
  }
  return def;
}
