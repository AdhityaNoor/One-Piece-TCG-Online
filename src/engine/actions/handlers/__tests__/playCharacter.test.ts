import { describe, expect, it } from 'vitest';
import type { GameState } from '../../../state/game';
import { validatePlayCharacter, executePlayCharacter } from '../playCharacter';
import { computeCurrentCost } from '../../../rules/shared/power';
import type { PlayCharacterAction } from '../../action';
import {
  buildBaseRig,
  putInHand,
  putCharacterInPlay,
  putDon,
  makeCharacterDef,
  nextTestId,
} from '../../../rules/shared/__tests__/testRig';

function playCharacterAction(playerId: string, handCardInstanceId: string, donInstanceIds: string[]): PlayCharacterAction {
  return { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId, handCardInstanceId, donInstanceIds };
}

describe('validatePlayCharacter', () => {
  it('rejects outside the Main Phase', () => {
    const base = buildBaseRig({ phase: 'draw' });
    const def = makeCharacterDef({ baseCost: 1 });
    const { rig, instanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const result = validatePlayCharacter(withDon.state, playCharacterAction('p1', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a non-turn-player', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 1 });
    const { rig, instanceId } = putInHand(base, 'p2', def);
    const { rig: withDon, donIds } = putDon(rig, 'p2', 1);
    const result = validatePlayCharacter(withDon.state, playCharacterAction('p2', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a card that is not in the hand', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 0 });
    const { rig } = putCharacterInPlay(base, 'p1', def); // already in play, not in hand
    const result = validatePlayCharacter(rig.state, playCharacterAction('p1', 'no-such-instance', []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a non-Character card category', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const eventLikeDef = makeCharacterDef({ category: 'event', baseCost: 0 });
    const { rig, instanceId } = putInHand(base, 'p1', eventLikeDef);
    const result = validatePlayCharacter(rig.state, playCharacterAction('p1', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a DON!! count that does not match cost', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 2 });
    const { rig, instanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1); // only 1, needs 2
    const result = validatePlayCharacter(withDon.state, playCharacterAction('p1', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects duplicate donInstanceIds', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 2 });
    const { rig, instanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const result = validatePlayCharacter(withDon.state, playCharacterAction('p1', instanceId, [donIds[0], donIds[0]]), withDon.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects an already-rested DON!! as payment', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 1 });
    const { rig, instanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1, { rested: true });
    const result = validatePlayCharacter(withDon.state, playCharacterAction('p1', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(false);
  });

  it('accepts a well-formed PLAY_CHARACTER', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 1 });
    const { rig, instanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const result = validatePlayCharacter(withDon.state, playCharacterAction('p1', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(true);
  });
});

describe('executePlayCharacter', () => {
  it('moves the card from hand to characterArea under a freshly minted instanceId, resting the paid DON!!', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 1, basePower: 3000 });
    const { rig, instanceId: handInstanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);

    const result = executePlayCharacter(withDon.state, playCharacterAction('p1', handInstanceId, donIds), withDon.defs);

    expect(result.state.cardsById[handInstanceId]).toBeUndefined();
    expect(result.state.players.p1.hand.cardIds).not.toContain(handInstanceId);

    const newCharacterIds = result.state.players.p1.characterArea.cardIds;
    expect(newCharacterIds).toHaveLength(1);
    const newInstance = result.state.cardsById[newCharacterIds[0]];
    expect(newInstance.cardDefinitionId).toBe(def.cardDefinitionId);
    expect(newInstance.currentZone).toBe('characterArea');
    expect(newInstance.orientation).toBe('active');
    expect(newInstance.currentPower).toBe(3000);
    expect(newInstance.summoningSick).toBe(true); // no Rush

    expect(result.state.cardsById[donIds[0]].donRested).toBe(true);
    expect(result.log.some((e) => e.type === 'CARD_PLAYED')).toBe(true);
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('a Character with Rush enters play without summoning sickness', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeCharacterDef({ baseCost: 0, hasRush: true });
    const { rig, instanceId: handInstanceId } = putInHand(base, 'p1', def);

    const result = executePlayCharacter(rig.state, playCharacterAction('p1', handInstanceId, []), rig.defs);
    const newId = result.state.players.p1.characterArea.cardIds[0];
    expect(result.state.cardsById[newId].summoningSick).toBe(false);
  });

  it('queues a characterAreaOverflow PendingChoice when a 6th Character is played', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const fielded = makeCharacterDef({ baseCost: 0 });
    let rig = base;
    for (let i = 0; i < 5; i += 1) {
      rig = putCharacterInPlay(rig, 'p1', fielded).rig;
    }
    const { rig: withHand, instanceId: handInstanceId } = putInHand(rig, 'p1', makeCharacterDef({ baseCost: 0 }));

    const result = executePlayCharacter(withHand.state, playCharacterAction('p1', handInstanceId, []), withHand.defs);

    expect(result.state.players.p1.characterArea.cardIds).toHaveLength(6);
    expect(result.pendingChoices).toHaveLength(1);
    expect(result.pendingChoices[0].sourceEffectId).toBe('rule:characterAreaOverflow');
    expect(result.pendingChoices[0].playerId).toBe('p1');
    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.log.some((e) => e.type === 'CHOICE_REQUESTED')).toBe(true);
  });

  it('accepts reduced DON!! payment when a one-shot in-hand play discount applies', () => {
    const def = makeCharacterDef({ baseCost: 4, types: ['Land of Wano'], cardNumber: 'WAN-PLAY' });
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handInstanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 4);
    const state: GameState = {
      ...withDon.state,
      continuousEffects: [{
        id: 'discount',
        sourceInstanceId: withDon.state.players.p1.leaderInstanceId!,
        ownerId: 'p1',
        duration: 'duringThisTurn',
        usesRemaining: 1,
        description: 'next play -1',
        costModifier: {
          appliesToGroup: { controllerCharactersInHand: true, anyOfTypes: ['Land of Wano'] },
          amount: -1,
          condition: { minBaseCost: 3 },
        },
      }],
    };
    expect(computeCurrentCost(withDon.defs, state, handInstanceId)).toBe(3);
    const validation = validatePlayCharacter(state, playCharacterAction('p1', handInstanceId, donIds.slice(0, 3)), withDon.defs);
    expect(validation.legal).toBe(true);
    const result = executePlayCharacter(state, playCharacterAction('p1', handInstanceId, donIds.slice(0, 3)), withDon.defs);
    expect(result.state.continuousEffects.some((ce) => ce.id === 'discount')).toBe(false);
    expect(result.state.players.p1.characterArea.cardIds).toHaveLength(1);
  });
});
