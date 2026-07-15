import type { Action_V2 } from './types_V2';

export type CanonicalCoverageKind_V2 = 'canonical' | 'parserGap' | 'definitionGap';

export interface CanonicalAtomDefinition_V2 {
  atom: string;
  family: string;
  subatoms: string[];
  references: string[];
  remark: string;
}

export interface CanonicalClassification_V2 {
  coverage: CanonicalCoverageKind_V2;
  atoms: string[];
  remark: string;
}

export const CANONICAL_ATOMS_V2: readonly CanonicalAtomDefinition_V2[] = [
  atom('DRAW_CARD', 'Card movement', [], ['ValueExpression'], 'Draw one or more cards.'),
  atom('MOVE_CARD', 'Card movement', ['selector', 'from', 'to', 'placement', 'order', 'face', 'cause'], ['Selector', 'Zone'], 'Generic zone movement atom used by return, add-to-hand, place-in-deck, costs, and search results.'),
  atom('PLAY_CARD', 'Card movement', ['selector', 'destination', 'controller', 'state', 'triggerOnPlay', 'costPolicy'], ['Selector'], 'Put a card into play with normal or alternate cost policy.'),
  atom('ACTIVATE_EVENT', 'Card movement', ['selector', 'player'], ['Selector'], 'Activate an event or referenced event effect.'),
  atom('TRASH_CARD', 'Card movement', ['selector', 'cause', 'treatedAsKO'], ['Selector'], 'Trash selected cards.'),
  atom('KO_CARD', 'Card movement', ['selector', 'cause'], ['Selector'], 'K.O. selected cards.'),
  atom('RETURN_CARD', 'Card movement', ['selector', 'destination', 'deckPlacement', 'owner'], ['MOVE_CARD'], 'Semantic return atom; V2 may store it as MOVE_CARD with cause RETURN/EFFECT.'),
  atom('ADD_CARD_TO_HAND', 'Card movement', ['selector', 'from', 'triggerPolicy'], ['MOVE_CARD'], 'Semantic add-to-hand atom; V2 may store it as MOVE_CARD to HAND.'),
  atom('PLACE_CARD_IN_DECK', 'Card movement', ['selector', 'placement', 'order'], ['MOVE_CARD'], 'Semantic place-in-deck atom; V2 may store it as MOVE_CARD to DECK.'),
  atom('REVEAL_CARD', 'Card movement', ['selector', 'viewers'], ['Selector'], 'Reveal selected cards to one or both players.'),
  atom('LOOK_AT_CARDS', 'Card movement', ['player', 'zone', 'position', 'count', 'visibility'], ['Selector', 'ValueExpression'], 'Look at cards from deck, life, or hand.'),
  atom('SELECT_CARD', 'Card movement', ['pool', 'selector'], ['ResultReference', 'Selector'], 'Select cards from a prior action result.'),
  atom('REORDER_CARDS', 'Card movement', ['cards', 'destination', 'orderChooser'], ['ResultReference'], 'Reorder known cards such as search remainder.'),
  atom('SHUFFLE_ZONE', 'Card movement', ['player', 'zone'], ['Zone'], 'Shuffle a zone.'),
  atom('SEARCH', 'Composite', ['look', 'select', 'moveSelected', 'processRemainder'], ['LOOK_AT_CARDS', 'SELECT_CARD', 'MOVE_CARD', 'REORDER_CARDS'], 'Composite helper only; output should use referenced atomic actions.'),

  atom('ADD_CARD_TO_LIFE', 'Life', ['selector', 'position', 'face'], ['Selector'], 'Add selected cards to life.'),
  atom('TAKE_LIFE_TO_HAND', 'Life', ['player', 'position', 'count', 'triggerPolicy'], ['ValueExpression'], 'Move life cards to hand without trigger check.'),
  atom('TAKE_DAMAGE', 'Life', ['targetPlayer', 'amount', 'lifeProcessing'], ['ValueExpression'], 'Apply damage and life processing.'),
  atom('TRASH_LIFE', 'Life', ['player', 'position', 'count', 'activateTrigger'], ['ValueExpression'], 'Trash life cards without trigger activation.'),
  atom('REVEAL_LIFE', 'Life', ['selector', 'viewers'], ['Selector'], 'Reveal life cards.'),
  atom('LOOK_AT_LIFE', 'Life', ['player', 'position', 'count'], ['ValueExpression'], 'Look at life cards.'),
  atom('REORDER_LIFE', 'Life', ['selector', 'orderChooser'], ['Selector'], 'Reorder life cards.'),
  atom('TURN_LIFE_FACE_UP', 'Life', ['selector'], ['Selector'], 'Turn life cards face-up.'),
  atom('TURN_LIFE_FACE_DOWN', 'Life', ['selector'], ['Selector'], 'Turn life cards face-down.'),

  atom('REST_CARD', 'State', ['selector'], ['Selector'], 'Rest selected cards.'),
  atom('SET_CARD_ACTIVE', 'State', ['selector'], ['Selector'], 'Set selected cards active.'),
  atom('TURN_CARD_FACE_UP', 'State', ['selector'], ['Selector'], 'Turn selected cards face-up.'),
  atom('TURN_CARD_FACE_DOWN', 'State', ['selector'], ['Selector'], 'Turn selected cards face-down.'),

  atom('ADD_DON_FROM_DON_DECK', 'DON', ['player', 'count', 'destination', 'state'], ['ValueExpression'], 'Move DON from DON deck to cost area.'),
  atom('GIVE_DON', 'DON', ['donSelector', 'target'], ['Selector'], 'Attach/give DON to a card.'),
  atom('DETACH_DON', 'DON', ['sourceCard', 'count', 'destination', 'state'], ['Selector', 'ValueExpression'], 'Detach DON from a card.'),
  atom('REST_DON', 'DON', ['selector'], ['Selector'], 'Rest selected DON.'),
  atom('SET_DON_ACTIVE', 'DON', ['selector'], ['Selector'], 'Set selected DON active.'),
  atom('RETURN_DON_TO_DON_DECK', 'DON', ['selector'], ['Selector'], 'Return selected DON to DON deck.'),
  atom('MOVE_DON_TO_COST_AREA', 'DON', ['selector', 'state'], ['Selector'], 'Move DON to cost area.'),

  atom('MODIFY_POWER', 'Stat', ['selector', 'propertyLayer', 'operation', 'value', 'duration'], ['Selector', 'ValueExpression', 'Duration'], 'Modify power.'),
  atom('SWAP_POWER', 'Stat', ['selector', 'propertyLayer', 'duration'], ['Selector', 'Duration'], 'Swap power between selected cards.'),
  atom('MODIFY_COST', 'Stat', ['selector', 'propertyLayer', 'operation', 'value', 'duration'], ['Selector', 'ValueExpression', 'Duration'], 'Modify cost.'),
  atom('MODIFY_COUNTER', 'Stat', ['selector', 'propertyLayer', 'operation', 'value', 'duration'], ['Selector', 'ValueExpression', 'Duration'], 'Modify counter.'),
  atom('MODIFY_LIFE_VALUE', 'Stat', ['selector', 'propertyLayer', 'operation', 'value', 'duration'], ['Selector', 'ValueExpression', 'Duration'], 'Modify life value.'),
  atom('MODIFY_DAMAGE', 'Stat', ['selector', 'propertyLayer', 'operation', 'value', 'duration'], ['Selector', 'ValueExpression', 'Duration'], 'Modify damage.'),

  atom('MODIFY_NAME', 'Information', ['selector', 'operation', 'names', 'duration'], ['Selector', 'Duration'], 'Modify card name.'),
  atom('MODIFY_COLOR', 'Information', ['selector', 'operation', 'colors', 'duration'], ['Selector', 'Duration'], 'Modify card color.'),
  atom('MODIFY_TYPE', 'Information', ['selector', 'operation', 'types', 'duration'], ['Selector', 'Duration'], 'Modify card type.'),
  atom('MODIFY_ATTRIBUTE', 'Information', ['selector', 'operation', 'attributes', 'duration'], ['Selector', 'Duration'], 'Modify card attribute.'),
  atom('MODIFY_BASE_EFFECT_STATUS', 'Information', ['selector', 'enabled', 'duration'], ['Selector', 'Duration'], 'Enable/disable base effects.'),

  atom('GRANT_KEYWORD', 'Effect modification', ['selector', 'keyword', 'duration'], ['Selector', 'KeywordEffect', 'Duration'], 'Grant a keyword.'),
  atom('REMOVE_KEYWORD', 'Effect modification', ['selector', 'keyword', 'duration'], ['Selector', 'KeywordEffect', 'Duration'], 'Remove a keyword.'),
  atom('ADD_EFFECT', 'Effect modification', ['selector', 'effect', 'duration'], ['Selector', 'EffectDefinition', 'Duration'], 'Add an effect.'),
  atom('REMOVE_GAINED_EFFECT', 'Effect modification', ['selector', 'effectFilter', 'duration'], ['Selector', 'Duration'], 'Remove gained effects.'),
  atom('INVALIDATE_EFFECTS', 'Effect modification', ['selector', 'effectFilter', 'duration'], ['Selector', 'Duration'], 'Invalidate effects.'),
  atom('VALIDATE_EFFECTS', 'Effect modification', ['selector', 'effectFilter', 'duration'], ['Selector', 'Duration'], 'Validate effects.'),
  atom('COPY_EFFECT', 'Effect modification', ['selector', 'sourceEffect', 'duration'], ['Selector', 'Duration'], 'Copy an effect.'),
  atom('CREATE_DELAYED_EFFECT', 'Effect modification', ['effect', 'duration'], ['EffectDefinition', 'Duration'], 'Create delayed effect.'),
  atom('CREATE_REPLACEMENT_EFFECT', 'Effect modification', ['effect', 'duration'], ['EffectDefinition', 'Duration'], 'Create replacement effect.'),

  atom('PREVENT_ACTION', 'Permission', ['selector', 'action', 'causeFilter', 'duration'], ['Selector', 'Duration'], 'Prevent a defined action.'),
  atom('ALLOW_ACTION', 'Permission', ['selector', 'action', 'duration'], ['Selector', 'Duration'], 'Allow a defined action.'),
  atom('PREVENT_SELECTION', 'Permission', ['selector', 'action', 'duration'], ['Selector', 'Duration'], 'Prevent selection.'),
  atom('PREVENT_ZONE_CHANGE', 'Permission', ['selector', 'action', 'duration'], ['Selector', 'Duration'], 'Prevent zone changes.'),
  atom('MODIFY_VALID_TARGETS', 'Permission', ['selector', 'action', 'duration'], ['Selector', 'Duration'], 'Modify valid targets.'),
  atom('MODIFY_PLAY_PERMISSION', 'Permission', ['selector', 'action', 'duration'], ['Selector', 'Duration'], 'Modify play permission.'),

  atom('DECLARE_ATTACK', 'Battle', ['attacker', 'target'], ['Selector'], 'Declare attack.'),
  atom('CHANGE_ATTACK_TARGET', 'Battle', ['newTarget'], ['Selector'], 'Change attack target.'),
  atom('ACTIVATE_BLOCKER', 'Battle', ['selector'], ['Selector'], 'Activate blocker.'),
  atom('CANCEL_ATTACK', 'Battle', ['battle'], [], 'Cancel current attack.'),
  atom('END_BATTLE', 'Battle', ['battle'], [], 'End current battle.'),
  atom('DEAL_DAMAGE', 'Battle', ['source', 'targetPlayer', 'amount'], ['Selector', 'ValueExpression'], 'Deal damage.'),
  atom('SET_DAMAGE', 'Battle', ['source', 'targetPlayer', 'amount'], ['Selector', 'ValueExpression'], 'Set damage.'),
  atom('SKIP_BATTLE_STEP', 'Battle', ['step'], [], 'Skip a battle step.'),

  atom('PLAYER_WINS', 'Player and rule', ['player'], [], 'Player wins.'),
  atom('PLAYER_LOSES', 'Player and rule', ['player'], [], 'Player loses.'),
  atom('PLAYER_CHOOSES', 'Player and rule', ['options', 'minimumChoices', 'maximumChoices'], ['ResolutionNode'], 'Player choice node.'),
  atom('OPPONENT_CHOOSES', 'Player and rule', ['options', 'minimumChoices', 'maximumChoices'], ['ResolutionNode'], 'Opponent choice node.'),
  atom('RULE_MODIFIER', 'Player and rule', ['scope', 'validFrom', 'modifier'], ['ModifierExpression'], 'Modify deck construction, setup, victory, or game rules.'),

  atom('ActivationCost', 'Cost', ['preconditions', 'payments', 'optionalPayment', 'executionPolicy'], ['CostAction', 'ConditionExpression'], 'Activation cost container.'),
  atom('ConditionExpression', 'Condition', ['predicate', 'and', 'or', 'not', 'any', 'all'], ['Selector', 'ValueExpression'], 'Canonical condition tree.'),
  atom('ValueExpression', 'Value', ['number', 'boolean', 'string', 'count', 'previousResult', 'add', 'subtract', 'multiply'], ['Selector'], 'Canonical value expression tree.'),
  atom('Selector', 'Selector', ['subject', 'owner', 'controller', 'zones', 'filters', 'quantity', 'relations', 'ordering'], [], 'Canonical selector tree.'),
];

