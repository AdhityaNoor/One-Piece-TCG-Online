/**
 * The SavedDeck -> engine-setup adapter. This is exactly the app-layer glue
 * that engine/setup/setupInput.ts's own doc comment defers to: "the app
 * layer is responsible for unwrapping a SavedDeck (src/cards/decks) into
 * plain CardDefinition[] before calling into setup." Lives under /src/app
 * (not /src/engine, which must never import /src/cards; not /src/cards,
 * which has no reason to know about engine setup flow) — this is the one
 * place allowed to depend on both.
 */
import { GENERIC_DON_CARD_DEFINITION } from '../../cards/decks/genericDonCard';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import type { CardDefinition } from '../../engine/state/card';
import type { PlayerSetupInput } from '../../engine/setup';
import type { CardDefinitionLookup } from '../../engine/rules/shared';

/**
 * Expands SavedDeck.cards (aggregated by `quantity`, one entry per distinct
 * card-number+printing choice) into one CardDefinition per physical card —
 * the flat, pre-expanded 50-entry shape PlayerSetupInput.deck requires. If a
 * deck is malformed (quantities don't sum to 50), the resulting array simply
 * won't have 50 entries and `validatePlayerSetupInput` will reject it with a
 * clear reason rather than this function silently padding/truncating.
 */
function expandMainDeck(deck: SavedDeck): CardDefinition[] {
  const expanded: CardDefinition[] = [];
  for (const snapshot of deck.cards) {
    for (let i = 0; i < snapshot.quantity; i++) {
      expanded.push(snapshot.definition);
    }
  }
  return expanded;
}

export function savedDeckToPlayerSetupInput(deck: SavedDeck, playerId: string): PlayerSetupInput {
  return {
    playerId,
    leader: deck.leader.definition,
    deck: expandMainDeck(deck),
    donCard: GENERIC_DON_CARD_DEFINITION,
    donDeckSize: deck.donDeckSize,
  };
}

/**
 * The CardDefinitionLookup the dispatcher requires (rules/shared/definitions.ts
 * doc comment: "callers ... are responsible for assembling this table from
 * every CardDefinition that could possibly be referenced — both players'
 * decks/leaders/DON!! card — before dispatching any action"). Keyed by
 * cardDefinitionId; safe to overwrite duplicates across the two decks since
 * normalizeCardPrintings.ts keys cardDefinitionId by stable card NUMBER, so
 * the same id always normalizes to an equivalent CardDefinition.
 */
export function buildCardDefinitionLookup(decks: SavedDeck[]): CardDefinitionLookup {
  const lookup: CardDefinitionLookup = {};
  for (const deck of decks) {
    lookup[deck.leader.definition.cardDefinitionId] = deck.leader.definition;
    for (const snapshot of deck.cards) {
      lookup[snapshot.definition.cardDefinitionId] = snapshot.definition;
    }
  }
  lookup[GENERIC_DON_CARD_DEFINITION.cardDefinitionId] = GENERIC_DON_CARD_DEFINITION;
  return lookup;
}

/**
 * Sibling lookup to buildCardDefinitionLookup, for display only: maps
 * cardDefinitionId -> the cosmetic image URL chosen for that card in either
 * SavedDeck. Kept separate from CardDefinitionLookup because imageUrl is not
 * part of CardDefinition (display-only data never reaches the engine) — see
 * card.ts's doc comment that CardDefinition is "card data only, not
 * executable logic" and carries no image field at all.
 */
export function buildCardImageLookup(decks: SavedDeck[]): Record<string, string | null> {
  const images: Record<string, string | null> = {};
  for (const deck of decks) {
    images[deck.leader.definition.cardDefinitionId] = deck.leader.imageUrl;
    for (const snapshot of deck.cards) {
      images[snapshot.definition.cardDefinitionId] = snapshot.imageUrl;
    }
  }
  images[GENERIC_DON_CARD_DEFINITION.cardDefinitionId] = null;
  return images;
}
