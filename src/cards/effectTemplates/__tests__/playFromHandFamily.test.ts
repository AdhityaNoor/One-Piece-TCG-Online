/**
 * Engine-capability test for `playFromHand`, including the rested-entry variant.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, makeStageDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
const MATCH = makeCharacterDef({ cardDefinitionId: 'SYN-MATCH', cardNumber: 'SYN-MATCH', category: 'character', baseCost: 2, basePower: 3000, types: ['Whitebeard Pirates'] });
const OFF = makeCharacterDef({ cardDefinitionId: 'SYN-OFF', cardNumber: 'SYN-OFF', category: 'character', baseCost: 5, basePower: 6000, types: ['Whitebeard Pirates'] });

describe('family: playFromHand', () => {
  it('can play a matching hand Character rested', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 2 }, rested: true }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const match = putInHand(rig, 'p1', MATCH);
    rig = match.rig;
    const off = putInHand(rig, 'p1', OFF);
    rig = off.rig;

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain(match.instanceId);
    expect(choice.constraints.candidateInstanceIds).not.toContain(off.instanceId);

    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, [match.instanceId], rig.defs, null, registry).state;
    expect(state.players.p1.hand.cardIds).not.toContain(match.instanceId);
    const played = state.players.p1.characterArea.cardIds
      .map((id) => state.cardsById[id])
      .find((card) => card.cardDefinitionId === MATCH.cardDefinitionId);
    expect(played?.orientation).toBe('rested');
  });

  it('can play a matching Stage from hand', () => {
    const STAGE = makeStageDef({ cardDefinitionId: 'SYN-STAGE', cardNumber: 'SYN-STAGE', baseCost: 1, types: ['Dressrosa'] });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'stage', typeIncludes: 'Dressrosa', maxCost: 1 }, maxTargets: 1 }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const stage = putInHand(rig, 'p1', STAGE);
    rig = stage.rig;

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice, [stage.instanceId], rig.defs, null, registry).state;
    expect(resolved.players.p1.hand.cardIds).not.toContain(stage.instanceId);
    expect(resolved.players.p1.stageArea.cardIds.some((id) => resolved.cardsById[id].cardDefinitionId === STAGE.cardDefinitionId)).toBe(true);
  });

  it('excludeColorsOfPreviousMove omits hand cards sharing a color with the returned Character', () => {
    const RED_FIELD = makeCharacterDef({ cardDefinitionId: 'RED-FIELD', cardNumber: 'RED-FIELD', category: 'character', baseCost: 3, colors: ['red'] });
    const GREEN_HAND = makeCharacterDef({ cardDefinitionId: 'GREEN-HAND', cardNumber: 'GREEN-HAND', category: 'character', baseCost: 2, colors: ['green'] });
    const RED_HAND = makeCharacterDef({ cardDefinitionId: 'RED-HAND', cardNumber: 'RED-HAND', category: 'character', baseCost: 2, colors: ['red'] });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: {
        timing: 'onPlay',
        functions: [
          { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, maxTargets: 1 },
          { fn: 'playFromHand', filter: { category: 'character', maxCost: 5, excludeColorsOfPreviousMove: true }, optional: true, ifPrevious: 'previousMovedAny' },
        ],
      },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let redFieldId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: redFieldId } = putCharacterInPlay(rig, 'p1', RED_FIELD));
    const green = putInHand(rig, 'p1', GREEN_HAND);
    rig = green.rig;
    const redHand = putInHand(rig, 'p1', RED_HAND);
    rig = redHand.rig;

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const moveChoice = fired.state.pendingChoices[0];
    const afterMove = resumeProgram(registry['SYN-SRC'], fired.state, moveChoice, [redFieldId], rig.defs, null, registry).state;
    const playChoice = afterMove.pendingChoices[0];
    expect(playChoice.constraints.candidateInstanceIds).toContain(green.instanceId);
    expect(playChoice.constraints.candidateInstanceIds).not.toContain(redHand.instanceId);
  });
});