export const CANONICAL_ATOM_NAMES_V2 = new Set(CANONICAL_ATOMS_V2.map((definition) => definition.atom));

export function canonicalAtomsForAction_V2(action: Action_V2): string[] {
  if (action.type === 'MOVE_CARD') {
    if (action.to.zone === 'HAND') return ['MOVE_CARD', 'ADD_CARD_TO_HAND'];
    if (action.to.zone === 'DECK') return ['MOVE_CARD', 'PLACE_CARD_IN_DECK'];
    return ['MOVE_CARD'];
  }
  if (action.type === 'LOOK_AT_CARDS') return ['LOOK_AT_CARDS'];
  if (action.type === 'SWAP_POWER') return ['SWAP_POWER'];
  if (
    action.type === 'MODIFY_DEFEAT_CONDITION'
    || action.type === 'MODIFY_VICTORY_CONDITION'
    || action.type === 'MODIFY_DECK_CONSTRUCTION'
    || action.type === 'MODIFY_STARTING_SETUP'
    || action.type === 'MODIFY_AREA_CAPACITY'
    || action.type === 'MODIFY_RULE_PERMISSION'
  ) {
    return ['RULE_MODIFIER'];
  }
  return CANONICAL_ATOM_NAMES_V2.has(action.type) ? [action.type] : [];
}

