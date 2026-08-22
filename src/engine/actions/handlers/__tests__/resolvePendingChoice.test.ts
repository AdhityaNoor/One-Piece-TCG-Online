import { describe, expect, it } from 'vitest';
import { validateResolvePendingChoice, executeResolvePendingChoice } from '../resolvePendingChoice';
import { validateAction } from '../../dispatch';
import type { ResolvePendingChoiceAction } from '../../action';
import type { PendingChoice } from '../../../events/pendingChoice';
import { buildBaseRig, putCharacterInPlay, makeCharacterDef, nextTestId } from '../../../rules/shared/__tests__/testRig';
import type { Rig } from '../../../rules/shared/__tests__/testRig';

function resolveAction(playerId: string, choiceId: string, response: string[] | number | boolean): ResolvePendingChoiceAction {
  return { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId, choiceId, response };
}

function overflowChoice(playerId: string, choiceId = nextTestId('choice')): PendingChoice {
  return {
    id: choiceId,
    playerId,
    kind: 'SELECT_CARDS',
    prompt: 'Choose 1 Character to trash.',
    constraints: { min: 1, max: 1, zoneId: 'characterArea' },
    sourceInstanceId: null,
    sourceEffectId: 'rule:characterAreaOverflow',
  };
}

function rigWithOverflowChoice(): { rig: Rig; charId: string; choice: PendingChoice } {
  const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
  const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef());
  const choice = overflowChoice('p1');
  const gated: Rig = { state: { ...rig.state, pendingChoices: [choice] }, defs: rig.defs };
  return { rig: gated, charId, choice };
}

