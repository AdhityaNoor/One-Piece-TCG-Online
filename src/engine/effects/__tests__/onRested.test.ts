import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../effectIr';
import { fireRestTransitions } from '../fireTiming';
import { runTimings } from '../interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';

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

  it('cascades onRested after an effect rest and honors restedByOpponentEffect + source category', () => {
    const buffalo: CardEffectAssignment = {
      cardNumber: 'SYN-BUFFALO',
      templateId: 'ability',
      params: {
        timing: 'onRested',
        gate: [{ kind: 'restedByOpponentEffect' }, { kind: 'restedByEffectSourceCategory', category: 'character' }],
        cost: [{ kind: 'donMinus', count: 1 }],
        functions: [{ fn: 'setActiveSelf' }],
      },
    };
    const rester: CardEffectAssignment = {
      cardNumber: 'SYN-RESTER',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        // restAllCharacters applies without a chooseTargets suspend.
        functions: [{ fn: 'restAllCharacters', player: 'opponent' }],
      },
    };
    const registry = buildRegistryFromAssignments([buffalo, rester]);

    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 3 });
    ({ rig } = putDon(rig, 'p1', 2));
    const buffaloDef = makeCharacterDef({ cardDefinitionId: 'SYN-BUFFALO', cardNumber: 'SYN-BUFFALO' });
    const resterDef = makeCharacterDef({ cardDefinitionId: 'SYN-RESTER', cardNumber: 'SYN-RESTER' });
    let buffaloId: string;
    let resterId: string;
    ({ rig, instanceId: buffaloId } = putCharacterInPlay(rig, 'p1', buffaloDef));
    ({ rig, instanceId: resterId } = putCharacterInPlay(rig, 'p2', resterDef));

    const result = runTimings(registry['SYN-RESTER'], ['activateMain'], rig.state, resterId, rig.defs, 'test-rest', registry);

    expect(result.state.cardsById[buffaloId]?.orientation).toBe('rested');
    // Opponent Character effect rest → Buffalo ability fires and prompts DON!! −1.
    expect(result.pendingChoices.some((c) => c.sourceInstanceId === buffaloId && c.kind === 'SELECT_CARDS')).toBe(true);
  });

  it('does not offer restedByOpponentEffect ability when rested via fireRestTransitions (attack/cost)', () => {
    const buffalo: CardEffectAssignment = {
      cardNumber: 'SYN-BUFFALO2',
      templateId: 'ability',
      params: {
        timing: 'onRested',
        gate: [{ kind: 'restedByOpponentEffect' }],
        functions: [{ fn: 'setActiveSelf' }],
      },
    };
    const registry = buildRegistryFromAssignments([buffalo]);
    const def = makeCharacterDef({ cardDefinitionId: 'SYN-BUFFALO2', cardNumber: 'SYN-BUFFALO2' });
    const { rig, instanceId } = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p1' }), 'p1', def);
    const restedState = {
      ...rig.state,
      cardsById: { ...rig.state.cardsById, [instanceId]: { ...rig.state.cardsById[instanceId], orientation: 'rested' as const } },
    };

    const result = fireRestTransitions(restedState, [instanceId], registry, rig.defs, 'attack-rest');
    expect(result.state.cardsById[instanceId]?.orientation).toBe('rested');
    expect(result.pendingChoices).toHaveLength(0);
  });
});
