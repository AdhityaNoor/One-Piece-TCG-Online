/**
 * Two curation fixes that both come down to "the player never got asked".
 *
 * 1. EB03-055 (Nico Robin) — "[On Play] You may trash 1 card from the top of your
 *    Life cards: If your Leader has the {Straw Hat Crew} type, add up to 2 cards
 *    from the top of your deck to the top of your Life cards."
 *
 *    Both halves are player decisions and each needs its OWN prompt. Previously
 *    the optional Life-trash was compiled to a bare `trashLife` (it spent a Life
 *    card with no prompt at all), and "up to 2" was a `moveCards ... count: 2`
 *    whose `controllerDeckTop` selector only ever yields ONE card — so the effect
 *    silently capped at 1 and surfaced the deck's top card in a picker.
 *
 * 2. OP17-040 (Edward.Newgate) — "[Once Per Turn] When your Leader with a type
 *    including 'Rocks Pirates' attacks or is attacked, you may trash 1 card from
 *    your hand to activate this effect: your Leader gains +3000 power during this
 *    battle."
 *
 *    The watched card is THE LEADER, not this Character. `whenAttacking` fires
 *    only for the card that is itself the attacker, so the old curation fired
 *    when Newgate attacked and never when the Leader did. Both halves now use the
 *    board-wide leader-battle watchers swept by DECLARE_ATTACK, which also means
 *    N copies on the field produce N prompts.
 */
import { describe, expect, it } from 'vitest';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import type { GameState } from '../../../engine/state/game';
import type { CardDefinitionLookup } from '../../../engine/rules/shared/definitions';
import { runTimings } from '../../../engine/effects/interpreter';
import { resumeChoice } from '../../../engine/effects/fireTiming';
import { executeDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { computeCurrentPower } from '../../../engine/rules/shared';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putDeckCards,
  putInHand,
  putLifeCards,
  nextTestId,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { EB_ASSIGNMENTS } from '../assignments/EB';
import { OP03_ASSIGNMENTS } from '../assignments/OP03';
import { OP08_ASSIGNMENTS } from '../assignments/OP08';
import { OP15_ASSIGNMENTS } from '../assignments/OP15';
import { OP17_ASSIGNMENTS } from '../assignments/OP17';

const registry = buildRegistryFromAssignments([
  ...EB_ASSIGNMENTS,
  ...OP03_ASSIGNMENTS,
  ...OP08_ASSIGNMENTS,
  ...OP15_ASSIGNMENTS,
  ...OP17_ASSIGNMENTS,
]);

const ROBIN = makeCharacterDef({
  cardDefinitionId: 'EB03-055',
  cardNumber: 'EB03-055',
  name: 'Nico Robin',
  baseCost: 7,
  basePower: 8000,
  types: ['Straw Hat Crew'],
});

const NEWGATE = makeCharacterDef({
  cardDefinitionId: 'OP17-040',
  cardNumber: 'OP17-040',
  name: 'Edward.Newgate',
  baseCost: 6,
  basePower: 8000,
  types: ['Rocks Pirates'],
});

const FILLER = makeCharacterDef({ cardDefinitionId: 'FILLER', cardNumber: 'F-001', name: 'Filler', baseCost: 1, basePower: 1000 });

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId, attackerInstanceId, targetInstanceId };
}

function optionLabels(choice: { constraints: { options?: { label: string }[] } }): string[] {
  return (choice.constraints.options ?? []).map((o) => o.label);
}

/** Build a p1 board with Robin in play, `life` face-down Life cards and `deck` cards. */
function robinRig(opts: { leaderTypes: string[]; life: number; deck: number }) {
  let rig = buildBaseRig({
    activePlayerId: 'p1',
    phase: 'main',
    turnNumber: 3,
    leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'LEADER-P1', cardNumber: 'L-P1', types: opts.leaderTypes }),
  });
  let robinId: string;
  ({ rig, instanceId: robinId } = putCharacterInPlay(rig, 'p1', ROBIN));
  rig = putLifeCards(rig, 'p1', Array.from({ length: opts.life }, () => FILLER)).rig;
  rig = putDeckCards(rig, 'p1', FILLER, opts.deck).rig;
  return { rig, robinId };
}

