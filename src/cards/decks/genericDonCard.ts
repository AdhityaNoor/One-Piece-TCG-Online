/**
 * The single generic DON!! `CardDefinition` used to mint every match's
 * DON!! deck (5-1-2: "a DON!! deck of 10 DON!! cards").
 *
 * Why this exists instead of normalizing a real API row:
 * `SavedDeck` deliberately has no DON!! `SavedDeckCardSnapshot` — see
 * savedDeck.ts: "DON!! deck is always 10 generic DON!! cards per 5-1-2 — no
 * per-deck DON!! selection exists in the rules, so nothing to snapshot here
 * beyond the constant." `PlayerSetupInput.donCard` (engine/setup/setupInput.ts)
 * still requires SOME `CardDefinition` to mint 10 `CardInstance`s from
 * (engine/setup/createPreGameState.ts), which leaves a gap between what
 * SavedDeck stores and what setup needs.
 *
 * The OPTCG API does expose real DON!! rows (GET /api/allDonCards/, see
 * cards/api/types.ts's `DonCardDto`, normalized by
 * cards/normalization/normalizeCardPrinting.ts's `normalizeDonCard`), but
 * fetching one at MATCH-START time would (a) require network access just to
 * start an otherwise fully local hotseat match, breaking requirement #10
 * ("support future offline/local deck loading"), and (b) pick one arbitrary
 * cosmetic DON!! printing among several for a card that has no
 * rules-relevant identity beyond "a DON!! card" at this implementation
 * milestone (card effects are fully stubbed — see project decision "stub
 * everything" — so even a DON!! variant with printed text would behave
 * identically to a blank one).
 *
 * KNOWN LIMITATION (deliberate placeholder, not a normalized API row): once
 * a real per-deck or per-set DON!! choice ever matters mechanically, replace
 * this constant with a SavedDeck-snapshotted DON!! card normalized the same
 * way every other card already is (definition + rawPrinting), exactly like
 * `SavedDeckCardSnapshot` does today for Leader/Character/Event/Stage.
 */
import type { CardDefinition } from '../../engine/state/card';

export const GENERIC_DON_CARD_DEFINITION: CardDefinition = {
  cardDefinitionId: 'DON-GENERIC',
  name: 'DON!!',
  category: 'don',
  colors: [],
  types: [],
  text: '',
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'DON-GENERIC',
};
