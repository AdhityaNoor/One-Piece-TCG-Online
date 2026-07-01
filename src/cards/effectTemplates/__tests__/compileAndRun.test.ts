/**
 * End-to-end: card TEXT is compiled to IR, then the engine's generic
 * interpreter runs it. No per-card code is involved. (Rules: 8-1-3-1 [On Play],
 * 8-1-3-3 statics, 6-3 draw, 6-5-5 give DON!!, 7-1-4-1-2 K.O., 8-4-4 choices.)
 */
import { describe, expect, it } from 'vitest';
import { createSampleGameState } from '../../../engine/state/__fixtures__/sampleGameState';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import { fireOnPlay, fireWhenAttacking, fireOnKO, fireCounter, fireTrigger, resumeChoice } from '../../../engine/effects';
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
  { cardNumber: 'OP01-016', effectText: '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.' },
  { cardNumber: 'WA-DON', effectText: '[When Attacking] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.' },
  { cardNumber: 'KO-DRAW', effectText: '[On K.O.] Draw 1 card.' },
  { cardNumber: 'KO-SRC', effectText: "[On Play] K.O. up to 1 of your opponent's Characters." },
  { cardNumber: 'CTR-PWR', effectText: '[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle.' },
  { cardNumber: 'DEBUFF', effectText: "[On Play] Give up to 1 of your opponent's Characters −2000 power during this turn." },
  { cardNumber: 'AOE', effectText: '[On Play] All of your Characters gain +1000 power during this turn.' },
  { cardNumber: 'MILL', effectText: '[On Play] Trash 3 cards from the top of your deck.' },
  { cardNumber: 'BOUNCE', effectText: "[On Play] Return up to 1 of your opponent's Characters with a cost of 4 or less to the owner's hand." },
  { cardNumber: 'ACT-DON', effectText: '[Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Draw 1 card.' },
  { cardNumber: 'PLAY-HAND', effectText: '[On Play] Play up to 1 {Animal} type Character card with a cost of 4 or less from your hand.' },
  { cardNumber: 'RECOVER', effectText: '[On Play] Add up to 1 {Animal} type Character card with a cost of 4 or less from your trash to your hand.' },
  { cardNumber: 'GATED', effectText: '[On Play] If your Leader has the {Land of Wano} type, draw 1 card.' },
  { cardNumber: 'RAMP', effectText: '[On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.' },
  { cardNumber: 'COND-STAT', effectText: '[DON!! x1] [Your Turn] If you have 2 or less Life cards, this Character gains +2000 power.' },
  { cardNumber: 'TRIG', effectText: '[Trigger] Draw 1 card.' },
];
const registry = compileRegistry(CATALOG);
const NO_DEFS = {};

function def(cardNumber: string, basePower: number): CardDefinition {
  return { cardDefinitionId: cardNumber, name: cardNumber, category: 'character', colors: ['red'], types: [], basePower, text: '', hasTrigger: false, hasRush: false, hasBlocker: false, hasDoubleAttack: false, isUnblockable: false, cardNumber };
}
function namedDef(cardNumber: string, name: string, types: string[]): CardDefinition {
  return { cardDefinitionId: cardNumber, name, category: 'character', colors: ['red'], types, basePower: 1000, text: '', hasTrigger: false, hasRush: false, hasBlocker: false, hasDoubleAttack: false, isUnblockable: false, cardNumber };
}
function inst(id: string, cardNumber: string, zone: CardInstance['currentZone'], owner: string, extra: Partial<CardInstance> = {}): CardInstance {
  return { instanceId: id, cardDefinitionId: cardNumber, ownerId: owner, controllerId: owner, currentZone: zone, orientation: 'active', faceState: 'faceUp', donAttached: [], appliedContinuousEffectIds: [], oncePerTurnUsed: [], summoningSick: false, revealedTo: 'all', ...extra };
}
function place(state: GameState, i: CardInstance): GameState {
  const p = state.players[i.ownerId];
  return { ...state, cardsById: { ...state.cardsById, [i.instanceId]: i }, players: { ...state.players, [i.ownerId]: { ...p, characterArea: { ...p.characterArea, cardIds: [...p.characterArea.cardIds, i.instanceId] } } } };
}

