/**
 * The single normalization a CardDefinition must pass through before the
 * engine is allowed to see it.
 *
 * Saved decks embed a SNAPSHOT of each card taken when the deck was saved
 * (a deliberate design choice — a deck must not break when the catalog
 * changes). Those snapshots can be stale in ways that matter to the RULES:
 * printed keyword flags were historically stored wrong, and some rows carry
 * compound types like "Straw Hat Crew/Supernovas" in a single string.
 *
 * This used to live privately inside app/lib/savedDeckToSetupInput.ts, which
 * meant only ONE of the paths into the engine applied it. That is a real
 * hazard for match replay: a game played with repaired definitions, replayed
 * against raw catalog rows, is a game played with different cards — the states
 * diverge and the recording silently becomes wrong. Anything that feeds the
 * engine, live or replayed, normalizes here.
 */
import type { CardDefinition } from '../../engine/state/card';
import { derivePrintedKeywordFlags } from './printedKeywords';

export function normalizeEngineCardDefinition(definition: CardDefinition): CardDefinition {
  const repaired: CardDefinition = {
    ...definition,
    ...derivePrintedKeywordFlags(definition.text ?? ''),
  };
  if (repaired.types.some((type) => /[\/,]/.test(type))) {
    return {
      ...repaired,
      types: repaired.types
        .flatMap((type) => type.split(/[\/,]+/).map((part) => part.trim()))
        .filter(Boolean),
    };
  }
  return repaired;
}
