/**
 * Tests for the expanded recognizer engine: sentence-splitting, "You may"
 * optionality, "If …" conditionality, the K.O.-abbreviation guard, multi-
 * ability segmentation, and the structured HINT ops. All assertions are about
 * inert STRUCTURE, never executed behavior.
 */
import { describe, expect, it } from 'vitest';
import { parseEffect } from '../parseEffect';
import { parseActions } from '../parseActions';

describe('count-clearing recognizers', () => {
  it('plain multi-sentence of recognized atoms clears review', () => {
    const r = parseEffect('T-1', '[Activate: Main] Draw 2 cards. This Character gains +1000 power.');
    expect(r.needsReview).toBe(false);
    const ops = r.abilities[0].actions.map((a) => a.op).sort();
    expect(ops).toEqual(['draw', 'modifyPower']);
  });

  it('"You may draw 1 card." → optional draw, still cleared', () => {
    const r = parseEffect('T-2', '[Activate: Main] You may draw 1 card.');
    expect(r.needsReview).toBe(false);
    expect(r.abilities[0].actions).toEqual([{ op: 'draw', amount: 1, optional: true }]);
  });

  it('a leading "If …" precondition forces needsReview (condition not dropped)', () => {
    const r = parseEffect('T-3', '[On Play] If you have 4 or more DON!! cards, draw 1 card.');
    expect(r.needsReview).toBe(true);
    const draw = r.abilities[0].actions.find((a) => a.op === 'draw');
    expect(draw).toMatchObject({ op: 'draw', amount: 1, conditional: true, needsReview: true });
  });

  it('accepts "draw a card" (word number)', () => {
    expect(parseActions('Draw a card.', false)).toEqual([{ op: 'draw', amount: 1 }]);
  });
});

describe('hint ops (recognized verb, always needsReview)', () => {
  it('K.O. with a trailing restriction → ko hint, flagged', () => {
    const r = parseEffect('T-4', "[On Play] K.O. up to 1 of your opponent's Characters with a cost of 2 or less.");
    expect(r.needsReview).toBe(true);
    const ko = r.abilities[0].actions.find((a) => a.op === 'ko');
    expect(ko).toMatchObject({ op: 'ko', amount: 1, needsReview: true });
    expect((ko as { target: { kind: string } }).target.kind).toBe('opponentCharacters');
  });

  it('does NOT fragment or false-match "cannot be K.O.\'d"', () => {
    const actions = parseActions("This Character cannot be K.O.'d in battle.", false);
    expect(actions).toHaveLength(1);
    expect(actions[0].op).toBe('unrecognized');
    expect(actions.some((a) => a.op === 'ko')).toBe(false);
  });

  it('"the rest" (remainder) does not match the rest-Character recognizer', () => {
    const actions = parseActions('Place the rest at the bottom of your deck.', false);
    expect(actions.every((a) => a.op !== 'rest')).toBe(true);
  });
});

describe('ability segmentation', () => {
  it('permanent effect + [Activate: Main] split into two abilities', () => {
    const r = parseEffect('T-5', "[DON!! x2] This Character cannot be K.O.'d in battle. [Activate: Main] Draw 1 card.");
    expect(r.abilities).toHaveLength(2);
    expect(r.abilities[0].timing).toBe('custom');
    expect(r.abilities[0].conditions).toContain('donAtLeastX');
    expect(r.abilities[1].timing).toBe('activateMain');
    expect(r.abilities[1].actions).toEqual([{ op: 'draw', amount: 1 }]);
  });

  it('leading condition-only tags still merge forward into one ability', () => {
    const r = parseEffect('T-6', '[Once Per Turn] [On Play] Draw 1 card.');
    expect(r.abilities).toHaveLength(1);
    expect(r.abilities[0].timing).toBe('onPlay');
    expect(r.abilities[0].oncePerTurn).toBe(true);
  });
});
