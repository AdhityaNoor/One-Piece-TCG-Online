import { describe, expect, it } from 'vitest';
import { validateResolvePendingChoice, executeResolvePendingChoice } from '../resolvePendingChoice';
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