function fireRobinOnPlay(state: GameState, robinId: string, defs: CardDefinitionLookup) {
  return runTimings(registry['EB03-055'], ['onPlay'], state, robinId, defs, null, registry);
}

describe('EB03-055 — the optional Life-trash cost must PROMPT, not auto-spend a Life card', () => {
  it('raises a decline/top choice and trashes nothing until it is answered', () => {
    const { rig, robinId } = robinRig({ leaderTypes: ['Straw Hat Crew'], life: 3, deck: 5 });

    const fired = fireRobinOnPlay(rig.state, robinId, rig.defs);

    expect(fired.pendingChoices).toHaveLength(1);
    expect(fired.pendingChoices[0].kind).toBe('SELECT_OPTION');
    expect(optionLabels(fired.pendingChoices[0])).toEqual(['Do not trash a Life card.', 'Top Life card']);
    // Nothing spent while the question is still open.
    expect(fired.state.players.p1.lifeArea.cardIds).toHaveLength(3);
    expect(fired.state.players.p1.trash.cardIds).toHaveLength(0);
  });

  it('declining leaves Life untouched and never asks the second question', () => {
    const { rig, robinId } = robinRig({ leaderTypes: ['Straw Hat Crew'], life: 3, deck: 5 });
    const fired = fireRobinOnPlay(rig.state, robinId, rig.defs);

    // response 0 === the decline option.
    const declined = resumeChoice(fired.state, fired.pendingChoices[0].id, 0, registry, rig.defs, null);

    expect(declined.pendingChoices).toHaveLength(0);
    expect(declined.state.players.p1.lifeArea.cardIds).toHaveLength(3);
    expect(declined.state.players.p1.deck.cardIds).toHaveLength(5);
    expect(declined.state.players.p1.trash.cardIds).toHaveLength(0);
  });

  it('paying the cost trashes exactly the TOP Life card and then asks how many to add', () => {
    const { rig, robinId } = robinRig({ leaderTypes: ['Straw Hat Crew'], life: 3, deck: 5 });
    const topLifeId = rig.state.players.p1.lifeArea.cardIds[0];
    const fired = fireRobinOnPlay(rig.state, robinId, rig.defs);

    const paid = resumeChoice(fired.state, fired.pendingChoices[0].id, 1, registry, rig.defs, null);

    expect(paid.state.players.p1.lifeArea.cardIds).toHaveLength(2);
    expect(paid.state.players.p1.trash.cardIds).toContain(topLifeId);
    expect(paid.pendingChoices).toHaveLength(1);
    expect(paid.pendingChoices[0].kind).toBe('SELECT_OPTION');
    expect(optionLabels(paid.pendingChoices[0])).toEqual(['Add 0 cards', 'Add 1 card', 'Add 2 cards']);
  });
});