describe('compiler', () => {
  it('lowers the catalog (draw, self-power, give-DON, KO, searcher, attack/KO/counter timings)', () => {
    expect(Object.keys(registry).sort()).toEqual(['ACT-DON', 'AOE', 'BOUNCE', 'COND-STAT', 'CTR-PWR', 'DEBUFF', 'GATED', 'KO-DRAW', 'KO-SRC', 'MILL', 'OP01-016', 'OP02-011', 'OP04-045', 'PLAY-HAND', 'RAMP', 'RECOVER', 'ST01-013', 'ST15-002', 'ST21-002', 'TRIG', 'WA-DON']);
  });
  it('lowers a [Trigger] ability to the trigger timing (recursion through the On Play lowerings)', () => {
    const p = compileEffect('TRIG', '[Trigger] Draw 1 card.')!;
    expect(p.abilities[0].trigger).toBe('trigger');
    expect(p.abilities[0].ops).toEqual([{ op: 'draw', amount: 1 }]);
  });
  it('fireTrigger runs a [Trigger] ability (draws)', () => {
    let s = createSampleGameState();
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1, deck: { ...s.players.p1.deck, cardIds: ['t0'] }, hand: { ...s.players.p1.hand, cardIds: [] } } }, cardsById: { ...s.cardsById, t0: inst('t0', 'F', 'deck', 'p1'), lc: inst('lc', 'TRIG', 'hand', 'p1') } };
    const fired = fireTrigger(s, 'lc', registry, {}, 'a');
    expect(fired.state.players.p1.hand.cardIds).toContain('t0');
  });
  it('lowers a conditional self-power static to a continuously-gated addPower (DON!! + turn + If-gate)', () => {
    const p = compileEffect('COND-STAT', '[DON!! x1] [Your Turn] If you have 2 or less Life cards, this Character gains +2000 power.')!;
    expect(p.abilities[0].trigger).toBe('onEnterPlay');
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'addPower', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'selfLife', atMost: 2 }] } });
  });
  it('lowers DON!! ramp to addDonFromDeck', () => {
    expect(compileEffect('RAMP', '[On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.')!.abilities[0].ops[0]).toEqual({ op: 'addDonFromDeck', count: 1, rested: false });
  });
  it('lowers an "If your Leader has the {Type} type, …" precondition into an ability gate', () => {
    const p = compileEffect('GATED', '[On Play] If your Leader has the {Land of Wano} type, draw 1 card.')!;
    expect(p.abilities[0].gate).toEqual([{ kind: 'leaderType', type: 'Land of Wano' }]);
    expect(p.abilities[0].ops).toEqual([{ op: 'draw', amount: 1 }]);
  });
  it('lowers recover-from-trash to chooseTargets(controllerTrash filter) + moveToHand', () => {
    const p = compileEffect('RECOVER', '[On Play] Add up to 1 {Animal} type Character card with a cost of 4 or less from your trash to your hand.')!;
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerTrash', filter: { typeIncludes: 'Animal', category: 'character', maxCost: 4 } } });
    expect(p.abilities[0].ops[1].op).toBe('moveToHand');
  });
  it('lowers play-from-hand to chooseTargets(controllerHand filter) + playFromHand', () => {
    const p = compileEffect('PLAY-HAND', '[On Play] Play up to 1 {Animal} type Character card with a cost of 4 or less from your hand.')!;
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerHand', filter: { category: 'character', typeIncludes: 'Animal', maxCost: 4 } } });
    expect(p.abilities[0].ops[1].op).toBe('playFromHand');
  });
  it('lowers a bounce to chooseTargets + returnToHand, and a cost-prefixed [Activate: Main] to cost + effect', () => {
    const b = compileEffect('BOUNCE', "[On Play] Return up to 1 of your opponent's Characters with a cost of 4 or less to the owner's hand.")!;
    expect(b.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxCost: 4 } });
    expect(b.abilities[0].ops[1].op).toBe('returnToHand');
    const act = compileEffect('ACT-DON', '[Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Draw 1 card.')!;
    expect(act.abilities[0].cost).toEqual([{ kind: 'donMinus', count: 1 }]);
    expect(act.abilities[0].ops).toEqual([{ op: 'draw', amount: 1 }]);
  });
  it('lowers a temporary opponent debuff and an AoE buff to addPower + a self-mill to trashTopDeck', () => {
    const deb = compileEffect('DEBUFF', "[On Play] Give up to 1 of your opponent's Characters −2000 power during this turn.")!;
    expect(deb.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters' } });
    expect(deb.abilities[0].ops[1]).toMatchObject({ op: 'addPower', amount: -2000, duration: 'duringThisTurn' });
    const aoe = compileEffect('AOE', '[On Play] All of your Characters gain +1000 power during this turn.')!;
    expect(aoe.abilities[0].ops).toEqual([{ op: 'addPower', target: { sel: 'controllerCharacters' }, amount: 1000, duration: 'duringThisTurn' }]);
    expect(compileEffect('MILL', '[On Play] Trash 3 cards from the top of your deck.')!.abilities[0].ops[0]).toEqual({ op: 'trashTopDeck', count: 3 });
  });
  it('does NOT compile an activation-cost-gated effect (would be a free effect)', () => {
    expect(compileEffect('X', "[Activate: Main] You may rest 1 of your DON!! cards: Give up to 1 of your opponent's Characters −2000 power during this turn.")).toBeNull();
    expect(compileEffect('X', '[Main] DON!! −1: Trash 3 cards from the top of your deck.')).toBeNull();
  });
  it('bails on an unmodeled "If …" precondition rather than dropping it (no guessing)', () => {
    expect(compileEffect('IF', '[On Play] If you have 3 or more Characters, draw 1 card.')).toBeNull();
  });
  it('lowers a [DON!! x1] gate to an IR condition (donAttachedAtLeast)', () => {
    const p = compileEffect('DON', '[DON!! x1] [Activate: Main] Draw 1 card.')!;
    expect(p.abilities[0].condition).toEqual({ donAttachedAtLeast: 1 });
  });
  it('carries the firing timing through to the IR trigger ([When Attacking] / [On K.O.] / [Counter])', () => {
    expect(compileEffect('WA-DON', '[When Attacking] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.')!.abilities[0].trigger).toBe('whenAttacking');
    expect(compileEffect('KO-DRAW', '[On K.O.] Draw 1 card.')!.abilities[0].trigger).toBe('onKO');
    const ctr = compileEffect('CTR-PWR', '[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle.')!;
    expect(ctr.abilities[0].trigger).toBe('counter');
    expect(ctr.abilities[0].ops[1]).toMatchObject({ op: 'addPower', amount: 4000, duration: 'duringThisBattle' });
  });
  it('OP01-016 [On Play] lowers to a single searchTopDeck (type + other-than self)', () => {
    const p = compileEffect('OP01-016', CATALOG[5].effectText)!;
    expect(p.abilities[0].trigger).toBe('onPlay');
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'searchTopDeck', look: 5, pick: 1, filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } });
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

  it('OP01-016 [On Play] searcher: looks at top 5, offers only matching cards, adds the pick to hand and bottoms the rest', () => {
    const defs = {
      'OP01-016': namedDef('OP01-016', 'Nami', ['Straw Hat Crew']),
      D_USOPP: namedDef('D_USOPP', 'Usopp', ['Straw Hat Crew']),
      D_KAROO: namedDef('D_KAROO', 'Karoo', ['Animal']),
      D_NAMI2: namedDef('D_NAMI2', 'Nami', ['Straw Hat Crew']), // same name as source -> excluded
      D_SANJI: namedDef('D_SANJI', 'Sanji', ['Straw Hat Crew']),
      D_SMOKER: namedDef('D_SMOKER', 'Smoker', ['Navy']),
      D_X: namedDef('D_X', 'X', []),
      D_Y: namedDef('D_Y', 'Y', []),
    };
    let s = createSampleGameState();
    const deckIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
    s = {
      ...s,
      cardsById: {
        ...s.cardsById,
        d1: inst('d1', 'D_USOPP', 'deck', 'p1'), d2: inst('d2', 'D_KAROO', 'deck', 'p1'), d3: inst('d3', 'D_NAMI2', 'deck', 'p1'),
        d4: inst('d4', 'D_SANJI', 'deck', 'p1'), d5: inst('d5', 'D_SMOKER', 'deck', 'p1'),
        d6: inst('d6', 'D_X', 'deck', 'p1'), d7: inst('d7', 'D_Y', 'deck', 'p1'),
      },
      players: { ...s.players, p1: { ...s.players.p1, hand: { ...s.players.p1.hand, cardIds: [] }, deck: { ...s.players.p1.deck, cardIds: deckIds } } },
    };
    s = place(s, inst('nami', 'OP01-016', 'characterArea', 'p1'));

    const played = fireOnPlay(s, 'nami', registry, defs, 'a');
    // Only Straw Hat Crew cards other than "Nami" among the top 5 are eligible.
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['d1', 'd4']);
    expect(played.pendingChoices[0].constraints.max).toBe(1);

    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['d4'], registry, defs, 'b');
    expect(resumed.state.players.p1.hand.cardIds).toEqual(['d4']);
    // Top 5 removed; the 4 non-chosen looked cards go to the bottom (after d6, d7).
    expect(resumed.state.players.p1.deck.cardIds).toEqual(['d6', 'd7', 'd1', 'd2', 'd3', 'd5']);
    expect(resumed.state.cardsById.d4.currentZone).toBe('hand');
    expect(resumed.state.pendingChoices).toHaveLength(0);
  });

  it('[When Attacking] WA-DON fires a give-DON choice when the attacker is declared', () => {
    let s = createSampleGameState();
    s = { ...s, cardsById: { ...s.cardsById, don1: inst('don1', 'DON', 'costArea', 'p1', { orientation: null, donRested: false }) }, players: { ...s.players, p1: { ...s.players.p1, costArea: { ...s.players.p1.costArea, cardIds: ['don1'] } } } };
    s = place(s, inst('atk', 'WA-DON', 'characterArea', 'p1'));
    const fired = fireWhenAttacking(s, 'atk', registry, NO_DEFS, 'a');
    expect(fired.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['p1-leader', 'atk']);
    const resumed = resumeChoice(fired.state, fired.pendingChoices[0].id, ['p1-leader'], registry, NO_DEFS, 'b');
    expect(resumed.state.cardsById['p1-leader'].donAttached).toEqual(['don1']);
  });

  it('effect-driven KO cascades [On K.O.]: KO-ing an opponent Character with an On-K.O. effect fires it', () => {
    const defs = { 'KO-SRC': def('KO-SRC', 5000), 'KO-DRAW': def('KO-DRAW', 1000) };
    let s = createSampleGameState();
    s = { ...s, players: { ...s.players, p2: { ...s.players.p2, deck: { ...s.players.p2.deck, cardIds: ['p2top'] } } }, cardsById: { ...s.cardsById, p2top: inst('p2top', 'F', 'deck', 'p2') } };
    s = place(s, inst('src', 'KO-SRC', 'characterArea', 'p1'));
    s = place(s, inst('victim', 'KO-DRAW', 'characterArea', 'p2'));

    const played = fireOnPlay(s, 'src', registry, defs, 'a');
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['victim']);
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['victim'], registry, defs, 'b');

    expect(resumed.state.cardsById.victim.currentZone).toBe('trash');
    // The victim's [On K.O.] fired, drawing a card for ITS controller (p2).
    expect(resumed.state.players.p2.hand.cardIds).toContain('p2top');
    expect(resumed.state.pendingChoices).toHaveLength(0);
  });

  it('[On K.O.] KO-DRAW draws a card when fired from the trash', () => {
    let s = createSampleGameState();
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1, deck: { ...s.players.p1.deck, cardIds: ['top', 'next'] } } }, cardsById: { ...s.cardsById, top: inst('top', 'F', 'deck', 'p1'), next: inst('next', 'F', 'deck', 'p1') } };
    s = { ...s, cardsById: { ...s.cardsById, koed: inst('koed', 'KO-DRAW', 'trash', 'p1') } };
    const before = s.players.p1.hand.cardIds.length;
    const fired = fireOnKO(s, 'koed', registry, NO_DEFS, 'a');
    expect(fired.state.players.p1.hand.cardIds).toContain('top');
    expect(fired.state.players.p1.hand.cardIds.length).toBe(before + 1);
  });

  it('[Counter] CTR-PWR registers a +4000 battle-only power boost on the chosen target', () => {
    // The Counter Event sits in the trash (already played); it must NOT be a
    // Character, so add it to cardsById directly rather than via place().
    const base = createSampleGameState();
    const s = { ...base, cardsById: { ...base.cardsById, ev: inst('ev', 'CTR-PWR', 'trash', 'p1') } };
    const fired = fireCounter(s, 'ev', registry, NO_DEFS, 'a');
    // The controller's Leader + Characters are offered (optional single target).
    expect(fired.pendingChoices[0].constraints.candidateInstanceIds).toContain('p1-leader');
    const resumed = resumeChoice(fired.state, fired.pendingChoices[0].id, ['p1-leader'], registry, NO_DEFS, 'b');
    const boost = resumed.state.continuousEffects.find((ce) => ce.powerModifier?.appliesToInstanceId === 'p1-leader');
    expect(boost?.powerModifier?.amount).toBe(4000);
    expect(boost?.duration).toBe('duringThisBattle');
  });

  it('[On Play] DEBUFF: offers an opponent Character, then applies −2000 power for the turn', () => {
    const defs = { DEBUFF: def('DEBUFF', 0), OC: def('OC', 3000) };
    let s = place(createSampleGameState(), inst('src', 'DEBUFF', 'characterArea', 'p1'));
    s = place(s, inst('oc', 'OC', 'characterArea', 'p2'));
    const played = fireOnPlay(s, 'src', registry, defs, 'a');
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['oc']);
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['oc'], registry, defs, 'b');
    expect(computeCurrentPower(defs, resumed.state, 'oc')).toBe(1000); // 3000 − 2000
  });

  it('[On Play] PLAY-HAND: offers only matching hand Characters, then plays the chosen one (summoning-sick)', () => {
    const defs = {
      'PLAY-HAND': def('PLAY-HAND', 0),
      ANIMAL3: { ...namedDef('ANIMAL3', 'Karoo', ['Animal']), baseCost: 3 },
      OTHER: { ...namedDef('OTHER', 'Zoro', []), baseCost: 1 },
    };
    let s = createSampleGameState();
    s = {
      ...s,
      cardsById: { ...s.cardsById, ha: inst('ha', 'ANIMAL3', 'hand', 'p1'), hb: inst('hb', 'OTHER', 'hand', 'p1') },
      players: { ...s.players, p1: { ...s.players.p1, hand: { ...s.players.p1.hand, cardIds: ['ha', 'hb'] } } },
    };
    s = place(s, inst('src', 'PLAY-HAND', 'characterArea', 'p1'));
    const beforeChars = s.players.p1.characterArea.cardIds.length;

    const played = fireOnPlay(s, 'src', registry, defs, 'a');
    // Only the {Animal} cost-3 card qualifies (the off-type card is filtered out).
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['ha']);

    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['ha'], registry, defs, 'b');
    expect(resumed.state.players.p1.hand.cardIds).toEqual(['hb']); // 'ha' left the hand
    expect(resumed.state.players.p1.characterArea.cardIds.length).toBe(beforeChars + 1);
    const newId = resumed.state.players.p1.characterArea.cardIds.find((id) => id !== 'src');
    expect(resumed.state.cardsById[newId!].summoningSick).toBe(true);
  });

  it('GATED [On Play]: fires only when the Leader gate holds (draws), and does nothing when it fails', () => {
    function setup(leaderTypes: string[]) {
      let s = createSampleGameState();
      const leaderId = s.players.p1.leaderInstanceId;
      s = {
        ...s,
        cardsById: { ...s.cardsById, [leaderId]: { ...s.cardsById[leaderId], cardDefinitionId: 'LEAD' }, d0: inst('d0', 'F', 'deck', 'p1') },
        players: { ...s.players, p1: { ...s.players.p1, deck: { ...s.players.p1.deck, cardIds: ['d0'] }, hand: { ...s.players.p1.hand, cardIds: [] } } },
      };
      s = place(s, inst('src', 'GATED', 'characterArea', 'p1'));
      const defs = { LEAD: { ...namedDef('LEAD', 'Wano Leader', leaderTypes), category: 'leader' as const }, GATED: def('GATED', 0) };
      return { s, defs };
    }
    const met = setup(['Land of Wano']);
    expect(fireOnPlay(met.s, 'src', registry, met.defs, 'a').state.players.p1.hand.cardIds).toEqual(['d0']); // gate holds → drew
    const notMet = setup(['Animal']);
    expect(fireOnPlay(notMet.s, 'src', registry, notMet.defs, 'a').state.players.p1.hand.cardIds).toEqual([]); // gate fails → nothing
  });

  it('[On Play] RECOVER: offers only matching trash cards, then moves the chosen one to hand', () => {
    const defs = {
      RECOVER: def('RECOVER', 0),
      ANIMAL3: { ...namedDef('ANIMAL3', 'Karoo', ['Animal']), baseCost: 3 },
      OTHER: { ...namedDef('OTHER', 'Zoro', []), baseCost: 1 },
    };
    let s = createSampleGameState();
    s = {
      ...s,
      cardsById: { ...s.cardsById, ta: inst('ta', 'ANIMAL3', 'trash', 'p1'), tb: inst('tb', 'OTHER', 'trash', 'p1') },
      players: { ...s.players, p1: { ...s.players.p1, trash: { ...s.players.p1.trash, cardIds: ['ta', 'tb'] }, hand: { ...s.players.p1.hand, cardIds: [] } } },
    };
    s = place(s, inst('src', 'RECOVER', 'characterArea', 'p1'));

    const played = fireOnPlay(s, 'src', registry, defs, 'a');
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['ta']); // off-type 'tb' filtered out
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['ta'], registry, defs, 'b');
    expect(resumed.state.players.p1.hand.cardIds).toContain('ta');
    expect(resumed.state.players.p1.trash.cardIds).toEqual(['tb']);
    expect(resumed.state.cardsById.ta.currentZone).toBe('hand');
  });

  it('[On Play] BOUNCE: returns the chosen opponent Character to its owner’s hand', () => {
    const defs = { BOUNCE: def('BOUNCE', 0), OC: def('OC', 2000) };
    let s = place(createSampleGameState(), inst('src', 'BOUNCE', 'characterArea', 'p1'));
    s = place(s, inst('oc', 'OC', 'characterArea', 'p2'));
    const beforeHand = s.players.p2.hand.cardIds.length;
    const played = fireOnPlay(s, 'src', registry, defs, 'a');
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['oc']);
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, ['oc'], registry, defs, 'b');
    expect(resumed.state.cardsById.oc.currentZone).toBe('hand');
    expect(resumed.state.players.p2.characterArea.cardIds).not.toContain('oc');
    expect(resumed.state.players.p2.hand.cardIds.length).toBe(beforeHand + 1);
  });

  it('COND-STAT: the gated static (+2000 while ≤2 Life, your turn, [DON!! x1]) toggles with Life count', () => {
    const defs = { 'COND-STAT': def('COND-STAT', 5000) };
    function build(lifeCount: number): GameState {
      let s = createSampleGameState();
      const life = Array.from({ length: lifeCount }, (_, i) => `lf${i}`);
      s = { ...s, activePlayerId: 'p1', players: { ...s.players, p1: { ...s.players.p1, lifeArea: { ...s.players.p1.lifeArea, cardIds: life } } } };
      s = place(s, inst('z', 'COND-STAT', 'characterArea', 'p1', { donAttached: ['dd'] }));
      return fireOnPlay(s, 'z', registry, defs, 'a').state;
    }
    expect(computeCurrentPower(defs, build(2), 'z')).toBe(8000); // 5000 base + 1000 DON + 2000 (gate met)
    expect(computeCurrentPower(defs, build(3), 'z')).toBe(6000); // gate fails → 5000 + 1000 DON only
  });

  it('[On Play] RAMP: moves a DON!! from the DON!! deck to the cost area, active', () => {
    let s = createSampleGameState();
    s = {
      ...s,
      cardsById: { ...s.cardsById, dd1: inst('dd1', 'DON', 'donDeck', 'p1') },
      players: { ...s.players, p1: { ...s.players.p1, donDeck: { ...s.players.p1.donDeck, cardIds: ['dd1'] }, costArea: { ...s.players.p1.costArea, cardIds: [] } } },
    };
    s = place(s, inst('src', 'RAMP', 'characterArea', 'p1'));
    const fired = fireOnPlay(s, 'src', registry, {}, 'a');
    expect(fired.state.players.p1.costArea.cardIds).toContain('dd1');
    expect(fired.state.players.p1.donDeck.cardIds).not.toContain('dd1');
    expect(fired.state.cardsById.dd1.currentZone).toBe('costArea');
    expect(fired.state.cardsById.dd1.donRested).toBe(false);
  });

  it('[On Play] MILL: trashes the top 3 cards of the controller’s own deck', () => {
    let s = createSampleGameState();
    const deckIds = ['m1', 'm2', 'm3', 'm4'];
    s = {
      ...s,
      cardsById: { ...s.cardsById, m1: inst('m1', 'F', 'deck', 'p1'), m2: inst('m2', 'F', 'deck', 'p1'), m3: inst('m3', 'F', 'deck', 'p1'), m4: inst('m4', 'F', 'deck', 'p1') },
      players: { ...s.players, p1: { ...s.players.p1, deck: { ...s.players.p1.deck, cardIds: deckIds }, trash: { ...s.players.p1.trash, cardIds: [] } } },
    };
    s = place(s, inst('mill', 'MILL', 'characterArea', 'p1'));
    const fired = fireOnPlay(s, 'mill', registry, {}, 'a');
    expect(fired.state.players.p1.deck.cardIds).toEqual(['m4']);
    expect(fired.state.players.p1.trash.cardIds).toEqual(expect.arrayContaining(['m1', 'm2', 'm3']));
    expect(fired.state.cardsById.m1.currentZone).toBe('trash');
  });

  it('OP01-016 searcher: declining (empty pick) bottoms all looked cards, hand unchanged', () => {
    const defs = { 'OP01-016': namedDef('OP01-016', 'Nami', ['Straw Hat Crew']), F: namedDef('F', 'Filler', []) };
    let s = createSampleGameState();
    const deckIds = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'];
    const cardsById = { ...s.cardsById } as Record<string, CardInstance>;
    for (const id of deckIds) cardsById[id] = inst(id, 'F', 'deck', 'p1');
    s = { ...s, cardsById, players: { ...s.players, p1: { ...s.players.p1, hand: { ...s.players.p1.hand, cardIds: [] }, deck: { ...s.players.p1.deck, cardIds: deckIds } } } };
    s = place(s, inst('nami', 'OP01-016', 'characterArea', 'p1'));

    const played = fireOnPlay(s, 'nami', registry, defs, 'a');
    // No eligible card (all Filler, no Straw Hat Crew) — choice still appears with min 0.
    expect(played.pendingChoices[0].constraints.candidateInstanceIds).toEqual([]);
    const resumed = resumeChoice(played.state, played.pendingChoices[0].id, [], registry, defs, 'b');
    expect(resumed.state.players.p1.hand.cardIds).toEqual([]);
    expect(resumed.state.players.p1.deck.cardIds).toEqual(['e6', 'e1', 'e2', 'e3', 'e4', 'e5']);
  });
});
