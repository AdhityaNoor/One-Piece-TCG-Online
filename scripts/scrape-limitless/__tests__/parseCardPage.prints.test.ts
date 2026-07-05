/**
 * Tests for the alternate-art (prints) extraction added to parseCardPage:
 * og:image (authoritative per-print image URL), the prints-table ?v=N params,
 * the current-print label/kind, and the illustrator credit.
 *
 * The HTML fixtures mirror the real Limitless card-page structure (.card-text,
 * .card-text-*, .card-prints-current, og:image meta, prints-table anchors).
 */
import { describe, expect, it } from 'vitest';
import { parseCardPage, _internals } from '../parseCardPage';

const { ogImageUrl, extractVariantParams, printKindFromLabel } = _internals;

/** Minimal but structurally faithful base-print page (OP01-016, with 7 alt arts linked). */
function basePageHtml(): string {
  return `<!doctype html><html><head>
    <meta property="og:image" content="https://cdn.example/one-piece/OP01/OP01-016_EN.webp">
  </head><body>
    <div class="card-text">
      <div class="card-text-section">
        <div class="card-text-title">
          <span class="card-text-name">Nami</span>
          <span class="card-text-id">OP01-016</span>
        </div>
      </div>
      <p class="card-text-type">Character • Red • 1 Cost</p>
      <p class="card-text-section">2000 Power • Special • +1000 Counter</p>
      <div class="card-text-section">[On Play] Look at 5 cards from the top of your deck.</div>
      <div class="card-text-section">Straw Hat Crew</div>
    </div>
    <div class="card-prints">
      <div class="card-prints-current">Romance Dawn (OP01) Rare</div>
      <a href="/cards/en/OP01-016?v=1">Romance Dawn aa</a>
      <a href="/cards/en/OP01-016?v=2">Premium Card Collection</a>
      <a href="/cards/en/OP01-016?v=3">Ultra Deck</a>
      <a href="/cards/en/OP01-016?v=7">The Best manga</a>
    </div>
  </body></html>`;
}

/** Alternate-art print page (?v=1): different og:image, "Alternate Art" label, illustrator credit. */
function altPageHtml(): string {
  return `<!doctype html><html><head>
    <meta property="og:image" content="https://cdn.example/one-piece/OP01/OP01-016_p1_EN.webp">
  </head><body>
    <div class="card-text">
      <div class="card-text-section">
        <div class="card-text-title">
          <span class="card-text-name">Nami</span>
          <span class="card-text-id">OP01-016</span>
        </div>
      </div>
      <p class="card-text-type">Character • Red • 1 Cost</p>
      <p class="card-text-section">2000 Power • Special • +1000 Counter</p>
      <div class="card-text-section">[On Play] Look at 5 cards from the top of your deck.</div>
      <div class="card-text-section">Straw Hat Crew</div>
      <div class="card-text-section">Illustrated by Sunohara</div>
    </div>
    <div class="card-prints">
      <div class="card-prints-current">Romance Dawn (OP01) Alternate Art</div>
      <a href="/cards/en/OP01-016">Romance Dawn</a>
      <a href="/cards/en/OP01-016?v=2">Premium Card Collection</a>
    </div>
  </body></html>`;
}

describe('parseCardPage prints/alt-art extraction', () => {
  it('reads og:image, prints-table variant params, and print label from the base page', () => {
    const parsed = parseCardPage(basePageHtml(), 'OP01-016');
    expect(parsed.ogImage).toBe('https://cdn.example/one-piece/OP01/OP01-016_EN.webp');
    expect(parsed.variantParams).toEqual([1, 2, 3, 7]);
    expect(parsed.printLabel).toBe('Romance Dawn (OP01) Rare');
    expect(parsed.printKind).toBe('Rare');
    expect(parsed.illustrator).toBeNull();
  });

  it('reads the alternate-art image, "Alternate Art" kind, and illustrator from a ?v=N page', () => {
    const parsed = parseCardPage(altPageHtml(), 'OP01-016');
    expect(parsed.ogImage).toBe('https://cdn.example/one-piece/OP01/OP01-016_p1_EN.webp');
    expect(parsed.printKind).toBe('Alternate Art');
    expect(parsed.illustrator).toBe('Sunohara');
    // The base print (no ?v) and the other alt (?v=2) are linked; this page's own v=1 is not.
    expect(parsed.variantParams).toEqual([2]);
  });

  it('printKindFromLabel strips the "Set (ID)" prefix', () => {
    expect(printKindFromLabel('Romance Dawn (OP01) Alternate Art')).toBe('Alternate Art');
    expect(printKindFromLabel('One Piece The Best (PRB01) Special Card')).toBe('Special Card');
    expect(printKindFromLabel(null)).toBeNull();
  });

  it('extractVariantParams dedupes and sorts, ignoring non-card v= links', () => {
    const html = `<a href="/cards/en/OP01-016?v=3">a</a><a href="/cards/en/OP01-016?v=1">b</a>
      <a href="/cards/en/OP01-016?v=1">dup</a><a href="/other?v=9">ignore</a>`;
    const doc = new (require('jsdom').JSDOM)(html).window.document;
    expect(extractVariantParams(doc)).toEqual([1, 3]);
  });

  it('ogImageUrl falls back to twitter:image when og:image is absent', () => {
    const doc = new (require('jsdom').JSDOM)(
      `<head><meta name="twitter:image" content="https://cdn.example/x_EN.webp"></head>`,
    ).window.document;
    expect(ogImageUrl(doc)).toBe('https://cdn.example/x_EN.webp');
  });
});
