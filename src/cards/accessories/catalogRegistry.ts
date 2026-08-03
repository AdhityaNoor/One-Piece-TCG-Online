/**
 * Tiny mutable registry of the accessory options currently LOADED from the
 * server (MongoDB master data). Decks snapshot their chosen art by value, so
 * this is only consulted for the rare by-id re-resolution path
 * (resolveAccessoryImageUrl) — but registering the loaded catalog here means
 * a deck that stored only an optionId (no snapshot URL) still resolves to the
 * live Blob art after the catalog loads, not just to the static fallback.
 *
 * The app store (src/app/store/accessoryCatalogStore.ts) calls
 * `setRegisteredAccessories` once the server catalog arrives. findSleeveOption
 * / findDonArtOption check here first, then fall back to the bundled static
 * lists.
 */
import type { AccessoryOption } from './types';

let registeredSleeves: AccessoryOption[] = [];
let registeredDonArts: AccessoryOption[] = [];

export function setRegisteredAccessories(sleeves: AccessoryOption[], donArts: AccessoryOption[]): void {
  registeredSleeves = sleeves;
  registeredDonArts = donArts;
}

export function registeredSleeveById(optionId: string): AccessoryOption | undefined {
  return registeredSleeves.find((option) => option.id === optionId);
}

export function registeredDonArtById(optionId: string): AccessoryOption | undefined {
  return registeredDonArts.find((option) => option.id === optionId);
}
