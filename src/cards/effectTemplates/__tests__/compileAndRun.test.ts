/**
 * End-to-end: card TEXT is compiled to IR, then the engine's generic
 * interpreter runs it. No per-card code is involved. (Rules: 8-1-3-1 [On Play],
 * 8-1-3-3 statics, 6-3 draw, 6-5-5 give DON!!, 7-1-4-1-2 K.O., 8-4-4 choices.)
 */
import { describe, expect, it } from 'vitest';
import { createSampleGameState } from '../../../engine/state/__fixtures__/sampleGameState';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import { fireOnPlay, resumeChoice } from '../../../engine/effects';
import { compileEffect } from '../compile';
import { compileRegistry } from '../programs';
import type { CardInstance, CardDefinition } from '../../../engine/state/card';
import type { GameState } from '../../../engine/state/game';

const CATALOG = [
  { cardNumber: 'OP04-045', effectText: '[On Play] Draw 1 card.' },
  { cardNumber: 'ST01-013', effectText: '[DON!! x1] This Character gains +1000 power.' },
  { cardNumber: 'ST21-002', effectText: "[DON!! x2] [Opponent's Turn] This Character gains +2000 power." },
  { cardNumber: 'ST15-002', effectText: '[On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.' },
  { cardNumber: 'OP02-011', effectText: "[On Play] K.O. up to 1 of your opponent's Characters with 3000 power or less." },
];
const registry = compileRegistry(CATALOG);
const NO_DEFS = {};

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
  it('lowers the catalog (draw, self-power, give-DON, KO)', () => {
    expect(Object.keys(registry).sort()).toEqual(['OP02-011', 'OP04-045', 'ST01-013', 'ST15-002', 'ST21-002']);
  });
  it('KO lowers to a cost/power-filtered chooseTargets + ko', () => {
    const p = compileEffect('OP02-011', CATALOG[4].effectText)!;
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxPower: 3000 } });
    expect(p.abilities[0].ops[1].op).toBe('ko');
  });
  it('does NOT lower a dynamic threshold (no guessing)', () => {
    expect(compileEffect('X', "[On Play] K.O. up to 1 of your opponent's Characters with a cost equal to or less than your Life.")).toBeNull();
  });
});

describe('interpreter runs the compiled IR', () => {
  it('OP04-045 [On Play] draws 1', () => {
    let s = createSampleGameState();
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1, deck: { ...s.players.p1.deck, cardIds: ['d0', 'd1'] } } }, cardsById: { ...s.cardsById, d0: inst('d0', 'F', 'deck', 'p1'), d1: inst('d1', 'F', 'deck', 'p1') } };
    s = place(s, inst('king', 'OP04-045', 'characterArea', 'p1'));
    expect(fireOnPlay(s, 'king', registry, NO_DEFS, 'a').state.players.p1.hand.cardIds).toEqual(['d0']);
  });

  it('ST01-013 self +1000 gated by [DON!! x1]', () => {
    const defs = { 'ST01-013': def('ST01-013', 5000) };
    let s = place(createSampleGameState(), inst('zoro', 'ST01-013', 'characterArea', 'p1'));
    s = fireOnPlay(s, 'zoro', registry, defs, 'a').state;
    expect(computeCurrentPower(defs, s, 'zoro')).toBe(5000);
    const withDon = { ...s, cardsById: { ...s.cardsById, zoro: { ...s.cardsById.zoro, donAttached: ['x'] } } };
    expect(computeCurrentPower(defs, withDon, 'zoro')).toBe(7000);
  });

  it('ST15-002 give up to 1 DON!! — choice then resume', () => {
    let s = createSampleGameState();
    s = { ...s, cardsById: { ...s.cardsById, don1: inst('don1', 'DON', 'costArea', 'p1', { orientation: null, donRested: false }) }, players: { ...s.players, p1: { ...s.players.p1, costArea: { ...s.players.p1.costArea, cardIds: ['don1'] } } } };
    s = place(s, inst('ed', 'ST15-002', 'characterArea', 'p1'));
    const played = fireOnPlay(s, 'ed', registry, NO_DEFS, 'a');
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['p1-leader', 'ed']);
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['p1-leader'], registry, NO_DEFS, 'b');
    expect(resumed.state.cardsById['p1-leader'].donAttached).toEqual(['don1']);
  });

  it('OP02-011 [On Play] KO offers only opponent Characters with <=3000 power, then K.O.s', () => {
    const defs = { 'OP02-011': def('OP02-011', 4000), WEAK: def('WEAK', 2000), STRONG: def('STRONG', 5000) };
    let s = createSampleGameState();
    s = place(s, inst('src', 'OP02-011', 'characterArea', 'p1'));
    s = place(s, inst('weak', 'WEAK', 'characterArea', 'p2'));
    s = place(s, inst('strong', 'STRONG', 'characterArea', 'p2'));
    const played = fireOnPlay(s, 'src', registry, defs, 'a');
    // Only the 2000-power Character is eligible (5000 is filtered out).
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['weak']);
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['weak'], registry, defs, 'b');
    expect(resumed.state.cardsById.weak.currentZone).toBe('trash');
    expect(resumed.state.players.p2.characterArea.cardIds).toEqual(['strong']);
  });
});
