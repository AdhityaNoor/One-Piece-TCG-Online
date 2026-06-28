/**
 * Effect-parser tests against REAL captured card_text (same strings as
 * api/__fixtures__/sampleApiResponses.ts), so the parser is checked against
 * the actual API shape, not idealized text. The parser is inert: these tests
 * assert STRUCTURE (timing/conditions/draft atoms/needsTemplate), never
 * behavior.
 */
import { describe, expect, it } from 'vitest';
import { parseEffect } from '../parseEffect';

describe('parseEffect', () => {
  it('empty text => no abilities, no-effect-text warning (2-8-5)', () => {
    const r = parseEffect('OP01-024', '   ');
    expect(r.abilities).toHaveLength(0);
    expect(r.needsReview).toBe(false);
    expect(r.warnings.map((w) => w.code)).toContain('no-effect-text');
  });

  it('Leader permanent buff: [DON!! x1][Your Turn] All of your Characters gain +1000 power.', () => {
    const r = parseEffect('OP01-001', '[DON!! x1] [Your Turn] All of your Characters gain +1000 power.');
    expect(r.abilities).toHaveLength(1);
    const a = r.abilities[0];
    expect(a.timing).toBe('custom');
    expect(a.category).toBe('permanent');
    expect(a.donRequirement).toBe(1);
    expect(a.conditions).toEqual(expect.arrayContaining(['donAtLeastX', 'yourTurn']));
    expect(a.actions).toEqual([
      {
        op: 'modifyPower',
        amount: 1000,
        target: { kind: 'allYourCharacters' },
        duration: 'whileConditionMet',
      },
    ]);
    expect(a.needsTemplate).toBe(false);
    expect(r.needsReview).toBe(false);
  });

  it('On Play search effect is recognized as onPlay but flagged needsTemplate (complex body)', () => {
    const text =
      '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 "Straw Hat Crew" type Character card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.  This card has been officially errata\'d.';
    const r = parseEffect('OP01-016', text);
    expect(r.abilities).toHaveLength(1);
    const a = r.abilities[0];
    expect(a.timing).toBe('onPlay');
    expect(a.category).toBe('auto');
    expect(a.actions.some((x) => x.op === 'unrecognized')).toBe(true);
    expect(a.needsTemplate).toBe(true);
    expect(r.needsReview).toBe(true);
    expect(r.warnings.map((w) => w.code)).toContain('errata-note-stripped');
  });

  it('Event with [Counter] and [Trigger] splits into two abilities', () => {
    const text =
      "[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 2 or less Life cards, add up to 1 DON!! card from your DON!! deck and rest it. [Trigger] Add up to 1 DON!! card from your DON!! deck and set it as active.  This card has been officially errata'd.";
    const r = parseEffect('OP01-119', text);
    expect(r.abilities).toHaveLength(2);

    const counter = r.abilities[0];
    expect(counter.timing).toBe('counter');
    expect(counter.isTrigger).toBe(false);
    // +4000 power recognized, "Then, ..." leftover keeps it needing a template.
    const power = counter.actions.find((x) => x.op === 'modifyPower');
    expect(power).toMatchObject({ op: 'modifyPower', amount: 4000, duration: 'thisBattle' });
    expect(counter.needsTemplate).toBe(true);

    const trigger = r.abilities[1];
    expect(trigger.isTrigger).toBe(true);
    expect(trigger.tags).toContain('[Trigger]');
    expect(trigger.needsTemplate).toBe(true);
  });

  it('[DON!! x2] This Character gains [Rush] => grantKeyword Rush on self, reminder stripped', () => {
    const text = '[DON!! x2] This Character gains [Rush](This card can attack on the turn in which it is played.)';
    const r = parseEffect('P-001', text);
    expect(r.abilities).toHaveLength(1);
    const a = r.abilities[0];
    expect(a.donRequirement).toBe(2);
    expect(a.conditions).toContain('donAtLeastX');
    expect(a.actions).toEqual([
      { op: 'grantKeyword', keyword: 'Rush', target: { kind: 'self' }, duration: 'whileConditionMet' },
    ]);
    expect(a.needsTemplate).toBe(false);
    expect(r.warnings.map((w) => w.code)).toContain('reminder-text-stripped');
  });

  it('bare keyword card "[Blocker]" => self-granted permanent keyword, engine-ready', () => {
    const r = parseEffect('TEST-BLOCKER', '[Blocker]');
    expect(r.abilities).toHaveLength(1);
    expect(r.abilities[0].actions).toEqual([
      { op: 'grantKeyword', keyword: 'Blocker', target: { kind: 'self' }, duration: 'permanent' },
    ]);
    expect(r.abilities[0].needsTemplate).toBe(false);
    expect(r.needsReview).toBe(false);
  });

  it('plain draw effect is recognized', () => {
    const r = parseEffect('TEST-DRAW', '[Activate: Main] [Once Per Turn] Draw 1 card.');
    expect(r.abilities).toHaveLength(1);
    const a = r.abilities[0];
    expect(a.timing).toBe('activateMain');
    expect(a.category).toBe('activate');
    expect(a.oncePerTurn).toBe(true);
    expect(a.conditions).toContain('oncePerTurn');
    expect(a.actions).toEqual([{ op: 'draw', amount: 1 }]);
    expect(a.needsTemplate).toBe(false);
  });

  it('output is JSON-serializable (round-trips losslessly)', () => {
    const r = parseEffect('OP01-001', '[DON!! x1] [Your Turn] All of your Characters gain +1000 power.');
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });
});
