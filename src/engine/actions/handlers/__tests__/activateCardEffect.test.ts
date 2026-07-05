import { describe, expect, it } from 'vitest';
import { executeActivateCardEffect, validateActivateCardEffect } from '../activateCardEffect';
import type { ActivateCardEffectAction } from '../../action';
import type { EffectTemplateRegistry } from '../../../effects';
import { buildBaseRig, makeCharacterDef, makeStageDef, nextTestId, putCharacterInPlay, putDon, putStageInPlay } from '../../../rules/shared/__tests__/testRig';

function activate(sourceInstanceId: string, donInstanceIds: string[] = []): ActivateCardEffectAction {
  return {
    type: 'ACTIVATE_CARD_EFFECT',
    actionId: nextTestId('action'),
    playerId: 'p1',
    sourceInstanceId,
    effectId: 'main',
    donInstanceIds,
  };
}

describe('ACTIVATE_CARD_EFFECT ability costs', () => {
  it('requires the ability condition before activation, not just cost payment', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const stageDef = makeStageDef({ cardDefinitionId: 'SYN-CONDITIONAL-ACTIVATE', baseCost: 0 });
    const { rig, instanceId: stageId } = putStageInPlay(base, 'p1', stageDef, { donAttached: [] });
    const registry: EffectTemplateRegistry = {
      [stageDef.cardDefinitionId]: {
        cardNumber: stageDef.cardDefinitionId,
        abilities: [{ timing: 'activateMain', condition: { donAttachedAtLeast: 1 }, ops: [] }],
      },
    };

    expect(validateActivateCardEffect(rig.state, activate(stageId), registry, rig.defs).legal).toBe(false);

    const stateWithAttached = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [stageId]: { ...rig.state.cardsById[stageId], donAttached: ['synthetic-attached-don'] },
      },
    };
    expect(validateActivateCardEffect(stateWithAttached, activate(stageId), registry, rig.defs).legal).toBe(true);
  });

  it('requires explicit DON!! selection for DON!! -N costs', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const stageDef = makeStageDef({ cardDefinitionId: 'STAGE-DON-MINUS', baseCost: 0 });
    const { rig, instanceId: stageId } = putStageInPlay(base, 'p1', stageDef);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1, { rested: true });
    const registry: EffectTemplateRegistry = {
      [stageDef.cardDefinitionId]: {
        cardNumber: stageDef.cardDefinitionId,
        abilities: [{ timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], ops: [{ op: 'draw', amount: 1 }] }],
      },
    };

    expect(validateActivateCardEffect(withDon.state, activate(stageId), registry, withDon.defs).legal).toBe(false);
    expect(validateActivateCardEffect(withDon.state, activate(stageId, [donIds[0]]), registry, withDon.defs).legal).toBe(true);
  });

  it('can return an attached DON!! for DON!! -N and detaches that exact card', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const stageDef = makeStageDef({ cardDefinitionId: 'STAGE-DON-MINUS', baseCost: 0 });
    const { rig, instanceId: stageId } = putStageInPlay(base, 'p1', stageDef);
    const { rig: withChar, instanceId: charId } = putCharacterInPlay(rig, 'p1', makeCharacterDef());
    const { rig: withDon, donIds } = putDon(withChar, 'p1', 2);
    const [attachedDonId, otherDonId] = donIds;
    const stateWithAttached = {
      ...withDon.state,
      cardsById: {
        ...withDon.state.cardsById,
        [attachedDonId]: { ...withDon.state.cardsById[attachedDonId], donRested: true },
        [charId]: { ...withDon.state.cardsById[charId], donAttached: [attachedDonId] },
      },
    };
    const registry: EffectTemplateRegistry = {
      [stageDef.cardDefinitionId]: {
        cardNumber: stageDef.cardDefinitionId,
        abilities: [{ timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], ops: [] }],
      },
    };

    const result = executeActivateCardEffect(stateWithAttached, activate(stageId, [attachedDonId]), withDon.defs, registry);

    expect(result.state.players.p1.costArea.cardIds).not.toContain(attachedDonId);
    expect(result.state.players.p1.costArea.cardIds).toContain(otherDonId);
    expect(result.state.players.p1.donDeck.cardIds).toContain(attachedDonId);
    expect(result.state.cardsById[charId].donAttached).toEqual([]);
    expect(result.state.cardsById[attachedDonId].currentZone).toBe('donDeck');
    expect(result.state.cardsById[attachedDonId].donRested).toBe(false);
  });
});