describe('EB03-055 — "up to 2" is a count the player picks, and 2 really means 2', () => {
  function payThenAnswer(addIndex: number) {
    const { rig, robinId } = robinRig({ leaderTypes: ['Straw Hat Crew'], life: 3, deck: 5 });
    const fired = fireRobinOnPlay(rig.state, robinId, rig.defs);
    const paid = resumeChoice(fired.state, fired.pendingChoices[0].id, 1, registry, rig.defs, null);
    return resumeChoice(paid.state, paid.pendingChoices[0].id, addIndex, registry, rig.defs, null);
  }

  it('adds 2 cards from the top of the deck when 2 is chosen (the old curation capped this at 1)', () => {
    const done = payThenAnswer(2);
    expect(done.pendingChoices).toHaveLength(0);
    // 3 Life − 1 paid + 2 added = 4; deck 5 − 2 = 3.
    expect(done.state.players.p1.lifeArea.cardIds).toHaveLength(4);
    expect(done.state.players.p1.deck.cardIds).toHaveLength(3);
  });

  it('adds exactly 1 when 1 is chosen', () => {
    const done = payThenAnswer(1);
    expect(done.state.players.p1.lifeArea.cardIds).toHaveLength(3);
    expect(done.state.players.p1.deck.cardIds).toHaveLength(4);
  });

  it('adds none when 0 is chosen — the Life card is still spent', () => {
    const done = payThenAnswer(0);
    expect(done.state.players.p1.lifeArea.cardIds).toHaveLength(2);
    expect(done.state.players.p1.deck.cardIds).toHaveLength(5);
  });

  it('adds the cards FACE-DOWN to the top of Life (they are new Life cards, not a reveal)', () => {
    const done = payThenAnswer(2);
    const [top, second] = done.state.players.p1.lifeArea.cardIds;
    expect(done.state.cardsById[top].faceState).toBe('faceDown');
    expect(done.state.cardsById[second].faceState).toBe('faceDown');
  });

  it('skips the second prompt entirely when the Leader is not {Straw Hat Crew}', () => {
    const { rig, robinId } = robinRig({ leaderTypes: ['Animal Kingdom Pirates'], life: 3, deck: 5 });
    const fired = fireRobinOnPlay(rig.state, robinId, rig.defs);

    const paid = resumeChoice(fired.state, fired.pendingChoices[0].id, 1, registry, rig.defs, null);

    expect(paid.pendingChoices).toHaveLength(0);
    expect(paid.state.players.p1.lifeArea.cardIds).toHaveLength(2); // cost still paid
    expect(paid.state.players.p1.deck.cardIds).toHaveLength(5); // nothing added
  });
});

/** p1 board: Rocks Leader + `copies` Newgates + `hand` filler cards in hand. */
function newgateRig(opts: { copies: number; hand: number; leaderTypes?: string[]; activePlayerId?: 'p1' | 'p2' }) {
  let rig = buildBaseRig({
    activePlayerId: opts.activePlayerId ?? 'p1',
    phase: 'main',
    turnNumber: 3,
    leaderOverridesP1: makeLeaderDef({
      cardDefinitionId: 'LEADER-P1',
      cardNumber: 'L-P1',
      types: opts.leaderTypes ?? ['Rocks Pirates'],
    }),
  });
  const newgateIds: string[] = [];
  for (let i = 0; i < opts.copies; i += 1) {
    let id: string;
    ({ rig, instanceId: id } = putCharacterInPlay(rig, 'p1', NEWGATE));
    newgateIds.push(id);
  }
  const handIds: string[] = [];
  for (let i = 0; i < opts.hand; i += 1) {
    const res = putInHand(rig, 'p1', FILLER);
    rig = res.rig;
    handIds.push(res.instanceId);
  }
  return { rig, newgateIds, handIds };
}

