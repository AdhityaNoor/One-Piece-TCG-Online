import { describe, expect, it } from 'vitest';
import { fireRemovedFromFieldReactions } from '../index';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, putCharacterInPlay, putDeckCards } from '../../rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';

describe('onRemovedFromField timing', () => {
  const hancockLeader = makeLeaderDef({ cardDefinitionId: 'OP07-038', cardNumber: 'OP07-038', baseCost: 5 });
  const victim = makeCharacterDef({ cardDefinitionId: 'VICTIM-DEF', cardNumber: 'VICTIM-001', baseCost: 2, basePower: 2000 });
  const deckFiller = makeCharacterDef({ cardDefinitionId: 'DECK-DEF', cardNumber: 'DECK-001', baseCost: 1 });

  const hancockAssignment: CardEffectAssignment = {
    cardNumber: 'OP07-038',
    templateId: 'ability',
    params: {
      timing: 'onRemovedFromField',
      oncePerTurn: true,
      condition: { turn: 'your' },
      gate: [{ kind: 'removedFromFieldCategory', category: 'character' }, { kind: 'removedByEffectController', player: 'controller' }],
      functions: [{ fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 5 }] }],
    },
  };

  it('draws when your effect removes an opponent Character', () => {
    const registry = buildRegistryFromAssignments([hancockAssignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: hancockLeader });
    rig = putDeckCards(rig, 'p1', deckFiller, 5).rig;
    let victimId: string;
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', victim, { orientation: 'active' }));

    const handBefore = rig.state.players.p1.hand.cardIds.length;
    const fired = fireRemovedFromFieldReactions(
      rig.state,
      { targetInstanceId: victimId, removedControllerId: 'p2', effectControllerId: 'p1', removedToZone: 'trash' },
      registry,
      rig.defs,
      'test',
    );
    expect(fired.state.players.p1.hand.cardIds.length).toBe(handBefore + 1);
  });

  it('does not fire when the effect controller is the opponent', () => {
    const registry = buildRegistryFromAssignments([hancockAssignment]);
    let rig = buildBaseRig({ activePlayerId: 'p2', leaderOverridesP1: hancockLeader });
    let victimId: string;
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', victim, { orientation: 'active' }));

    const handBefore = rig.state.players.p1.hand.cardIds.length;
    const fired = fireRemovedFromFieldReactions(
      rig.state,
      { targetInstanceId: victimId, removedControllerId: 'p2', effectControllerId: 'p2', removedToZone: 'trash' },
      registry,
      rig.defs,
      'test',
    );
    expect(fired.state.players.p1.hand.cardIds.length).toBe(handBefore);
  });

  it('can require a specific removal destination zone', () => {
    const handOnlyAssignment: CardEffectAssignment = {
      cardNumber: 'DESTINATION-GATED',
      templateId: 'ability',
      params: {
        timing: 'onRemovedFromField',
        condition: { turn: 'your' },
        gate: [
          { kind: 'removedFromFieldCategory', category: 'character' },
          { kind: 'removedByEffectController', player: 'controller' },
          { kind: 'removedToZone', zone: 'hand' },
        ],
        functions: [{ fn: 'draw', amount: 1 }],
      },
    };
    const registry = buildRegistryFromAssignments([handOnlyAssignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: { ...hancockLeader, cardDefinitionId: 'DESTINATION-GATED', cardNumber: 'DESTINATION-GATED' } });
    rig = putDeckCards(rig, 'p1', deckFiller, 5).rig;
    let victimId: string;
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', victim, { orientation: 'active' }));

    const handBefore = rig.state.players.p1.hand.cardIds.length;
    const deckRemoval = fireRemovedFromFieldReactions(
      rig.state,
      { targetInstanceId: victimId, removedControllerId: 'p2', effectControllerId: 'p1', removedToZone: 'deck' },
      registry,
      rig.defs,
      'test',
    );
    expect(deckRemoval.state.players.p1.hand.cardIds.length).toBe(handBefore);

    const handRemoval = fireRemovedFromFieldReactions(
      rig.state,
      { targetInstanceId: victimId, removedControllerId: 'p2', effectControllerId: 'p1', removedToZone: 'hand' },
      registry,
      rig.defs,
      'test',
    );
    expect(handRemoval.state.players.p1.hand.cardIds.length).toBe(handBefore + 1);
  });
});
