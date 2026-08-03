/**
 * Loads the cosmetic-accessory catalog (sleeves + DON!! arts) that the
 * Accessories screen browses. The authoritative catalog is MASTER DATA in
 * MongoDB with images in Vercel Blob (server GET /accessories); this store
 * fetches it once and exposes it to the UI.
 *
 * Fallback (offline / no backend): starts from — and keeps — the bundled
 * static catalog (SLEEVE_CATALOG from sleeveProducts.json + the default DON!!
 * art). If the server returns rows they REPLACE the fallback for that kind;
 * if it returns nothing (no backend, error, empty), the static fallback
 * stays, so the feature always works.
 *
 * On a successful load it also registers the options into cards/accessories'
 * catalogRegistry, so a saved deck that stored only an optionId (no snapshot
 * URL) re-resolves to the live Blob art in gameplay too.
 */
import { create } from 'zustand';
import {
  accessoryOptionFromPublic,
  setRegisteredAccessories,
  DON_ART_CATALOG,
  DEFAULT_DON_ART_OPTION,
  SLEEVE_CATALOG,
  type AccessoryOption,
} from '../../cards/accessories';
import { fetchAccessoryCatalog } from '../../multiplayer/net/accessoryClient';

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface AccessoryCatalogState {
  sleeves: AccessoryOption[];
  donArts: AccessoryOption[];
  status: LoadStatus;
  /** Whether the current lists came from the server (true) or are the bundled fallback (false). */
  fromServer: boolean;
  /** Fetches the server catalog once; safe to call repeatedly (no-op while loading/loaded). */
  load(): Promise<void>;
}

export const useAccessoryCatalogStore = create<AccessoryCatalogState>((set, get) => ({
  sleeves: SLEEVE_CATALOG,
  donArts: DON_ART_CATALOG,
  status: 'idle',
  fromServer: false,

  load: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'loaded') return;
    set({ status: 'loading' });

    const rows = await fetchAccessoryCatalog();
    if (rows.length === 0) {
      // No backend / empty / error — keep the bundled fallback already in state.
      set({ status: 'loaded' });
      return;
    }

    const options = rows.map(accessoryOptionFromPublic);
    const serverSleeves = options.filter((o) => o.kind === 'sleeve');
    const serverDonArts = options.filter((o) => o.kind === 'donArt');

    // Always keep the bundled default DON!! art selectable, even if the server
    // only returns alternates.
    const donArts = serverDonArts.some((o) => o.id === DEFAULT_DON_ART_OPTION.id)
      ? serverDonArts
      : [DEFAULT_DON_ART_OPTION, ...serverDonArts];

    const sleeves = serverSleeves.length > 0 ? serverSleeves : get().sleeves;

    setRegisteredAccessories(sleeves, donArts);
    set({ sleeves, donArts, status: 'loaded', fromServer: true });
  },
}));
