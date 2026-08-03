/**
 * DON!! card-art catalog — PLACEHOLDER (user decision: "wire the slot +
 * gallery, seed with the default DON art, mark the real catalog TODO").
 *
 * The DON!! card face shown in play is currently the single bundled
 * `/ui/don-token.png` chrome (see components/match/DonChip.tsx). This catalog
 * exposes exactly that one option so the Accessories gallery has a valid,
 * selectable DON-art slot today without pretending to offer choices that
 * don't exist yet.
 *
 * TODO (needs data source): populate real alternate DON!! arts. The intended
 * source is the OPTCG API's DON!! rows (GET /api/allDonCards/, see
 * cards/api/types.ts `DonCardDto`, already normalizable via
 * cards/normalization normalizeDonCard) — each is a real cosmetic DON!!
 * printing with its own `card_image`. When that lands, map those rows to
 * AccessoryOption via a `normalizeDonArtOption` (source: 'optcg-api') and
 * append here; DeckAccessories already snapshots the chosen option by value,
 * so no schema change or deck migration is required to add them.
 */
import { registeredDonArtById } from './catalogRegistry';
import type { AccessoryOption } from './types';

/** The always-present bundled default DON art (matches gameplay's `/ui/don-token.png`). */
export const DEFAULT_DON_ART_OPTION: AccessoryOption = {
  id: 'don-art-default',
  kind: 'donArt',
  name: 'Classic DON!!',
  source: 'bundled',
  imageUrl: '/ui/don-token.png',
  thumbnailUrl: '/ui/don-token.png',
};

export const DON_ART_CATALOG: AccessoryOption[] = [DEFAULT_DON_ART_OPTION];

export function findDonArtOption(optionId: string | null | undefined): AccessoryOption | undefined {
  if (!optionId) return undefined;
  return registeredDonArtById(optionId) ?? DON_ART_CATALOG.find((option) => option.id === optionId);
}