export function classifyUnrecognizedTextAgainstCanonical_V2(kind: string | undefined, rawText = ''): CanonicalClassification_V2 {
  const text = rawText.toLowerCase();
  if (/\bactivate this card'?s\b|^effect\.?$|\beffect of .*event card\b/.test(text)) {
    return parserGap(['ACTIVATE_EVENT', 'COPY_EFFECT'], 'Guide-covered referenced activation/effect-copy pattern.');
  }
  if (/\bchange the attack target\b/.test(text)) {
    return parserGap(['CHANGE_ATTACK_TARGET'], 'Guide-covered battle target change.');
  }
  if (/\bturn .*life cards? face-up\b/.test(text)) {
    return parserGap(['TURN_LIFE_FACE_UP'], 'Guide-covered life state action.');
  }
  if (/\bturn .*life cards? face-down\b/.test(text)) {
    return parserGap(['TURN_LIFE_FACE_DOWN'], 'Guide-covered life state action.');
  }
  if (/\btrash .*from the top of .*life\b|\btrash .*life cards?\b/.test(text)) {
    return parserGap(['TRASH_LIFE'], 'Guide-covered life trash action.');
  }
  if (/\btrash .*from the top of .*deck\b|\btrash that card\b|\btrash the rest\b/.test(text)) {
    return parserGap(['TRASH_CARD'], 'Guide-covered trash card action.');
  }
  if (/\b(you may|you can) trash .*from your hand:?\b/.test(text)) {
    return parserGap(['ActivationCost', 'TRASH_CARD'], 'Guide-covered trash-card activation cost.');
  }
  if (/\bopponent trashes .*card from their hand\b/.test(text)) {
    return parserGap(['TRASH_CARD'], 'Guide-covered opponent hand trash action.');
  }
  if (/\breveals? (that card|those cards|.*cards?)\b/.test(text)) {
    return parserGap(['REVEAL_CARD'], 'Guide-covered reveal action.');
  }
  if (/\bshuffle your deck\b/.test(text)) {
    return parserGap(['SHUFFLE_ZONE'], 'Guide-covered shuffle action.');
  }
  if (/\bplay up to .*from your deck\b/.test(text)) {
    return parserGap(['PLAY_CARD', 'SHUFFLE_ZONE'], 'Guide-covered play-from-deck pattern, usually followed by shuffle.');
  }
  if (/\[double attack\].*\[banish\]|\[banish\].*\[double attack\]/.test(text)) {
    return parserGap(['GRANT_KEYWORD'], 'Guide-covered keyword text. Parser should split adjacent keyword tags.');
  }
  if (/\bdeal \d+ damage\b/.test(text)) {
    return parserGap(['DEAL_DAMAGE'], 'Guide-covered damage action.');
  }
  if (/\bbase power becomes\b|\bset the power\b|\bpower becomes\b/.test(text)) {
    return parserGap(['MODIFY_POWER', 'ValueExpression'], 'Guide-covered stat set/copy action.');
  }
  if (/\bcounter .*becomes\b|\bbase counter\b/.test(text)) {
    return parserGap(['MODIFY_COUNTER'], 'Guide-covered counter modification.');
  }
  if (/\breturn .*don!!.*to .*don!! deck\b|\breturn .*don!!.*to your cost area\b/.test(text)) {
    return parserGap(['RETURN_DON_TO_DON_DECK', 'MOVE_DON_TO_COST_AREA'], 'Guide-covered DON movement action.');
  }
  if (/\bgive \d+ .*don!!/.test(text)) {
    return parserGap(['GIVE_DON'], 'Guide-covered DON attachment action.');
  }
  if (/\bplaces? .*from .*hand at the bottom of .*deck\b/.test(text)) {
    return parserGap(['MOVE_CARD', 'PLACE_CARD_IN_DECK'], 'Guide-covered hand-to-deck movement.');
  }
  if (/\bchooses? .*card from .*hand\b/.test(text)) {
    return parserGap(['PLAYER_CHOOSES', 'OPPONENT_CHOOSES', 'SELECT_CARD'], 'Guide-covered player choice/selection.');
  }
  if (/\bfrom your hand to the top of your life\b|\bfrom your hand to the top of .*life cards?\b/.test(text)) {
    return parserGap(['ADD_CARD_TO_LIFE', 'MOVE_CARD'], 'Guide-covered hand-to-life movement.');
  }
  if (/\badd .*from .*life cards? to .*hand\b|\badd .*from the top or bottom of .*life cards? to .*hand\b/.test(text)) {
    return parserGap(['TAKE_LIFE_TO_HAND', 'MOVE_CARD'], 'Guide-covered life-to-hand movement.');
  }
  if (/\bnegate the effects?\b/.test(text)) {
    return parserGap(['INVALIDATE_EFFECTS'], 'Guide-covered effect invalidation.');
  }
  if (/^[➀➁➂➃➄➅➆➇➈➉]\s*:/.test(rawText.trim())) {
    return parserGap(['ActivationCost'], 'Guide-covered activation cost icon. Parser must normalize circled numerals to REST_DON_COST.');
  }

  switch (kind) {
    case 'activation-cost':
      return parserGap(['ActivationCost'], 'Guide-covered activation cost. Parser must lift this out of resolution.');
    case 'result-dependent-branch':
      return parserGap(['IF_ACTION_SUCCEEDED', 'ValueExpression'], 'Guide-covered result dependency. Parser must bind prior action results.');
    case 'condition-gate':
      return parserGap(['ConditionExpression'], 'Guide-covered condition gate. Parser must extract the condition tree.');
    case 'search-or-reveal':
      return parserGap(['SEARCH', 'LOOK_AT_CARDS', 'SELECT_CARD', 'REVEAL_CARD', 'MOVE_CARD', 'REORDER_CARDS'], 'Guide-covered search permutation. Parser must compose referenced atoms.');
    case 'selection':
      return parserGap(['SELECT_CARD', 'Selector'], 'Guide-covered selection. Parser must create a selection result reference.');
    case 'permission-prevention':
      return parserGap(['PREVENT_ACTION', 'PREVENT_SELECTION', 'PREVENT_ZONE_CHANGE'], 'Guide-covered permission/prevention atom.');
    case 'replacement':
      return parserGap(['CREATE_REPLACEMENT_EFFECT'], 'Guide-covered replacement effect/window.');
    case 'scaling-or-loop':
      return parserGap(['ValueExpression', 'FOR_EACH', 'REPEAT'], 'Guide-covered value/loop expression.');
    case 'activate-referenced-effect':
      return parserGap(['ACTIVATE_EVENT', 'COPY_EFFECT'], 'Guide-covered referenced activation/effect-copy pattern.');
    case 'rule-modifier':
      return parserGap(['RULE_MODIFIER'], 'Guide-covered rule modifier.');
    default:
      return {
        coverage: 'definitionGap',
        atoms: [],
        remark: 'No V2 canonical registry classification matched this text. Review whether the guide needs a new definition or the parser needs a classifier.',
      };
  }
}

function atom(
  atomName: string,
  family: string,
  subatoms: string[],
  references: string[],
  remark: string,
): CanonicalAtomDefinition_V2 {
  return { atom: atomName, family, subatoms, references, remark };
}

function parserGap(atoms: string[], remark: string): CanonicalClassification_V2 {
  return { coverage: 'parserGap', atoms, remark };
}
