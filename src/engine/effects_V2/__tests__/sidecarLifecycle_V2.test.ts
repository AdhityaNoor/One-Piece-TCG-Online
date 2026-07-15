import { describe, expect, it } from 'vitest';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import { createEmptyEffectRuntimeSidecars_V2 } from '../dispatcher_V2';
import { pruneExpiredEffectRuntimeSidecars_V2 } from '../sidecarLifecycle_V2';

describe('V2 sidecar lifecycle', () => {
  it('prunes expired turn and instant sidecars while keeping permanent records', () => {
    const state = { ...createSampleGameState(), turnNumber: 4 };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      statModifiers: [
        {
          id: 'expired-turn',
          sourceInstanceId: state.players.p1.leaderInstanceId,
          controllerId: 'p1',
          stat: 'POWER',
          selector: { subject: 'CARD', instanceIds: [state.players.p1.leaderInstanceId] },
          propertyLayer: 'CURRENT_VALUE',
          operation: 'ADD',
          value: { kind: 'NUMBER', value: 1000 },
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: 3,
          status: 'ACTIVE',
        },
        {
          id: 'instant',
          sourceInstanceId: state.players.p1.leaderInstanceId,
          controllerId: 'p1',
          stat: 'POWER',
          selector: { subject: 'CARD', instanceIds: [state.players.p1.leaderInstanceId] },
          propertyLayer: 'CURRENT_VALUE',
          operation: 'ADD',
          value: { kind: 'NUMBER', value: 1000 },
          duration: { kind: 'INSTANT' },
          createdAtTurn: 4,
          status: 'ACTIVE',
        },
        {
          id: 'permanent',
          sourceInstanceId: state.players.p1.leaderInstanceId,
          controllerId: 'p1',
          stat: 'POWER',
          selector: { subject: 'CARD', instanceIds: [state.players.p1.leaderInstanceId] },
          propertyLayer: 'CURRENT_VALUE',
          operation: 'ADD',
          value: { kind: 'NUMBER', value: 1000 },
          duration: { kind: 'PERMANENT' },
          createdAtTurn: 3,
          status: 'ACTIVE',
        },
      ],
    });

    const pruned = pruneExpiredEffectRuntimeSidecars_V2(state, sidecars);

    expect(pruned.statModifiers.map((record) => record.id)).toEqual(['permanent']);
  });

  it('prunes source-scoped sidecars when the source leaves its required zone', () => {
    const base = createSampleGameState();
    const leaderId = base.players.p1.leaderInstanceId;
    const moved = {
      ...base,
      cardsById: {
        ...base.cardsById,
        [leaderId]: { ...base.cardsById[leaderId], currentZone: 'trash' as const },
      },
    };
    const sidecars = createEmptyEffectRuntimeSidecars_V2({
      keywordModifiers: [
        {
          id: 'source-valid',
          sourceInstanceId: leaderId,
          controllerId: 'p1',
          selector: { subject: 'CARD', instanceIds: [leaderId] },
          operation: 'GRANT_KEYWORD',
          keyword: 'RUSH',
          duration: { kind: 'WHILE_SOURCE_VALID' },
          createdAtTurn: 3,
          status: 'ACTIVE',
        },
        {
          id: 'source-zone',
          sourceInstanceId: leaderId,
          controllerId: 'p1',
          selector: { subject: 'CARD', instanceIds: [leaderId] },
          operation: 'GRANT_KEYWORD',
          keyword: 'BLOCKER',
          duration: { kind: 'WHILE_SOURCE_IN_ZONE', zone: 'LEADER_AREA' },
          createdAtTurn: 3,
          status: 'ACTIVE',
        },
      ],
    });

    const pruned = pruneExpiredEffectRuntimeSidecars_V2(moved, sidecars);

    expect(pruned.keywordModifiers).toEqual([]);
  });
});
