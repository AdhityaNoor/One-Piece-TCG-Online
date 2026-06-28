/**
 * Test-only CardDefinition/PlayerSetupInput builders. These are fabricated
 * card data (never fetched from the OPTCG API) — exactly the shape the
 * /src/cards normalization layer would eventually hand to setup, kept here
 * so engine tests have zero dependency on /src/cards (project ground rule:
 * nothing in /src/engine imports /src/cards; tests mirror that boundary).
 */
import type { CardDefinition } from '../../state/card';
import type { PlayerSetupInput } from '../setupInput';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeLeaderDefinition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: nextId('leader'),
    name: 'Test Leader',
    category: 'leader',
    colors: ['red'],
    types: [],
    basePower: 5000,
    text: '',
    life: 5,
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: nextId('TEST-L'),
    ...overrides,
  };
}

export function makeCharacterDefinition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: nextId('character'),
    name: 'Test Character',
    category: 'character',
    colors: ['red'],
    types: [],
    basePower: 1000,
    baseCost: 1,
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: nextId('TEST-C'),
    ...overrides,
  };
}

export function makeDonDefinition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardDefinitionId: 'DON-CARD',
    name: 'DON!!',
    category: 'don',
    colors: [],
    types: [],
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: 'DON-CARD',
    ...overrides,
  };
}

export function makeDeckOf(size: number): CardDefinition[] {
  return Array.from({ length: size }, () => makeCharacterDefinition());
}

export function makePlayerSetupInput(playerId: string, overrides: Partial<PlayerSetupInput> = {}): PlayerSetupInput {
  return {
    playerId,
    leader: makeLeaderDefinition(),
    deck: makeDeckOf(50),
    donCard: makeDonDefinition(),
    ...overrides,
  };
}
