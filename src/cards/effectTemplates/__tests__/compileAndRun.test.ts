/**
 * End-to-end: card TEXT is compiled to IR, then the engine's generic
 * interpreter runs it. No per-card code is involved — every behavior below
 * comes from the same compiler + interpreter. (Rules: 8-1-3-1 [On Play],
 * 8-1-3-3 statics, 6-3 draw, 6-5-5 give DON!!, 8-4-4 choices.)
 */
import { describe, expect, it } from 'vitest';
import { createSampleGameState } from '../../../engine/state/__fixtures__/sampleGameState';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import { fireOnPlay, resumeChoice } from '../../../engine/effects';
import { compileRegistry } from '../programs';
import type { CardInstance, CardDefinition } from '../../../engine/state/card';
import type { GameState } from '../../../engine/state/game';

const CATALOG = [
  { cardNumber: 'OP04-045', effectText: '[On Play] Draw 1 card.' },
  { cardNumber: 'ST01-013', effectText: '[DON!! x1] This Character gains +1000 power.' },
  { cardNumber: 'ST21-002', effectText: "[DON!! x2] [Opponent's Turn] This Character gains +2000 power." },
  { cardNumber: 'ST15-002', effectText: '[On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.' },
];
const registry = compileRegistry(CATALOG);

function def(cardNumber: string, basePower: number): CardDefinition {
  return { cardDefinitionId: cardNumber, name: cardNumber, category: 'character', colors: ['red'], types: [], basePower, text: '', hasTrigger: false, hasRush: false, hasBlocker: false, hasDoubleAttack: false, isUnblockable: false, cardNumber };
}
function inst(id: string, cardNumber: string, zone: CardInstance['currentZone'], owner: string, extra: Partial<CardInstance> = {}): CardInstance {
  return { instanceId: id, cardDefinitionId: cardNumber, ownerId: owner, controllerId: owner, currentZone: zone, orientation: 'active', faceState: 'faceUp', donAttached: [], appliedContinuousEffectIds: [], oncePerTurnUsed: [], summoningSick: false, revealedTo: 'all', ...extra };
}
function place(state: GameState, i: CardInstance): GameState {
  const p = state.players[i.ownerId];
  return { ...state, cardsById: { ...state.cardsById, [i.instanceId]: i }, players: { ...state.players, [i.ownerId]: { ...p, characterArea: { ...p.characterArea, cardIds: [...p.characterArea.cardIds, i.instanceId] } } } };
}

describe('compiler', () => {
  it('lowers all four catalog cards to programs', () => {
    expect(Object.keys(registry).sort()).toEqual(['OP04-045', 'ST01-013', 'ST15-002', 'ST21-002']);
  });
});

describe('interpreter runs the compiled IR', () => {
  it('OP04-045 [On Play] draws 1', () => {
    let s = createSampleGameState();
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1, deck: { ...s.players.p1.deck, cardIds: ['d0', 'd1'] } } }, cardsById: { ...s.cardsById, d0: inst('d0', 'F', 'deck', 'p1'), d1: inst('d1', 'F', 'deck', 'p1') } };
    s = place(s, inst('king', 'OP04-045', 'characterArea', 'p1'));
    const r = fireOnPlay(s, 'king', registry, 'a');
    expect(r.state.players.p1.hand.cardIds).toEqual(['d0']);
  });

  it('ST01-013 self +1000 gated by [DON!! x1]', () => {
    const defs = { 'ST01-013': def('ST01-013', 5000) };
    let s = place(createSampleGameState(), inst('zoro', 'ST01-013', 'characterArea', 'p1'));
    s = fireOnPlay(s, 'zoro', registry, 'a').state;
    expect(computeCurrentPower(defs, s, 'zoro')).toBe(5000);
    const withDon = { ...s, cardsById: { ...s.cardsById, zoro: { ...s.cardsById.zoro, donAttached: ['x'] } } };
    expect(computeCurrentPower(defs, withDon, 'zoro')).toBe(7000); // 5000 + 1000 DON + 1000 effect
  });

  it("ST21-002 +2000 only on opponent's turn with 2 DON", () => {
    const defs = { 'ST21-002': def('ST21-002', 3000) };
    let s = place(createSampleGameState(), inst('u', 'ST21-002', 'characterArea', 'p2', { donAttached: ['a', 'b'] }));
    s = fireOnPlay(s, 'u', registry, 'a').state; // activePlayer is p1 => opponent's turn for p2
    expect(computeCurrentPower(defs, s, 'u')).toBe(7000);
    expect(computeCurrentPower(defs, { ...s, activePlayerId: 'p2' }, 'u')).toBe(5000);
  });

  it('ST15-002 [On Play] give up to 1 DON!! — choice then resume', () => {
    let s = createSampleGameState();
    s = { ...s, cardsById: { ...s.cardsById, don1: inst('don1', 'DON', 'costArea', 'p1', { orientation: null, donRested: false }) }, players: { ...s.players, p1: { ...s.players.p1, costArea: { ...s.players.p1.costArea, cardIds: ['don1'] } } } };
    s = place(s, inst('ed', 'ST15-002', 'characterArea', 'p1'));
    const played = fireOnPlay(s, 'ed', registry, 'a');
    expect(played.pendingChoices).toHaveLength(1);
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['p1-leader', 'ed']);
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['p1-leader'], registry, 'b');
    expect(resumed.state.cardsById['p1-leader'].donAttached).toEqual(['don1']);
    expect(resumed.state.cardsById.don1.donRested).toBe(true);
  });
});
