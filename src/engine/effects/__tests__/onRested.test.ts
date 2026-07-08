import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../effectIr';
import { fireRestTransitions } from '../fireTiming';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../rules/shared/__tests__/testRig';

describe('onRested timing', () => {
  it('fires a curated onRested ability when the card becomes rested on your turn', () => {
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const johnnyDef = makeCharacterDef({ cardDefinitionId: 'OP14-028-DEF', cardNumber: 'OP14-028', baseCost: 3 });
    const oppCharDef = makeCharacterDef({ baseCost: 2 });
    const { rig, instanceId: johnnyId } = putCharacterInPlay(base, 'p1', johnnyDef);
    const opp = putCharacterInPlay(rig, 'p2', oppCharDef, { orientation: 'rested' });

    const program: EffectProgram = {
      cardNumber: 'OP14-028',
      abilities: [{
        timing: 'onRested',
        condition: { turn: 'your' },
        ops: [{ op: 'ko', target: { sel: 'opponentCharacters', maxCost: 2, rested: true } }],
      }],
    };

    const registry = { [johnnyDef.cardDefinitionId]: program };
    const restedState = {
      ...opp.rig.state,
      cardsById: { ...opp.rig.state.cardsById, [johnnyId]: { ...opp.rig.state.cardsById[johnnyId], orientation: 'rested' as const } },
    };

    const result = fireRestTransitions(restedState, [johnnyId], registry, opp.rig.defs, 'test-action');
    expect(result.state.cardsById[opp.instanceId]?.currentZone).toBe('trash');
  });

  it('does not fire onRested on the opponent\'s turn when gated to [Your Turn]', () => {
    const base = buildBaseRig({ activePlayerId: 'p2' });
    const johnnyDef = makeCharacterDef({ cardDefinitionId: 'OP14-028-DEF2', cardNumber: 'OP14-028' });
    const oppCharDef = makeCharacterDef({ baseCost: 2 });
    const { rig, instanceId: johnnyId } = putCharacterInPlay(base, 'p1', johnnyDef);
    const opp = putCharacterInPlay(rig, 'p2', oppCharDef, { orientation: 'rested' });

    const program: EffectProgram = {
      cardNumber: 'OP14-028',
      abilities: [{
        timing: 'onRested',
        condition: { turn: 'your' },
        ops: [{ op: 'ko', target: { sel: 'opponentCharacters', maxCost: 2, rested: true } }],
      }],
    };

    const registry = { [johnnyDef.cardDefinitionId]: program };
    const restedState = {
      ...opp.rig.state,
      cardsById: { ...opp.rig.state.cardsById, [johnnyId]: { ...opp.rig.state.cardsById[johnnyId], orientation: 'rested' as const } },
    };

    const result = fireRestTransitions(restedState, [johnnyId], registry, opp.rig.defs, 'test-action');
    expect(result.state.cardsById[opp.instanceId]?.currentZone).toBe('characterArea');
  });
});
