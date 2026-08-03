/**
 * `DeckAccessories` — the cosmetic-choice slot embedded on every SavedDeck
 * (see savedDeck.ts). Three independent slots:
 *  - `mainSleeve`: art shown behind the main deck, life pile, and hand
 *    (gameplay's navy CardBackArt).
 *  - `donSleeve`:  art shown behind the DON!! deck (gameplay's teal CardBackArt).
 *  - `donCardArt`: the DON!! card face art (gameplay's DON token).
 *
 * SNAPSHOT-BY-VALUE, deliberately (project requirement #4, "must not break if
 * the [provider/catalog] changes later"): each slot stores not just the
 * catalog `optionId` but also the resolved `imageUrl` and `label` captured at
 * selection time. So a saved deck renders its chosen sleeve offline and
 * unchanged even if that product later vanishes from, or is renumbered in,
 * the sleeve catalog. `optionId` is kept alongside purely so the gallery can
 * re-highlight the current pick and so a future migration could re-resolve
 * fresh art if desired — never required for correctness.
 *
 * `optionId: null` (the default for every slot) means "use the game's
 * built-in default chrome" — resolution falls back to the bundled
 * `/ui/*.png` assets. This is why a v2 deck with no accessories at all
 * migrates forward trivially (see savedDeck.ts migrate path): all-null ==
 * "everything default", which is exactly today's behavior.
 *
 * Plain JSON only. Like the rest of SavedDeck, this carries ZERO
 * effect/rules data — it is cosmetic identity only.
 */
import { findDonArtOption } from './donArtCatalog';
import { findSleeveOption } from './sleeveCatalog';
import type { AccessoryOption } from './types';

/** One chosen (or defaulted) cosmetic slot. */
export interface DeckAccessorySelection {
  /** Catalog option id, or null to use the game's built-in default for this slot. */
  optionId: string | null;
  /** Art URL snapshotted at selection time, so the deck renders even if the catalog changes/loses this option. Null when defaulted. */
  imageUrl: string | null;
  /** Display label snapshotted at selection time. Null when defaulted. */
  label: string | null;
}

export interface DeckAccessories {
  mainSleeve: DeckAccessorySelection;
  donSleeve: DeckAccessorySelection;
  donCardArt: DeckAccessorySelection;
}

/** The "use built-in default" selection — an unset slot. */
export const DEFAULT_ACCESSORY_SELECTION: DeckAccessorySelection = {
  optionId: null,
  imageUrl: null,
  label: null,
};

/** A fully-default accessories block — what a brand-new or pre-v3 deck gets. */
export function defaultDeckAccessories(): DeckAccessories {
  return {
    mainSleeve: { ...DEFAULT_ACCESSORY_SELECTION },
    donSleeve: { ...DEFAULT_ACCESSORY_SELECTION },
    donCardArt: { ...DEFAULT_ACCESSORY_SELECTION },
  };
}

/** Builds a snapshot selection from a chosen catalog option (or the default when option is null). */
export function selectionFromOption(option: AccessoryOption | null): DeckAccessorySelection {
  if (!option) return { ...DEFAULT_ACCESSORY_SELECTION };
  return { optionId: option.id, imageUrl: option.imageUrl, label: option.name };
}

/**
 * Resolves the image URL a slot should actually render, preferring the
 * snapshotted `imageUrl`, then a fresh catalog lookup by id, then the
 * provided built-in default. Never throws; always returns a usable string.
 */
export function resolveAccessoryImageUrl(
  selection: DeckAccessorySelection | undefined,
  kind: 'sleeve' | 'donArt',
  builtInDefaultUrl: string,
): string {
  if (!selection || selection.optionId === null) return builtInDefaultUrl;
  if (selection.imageUrl) return selection.imageUrl;
  const option = kind === 'sleeve' ? findSleeveOption(selection.optionId) : findDonArtOption(selection.optionId);
  return option?.imageUrl ?? builtInDefaultUrl;
}

/** Type guard for a single stored selection — used by schema migration to accept/repair persisted data. */
export function isDeckAccessorySelection(value: unknown): value is DeckAccessorySelection {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const optionIdOk = v.optionId === null || typeof v.optionId === 'string';
  const imageUrlOk = v.imageUrl === null || typeof v.imageUrl === 'string';
  const labelOk = v.label === null || typeof v.label === 'string';
  return optionIdOk && imageUrlOk && labelOk;
}

/** Coerces arbitrary persisted data into a valid DeckAccessories, backfilling any missing/invalid slot with the default. */
export function coerceDeckAccessories(value: unknown): DeckAccessories {
  const base = defaultDeckAccessories();
  if (typeof value !== 'object' || value === null) return base;
  const v = value as Record<string, unknown>;
  return {
    mainSleeve: isDeckAccessorySelection(v.mainSleeve) ? v.mainSleeve : base.mainSleeve,
    donSleeve: isDeckAccessorySelection(v.donSleeve) ? v.donSleeve : base.donSleeve,
    donCardArt: isDeckAccessorySelection(v.donCardArt) ? v.donCardArt : base.donCardArt,
  };
}
