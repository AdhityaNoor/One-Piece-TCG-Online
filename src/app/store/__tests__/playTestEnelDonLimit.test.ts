import { beforeEach, describe, expect, it } from 'vitest';
import type { CardDefinition } from '../../../engine/state/card';
import { PLAYER_A_ID, PLAYER_B_ID, type PlayTestCatalogEntry, useMatchStore } from '../matchStore';

function card(overrides: Partial<CardDefinition>): CardDefinition {
  return {
    cardDefinitionId: overrides.cardDefinitionId ?? overrides.cardNumber ?? 'CARD',
    cardNumber: overrides.cardNumber ?? 'CARD',
    name: overrides.name ?? 'Test Card',
    category: overrides.category ?? 'character',
    colors: overrides.colors ?? ['yellow'],
    types: overrides.types ?? [],
    text: overrides.text ?? '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    ...overrides,
  };
}

function entry(definition: CardDefinition): PlayTestCatalogEntry {
  return { definition, imageUrl: null, setCode: definition.cardNumber.slice(0, 4) };
}

function donPoolCount(playerId: string): number {
  const state = useMatchStore.getState().state;
  if (!state) return 0;
  const player = state.players[playerId];
  return player.costArea.cardIds.length + player.donDeck.cardIds.length;
}

describe('Play Test Enel DON deck rule', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
  });

  it('caps an existing Play Test DON pool at 6 when switching to OP15-058 Enel', () => {
    const normalLeaderA = card({ cardDefinitionId: 'ST01-001', cardNumber: 'ST01-001', name: 'Monkey.D.Luffy', category: 'leader', life: 5, basePower: 5000 });
    const normalLeaderB = card({ cardDefinitionId: 'ST02-001', cardNumber: 'ST02-001', name: 'Eustass"Captain"Kid', category: 'leader', life: 5, basePower: 5000 });
    const enel = card({ cardDefinitionId: 'OP15-058', cardNumber: 'OP15-058', name: 'Enel', category: 'leader', life: 5, basePower: 5000 });
    const filler = card({ cardDefinitionId: 'FILLER', cardNumber: 'FILLER', name: 'Filler', category: 'character', baseCost: 1, basePower: 1000 });

    expect(useMatchStore.getState().startPlayTest([normalLeaderA, normalLeaderB, enel, filler].map(entry))).toEqual({ ok: true });
    expect(donPoolCount(PLAYER_A_ID)).toBe(10);

    expect(useMatchStore.getState().playTestAdjustDon(PLAYER_A_ID, 8)).toEqual({ ok: true });
    expect(useMatchStore.getState().playTestSetLeader(PLAYER_A_ID, 'OP15-058')).toEqual({ ok: true });

    const state = useMatchStore.getState().state;
    expect(state?.cardsById[state.players[PLAYER_A_ID].leaderInstanceId]?.cardDefinitionId).toBe('OP15-058');
    expect(donPoolCount(PLAYER_A_ID)).toBe(6);
    expect(donPoolCount(PLAYER_B_ID)).toBe(10);
  });
});
