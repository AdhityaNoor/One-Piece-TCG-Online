import { describe, expect, it } from 'vitest';
import { validatePlayStage, executePlayStage } from '../playStage';
import type { PlayStageAction } from '../../action';
import { buildBaseRig, putInHand, putStageInPlay, putDon, putDeckCards, makeStageDef, makeCharacterDef, nextTestId } from '../../../rules/shared/__tests__/testRig';
import type { EffectTemplateRegistry } from '../../../effects';

function playStageAction(playerId: string, handCardInstanceId: string, donInstanceIds: string[]): PlayStageAction {
  return { type: 'PLAY_STAGE', actionId: nextTestId('action'), playerId, handCardInstanceId, donInstanceIds };
}

describe('validatePlayStage', () => {
  it('rejects outside the Main Phase', () => {
    const base = buildBaseRig({ phase: 'don' });
    const { rig, instanceId } = putInHand(base, 'p1', makeStageDef({ baseCost: 0 }));
    const result = validatePlayStage(rig.state, playStageAction('p1', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a non-turn-player', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p2', makeStageDef({ baseCost: 0 }));
    const result = validatePlayStage(rig.state, playStageAction('p2', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a non-Stage card category', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeCharacterDef({ baseCost: 0 }));
    const result = validatePlayStage(rig.state, playStageAction('p1', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a DON!! count mismatched with cost', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeStageDef({ baseCost: 1 }));
    const result = validatePlayStage(rig.state, playStageAction('p1', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('accepts a well-formed PLAY_STAGE', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeStageDef({ baseCost: 1 }));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const result = validatePlayStage(withDon.state, playStageAction('p1', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(true);
  });
});

describe('executePlayStage', () => {
  it('moves the card from hand into an empty stageArea', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeStageDef({ baseCost: 0 });
    const { rig, instanceId: handInstanceId } = putInHand(base, 'p1', def);

    const result = executePlayStage(rig.state, playStageAction('p1', handInstanceId, []), rig.defs);

    expect(result.state.cardsById[handInstanceId]).toBeUndefined();
    const newStageIds = result.state.players.p1.stageArea.cardIds;
    expect(newStageIds).toHaveLength(1);
    expect(result.state.cardsById[newStageIds[0]].cardDefinitionId).toBe(def.cardDefinitionId);
    expect(result.state.cardsById[newStageIds[0]].currentZone).toBe('stageArea');
    expect(result.log.some((e) => e.type === 'CARD_PLAYED')).toBe(true);
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('trashes the previous Stage (no PendingChoice) when a new one is played', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: oldStageInstanceId } = putStageInPlay(base, 'p1', makeStageDef({ baseCost: 0 }));
    const { rig: withHand, instanceId: handInstanceId } = putInHand(rig, 'p1', makeStageDef({ baseCost: 0 }));

    const result = executePlayStage(withHand.state, playStageAction('p1', handInstanceId, []), withHand.defs);

    expect(result.state.players.p1.stageArea.cardIds).toHaveLength(1);
    expect(result.state.players.p1.stageArea.cardIds).not.toContain(oldStageInstanceId);
    expect(result.state.cardsById[oldStageInstanceId].currentZone).toBe('trash');
    expect(result.state.players.p1.trash.cardIds).toContain(oldStageInstanceId);
    expect(result.log.some((e) => e.type === 'CARD_MOVED')).toBe(true);
  });

  it('fires generic On Play abilities after the Stage resolves into play', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const stageDef = makeStageDef({ cardDefinitionId: 'SYN-STAGE', cardNumber: 'SYN-STAGE', baseCost: 0 });
    const drawDef = makeCharacterDef({ cardDefinitionId: 'SYN-DRAW', cardNumber: 'SYN-DRAW' });
    const { rig: withStage, instanceId: handInstanceId } = putInHand(base, 'p1', stageDef);
    const { rig } = putDeckCards(withStage, 'p1', drawDef, 1);
    const registry: EffectTemplateRegistry = {
      'SYN-STAGE': {
        cardNumber: 'SYN-STAGE',
        abilities: [{ timing: 'onPlay', ops: [{ op: 'draw', amount: 1 }] }],
      },
    };

    const result = executePlayStage(rig.state, playStageAction('p1', handInstanceId, []), rig.defs, registry);

    expect(result.state.players.p1.hand.cardIds).toHaveLength(1);
    expect(result.state.players.p1.deck.cardIds).toHaveLength(0);
    expect(result.log.some((entry) => entry.type === 'CARD_DRAWN')).toBe(true);
  });
});
