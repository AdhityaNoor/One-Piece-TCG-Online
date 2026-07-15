import { describe, expect, it } from 'vitest';
import { buildCardView } from '../../../board/projection';
import type { CardDefinition, CardInstance } from '../../state/card';
import { createSampleGameState } from '../../state/__fixtures__/sampleGameState';
import type { CardDefinitionLookup } from '../../rules/shared';
import type { ProjectionSidecars_V2 } from '../projectionAdapter_V2';

function def(id: string, patch: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: id,
    cardNumber: id,
    name: id,
    category: 'character',
    colors: ['green'],
    types: [],
    attributes: ['slash'],
    basePower: 4000,
    baseCost: 3,
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    hasBanish: false,
    isUnblockable: false,
    ...patch,
  };
}

function instance(instanceId: string, cardDefinitionId: string): CardInstance {
  return {
    instanceId,
    cardDefinitionId,
    ownerId: 'p1',
    controllerId: 'p1',
    currentZone: 'characterArea',
    orientation: 'active',
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
    currentPower: 4000,
    currentCost: 3,
  };
}

describe('V2 projection adapter', () => {
  it('overlays V2 stat and keyword sidecars onto CardView without mutating GameState', () => {
    const state = createSampleGameState();
    const defs: CardDefinitionLookup = {
      'OP01-001': def('OP01-001', { category: 'leader' }),
      target: def('target'),
    };
    const withTarget = {
      ...state,
      continuousEffects: [
        {
          id: 'v1-power',
          sourceInstanceId: 'p1-leader',
          ownerId: 'p1',
          duration: 'duringThisTurn' as const,
          description: 'V1-only power effect',
          powerModifier: { appliesToInstanceId: 'target-1', amount: 5000 },
        },
        {
          id: 'v1-cost',
          sourceInstanceId: 'p1-leader',
          ownerId: 'p1',
          duration: 'duringThisTurn' as const,
          description: 'V1-only cost effect',
          costModifier: { appliesToInstanceId: 'target-1', amount: -2 },
        },
        {
          id: 'v1-keyword',
          sourceInstanceId: 'p1-leader',
          ownerId: 'p1',
          duration: 'duringThisTurn' as const,
          description: 'V1-only keyword effect',
          keywordModifier: { appliesToInstanceId: 'target-1', keyword: 'blocker' as const },
        },
      ],
      players: {
        ...state.players,
        p1: { ...state.players.p1, characterArea: { ...state.players.p1.characterArea, cardIds: ['target-1'] } },
      },
      cardsById: {
        ...state.cardsById,
        'target-1': instance('target-1', 'target'),
      },
    };
    const sidecars: ProjectionSidecars_V2 = {
      statModifiers: [
        {
          id: 'stat-power',
          sourceInstanceId: 'p1-leader',
          controllerId: 'p1',
          stat: 'POWER',
          selector: { subject: 'CARD', instanceIds: ['target-1'] },
          propertyLayer: 'CURRENT_VALUE',
          operation: 'ADD',
          value: { kind: 'NUMBER', value: 2000 },
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: 1,
          status: 'ACTIVE',
        },
        {
          id: 'stat-cost',
          sourceInstanceId: 'p1-leader',
          controllerId: 'p1',
          stat: 'COST',
          selector: { subject: 'CARD', instanceIds: ['target-1'] },
          propertyLayer: 'CURRENT_VALUE',
          operation: 'SUBTRACT',
          value: { kind: 'NUMBER', value: 1 },
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: 1,
          status: 'ACTIVE',
        },
      ],
      keywordModifiers: [
        {
          id: 'keyword-rush',
          sourceInstanceId: 'p1-leader',
          controllerId: 'p1',
          selector: { subject: 'CARD', instanceIds: ['target-1'] },
          operation: 'GRANT_KEYWORD',
          keyword: 'RUSH',
          duration: { kind: 'THIS_TURN' },
          createdAtTurn: 1,
          status: 'ACTIVE',
        },
      ],
    };

    const base = buildCardView(defs, withTarget, {}, 'target-1');
    const projected = buildCardView(defs, withTarget, {}, 'target-1', { sidecars });

    expect(base.power).toBe(9000);
    expect(base.cost).toBe(1);
    expect(base.hasRush).toBe(false);
    expect(base.hasBlocker).toBe(true);
    expect(projected.power).toBe(6000);
    expect(projected.powerDelta).toBe(2000);
    expect(projected.cost).toBe(2);
    expect(projected.costDelta).toBe(-1);
    expect(projected.hasRush).toBe(true);
    expect(projected.hasBlocker).toBe(false);
    expect(withTarget.cardsById['target-1'].currentPower).toBe(4000);
  });
});
