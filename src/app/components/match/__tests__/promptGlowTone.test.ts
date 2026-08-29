/**
 * The prompt glow on field cards: WHICH cards get it, and what colour.
 *
 * Two separate concerns, both easy to break silently:
 *  - `promptHighlighted` decides the set. It has to include effect targeting
 *    (`resolvingFieldChoice`), which is the one prompt whose candidates can sit
 *    on BOTH boards — and therefore the one where a colour actually carries
 *    information — without disturbing `isPromptWindowMode`, which drives
 *    dimming and treats that mode differently on purpose.
 *  - BoardCardTile's tone table decides the colour. Tailwind only emits classes
 *    it can find verbatim, so these must stay whole literal strings.
 */
import { describe, expect, it } from 'vitest';
import { fieldChoiceDimmed, isPromptWindowMode, promptHighlighted } from '../PlayerBoardPanel';
import type { BoardSelectionMode } from '../useBoardSelection';
import type { CardView } from '../../../../board/projection';

const card = (instanceId: string) => ({ instanceId }) as unknown as CardView;

const fieldChoice = (over: Partial<Extract<BoardSelectionMode, { kind: 'resolvingFieldChoice' }>> = {}): BoardSelectionMode =>
  ({
    kind: 'resolvingFieldChoice',
    candidateInstanceIds: ['mine', 'theirs'],
    selectedIds: [],
    blockedInstanceIds: [],
    ...over,
  }) as BoardSelectionMode;

const blockWindow = (): BoardSelectionMode =>
  ({ kind: 'selectOnOppAttackSource', candidateInstanceIds: ['reactor'] }) as BoardSelectionMode;

describe('which field cards carry the prompt glow', () => {
  it('rings effect-choice candidates on either board', () => {
    expect(promptHighlighted(fieldChoice(), true, card('mine'))).toBe(true);
    expect(promptHighlighted(fieldChoice(), true, card('theirs'))).toBe(true);
  });

  it('leaves a non-candidate alone even during a field choice', () => {
    // `selectable` is the single eligibility answer; false means not pickable.
    expect(promptHighlighted(fieldChoice(), false, card('bystander'))).toBe(false);
  });

  it('still rings the Block-Step windows it always did', () => {
    expect(promptHighlighted(blockWindow(), true)).toBe(true);
    expect(promptHighlighted(blockWindow(), false)).toBe(false);
  });

  it('never rings during idle', () => {
    expect(promptHighlighted({ kind: 'idle' }, true)).toBe(false);
  });

  it('does NOT widen isPromptWindowMode, which drives dimming separately', () => {
    // The regression this guards: folding resolvingFieldChoice into
    // isPromptWindowMode would make fieldChoiceDimmed return !selectable and
    // throw away that mode's own rules for selected / budget-blocked cards.
    expect(isPromptWindowMode(fieldChoice())).toBe(false);
    const picked = fieldChoice({ selectedIds: ['mine'] });
    expect(fieldChoiceDimmed(picked, card('mine'), false)).toBe(false);
    const blocked = fieldChoice({ blockedInstanceIds: ['theirs'] });
    expect(fieldChoiceDimmed(blocked, card('theirs'), false)).toBe(true);
  });
});

describe('what colour it is', () => {
  it('gives own and opponent cards visibly different glows', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync('src/app/components/match/BoardCardTile.tsx', 'utf8'),
    );
    const own = src.match(/own: '([^']+)'/)?.[1] ?? '';
    const opponent = src.match(/opponent: '([^']+)'/)?.[1] ?? '';
    expect(own).not.toBe('');
    expect(opponent).not.toBe('');
    expect(own).not.toBe(opponent);
    // Literal, complete class strings — anything assembled at runtime would
    // compile to no CSS and the glow would just not appear.
    for (const cls of [own, opponent]) {
      expect(cls).toMatch(/^shadow-\[/);
      expect(cls).not.toContain('${');
      // The dark separator is load-bearing: without it a red halo vanishes on
      // a red Leader's mat, and a blue one on a blue mat.
      expect(cls).toContain('rgba(0,0,0,0.65)');
    }
    expect(own).toContain('rgb(125,211,252)');
    expect(opponent).toContain('rgb(253,164,175)');
  });
});