describe('OP17-040 — the trigger watches YOUR LEADER, not this Character', () => {
  it('prompts when your Rocks Pirates Leader declares an attack', () => {
    const { rig, newgateIds, handIds } = newgateRig({ copies: 1, hand: 2 });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;

    const result = executeDeclareAttack(rig.state, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);

    expect(result.pendingChoices).toHaveLength(1);
    const choice = result.pendingChoices[0];
    expect(choice.playerId).toBe('p1');
    expect(choice.sourceInstanceId).toBe(newgateIds[0]);
    expect(choice.kind).toBe('SELECT_CARDS');
    // "you MAY trash" — declining must be legal.
    expect(choice.constraints.min).toBe(0);
    expect(choice.constraints.max).toBe(1);
    expect(choice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining(handIds));
  });

  it('trashing the card gives YOUR Leader +3000 for the battle', () => {
    const { rig, handIds } = newgateRig({ copies: 1, hand: 2 });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;
    const basePower = computeCurrentPower(rig.defs, rig.state, p1Leader);

    const attacked = executeDeclareAttack(rig.state, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);
    const paid = resumeChoice(attacked.state, attacked.pendingChoices[0].id, [handIds[0]], registry, rig.defs, null);

    expect(paid.state.players.p1.trash.cardIds).toContain(handIds[0]);
    expect(paid.state.players.p1.hand.cardIds).not.toContain(handIds[0]);
    expect(computeCurrentPower(rig.defs, paid.state, p1Leader)).toBe(basePower + 3000);
  });

  it('declining the trash grants no power ("to activate this effect" is a real cost)', () => {
    const { rig } = newgateRig({ copies: 1, hand: 2 });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;
    const basePower = computeCurrentPower(rig.defs, rig.state, p1Leader);

    const attacked = executeDeclareAttack(rig.state, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);
    const declined = resumeChoice(attacked.state, attacked.pendingChoices[0].id, [], registry, rig.defs, null);

    expect(declined.state.players.p1.trash.cardIds).toHaveLength(0);
    expect(computeCurrentPower(rig.defs, declined.state, p1Leader)).toBe(basePower);
  });

  it('prompts when your Rocks Pirates Leader IS ATTACKED on the opponent\'s turn', () => {
    const { rig, newgateIds } = newgateRig({ copies: 1, hand: 2, activePlayerId: 'p2' });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;
    const basePower = computeCurrentPower(rig.defs, rig.state, p1Leader);

    const attacked = executeDeclareAttack(rig.state, declareAttack('p2', p2Leader, p1Leader), rig.defs, registry);

    expect(attacked.pendingChoices).toHaveLength(1);
    expect(attacked.pendingChoices[0].playerId).toBe('p1');
    expect(attacked.pendingChoices[0].sourceInstanceId).toBe(newgateIds[0]);

    const paid = resumeChoice(attacked.state, attacked.pendingChoices[0].id, [rig.state.players.p1.hand.cardIds[0]], registry, rig.defs, null);
    expect(computeCurrentPower(rig.defs, paid.state, p1Leader)).toBe(basePower + 3000);
  });

  it('does NOT fire when this Character attacks (the bug the old `whenAttacking` curation had)', () => {
    const { rig, newgateIds } = newgateRig({ copies: 1, hand: 2 });
    const p2Leader = rig.state.players.p2.leaderInstanceId!;

    const result = executeDeclareAttack(rig.state, declareAttack('p1', newgateIds[0], p2Leader), rig.defs, registry);

    expect(result.pendingChoices).toHaveLength(0);
  });

  it('does not fire when your Leader lacks the "Rocks Pirates" type', () => {
    const { rig } = newgateRig({ copies: 1, hand: 2, leaderTypes: ['Whitebeard Pirates'] });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;

    const result = executeDeclareAttack(rig.state, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);

    expect(result.pendingChoices).toHaveLength(0);
  });
});

describe('OP17-040 — [Once Per Turn] is per COPY, so every copy on the field gets asked', () => {
  it('two copies produce two successive prompts off one attack declaration', () => {
    const { rig, newgateIds, handIds } = newgateRig({ copies: 2, hand: 3 });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;
    const basePower = computeCurrentPower(rig.defs, rig.state, p1Leader);

    const first = executeDeclareAttack(rig.state, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);
    expect(first.pendingChoices).toHaveLength(1);
    expect(first.pendingChoices[0].sourceInstanceId).toBe(newgateIds[0]);

    const afterFirst = resumeChoice(first.state, first.pendingChoices[0].id, [handIds[0]], registry, rig.defs, null);

    // The sweep resumes and offers the SECOND copy its own trigger.
    expect(afterFirst.pendingChoices).toHaveLength(1);
    expect(afterFirst.pendingChoices[0].sourceInstanceId).toBe(newgateIds[1]);

    const afterSecond = resumeChoice(afterFirst.state, afterFirst.pendingChoices[0].id, [handIds[1]], registry, rig.defs, null);

    expect(afterSecond.pendingChoices).toHaveLength(0);
    expect(computeCurrentPower(rig.defs, afterSecond.state, p1Leader)).toBe(basePower + 6000);
  });

  it('a copy that already used its [Once Per Turn] is skipped, the fresh copy is not', () => {
    const { rig, newgateIds, handIds } = newgateRig({ copies: 2, hand: 3 });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;
    const spent: GameState = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [newgateIds[0]]: { ...rig.state.cardsById[newgateIds[0]], oncePerTurnUsed: ['op17-040-rocks-leader'] },
      },
    };

    const result = executeDeclareAttack(spent, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);

    expect(result.pendingChoices).toHaveLength(1);
    expect(result.pendingChoices[0].sourceInstanceId).toBe(newgateIds[1]);

    const done = resumeChoice(result.state, result.pendingChoices[0].id, [handIds[0]], registry, rig.defs, null);
    expect(done.pendingChoices).toHaveLength(0);
  });

  it('the same copy is not re-prompted by a SECOND attack in the same turn', () => {
    const { rig, newgateIds, handIds } = newgateRig({ copies: 1, hand: 3 });
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;

    const first = executeDeclareAttack(rig.state, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);
    const afterFirst = resumeChoice(first.state, first.pendingChoices[0].id, [handIds[0]], registry, rig.defs, null);
    expect(afterFirst.state.cardsById[newgateIds[0]].oncePerTurnUsed).toContain('op17-040-rocks-leader');

    // Second declaration in the same turn: the OPT is spent, so no prompt.
    const cleared: GameState = { ...afterFirst.state, currentBattle: null };
    const second = executeDeclareAttack(cleared, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);
    expect(second.pendingChoices).toHaveLength(0);
  });
});