describe('validateResolvePendingChoice', () => {
  it('rejects an unknown choiceId', () => {
    const { rig } = rigWithOverflowChoice();
    const result = validateResolvePendingChoice(rig.state, resolveAction('p1', 'no-such-choice', ['x']));
    expect(result.legal).toBe(false);
  });

  it('rejects a player who does not own the choice', () => {
    const { rig, charId, choice } = rigWithOverflowChoice();
    const result = validateResolvePendingChoice(rig.state, resolveAction('p2', choice.id, [charId]));
    expect(result.legal).toBe(false);
  });

  it('rejects a response that is not a 1-element array for characterAreaOverflow', () => {
    const { rig, choice } = rigWithOverflowChoice();
    const result = validateResolvePendingChoice(rig.state, resolveAction('p1', choice.id, []));
    expect(result.legal).toBe(false);
  });

  it('rejects a chosen card id not currently in the Character Area', () => {
    const { rig, choice } = rigWithOverflowChoice();
    const result = validateResolvePendingChoice(rig.state, resolveAction('p1', choice.id, ['not-a-real-card']));
    expect(result.legal).toBe(false);
  });

  it('rejects an unrecognized sourceEffectId', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const weirdChoice: PendingChoice = {
      id: nextTestId('choice'),
      playerId: 'p1',
      kind: 'YES_NO',
      prompt: 'Something not implemented.',
      constraints: { min: 1, max: 1 },
      sourceInstanceId: null,
      sourceEffectId: 'some:other:effect',
    };
    const gated = { ...base.state, pendingChoices: [weirdChoice] };
    const result = validateResolvePendingChoice(gated, resolveAction('p1', weirdChoice.id, true));
    expect(result.legal).toBe(false);
  });

  it('accepts a valid characterAreaOverflow resolution', () => {
    const { rig, charId, choice } = rigWithOverflowChoice();
    const result = validateResolvePendingChoice(rig.state, resolveAction('p1', choice.id, [charId]));
    expect(result.legal).toBe(true);
  });

  it('rejects duplicate printed names when an IR card choice requires distinct names', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const first = putCharacterInPlay(base, 'p1', makeCharacterDef({ cardDefinitionId: 'elder-a', name: 'Five Elder' }));
    const second = putCharacterInPlay(first.rig, 'p1', makeCharacterDef({ cardDefinitionId: 'elder-b', name: 'Five Elder' }));
    const choice: PendingChoice = {
      id: nextTestId('choice'),
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Play up to 5 cards with different card names.',
      constraints: { min: 0, max: 5, candidateInstanceIds: [first.instanceId, second.instanceId], distinctNames: true },
      sourceInstanceId: first.instanceId,
      sourceEffectId: 'ir',
    };
    const state = { ...second.rig.state, pendingChoices: [choice] };
    const result = validateResolvePendingChoice(state, resolveAction('p1', choice.id, [first.instanceId, second.instanceId]), second.rig.defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('different card names');
  });

  it('enforces maxCombinedCost across a multi-select ("a total cost of N or less")', () => {
    // OP17-119: "K.O. your opponent's Characters with a total cost of 4 or less."
    // The cap is on the SUM of the selection, so any single legal card must stay
    // selectable while an over-budget combination is refused.
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const three = putCharacterInPlay(base, 'p2', makeCharacterDef({ cardDefinitionId: 'cost-3', name: 'Cheap', baseCost: 3 }));
    const two = putCharacterInPlay(three.rig, 'p2', makeCharacterDef({ cardDefinitionId: 'cost-2', name: 'Cheaper', baseCost: 2 }));
    const choice: PendingChoice = {
      id: nextTestId('choice'),
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: "K.O. your opponent's Characters with a total cost of 4 or less.",
      constraints: { min: 0, max: 4, candidateInstanceIds: [three.instanceId, two.instanceId], maxCombinedCost: 4 },
      sourceInstanceId: null,
      sourceEffectId: 'ir',
    };
    const state = { ...two.rig.state, pendingChoices: [choice] };

    // 3 + 2 = 5 > 4 → refused, and the message names the overage.
    const both = validateResolvePendingChoice(state, resolveAction('p1', choice.id, [three.instanceId, two.instanceId]), two.rig.defs);
    expect(both.legal).toBe(false);
    expect(both.reasons.join(' ')).toContain('combined cost is 5');

    // Either card alone is under the cap.
    expect(validateResolvePendingChoice(state, resolveAction('p1', choice.id, [three.instanceId]), two.rig.defs).legal).toBe(true);
    expect(validateResolvePendingChoice(state, resolveAction('p1', choice.id, [two.instanceId]), two.rig.defs).legal).toBe(true);
    // Declining is legal — candidate lists are not pre-filtered by the cap, so
    // min stays 0 to avoid a softlock when nothing affordable is on the board.
    expect(validateResolvePendingChoice(state, resolveAction('p1', choice.id, []), two.rig.defs).legal).toBe(true);
  });

  it('reads maxCombinedCost as CURRENT cost, so cost modifiers move the budget', () => {
    // Loki's own package pushes costs around (+12 cost on Elbaph bodies, −1 cost
    // debuffs), so the cap has to read through continuous modifiers, not baseCost.
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const a = putCharacterInPlay(base, 'p2', makeCharacterDef({ cardDefinitionId: 'c-3a', name: 'A', baseCost: 3 }));
    const b = putCharacterInPlay(a.rig, 'p2', makeCharacterDef({ cardDefinitionId: 'c-3b', name: 'B', baseCost: 3 }));
    const choice: PendingChoice = {
      id: nextTestId('choice'),
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Total cost 4 or less.',
      constraints: { min: 0, max: 4, candidateInstanceIds: [a.instanceId, b.instanceId], maxCombinedCost: 4 },
      sourceInstanceId: null,
      sourceEffectId: 'ir',
    };

    // Printed 3 + 3 = 6 → over budget.
    const plain = { ...b.rig.state, pendingChoices: [choice] };
    expect(validateResolvePendingChoice(plain, resolveAction('p1', choice.id, [a.instanceId, b.instanceId]), b.rig.defs).legal).toBe(false);

    // Give each −1 cost: 2 + 2 = 4 → now exactly at the cap.
    const discounted = {
      ...plain,
      continuousEffects: [
        { id: 'd-a', sourceInstanceId: a.instanceId, ownerId: 'p1' as const, duration: 'duringThisTurn' as const, description: '-1 cost', costModifier: { appliesToInstanceId: a.instanceId, amount: -1 } },
        { id: 'd-b', sourceInstanceId: b.instanceId, ownerId: 'p1' as const, duration: 'duringThisTurn' as const, description: '-1 cost', costModifier: { appliesToInstanceId: b.instanceId, amount: -1 } },
      ],
    };
    expect(validateResolvePendingChoice(discounted, resolveAction('p1', choice.id, [a.instanceId, b.instanceId]), b.rig.defs).legal).toBe(true);
  });

  it('enforces distinct names through the dispatcher — regression: defs must be forwarded (OP13-082 dup-name bug)', () => {
    // The dispatcher previously called validateResolvePendingChoice(state, action)
    // without `defs`, so printedNameOf() returned undefined for every card and
    // the distinctNames constraint was silently skipped — letting a "different
    // card names" effect (e.g. OP13-082) select two same-named cards.
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const first = putCharacterInPlay(base, 'p1', makeCharacterDef({ cardDefinitionId: 'elder-a', name: 'Five Elder' }));
    const second = putCharacterInPlay(first.rig, 'p1', makeCharacterDef({ cardDefinitionId: 'elder-b', name: 'Five Elder' }));
    const choice: PendingChoice = {
      id: nextTestId('choice'),
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      prompt: 'Play up to 5 cards with different card names.',
      constraints: { min: 0, max: 5, candidateInstanceIds: [first.instanceId, second.instanceId], distinctNames: true },
      sourceInstanceId: first.instanceId,
      sourceEffectId: 'ir',
    };
    const state = { ...second.rig.state, pendingChoices: [choice] };
    const result = validateAction(state, resolveAction('p1', choice.id, [first.instanceId, second.instanceId]), second.rig.defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('different card names');
  });
});

describe('executeResolvePendingChoice', () => {
  it('trashes the chosen Character, resets its donAttached, and clears the PendingChoice', () => {
    const { rig, charId, choice } = rigWithOverflowChoice();
    const result = executeResolvePendingChoice(rig.state, resolveAction('p1', choice.id, [charId]));

    expect(result.state.cardsById[charId].currentZone).toBe('trash');
    expect(result.state.cardsById[charId].donAttached).toEqual([]);
    expect(result.state.players.p1.characterArea.cardIds).not.toContain(charId);
    expect(result.state.players.p1.trash.cardIds).toContain(charId);
    expect(result.state.pendingChoices).toHaveLength(0);
    expect(result.log.some((e) => e.type === 'CARD_MOVED')).toBe(true);
    expect(result.log.some((e) => e.type === 'CHOICE_RESOLVED')).toBe(true);
    expect(result.pendingChoices).toHaveLength(0); // delta is empty — nothing NEW is pending
  });
});
