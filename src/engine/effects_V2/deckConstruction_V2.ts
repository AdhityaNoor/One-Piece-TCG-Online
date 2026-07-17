import type { Action_V2, ResolutionNode_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { DeckConstructionEntry } from '../../cards/decks/deckValidation';
import type { CardDefinition } from '../state/card';
import type { EffectRuntimeBundle_V2 } from './runtime_V2';

export interface V2DeckConstructionResult {
  legal: boolean;
  reasons: string[];
}

function collectActions(node: ResolutionNode_V2, actions: Action_V2[] = []): Action_V2[] {
  switch (node.kind) {
    case 'ACTION':
      actions.push(node.action);
      break;
    case 'SEQUENCE':
      for (const child of node.nodes) collectActions(child, actions);
      break;
    case 'IF':
      collectActions(node.then, actions);
      if (node.else) collectActions(node.else, actions);
      break;
    case 'OPTIONAL':
      collectActions(node.node, actions);
      break;
    case 'CHOOSE':
      for (const option of node.options) collectActions(option, actions);
      break;
    case 'IF_ACTION_SUCCEEDED':
      collectActions(node.then, actions);
      if (node.else) collectActions(node.else, actions);
      break;
    case 'FOR_EACH':
      collectActions(node.node, actions);
      break;
    case 'REPEAT':
      collectActions(node.node, actions);
      break;
    case 'REPLACEMENT':
    case 'DELAY':
      collectActions(node.node, actions);
      break;
    case 'CREATE_CONTINUOUS_EFFECT':
    case 'NO_OP':
      break;
  }
  return actions;
}

function categoryMatches(definition: CardDefinition, cardCategory: unknown): boolean {
  return typeof cardCategory === 'string' && definition.category.toUpperCase() === cardCategory;
}

function costAtLeast(definition: CardDefinition, cost: unknown): boolean {
  return typeof cost === 'number' && typeof definition.baseCost === 'number' && definition.baseCost >= cost;
}

function validateDeckConstructionAction(
  leader: CardDefinition,
  mainDeck: readonly DeckConstructionEntry[],
  action: Action_V2 & { type: 'MODIFY_DECK_CONSTRUCTION' },
): string[] {
  if (action.modifier.modifier.type !== 'RULE_MODIFIER') return [];
  const expression = action.modifier.modifier.expression;
  if (expression.rule !== 'CANNOT_INCLUDE_CATEGORY_COST_OR_MORE') return [];

  const reasons: string[] = [];
  for (const entry of mainDeck) {
    if (!categoryMatches(entry.definition, expression.cardCategory) || !costAtLeast(entry.definition, expression.cost)) continue;
    reasons.push(
      `Leader ${leader.cardNumber} V2 deck construction forbids ${entry.definition.category} cards with cost ${expression.cost} or more; ${entry.definition.cardNumber} (${entry.definition.name}) is cost ${entry.definition.baseCost}.`,
    );
  }
  return reasons;
}

export function validateDeckConstruction_V2(
  leader: CardDefinition,
  mainDeck: readonly DeckConstructionEntry[],
  runtime: EffectRuntimeBundle_V2,
): V2DeckConstructionResult {
  const program = runtime.programsByCardNumber[leader.cardNumber];
  const actions = program?.abilities.flatMap((ability) => collectActions(ability.resolution)) ?? [];
  const reasons = actions.flatMap((action) => (
    action.type === 'MODIFY_DECK_CONSTRUCTION'
      ? validateDeckConstructionAction(leader, mainDeck, action as Action_V2 & { type: 'MODIFY_DECK_CONSTRUCTION' })
      : []
  ));
  return { legal: reasons.length === 0, reasons };
}
