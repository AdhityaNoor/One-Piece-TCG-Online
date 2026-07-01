/**
 * ACTIVATE_COUNTER_EVENT validation (7-1-3-2-2). The full play→trash→[Counter]
 * firing path is covered end-to-end in
 * cards/effectTemplates/__tests__/matchIntegration.test.ts covers registry-to-dispatch wiring; here we
 * cover the handler's own structural gates.
 */
import { describe, expect, it } from 'vitest';
import { executeActivateCounterEvent, validateActivateCounterEvent } from '../activateCounterEvent';
import type { ActivateCounterEventAction } from '../../action';
import type { BattleState } from '../../../state/game';
import type { EffectTemplateRegistry } from '../../../effects';
import { buildBaseRig, makeEventDef, nextTestId, putDon, putInHand } from '../../../rules/shared/__tests__/testRig';

function counterEvent(playerId: string, handCardInstanceId = 'x', donInstanceIds: string[] = []): ActivateCounterEventAction {
  return { type: 'ACTIVATE_COUNTER_EVENT', actionId: nextTestId('action'), playerId, handCardInstanceId, donInstanceIds };
}

function battleAt(step: BattleState['step'], overrides: Partial<BattleState> = {}): BattleState {
  return {
    attackerInstanceId: 'attacker-x',
    targetInstanceId: 'target-x',
    originalTargetInstanceId: 'target-x',
    step,
    blockerUsed: false,
    battlePowerBonuses: {},
    ...overrides,
  };
}

describe('validateActivateCounterEvent', () => {
  it('rejects when no Battle / Counter Step is active', () => {
    const { state, defs } = buildBaseRig({ phase: 'main' });
    const result = validateActivateCounterEvent(state, counterEvent('p1'), defs, {});
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/Counter Step/i);
  });

  it('validates and pays a structured DON!! -1 [Counter] ability cost separately from the Event play cost', () => {
    const effectText = '[Counter] DON!! -1: Up to 1 of your Leader or Character cards gains +4000 power during this battle.';
    const eventDef = makeEventDef({ cardDefinitionId: 'COSTED-COUNTER', baseCost: 0, text: effectText });
    const registry: EffectTemplateRegistry = {
      'COSTED-COUNTER': {
        cardNumber: 'COSTED-COUNTER',
        abilities: [
          {
            trigger: 'counter',
            cost: [{ kind: 'donMinus', count: 1 }],
            ops: [
              { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrCharacters' }, min: 0, max: 1, prompt: 'Choose your Leader or 1 Character to gain +4000 power this battle (or decline).' },
              { op: 'addPower', target: { sel: 'var', name: 't' }, amount: 4000, duration: 'duringThisBattle' },
            ],
          },
        ],
      },
    };
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig: withHand, instanceId: eventId } = putInHand(base, 'p2', eventDef);
    const { rig: withDon, donIds } = putDon(withHand, 'p2', 1);
    const state = { ...withDon.state, currentBattle: battleAt('counter') };
    const action = counterEvent('p2', eventId);

    expect(validateActivateCounterEvent(state, action, withDon.defs, registry).legal).toBe(true);
    const result = executeActivateCounterEvent(state, action, withDon.defs, registry);

    expect(result.state.players.p2.costArea.cardIds).not.toContain(donIds[0]);
    expect(result.state.players.p2.donDeck.cardIds).toContain(donIds[0]);
    expect(result.state.cardsById[eventId].currentZone).toBe('trash');
    expect(result.pendingChoices[0].constraints.candidateInstanceIds).toContain(state.players.p2.leaderInstanceId);
  });
});
