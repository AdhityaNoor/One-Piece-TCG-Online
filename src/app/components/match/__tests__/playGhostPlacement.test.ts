/**
 * Landing-ghost placement contract (UI-only; no rules involvement).
 *
 * While a hand card is dragged over your own field, DockHand portals a dimmed
 * BoardCardTile into the real zone element so the preview sits in the exact
 * slot the card will occupy once played. That only holds if nothing else is
 * sharing the row: the Character Area's empty-state watermark is a real flex
 * item, and because the row centres its children as a group, leaving it in
 * flow pushed the ghost off the true slot and showed the label through the
 * dimmed card.
 *
 * The fix spans two files — a data hook in the markup and a :has() rule in the
 * stylesheet — so this test pins both ends together: deleting either half
 * silently reintroduces the misplacement, which no rendering test can catch
 * (jsdom does not evaluate :has() against stylesheets).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..', '..');
const panel = readFileSync(join(root, 'components', 'match', 'PlayerBoardPanel.tsx'), 'utf8');
const css = readFileSync(join(root, 'styles', 'index.css'), 'utf8');

describe('landing-ghost placement', () => {
  it('marks the Character Area empty-state watermark so the ghost can displace it', () => {
    expect(panel).toContain('data-zone-empty-hint="characterArea"');
  });

  it('hides that watermark while a ghost is portalled into the Character Area', () => {
    expect(css).toContain(
      "[data-board-zone='characterArea']:has([data-play-ghost]) [data-zone-empty-hint]",
    );
  });

  it('still replaces the whole Stage slot, which holds only one card', () => {
    expect(css).toContain(
      "[data-board-zone='stageArea']:has([data-play-ghost]) > :not([data-play-ghost])",
    );
  });

  it('keeps the ghost wrapper geometrically identical to a played card', () => {
    // HoverableFieldCard's box; the ghost only adds pointer-events-none and
    // the dimming, so it lands in the same slot at the same size.
    expect(panel).toContain('className="flex h-full flex-shrink-0 items-center justify-center"');
  });
});