/**
 * The sweep for cards sharing EB03-055's and OP17-040's shapes turned up three
 * more, covered below:
 *
 *   - OP03-001 (King) — "When this Leader attacks or is attacked" whose
 *     "is attacked" half was the generic `onOpponentsAttack` Block-Step window,
 *     with no requirement that the Leader be the card under attack.
 *   - the four other "You may trash 1 card from the top of your Life cards:"
 *     cards, which shared EB03-055's silent auto-trash.
 *   - every "you may add 1 card from the top of your deck" card, which used to
 *     render that card in a picker before asking whether to take it.
 */
describe('OP03-001 — "is attacked" means THIS Leader is the one being attacked', () => {
  const KING = makeLeaderDef({ cardDefinitionId: 'OP03-001', cardNumber: 'OP03-001', name: 'King', basePower: 5000 });
  const EVENT = { ...FILLER, cardDefinitionId: 'EV-1', cardNumber: 'EV-1', name: 'An Event', category: 'event' as const };

  function kingRig() {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 3, leaderOverridesP1: KING });
    rig = putInHand(rig, 'p1', EVENT).rig;
    rig = putInHand(rig, 'p1', EVENT).rig;
    return rig;
  }

  it('prompts when the opponent attacks this Leader', () => {
    const rig = kingRig();
    const p1Leader = rig.state.players.p1.leaderInstanceId!;
    const p2Leader = rig.state.players.p2.leaderInstanceId!;
    const basePower = computeCurrentPower(rig.defs, rig.state, p1Leader);

    const attacked = executeDeclareAttack(rig.state, declareAttack('p2', p2Leader, p1Leader), rig.defs, registry);

    expect(attacked.pendingChoices).toHaveLength(1);
    expect(attacked.pendingChoices[0].playerId).toBe('p1');
    expect(attacked.pendingChoices[0].sourceInstanceId).toBe(p1Leader);

    const handIds = [...rig.state.players.p1.hand.cardIds];
    const paid = resumeChoice(attacked.state, attacked.pendingChoices[0].id, handIds, registry, rig.defs, null);
    expect(computeCurrentPower(rig.defs, paid.state, p1Leader)).toBe(basePower + 2000); // +1000 per card trashed
  });

  it('does NOT prompt when the opponent attacks one of your Characters instead', () => {
    let rig = kingRig();
    let blockerId: string;
    ({ rig, instanceId: blockerId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ hasBlocker: true }), { orientation: 'rested' }));
    const p2Leader = rig.state.players.p2.leaderInstanceId!;

    // The Leader's "during this battle" pump could never apply to a battle it is
    // not in — offering the trash here just burns the player's cards.
    const attacked = executeDeclareAttack(rig.state, declareAttack('p2', p2Leader, blockerId), rig.defs, registry);

    expect(attacked.pendingChoices).toHaveLength(0);
  });
});

