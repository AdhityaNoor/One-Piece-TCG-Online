/**
 * Regression for the OP13-082 bug: when several Characters enter play together
 * via one effect and an earlier card's [On Play] suspends for input, the
 * remaining cards' On Play triggers must still fire — in order — after each
 * choice resolves, rather than being silently dropped.
 *
 * settleEntryTriggers drains GameState.pendingEntryTriggers one card at a time.
 * We use a `chooseOne` On Play, which deterministically emits a SELECT_OPTION
 * PendingChoice regardless of board state, so the suspension is guaranteed.
 */
import { describe, expect, it } from 'vitest';
import { settleEntryTriggers } from '../settleEntryTriggers';
import { resumeProgram } from '../../../effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from './testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../../cards/effectTemplates/assembler';

const ALPHA = makeCharacterDef({ cardDefinitionId: 'SYN-A', cardNumber: 'SYN-A', name: 'Alpha' });
const BETA = makeCharacterDef({ cardDefinitionId: 'SYN-B', cardNumber: 'SYN-B', name: 'Beta' });

const CHOOSE_ONE_ON_PLAY = (cardNumber: string, prompt: string): CardEffectAssignment => ({
  cardNumber,
  templateId: 'ability',
  params: {
    timing: 'onPlay',
    functions: [
      {
        fn: 'chooseOne',
        chooser: 'controller',
        prompt,
        options: [
          { label: 'yes', functions: [] },
          { label: 'no', functions: [] },
        ],
      },
    ],
  },
});

describe('settleEntryTriggers (deferred simultaneous On Play, OP13-082 shape)', () => {
  function setup() {
    const registry = buildRegistryFromAssignments([
      CHOOSE_ONE_ON_PLAY('SYN-A', 'Alpha On Play?'),
      CHOOSE_ONE_ON_PLAY('SYN-B', 'Beta On Play?'),
    ]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let alphaId: string;
    let betaId: string;
    ({ rig, instanceId: alphaId } = putCharacterInPlay(rig, 'p1', ALPHA));
    ({ rig, instanceId: betaId } = putCharacterInPlay(rig, 'p1', BETA));
    // Both entered play together; neither On Play has fired yet.
    const state = { ...rig.state, pendingEntryTriggers: [alphaId, betaId], pendingChoices: [] };
    return { registry, defs: rig.defs, state, alphaId, betaId };
  }

  it('fires the first deferred On Play and keeps the rest queued, in order', () => {
    const { registry, defs, state, alphaId, betaId } = setup();

    const first = settleEntryTriggers(state, registry, defs, null);
    expect(first.pendingChoices).toHaveLength(1);
    expect(first.pendingChoices[0].sourceInstanceId).toBe(alphaId);
    expect(first.state.pendingEntryTriggers).toEqual([betaId]);
  });

  it('fires the second deferred On Play after the first resolves', () => {
    const { registry, defs, state, alphaId, betaId } = setup();

    const first = settleEntryTriggers(state, registry, defs, null);
    const alphaChoice = first.state.pendingChoices.find((c) => c.sourceInstanceId === alphaId)!;
    const afterAlpha = resumeProgram(registry['SYN-A'], first.state, alphaChoice, 0, defs, null, registry);
    // Alpha's choice is consumed; Beta is still owed its trigger.
    expect(afterAlpha.state.pendingChoices.some((c) => c.sourceInstanceId === alphaId)).toBe(false);
    expect(afterAlpha.state.pendingEntryTriggers).toEqual([betaId]);

    const second = settleEntryTriggers(afterAlpha.state, registry, defs, null);
    expect(second.pendingChoices).toHaveLength(1);
    expect(second.pendingChoices[0].sourceInstanceId).toBe(betaId);
    expect(second.state.pendingEntryTriggers ?? []).toEqual([]);
  });

  it('does nothing while another choice is still outstanding', () => {
    const { registry, defs, state } = setup();
    const gated = { ...state, pendingChoices: [{ id: 'x', playerId: 'p1', kind: 'YES_NO', prompt: '?', constraints: { min: 1, max: 1 }, sourceInstanceId: 'other', sourceEffectId: 'ir' } as never] };
    const result = settleEntryTriggers(gated, registry, defs, null);
    expect(result.pendingChoices).toHaveLength(0);
    expect(result.state).toBe(gated);
  });
});
