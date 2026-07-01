import { describe, expect, it } from 'vitest';
import { parseCardPage } from '../../../../scripts/scrape-limitless/parseCardPage';

describe('Limitless parseCardPage', () => {
  it('parses the card type row instead of the following illustrator credit', () => {
    const html = `
      <main>
        <div class="card-text">
          <div class="card-text-section">
            <div class="card-text-title">
              <a class="card-text-name">Laffitte</a>
              <span class="card-text-id">OP09-095</span>
            </div>
            <div class="card-text-type">Character • Black • 1 Cost</div>
          </div>
          <p class="card-text-section">1000 Power • Strike • +1000 Counter</p>
          <div class="card-text-section">
            [Activate: Main] You may rest 1 of your DON!! cards and this Character:
            Look at 5 cards from the top of your deck; reveal up to 1
            <a href="/cards?q=type:Blackbeard%20Pirates">{Blackbeard Pirates}</a>
            type card and add it to your hand.
          </div>
          <div class="card-text-section">Blackbeard Pirates</div>
          <div class="card-text-section">Illustrated by <a href="/cards?q=artist:Suzume">Suzume Muraichi</a></div>
          <div class="card-text-section">Block 3</div>
        </div>
      </main>
    `;

    const parsed = parseCardPage(html, 'OP09-095');

    expect(parsed.types).toEqual(['Blackbeard Pirates']);
    expect(parsed.effectText).toContain('Look at 5 cards');
    expect(parsed.effectText).not.toContain('Illustrated by');
  });
});
