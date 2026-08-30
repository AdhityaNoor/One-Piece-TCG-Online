import { describe, expect, it } from 'vitest';
import type { GameState } from '../../../engine/state/game';
import { runTimings } from '../../../engine/effects/interpreter';
import { computeCurrentPower } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, makeStageDef, putInHand, putStageInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { executeAction } from '../../../engine/actions';
import { buildRegistryFromAssignments } from '../assembler';
import { ALL_ASSIGNMENTS } from '../assignments';
import { OP13_ASSIGNMENTS } from '../assignments/OP13';

const registry = buildRegistryFromAssignments(OP13_ASSIGNMENTS);
/** The registry the real game builds — proves the lookup resolves among ~2500 cards, not just OP13. */
const fullRegistry = buildRegistryFromAssignments(ALL_ASSIGNMENTS);
const JUNK = makeCharacterDef({ cardDefinitionId: 'JUNK', cardNumber: 'JUNK', name: 'Junk' });

/** Put `count` cards into p1's trash. */
function withTrash(state: GameState, count: number): GameState {
  const cardsById = { ...state.cardsById };
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = `trash-${i}`;
    ids.push(id);
    cardsById[id] = {
      instanceId: id, cardDefinitionId: 'JUNK', ownerId: 'p1', controllerId: 'p1',
      currentZone: 'trash', orientation: null, faceState: 'faceUp', donAttached: [],
      appliedContinuousEffectIds: [], oncePerTurnUsed: [], summoningSick: false, revealedTo: 'all',
    };
  }
  return {
    ...state,
    cardsById,
    players: { ...state.players, p1: { ...state.players.p1, trash: { ...state.players.p1.trash, cardIds: ids } } },
  };
}

function leaderPowerWith(trashCount: number, activePlayerId: 'p1' | 'p2' = 'p1') {
  let rig = buildBaseRig({ activePlayerId, phase: 'main', turnNumber: 3, leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'L1', cardNumber: 'L1', basePower: 5000 }) });
  rig = { ...rig, defs: { ...rig.defs, JUNK } };
  let stageId: string;
  ({ rig, instanceId: stageId } = putStageInPlay(rig, 'p1', makeStageDef({ cardDefinitionId: 'OP13-099', cardNumber: 'OP13-099', name: 'The Empty Throne' })));
  const leaderId = rig.state.players.p1.leaderInstanceId!;
  const base = computeCurrentPower(rig.defs, rig.state, leaderId);

  // Enters play with an EMPTY trash — the realistic order: you play the Stage early,
  // and only reach 19 cards in the trash later in the game.
  const fired = runTimings(registry['OP13-099'], ['onEnterPlay'], rig.state, stageId, rig.defs, null, registry);
  const after = withTrash(fired.state, trashCount);
  return { base, power: computeCurrentPower(rig.defs, after, leaderId), records: after.continuousEffects.length };
}

describe('OP13-099 The Empty Throne — [Your Turn] +1000 at 19+ trash', () => {
  it('registers a continuous modifier when it enters play', () => {
    expect(leaderPowerWith(0).records).toBeGreaterThan(0);
  });
  it('gives no bonus at 18 cards in trash', () => {
    const r = leaderPowerWith(18);
    expect(r.power).toBe(r.base);
  });
  it('gives +1000 at 19 cards in trash', () => {
    const r = leaderPowerWith(19);
    expect(r.power).toBe(r.base + 1000);
  });
  it('gives +1000 at 25 cards in trash', () => {
    const r = leaderPowerWith(25);
    expect(r.power).toBe(r.base + 1000);
  });
  it('gives no bonus on the opponent\'s turn', () => {
    const r = leaderPowerWith(25, 'p2');
    expect(r.power).toBe(r.base);
  });
});

/**
 * End-to-end through the real PLAY_STAGE handler and the full card registry, because the
 * unit path above (runTimings on a hand-placed Stage) skips everything that actually
 * differs in a game: the Stage gets a NEW instance id when it leaves hand, the registry
 * holds ~2500 cards, and the modifier has to survive that hand-off.
 */
describe('OP13-099 played for real', () => {
  function playStageThenFillTrash(trashCount: number) {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'L1', cardNumber: 'L1', basePower: 5000 }) });
    rig = { ...rig, defs: { ...rig.defs, JUNK } };
    const stageDef = makeStageDef({ cardDefinitionId: 'OP13-099', cardNumber: 'OP13-099', name: 'The Empty Throne', baseCost: 0 });
    const put = putInHand(rig, 'p1', stageDef);
    rig = put.rig;
    const leaderId = rig.state.players.p1.leaderInstanceId!;
    const base = computeCurrentPower(rig.defs, rig.state, leaderId);

    const played = executeAction(
      rig.state,
      { type: 'PLAY_STAGE', actionId: 'a1', playerId: 'p1', handCardInstanceId: put.instanceId, donInstanceIds: [] },
      rig.defs,
      fullRegistry,
    );
    const after = withTrash(played.state, trashCount);
    return { base, power: computeCurrentPower(rig.defs, after, leaderId), stageInPlay: after.players.p1.stageArea.cardIds.length };
  }

  it('puts the Stage into play', () => {
    expect(playStageThenFillTrash(0).stageInPlay).toBe(1);
  });

  it('gives the Leader +1000 once the trash reaches 19', () => {
    const r = playStageThenFillTrash(19);
    expect(r.power).toBe(r.base + 1000);
  });

  it('still gives nothing at 18', () => {
    const r = playStageThenFillTrash(18);
    expect(r.power).toBe(r.base);
  });
});
