import { describe, expect, it } from 'vitest';
import {
  cleanSleeveName,
  coerceDeckAccessories,
  defaultDeckAccessories,
  findSleeveOption,
  normalizeSleeveProduct,
  parsePackSize,
  resolveAccessoryImageUrl,
  selectionFromOption,
  SLEEVE_CATALOG,
  tcgSleeveImageUrls,
  DON_ART_CATALOG,
} from '../index';

describe('sleeve normalization', () => {
  it('derives grid + full-res CDN image URLs from a product id, no detail-page scrape', () => {
    expect(tcgSleeveImageUrls(552134)).toEqual({
      thumbnailUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/552134.jpg',
      imageUrl: 'https://product-images.tcgplayer.com/fit-in/1000x1000/552134.jpg',
    });
  });

  it('strips product-line boilerplate + pack-size suffix from the display name', () => {
    expect(cleanSleeveName('One Piece Card Game Official Sleeves - Buggy (10-Pack)')).toBe('Buggy');
    expect(cleanSleeveName('One Piece Card Game Official Limited Sleeves - Uta (10-Pack)')).toBe('Uta');
    expect(cleanSleeveName('One Piece Card Game Official Sleeves: Assortment 7 - Whitebeard (70-Pack)')).toBe('Assortment 7 - Whitebeard');
  });

  it('parses pack size when present, undefined otherwise', () => {
    expect(parsePackSize('Buggy (10-Pack)')).toBe(10);
    expect(parsePackSize('Kaido (70-Pack)')).toBe(70);
    expect(parsePackSize('Kaido')).toBeUndefined();
  });

  it('produces a stable, catalog-unique normalized option', () => {
    const option = normalizeSleeveProduct({ productId: 552134, name: 'One Piece Card Game Official Sleeves - Buggy (10-Pack)' });
    expect(option).toEqual({
      id: 'sleeve-tcg-552134',
      kind: 'sleeve',
      name: 'Buggy',
      source: 'tcgplayer',
      imageUrl: 'https://product-images.tcgplayer.com/fit-in/1000x1000/552134.jpg',
      thumbnailUrl: 'https://product-images.tcgplayer.com/fit-in/437x437/552134.jpg',
    });
  });
});

describe('sleeve catalog', () => {
  it('has unique, non-empty option ids and looks up by id', () => {
    const ids = SLEEVE_CATALOG.map((o) => o.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(findSleeveOption('sleeve-tcg-552134')?.name).toBe('Buggy');
    expect(findSleeveOption('nope')).toBeUndefined();
    expect(findSleeveOption(null)).toBeUndefined();
  });
});

describe('deck accessories model', () => {
  it('defaults every slot to "use built-in" (null)', () => {
    const acc = defaultDeckAccessories();
    expect(acc.mainSleeve).toEqual({ optionId: null, imageUrl: null, label: null });
    expect(acc.donSleeve.optionId).toBeNull();
    expect(acc.donCardArt.optionId).toBeNull();
  });

  it('snapshots a chosen option BY VALUE so the deck stays stable if the catalog changes', () => {
    const option = SLEEVE_CATALOG[0];
    const selection = selectionFromOption(option);
    expect(selection).toEqual({ optionId: option.id, imageUrl: option.imageUrl, label: option.name });
    // null option -> reset to default.
    expect(selectionFromOption(null)).toEqual({ optionId: null, imageUrl: null, label: null });
  });

  it('resolves the image URL preferring snapshot, then catalog, then built-in default', () => {
    const builtIn = '/ui/card-back.png';
    // Unset slot -> built-in default.
    expect(resolveAccessoryImageUrl({ optionId: null, imageUrl: null, label: null }, 'sleeve', builtIn)).toBe(builtIn);
    // Snapshotted url wins.
    expect(resolveAccessoryImageUrl({ optionId: 'sleeve-tcg-552134', imageUrl: 'https://snap/x.jpg', label: 'Buggy' }, 'sleeve', builtIn)).toBe('https://snap/x.jpg');
    // Missing snapshot url -> fresh catalog lookup by id.
    const buggy = findSleeveOption('sleeve-tcg-552134')!;
    expect(resolveAccessoryImageUrl({ optionId: 'sleeve-tcg-552134', imageUrl: null, label: null }, 'sleeve', builtIn)).toBe(buggy.imageUrl);
    // Unknown id with no snapshot -> built-in default (never a broken image).
    expect(resolveAccessoryImageUrl({ optionId: 'gone', imageUrl: null, label: null }, 'sleeve', builtIn)).toBe(builtIn);
  });

  it('coerces malformed persisted data back to a valid, all-default block', () => {
    expect(coerceDeckAccessories(null)).toEqual(defaultDeckAccessories());
    expect(coerceDeckAccessories({ mainSleeve: 42, donSleeve: 'x' })).toEqual(defaultDeckAccessories());
    // Valid slots are preserved; invalid ones defaulted.
    const good = selectionFromOption(SLEEVE_CATALOG[0]);
    const mixed = coerceDeckAccessories({ mainSleeve: good, donSleeve: 'bad', donCardArt: undefined });
    expect(mixed.mainSleeve).toEqual(good);
    expect(mixed.donSleeve.optionId).toBeNull();
    expect(mixed.donCardArt.optionId).toBeNull();
  });
});

describe('DON art catalog (placeholder)', () => {
  it('exposes exactly the bundled default option today', () => {
    expect(DON_ART_CATALOG).toHaveLength(1);
    expect(DON_ART_CATALOG[0]).toMatchObject({ id: 'don-art-default', kind: 'donArt', imageUrl: '/ui/don-token.png' });
  });
});
