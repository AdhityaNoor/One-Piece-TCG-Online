/**
 * Regression: OP09-004 permanent opponent-Character −1000 power aura.
 */
import { describe, expect, it } from 'vitest';
import { CURATED_EFFECT_PROGRAMS, buildCuratedEffectRegistry } from '../../../cards/effectTemplates';
import { executeAction } from '../../actions';
import { runTimings } from '../interpreter';
import { fireOnPlay } from '../fireTiming';
import { computeCurrentPower } from '../../rules/shared/power';
import { projectPlayerBoard } from '../../../board/projection/zoneView';
import {
  buildBaseRig,
  makeCharacterDef,
  nextTestId,
  putCharacterInPlay,
  putDon,
  putInHand,
} from '../../rules/shared/__tests__/testRig';

const OP09_004 = makeCharacterDef({
  cardDefinitionId: 'OP09-004',
  cardNumber: 'OP09-004',
  name: 'Shanks',
  basePower: 4000,
  baseCost: 4,
  hasRush: true,
  colors: ['red'],
  types: ['Red-Haired Pirates'],
});

describe('OP09-004 opponent Character −1000 power aura', () => {
  it('registers via onEnterPlay and lowers opponent Character power by 1000', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP09-004'];
    expect(program).toBeDefined();
    expect(program.abilities[0]).toMatchObject({
      timing: 'onEnterPlay',
      ops: [{ op: 'addPowerAura', group: { opponentCharacters: true }, amount: -1000, duration: 'permanent' }],
    });

    const registry = { 'OP09-004': program };
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    const shanks = putCharacterInPlay(rig, 'p1', OP09_004);
    rig = shanks.rig;
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 5000 }));
    rig = foe.rig;

    const registered = runTimings(program, ['onEnterPlay'], rig.state, shanks.instanceId, rig.defs, null, registry);
    rig = { ...rig, state: registered.state };

    const aura = rig.state.continuousEffects.find(
      (ce) => ce.powerModifier?.amount === -1000 && ce.powerModifier.appliesToGroup?.opponentCharacters === true,
    );
    expect(aura).toBeDefined();
    expect(aura?.duration).toBe('permanent');
    expect(aura?.ownerId).toBe('p1');
    expect(aura?.sourceInstanceId).toBe(shanks.instanceId);

    expect(computeCurrentPower(rig.defs, rig.state, foe.instanceId)).toBe(4000);
    expect(computeCurrentPower(rig.defs, rig.state, shanks.instanceId)).toBe(4000);
  });

  it('fireOnPlay also registers the aura when registry is keyed by cardDefinitionId', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP09-004'];
    const registry = { 'OP09-004': program };
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    const shanks = putCharacterInPlay(rig, 'p1', OP09_004);
    rig = shanks.rig;
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 6000 }));
    rig = foe.rig;

    const fired = fireOnPlay(rig.state, shanks.instanceId, registry, rig.defs, 'test');
    expect(computeCurrentPower(rig.defs, fired.state, foe.instanceId)).toBe(5000);
  });

  it('fireOnPlay resolves program by printed cardNumber when definition id differs', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP09-004'];
    // Registry keyed only by card number — the latent miss when fireOnPlay
    // looked up cardDefinitionId alone.
    const registry = { 'OP09-004': program };
    const shanksAlt = makeCharacterDef({
      ...OP09_004,
      cardDefinitionId: 'OP09-004_snapshot',
      cardNumber: 'OP09-004',
    });
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    const shanks = putCharacterInPlay(rig, 'p1', shanksAlt);
    rig = shanks.rig;
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 5000 }));
    rig = foe.rig;

    const fired = fireOnPlay(rig.state, shanks.instanceId, registry, rig.defs, 'test');
    expect(fired.state.continuousEffects.some(
      (ce) => ce.powerModifier?.appliesToGroup?.opponentCharacters === true && ce.powerModifier.amount === -1000,
    )).toBe(true);
    expect(computeCurrentPower(rig.defs, fired.state, foe.instanceId)).toBe(4000);
  });

  it('stops applying when the source leaves the field', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP09-004'];
    const registry = { 'OP09-004': program };
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    const shanks = putCharacterInPlay(rig, 'p1', OP09_004);
    rig = shanks.rig;
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 5000 }));
    rig = foe.rig;

    const registered = runTimings(program, ['onEnterPlay'], rig.state, shanks.instanceId, rig.defs, null, registry);
    const leftField = {
      ...registered.state,
      cardsById: {
        ...registered.state.cardsById,
        [shanks.instanceId]: {
          ...registered.state.cardsById[shanks.instanceId],
          currentZone: 'trash' as const,
        },
      },
    };
    expect(computeCurrentPower(rig.defs, leftField, foe.instanceId)).toBe(5000);
  });

  it('PLAY_CHARACTER registers the aura via fireOnPlay (alt-art definition id)', () => {
    const shanksAlt = makeCharacterDef({
      ...OP09_004,
      cardDefinitionId: 'OP09-004_alt-art',
      cardNumber: 'OP09-004',
      baseCost: 0,
    });
    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', shanksAlt));
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 5000 }));
    rig = foe.rig;
    ({ rig } = putDon(rig, 'p1', 1));

    const registry = buildCuratedEffectRegistry(rig.defs);
    expect(registry['OP09-004_alt-art']).toBeDefined();
    expect(registry['OP09-004']).toBeDefined();

    const result = executeAction(
      rig.state,
      {
        type: 'PLAY_CHARACTER',
        actionId: nextTestId('action'),
        playerId: 'p1',
        handCardInstanceId: handId,
        donInstanceIds: [],
      },
      rig.defs,
      registry,
    );

    const playedId = result.state.players.p1.characterArea.cardIds.find((id) => result.state.cardsById[id]?.cardDefinitionId === 'OP09-004_alt-art');
    expect(playedId).toBeDefined();
    expect(result.state.continuousEffects.some(
      (ce) =>
        ce.sourceInstanceId === playedId &&
        ce.powerModifier?.amount === -1000 &&
        ce.powerModifier.appliesToGroup?.opponentCharacters === true,
    )).toBe(true);
    expect(computeCurrentPower(rig.defs, result.state, foe.instanceId)).toBe(4000);

    // UI board projection must surface the same continuousEffect-aware power.
    const oppBoard = projectPlayerBoard(result.state, rig.defs, {}, 'p2');
    const foeView = oppBoard.characterArea.find((c) => c.instanceId === foe.instanceId);
    expect(foeView?.power).toBe(4000);
    expect(foeView?.powerDelta).toBe(-1000);
  });
});
