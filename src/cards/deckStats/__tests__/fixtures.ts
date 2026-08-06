import type { CardDefinition } from '../../../engine/state/card';
import type { SavedDeckCardSnapshot } from '../../decks/savedDeck';

/** Minimal CardDefinition builder — only the fields deckStats reads matter. */
export function def(overrides: Partial<CardDefinition> & { cardNumber: string }): CardDefinition {
  return {
    cardDefinitionId: overrides.cardNumber,
    name: overrides.cardNumber,
    category: 'character',
    colors: ['red'],
    types: [],
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    ...overrides,
  };
}

/** Snapshot builder wrapping a CardDefinition with a quantity. */
export function snap(
  definition: CardDefinition,
  quantity: number,
): SavedDeckCardSnapshot {
  return {
    cardNumber: definition.cardNumber,
    variant: null,
    printingImageId: definition.cardNumber,
    imageUrl: null,
    cachedImagePath: null,
    definition,
    rawPrinting: {} as never,
    quantity,
    warnings: [],
    sourceImportLines: null,
  };
}