describe('"You may trash 1 card from the top of your Life cards:" prompts on every card that says it', () => {
  // EB03-055 is covered above; these are the rest of the family the sweep found.
  it.each([
    ['EB03-054', 'onPlay'],
    ['OP03-121', 'activateMain'],
    ['OP08-101', 'activateMain'],
    ['OP08-117', 'activateMain'],
  ] as const)('%s asks before spending a Life card', (cardNumber, timing) => {
    const ops = registry[cardNumber].abilities.find((a) => a.timing === timing)!.ops;
    expect(ops[0]).toMatchObject({ op: 'chooseLifeToTrash', position: 'top', optional: true });
    // The bare op would have spent the Life card with no question asked.
    expect(ops.some((o) => o.op === 'trashLife')).toBe(false);
  });

  it('OP15-116 stays MANDATORY — its text says "trash 1 card", not "you may trash"', () => {
    const ops = registry['OP15-116'].abilities.find((a) => a.timing === 'activateMain')!.ops;
    expect(ops[0]).toMatchObject({ op: 'trashLife', player: 'controller' });
    expect(ops.some((o) => o.op === 'chooseLifeToTrash')).toBe(false);
  });
});

describe('"add 1 card from the top of your deck" must not show the player that card first', () => {
  it('asks as a yes/no option instead of rendering the deck top in a picker', () => {
    const ops = registry['EB03-054'].abilities.find((a) => a.timing === 'onPlay')!.ops;
    const choice = ops.find((o) => o.op === 'chooseOption');
    expect(choice).toBeDefined();
    // A chooseTargets over `controllerDeckTop` would project the real card into
    // PendingChoicePrompt — hidden information the player is not entitled to.
    expect(ops.some((o) => o.op === 'chooseTargets' && JSON.stringify(o).includes('controllerDeckTop'))).toBe(false);
  });

  it('declining does not leak the PREVIOUS function\'s result into a later ifPrevious', () => {
    // OP15-116: mandatory Life trash → optional deck-top add → MANDATORY hand
    // trash. Declining the add must not cancel the hand trash, and (before
    // `clearResult`) the empty decline branch would have left the Life trash's
    // __lastMoved standing.
    const declineBranch = registry['OP15-116'].abilities
      .find((a) => a.timing === 'activateMain')!
      .ops.find((o) => o.op === 'chooseOption') as { options: { ops: { op: string }[] }[] } | undefined;
    expect(declineBranch).toBeDefined();
    expect(declineBranch!.options[0].ops).toEqual([{ op: 'clearResult' }]);
  });

  it('EB03-054 end to end: pay the Life cost, decline the add, nothing is added', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'EB03-054', cardNumber: 'EB03-054' })));
    rig = putLifeCards(rig, 'p1', [FILLER, FILLER, FILLER]).rig;
    rig = putDeckCards(rig, 'p1', FILLER, 5).rig;

    const fired = runTimings(registry['EB03-054'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const paid = resumeChoice(fired.state, fired.pendingChoices[0].id, 1, registry, rig.defs, null); // pay

    expect(paid.pendingChoices).toHaveLength(1);
    expect(optionLabels(paid.pendingChoices[0])).toEqual(['Do not add a card', 'Add the top card of your deck']);

    const declined = resumeChoice(paid.state, paid.pendingChoices[0].id, 0, registry, rig.defs, null);
    expect(declined.state.players.p1.deck.cardIds).toHaveLength(5);
    expect(declined.state.players.p1.lifeArea.cardIds).toHaveLength(2);

    const added = resumeChoice(paid.state, paid.pendingChoices[0].id, 1, registry, rig.defs, null);
    expect(added.state.players.p1.deck.cardIds).toHaveLength(4);
    expect(added.state.players.p1.lifeArea.cardIds).toHaveLength(3);
  });
});
