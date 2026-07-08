import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../effectIr';
import { afterAbilityCostPaid } from '../fireTiming';
import { payAbilityCost } from '../abilityCost';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, putCharacterInPlay, putDon, putDonDeckCards } from '../../rules/shared/__tests__/testRig';

describe('onDonReturned timing', () => {
  it('fires when DON!! −N returns enough DON!! on your turn', () => {
    const leaderDef = makeLeaderDef({ cardDefinitionId: 'OP09-061-DEF', cardNumber: 'OP09-061' });
    const base = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: leaderDef });
    const payerDef = makeCharacterDef({ cardDefinitionId: 'PAYER-DEF', cardNumber: 'PAYER-001', baseCost: 3 });
    const withDon = putDon(base, 'p1', 5);
    const withDonDeck = putDonDeckCards(withDon.rig, 'p1', 10);
    const withPayer = putCharacterInPlay(withDonDeck.rig, 'p1', payerDef);
    const donIds = withPayer.rig.state.players.p1.costArea.cardIds;

    const leaderProgram: EffectProgram = {
      cardNumber: 'OP09-061',
      abilities: [{
        timing: 'onDonReturned',
        oncePerTurn: true,
        condition: { turn: 'your' },
        gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 2 }],
        ops: [{ op: 'addDonFromDeck', count: 1, rested: false }],
      }],
    };

    const registry = {
      [leaderDef.cardDefinitionId]: leaderProgram,
      [payerDef.cardDefinitionId]: { cardNumber: 'PAYER-001', abilities: [] },
    };

    const costAreaBefore = withPayer.rig.state.players.p1.costArea.cardIds.length;
    const paid = payAbilityCost(
      withPayer.rig.state,
      withPayer.instanceId,
      'p1',
      [{ kind: 'donMinus', count: 2 }],
      'test-action',
      donIds.slice(0, 2),
    );
    expect(paid.returnedDonCount).toBe(2);

    const result = afterAbilityCostPaid(paid.state, 'p1', paid, registry, withPayer.rig.defs, 'test-action');
    expect(result.state.players.p1.costArea.cardIds.length).toBe(costAreaBefore - 2 + 1);
  });

  it('does not fire when fewer DON!! are returned than the gate requires', () => {
    const leaderDef = makeLeaderDef({ cardDefinitionId: 'OP09-061-DEF2', cardNumber: 'OP09-061' });
    const base = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: leaderDef });
    const payerDef = makeCharacterDef({ cardDefinitionId: 'PAYER-DEF2', cardNumber: 'PAYER-002', baseCost: 1 });
    const withDon = putDon(base, 'p1', 3);
    const withDonDeck = putDonDeckCards(withDon.rig, 'p1', 10);
    const withPayer = putCharacterInPlay(withDonDeck.rig, 'p1', payerDef);
    const donIds = withPayer.rig.state.players.p1.costArea.cardIds;

    const leaderProgram: EffectProgram = {
      cardNumber: 'OP09-061',
      abilities: [{
        timing: 'onDonReturned',
        condition: { turn: 'your' },
        gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 2 }],
        ops: [{ op: 'addDonFromDeck', count: 1, rested: false }],
      }],
    };

    const registry = { [leaderDef.cardDefinitionId]: leaderProgram };
    const costAreaBefore = withPayer.rig.state.players.p1.costArea.cardIds.length;
    const paid = payAbilityCost(
      withPayer.rig.state,
      withPayer.instanceId,
      'p1',
      [{ kind: 'donMinus', count: 1 }],
      'test-action',
      [donIds[0]],
    );
    const result = afterAbilityCostPaid(paid.state, 'p1', paid, registry, withPayer.rig.defs, 'test-action');
    expect(result.state.players.p1.costArea.cardIds.length).toBe(costAreaBefore - 1);
  });
});
