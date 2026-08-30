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
import { resolveAccessoryImageUrl } from '../../cards/accessories/deckAccessories';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import type { CardDefinition } from '../../engine/state/card';
import { normalizeEngineCardDefinition } from '../../cards/normalization/engineDefinition';
import type { PlayerSetupInput } from '../../engine/setup';
import type { CardDefinitionLookup } from '../../engine/rules/shared';

const LEADER_DON_DECK_SIZE_OVERRIDES: Record<string, number> = {
  'OP15-058': 6,
};

/**
 * Repairs a CardDefinition SNAPSHOT before it reaches the engine.
 *
 * A SavedDeck stores the CardDefinition as it looked when the deck was saved, and a match runs
 * entirely off those snapshots — nothing re-reads the catalog. So a card-data bug fixed later
 * lives on in every deck saved before the fix, and only in those decks, which is exactly how it
 * gets reported: "this one card behaves wrongly and nobody else can reproduce it".
 *
 * The real case: until 2026-08-27 the scraper wrote
 * `hasRush: text.includes('[Rush]') || text.includes('[Rush: Character]')`, so every
 * [Rush: Character] card (OP17-003/027/048/069, EB04-011, OP16-089, ST29-014, ST32-005 …) was
 * saved with full [Rush] and could attack the LEADER on the turn it was played. Re-deriving the
 * printed-keyword flags from the snapshot's own text fixes those decks in place, with no catalog
 * fetch and no migration step. See cards/normalization/printedKeywords.ts.
 *
 * Only DERIVED fields are repaired. Printed values (power, cost, text itself) are left as
 * snapshotted: they are what the player built the deck with, and re-deriving them would need the
 * live catalog.
 */
/**
 * Repair a saved-deck snapshot before it reaches the engine. The rule now
 * lives in cards/normalization so the REPLAY path applies exactly the same
 * repair — see that module's doc comment for why a mismatch is dangerous.
 */
const normalizeSnapshotDefinition = normalizeEngineCardDefinition;

export function resolveLeaderDonDeckSize(leader: CardDefinition, fallback: number): number {
  return LEADER_DON_DECK_SIZE_OVERRIDES[leader.cardNumber] ?? fallback;
}

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
    const definition = normalizeSnapshotDefinition(snapshot.definition);
    for (let i = 0; i < snapshot.quantity; i++) {
      expanded.push(definition);
    }
  }
  return expanded;
}

export function savedDeckToPlayerSetupInput(deck: SavedDeck, playerId: string): PlayerSetupInput {
  const leader = normalizeSnapshotDefinition(deck.leader.definition);
  return {
    playerId,
    leader,
    deck: expandMainDeck(deck),
    donCard: GENERIC_DON_CARD_DEFINITION,
    donDeckSize: resolveLeaderDonDeckSize(leader, deck.donDeckSize),
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
    lookup[deck.leader.definition.cardDefinitionId] = normalizeSnapshotDefinition(deck.leader.definition);
    for (const snapshot of deck.cards) {
      lookup[snapshot.definition.cardDefinitionId] = normalizeSnapshotDefinition(snapshot.definition);
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

/**
 * Built-in default chrome URLs each cosmetic slot falls back to when a deck
 * hasn't chosen an accessory — these are the bundled assets the board has
 * always used (see components/match/CardBackArt.tsx + DonChip.tsx).
 */
export const DEFAULT_MAIN_SLEEVE_URL = '/ui/card-back.png';
export const DEFAULT_DON_SLEEVE_URL = '/ui/don-deck-back.png';
export const DEFAULT_DON_ART_URL = '/ui/don-token.png';

/** Fully-resolved, ready-to-render accessory art for one seat. Display-only, never reaches the engine. */
export interface ResolvedDeckAccessories {
  mainSleeveUrl: string;
  donSleeveUrl: string;
  donArtUrl: string;
}

/**
 * Resolves each deck's cosmetic choices into concrete, seat-keyed art URLs
 * for the board projection — the accessory sibling of buildCardImageLookup.
 * Kept in the app layer (not the engine) because it deals purely in display
 * chrome. Falls back to the bundled default whenever a slot is unset or its
 * snapshotted/looked-up art can't be found, so gameplay always has a usable
 * image (never a broken pile).
 */
export function buildAccessoriesByPlayer(entries: { playerId: string; deck: SavedDeck }[]): Record<string, ResolvedDeckAccessories> {
  const byPlayer: Record<string, ResolvedDeckAccessories> = {};
  for (const { playerId, deck } of entries) {
    const acc = deck.accessories;
    byPlayer[playerId] = {
      mainSleeveUrl: resolveAccessoryImageUrl(acc?.mainSleeve, 'sleeve', DEFAULT_MAIN_SLEEVE_URL),
      donSleeveUrl: resolveAccessoryImageUrl(acc?.donSleeve, 'sleeve', DEFAULT_DON_SLEEVE_URL),
      donArtUrl: resolveAccessoryImageUrl(acc?.donCardArt, 'donArt', DEFAULT_DON_ART_URL),
    };
  }
  return byPlayer;
}
