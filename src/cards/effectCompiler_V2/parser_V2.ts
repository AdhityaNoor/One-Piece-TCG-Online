import {
  actionNode_V2,
  andConditions_V2,
  controllerCharacterSelector_V2,
  donAttachedAtLeast_V2,
  durationFromText_V2,
  exactly_V2,
  handSelector_V2,
  leaderOrCharacterSelector_V2,
  numberValue_V2,
  opponentCharacterSelector_V2,
  optionalityFromText_V2,
  selfSelector_V2,
  sequence_V2,
  sourceZoneForCategory_V2,
  timing_V2,
  turnIs_V2,
  upTo_V2,
} from './helpers_V2';
import {
  EFFECT_SCHEMA_VERSION_V2,
  type Action_V2,
  type AtomicCoverageStatus_V2,
  type CardEffectCoverageReport_V2,
  type Color_V2,
  type ConditionExpression_V2,
  type CostAction_V2,
  type EffectCategory_V2,
  type EffectDefinition_V2,
  type KeywordEffect_V2,
  type ParsedAtomicEffect_V2,
  type ParsedEffect_V2,
  type ResolutionNode_V2,
  type Selector_V2,
  type StandardTiming_V2,
  type TimingExpression_V2,
  type ValueExpression_V2,
} from './types_V2';
import { canonicalAtomsForAction_V2, classifyUnrecognizedTextAgainstCanonical_V2 } from './canonicalRegistry_V2';

export const EFFECT_PARSER_VERSION_V2 = 'effect-parser-v2.0.0' as const;

interface TagInfo_V2 {
  tag: string;
  index: number;
}

const TIMING_TAGS_V2: Record<string, { timing: StandardTiming_V2; category: EffectCategory_V2 }> = {
  '[On Play]': { timing: 'ON_PLAY', category: 'AUTO' },
  '[When Attacking]': { timing: 'WHEN_ATTACKING', category: 'AUTO' },
  '[On Block]': { timing: 'ON_BLOCK', category: 'AUTO' },
  "[On Your Opponent's Attack]": { timing: 'ON_OPPONENT_ATTACK', category: 'AUTO' },
  '[On K.O.]': { timing: 'ON_KO', category: 'AUTO' },
  '[End of Your Turn]': { timing: 'END_OF_YOUR_TURN', category: 'AUTO' },
  "[End of Your Opponent's Turn]": { timing: 'END_OF_OPPONENT_TURN', category: 'AUTO' },
  '[Activate: Main]': { timing: 'ACTIVATE_MAIN', category: 'ACTIVATE' },
  '[Main]': { timing: 'EVENT_MAIN', category: 'ACTIVATE' },
  '[Counter]': { timing: 'EVENT_COUNTER', category: 'ACTIVATE' },
  '[Trigger]': { timing: 'TRIGGER', category: 'AUTO' },
};

const KEYWORD_TAGS_V2: Record<string, KeywordEffect_V2> = {
  '[Rush]': 'RUSH',
  '[Rush: Character]': 'RUSH_CHARACTER',
  '[Blocker]': 'BLOCKER',
  '[Double Attack]': 'DOUBLE_ATTACK',
  '[Banish]': 'BANISH',
  '[Unblockable]': 'UNBLOCKABLE',
};

function collapseSpaces_V2(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function findTags_V2(text: string): TagInfo_V2[] {
  const tags: TagInfo_V2[] = [];
  const re = /\[[^\]]+\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) tags.push({ tag: match[0], index: match.index });
  return tags;
}

function splitEffectSegments_V2(text: string): string[] {
  const starts = findTags_V2(text)
    .filter((hit) => (hit.tag in TIMING_TAGS_V2 && isEffectTimingBoundary_V2(text, hit.index))
      || ((isConditionOnlyTag_V2(hit.tag) || hit.tag in KEYWORD_TAGS_V2) && /[.。]$/.test(text.slice(0, hit.index).trimEnd())))
    .map((hit) => hit.index);
  if (starts.length === 0) return [text];

  const bounds = [0, ...starts, text.length];
  const segments: string[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const segment = collapseSpaces_V2(text.slice(bounds[i], bounds[i + 1]));
    if (segment.length > 0) segments.push(segment);
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const moved = moveTrailingConditionTagsToNextSegment_V2(segments[i], segments[i + 1]);
    segments[i] = moved.current;
    segments[i + 1] = moved.next;
  }

  if (segments.length >= 2 && onlyTags_V2(segments[0])) {
    segments[1] = `${segments[0]} ${segments[1]}`;
    segments.shift();
  }

  return segments.filter((segment) => collapseSpaces_V2(segment).length > 0);
}

function isEffectTimingBoundary_V2(text: string, index: number): boolean {
  if (index === 0) return true;
  const before = text.slice(0, index).trimEnd();
  const lowerBefore = before.toLowerCase();
  if (/\b(with|has|have|having|and|or|without|when) an?$/.test(lowerBefore)) return false;
  if (/\b(?:your|opponent'?s)$/.test(lowerBefore)) return false;
  if (/\bactivate (?:this card'?s|the)$/.test(lowerBefore)) return false;
  return before.length > 0;
}

function onlyTags_V2(text: string): boolean {
  return collapseSpaces_V2(text.replace(/\[[^\]]+\]/g, '')).length === 0;
}

function isConditionOnlyTag_V2(tag: string): boolean {
  return /^\[DON!!\s*x\s*\d+\]$/i.test(tag) || /^\[(Your|Opponent's) Turn\]$/i.test(tag) || /^\[Once Per Turn\]$/i.test(tag);
}

function moveTrailingConditionTagsToNextSegment_V2(current: string, next: string): { current: string; next: string } {
  const trailingTags: string[] = [];
  let rest = current.trimEnd();
  for (;;) {
    const match = rest.match(/\s*(\[[^\]]+\])\s*$/);
    if (!match || !isConditionOnlyTag_V2(match[1])) break;
    trailingTags.unshift(match[1]);
    rest = rest.slice(0, match.index).trimEnd();
  }
  if (trailingTags.length === 0) return { current, next };
  return {
    current: rest,
    next: `${trailingTags.join(' ')} ${next}`.trim(),
  };
}

function peelLeadingTags_V2(text: string): { tags: string[]; body: string } {
  const tags: string[] = [];
  let body = text.trim();
  for (;;) {
    const match = body.match(/^\[[^\]]+\]/);
    if (!match) break;
    tags.push(match[0]);
    body = body.slice(match[0].length).trim();
  }
  return { tags, body };
}

function splitAtomicClauses_V2(body: string): string[] {
  const normalized = body.replace(/^\s*((?:\[[^\]]+\]\s*)+)$/, '$1');
  const stagedTrash = normalized.match(/^\s*Apply each of the following effects based on the number of cards in your trash:\s*(.+)$/i);
  if (stagedTrash) {
    return stagedTrash[1]
      .split(/(?:\u2022|â€¢|Ã¢â‚¬Â¢|ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢)\s*/u)
      .map(collapseSpaces_V2)
      .filter(Boolean)
      .map((clause) => clause
        .replace(/^If there are (\d+) or more cards,/i, 'If you have $1 or more cards in your trash,')
        .replace(/^If you have (\d+) or more cards,/i, 'If you have $1 or more cards in your trash,'))
      .flatMap(splitJoinedActionClauses_V2);
  }
  if (/^(?:\[[^\]]+\]\s*)+$/.test(normalized.trim())) {
    return normalized.match(/\[[^\]]+\]/g) ?? [];
  }
  if (/^\s*(?:\[[^\]]+\]\s*){2,}/.test(normalized)) {
    const tags = normalized.match(/\[[^\]]+\]/g) ?? [];
    const rest = collapseSpaces_V2(normalized.replace(/^(?:\[[^\]]+\]\s*)+/, ''));
    return [...tags, ...(rest ? [rest] : [])];
  }
  const punctuationSafe = normalized.replace(/\[[^\]]+\]/g, (tag) => tag
    .replace(/:/g, '__TAG_COLON__')
    .replace(/\./g, '__TAG_DOT__')
    .replace(/;/g, '__TAG_SEMI__'));
  return punctuationSafe
    .replace(/K\.O\./gi, 'KO')
    .replace(/\([^)]*\)/g, ' ')
    .split(/(?<=[.;:])\s+|(?<=[.;:])(?=If\b)|\bThen,\s+|,\s*then\s+/i)
    .map((clause) => collapseSpaces_V2(clause
      .replace(/__TAG_COLON__/g, ':')
      .replace(/__TAG_DOT__/g, '.')
      .replace(/__TAG_SEMI__/g, ';')))
    .flatMap(splitJoinedActionClauses_V2)
    .flatMap((clause) => (/^(?:\[[^\]]+\]\s*)+$/.test(clause.trim()) ? clause.match(/\[[^\]]+\]/g) ?? [] : [clause]))
    .filter((clause) => clause.length > 0 && clause !== '/' && !/^[.。]+$/.test(clause));
}

function splitJoinedActionClauses_V2(clause: string): string[] {
  if (/\bwould be\b/i.test(clause) && /\binstead\b/i.test(clause)) return [collapseSpaces_V2(clause)];

  const ruleAndGameStart = collapseSpaces_V2(clause).match(/^(\bunder the rules of this game\b.+?\bin your deck)\s+and\s+(at the start of the game,\s+.+)$/i);
  if (ruleAndGameStart) {
    return [
      collapseSpaces_V2(ruleAndGameStart[1]),
      collapseSpaces_V2(ruleAndGameStart[2]),
    ];
  }

  const actionAndCondition = collapseSpaces_V2(clause).match(/^(.+?)\s+and,\s+(if\b.+)$/i);
  if (actionAndCondition) {
    return [
      collapseSpaces_V2(actionAndCondition[1]),
      collapseSpaces_V2(actionAndCondition[2]),
    ];
  }

  const sharedSetActive = collapseSpaces_V2(clause).match(/^(.+?\bset up to .+? Characters?) and (up to \d+ of your DON!! cards? as active\.?)$/i);
  if (sharedSetActive) {
    return [
      collapseSpaces_V2(`${sharedSetActive[1]} as active`),
      collapseSpaces_V2(sharedSetActive[2]),
    ];
  }
  const cannotKoOrRest = collapseSpaces_V2(clause).match(/^(.+?cannot be )KO'?d or rested( by .+)$/i);
  if (cannotKoOrRest) {
    return [
      collapseSpaces_V2(`${cannotKoOrRest[1]}KO'd${cannotKoOrRest[2]}`),
      collapseSpaces_V2(`${cannotKoOrRest[1]}rested${cannotKoOrRest[2]}`),
    ];
  }
  const cannotRemovedAndPower = collapseSpaces_V2(clause).match(/^(.+?this Character cannot be removed from the field by your opponent'?s effects?) and (gains? [+\-âˆ’]\d+\s+power.*)$/i);
  if (cannotRemovedAndPower) {
    return [
      collapseSpaces_V2(cannotRemovedAndPower[1]),
      collapseSpaces_V2(`this Character ${cannotRemovedAndPower[2]}`),
    ];
  }
  const cannotKoAndPower = collapseSpaces_V2(clause).match(/^(.+?this Character cannot be KO'?d(?: in battle)?(?: by .+?)?) and (gains? [+\-âˆ’]\d+\s+power.*)$/i);
  if (cannotKoAndPower) {
    return [
      collapseSpaces_V2(cannotKoAndPower[1]),
      collapseSpaces_V2(`this Character ${cannotKoAndPower[2]}`),
    ];
  }
  const keywordAndStat = collapseSpaces_V2(clause).match(/^(.+?\bgains? \[(?:Rush: Character|Rush|Blocker|Double Attack|Banish|Unblockable)\]) and ([+\-âˆ’]\d+\s+(?:power|cost).*)$/i);
  if (keywordAndStat) {
    const targetPrefix = keywordAndStat[1].replace(/\bgains? \[(?:Rush: Character|Rush|Blocker|Double Attack|Banish|Unblockable)\]$/i, '').trim();
    return [
      collapseSpaces_V2(keywordAndStat[1]),
      collapseSpaces_V2(`${targetPrefix} gains ${keywordAndStat[2]}`),
    ];
  }
  const negateAndGiveThatCard = collapseSpaces_V2(clause);
  const negateAndGiveSplit = negateAndGiveThatCard.search(/\s+and\s+give that card\b/i);
  if (negateAndGiveSplit > 0 && /\bnegate the effects? of\b/i.test(negateAndGiveThatCard)) {
    const first = negateAndGiveThatCard.slice(0, negateAndGiveSplit);
    const second = negateAndGiveThatCard.slice(negateAndGiveSplit).replace(/^\s+and\s+/i, '');
    const duration = second.match(/\b(during this turn|during this battle|until the end of your opponent'?s next turn|until the end of your next turn)\b/i)?.[1] ?? '';
    return [
      collapseSpaces_V2(`${first} ${duration}`),
      collapseSpaces_V2(second),
    ];
  }
  const patterns = [
    /(?:,\s+)?and\s+(?=add up to \d+ additional DON!! cards?\b)/i,
    /\s+and\s+(?=play up to \d+\b)/i,
    /\s+and\s+(?=place (?:it|them|that card|the rest)\b)/i,
    /\s+and\s+(?=add up to \d+\b)/i,
    /\s+and\s+(?=give up to \d+\b)/i,
    /\s+and\s+(?=trash \d+\b)/i,
    /\s+and\s+(?=it gains \+\d+\s+cost\b)/i,
    /(?:,\s+)?and\s+(?=draw \d+\b)/i,
    /\s+and\s+(?=that card gains\b)/i,
    /\s+and\s+(?=give that card\b)/i,
    /\s+and\s+(?=(?:this|your|that) [^,.;]*gains\s+\[[^\]]+\])/i,
    /\s+and\s+(?=up to \d+ .*gains?\s+\[[^\]]+\])/i,
    /\s+and\s+(?=gains?\s+\[[^\]]+\])/i,
    /\s+and\s+(?=up to \d+ of your DON!! cards? as active\b)/i,
  ];
  return patterns.reduce<string[]>((clauses, pattern) => clauses.flatMap((part) => part.split(pattern)), [clause])
    .map(collapseSpaces_V2)
    .filter(Boolean);
}

function stripLeadingContextClauses_V2(text: string): string {
  let current = collapseSpaces_V2(text);
  current = collapseSpaces_V2(current.replace(/^Choose one:[â€¢•]\s*/i, ''));
  for (let i = 0; i < 3; i++) {
    const next = current.replace(/^(?:if|when)\b.+?,\s*/i, '');
    if (next === current) break;
    current = collapseSpaces_V2(next);
  }
  return current;
}

function splitChooseOneBody_V2(body: string): { prefix: string; options: string[] } | undefined {
  const match = body.match(/\bChoose one:\s*/i);
  if (!match || match.index === undefined) return undefined;
  const prefix = collapseSpaces_V2(body.slice(0, match.index));
  const rawOptions = body.slice(match.index + match[0].length);
  const options = rawOptions
    .replace(/(?:â€¢|•|Ã¢â‚¬Â¢)/g, '\n')
    .split(/\n+/)
    .map(collapseSpaces_V2)
    .filter(Boolean);
  if (options.length === 1 && /^\s*-/.test(rawOptions)) {
    const hyphenOptions = rawOptions
      .split(/-\s+/)
      .map(collapseSpaces_V2)
      .filter(Boolean);
    if (hyphenOptions.length > 1) return { prefix, options: hyphenOptions };
  }
  return options.length > 0 ? { prefix, options } : undefined;
}

function isInlineTimingOnlyClause_V2(text: string): boolean {
  return /^\[Once Per Turn\]\s+This effect can be activated\b/i.test(text)
    || /^This effect can be activated\b/i.test(text);
}

function isPureConditionClause_V2(text: string): boolean {
  return /^(?:if|when)\b.+,\s*$/i.test(collapseSpaces_V2(text));
}

function isResultDependentClause_V2(text: string): boolean {
  return /^(?:if you do|if you did|if they do not|this way)\b/i.test(collapseSpaces_V2(text));
}

function isNegativeResultDependentClause_V2(text: string): boolean {
  return /^if they do not\b/i.test(collapseSpaces_V2(text));
}

function isInlineConditionalActionClause_V2(text: string): boolean {
  return /^if\b/i.test(collapseSpaces_V2(text)) && !isResultDependentClause_V2(text) && !isPureConditionClause_V2(text);
}

function conditionKey_V2(condition: ConditionExpression_V2): string {
  return JSON.stringify(condition);
}

function mergeConditionalThen_V2(nodes: ResolutionNode_V2[], next: ResolutionNode_V2): ResolutionNode_V2[] {
  if (nodes.length === 0) return [next];
  const previous = nodes[nodes.length - 1];
  if (
    previous.kind !== 'IF'
    || next.kind !== 'IF'
    || previous.else
    || next.else
    || conditionKey_V2(previous.condition) !== conditionKey_V2(next.condition)
  ) {
    return [...nodes, next];
  }

  const previousNodes = previous.then.kind === 'SEQUENCE' ? previous.then.nodes : [previous.then];
  const nextNodes = next.then.kind === 'SEQUENCE' ? next.then.nodes : [next.then];
  return [
    ...nodes.slice(0, -1),
    {
      kind: 'IF',
      condition: previous.condition,
      then: sequence_V2([...previousNodes, ...nextNodes]),
    },
  ];
}

function groupConsecutiveConditionals_V2(nodes: ResolutionNode_V2[]): ResolutionNode_V2[] {
  return nodes.reduce<ResolutionNode_V2[]>((grouped, node) => mergeConditionalThen_V2(grouped, node), []);
}

function parsedAtomForAction_V2(
  cardNumber: string,
  effectIndex: number,
  atomIndex: number,
  markerTags: string[],
  rawText: string,
  action: Action_V2,
): ParsedAtomicEffect_V2 {
  return {
    id: `${cardNumber}#${effectIndex}.${atomIndex}`,
    cardNumber,
    effectIndex,
    atomIndex,
    markerTags,
    rawText,
    normalizedText: collapseSpaces_V2(rawText),
    parsedAction: action,
    canonicalAtoms: canonicalAtomsForAction_V2(action),
    canonicalCoverage: 'canonical',
    canonicalRemark: 'Parser emitted a canonical V2 atom.',
    coverage: 'coveredByParser',
  };
}

function normalizePermanentResolution_V2(node: ResolutionNode_V2): ResolutionNode_V2 {
  if (node.kind === 'ACTION' && 'duration' in node.action && node.action.duration.kind === 'INSTANT') {
    return { ...node, action: { ...node.action, duration: { kind: 'PERMANENT' } } as Action_V2 };
  }
  if (node.kind === 'SEQUENCE') return { ...node, nodes: node.nodes.map(normalizePermanentResolution_V2) };
  if (node.kind === 'IF') {
    return {
      ...node,
      then: normalizePermanentResolution_V2(node.then),
      ...(node.else ? { else: normalizePermanentResolution_V2(node.else) } : {}),
    };
  }
  if (node.kind === 'IF_ACTION_SUCCEEDED') return { ...node, then: normalizePermanentResolution_V2(node.then) };
  if (node.kind === 'CHOOSE') return { ...node, options: node.options.map(normalizePermanentResolution_V2) };
  return node;
}

function countCondition_V2(selector: Selector_V2, operator: Extract<ConditionExpression_V2, { kind: 'PREDICATE' }>['operator'], value: number): ConditionExpression_V2 {
  return {
    kind: 'PREDICATE',
    left: { kind: 'COUNT', selector },
    operator,
    right: numberValue_V2(value),
  };
}

function totalLifeAndHandAtMostCondition_V2(value: number): ConditionExpression_V2 {
  return {
    kind: 'PREDICATE',
    left: {
      kind: 'ADD',
      left: { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } } },
      right: { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], quantity: { kind: 'ANY_NUMBER' } } },
    },
    operator: 'LESS_OR_EQUAL',
    right: numberValue_V2(value),
  };
}

function ownCharacterCostAtLeastCondition_V2(value: number): ConditionExpression_V2 {
  return countCondition_V2({
    subject: 'CARD',
    controller: 'PLAYER',
    zones: ['CHARACTER_AREA'],
    cardCategories: ['CHARACTER'],
    cost: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: numberValue_V2(value) },
    quantity: { kind: 'ANY_NUMBER' },
  }, 'GREATER_OR_EQUAL', 1);
}

function trashCountAtLeastCondition_V2(value: number): ConditionExpression_V2 {
  return countCondition_V2({
    subject: 'CARD',
    owner: 'PLAYER',
    zones: ['TRASH'],
    quantity: { kind: 'ANY_NUMBER' },
  }, 'GREATER_OR_EQUAL', value);
}

function eventActivationCountAtLeastCondition_V2(baseCost: number, count: number): ConditionExpression_V2 {
  return {
    kind: 'PREDICATE',
    left: {
      kind: 'EVENT_ACTIVATION_COUNT',
      player: 'PLAYER',
      during: 'THIS_TURN',
      eventBaseCost: {
        propertyLayer: 'BASE',
        comparison: 'AT_LEAST',
        value: numberValue_V2(baseCost),
      },
    },
    operator: 'GREATER_OR_EQUAL',
    right: numberValue_V2(count),
  };
}

function selfTurnCountAtLeastCondition_V2(turnCount: number): ConditionExpression_V2 {
  return {
    kind: 'PREDICATE',
    left: { kind: 'SELF_TURN_COUNT', player: 'PLAYER' },
    operator: 'GREATER_OR_EQUAL',
    right: numberValue_V2(turnCount),
  };
}

function everyCountValue_V2(count: ValueExpression_V2, divisor: number): ValueExpression_V2 {
  return divisor <= 1 ? count : { kind: 'FLOOR_DIVIDE', left: count, right: numberValue_V2(divisor) };
}

function scalingCountFromText_V2(text: string): ValueExpression_V2 | undefined {
  const lower = text.toLowerCase();
  const divisorMatch = lower.match(/\bfor every (\d+) /);
  const divisor = divisorMatch ? Number(divisorMatch[1]) : 1;

  if (/for every (?:\d+ )?events? in your trash/.test(lower)) {
    return everyCountValue_V2({ kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], cardCategories: ['EVENT'], quantity: { kind: 'ANY_NUMBER' } } }, divisor);
  }
  if (/for every (?:\d+ )?cards? in your trash/.test(lower)) {
    return everyCountValue_V2({ kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], quantity: { kind: 'ANY_NUMBER' } } }, divisor);
  }
  if (/for every (?:\d+ )?cards? in your hand/.test(lower)) {
    return everyCountValue_V2({ kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], quantity: { kind: 'ANY_NUMBER' } } }, divisor);
  }
  if (/for every (?:\d+ )?of your rested don!! cards/.test(lower)) {
    return everyCountValue_V2({ kind: 'COUNT', selector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'], states: ['RESTED'], quantity: { kind: 'ANY_NUMBER' } } }, divisor);
  }
  if (/for every don!! card given to that character/.test(lower)) {
    return everyCountValue_V2({ kind: 'COUNT', selector: { subject: 'DON', zones: ['ATTACHED_DON'], relations: ['ATTACHED_TO_THIS_CARD'], quantity: { kind: 'ANY_NUMBER' } } }, divisor);
  }
  if (/for each of your characters with a different card name/.test(lower)) {
    return {
      kind: 'COUNT',
      selector: {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        quantity: { kind: 'ANY_NUMBER' },
        distinctBy: 'CARD_NAME',
      },
    };
  }
  if (/for every card trashed/.test(lower)) return { kind: 'PREVIOUS_RESULT', resultId: 'trashed-card-count' };
  if (/for every don!! card rested this way/.test(lower)) return { kind: 'PREVIOUS_RESULT', resultId: 'rested-don-count' };
  if (/for every returned character/.test(lower)) return { kind: 'PREVIOUS_RESULT', resultId: 'returned-character-count' };
  if (/for every character (?:ko'?d|k\.o\.'?d)/.test(lower)) return { kind: 'PREVIOUS_RESULT', resultId: 'ko-character-count' };
  if (/for every (\d+) cards placed at the bottom of your deck/.test(lower)) return everyCountValue_V2({ kind: 'PREVIOUS_RESULT', resultId: 'placed-bottom-deck-count' }, divisor);
  return undefined;
}

function scaledValueFromText_V2(text: string, unit: number): ValueExpression_V2 {
  const count = scalingCountFromText_V2(text);
  return count ? { kind: 'MULTIPLY', values: [numberValue_V2(unit), count] } : numberValue_V2(unit);
}

function opponentCharacterCostAtMostSelector_V2(value: number): Selector_V2 {
  return {
    subject: 'CARD',
    controller: 'OPPONENT',
    zones: ['CHARACTER_AREA'],
    cardCategories: ['CHARACTER'],
    quantity: upTo_V2(1),
    chooser: 'EFFECT_OWNER',
    cost: { propertyLayer: 'CURRENT', comparison: 'AT_MOST', value: numberValue_V2(value) },
  };
}

function buildAlternateResolutionEffect_V2(
  cardNumber: string,
  effectIndex: number,
  segment: string,
  tags: string[],
  tagInfo: ReturnType<typeof classifyTags_V2>,
  body: string,
): { effect: EffectDefinition_V2; atoms: ParsedAtomicEffect_V2[] } | undefined {
  const lower = collapseSpaces_V2(body).toLowerCase();
  const baseEffect = (resolution: ResolutionNode_V2): EffectDefinition_V2 => {
    const conditions = andConditions_V2(tagInfo.conditions);
    const category = tagInfo.category;
    return {
      id: `${cardNumber}#${effectIndex}`,
      source: {
        objectRef: 'THIS_CARD',
        owner: 'PLAYER',
        controller: 'PLAYER',
        sourceZone: 'NONE',
        effectIndex,
      },
      category,
      applicationMode: category === 'PERMANENT' ? 'CONTINUOUS' : 'ONE_SHOT',
      activationZones: sourceZoneForCategory_V2(category),
      timing: timing_V2(tagInfo.timing ?? 'ON_ENTER_PLAY'),
      ...(conditions ? { conditions } : {}),
      optionality: optionalityFromText_V2(segment),
      resolution,
      metadata: {
        sourceCardNumber: cardNumber,
        effectIndex,
        printedText: segment,
        normalizedText: collapseSpaces_V2(segment),
        parserVersion: EFFECT_PARSER_VERSION_V2,
        authoringStatus: 'PARSED_ONLY',
      },
    };
  };

  if (/instead of drawing 1 card/.test(lower) && /total of 4 or less cards in your life area and hand/.test(lower)) {
    const drawAction: Action_V2 = { type: 'DRAW_CARD', player: 'PLAYER', count: numberValue_V2(1) };
    const lifeAction: Action_V2 = {
      type: 'ADD_CARD_TO_LIFE',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: upTo_V2(1), ordering: 'DECK_ORDER' },
      player: 'PLAYER',
      position: 'TOP',
      face: 'FACE_DOWN',
    };
    const drawAtom = parsedAtomForAction_V2(cardNumber, effectIndex, 0, tags, 'draw 1 card', drawAction);
    const lifeAtom = parsedAtomForAction_V2(cardNumber, effectIndex, 1, tags, 'add up to 1 card from the top of your deck to the top of your Life cards instead of drawing 1 card', lifeAction);
    const drawNode = actionNode_V2(drawAction, drawAtom.id);
    const lifeNode = actionNode_V2(lifeAction, lifeAtom.id);
    return {
      effect: baseEffect({
        kind: 'IF',
        condition: totalLifeAndHandAtMostCondition_V2(4),
        then: {
          kind: 'IF',
          condition: ownCharacterCostAtLeastCondition_V2(8),
          then: { kind: 'CHOOSE', chooser: 'PLAYER', options: [drawNode, lifeNode], minimumChoices: 1, maximumChoices: 1 },
          else: drawNode,
        },
      }),
      atoms: [drawAtom, lifeAtom],
    };
  }

  if (/instead of a character with a cost of 4 or less/.test(lower) && /15 or more cards in your trash/.test(lower)) {
    const koCost4: Action_V2 = { type: 'KO_CARD', selector: opponentCharacterCostAtMostSelector_V2(4), cause: 'EFFECT' };
    const koCost6: Action_V2 = { type: 'KO_CARD', selector: opponentCharacterCostAtMostSelector_V2(6), cause: 'EFFECT' };
    const baseAtom = parsedAtomForAction_V2(cardNumber, effectIndex, 0, tags, 'Choose up to 1 of your opponent\'s Characters with a cost of 4 or less and K.O. it.', koCost4);
    const upgradedAtom = parsedAtomForAction_V2(cardNumber, effectIndex, 1, tags, 'If you have 15 or more cards in your trash, choose up to 1 of your opponent\'s Characters with a cost of 6 or less instead of a Character with a cost of 4 or less.', koCost6);
    return {
      effect: baseEffect({
        kind: 'IF',
        condition: trashCountAtLeastCondition_V2(15),
        then: actionNode_V2(koCost6, upgradedAtom.id),
        else: actionNode_V2(koCost4, baseAtom.id),
      }),
      atoms: [baseAtom, upgradedAtom],
    };
  }

  return undefined;
}

function generatedEffectDefinition_V2(id: string, action: Action_V2, printedText: string, category: EffectCategory_V2 = 'AUTO'): EffectDefinition_V2 {
  return {
    id,
    source: { objectRef: 'GENERATED_EFFECT', owner: 'PLAYER', controller: 'PLAYER', sourceZone: 'NONE' },
    category,
    applicationMode: category === 'REPLACEMENT' ? 'CONTINUOUS' : 'ONE_SHOT',
    activationZones: ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'],
    optionality: 'MANDATORY',
    resolution: actionNode_V2(action),
    metadata: { sourceCardNumber: 'GENERATED', effectIndex: 0, printedText, authoringStatus: 'PARSED_ONLY' },
  };
}

function replacementTimingEvent_V2(eventType: 'CARD_WOULD_BE_KO' | 'CARD_WOULD_MOVE' | 'CARD_WOULD_REST', text: string): TimingExpression_V2 {
  const sourceSelector = preventionSourceSelectorFromText_V2(text);
  const effectCause = /by .*effects?|opponent'?s effects?|opponent'?s effect/i.test(text);
  const eventCause =
    eventType === 'CARD_WOULD_BE_KO'
      ? /would be (?:ko'?d|k\.o\.'?d)[^.]*by .*effects?/i.test(text)
      : eventType === 'CARD_WOULD_REST'
        ? /\bwould be rested\b/i.test(text) && effectCause
        : effectCause;
  return {
    kind: 'CUSTOM_EVENT',
    eventType,
    subject: selectorFromText_V2(text),
    ...(eventType === 'CARD_WOULD_MOVE' ? { fromZone: 'CHARACTER_AREA' as const } : {}),
    ...(eventCause && sourceSelector ? { sourceSelector } : {}),
    conditions: /in battle/i.test(text) && eventType === 'CARD_WOULD_BE_KO'
      ? {
          kind: 'PREDICATE',
          left: { kind: 'KO_CAUSE' },
          operator: 'EQUAL',
          right: { kind: 'STRING', value: 'BATTLE' },
        }
      : eventCause
        ? {
            kind: 'PREDICATE',
            left: eventType === 'CARD_WOULD_BE_KO'
              ? { kind: 'KO_CAUSE' }
              : eventType === 'CARD_WOULD_REST' ? { kind: 'REST_CAUSE' } : { kind: 'MOVE_CAUSE' },
            operator: 'EQUAL',
            right: { kind: 'STRING', value: 'EFFECT' },
          }
        : undefined,
  };
}

function replacementTimingFromText_V2(text: string): TimingExpression_V2 | undefined {
  const events: ('CARD_WOULD_BE_KO' | 'CARD_WOULD_MOVE' | 'CARD_WOULD_REST')[] = [];
  if (/\bwould be (?:ko'?d|k\.o\.'?d)\b/i.test(text) || /\bor (?:ko'?d|k\.o\.'?d)\b/i.test(text) || /instead of .*being (?:ko'?d|k\.o\.'?d)/i.test(text)) {
    events.push('CARD_WOULD_BE_KO');
  }
  if (/\bwould be removed from the field\b|\bwould leave the field\b/i.test(text)) {
    events.push('CARD_WOULD_MOVE');
  }
  if (/\bwould be rested\b/i.test(text)) {
    events.push('CARD_WOULD_REST');
  }
  const timings = events.map((event) => replacementTimingEvent_V2(event, text));
  if (timings.length === 0) return undefined;
  if (timings.length === 1) return timings[0];
  return { kind: 'OR', timings };
}

function replacementActionFromText_V2(text: string): ResolutionNode_V2 | undefined {
  const nodes = splitAtomicClauses_V2(text)
    .filter((clause) => !isInlineTimingOnlyClause_V2(clause) && !isPureConditionClause_V2(clause))
    .map((clause) => parseAtomicAction_V2(clause, { allowActivationCost: false }).action)
    .filter((action): action is Action_V2 => Boolean(action))
    .map((action) => actionNode_V2(action));
  return nodes.length > 0 ? sequence_V2(nodes) : undefined;
}

function withEachLeaderAndCharacterLimit_V2(selector: Selector_V2, text: string): Selector_V2 {
  if (!/\bup to\s+(?:\d+|a|an|one|two|three)\s+(?:of\s+)?each\s+of\s+/i.test(text)) return selector;
  const perCategoryCount = countFromText_V2(text);
  const categoryCount = selector.cardCategories?.filter((category) => category === 'LEADER' || category === 'CHARACTER').length ?? 2;
  return {
    ...selector,
    quantity: upTo_V2(perCategoryCount * categoryCount),
    perCardCategoryQuantity: upTo_V2(perCategoryCount),
    relations: [...(selector.relations ?? []), 'EACH_CARD_CATEGORY'],
  };
}

function selectorFromText_V2(text: string): Selector_V2 {
  const lower = text.toLowerCase();
  const quantity = quantityFromText_V2(text);
  const typeMatches = typeNamesFromText_V2(text);
  const nameMatches = bracketCardNameFiltersFromText_V2(text);

  if (/\b(?:of )?your opponent'?s Leader or Character cards?\b/i.test(text)) {
    return withTextFilters_V2(leaderOrCharacterSelector_V2('OPPONENT', quantity), text);
  }
  if (/\b(?:of )?(?:each of )?your opponent'?s Leader and Character cards?\b/i.test(text)) {
    return withEachLeaderAndCharacterLimit_V2(withTextFilters_V2(leaderOrCharacterSelector_V2('OPPONENT', quantity), text), text);
  }
  const allNamedAndThis = text.match(/\ball of your \[([^\]]+)\] cards?(?:' base power)? and this Character/i);
  if (allNamedAndThis) {
    return {
      subject: 'CARD',
      controller: 'PLAYER',
      zones: ['CHARACTER_AREA'],
      cardCategories: ['CHARACTER'],
      names: [{ kind: 'NAME_EXACT', value: allNamedAndThis[1] }],
      relations: ['INCLUDE_THIS_CARD'],
      quantity: { kind: 'ALL' },
      chooser: 'EFFECT_OWNER',
    };
  }
  if (/\b(?:this|your) Leader or (?:\d+|a|an|one|two|three) of your Characters?\b/i.test(text)
    || /\bup to (?:\d+|a|an|one|two|three) of your Leader or Character cards?(?: other than this card)?\b/i.test(text)
    || /\byour Leader or Character cards?(?: other than this card)?\b/i.test(text)
    || /\byour Leader and Character cards?(?: other than this card)?\b/i.test(text)) {
    const selector = withTextFilters_V2(leaderOrCharacterSelector_V2('PLAYER', quantity), text);
    if (/other than this card/i.test(text)) {
      return { ...selector, relations: [...(selector.relations ?? []), 'EXCLUDE_THIS_CARD'] };
    }
    return withEachLeaderAndCharacterLimit_V2(selector, text);
  }
  if (/\bthis (?:card|character|leader) would\b/i.test(text)) return selfSelector_V2();
  if (/\b(?:all of your|your) opponent'?s? .*characters?|opponent'?s? leader|opponent'?s? character/i.test(text)) {
    if (/leader (?:or|and) character/i.test(text)) return leaderOrCharacterSelector_V2('OPPONENT', quantity);
    if (/opponent'?s Leader\b/i.test(text) && !/character/i.test(text)) {
      return withTextFilters_V2({
        subject: 'CARD',
        controller: 'OPPONENT',
        zones: ['LEADER_AREA'],
        cardCategories: ['LEADER'],
        quantity,
        chooser: 'EFFECT_OWNER',
      }, text);
    }
    return withTextFilters_V2(opponentCharacterSelector_V2(quantity), text);
  }
  if (/this (card|character|leader)/i.test(text)) return selfSelector_V2();
  if (/\bthat (?:card|character)\b/i.test(text)) return { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'], quantity: exactly_V2(1) };
  if (/^it gains\b/i.test(collapseSpaces_V2(text))) return { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'], quantity: exactly_V2(1) };
  if (/\bthe selected Character will not become active\b/i.test(text)) return { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'], quantity: exactly_V2(1) };
  if (/\bselected (?:card|character|characters|cards)\b|\bchosen character\b|\bKO it\b|\bK\.O\. it\b/i.test(text)) {
    return { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1) };
  }
  if (/\b(?:your |this )?Leader(?:'s)?\b/i.test(text) && /\b(?:and|or)\b.*\bCharacters?\b|\bCharacters?\b.*\b(?:and|or)\b.*\bLeader\b/i.test(text)) {
    return withEachLeaderAndCharacterLimit_V2(withTextFilters_V2(leaderOrCharacterSelector_V2('PLAYER', quantity), text), text);
  }
  if (/\byour Leader'?s\b|\byour Leader\b/i.test(text) && !/Leader (?:or|and) Character/i.test(text)) {
    return withTextFilters_V2({
      subject: 'CARD',
      controller: 'PLAYER',
      zones: ['LEADER_AREA'],
      cardCategories: ['LEADER'],
      quantity,
      chooser: 'EFFECT_OWNER',
    }, text);
  }
  if (/select your leader and (?:\d+|a|an|one) character/i.test(text)) {
    return withTextFilters_V2({ ...leaderOrCharacterSelector_V2('PLAYER', exactly_V2(2)), relations: ['REQUIRES_LEADER_AND_CHARACTER'] }, text);
  }
  if (/\ball of your\b/i.test(text) && /\bCharacter cards?\b/i.test(text)) {
    return withTextFilters_V2({
      subject: 'CARD',
      controller: 'PLAYER',
      zones: ['CHARACTER_AREA'],
      cardCategories: ['CHARACTER'],
      quantity: { kind: 'ALL' },
      chooser: 'EFFECT_OWNER',
    }, text);
  }
  if (/all of your .*characters|your .*characters/i.test(text)) return withTextFilters_V2(controllerCharacterSelector_V2(/all/i.test(text) ? { kind: 'ALL' } : quantity), text);
  if (/\ball Characters?(?: cards?)?\b/i.test(text)) {
    return withTextFilters_V2({
      subject: 'CARD',
      zones: ['CHARACTER_AREA'],
      cardCategories: ['CHARACTER'],
      quantity: { kind: 'ALL' },
      chooser: 'EFFECT_OWNER',
    }, text);
  }
  if (/your (leader|character)|leader or character/i.test(text)) return withTextFilters_V2(leaderOrCharacterSelector_V2('PLAYER', quantity), text);
  return {
    subject: 'CARD',
    quantity,
    chooser: 'EFFECT_OWNER',
    ...(typeMatches.length > 0 ? { types: { kind: 'HAS_ANY_TYPE', values: typeMatches } as const } : {}),
    ...(nameMatches.length > 0 ? { names: nameMatches } : {}),
  };
}

function preventionSourceSelectorFromText_V2(text: string): Selector_V2 | undefined {
  if (/by your opponent'?s Leader and Character effects?/i.test(text)) {
    return leaderOrCharacterSelector_V2('OPPONENT', { kind: 'ANY_NUMBER' });
  }
  if (/by your opponent'?s (?:\w+'?s )?effects?|by your opponent'?s (?:\w+'?s )?effect/i.test(text)) {
    return { subject: 'EFFECT', controller: 'OPPONENT', quantity: { kind: 'ANY_NUMBER' } };
  }
  if (/by your own effects?|using your own effects?/i.test(text)) {
    return { subject: 'EFFECT', controller: 'PLAYER', quantity: { kind: 'ANY_NUMBER' } };
  }
  if (/by effects?/i.test(text)) {
    return { subject: 'EFFECT', controller: 'ANY', quantity: { kind: 'ANY_NUMBER' } };
  }
  return undefined;
}

function effectControllerFromText_V2(text: string): 'PLAYER' | 'OPPONENT' {
  return /\byour opponent'?s\b/i.test(text) ? 'OPPONENT' : 'PLAYER';
}

function effectSelectorFromText_V2(text: string): Selector_V2 {
  return {
    subject: 'EFFECT',
    controller: effectControllerFromText_V2(text),
    quantity: { kind: 'ALL' },
    chooser: 'EFFECT_OWNER',
  };
}

function quantityFromText_V2(text: string): Selector_V2['quantity'] {
  const lower = text.toLowerCase();
  const upTo = lower.match(/up to (?:a total of )?(\d+|a|an|one|two|three)/);
  if (upTo) return upTo_V2(wordNumber_V2(upTo[1]));
  const selectExact = lower.match(/\b(?:select|choose) (\d+|a|an|one|two|three)\b/);
  if (selectExact) return exactly_V2(wordNumber_V2(selectExact[1]));
  const exactOf = lower.match(/\b(\d+|a|an|one|two|three) of\b/);
  if (exactOf) return exactly_V2(wordNumber_V2(exactOf[1]));
  if (/\ball\b/.test(lower)) return { kind: 'ALL' };
  return exactly_V2(1);
}

function bracketCardNamesFromText_V2(text: string): string[] {
  return bracketCardNameFiltersFromText_V2(text).map((filter) => filter.value);
}

function bracketCardNameFiltersFromText_V2(text: string): NonNullable<Selector_V2['names']> {
  const filters: NonNullable<Selector_V2['names']> = [];
  for (const match of text.matchAll(/\[([^\]]+)\]/g)) {
    const name = match[1].trim();
    const tag = `[${name}]`;
    const isCardName = !(tag in TIMING_TAGS_V2)
      && !(tag in KEYWORD_TAGS_V2)
      && !/^\[DON!!\s*x\s*\d+\]$/i.test(tag)
      && !/^\[(Your|Opponent's) Turn\]$/i.test(tag)
      && !/^\[Once Per Turn\]$/i.test(tag);
    if (!isCardName) continue;
    const before = text.slice(Math.max(0, match.index - 16), match.index).toLowerCase();
    filters.push({ kind: /\bother than\s*$/.test(before) ? 'NAME_NOT' : 'NAME_EXACT', value: name });
  }
  return filters;
}

function typeNamesFromText_V2(text: string): string[] {
  return [
    ...[...text.matchAll(/\{([^}]+)\}\s*type/gi)].map((match) => match[1].trim()),
    ...[...text.matchAll(/\{([^}]+)\}(?=\s*(?:or|,|\}|\s)*\s*\{[^}]+\}\s*type)/gi)].map((match) => match[1].trim()),
    ...[...text.matchAll(/type includ(?:es|ing)\s+"([^"]+)"/gi)].map((match) => match[1].trim()),
  ].filter(Boolean);
}

function colorsFromText_V2(text: string): Color_V2[] {
  const colors: Color_V2[] = [];
  if (/\bred\b/i.test(text)) colors.push('RED');
  if (/\bgreen\b/i.test(text)) colors.push('GREEN');
  if (/\bblue\b/i.test(text)) colors.push('BLUE');
  if (/\bpurple\b/i.test(text)) colors.push('PURPLE');
  if (/\bblack\b/i.test(text)) colors.push('BLACK');
  if (/\byellow\b/i.test(text)) colors.push('YELLOW');
  return colors;
}

function uniqueNameFilters_V2(filters: NonNullable<Selector_V2['names']>): NonNullable<Selector_V2['names']> {
  const seen = new Set<string>();
  return filters.filter((filter) => {
    const key = `${filter.kind}:${filter.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings_V2(values: string[]): string[] {
  return [...new Set(values)];
}

function withTextFilters_V2(selector: Selector_V2, text: string): Selector_V2 {
  const names = bracketCardNameFiltersFromText_V2(text);
  const types = typeNamesFromText_V2(text);
  const colors = colorsFromText_V2(text);
  const numericFilters = numericFiltersFromText_V2(text);
  if (names.length === 0 && types.length === 0 && colors.length === 0 && !numericFilters.cost && !numericFilters.power) return selector;
  return {
    ...selector,
    ...(names.length > 0
      ? {
          names: uniqueNameFilters_V2([
            ...(selector.names ?? []),
            ...names,
          ]),
        }
      : {}),
    ...(types.length > 0
      ? {
          types: {
            kind: selector.types?.kind ?? 'HAS_ANY_TYPE',
            values: uniqueStrings_V2([...(selector.types?.values ?? []), ...types]),
          },
        }
      : {}),
    ...(colors.length > 0
      ? {
          colors: {
            kind: selector.colors?.kind ?? 'HAS_ANY_COLOR',
            values: uniqueStrings_V2([...(selector.colors?.values ?? []), ...colors]) as Color_V2[],
          },
        }
      : {}),
    ...numericFilters,
  };
}

function numericFiltersFromText_V2(text: string): Pick<Selector_V2, 'cost' | 'power'> {
  const filters: Pick<Selector_V2, 'cost' | 'power'> = {};
  const costPropertyLayer = /\bbase cost\b|\bwith a base cost\b/i.test(text) ? 'BASE' : 'CURRENT';
  const costAtMost = text.match(/\bcost(?: of)? (\d+) or less\b/i);
  if (costAtMost) {
    filters.cost = { propertyLayer: costPropertyLayer, comparison: 'AT_MOST', value: numberValue_V2(Number(costAtMost[1])) };
  }
  const costAtLeast = text.match(/\bcost(?: of)? (\d+) or more\b/i);
  if (costAtLeast) {
    filters.cost = { propertyLayer: costPropertyLayer, comparison: 'AT_LEAST', value: numberValue_V2(Number(costAtLeast[1])) };
  }
  const costBetween = text.match(/\bcost of (\d+) to (\d+)\b/i);
  if (costBetween) {
    filters.cost = {
      propertyLayer: costPropertyLayer,
      comparison: 'BETWEEN',
      minimum: numberValue_V2(Number(costBetween[1])),
      maximum: numberValue_V2(Number(costBetween[2])),
    };
  }
  const costEither = text.match(/\bcost of (\d+) or (\d+)\b/i);
  if (costEither) {
    filters.cost = {
      propertyLayer: costPropertyLayer,
      comparison: 'IN_SET',
      values: [numberValue_V2(Number(costEither[1])), numberValue_V2(Number(costEither[2]))],
    };
  }
  const powerAtMost = text.match(/\b(\d+) (base )?power or less\b|\bwith (\d+) (base )?power or less\b/i);
  if (powerAtMost) {
    filters.power = {
      propertyLayer: powerAtMost[2] || powerAtMost[4] ? 'BASE' : 'CURRENT',
      comparison: 'AT_MOST',
      value: numberValue_V2(Number(powerAtMost[1] ?? powerAtMost[3])),
    };
  }
  const powerExact = text.match(/\bwith (\d+) base power\b|\bwith a base power of (\d+)\b/i);
  if (powerExact) {
    filters.power = {
      propertyLayer: 'BASE',
      comparison: 'EQUAL',
      value: numberValue_V2(Number(powerExact[1] ?? powerExact[2])),
    };
  }
  const powerAtLeast = text.match(/\b(\d+) (base )?power or more\b|\bwith (\d+) (base )?power or more\b/i);
  if (powerAtLeast) {
    filters.power = {
      propertyLayer: powerAtLeast[2] || powerAtLeast[4] ? 'BASE' : 'CURRENT',
      comparison: 'AT_LEAST',
      value: numberValue_V2(Number(powerAtLeast[1] ?? powerAtLeast[3])),
    };
  }
  return filters;
}

function deckSearchSelector_V2(text: string): Selector_V2 {
  const selector = selectorFromText_V2(text);
  return withTextFilters_V2({
    ...selector,
    subject: 'CARD',
    owner: 'PLAYER',
    zones: ['DECK'],
    chooser: 'EFFECT_OWNER',
  }, text);
}

function ownerFromText_V2(text: string): 'PLAYER' | 'OPPONENT' | 'CARD_OWNER' {
  const lower = text.toLowerCase();
  if (/opponent'?s|their /.test(lower)) return 'OPPONENT';
  if (/owner'?s?/.test(lower)) return 'CARD_OWNER';
  return 'PLAYER';
}

function countFromText_V2(text: string, fallback = 1): number {
  const match = text.toLowerCase().match(/\b(up to )?(\d+|a|an|one|two|three)\b/);
  return match ? wordNumber_V2(match[2]) : fallback;
}

function circledNumber_V2(text: string): number | null {
  const actualGlyph = Array.from(text.trim())[0];
  const actualGlyphs: Record<string, number> = {
    '➀': 1, '➁': 2, '➂': 3, '➃': 4, '➄': 5, '➅': 6, '➆': 7, '➇': 8, '➈': 9, '➉': 10,
    '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
  };
  if (actualGlyph && actualGlyph in actualGlyphs) return actualGlyphs[actualGlyph];
  const glyph = text.trim().match(/^([➀➁➂➃➄➅➆➇➈➉①②③④⑤⑥⑦⑧⑨⑩])/u)?.[1];
  if (!glyph) return null;
  return {
    '➀': 1, '➁': 2, '➂': 3, '➃': 4, '➄': 5, '➅': 6, '➆': 7, '➇': 8, '➈': 9, '➉': 10,
    '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
  }[glyph] ?? null;
}

function stripLeadingCircledCostMarker_V2(text: string): string {
  const strippedActual = text.trim().replace(/^([➀➁➂➃➄➅➆➇➈➉①②③④⑤⑥⑦⑧⑨⑩])\s*/u, '');
  if (strippedActual !== text.trim()) return strippedActual.replace(/^\([^)]*\)\s*/u, '').trim();
  return text
    .trim()
    .replace(/^([âž€âžâž‚âžƒâž„âž…âž†âž‡âžˆâž‰â‘ â‘¡â‘¢â‘£â‘¤â‘¥â‘¦â‘§â‘¨â‘©])\s*/u, '')
    .replace(/^\([^)]*\)\s*/u, '')
    .trim();
}

function parseActivationCost_V2(text: string): CostAction_V2[] | undefined {
  const normalized = collapseSpaces_V2(text);
  const lower = normalized.toLowerCase();
  const circled = circledNumber_V2(normalized);
  if (circled != null && /:\s*$/.test(normalized)) {
    const donCost: CostAction_V2 = { type: 'REST_DON_COST', count: numberValue_V2(circled) };
    const remainder = stripLeadingCircledCostMarker_V2(normalized);
    if (remainder && remainder !== normalized && !/^:$/i.test(remainder)) {
      const remainderCosts = parseActivationCost_V2(remainder);
      if (remainderCosts?.length && remainderCosts.every((cost) => cost.type !== 'RAW_COST')) {
        return [donCost, ...remainderCosts];
      }
    }
    return [donCost];
  }

  const body = normalized.replace(/:\s*$/, '').replace(/^(?:you may|you can)\s+/i, '').trim();
  const restDonAndThis = lower.match(/(?:you may|you can) rest (\d+|a|an|one|two|three) of your don!! cards and this (character|card):?$/);
  if (restDonAndThis) {
    return [
      { type: 'REST_DON_COST', count: numberValue_V2(wordNumber_V2(restDonAndThis[1])) },
      { type: 'REST_CARD_COST', selector: selfSelector_V2() },
    ];
  }

  const restThisAndDon = lower.match(/(?:you may|you can) rest this (?:card|character) and (\d+|a|an|one|two|three) of your don!! cards:?$/);
  if (restThisAndDon) {
    return [
      { type: 'REST_CARD_COST', selector: selfSelector_V2() },
      { type: 'REST_DON_COST', count: numberValue_V2(wordNumber_V2(restThisAndDon[1])) },
    ];
  }

  const restDonAndReturnCharacter = normalized.match(/(?:You may|you may|You can|you can) rest (\d+|a|an|one|two|three) of your DON!! cards and return (\d+|a|an|one|two|three) of your Characters other than this Character to the owner'?s hand:?$/i);
  if (restDonAndReturnCharacter) {
    const selector = controllerCharacterSelector_V2(exactly_V2(wordNumber_V2(restDonAndReturnCharacter[2])));
    return [
      { type: 'REST_DON_COST', count: numberValue_V2(wordNumber_V2(restDonAndReturnCharacter[1])) },
      { type: 'RETURN_CARD_TO_HAND_COST', selector: { ...selector, relations: [...(selector.relations ?? []), 'EXCLUDE_THIS_CARD'] } },
    ];
  }

  const restThisAndOwn = normalized.match(/(?:You may|you may|You can|you can) rest this (?:Character|card) and (\d+|a|an|one|two|three) of your (?:\{([^}]+)\} type )?(Leader or Stage cards?|Characters?|cards?):?$/i);
  if (restThisAndOwn) {
    const target = restThisAndOwn[3].toLowerCase();
    const zones = target.includes('leader or stage') ? ['LEADER_AREA', 'STAGE_AREA'] as const : target.includes('character') ? ['CHARACTER_AREA'] as const : ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'] as const;
    const categories = target.includes('leader or stage') ? ['LEADER', 'STAGE'] as const : target.includes('character') ? ['CHARACTER'] as const : ['LEADER', 'CHARACTER', 'STAGE'] as const;
    return [
      { type: 'REST_CARD_COST', selector: selfSelector_V2() },
      {
        type: 'REST_CARD_COST',
        selector: withTextFilters_V2({
          subject: 'CARD',
          controller: 'PLAYER',
          zones: [...zones],
          cardCategories: [...categories],
          quantity: exactly_V2(wordNumber_V2(restThisAndOwn[1])),
          chooser: 'EFFECT_OWNER',
          ...(restThisAndOwn[2] ? { types: { kind: 'HAS_ANY_TYPE', values: [restThisAndOwn[2]] } as const } : {}),
        }, normalized),
      },
    ];
  }

  const restTypedLeaderStageAndReturnTypedCharacter = normalized.match(/(?:You may|you may|You can|you can) rest (\d+|a|an|one|two|three) of your \{([^}]+)\} type Leader or Stage cards, and return (\d+|a|an|one|two|three) of your \{([^}]+)\} type Characters with a cost of (\d+) or more to the owner'?s hand:?$/i);
  if (restTypedLeaderStageAndReturnTypedCharacter) {
    return [
      {
        type: 'REST_CARD_COST',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA', 'STAGE_AREA'],
          cardCategories: ['LEADER', 'STAGE'],
          types: { kind: 'HAS_ANY_TYPE', values: [restTypedLeaderStageAndReturnTypedCharacter[2]] },
          quantity: exactly_V2(wordNumber_V2(restTypedLeaderStageAndReturnTypedCharacter[1])),
          chooser: 'EFFECT_OWNER',
        },
      },
      {
        type: 'RETURN_CARD_TO_HAND_COST',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['CHARACTER_AREA'],
          cardCategories: ['CHARACTER'],
          types: { kind: 'HAS_ANY_TYPE', values: [restTypedLeaderStageAndReturnTypedCharacter[4]] },
          cost: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: numberValue_V2(Number(restTypedLeaderStageAndReturnTypedCharacter[5])) },
          quantity: exactly_V2(wordNumber_V2(restTypedLeaderStageAndReturnTypedCharacter[3])),
          chooser: 'EFFECT_OWNER',
        },
      },
    ];
  }

  const placeThisAndHandBottom = normalized.match(/(?:You may|you may|You can|you can) place this card and (\d+|a|an|one|two|three) cards? from your hand at the bottom of your deck(?: in any order)?:?$/i);
  if (placeThisAndHandBottom) {
    return [
      { type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: selfSelector_V2() },
      { type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(placeThisAndHandBottom[1]))) },
    ];
  }

  const placeHandBottomAndRestStage = normalized.match(/(?:You may|you may|You can|you can) place (\d+|a|an|one|two|three) cards? from your hand at the bottom of your deck in any order and rest this Stage:?$/i);
  if (placeHandBottomAndRestStage) {
    return [
      { type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(placeHandBottomAndRestStage[1]))) },
      { type: 'REST_CARD_COST', selector: selfSelector_V2() },
    ];
  }

  const placeThisAndTrashNamedBottom = normalized.match(/(?:You may|you may|You can|you can) place this Character and (\d+|a|an|one|two|three) \[([^\]]+)\] with (\d+) power from your trash at the bottom of your deck in any order:?$/i);
  if (placeThisAndTrashNamedBottom) {
    return [
      { type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: selfSelector_V2() },
      {
        type: 'RETURN_CARD_TO_DECK_COST',
        position: 'BOTTOM',
        selector: withTextFilters_V2({
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['TRASH'],
          names: [{ kind: 'NAME_EXACT', value: placeThisAndTrashNamedBottom[2] }],
          power: { propertyLayer: 'CURRENT', comparison: 'EQUAL', value: numberValue_V2(Number(placeThisAndTrashNamedBottom[3])) },
          quantity: exactly_V2(wordNumber_V2(placeThisAndTrashNamedBottom[1])),
          chooser: 'EFFECT_OWNER',
        }, normalized),
      },
    ];
  }

  const restThisAndPlaceCharacterBottom = normalized.match(/(?:You may|you may|You can|you can) rest this (?:card|Character) and place (\d+|a|an|one|two|three) of your Characters?(?: with \d+ base power)? at the bottom of your deck:?$/i);
  if (restThisAndPlaceCharacterBottom) {
    return [
      { type: 'REST_CARD_COST', selector: selfSelector_V2() },
      { type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: withTextFilters_V2(controllerCharacterSelector_V2(exactly_V2(wordNumber_V2(restThisAndPlaceCharacterBottom[1]))), normalized) },
    ];
  }

  const trashThisAndCharacter = normalized.match(/(?:You may|you may|You can|you can) trash this Character and (\d+|a|an|one|two|three) of your Characters?(?: with a type including "([^"]+)")?:?$/i);
  if (trashThisAndCharacter) {
    return [
      { type: 'TRASH_CARD_COST', selector: selfSelector_V2() },
      {
        type: 'TRASH_CARD_COST',
        selector: withTextFilters_V2({
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['CHARACTER_AREA'],
          cardCategories: ['CHARACTER'],
          quantity: exactly_V2(wordNumber_V2(trashThisAndCharacter[1])),
          chooser: 'EFFECT_OWNER',
          ...(trashThisAndCharacter[2] ? { types: { kind: 'TYPE_INCLUDES_TEXT', values: [trashThisAndCharacter[2]] } as const } : {}),
        }, normalized),
      },
    ];
  }

  const restThisAndPowerCost = normalized.match(/(?:You may|you may|You can|you can) rest this Character and give your (?:1 )?active Leader ([−-])(\d+) power during this turn:?$/i);
  if (restThisAndPowerCost) {
    return [
      { type: 'REST_CARD_COST', selector: selfSelector_V2() },
      {
        type: 'MODIFY_POWER_COST',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA'],
          cardCategories: ['LEADER'],
          states: ['ACTIVE'],
          quantity: exactly_V2(1),
          chooser: 'EFFECT_OWNER',
        },
        operation: 'SUBTRACT',
        value: numberValue_V2(Number(restThisAndPowerCost[2])),
        duration: { kind: 'THIS_TURN' },
      },
    ];
  }

  const restThisAndNamed = normalized.match(/(?:You may|you may|You can|you can) rest this (?:card|Character) and (\d+|a|an|one|two|three) of your \[([^\]]+)\] cards?:?$/i);
  if (restThisAndNamed) {
    return [
      { type: 'REST_CARD_COST', selector: selfSelector_V2() },
      {
        type: 'REST_CARD_COST',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'],
          names: [{ kind: 'NAME_EXACT', value: restThisAndNamed[2] }],
          quantity: exactly_V2(wordNumber_V2(restThisAndNamed[1])),
          chooser: 'EFFECT_OWNER',
        },
      },
    ];
  }

  const compoundParts = body.split(/\s+and\s+(?=(?:rest|trash|place|return|turn|reveal|add)\b)/i).map(collapseSpaces_V2).filter(Boolean);
  if (compoundParts.length > 1) {
    const parsedParts = compoundParts.map((part) => parseActivationCost_V2(`You may ${part}:`));
    if (parsedParts.every((part): part is CostAction_V2[] => Array.isArray(part) && part.length > 0)) {
      const flatParts = parsedParts.flat();
      if (flatParts.every((part) => part.type !== 'RAW_COST')) return flatParts;
    }
  }

  const donMinus = normalized.match(/DON!!\s*[−-]\s*(\d+)\s*:/i);
  if (donMinus) return [{ type: 'DON_MINUS_COST', count: numberValue_V2(Number(donMinus[1])), selectableZones: ['COST_AREA'] }];

  const trashTypedCharacterOrHand = normalized.match(/(?:You may|you may|You can|you can) trash (\d+|a|an|one|two|three) of your \{([^}]+)\} type Characters? or (\d+|a|an|one|two|three) cards? from your hand:?$/i);
  if (trashTypedCharacterOrHand) {
    return [{
      type: 'CHOOSE_ONE_COST',
      rawText: normalized,
      options: [
        [{
          type: 'TRASH_CARD_COST',
          selector: {
            subject: 'CARD',
            controller: 'PLAYER',
            zones: ['CHARACTER_AREA'],
            cardCategories: ['CHARACTER'],
            types: { kind: 'HAS_ANY_TYPE', values: [trashTypedCharacterOrHand[2]] },
            quantity: exactly_V2(wordNumber_V2(trashTypedCharacterOrHand[1])),
            chooser: 'EFFECT_OWNER',
          },
        }],
        [{
          type: 'TRASH_CARD_COST',
          selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(trashTypedCharacterOrHand[3]))),
        }],
      ],
    }];
  }

  const trashHand = lower.match(/(?:you may|you can) trash (\d+|a|an|one|two|three) .* from your hand:?$/);
  if (trashHand) {
    return [{
      type: 'TRASH_CARD_COST',
      selector: withTextFilters_V2(handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(trashHand[1]))), normalized),
    }];
  }

  const colonTrashHand = lower.match(/^trash (\d+|a|an|one|two|three) .* from your hand:$/);
  if (colonTrashHand) {
    return [{
      type: 'TRASH_CARD_COST',
      selector: withTextFilters_V2(handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(colonTrashHand[1]))), normalized),
    }];
  }

  const restDonCost = lower.match(/(?:you may|you can) rest (\d+|a|an|one|two|three) of your don!! cards:?$/);
  if (restDonCost) return [{ type: 'REST_DON_COST', count: numberValue_V2(wordNumber_V2(restDonCost[1])) }];

  if (/(?:you may|you can) trash any number .* from your hand:?\.?$/.test(lower)) {
    return [{ type: 'TRASH_CARD_COST', selector: withTextFilters_V2(handSelector_V2('PLAYER', { kind: 'ANY_NUMBER' }), normalized) }];
  }

  if (/(?:you may|you can) rest this (character|leader|stage):?$/.test(lower)) return [{ type: 'REST_CARD_COST', selector: selfSelector_V2() }];

  if (/(?:you may|you can) trash this (character|card):?$/.test(lower)) return [{ type: 'TRASH_CARD_COST', selector: selfSelector_V2() }];

  const returnDon = lower.match(/(?:you may|you can) return (\d+|a|an|one|two|three) .*don!! cards? to your don!! deck:?$/);
  if (returnDon) {
    return [{
      type: 'RETURN_DON_TO_DON_DECK_COST',
      selector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA', 'ATTACHED_DON'], quantity: exactly_V2(wordNumber_V2(returnDon[1])), chooser: 'EFFECT_OWNER' },
    }];
  }

  const returnGivenDonToCost = normalized.match(/(?:You may|you may|You can|you can) return (\d+|a|an|one|two|three) total of your currently given DON!! cards? to your cost area (active|rested):?$/i);
  if (returnGivenDonToCost) {
    return [{
      type: 'RETURN_DON_TO_COST_AREA_COST',
      state: returnGivenDonToCost[2].toUpperCase() as 'ACTIVE' | 'RESTED',
      selector: {
        subject: 'DON',
        owner: 'PLAYER',
        zones: ['ATTACHED_DON'],
        quantity: exactly_V2(wordNumber_V2(returnGivenDonToCost[1])),
        chooser: 'EFFECT_OWNER',
        relations: ['CURRENTLY_GIVEN'],
      },
    }];
  }

  const addLife = lower.match(/(?:you may|you can) add (\d+|a|an|one|two|three) .*life cards? to your hand:?$/);
  if (addLife) {
    return [{
      type: 'ADD_LIFE_TO_HAND_COST',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: exactly_V2(wordNumber_V2(addLife[1])), ordering: 'DECK_ORDER' },
    }];
  }

  const addLifeArea = lower.match(/(?:you may|you can) add (\d+|a|an|one|two|three) card from your life area to your hand:?$/);
  if (addLifeArea) {
    return [{
      type: 'ADD_LIFE_TO_HAND_COST',
      selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: exactly_V2(wordNumber_V2(addLifeArea[1])), ordering: 'DECK_ORDER' },
    }];
  }

  const powerCost = normalized.match(/(?:You may|you may|You can|you can) give your (?:1 )?active Leader ([−-])(\d+) power during this turn:?$/i);
  if (powerCost) {
    return [{
      type: 'MODIFY_POWER_COST',
      selector: {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['LEADER_AREA'],
        cardCategories: ['LEADER'],
        states: ['ACTIVE'],
        quantity: exactly_V2(1),
        chooser: 'EFFECT_OWNER',
      },
      operation: 'SUBTRACT',
      value: numberValue_V2(Number(powerCost[2])),
      duration: { kind: 'THIS_TURN' },
    }];
  }

  const playNamedFromHandCost = normalized.match(/(?:You may|you may|You can|you can) play (\d+|a|an|one|two|three) \[([^\]]+)\] from your hand:?$/i);
  if (playNamedFromHandCost) {
    return [{
      type: 'PLAY_CARD_COST',
      selector: {
        subject: 'CARD',
        owner: 'PLAYER',
        zones: ['HAND'],
        names: [{ kind: 'NAME_EXACT', value: playNamedFromHandCost[2] }],
        quantity: exactly_V2(wordNumber_V2(playNamedFromHandCost[1])),
        chooser: 'EFFECT_OWNER',
      },
      state: 'ACTIVE',
    }];
  }

  const trashFishManOrNoah = normalized.match(/(?:You may|you may|You can|you can) trash (\d+|a|an|one|two|three) \{Fish-Man\} type card from your hand or (\d+|a|an|one|two|three) \[The Ark Noah\] from your hand or field:?$/i);
  if (trashFishManOrNoah) {
    return [{
      type: 'CHOOSE_ONE_COST',
      rawText: normalized,
      options: [
        [{
          type: 'TRASH_CARD_COST',
          selector: {
            subject: 'CARD',
            owner: 'PLAYER',
            zones: ['HAND'],
            types: { kind: 'HAS_ANY_TYPE', values: ['Fish-Man'] },
            quantity: exactly_V2(wordNumber_V2(trashFishManOrNoah[1])),
            chooser: 'EFFECT_OWNER',
          },
        }],
        [{
          type: 'TRASH_CARD_COST',
          selector: {
            subject: 'CARD',
            owner: 'PLAYER',
            zones: ['HAND', 'STAGE_AREA'],
            names: [{ kind: 'NAME_EXACT', value: 'The Ark Noah' }],
            quantity: exactly_V2(wordNumber_V2(trashFishManOrNoah[2])),
            chooser: 'EFFECT_OWNER',
          },
        }],
      ],
    }];
  }

  const giveOwnDonToNamed = normalized.match(/(?:You may|you may|You can|you can) give (\d+|a|an|one|two|three) active DON!! cards? to (\d+|a|an|one|two|three) of your \[([^\]]+)\]:?$/i);
  if (giveOwnDonToNamed) {
    return [{
      type: 'GIVE_DON_COST',
      donSelector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'], states: ['ACTIVE'], quantity: exactly_V2(wordNumber_V2(giveOwnDonToNamed[1])), chooser: 'EFFECT_OWNER' },
      targetSelector: { subject: 'CARD', controller: 'PLAYER', zones: ['LEADER_AREA', 'CHARACTER_AREA'], names: [{ kind: 'NAME_EXACT', value: giveOwnDonToNamed[3] }], quantity: exactly_V2(wordNumber_V2(giveOwnDonToNamed[2])), chooser: 'EFFECT_OWNER' },
    }];
  }

  const giveOpponentDon = normalized.match(/(?:You may|you may|You can|you can) give (\d+|a|an|one|two|three) of your opponent'?s rested DON!! cards? to (\d+|a|an|one|two|three) of your opponent'?s Characters:?$/i);
  if (giveOpponentDon) {
    return [{
      type: 'GIVE_DON_COST',
      donSelector: { subject: 'DON', owner: 'OPPONENT', zones: ['COST_AREA', 'ATTACHED_DON'], states: ['RESTED'], quantity: exactly_V2(wordNumber_V2(giveOpponentDon[1])), chooser: 'EFFECT_OWNER' },
      targetSelector: { subject: 'CARD', controller: 'OPPONENT', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: exactly_V2(wordNumber_V2(giveOpponentDon[2])), chooser: 'EFFECT_OWNER' },
    }];
  }

  const giveOwnDonAndTrashThis = normalized.match(/(?:You may|you may|You can|you can) give (\d+|a|an|one|two|three) of your active DON!! cards? to (\d+|a|an|one|two|three) of your Leader or Character cards and trash this Character:?$/i);
  if (giveOwnDonAndTrashThis) {
    return [
      {
        type: 'GIVE_DON_COST',
        donSelector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'], states: ['ACTIVE'], quantity: exactly_V2(wordNumber_V2(giveOwnDonAndTrashThis[1])), chooser: 'EFFECT_OWNER' },
        targetSelector: { subject: 'CARD', controller: 'PLAYER', zones: ['LEADER_AREA', 'CHARACTER_AREA'], cardCategories: ['LEADER', 'CHARACTER'], quantity: exactly_V2(wordNumber_V2(giveOwnDonAndTrashThis[2])), chooser: 'EFFECT_OWNER' },
      },
      { type: 'TRASH_CARD_COST', selector: selfSelector_V2() },
    ];
  }

  const returnDonAny = lower.match(/(?:you may|you can) return (\d+|a|an|one|two|three) or more don!! cards? from your field to your don!! deck:?$/);
  if (returnDonAny) {
    return [{
      type: 'RETURN_DON_TO_DON_DECK_COST',
      selector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA', 'ATTACHED_DON'], quantity: { kind: 'AT_LEAST', value: numberValue_V2(wordNumber_V2(returnDonAny[1])) }, chooser: 'EFFECT_OWNER' },
    }];
  }

  const trashLife = lower.match(/(?:you may|you can) trash (\d+|a|an|one|two|three) card from (?:the )?(?:top(?: or bottom)? of )?your life cards:?$/);
  if (trashLife) return [{ type: 'TRASH_LIFE_COST', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: exactly_V2(wordNumber_V2(trashLife[1])), ordering: 'DECK_ORDER', chooser: 'EFFECT_OWNER' } }];

  const turnLife = lower.match(/(?:you may|you can) turn (\d+|a|an|one|two|three) cards? from the top of your life cards face-(up|down):?$/);
  if (turnLife) return [{ type: turnLife[2] === 'up' ? 'TURN_LIFE_FACE_UP_COST' : 'TURN_LIFE_FACE_DOWN_COST', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: exactly_V2(wordNumber_V2(turnLife[1])), ordering: 'DECK_ORDER', chooser: 'EFFECT_OWNER' } }];

  const turnFaceUpLifeDown = lower.match(/(?:you may|you can) turn (\d+|a|an|one|two|three) of your face-up life cards face-down:?$/);
  if (turnFaceUpLifeDown) return [{ type: 'TURN_LIFE_FACE_DOWN_COST', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], states: ['ACTIVE'], quantity: exactly_V2(wordNumber_V2(turnFaceUpLifeDown[1])), chooser: 'EFFECT_OWNER' } }];

  const trashTopDeck = lower.match(/(?:you may|you can) trash (\d+|a|an|one|two|three) cards? from the top of your deck:?$/);
  if (trashTopDeck) return [{ type: 'TRASH_CARD_COST', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: exactly_V2(wordNumber_V2(trashTopDeck[1])), ordering: 'DECK_ORDER', chooser: 'EFFECT_OWNER' } }];

  const returnTrashDeckShuffle = normalized.match(/(?:You may|you may|You can|you can) return (\d+|a|an|one|two|three|\d+) cards? from your trash to your deck and shuffle it:?$/i);
  if (returnTrashDeckShuffle) {
    return [{
      type: 'RETURN_CARD_TO_DECK_AND_SHUFFLE_COST',
      selector: {
        subject: 'CARD',
        owner: 'PLAYER',
        zones: ['TRASH'],
        quantity: exactly_V2(wordNumber_V2(returnTrashDeckShuffle[1])),
        chooser: 'EFFECT_OWNER',
      },
    }];
  }

  const addOwnCharacterToLife = normalized.match(/(?:You may|you may|You can|you can) add (\d+|a|an|one|two|three) of your Characters with a cost of (\d+) or more and (\d+) power or more to the top of your Life cards face-up:?$/i);
  if (addOwnCharacterToLife) {
    return [{
      type: 'ADD_CARD_TO_LIFE_COST',
      position: 'TOP',
      face: 'FACE_UP',
      selector: {
        subject: 'CARD',
        controller: 'PLAYER',
        zones: ['CHARACTER_AREA'],
        cardCategories: ['CHARACTER'],
        cost: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: numberValue_V2(Number(addOwnCharacterToLife[2])) },
        power: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: numberValue_V2(Number(addOwnCharacterToLife[3])) },
        quantity: exactly_V2(wordNumber_V2(addOwnCharacterToLife[1])),
        chooser: 'EFFECT_OWNER',
      },
    }];
  }

  const placeTrashBottom = normalized.match(/(?:You may|you may|You can|you can) place (\d+|a|an|one|two|three) (?:\{([^}]+)\} type )?cards?(?: with a type including "([^"]+)")? from your trash at the bottom of your deck(?: in any order)?:?$/i);
  if (placeTrashBottom) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], quantity: exactly_V2(wordNumber_V2(placeTrashBottom[1])), chooser: 'EFFECT_OWNER', ...(placeTrashBottom[2] ? { types: { kind: 'HAS_ANY_TYPE', values: [placeTrashBottom[2]] } as const } : placeTrashBottom[3] ? { types: { kind: 'TYPE_INCLUDES_TEXT', values: [placeTrashBottom[3]] } as const } : {}) }, normalized) }];

  const returnTrashBottom = normalized.match(/(?:You may|you may|You can|you can) return (\d+|a|an|one|two|three) cards? from your trash to the bottom of your deck(?: in any order)?:?$/i);
  if (returnTrashBottom) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], quantity: exactly_V2(wordNumber_V2(returnTrashBottom[1])), chooser: 'EFFECT_OWNER' }, normalized) }];

  const placeHandBottom = normalized.match(/(?:You may|you may|You can|you can) place (\d+|a|an|one|two|three) cards? from your hand at the bottom of your deck:?$/i);
  if (placeHandBottom) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(placeHandBottom[1]))) }];

  const placeHandTop = normalized.match(/(?:You may|you may|You can|you can) place (\d+|a|an|one|two|three) cards? from your hand at the top of your deck:?$/i);
  if (placeHandTop) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'TOP', selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(placeHandTop[1]))) }];

  const placeStageBottom = normalized.match(/(?:You may|you may|You can|you can) place (\d+|a|an|one|two|three) Stage(?: with a cost of (\d+))? at the bottom of the owner'?s deck:?$/i);
  if (placeStageBottom) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['STAGE_AREA'], cardCategories: ['STAGE'], quantity: exactly_V2(wordNumber_V2(placeStageBottom[1])), chooser: 'EFFECT_OWNER', ...(placeStageBottom[2] ? { cost: { propertyLayer: 'CURRENT', comparison: 'EQUAL', value: numberValue_V2(Number(placeStageBottom[2])) } as const } : {}) }, normalized) }];

  const placeOwnStageBottom = normalized.match(/(?:You may|you may|You can|you can) place (\d+|a|an|one|two|three) of your Stages at the bottom of your deck:?$/i);
  if (placeOwnStageBottom) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: { subject: 'CARD', controller: 'PLAYER', zones: ['STAGE_AREA'], cardCategories: ['STAGE'], quantity: exactly_V2(wordNumber_V2(placeOwnStageBottom[1])), chooser: 'EFFECT_OWNER' } }];

  const placeThisStageBottom = normalized.match(/(?:You may|you may|You can|you can) place this Stage at the bottom of the owner'?s deck:?$/i);
  if (placeThisStageBottom) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: selfSelector_V2() }];

  const returnCharHand = normalized.match(/(?:You may|you may|You can|you can) return (\d+|a|an|one|two|three) of your (?:\{([^}]+)\} type )?Characters?(?: with a cost of (\d+) or more)? to the owner'?s hand:?$/i);
  if (returnCharHand) return [{ type: 'RETURN_CARD_TO_HAND_COST', selector: withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: exactly_V2(wordNumber_V2(returnCharHand[1])), chooser: 'EFFECT_OWNER', ...(returnCharHand[2] ? { types: { kind: 'HAS_ANY_TYPE', values: [returnCharHand[2]] } as const } : {}), ...(returnCharHand[3] ? { cost: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: numberValue_V2(Number(returnCharHand[3])) } as const } : {}) }, normalized) }];

  const returnThisHand = normalized.match(/(?:You may|you may|You can|you can) return this Character to the owner'?s hand:?$/i);
  if (returnThisHand) return [{ type: 'RETURN_CARD_TO_HAND_COST', selector: selfSelector_V2() }];

  const returnOtherCharacterHand = normalized.match(/(?:You may|you may|You can|you can) return (\d+|a|an|one|two|three) of your Characters other than this Character to the owner'?s hand:?$/i);
  if (returnOtherCharacterHand) {
    const selector = controllerCharacterSelector_V2(exactly_V2(wordNumber_V2(returnOtherCharacterHand[1])));
    return [{ type: 'RETURN_CARD_TO_HAND_COST', selector: { ...selector, relations: [...(selector.relations ?? []), 'EXCLUDE_THIS_CARD'] } }];
  }

  const returnAnyCharacterHand = normalized.match(/(?:You may|you may|You can|you can) return (\d+|a|an|one|two|three) Characters? to your hand:?$/i);
  if (returnAnyCharacterHand) return [{ type: 'RETURN_CARD_TO_HAND_COST', selector: withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: exactly_V2(wordNumber_V2(returnAnyCharacterHand[1])), chooser: 'EFFECT_OWNER' }, normalized) }];

  const placeAnyCharacterBottom = normalized.match(/(?:You may|you may|You can|you can) place (\d+|a|an|one|two|three) Characters? with a cost of (\d+) or less at the bottom of the owner'?s deck:?$/i);
  if (placeAnyCharacterBottom) return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: exactly_V2(wordNumber_V2(placeAnyCharacterBottom[1])), chooser: 'EFFECT_OWNER', cost: { propertyLayer: 'CURRENT', comparison: 'AT_MOST', value: numberValue_V2(Number(placeAnyCharacterBottom[2])) } }, normalized) }];

  const placeCharacterBottom = normalized.match(/(?:You may|you may|You can|you can) place (this Character|1 of your Characters(?: other than this Character)?(?: with \d+ base power)?|1 of your Characters?) at the bottom of (?:the owner'?s|your) deck:?$/i);
  if (placeCharacterBottom) {
    if (/this Character/i.test(placeCharacterBottom[1]) && !/other than this Character/i.test(placeCharacterBottom[1])) {
      return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: selfSelector_V2() }];
    }
    const selector = withTextFilters_V2(controllerCharacterSelector_V2(exactly_V2(1)), normalized);
    return [{ type: 'RETURN_CARD_TO_DECK_COST', position: 'BOTTOM', selector: /other than this Character/i.test(placeCharacterBottom[1]) ? { ...selector, relations: [...(selector.relations ?? []), 'EXCLUDE_THIS_CARD'] } : selector }];
  }

  const trashOwnCharacter = normalized.match(/(?:You may|you may|You can|you can) trash (\d+|a|an|one|two|three) of your (?:\{([^}]+)\} type )?(?:red )?Characters?(?: other than this Character)?(?: with (?:\d+|a type including "[^"]+") (?:base )?power(?: or more)?)?:?$/i);
  if (trashOwnCharacter) {
    const selector = withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: exactly_V2(wordNumber_V2(trashOwnCharacter[1])), chooser: 'EFFECT_OWNER', ...(trashOwnCharacter[2] ? { types: { kind: 'HAS_ANY_TYPE', values: [trashOwnCharacter[2]] } as const } : {}) }, normalized);
    return [{ type: 'TRASH_CARD_COST', selector: /other than this Character/i.test(normalized) ? { ...selector, relations: [...(selector.relations ?? []), 'EXCLUDE_THIS_CARD'] } : selector }];
  }

  const trashOwnCharacterTypeIncluding = normalized.match(/(?:You may|you may|You can|you can) trash (\d+|a|an|one|two|three) of your Characters with a type including "([^"]+)":?$/i);
  if (trashOwnCharacterTypeIncluding) return [{ type: 'TRASH_CARD_COST', selector: withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], types: { kind: 'TYPE_INCLUDES_TEXT', values: [trashOwnCharacterTypeIncluding[2]] }, quantity: exactly_V2(wordNumber_V2(trashOwnCharacterTypeIncluding[1])), chooser: 'EFFECT_OWNER' }, normalized) }];

  const trashThisStage = normalized.match(/(?:You may|you may|You can|you can) trash this Stage:?$/i);
  if (trashThisStage) return [{ type: 'TRASH_CARD_COST', selector: selfSelector_V2() }];

  const trashThisCharacterWithCost = normalized.match(/(?:You may|you may|You can|you can) trash this Character with a cost of (\d+) or more:?$/i);
  if (trashThisCharacterWithCost) return [{ type: 'TRASH_CARD_COST', selector: selfSelector_V2() }];

  const koOwnCharacter = normalized.match(/(?:You may|you may|You can|you can) KO (\d+|a|an|one|two|three) of your (?:\{([^}]+)\} type )?Characters?(?: with a type including "[^"]+")?(?: other than this Character)?:?$/i);
  if (koOwnCharacter) {
    const selector = withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['CHARACTER_AREA'], cardCategories: ['CHARACTER'], quantity: exactly_V2(wordNumber_V2(koOwnCharacter[1])), chooser: 'EFFECT_OWNER', ...(koOwnCharacter[2] ? { types: { kind: 'HAS_ANY_TYPE', values: [koOwnCharacter[2]] } as const } : {}) }, normalized);
    return [{ type: 'KO_CARD_COST', selector: /other than this Character/i.test(normalized) ? { ...selector, relations: [...(selector.relations ?? []), 'EXCLUDE_THIS_CARD'] } : selector }];
  }

  const restCharacterCost = normalized.match(/(?:You may|you may|You can|you can) rest (\d+|a|an|one|two|three) of your Characters with a cost of (\d+) or more:?$/i);
  if (restCharacterCost) return [{ type: 'REST_CARD_COST', selector: withTextFilters_V2(controllerCharacterSelector_V2(exactly_V2(wordNumber_V2(restCharacterCost[1]))), normalized) }];

  const restCards = normalized.match(/(?:You may|you may|You can|you can) rest (\d+|a|an|one|two|three|your|this) (?:of your )?(?:\{([^}]+)\} type )?(Leader or Stage cards|Characters|cards|Leader):?$/i);
  if (restCards) {
    const count = /^(?:your|this)$/i.test(restCards[1]) ? 1 : wordNumber_V2(restCards[1]);
    const target = restCards[3].toLowerCase();
    const zones = target.includes('leader or stage') ? ['LEADER_AREA', 'STAGE_AREA'] as const : target.includes('leader') ? ['LEADER_AREA'] as const : target.includes('character') ? ['CHARACTER_AREA'] as const : ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'] as const;
    const categories = target.includes('leader or stage') ? ['LEADER', 'STAGE'] as const : target.includes('leader') ? ['LEADER'] as const : target.includes('character') ? ['CHARACTER'] as const : ['LEADER', 'CHARACTER', 'STAGE'] as const;
    return [{ type: 'REST_CARD_COST', selector: withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: [...zones], cardCategories: [...categories], quantity: exactly_V2(count), chooser: 'EFFECT_OWNER', ...(restCards[2] ? { types: { kind: 'HAS_ANY_TYPE', values: [restCards[2]] } as const } : {}) }, normalized) }];
  }

  const restOwnNamed = normalized.match(/(?:You may|you may|You can|you can) rest (\d+|a|an|one|two|three|your) (?:of your )?\[([^\]]+)\] cards?:?$/i);
  if (restOwnNamed) return [{ type: 'REST_CARD_COST', selector: withTextFilters_V2({ subject: 'CARD', controller: 'PLAYER', zones: ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'], names: [{ kind: 'NAME_EXACT', value: restOwnNamed[2] }], quantity: exactly_V2(/your/i.test(restOwnNamed[1]) ? 1 : wordNumber_V2(restOwnNamed[1])), chooser: 'EFFECT_OWNER' }, normalized) }];

  const restYourLeader = normalized.match(/(?:You may|you may|You can|you can) rest your (\d+|a|an|one|two|three) Leader:?$/i);
  if (restYourLeader) return [{ type: 'REST_CARD_COST', selector: { subject: 'CARD', controller: 'PLAYER', zones: ['LEADER_AREA'], cardCategories: ['LEADER'], quantity: exactly_V2(wordNumber_V2(restYourLeader[1])), chooser: 'EFFECT_OWNER' } }];

  const restLeaderOrStage = normalized.match(/(?:You may|you may|You can|you can) rest your Leader or (\d+|a|an|one|two|three) of your Stage cards:?$/i);
  if (restLeaderOrStage) return [{ type: 'REST_CARD_COST', selector: { subject: 'CARD', controller: 'PLAYER', zones: ['LEADER_AREA', 'STAGE_AREA'], cardCategories: ['LEADER', 'STAGE'], quantity: exactly_V2(1), chooser: 'EFFECT_OWNER' } }];

  const revealHand = normalized.match(/(?:You may|you may|You can|you can) reveal (\d+|a|an|one|two|three) (Events|Character cards? with \d+ power|(?:\{[^}]+\}(?: or )?)+ type cards?|cards? with a type including "([^"]+)") from your hand:?$/i);
  if (revealHand) return [{ type: 'REVEAL_CARD_COST', selector: withTextFilters_V2(handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(revealHand[1]))), normalized) }];

  if (/:\s*$/.test(normalized) && /you may|you can|don!!/.test(lower)) return [{ type: 'RAW_COST', rawText: normalized }];
  return undefined;
}

function unrecognizedAtomRemark_V2(text: string): { kind: string; reason: string; remark: string } {
  const lower = text.toLowerCase();
  if (/^[①②③④⑤⑥⑦⑧⑨⑩âž\w\s]*:$/.test(text) || /don!!\s*[−-]|âˆ’/.test(lower)) {
    return {
      kind: 'activation-cost',
      reason: 'Activation cost or payment text needs to be lifted into activationCost.',
      remark: 'Map this to ActivationCost_V2 payments, then remove the cost clause from resolution atoms.',
    };
  }
  if (/\bif you do\b|\bif you did\b|\bthis way\b/.test(lower)) {
    return {
      kind: 'result-dependent-branch',
      reason: 'Result-dependent branch needs action result binding.',
      remark: 'Use IF_ACTION_SUCCEEDED with a stable actionId from the prior optional/cost action.',
    };
  }
  if (/\bif\b/.test(lower)) {
    return {
      kind: 'condition-gate',
      reason: 'Inline condition needs a canonical ConditionExpression_V2 gate.',
      remark: 'Extract the condition into gates/conditions, then compile the remaining action normally.',
    };
  }
  if (/\blook at\b|\breveal\b|\bplace the rest\b|\badd .* from .*deck\b/.test(lower)) {
    return {
      kind: 'search-or-reveal',
      reason: 'Search/reveal/remainder permutation needs a composed LOOK_AT_CARDS/SELECT_CARD/REVEAL_CARD/MOVE_CARD sequence.',
      remark: 'Represent this as the canonical search permutation: LOOK_AT_CARDS, SELECT_CARD, optional REVEAL_CARD, MOVE_CARD, REORDER_CARDS or MOVE_CARD for the remainder.',
    };
  }
  if (/\bselect\b|\bchoose\b/.test(lower)) {
    return {
      kind: 'selection',
      reason: 'Selection clause needs a Selector_V2 and selectionId.',
      remark: 'Create a SELECT action, then reference SELECTED_BY(selectionId) in later atoms.',
    };
  }
  if (/\bcannot\b|\bcan't\b|\bprevent\b|\bnot activate\b|\bnot be\b/.test(lower)) {
    return {
      kind: 'permission-prevention',
      reason: 'Permission/prevention text needs PREVENT_ACTION or PREVENT_SELECTION.',
      remark: 'Map the forbidden action and cause/duration instead of converting it into the positive action.',
    };
  }
  if (/\binstead\b|\bwould\b/.test(lower)) {
    return {
      kind: 'replacement',
      reason: 'Replacement text needs a REPLACEMENT node/window.',
      remark: 'Model the replaced event pattern and replacement resolution explicitly.',
    };
  }
  if (/\bfor each\b|\bfor every\b/.test(lower)) {
    return {
      kind: 'scaling-or-loop',
      reason: 'Scaling/loop text needs COUNT, MULTIPLY, FOR_EACH, or REPEAT.',
      remark: 'Extract the counted selector/value expression and use it as action value or loop count.',
    };
  }
  if (/\bactivate this card'?s\b|\bactivate .*effect\b/.test(lower)) {
    return {
      kind: 'activate-referenced-effect',
      reason: 'Effect-copy/activate-reference text needs a reference to another effect definition.',
      remark: 'Point this to the referenced Main/Counter effect instead of duplicating raw text.',
    };
  }
  if (/\baccording to the rules\b|under the rules/.test(lower)) {
    return {
      kind: 'rule-modifier',
      reason: 'Rule text needs a Permanent effect with ruleModifier metadata.',
      remark: 'Map this through RuleModifier_V2, often CARD_NAME or DECK_CONSTRUCTION.',
    };
  }
  return {
    kind: 'unclassified',
    reason: 'No conservative V2 atomic recognizer matched this clause.',
    remark: 'Compare against canonicalRegistry_V2 and add a reusable parser permutation or mark as special ruling.',
  };
}

function parseAtomicAction_V2(text: string, options: { allowActivationCost?: boolean } = {}): { action?: Action_V2; costs?: CostAction_V2[]; reason?: string; unrecognizedKind?: string; trackingRemark?: string } {
  const original = collapseSpaces_V2(text);
  const originalLower = original.toLowerCase();
  const normalized = stripLeadingContextClauses_V2(original);
  const lower = normalized.toLowerCase();

  const activationCost = options.allowActivationCost ? parseActivationCost_V2(normalized) : undefined;
  if (activationCost) return { costs: activationCost };

  const keywordTag = KEYWORD_TAGS_V2[normalized];
  if (keywordTag) {
    return { action: { type: 'GRANT_KEYWORD', selector: selfSelector_V2(), keyword: keywordTag, duration: { kind: 'PERMANENT' } } };
  }

  const timingForReplacement = replacementTimingFromText_V2(original);
  const replacementInstead = original.match(/\byou may (.+?) instead(?:\.?\s*(?:\[[^\]]+\]\s*)*)?$/i)
    ?? original.match(/,\s*(.+?) instead(?:\.?\s*(?:\[[^\]]+\]\s*)*)?$/i)
    ?? original.match(/\byou may (.+?) instead of .*being (?:ko'?d|k\.o\.'?d)/i);
  if (timingForReplacement && replacementInstead) {
    const replacementText = collapseSpaces_V2(replacementInstead[1].replace(/\.$/, ''));
    const replacementNode = replacementActionFromText_V2(replacementText);
    if (replacementNode) {
      return {
        action: {
          type: 'CREATE_REPLACEMENT_EFFECT',
          effect: {
            id: 'replacement:generated',
            source: { objectRef: 'GENERATED_EFFECT', owner: 'PLAYER', controller: 'PLAYER', sourceZone: 'NONE' },
            category: 'REPLACEMENT',
            applicationMode: 'CONTINUOUS',
            activationZones: ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'],
            optionality: 'OPTIONAL',
            resolution: replacementNode,
            metadata: { sourceCardNumber: 'GENERATED', effectIndex: 0, printedText: original, authoringStatus: 'PARSED_ONLY' },
            timing: timingForReplacement,
          },
          duration: durationFromText_V2(original),
        },
      };
    }
  }

  const draw = lower.match(/\bdraws?\s+(up to )?(\d+|a|an|one|two|three)\s+cards?\b/);
  if (draw) {
    return { action: { type: 'DRAW_CARD', player: 'PLAYER', count: numberValue_V2(wordNumber_V2(draw[2])) } };
  }

  const drawToHandSize = lower.match(/draw cards so that you have (\d+|a|an|one|two|three) cards? in your hand/);
  if (drawToHandSize) {
    return {
      action: {
        type: 'DRAW_CARD',
        player: 'PLAYER',
        count: {
          kind: 'SUBTRACT',
          left: numberValue_V2(wordNumber_V2(drawToHandSize[1])),
          right: { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], quantity: { kind: 'ANY_NUMBER' } } },
        },
      },
    };
  }

  if (/don!! card placed during your don!! phase is given to your leader/.test(lower)) {
    return {
      action: {
        type: 'GIVE_DON',
        donSelector: {
          subject: 'DON',
          owner: 'PLAYER',
          relations: ['PLACED_DURING_DON_PHASE'],
          quantity: exactly_V2(1),
          chooser: 'EFFECT_OWNER',
        },
        target: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA'],
          cardCategories: ['LEADER'],
          quantity: exactly_V2(1),
          chooser: 'EFFECT_OWNER',
        },
      },
    };
  }

  if (/draw cards equal to the number you returned to your deck/.test(lower)) {
    return { action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'PREVIOUS_RESULT', resultId: 'returned-to-deck-count' } } };
  }

  if (/draw cards equal to the number of cards trashed/.test(lower)) {
    return { action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'PREVIOUS_RESULT', resultId: 'trashed-card-count' } } };
  }

  const setPower = normalized.match(/\b(?:set the (?:base )?power of .* to|base power becomes?|power becomes?)\s+(\d{1,6})\b/i);
  if (setPower) {
    return {
      action: {
        type: 'MODIFY_POWER',
        selector: selectorFromText_V2(normalized),
        propertyLayer: /base power/i.test(normalized) ? 'BASE_VALUE' : 'CURRENT_VALUE',
        operation: 'SET',
        value: numberValue_V2(Number(setPower[1])),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  if (/\bbase power becomes the same\b|\bbecomes the same power\b/.test(lower)) {
    const sourceSelector = /\bselected Character'?s power\b/i.test(normalized)
      ? { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1) } as Selector_V2
      : /\bopponent'?s attacking Leader or Character\b/i.test(normalized)
        ? ({ ...leaderOrCharacterSelector_V2('OPPONENT', exactly_V2(1)), states: ['ATTACKING'] } as Selector_V2)
        : { subject: 'ACTION_RESULT', relations: ['REFERENCED_BY_TEXT'], quantity: exactly_V2(1) } as Selector_V2;
    return {
      action: {
        type: 'MODIFY_POWER',
        selector: selectorFromText_V2(normalized),
        propertyLayer: /base power/.test(lower) ? 'BASE_VALUE' : 'CURRENT_VALUE',
        operation: 'COPY',
        value: { kind: 'PROPERTY_VALUE', selector: sourceSelector, property: 'POWER', propertyLayer: /base power/.test(lower) ? 'BASE' : 'CURRENT' },
        duration: durationFromText_V2(normalized),
      },
    };
  }

  if (/\bswap the base power of the selected (?:characters|cards) with each other\b/.test(lower)) {
    return {
      action: {
        type: 'SWAP_POWER',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: { kind: 'ALL' } },
        propertyLayer: 'BASE_VALUE',
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const power = normalized.match(/([+\-−]|âˆ’)\s?(\d{1,5})\s*power\b/i);
  if (power) {
    return {
      action: {
        type: 'MODIFY_POWER',
        selector: selectorFromText_V2(normalized),
        propertyLayer: 'CURRENT_VALUE',
        operation: power[1] === '+' ? 'ADD' : 'SUBTRACT',
        value: scaledValueFromText_V2(normalized, Number(power[2])),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const cost = normalized.match(/([+\-−]|âˆ’)\s?(\d+)\s*cost\b/i);
  if (cost) {
    return {
      action: {
        type: 'MODIFY_COST',
        selector: selectorFromText_V2(normalized),
        propertyLayer: 'CURRENT_VALUE',
        operation: cost[1] === '+' ? 'ADD' : 'SUBTRACT',
        value: scaledValueFromText_V2(normalized, Number(cost[2])),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const largePower = normalized.match(/[+]\s?(\d{6})\s*power\b/i);
  if (largePower) {
    return {
      action: {
        type: 'MODIFY_POWER',
        selector: selectorFromText_V2(normalized),
        propertyLayer: 'CURRENT_VALUE',
        operation: 'ADD',
        value: numberValue_V2(Number(largePower[1])),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const costDash = normalized.match(/[–−-]\s?(\d+)\s*cost\b/i);
  if (costDash) {
    return {
      action: {
        type: 'MODIFY_COST',
        selector: selectorFromText_V2(normalized),
        propertyLayer: 'CURRENT_VALUE',
        operation: 'SUBTRACT',
        value: scaledValueFromText_V2(normalized, Number(costDash[1])),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const setCost = normalized.match(/\bset the cost of .* to (\d+)\b/i);
  if (setCost) {
    return {
      action: {
        type: 'MODIFY_COST',
        selector: selectorFromText_V2(normalized),
        propertyLayer: 'CURRENT_VALUE',
        operation: 'SET',
        value: numberValue_V2(Number(setCost[1])),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const playCostReduction = normalized.match(/\b(?:the next time you play|the cost of playing).*from your hand.*(?:cost )?(?:will be )?reduced by (\d+)\b/i);
  if (playCostReduction) {
    return {
      action: {
        type: 'MODIFY_PLAY_PERMISSION',
        selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], quantity: { kind: 'ANY_NUMBER' } }, normalized),
        action: `REDUCE_PLAY_COST_BY_${playCostReduction[1]}`,
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const counterSet = normalized.match(/\bcounter of .* becomes \+?(\d+)\b/i);
  if (counterSet) {
    return {
      action: {
        type: 'MODIFY_COUNTER',
        selector: selectorFromText_V2(normalized),
        propertyLayer: 'CURRENT_VALUE',
        operation: 'SET',
        value: numberValue_V2(Number(counterSet[1])),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const counterAdd = normalized.match(/\bhave a \+?(\d+) counter\b|\bgain \+?(\d+) counter\b/i);
  if (counterAdd) {
    const selector = selectorFromText_V2(normalized);
    return {
      action: {
        type: 'MODIFY_COUNTER',
        selector: /\bwithout a Counter\b/i.test(normalized)
          ? { ...selector, counter: { propertyLayer: 'BASE', comparison: 'EQUAL', value: numberValue_V2(0) } }
          : selector,
        propertyLayer: 'CURRENT_VALUE',
        operation: 'ADD',
        value: numberValue_V2(Number(counterAdd[1] ?? counterAdd[2])),
        duration: /according to the rules/i.test(normalized) ? { kind: 'PERMANENT' } : durationFromText_V2(normalized),
      },
    };
  }

  const keyword = normalized.match(/\bgains?\s*\[(Rush: Character|Rush|Blocker|Double Attack|Banish|Unblockable)\]/i);
  if (keyword) {
    return {
      action: {
        type: 'GRANT_KEYWORD',
        selector: selectorFromText_V2(normalized),
        keyword: normalizeKeyword_V2(keyword[1]),
        duration: durationFromText_V2(normalized),
      },
    };
  }

  if (/^activate this card'?s(?: \[(?:main|counter|trigger|on play|on k\.?o\.?)\])? effect\.?$/i.test(normalized) || /^activate this card'?s$/i.test(normalized) || /^effect\.?$/i.test(normalized)) {
    return {
      action: {
        type: 'ACTIVATE_EVENT',
        selector: selfSelector_V2(),
        player: 'PLAYER',
      },
    };
  }

  if (/\bactivate (?:the \[(?:main|counter|trigger|on play)\] effect of )?up to \d+ .*event(?: card)?(?: .*?)? (?:from|in) your (?:hand|trash)\b/i.test(normalized)) {
    return {
      action: {
        type: 'ACTIVATE_EVENT',
        selector: withTextFilters_V2({
          subject: 'CARD',
          owner: 'PLAYER',
          zones: /(?:from|in) your trash/i.test(normalized) ? ['TRASH'] : ['HAND'],
          cardCategories: ['EVENT'],
          quantity: upTo_V2(countFromText_V2(normalized)),
          chooser: 'EFFECT_OWNER',
        }, normalized),
        player: 'PLAYER',
      },
    };
  }

  if (/\[on play\] effects? (?:is|are) negated\b/i.test(normalized)) {
    return {
      action: {
        type: 'INVALIDATE_EFFECTS',
        selector: effectSelectorFromText_V2(normalized),
        effectFilter: { kind: 'MATCHING_EFFECT', timing: 'ON_PLAY', rawText: '[On Play]' },
        duration: durationFromText_V2(normalized).kind === 'INSTANT' ? { kind: 'WHILE_SOURCE_VALID' } : durationFromText_V2(normalized),
      },
    };
  }

  if (/\bnegate the effects? of\b|\beffects? (?:is|are) negated\b|\bhave their effects? negated\b/.test(lower)) {
    return {
      action: {
        type: 'INVALIDATE_EFFECTS',
        selector: selectorFromText_V2(normalized),
        effectFilter: 'ALL_EFFECTS',
        duration: durationFromText_V2(normalized),
      },
    };
  }

  const ko = lower.match(/\bko\b.*?(up to (\d+))?/);
  if (ko && /\bko\b/.test(lower)) {
    if (/\b(cannot|can't|not)\b.{0,40}\bko\b|\bko'?d\b/i.test(lower) && /\b(cannot|can't|not)\b/i.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ACTION',
          selector: selectorFromText_V2(normalized),
          action: 'KO_CARD',
          causeFilter: /\bbattle\b/.test(lower) ? 'BATTLE' : /\beffects?\b/.test(lower) ? 'EFFECT' : 'ANY',
          ...(preventionSourceSelectorFromText_V2(normalized) ? { sourceSelector: preventionSourceSelectorFromText_V2(normalized) } : {}),
          duration: durationFromText_V2(normalized),
        },
      };
    }
    return { action: { type: 'KO_CARD', selector: selectorFromText_V2(normalized), cause: 'EFFECT' } };
  }

  if (/\bcan also attack .*active characters\b|\bcan attack characters on the turn in which (?:it is|they are) played\b/.test(lower)) {
    return {
      action: {
        type: 'ALLOW_ACTION',
        selector: selectorFromText_V2(normalized),
        action: /turn in which (?:it is|they are) played/.test(lower) ? 'ATTACK_CHARACTER_ON_PLAY_TURN' : 'ATTACK_ACTIVE_CHARACTER',
        duration: durationFromText_V2(normalized),
      },
    };
  }

  if (/\bcannot\b|\bcan't\b|\bwill not\b|\bdo not\b/.test(lower)) {
    if (/\badd life cards? to your hand\b/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ZONE_CHANGE',
          selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } },
          action: 'ADD_LIFE_TO_HAND_BY_OWN_EFFECT',
          ...(preventionSourceSelectorFromText_V2(normalized) ? { sourceSelector: preventionSourceSelectorFromText_V2(normalized) } : {}),
          duration: durationFromText_V2(normalized),
        },
      };
    }
    if (/\bdraw cards?\b/.test(lower) && /\bown effects?\b/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ACTION',
          selector: { subject: 'PLAYER', owner: 'PLAYER' },
          action: 'DRAW_CARD',
          causeFilter: 'OWN_EFFECT',
          duration: durationFromText_V2(normalized),
        },
      };
    }
    if (/\bremoved from the field\b/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ZONE_CHANGE',
          selector: selectorFromText_V2(normalized),
          action: 'REMOVE_FROM_FIELD',
          ...(preventionSourceSelectorFromText_V2(normalized) ? { sourceSelector: preventionSourceSelectorFromText_V2(normalized) } : {}),
          duration: durationFromText_V2(normalized),
        },
      };
    }
    if (/\bactivate\b.*\[blocker\]|\[blocker\].*\bactivate\b/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ACTION',
          selector: selectorFromText_V2(normalized),
          action: 'ACTIVATE_BLOCKER',
          duration: durationFromText_V2(normalized),
        },
      };
    }
    if (/\battack\b/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ACTION',
          selector: selectorFromText_V2(normalized),
          action: 'DECLARE_ATTACK',
          duration: durationFromText_V2(normalized),
        },
      };
    }
    if (/\bbecome active|set .*active|set as active/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ACTION',
          selector: selectorFromText_V2(normalized),
          action: 'SET_CARD_ACTIVE',
          causeFilter: /refresh phase/.test(lower) ? 'REFRESH_PHASE' : 'ANY',
          duration: /next refresh phase/.test(lower) ? { kind: 'UNTIL_NEXT_REFRESH_PHASE', player: ownerFromText_V2(normalized) } : durationFromText_V2(normalized),
        },
      };
    }
    if (/\bbe rested|\brested\b|\brest\b/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ACTION',
          selector: selectorFromText_V2(normalized),
          action: 'REST_CARD',
          ...(preventionSourceSelectorFromText_V2(normalized) ? { sourceSelector: preventionSourceSelectorFromText_V2(normalized) } : {}),
          duration: durationFromText_V2(normalized),
        },
      };
    }
    if (/\bplay\b|\bplayed\b/.test(lower)) {
      return {
        action: {
          type: 'PREVENT_ACTION',
          selector: selectorFromText_V2(normalized),
          action: 'PLAY_CARD',
          ...(preventionSourceSelectorFromText_V2(normalized) ? { sourceSelector: preventionSourceSelectorFromText_V2(normalized) } : {}),
          duration: durationFromText_V2(normalized),
        },
      };
    }
  }

  if (/\bopponent rests? \d+ of their active don!! cards?/.test(lower)) {
    if (/at the start of their next main phase/.test(lower)) {
      const restAction: Action_V2 = {
        type: 'REST_DON',
        selector: { subject: 'DON', owner: 'OPPONENT', zones: ['COST_AREA'], states: ['ACTIVE'], quantity: exactly_V2(countFromText_V2(normalized)), chooser: 'OPPONENT' },
      };
      return {
        action: {
          type: 'CREATE_DELAYED_EFFECT',
          effect: {
            ...generatedEffectDefinition_V2('delayed:opponent-rest-active-don-next-main', restAction, original),
            timing: { kind: 'CUSTOM_EVENT', eventType: 'PHASE_STARTED', actor: 'OPPONENT', conditions: { kind: 'PREDICATE', left: { kind: 'PHASE' }, operator: 'EQUAL', right: { kind: 'STRING', value: 'MAIN_PHASE' } } },
          },
          duration: { kind: 'UNTIL_END_OF_NEXT_TURN', player: 'OPPONENT' },
        },
      };
    }
    return {
      action: {
        type: 'REST_DON',
        selector: { subject: 'DON', owner: 'OPPONENT', zones: ['COST_AREA'], states: ['ACTIVE'], quantity: exactly_V2(countFromText_V2(normalized)), chooser: 'OPPONENT' },
      },
    };
  }

  const restCharacterWithDonGiven = lower.match(/rest up to (?:a total of )?(\d+|a|an|one|two|three) of your opponent'?s characters? (?:that has|with) (?:(\d+|a|an|one|two|three)(?: or more)? )?don!! cards? given/);
  if (restCharacterWithDonGiven) {
    const attachedDonCount = restCharacterWithDonGiven[2] ? wordNumber_V2(restCharacterWithDonGiven[2]) : 1;
    return {
      action: {
        type: 'REST_CARD',
        selector: {
          ...opponentCharacterSelector_V2(upTo_V2(wordNumber_V2(restCharacterWithDonGiven[1]))),
          relations: [`HAS_ATTACHED_DON_AT_LEAST_${attachedDonCount}`],
        },
      },
    };
  }

  const restOpponentDon = lower.match(/rest up to (?:a total of )?(\d+|a|an|one|two|three) of your opponent'?s .*don!! cards?/);
  if (restOpponentDon) {
    return {
      action: {
        type: 'REST_DON',
        selector: { subject: 'DON', owner: 'OPPONENT', zones: ['COST_AREA'], quantity: upTo_V2(wordNumber_V2(restOpponentDon[1])), chooser: 'EFFECT_OWNER' },
      },
    };
  }

  const restOwnDon = lower.match(/(?:you may )?rest (any number|\d+|a|an|one|two|three) of your (?:active )?don!! cards?/);
  if (restOwnDon) {
    return {
      action: {
        type: 'REST_DON',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          quantity: restOwnDon[1] === 'any number' ? { kind: 'ANY_NUMBER' } : exactly_V2(wordNumber_V2(restOwnDon[1])),
          chooser: 'EFFECT_OWNER',
        },
      },
    };
  }

  const addDonSetActiveEarly = lower.match(/add (up to )?(\d+) don!! cards? from your don!! deck and set (?:it|them) as active/);
  if (addDonSetActiveEarly) {
    return {
      action: {
        type: 'ADD_DON_FROM_DON_DECK',
        player: 'PLAYER',
        count: numberValue_V2(Number(addDonSetActiveEarly[2])),
        destination: 'COST_AREA',
        state: 'ACTIVE',
      },
    };
  }

  const opponentAddDonSetActiveEarly = lower.match(/your opponent may add (up to )?(\d+) don!! cards? from their don!! deck and set (?:it|them) as active/);
  if (opponentAddDonSetActiveEarly) {
    return {
      action: {
        type: 'ADD_DON_FROM_DON_DECK',
        player: 'OPPONENT',
        count: numberValue_V2(Number(opponentAddDonSetActiveEarly[2])),
        destination: 'COST_AREA',
        state: 'ACTIVE',
      },
    };
  }

  if (/\brest\b/.test(lower) && !/\bthe rest\b/.test(lower) && !/don!!/.test(lower)) {
    return { action: { type: 'REST_CARD', selector: selectorFromText_V2(normalized) } };
  }

  const characterOrDonActive = lower.match(/set this character or up to (\d+|a|an|one|two|three) of your don!! cards? as active/);
  if (characterOrDonActive) {
    return {
      action: {
        type: 'PLAYER_CHOOSES',
        options: [
          actionNode_V2({ type: 'SET_CARD_ACTIVE', selector: selfSelector_V2() }),
          actionNode_V2({
            type: 'SET_DON_ACTIVE',
            selector: {
              subject: 'DON',
              owner: 'PLAYER',
              zones: ['COST_AREA'],
              quantity: upTo_V2(wordNumber_V2(characterOrDonActive[1])),
              chooser: 'EFFECT_OWNER',
            },
          }),
        ],
        minimumChoices: 1,
        maximumChoices: 1,
      },
    };
  }

  const setDonActive = lower.match(/(?:set )?(up to )?(\d+|a|an|one|two|three|all) of your don!! cards? (?:as )?active/);
  if (setDonActive) {
    return {
      action: {
        type: 'SET_DON_ACTIVE',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          quantity: setDonActive[2] === 'all'
            ? { kind: 'ALL' }
            : setDonActive[1] ? upTo_V2(wordNumber_V2(setDonActive[2])) : exactly_V2(wordNumber_V2(setDonActive[2])),
          chooser: 'EFFECT_OWNER',
        },
      },
    };
  }

  if (/\bset\b.+\bactive\b|\bas active\b/.test(lower)) {
    return { action: { type: 'SET_CARD_ACTIVE', selector: selectorFromText_V2(normalized) } };
  }

  if (/\bselect up to \d+|\bselect \d+|\bselect your leader|\bselect your opponent|\bselect all\b|\bchoose up to \d+|\bchoose \d+|\bchooses \d+/.test(lower)) {
    return {
      action: {
        type: 'SELECT',
        selector: selectorFromText_V2(normalized),
        selectionId: 'selected',
      },
    };
  }

  if (/\bchange the attack target to the selected\b/.test(lower)) {
    return {
      action: {
        type: 'CHANGE_ATTACK_TARGET',
        newTarget: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1) },
      },
    };
  }

  if (/\bchange the target of that attack to\b/.test(lower)) {
    return {
      action: {
        type: 'CHANGE_ATTACK_TARGET',
        newTarget: selectorFromText_V2(normalized),
      },
    };
  }

  if (/\bturn .*life cards? face-up\b/.test(lower)) {
    return {
      action: {
        type: 'TURN_LIFE_FACE_UP',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: exactly_V2(countFromText_V2(normalized)), ordering: 'DECK_ORDER' },
      },
    };
  }

  if (/\bturn .*life cards? face-down\b/.test(lower)) {
    return {
      action: {
        type: 'TURN_LIFE_FACE_DOWN',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: /all/.test(lower) ? { kind: 'ALL' } : exactly_V2(countFromText_V2(normalized)), ordering: 'DECK_ORDER' },
      },
    };
  }

  if (/\bunder the rules of this game\b.*any number of this card in your deck\b/.test(lower)) {
    return {
      action: {
        type: 'MODIFY_DECK_CONSTRUCTION',
        modifier: {
          scope: 'DECK_CONSTRUCTION',
          validFrom: 'DECK_REGISTRATION',
          modifier: { type: 'RULE_MODIFIER', scope: 'DECK_CONSTRUCTION', expression: { rule: 'ANY_NUMBER_OF_THIS_CARD' } },
        },
      },
    };
  }

  const deckConstructionCostLimit = normalized.match(/\bunder the rules of this game\b.*cannot include cards with a cost of (\d+) or more in your deck/i);
  if (deckConstructionCostLimit) {
    return {
      action: {
        type: 'MODIFY_DECK_CONSTRUCTION',
        modifier: {
          scope: 'DECK_CONSTRUCTION',
          validFrom: 'DECK_REGISTRATION',
          modifier: { type: 'RULE_MODIFIER', scope: 'DECK_CONSTRUCTION', expression: { rule: 'CANNOT_INCLUDE_COST_OR_MORE', cost: Number(deckConstructionCostLimit[1]) } },
        },
      },
    };
  }

  const deckConstructionEventCostLimit = normalized.match(/\bunder the rules of this game\b.*cannot include Events with a cost of (\d+) or more in your deck/i);
  if (deckConstructionEventCostLimit) {
    return {
      action: {
        type: 'MODIFY_DECK_CONSTRUCTION',
        modifier: {
          scope: 'DECK_CONSTRUCTION',
          validFrom: 'DECK_REGISTRATION',
          modifier: {
            type: 'RULE_MODIFIER',
            scope: 'DECK_CONSTRUCTION',
            expression: {
              rule: 'CANNOT_INCLUDE_CATEGORY_COST_OR_MORE',
              cardCategory: 'EVENT',
              cost: Number(deckConstructionEventCostLimit[1]),
            },
          },
        },
      },
    };
  }

  const gameStartPlayStageFromDeck = normalized.match(/\bat the start of the game,\s*play up to (\d+|a|an|one|two|three) \{([^}]+)\} type Stage cards? from your deck/i);
  if (gameStartPlayStageFromDeck) {
    return {
      action: {
        type: 'MODIFY_STARTING_SETUP',
        modifier: {
          scope: 'GAME_SETUP',
          validFrom: 'GAME_START',
          modifier: {
            type: 'RULE_MODIFIER',
            scope: 'GAME_SETUP',
            expression: {
              operation: 'PLAY_FROM_DECK_AT_GAME_START',
              selector: {
                subject: 'CARD',
                owner: 'PLAYER',
                zones: ['DECK'],
                cardCategories: ['STAGE'],
                types: { kind: 'HAS_ANY_TYPE', values: [gameStartPlayStageFromDeck[2]] },
                quantity: upTo_V2(wordNumber_V2(gameStartPlayStageFromDeck[1])),
                chooser: 'EFFECT_OWNER',
              },
              destination: { zone: 'STAGE_AREA', owner: 'PLAYER' },
            },
          },
        },
      },
    };
  }

  const donDeckSize = normalized.match(/\bunder the rules of this game\b.*DON!! deck consists of (\d+) cards/i);
  if (donDeckSize) {
    return {
      action: {
        type: 'MODIFY_STARTING_SETUP',
        modifier: {
          scope: 'DON_DECK_SIZE',
          validFrom: 'DECK_REGISTRATION',
          modifier: { type: 'RULE_MODIFIER', scope: 'DON_DECK_SIZE', expression: { size: Number(donDeckSize[1]) } },
        },
      },
    };
  }

  if (/\bunder the rules of this game\b.*do not lose when your deck has 0 cards/.test(lower)) {
    return {
      action: {
        type: 'MODIFY_DEFEAT_CONDITION',
        modifier: {
          scope: 'DEFEAT_CONDITION',
          validFrom: 'ALWAYS',
          modifier: { type: 'RULE_MODIFIER', scope: 'DEFEAT_CONDITION', expression: { rule: 'DO_NOT_LOSE_ON_EMPTY_DECK' } },
        },
      },
    };
  }

  if (/your character cards are played rested/.test(lower)) {
    return {
      action: {
        type: 'MODIFY_PLAY_PERMISSION',
        selector: { subject: 'CARD', owner: 'PLAYER', cardCategories: ['CHARACTER'], quantity: { kind: 'ANY_NUMBER' } },
        action: 'ENTER_PLAY_RESTED',
        duration: { kind: 'PERMANENT' },
      },
    };
  }

  if (/face-up life cards are placed at the bottom of your deck instead of being added to your hand/.test(lower)) {
    return {
      action: {
        type: 'CREATE_REPLACEMENT_EFFECT',
        duration: { kind: 'PERMANENT' },
        effect: {
          id: 'replacement:face-up-life-to-deck-bottom',
          source: { objectRef: 'GENERATED_EFFECT', owner: 'PLAYER', controller: 'PLAYER', sourceZone: 'NONE' },
          category: 'REPLACEMENT',
          applicationMode: 'CONTINUOUS',
          activationZones: ['LEADER_AREA'],
          optionality: 'MANDATORY',
          resolution: {
            kind: 'ACTION',
            action: {
              type: 'MOVE_CARD',
              selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], relations: ['FACE_UP'], quantity: { kind: 'ANY_NUMBER' } },
              to: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
              cause: 'RULE',
            },
          },
          metadata: { sourceCardNumber: 'GENERATED', effectIndex: 0, printedText: normalized, authoringStatus: 'PARSED_ONLY' },
        },
      },
    };
  }

  if (/\blose at the end of the turn in which your deck becomes 0 cards/.test(lower)) {
    return {
      action: {
        type: 'MODIFY_DEFEAT_CONDITION',
        modifier: {
          scope: 'DEFEAT_CONDITION',
          validFrom: 'ALWAYS',
          modifier: { type: 'RULE_MODIFIER', scope: 'DEFEAT_CONDITION', expression: { rule: 'LOSE_AT_END_OF_TURN_AFTER_EMPTY_DECK' } },
        },
      },
    };
  }

  const additionalNames = bracketCardNamesFromText_V2(normalized);
  if (/also treat this card'?s name as/i.test(normalized) && additionalNames.length > 0) {
    return {
      action: {
        type: 'MODIFY_RULE_PERMISSION',
        modifier: {
          scope: 'CARD_NAME',
          validFrom: 'ALWAYS',
          modifier: { type: 'RULE_MODIFIER', scope: 'CARD_NAME', expression: { operation: 'TREAT_AS_ADDITIONAL_NAME', names: additionalNames } },
        },
      },
    };
  }

  const addDon = lower.match(/add (up to )?(\d+) don!! cards? from your don!! deck/);
  if (addDon) {
    return {
      action: {
        type: 'ADD_DON_FROM_DON_DECK',
        player: 'PLAYER',
        count: numberValue_V2(Number(addDon[2])),
        destination: 'COST_AREA',
        state: /rested|rest it|rest them/.test(lower) ? 'RESTED' : 'ACTIVE',
      },
    };
  }

  const addAdditionalRestedDon = lower.match(/add up to (\d+) additional don!! cards? and rest (?:it|them)/);
  if (addAdditionalRestedDon) {
    return {
      action: {
        type: 'ADD_DON_FROM_DON_DECK',
        player: 'PLAYER',
        count: numberValue_V2(Number(addAdditionalRestedDon[1])),
        destination: 'COST_AREA',
        state: 'RESTED',
      },
    };
  }

  const koTrashInstead = originalLower.match(/if .*would be ko'?d(?: in battle| by .*effects?)?.*you may trash (\d+|a|an|one|two|three) cards? from your hand instead/);
  if (koTrashInstead) {
    const targetSelector = selectorFromText_V2(original);
    const replacementAction: Action_V2 = {
      type: 'TRASH_CARD',
      selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(koTrashInstead[1]))),
      cause: 'EFFECT',
    };
    return {
      action: {
        type: 'CREATE_REPLACEMENT_EFFECT',
        effect: {
          ...generatedEffectDefinition_V2('replacement:ko-trash-hand-instead', replacementAction, original, 'REPLACEMENT'),
          timing: {
            kind: 'CUSTOM_EVENT',
            eventType: 'CARD_WOULD_BE_KO',
            subject: targetSelector,
            conditions: /in battle/.test(originalLower)
              ? {
                  kind: 'PREDICATE',
                  left: { kind: 'KO_CAUSE' },
                  operator: 'EQUAL',
                  right: { kind: 'STRING', value: 'BATTLE' },
                }
              : /effects?/.test(originalLower)
                ? {
                    kind: 'PREDICATE',
                    left: { kind: 'KO_CAUSE' },
                    operator: 'EQUAL',
                    right: { kind: 'STRING', value: 'EFFECT' },
                  }
                : undefined,
          },
          optionality: 'OPTIONAL',
        },
        duration: durationFromText_V2(original),
      },
    };
  }

  const trashTypedHand = lower.match(/trash (\d+|a|an|one|two|three) (?:character card|event card|event|card)(?: .*?)? from your hand/);
  if (trashTypedHand) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: withTextFilters_V2(handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(trashTypedHand[1]))), normalized),
        cause: 'EFFECT',
      },
    };
  }

  const trashHand = lower.match(/trash (\d+|a|an|one|two|three) cards? from your hand/);
  if (trashHand) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(trashHand[1]))),
        cause: 'EFFECT',
      },
    };
  }

  if (/trash the same number of cards from your hand/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['HAND'],
          quantity: { kind: 'EXACTLY', value: { kind: 'PREVIOUS_RESULT', resultId: 'same-number' } },
          chooser: 'EFFECT_OWNER',
        },
        cause: 'EFFECT',
      },
    };
  }

  if (/trash this (character|stage|card)(?: at the end of this turn)?/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: selfSelector_V2(),
        cause: 'EFFECT',
      },
    };
  }

  const trashOwnTypedCharacter = lower.match(/trash (\d+|a|an|one|two|three) of your .*type characters?/);
  if (trashOwnTypedCharacter) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: withTextFilters_V2(controllerCharacterSelector_V2(exactly_V2(wordNumber_V2(trashOwnTypedCharacter[1]))), normalized),
        cause: 'EFFECT',
      },
    };
  }

  const trashHandUpTo = lower.match(/trash up to (\d+|a|an|one|two|three) cards? from your hand/);
  if (trashHandUpTo) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: handSelector_V2('PLAYER', upTo_V2(wordNumber_V2(trashHandUpTo[1]))),
        cause: 'EFFECT',
      },
    };
  }

  if (/trash all cards from your hand/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: handSelector_V2('PLAYER', { kind: 'ALL' }),
        cause: 'EFFECT',
      },
    };
  }

  if (/trash all of your characters/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: controllerCharacterSelector_V2({ kind: 'ALL' }),
        cause: 'EFFECT',
      },
    };
  }

  const trashHandUntil = lower.match(/trash cards? from your hand until you have (\d+|a|an|one|two|three) cards? in your hand/);
  if (trashHandUntil) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['HAND'],
          quantity: {
            kind: 'EXACTLY',
            value: {
              kind: 'SUBTRACT',
              left: { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['HAND'], quantity: { kind: 'ANY_NUMBER' } } },
              right: numberValue_V2(wordNumber_V2(trashHandUntil[1])),
            },
          },
          chooser: 'EFFECT_OWNER',
        },
        cause: 'EFFECT',
      },
    };
  }

  const bothTrashHandUntil = lower.match(/you and your opponent trash cards? from your hands until you each have (\d+|a|an|one|two|three) cards? in your hands/);
  if (bothTrashHandUntil) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: {
          subject: 'CARD',
          owner: 'ANY',
          zones: ['HAND'],
          quantity: {
            kind: 'EXACTLY',
            value: { kind: 'PREVIOUS_RESULT', resultId: `until-each-player-has-${wordNumber_V2(bothTrashHandUntil[1])}-cards-in-hand` },
          },
          chooser: 'CARD_OWNER',
        },
        cause: 'EFFECT',
      },
    };
  }

  const trashOpponentCharacter = lower.match(/trash up to (\d+|a|an|one|two|three) of your opponent'?s characters?/);
  if (trashOpponentCharacter) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: opponentCharacterSelector_V2(upTo_V2(wordNumber_V2(trashOpponentCharacter[1]))),
        cause: 'EFFECT',
      },
    };
  }

  if (/\btrash that card\b/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1) },
        cause: 'EFFECT',
      },
    };
  }

  if (/\btrash the rest\b/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'], quantity: { kind: 'ANY_NUMBER' } },
        cause: 'EFFECT',
      },
    };
  }

  const trashTypedHandCost = lower.match(/(?:you may|you can) trash (\d+|a|an|one|two|three) .* from your hand:?/);
  if (trashTypedHandCost) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(trashTypedHandCost[1]))),
        cause: 'COST',
      },
    };
  }

  const opponentTrashHand = lower.match(/(?:opponent trashes?|trash) (\d+|a|an|one|two|three) cards? from (?:your opponent'?s|their) hand/);
  if (opponentTrashHand) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: handSelector_V2('OPPONENT', exactly_V2(wordNumber_V2(opponentTrashHand[1]))),
        cause: 'EFFECT',
      },
    };
  }

  const trashDeckTop = lower.match(/trash (up to )?(\d+|a|an|one|two|three) cards? from the top of your deck/);
  if (trashDeckTop) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: trashDeckTop[1] ? upTo_V2(wordNumber_V2(trashDeckTop[2])) : exactly_V2(wordNumber_V2(trashDeckTop[2])), ordering: 'DECK_ORDER' },
        cause: 'EFFECT',
      },
    };
  }

  if (/trash the same number of cards from the top of your deck/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['DECK'],
          quantity: { kind: 'EXACTLY', value: { kind: 'PREVIOUS_RESULT', resultId: 'same-number' } },
          ordering: 'DECK_ORDER',
        },
        cause: 'EFFECT',
      },
    };
  }

  const trashLifeTop = lower.match(/trash (up to )?(\d+|a|an|one|two|three) cards? from the top of (your opponent'?s|your|their) life/);
  if (trashLifeTop) {
    const owner = trashLifeTop[3].includes('opponent') || trashLifeTop[3].includes('their') ? 'OPPONENT' : 'PLAYER';
    return {
      action: {
        type: 'TRASH_LIFE',
        player: owner,
        position: 'TOP',
        count: numberValue_V2(wordNumber_V2(trashLifeTop[2])),
        activateTrigger: false,
      },
    };
  }

  const trashAnyLife = lower.match(/trash (up to )?(\d+|a|an|one|two|three) of your opponent'?s life cards?/);
  if (trashAnyLife) {
    return {
      action: {
        type: 'TRASH_LIFE',
        player: 'OPPONENT',
        position: 'TOP',
        count: numberValue_V2(wordNumber_V2(trashAnyLife[2])),
        activateTrigger: false,
      },
    };
  }

  const trashLifeTopOrBottom = lower.match(/trash (up to )?(\d+|a|an|one|two|three) cards? from the top or bottom of your life cards?/);
  if (trashLifeTopOrBottom) {
    return {
      action: {
        type: 'TRASH_LIFE',
        player: 'PLAYER',
        position: 'TOP',
        count: numberValue_V2(wordNumber_V2(trashLifeTopOrBottom[2])),
        activateTrigger: false,
      },
    };
  }

  if (/trash 1 card from the top of each of your and your opponent'?s life cards/.test(lower)) {
    return {
      action: {
        type: 'TRASH_LIFE',
        player: 'ANY',
        position: 'TOP',
        count: numberValue_V2(1),
        activateTrigger: false,
      },
    };
  }

  const trashLifeUntil = lower.match(/trash cards? from the top of your life cards? until you have (\d+|a|an|one|two|three) life card/);
  if (trashLifeUntil) {
    return {
      action: {
        type: 'TRASH_LIFE',
        player: 'PLAYER',
        position: 'TOP',
        count: {
          kind: 'SUBTRACT',
          left: { kind: 'COUNT', selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } } },
          right: numberValue_V2(wordNumber_V2(trashLifeUntil[1])),
        },
        activateTrigger: false,
      },
    };
  }

  if (/trash all your face-up life cards?/.test(lower)) {
    return {
      action: {
        type: 'TRASH_CARD',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'ALL' }, relations: ['FACE_UP'] },
        cause: 'EFFECT',
      },
    };
  }

  const returnDon = lower.match(/your opponent (may )?returns? (\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)(?: of their (active))? don!! cards? (?:from their field )?to their don!! deck/);
  if (returnDon) {
    const count = wordNumber_V2(returnDon[2]);
    return {
      action: {
        type: 'RETURN_DON_TO_DON_DECK',
        selector: {
          subject: 'DON',
          owner: 'OPPONENT',
          zones: ['COST_AREA', 'ATTACHED_DON'],
          ...(returnDon[3] ? { states: ['ACTIVE'] as const } : {}),
          quantity: returnDon[1] ? upTo_V2(count) : exactly_V2(count),
          chooser: 'OPPONENT',
        },
      },
    };
  }

  const playerReturnDon = lower.match(/(?:you may )?return (\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten) don!! cards? from your field to your don!! deck/);
  if (playerReturnDon) {
    return {
      action: {
        type: 'RETURN_DON_TO_DON_DECK',
        selector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA', 'ATTACHED_DON'], quantity: exactly_V2(wordNumber_V2(playerReturnDon[1])), chooser: 'EFFECT_OWNER' },
      },
    };
  }

  if (/return don!! cards from your field to your don!! deck until you have the same number of don!! cards on your field as your opponent/.test(lower)) {
    return {
      action: {
        type: 'RETURN_DON_TO_DON_DECK',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA', 'ATTACHED_DON'],
          quantity: { kind: 'EXACTLY', value: { kind: 'PREVIOUS_RESULT', resultId: 'excess-don-over-opponent-field-count' } },
          chooser: 'EFFECT_OWNER',
        },
      },
    };
  }

  const damage = lower.match(/deal (\d+|a|an|one|two|three) damage to your opponent/);
  if (damage) {
    return {
      action: {
        type: 'DEAL_DAMAGE',
        source: selfSelector_V2(),
        targetPlayer: 'OPPONENT',
        amount: numberValue_V2(wordNumber_V2(damage[1])),
      },
    };
  }

  const takeDamage = lower.match(/you take (\d+|a|an|one|two|three) damage/);
  if (takeDamage) {
    return {
      action: {
        type: 'TAKE_DAMAGE',
        targetPlayer: 'PLAYER',
        amount: numberValue_V2(wordNumber_V2(takeDamage[1])),
        lifeProcessing: 'CHECK_TRIGGER',
      },
    };
  }

  if ((/\bdeck (?:is )?reduced to 0\b/.test(lower) || /\byou win the game instead of losing\b/.test(lower)) && /\byou win the game instead of losing\b/.test(lower)) {
    return {
      action: {
        type: 'MODIFY_VICTORY_CONDITION',
        modifier: {
          scope: 'VICTORY_CONDITION',
          validFrom: 'ALWAYS',
          modifier: {
            type: 'RULE_MODIFIER',
            scope: 'DECK_OUT_REPLACEMENT',
            expression: {
              operation: 'WIN_INSTEAD_OF_LOSE',
              event: 'PLAYER_DECK_REDUCED_TO_ZERO',
              player: 'PLAYER',
            },
          },
        },
      },
    };
  }

  if (/\byou win the game\b/.test(lower)) {
    return { action: { type: 'PLAYER_WINS', player: 'PLAYER' } };
  }

  if (/\btake an extra turn after this one\b/.test(lower)) {
    return {
      action: {
        type: 'MODIFY_RULE_PERMISSION',
        modifier: {
          scope: 'GENERAL_RULE',
          validFrom: 'ALWAYS',
          modifier: { type: 'RULE_MODIFIER', scope: 'TURN_STRUCTURE', expression: { operation: 'TAKE_EXTRA_TURN_AFTER_CURRENT' } },
        },
      },
    };
  }

  if (/\bplay this (?:character )?card from your trash\b/.test(lower)) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['TRASH'],
          quantity: exactly_V2(1),
          chooser: 'EFFECT_OWNER',
          relations: ['THIS_CARD'],
          ...(Boolean(/rested/.test(lower)) ? { states: ['RESTED'] as const } : {}),
        },
        player: 'PLAYER',
      },
    };
  }

  if (/\bplay this card\b/.test(lower)) {
    return { action: { type: 'PLAY_CARD', selector: selfSelector_V2(), player: 'PLAYER' } };
  }

  if (/\bif that card is\b.*\bmay play that card\b/.test(lower)) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1), ...(Boolean(/rested/.test(lower)) ? { states: ['RESTED'] as const } : {}) },
        player: 'PLAYER',
      },
    };
  }

  if (/\bmay play that card\b/.test(lower)) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1), ...(Boolean(/rested/.test(lower)) ? { states: ['RESTED'] as const } : {}) },
        player: 'PLAYER',
      },
    };
  }

  const playExactFromTrash = lower.match(/play (\d+|a|an|one|two|three) .* from your trash/);
  if (playExactFromTrash) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], quantity: exactly_V2(wordNumber_V2(playExactFromTrash[1])), chooser: 'EFFECT_OWNER' }, normalized),
        player: 'PLAYER',
      },
    };
  }

  const playRevealedOrSelected = lower.match(/play up to (\d+) .*other than \[[^\]]+\]\.?$/);
  if (playRevealedOrSelected) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: withTextFilters_V2({ subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: upTo_V2(Number(playRevealedOrSelected[1])) }, normalized),
        player: 'PLAYER',
      },
    };
  }

  const playFromHand = lower.match(/play up to (\d+) .* from your hand/);
  if (playFromHand) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: withTextFilters_V2(handSelector_V2('PLAYER', upTo_V2(Number(playFromHand[1]))), normalized),
        player: 'PLAYER',
      },
    };
  }

  const opponentPlayFromHand = lower.match(/your opponent plays? up to (\d+) .* from their hand/);
  if (opponentPlayFromHand) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: withTextFilters_V2(handSelector_V2('OPPONENT', upTo_V2(Number(opponentPlayFromHand[1]))), normalized),
        player: 'OPPONENT',
      },
    };
  }

  const playFromTrash = lower.match(/play up to (\d+) .* from your trash/);
  if (playFromTrash) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], quantity: upTo_V2(Number(playFromTrash[1])), chooser: 'EFFECT_OWNER' }, normalized),
        player: 'PLAYER',
      },
    };
  }

  const playFromDeck = lower.match(/play up to (\d+) .* from your deck/);
  if (playFromDeck) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: upTo_V2(Number(playFromDeck[1])), chooser: 'EFFECT_OWNER' }, normalized),
        player: 'PLAYER',
      },
    };
  }

  const playGeneric = lower.match(/play up to (\d+) .*card/);
  if (playGeneric) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: { ...selectorFromText_V2(normalized), quantity: upTo_V2(Number(playGeneric[1])) },
        player: 'PLAYER',
      },
    };
  }

  if (/play 1 (?:of the revealed cards|card) and play the other card rested/.test(lower)) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: { kind: 'ANY_NUMBER' }, chooser: 'EFFECT_OWNER', states: ['RESTED'] as const },
        player: 'PLAYER',
      },
    };
  }

  const playNamedNoZone = lower.match(/play up to (\d+) \[[^\]]+\]/);
  if (playNamedNoZone) {
    return {
      action: {
        type: 'PLAY_CARD',
        selector: withTextFilters_V2({ subject: 'CARD', quantity: upTo_V2(Number(playNamedNoZone[1])), chooser: 'EFFECT_OWNER' }, normalized),
        player: 'PLAYER',
      },
    };
  }

  const deckSearchToHand = lower.match(/\b(?:reveal|add) (up to )?(\d+|a|an|one|two|three) .*?(?:and )?add (?:it|them|that card|those cards)?\s*to your hand|\badd (up to )?(\d+|a|an|one|two|three) .* from (?:the top cards of )?your deck to your hand/);
  if (deckSearchToHand) {
    const amount = wordNumber_V2(deckSearchToHand[2] ?? deckSearchToHand[4] ?? '1');
    return {
      action: {
        type: 'MOVE_CARD',
        selector: { ...deckSearchSelector_V2(normalized), quantity: deckSearchToHand[1] || deckSearchToHand[3] ? upTo_V2(amount) : exactly_V2(amount) },
        to: { zone: 'HAND', owner: 'PLAYER' },
        cause: 'EFFECT',
      },
    };
  }

  const revealHandToLife = lower.match(/\breveal (up to )?(\d+|a|an|one|two|three) .* from your hand and add (?:it|them|that card|those cards) to the (top|bottom) of your life cards?/);
  if (revealHandToLife) {
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: withTextFilters_V2(handSelector_V2('PLAYER', revealHandToLife[1] ? upTo_V2(wordNumber_V2(revealHandToLife[2])) : exactly_V2(wordNumber_V2(revealHandToLife[2]))), normalized),
        player: 'PLAYER',
        position: revealHandToLife[3].toUpperCase() as 'TOP' | 'BOTTOM',
        face: /face-up/.test(lower) ? 'FACE_UP' : 'FACE_DOWN',
      },
    };
  }

  if (/add (?:this card|this character card) (?:from your trash )?to your hand/.test(lower)) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: /from your trash/.test(lower)
          ? { subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], relations: ['THIS_CARD'], quantity: exactly_V2(1) }
          : selfSelector_V2(),
        to: { zone: 'HAND', owner: 'PLAYER' },
        cause: 'EFFECT',
      },
    };
  }

  const resultToHand = lower.match(/add up to (\d+|a|an|one|two|three) .*cards? to your hand/);
  if (resultToHand) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: upTo_V2(wordNumber_V2(resultToHand[1])) },
        to: { zone: 'HAND', owner: 'PLAYER' },
        cause: 'EFFECT',
      },
    };
  }

  const resultToLife = lower.match(/add up to (\d+|a|an|one|two|three) .*cards? to the (top|bottom) of your life cards?/);
  if (resultToLife) {
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: upTo_V2(wordNumber_V2(resultToLife[1])) },
        player: 'PLAYER',
        position: resultToLife[2].toUpperCase() as 'TOP' | 'BOTTOM',
        face: /face-up/.test(lower) ? 'FACE_UP' : 'FACE_DOWN',
      },
    };
  }

  if (/add it to the top of your life cards? face-down instead/.test(lower)) {
    if (/would be removed from the field/.test(originalLower)) {
      const replacementAction: Action_V2 = {
        type: 'ADD_CARD_TO_LIFE',
        selector: { subject: 'ACTION_RESULT', relations: ['REPLACED_REMOVED_CARD'], quantity: exactly_V2(1) },
        player: 'PLAYER',
        position: 'TOP',
        face: 'FACE_DOWN',
      };
      return {
        action: {
          type: 'CREATE_REPLACEMENT_EFFECT',
          effect: {
            ...generatedEffectDefinition_V2('replacement:removed-card-to-life-face-down', replacementAction, original, 'REPLACEMENT'),
            timing: {
              kind: 'CUSTOM_EVENT',
              eventType: 'CARD_WOULD_MOVE',
              fromZone: 'CHARACTER_AREA',
              ...(preventionSourceSelectorFromText_V2(original) ? { sourceSelector: preventionSourceSelectorFromText_V2(original) } : {}),
            },
          },
          duration: { kind: 'WHILE_SOURCE_VALID' },
        },
      };
    }
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: { subject: 'ACTION_RESULT', relations: ['REPLACED_REMOVED_CARD'], quantity: exactly_V2(1) },
        player: 'PLAYER',
        position: 'TOP',
        face: 'FACE_DOWN',
      },
    };
  }

  const lifeToHand = lower.match(/(?:your opponent )?adds? (up to )?(\d+|a|an|one|two|three) cards? from (?:the top(?: or bottom)? of )?(your opponent'?s|your|their) life/);
  if (lifeToHand) {
    const owner = lifeToHand[3].includes('opponent') || lifeToHand[3].includes('their') ? 'OPPONENT' : 'PLAYER';
    return {
      action: {
        type: 'MOVE_CARD',
        selector: { subject: 'CARD', owner, zones: ['LIFE'], quantity: lifeToHand[1] ? upTo_V2(wordNumber_V2(lifeToHand[2])) : exactly_V2(wordNumber_V2(lifeToHand[2])), ordering: 'DECK_ORDER' },
        to: { zone: 'HAND', owner: owner === 'OPPONENT' ? 'CARD_OWNER' : 'PLAYER' },
        cause: 'EFFECT',
      },
    };
  }

  const deckToLife = lower.match(/add (up to )?(\d+|a|an|one|two|three) cards? from the top of your deck to the top of your life/);
  if (deckToLife) {
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: deckToLife[1] ? upTo_V2(wordNumber_V2(deckToLife[2])) : exactly_V2(wordNumber_V2(deckToLife[2])), ordering: 'DECK_ORDER' },
        player: 'PLAYER',
        position: 'TOP',
        face: 'FACE_DOWN',
      },
    };
  }

  const handToLife = lower.match(/add (up to )?(\d+|a|an|one|two|three) cards? from your hand to the (top|bottom) of your life/);
  if (handToLife) {
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: withTextFilters_V2(handSelector_V2('PLAYER', handToLife[1] ? upTo_V2(wordNumber_V2(handToLife[2])) : exactly_V2(wordNumber_V2(handToLife[2]))), normalized),
        player: 'PLAYER',
        position: handToLife[3].toUpperCase() as 'TOP' | 'BOTTOM',
        face: /face-up/.test(lower) ? 'FACE_UP' : 'FACE_DOWN',
      },
    };
  }

  const sourceToLife = lower.match(/add (up to )?(\d+|a|an|one|two|three) .* from your (hand|trash|hand or trash) to the (top|bottom) of your life/);
  if (sourceToLife) {
    const zones = sourceToLife[3] === 'hand or trash' ? ['HAND', 'TRASH'] as const : [sourceToLife[3].toUpperCase() as 'HAND' | 'TRASH'];
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: [...zones], quantity: sourceToLife[1] ? upTo_V2(wordNumber_V2(sourceToLife[2])) : exactly_V2(wordNumber_V2(sourceToLife[2])), chooser: 'EFFECT_OWNER' }, normalized),
        player: 'PLAYER',
        position: sourceToLife[4].toUpperCase() as 'TOP' | 'BOTTOM',
        face: /face-up/.test(lower) ? 'FACE_UP' : 'FACE_DOWN',
      },
    };
  }

  if (/\b(?:add|place) up to \d+ .*characters?.* (?:to|at) the top or bottom of .*life cards/i.test(normalized) || /\badd up to \d+ .*characters?.* to the top of .*life cards/i.test(normalized)) {
    const lifeOwner = /opponent'?s life cards|their life cards/.test(lower) ? 'OPPONENT' : 'CARD_OWNER';
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: withTextFilters_V2(selectorFromText_V2(normalized), normalized),
        player: lifeOwner,
        position: 'TOP',
        face: /face-up/.test(lower) ? 'FACE_UP' : 'FACE_DOWN',
      },
    };
  }

  if (/\bplace (?:up to )?(?:\d+|a|an|one|two|three) of your opponent'?s characters? .* at the top or bottom of your opponent'?s life cards/i.test(normalized)) {
    return {
      action: {
        type: 'ADD_CARD_TO_LIFE',
        selector: withTextFilters_V2(selectorFromText_V2(normalized), normalized),
        player: 'OPPONENT',
        position: 'TOP',
        face: /face-up/.test(lower) ? 'FACE_UP' : 'FACE_DOWN',
      },
    };
  }

  if (/add up to \d+ .* from your trash to your hand/.test(lower)) {
    const amount = Number(lower.match(/add up to (\d+)/)?.[1] ?? 1);
    return {
      action: {
        type: 'MOVE_CARD',
        selector: withTextFilters_V2({ subject: 'CARD', owner: 'PLAYER', zones: ['TRASH'], quantity: upTo_V2(amount), chooser: 'EFFECT_OWNER' }, normalized),
        to: { zone: 'HAND', owner: 'PLAYER' },
        cause: 'EFFECT',
      },
    };
  }

  if (/return(?:s)? .* to (?:the )?owner'?s? hand|return(?:s)? .* to your hand/.test(lower)) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: selectorFromText_V2(normalized),
        to: { zone: 'HAND', owner: 'CARD_OWNER' },
        cause: 'EFFECT',
      },
    };
  }

  if (/\b(?:your )?opponent (?:must )?places? .*cards? from their hand at the bottom of their deck\b|\bthey place .*cards? from their hand at the bottom of their deck\b|\byour opponent chooses .*cards? from their hand and trashes it\b/.test(lower)) {
    if (/\btrashes it\b/.test(lower)) {
      return {
        action: {
          type: 'TRASH_CARD',
          selector: handSelector_V2('OPPONENT', exactly_V2(countFromText_V2(normalized))),
          cause: 'EFFECT',
        },
      };
    }
    return {
      action: {
        type: 'MOVE_CARD',
        selector: handSelector_V2('OPPONENT', exactly_V2(countFromText_V2(normalized))),
        to: { zone: 'DECK', owner: 'OPPONENT', position: 'BOTTOM' },
        cause: 'EFFECT',
      },
    };
  }

  const handToDeckTopBottom = lower.match(/place (\d+|a|an|one|two|three) cards? from your hand at the top or bottom of your deck/);
  if (handToDeckTopBottom) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: handSelector_V2('PLAYER', exactly_V2(wordNumber_V2(handToDeckTopBottom[1]))),
        to: { zone: 'DECK', owner: 'PLAYER', position: 'TOP' },
        cause: 'EFFECT',
      },
    };
  }

  if (/opponent returns all cards in their hand to their deck/.test(lower)) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: handSelector_V2('OPPONENT', { kind: 'ALL' }),
        to: { zone: 'DECK', owner: 'OPPONENT' },
        cause: 'EFFECT',
      },
    };
  }

  const opponentTrashToDeck = lower.match(/(?:your opponent )?places? (\d+|a|an|one|two|three) cards? from (?:your opponent'?s|their) trash at the bottom of (?:your opponent'?s|their) deck/);
  if (opponentTrashToDeck) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['TRASH'], quantity: exactly_V2(wordNumber_V2(opponentTrashToDeck[1])), chooser: 'OPPONENT' },
        to: { zone: 'DECK', owner: 'OPPONENT', position: 'BOTTOM' },
        cause: 'EFFECT',
      },
    };
  }

  const opponentTypedTrashToDeck = lower.match(/(?:your opponent )?places? (\d+|a|an|one|two|three) .* from (?:your opponent'?s|their) trash at the bottom of (?:your opponent'?s|their) deck/);
  if (opponentTypedTrashToDeck) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: withTextFilters_V2({ subject: 'CARD', owner: 'OPPONENT', zones: ['TRASH'], quantity: exactly_V2(wordNumber_V2(opponentTypedTrashToDeck[1])), chooser: 'OPPONENT' }, normalized),
        to: { zone: 'DECK', owner: 'OPPONENT', position: 'BOTTOM' },
        cause: 'EFFECT',
      },
    };
  }

  const opponentTrashOneToDeck = lower.match(/place up to (\d+|a|an|one|two|three) cards? from your opponent'?s trash at the bottom of their deck/);
  if (opponentTrashOneToDeck) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['TRASH'], quantity: upTo_V2(wordNumber_V2(opponentTrashOneToDeck[1])), chooser: 'EFFECT_OWNER' },
        to: { zone: 'DECK', owner: 'OPPONENT', position: 'BOTTOM' },
        cause: 'EFFECT',
      },
    };
  }

  const opponentTrashToOwnerDeck = lower.match(/place up to (\d+|a|an|one|two|three) cards? from your opponent'?s trash at the bottom of (?:the )?owner'?s deck/);
  if (opponentTrashToOwnerDeck) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['TRASH'], quantity: upTo_V2(wordNumber_V2(opponentTrashToOwnerDeck[1])), chooser: 'EFFECT_OWNER' },
        to: { zone: 'DECK', owner: 'CARD_OWNER', position: 'BOTTOM' },
        cause: 'EFFECT',
      },
    };
  }

  if (!/\bthe rest\b/.test(lower) && /\b(place|return)(?:s)? .* (?:at|to|on) the bottom of (?:the )?owner'?s? deck|\b(place|return)(?:s)? .* at the bottom of your deck|\bto the bottom of (?:the )?owner'?s? deck/.test(lower)) {
    if (/all of your characters except this character/.test(lower)) {
      return {
        action: {
          type: 'MOVE_CARD',
          selector: {
            ...controllerCharacterSelector_V2({ kind: 'ALL' }),
            relations: ['EXCLUDE_THIS_CARD'],
          },
          to: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
          cause: 'EFFECT',
        },
      };
    }
    return {
      action: {
        type: 'MOVE_CARD',
        selector: selectorFromText_V2(normalized),
        to: { zone: 'DECK', owner: ownerFromText_V2(normalized), position: 'BOTTOM' },
        cause: 'EFFECT',
      },
    };
  }

  if (!/\bthe rest\b/.test(lower) && /\b(place|return)(?:s)? .* (?:at|to|on) the top of (?:the )?owner'?s? deck|\b(place|return)(?:s)? .* at the top of your deck/.test(lower)) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: selectorFromText_V2(normalized),
        to: { zone: 'DECK', owner: ownerFromText_V2(normalized), position: 'TOP' },
        cause: 'EFFECT',
      },
    };
  }

  const giveDonToOpponentCharacters = lower.match(/give up to (\d+) (?:of your opponent'?s )?(active |rested )?don!! cards?(?: from your opponent'?s cost area)? to (up to )?(\d+) of your opponent'?s (leader or character cards|characters)/);
  if (giveDonToOpponentCharacters) {
    const targetZones = giveDonToOpponentCharacters[5] === 'leader or character cards' ? ['LEADER_AREA', 'CHARACTER_AREA'] as const : ['CHARACTER_AREA'] as const;
    const targetCategories = giveDonToOpponentCharacters[5] === 'leader or character cards' ? ['LEADER', 'CHARACTER'] as const : ['CHARACTER'] as const;
    return {
      action: {
        type: 'GIVE_DON',
        donSelector: {
          subject: 'DON',
          owner: 'OPPONENT',
          zones: ['COST_AREA'],
          ...(giveDonToOpponentCharacters[2] ? { states: [giveDonToOpponentCharacters[2].trim().toUpperCase() as 'ACTIVE' | 'RESTED'] } : {}),
          quantity: upTo_V2(Number(giveDonToOpponentCharacters[1])),
          chooser: 'EFFECT_OWNER',
        },
        target: {
          subject: 'CARD',
          controller: 'OPPONENT',
          zones: [...targetZones],
          cardCategories: [...targetCategories],
          quantity: giveDonToOpponentCharacters[3] ? upTo_V2(Number(giveDonToOpponentCharacters[4])) : exactly_V2(Number(giveDonToOpponentCharacters[4])),
          chooser: 'EFFECT_OWNER',
        },
      },
    };
  }

  const giveDonToOwnerLeaderOrCharacter = lower.match(/give up to (\d+) (active |rested )?don!! cards?(?: from its owner's cost area)? to (?:its owner's|your) leader or (\d+) of (?:their|your) characters/);
  if (giveDonToOwnerLeaderOrCharacter) {
    return {
      action: {
        type: 'GIVE_DON',
        donSelector: {
          subject: 'DON',
          owner: /its owner's/.test(lower) ? 'CARD_OWNER' : 'PLAYER',
          zones: ['COST_AREA'],
          ...(giveDonToOwnerLeaderOrCharacter[2] ? { states: [giveDonToOwnerLeaderOrCharacter[2].trim().toUpperCase() as 'ACTIVE' | 'RESTED'] } : {}),
          quantity: upTo_V2(Number(giveDonToOwnerLeaderOrCharacter[1])),
          chooser: 'EFFECT_OWNER',
        },
        target: {
          subject: 'CARD',
          controller: /its owner's/.test(lower) ? 'CARD_OWNER' : 'PLAYER',
          zones: ['LEADER_AREA', 'CHARACTER_AREA'],
          cardCategories: ['LEADER', 'CHARACTER'],
          quantity: exactly_V2(Number(giveDonToOwnerLeaderOrCharacter[3])),
          chooser: 'EFFECT_OWNER',
        },
      },
    };
  }

  const giveDonToTypedLeaderOrCharacter = lower.match(/give up to (\d+) (active |rested )?don!! cards? to (\d+) of your .*leader or character cards/);
  if (giveDonToTypedLeaderOrCharacter) {
    return {
      action: {
        type: 'GIVE_DON',
        donSelector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          ...(giveDonToTypedLeaderOrCharacter[2] ? { states: [giveDonToTypedLeaderOrCharacter[2].trim().toUpperCase() as 'ACTIVE' | 'RESTED'] } : {}),
          quantity: upTo_V2(Number(giveDonToTypedLeaderOrCharacter[1])),
          chooser: 'EFFECT_OWNER',
        },
        target: withTextFilters_V2({
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA', 'CHARACTER_AREA'],
          cardCategories: ['LEADER', 'CHARACTER'],
          quantity: exactly_V2(Number(giveDonToTypedLeaderOrCharacter[3])),
          chooser: 'EFFECT_OWNER',
        }, normalized),
      },
    };
  }

  const giveDonToCharacters = lower.match(/give up to (\d+) (active |rested )?don!! cards? to (up to )?(\d+) of your (leader or character cards|characters)/);
  if (giveDonToCharacters) {
    const targetZones = giveDonToCharacters[5] === 'leader or character cards' ? ['LEADER_AREA', 'CHARACTER_AREA'] as const : ['CHARACTER_AREA'] as const;
    const targetCategories = giveDonToCharacters[5] === 'leader or character cards' ? ['LEADER', 'CHARACTER'] as const : ['CHARACTER'] as const;
    return {
      action: {
        type: 'GIVE_DON',
        donSelector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          ...(giveDonToCharacters[2] ? { states: [giveDonToCharacters[2].trim().toUpperCase() as 'ACTIVE' | 'RESTED'] } : {}),
          quantity: upTo_V2(Number(giveDonToCharacters[1])),
          chooser: 'EFFECT_OWNER',
        },
        target: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: [...targetZones],
          cardCategories: [...targetCategories],
          quantity: giveDonToCharacters[3] ? upTo_V2(Number(giveDonToCharacters[4])) : exactly_V2(Number(giveDonToCharacters[4])),
          chooser: 'EFFECT_OWNER',
        },
      },
    };
  }

  const giveDon = lower.match(/give .*up to (\d+) .*don!!|give this character up to (\d+) .*don!!/);
  if (giveDon) {
    const count = Number(giveDon[1] ?? giveDon[2]);
    return {
      action: {
        type: 'GIVE_DON',
        donSelector: { subject: 'DON', owner: 'PLAYER', zones: ['COST_AREA'], quantity: upTo_V2(count), chooser: 'EFFECT_OWNER' },
        target: selectorFromText_V2(normalized),
      },
    };
  }

  if (/look at (?:up to )?\d+ cards? from the top of (?:your or your opponent'?s|your opponent'?s|your) life cards?/.test(lower)) {
    const look = lower.match(/look at (?:up to )?(\d+) cards?/);
    return {
      action: {
        type: 'LOOK_AT_LIFE',
        player: /opponent/.test(lower) && !/your or your opponent/.test(lower) ? 'OPPONENT' : 'ANY',
        count: numberValue_V2(Number(look?.[1] ?? 1)),
        position: 'TOP',
      },
    };
  }

  if (/look at all (?:of )?(?:your opponent'?s|your) life cards?/.test(lower)) {
    const player = /opponent/.test(lower) ? 'OPPONENT' : 'PLAYER';
    return {
      action: {
        type: 'LOOK_AT_LIFE',
        player,
        count: { kind: 'COUNT', selector: { subject: 'CARD', owner: player, zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } } },
        position: 'ALL',
      },
    };
  }

  if (/place them back in their life area in any order/.test(lower)) {
    return {
      action: {
        type: 'REORDER_LIFE',
        player: 'OPPONENT',
        selector: { subject: 'ACTION_RESULT', relations: ['LOOKED_AT_PREVIOUSLY'], quantity: { kind: 'ANY_NUMBER' } },
        orderChooser: 'PLAYER',
      },
    };
  }

  if (/look at (?:up to )?\d+ cards? from the top of your deck/.test(lower)) {
    const look = lower.match(/look at (?:up to )?(\d+) cards?/);
    return {
      action: {
        type: 'LOOK_AT_CARDS',
        player: 'PLAYER',
        source: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: exactly_V2(Number(look?.[1] ?? 1)), ordering: 'DECK_ORDER' },
        count: numberValue_V2(Number(look?.[1] ?? 1)),
      },
    };
  }

  if (/look at (?:up to )?\d+ cards? from the top of your opponent'?s deck/.test(lower)) {
    const look = lower.match(/look at (?:up to )?(\d+) cards?/);
    return {
      action: {
        type: 'LOOK_AT_CARDS',
        player: 'PLAYER',
        source: { subject: 'CARD', owner: 'OPPONENT', zones: ['DECK'], quantity: exactly_V2(Number(look?.[1] ?? 1)), ordering: 'DECK_ORDER' },
        count: numberValue_V2(Number(look?.[1] ?? 1)),
      },
    };
  }

  const revealOpponentTop = lower.match(/(?:choose a cost and )?reveal (\d+|a|an|one|two|three) cards? from the top of your opponent'?s deck/);
  if (revealOpponentTop) {
    return {
      action: {
        type: 'REVEAL_CARD',
        selector: {
          subject: 'CARD',
          owner: 'OPPONENT',
          zones: ['DECK'],
          quantity: exactly_V2(wordNumber_V2(revealOpponentTop[1])),
          ordering: 'DECK_ORDER',
        },
        viewers: 'BOTH_PLAYERS',
      },
    };
  }

  const revealFromHand = lower.match(/reveal (up to )?(\d+|a|an|one|two|three) .* from your hand/);
  if (revealFromHand) {
    return {
      action: {
        type: 'REVEAL_CARD',
        selector: withTextFilters_V2(handSelector_V2('PLAYER', revealFromHand[1] ? upTo_V2(wordNumber_V2(revealFromHand[2])) : exactly_V2(wordNumber_V2(revealFromHand[2]))), normalized),
        viewers: 'BOTH_PLAYERS',
      },
    };
  }

  const revealFromTop = lower.match(/reveal (\d+|a|an|one|two|three) cards? from the top of your deck/);
  if (revealFromTop) {
    return {
      action: {
        type: 'REVEAL_CARD',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['DECK'],
          quantity: exactly_V2(wordNumber_V2(revealFromTop[1])),
          ordering: 'DECK_ORDER',
        },
        viewers: 'BOTH_PLAYERS',
      },
    };
  }

  const revealLifeTop = lower.match(/reveal (up to )?(\d+|a|an|one|two|three) cards? from the top of your life cards?/);
  if (revealLifeTop) {
    return {
      action: {
        type: 'REVEAL_CARD',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['LIFE'],
          quantity: revealLifeTop[1] ? upTo_V2(wordNumber_V2(revealLifeTop[2])) : exactly_V2(wordNumber_V2(revealLifeTop[2])),
          ordering: 'DECK_ORDER',
        },
        viewers: 'BOTH_PLAYERS',
      },
    };
  }

  if (/\b(?:opponent )?reveals? (that card|those cards)\b/.test(lower)) {
    return {
      action: {
        type: 'REVEAL_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: { kind: 'ANY_NUMBER' } },
        viewers: 'BOTH_PLAYERS',
      },
    };
  }

  if (/\bshuffle your deck\b/.test(lower)) {
    return {
      action: {
        type: 'SHUFFLE_ZONE',
        player: 'PLAYER',
        zone: 'DECK',
      },
    };
  }

  if (/place (?:it|them|that card) at the top or bottom of (?:your |the )?deck in any order|place (?:it|them|that card) at the top or bottom of your deck/.test(lower)) {
    return {
      action: {
        type: 'REORDER_CARDS',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: { kind: 'ANY_NUMBER' } },
        destination: { zone: 'DECK', owner: 'PLAYER', position: 'TOP' },
        orderChooser: 'PLAYER',
      },
    };
  }

  if (/place the rest at the (?:top or )?bottom of (?:your |the )?deck|place the rest on the bottom of your deck|return the rest to the bottom of your deck/.test(lower)) {
    return {
      action: {
        type: 'REORDER_CARDS',
        selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'], quantity: { kind: 'ANY_NUMBER' } },
        destination: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
        orderChooser: /random order/.test(lower) ? 'RANDOM' : 'PLAYER',
      },
    };
  }

  if (/place (?:it|them|that card) at the top or bottom of (?:the )?life cards?/.test(lower)) {
    return {
      action: {
        type: 'REORDER_LIFE',
        player: /opponent/.test(lower) ? 'OPPONENT' : 'ANY',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1) },
        orderChooser: 'PLAYER',
      },
    };
  }

  if (/place (?:them|the rest) back in (?:your )?life area in any order/.test(lower)) {
    return {
      action: {
        type: 'REORDER_LIFE',
        player: 'PLAYER',
        selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'], quantity: { kind: 'ANY_NUMBER' } },
        orderChooser: 'PLAYER',
      },
    };
  }

  if (/place the revealed card at the bottom of your deck/.test(lower)) {
    return {
      action: {
        type: 'MOVE_CARD',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1) },
        to: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
        cause: 'EFFECT',
      },
    };
  }

  if (/place the rest at the top of your deck|place the rest on the top of your deck|return the rest to the top of your deck/.test(lower)) {
    return {
      action: {
        type: 'REORDER_CARDS',
        selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'], quantity: { kind: 'ANY_NUMBER' } },
        destination: { zone: 'DECK', owner: 'PLAYER', position: 'TOP' },
        orderChooser: /random order/.test(lower) ? 'RANDOM' : 'PLAYER',
      },
    };
  }

  const unrecognized = unrecognizedAtomRemark_V2(original);
  return { reason: unrecognized.reason, unrecognizedKind: unrecognized.kind, trackingRemark: unrecognized.remark };
}

function collectSelectorsFromValue_V2(value: unknown, selectors: Selector_V2[] = []): Selector_V2[] {
  if (!value || typeof value !== 'object') return selectors;
  const record = value as Record<string, unknown>;
  if (typeof record.subject === 'string') selectors.push(record as unknown as Selector_V2);
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) collectSelectorsFromValue_V2(item, selectors);
    } else {
      collectSelectorsFromValue_V2(child, selectors);
    }
  }
  return selectors;
}

function semanticIssuesForParsedAtom_V2(text: string, parsed: { action?: Action_V2; costs?: CostAction_V2[] }): string[] {
  const issues: string[] = [];
  const selectors = collectSelectorsFromValue_V2(parsed.action ?? parsed.costs);

  if (/\bbase cost\b|\bwith a base cost\b/i.test(text) && selectors.some((selector) => selector.cost?.propertyLayer === 'CURRENT')) {
    issues.push('Text says base cost, but at least one parsed selector still uses CURRENT cost.');
  }

  if (/\bwithout a Counter\b/i.test(text) && !selectors.some((selector) => selector.counter)) {
    issues.push('Text filters cards without a Counter, but the parsed selector has no counter filter.');
  }

  if (/\bwin the game instead of losing\b/i.test(text) && parsed.action?.type === 'PLAYER_WINS') {
    issues.push('Replacement/victory-condition text was parsed as an immediate PLAYER_WINS action.');
  }

  return issues;
}

function wordNumber_V2(value: string): number {
  const lookup: Record<string, number> = {
    a: 1,
    an: 1,
    one: 1,
    first: 1,
    two: 2,
    second: 2,
    three: 3,
    third: 3,
    four: 4,
    fourth: 4,
    five: 5,
    fifth: 5,
    six: 6,
    sixth: 6,
    seven: 7,
    seventh: 7,
    eight: 8,
    eighth: 8,
    nine: 9,
    ninth: 9,
    ten: 10,
    tenth: 10,
  };
  return lookup[value.toLowerCase()] ?? Number(value);
}

function normalizeKeyword_V2(value: string): KeywordEffect_V2 {
  const normalized = value.toLowerCase();
  if (normalized === 'rush: character') return 'RUSH_CHARACTER';
  if (normalized === 'double attack') return 'DOUBLE_ATTACK';
  return normalized.toUpperCase() as KeywordEffect_V2;
}

function classifyTags_V2(tags: string[]): {
  category: EffectCategory_V2;
  timing?: StandardTiming_V2;
  conditions: ReturnType<typeof donAttachedAtLeast_V2>[];
  keywordActions: Action_V2[];
} {
  let category: EffectCategory_V2 = 'PERMANENT';
  let timing: StandardTiming_V2 | undefined;
  const conditions: ReturnType<typeof donAttachedAtLeast_V2>[] = [];
  const keywordActions: Action_V2[] = [];

  for (const tag of tags) {
    const timingTag = TIMING_TAGS_V2[tag];
    if (timingTag && timing === undefined) {
      timing = timingTag.timing;
      category = timingTag.category;
      continue;
    }

    const keyword = KEYWORD_TAGS_V2[tag];
    if (keyword) {
      keywordActions.push({ type: 'GRANT_KEYWORD', selector: selfSelector_V2(), keyword, duration: { kind: 'PERMANENT' } });
      continue;
    }

    const don = tag.match(/\[DON!!\s*x\s*(\d+)\]/i);
    if (don) {
      conditions.push(donAttachedAtLeast_V2(Number(don[1])));
      continue;
    }

    if (/^\[Your Turn\]$/i.test(tag)) conditions.push(turnIs_V2('PLAYER'));
    if (/^\[Opponent's Turn\]$/i.test(tag)) conditions.push(turnIs_V2('OPPONENT'));
  }

  return { category, timing, conditions, keywordActions };
}

function detectInlineTiming_V2(body: string): TimingExpression_V2 | undefined {
  if (/this effect can be activated at the start of your turn/i.test(body)) {
    return { kind: 'CUSTOM_EVENT', eventType: 'TURN_STARTED', actor: 'PLAYER' };
  }
  if (/this effect can be activated when (?:your opponent attacks|your opponent'?s character attacks)/i.test(body)) {
    return { kind: 'CUSTOM_EVENT', eventType: 'ATTACK_DECLARED', actor: 'OPPONENT' };
  }
  if (/this effect can be activated when (?:a|your .*?)character (?:card )?is removed from the field/i.test(body)) {
    return { kind: 'CUSTOM_EVENT', eventType: 'CARD_MOVED', fromZone: 'CHARACTER_AREA', conditions: { kind: 'PREDICATE', left: { kind: 'MOVED_CARD_CATEGORY' }, operator: 'EQUAL', right: { kind: 'STRING', value: 'CHARACTER' } } };
  }
  if (/this effect can be activated when this Character is rested by your opponent'?s effect/i.test(body)) {
    return {
      kind: 'CUSTOM_EVENT',
      eventType: 'CARD_RESTED',
      subject: selfSelector_V2(),
      sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT', quantity: { kind: 'ANY_NUMBER' } },
      conditions: {
        kind: 'PREDICATE',
        left: { kind: 'REST_CAUSE' },
        operator: 'EQUAL',
        right: { kind: 'STRING', value: 'EFFECT' },
      },
    };
  }
  if (/this effect can be activated when a card is removed from your or your opponent'?s life cards/i.test(body)) {
    return { kind: 'CUSTOM_EVENT', eventType: 'CARD_MOVED', fromZone: 'LIFE' };
  }
  if (/this effect can be activated when you play a character with a \[trigger\]/i.test(body)) {
    return { kind: 'CUSTOM_EVENT', eventType: 'CARD_PLAYED', actor: 'PLAYER', conditions: { kind: 'PREDICATE', left: { kind: 'PLAYED_CARD_KEYWORD' }, operator: 'EQUAL', right: { kind: 'STRING', value: 'TRIGGER' } } };
  }
  if (/this effect can be activated when you only have characters with a type including "([^"]+)"/i.test(body)) {
    return { kind: 'CUSTOM_EVENT', eventType: 'ACTIVATION_WINDOW_OPENED', actor: 'PLAYER' };
  }
  if (/when your opponent activates an event/i.test(body)) {
    return {
      kind: 'CUSTOM_EVENT',
      eventType: 'CARD_ACTIVATED',
      actor: 'OPPONENT',
      conditions: {
        kind: 'PREDICATE',
        left: { kind: 'ACTIVATED_CARD_CATEGORY' },
        operator: 'EQUAL',
        right: { kind: 'STRING', value: 'EVENT' },
      },
    };
  }
  if (/when you activate an event/i.test(body)) {
    return {
      kind: 'CUSTOM_EVENT',
      eventType: 'CARD_ACTIVATED',
      actor: 'PLAYER',
      conditions: {
        kind: 'PREDICATE',
        left: { kind: 'ACTIVATED_CARD_CATEGORY' },
        operator: 'EQUAL',
        right: { kind: 'STRING', value: 'EVENT' },
      },
    };
  }
  if (/when you take damage or your Character with \d+ base power or more is (?:KO'd|K\.O\.'?d)/i.test(body)) {
    return {
      kind: 'OR',
      timings: [
        { kind: 'CUSTOM_EVENT', eventType: 'DAMAGE_TAKEN', actor: 'PLAYER' },
        {
          kind: 'CUSTOM_EVENT',
          eventType: 'CARD_KO',
          actor: 'PLAYER',
          conditions: {
            kind: 'PREDICATE',
            left: { kind: 'KO_CARD_BASE_POWER' },
            operator: 'GREATER_OR_EQUAL',
            right: numberValue_V2(Number(body.match(/Character with (\d+) base power or more/i)?.[1] ?? 0)),
          },
        },
      ],
    };
  }
  return undefined;
}

function detectInlineConditions_V2(body: string): ConditionExpression_V2[] {
  const conditions: ConditionExpression_V2[] = [];
  if (/\bduring your opponent'?s turn\b/i.test(body)) {
    conditions.push(turnIs_V2('OPPONENT'));
  }

  const namePresence = body.match(/\bif you have (?:(?:a|an|one|1) )?\[([^\]]+)\]/i);
  if (namePresence) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'],
          names: [{ kind: 'NAME_EXACT', value: namePresence[1] }],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const twoNamePresence = body.match(/\bif you have \[([^\]]+)\] and \[([^\]]+)\]/i);
  if (twoNamePresence) {
    conditions.push({
      kind: 'AND',
      conditions: [twoNamePresence[1], twoNamePresence[2]].map((name) => ({
        kind: 'PREDICATE',
        left: {
          kind: 'COUNT',
          selector: {
            subject: 'CARD',
            controller: 'PLAYER',
            zones: ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'],
            names: [{ kind: 'NAME_EXACT', value: name }],
            quantity: { kind: 'ANY_NUMBER' },
          },
        },
        operator: 'GREATER_OR_EQUAL',
        right: numberValue_V2(1),
      })),
    });
  }

  const nameAbsence = body.match(/\bif you don'?t have \[([^\]]+)\]/i);
  if (nameAbsence) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'],
          names: [{ kind: 'NAME_EXACT', value: nameAbsence[1] }],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'EQUAL',
      right: numberValue_V2(0),
    });
  }

  const trashCount = body.match(/\bif you have (\d+) or more cards? in your trash/i);
  if (trashCount) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['TRASH'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(Number(trashCount[1])),
    });
  }

  const eventTrashCount = body.match(/\bif you have (\d+) or more Events? in your trash/i);
  if (eventTrashCount) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['TRASH'],
          cardCategories: ['EVENT'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(Number(eventTrashCount[1])),
    });
  }

  const leaderPower = body.match(/\bif your Leader has (\d+) power or (less|more)/i);
  if (leaderPower) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'PROPERTY_VALUE',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA'],
          cardCategories: ['LEADER'],
          quantity: exactly_V2(1),
        },
        property: 'POWER',
        propertyLayer: 'CURRENT',
      },
      operator: leaderPower[2].toLowerCase() === 'less' ? 'LESS_OR_EQUAL' : 'GREATER_OR_EQUAL',
      right: numberValue_V2(Number(leaderPower[1])),
    });
  }

  if (/\bif your opponent has any DON!! cards? given/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'DON',
          owner: 'OPPONENT',
          zones: ['ATTACHED_DON'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  if (/\bif this Character was played on this turn/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          relations: ['THIS_CARD'],
          states: ['PLAYED_THIS_TURN'],
          quantity: exactly_V2(1),
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  if (/\bif you have less Life cards? than your opponent/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } },
      },
      operator: 'LESS_THAN',
      right: {
        kind: 'COUNT',
        selector: { subject: 'CARD', owner: 'OPPONENT', zones: ['LIFE'], quantity: { kind: 'ANY_NUMBER' } },
      },
    });
  }

  const typedCharacterPower = body.match(/\bif you have (?:a|an|one|1) \{([^}]+)\} type Character with (\d+) power or more/i);
  if (typedCharacterPower) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['CHARACTER_AREA'],
          cardCategories: ['CHARACTER'],
          types: { kind: 'HAS_TYPE', values: [typedCharacterPower[1]] },
          power: { propertyLayer: 'CURRENT', comparison: 'AT_LEAST', value: numberValue_V2(Number(typedCharacterPower[2])) },
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const activatedEventBaseCost = body.match(/\bif you have activated an Event with a base cost of (\d+) or more during this turn/i);
  if (activatedEventBaseCost) {
    conditions.push(eventActivationCountAtLeastCondition_V2(Number(activatedEventBaseCost[1]), 1));
  }

  const ownTurnCount = body.match(/\bif it is your (\w+) turn or later/i);
  if (ownTurnCount) {
    conditions.push(selfTurnCountAtLeastCondition_V2(wordNumber_V2(ownTurnCount[1])));
  }

  const donOnField = body.match(/\bif you have (\d+) or more DON!! cards? on your field/i);
  if (donOnField) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(Number(donOnField[1])),
    });
  }

  if (/\bif you have any DON!! cards? on your field/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  if (/\bif your opponent has more DON!! cards? on their field than you\b/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'DON',
          owner: 'OPPONENT',
          zones: ['COST_AREA'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_THAN',
      right: {
        kind: 'COUNT',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
    });
  }

  const opponentDonOnField = body.match(/\bif your opponent has (\d+) or (more|less) DON!! cards? on their field/i);
  if (opponentDonOnField) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'DON',
          owner: 'OPPONENT',
          zones: ['COST_AREA'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: opponentDonOnField[2].toLowerCase() === 'more' ? 'GREATER_OR_EQUAL' : 'LESS_OR_EQUAL',
      right: numberValue_V2(Number(opponentDonOnField[1])),
    });
  }

  const selfDonOnField = body.match(/\bif you have (\d+) or (more|less) DON!! cards? on your field/i);
  if (selfDonOnField && selfDonOnField[2].toLowerCase() === 'less') {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: selfDonOnField[2].toLowerCase() === 'more' ? 'GREATER_OR_EQUAL' : 'LESS_OR_EQUAL',
      right: numberValue_V2(Number(selfDonOnField[1])),
    });
  }

  const leaderType = body.match(/\bif your Leader(?:'s type includes| has the) (?:\{([^}]+)\} type|"([^"]+)")/i);
  if (leaderType) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA'],
          cardCategories: ['LEADER'],
          types: { kind: 'TYPE_INCLUDES_TEXT', values: [leaderType[1] ?? leaderType[2]] },
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const leaderName = body.match(/\bif your Leader is \[([^\]]+)\]/i);
  if (leaderName) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA'],
          cardCategories: ['LEADER'],
          names: [{ kind: 'NAME_EXACT', value: leaderName[1] }],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  if (/\bif your Leader is multicolored/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['LEADER_AREA'],
          cardCategories: ['LEADER'],
          colors: { kind: 'HAS_ANY_COLOR', values: [] },
          quantity: { kind: 'ANY_NUMBER' },
          relations: ['MULTICOLORED'],
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const lifeCount = body.match(/\bif (you|your opponent) (?:have|has) (\d+) or (more|less) Life cards?/i);
  if (lifeCount) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          owner: lifeCount[1].toLowerCase() === 'you' ? 'PLAYER' : 'OPPONENT',
          zones: ['LIFE'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: lifeCount[3].toLowerCase() === 'more' ? 'GREATER_OR_EQUAL' : 'LESS_OR_EQUAL',
      right: numberValue_V2(Number(lifeCount[2])),
    });
  }

  const handCount = body.match(/\bif your opponent has (\d+) or (more|less) cards? in their hand/i);
  if (handCount) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          owner: 'OPPONENT',
          zones: ['HAND'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: handCount[2].toLowerCase() === 'more' ? 'GREATER_OR_EQUAL' : 'LESS_OR_EQUAL',
      right: numberValue_V2(Number(handCount[1])),
    });
  }

  const selfHandCount = body.match(/\bif you have (\d+) or (more|less) cards? in your hand/i);
  if (selfHandCount) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          owner: 'PLAYER',
          zones: ['HAND'],
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: selfHandCount[2].toLowerCase() === 'more' ? 'GREATER_OR_EQUAL' : 'LESS_OR_EQUAL',
      right: numberValue_V2(Number(selfHandCount[1])),
    });
  }

  if (/\bif your deck has 0 cards/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: { subject: 'CARD', owner: 'PLAYER', zones: ['DECK'], quantity: { kind: 'ANY_NUMBER' } },
      },
      operator: 'EQUAL',
      right: numberValue_V2(0),
    });
  }

  const opponentCharacterPower = body.match(/\bif your opponent has a Character with (\d+) power or (more|less)/i);
  if (opponentCharacterPower) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'CARD',
          controller: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          cardCategories: ['CHARACTER'],
          power: {
            propertyLayer: 'CURRENT',
            comparison: opponentCharacterPower[2].toLowerCase() === 'more' ? 'AT_LEAST' : 'AT_MOST',
            value: numberValue_V2(Number(opponentCharacterPower[1])),
          },
          quantity: { kind: 'ANY_NUMBER' },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const opponentLeaderOrCharacterBasePower = body.match(/\bif your opponent has a Leader or Character with a base power of (\d+) or more/i);
  if (opponentLeaderOrCharacterBasePower) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          ...leaderOrCharacterSelector_V2('OPPONENT', { kind: 'ANY_NUMBER' }),
          power: {
            propertyLayer: 'BASE',
            comparison: 'AT_LEAST',
            value: numberValue_V2(Number(opponentLeaderOrCharacterBasePower[1])),
          },
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const opponentCharacterCost = body.match(/\bif your opponent has a Character with a cost of (\d+)(?: or with a cost of (\d+) or more| or (more|less))?/i);
  if (opponentCharacterCost) {
    const selector: Selector_V2 = {
      subject: 'CARD',
      controller: 'OPPONENT',
      zones: ['CHARACTER_AREA'],
      cardCategories: ['CHARACTER'],
      quantity: { kind: 'ANY_NUMBER' },
    };
    if (opponentCharacterCost[2]) {
      selector.relations = [`COST_EQUALS_${opponentCharacterCost[1]}_OR_AT_LEAST_${opponentCharacterCost[2]}`];
    } else {
      selector.cost = {
        propertyLayer: 'CURRENT',
        comparison: opponentCharacterCost[3]?.toLowerCase() === 'more' ? 'AT_LEAST' : opponentCharacterCost[3]?.toLowerCase() === 'less' ? 'AT_MOST' : 'EQUAL',
        value: numberValue_V2(Number(opponentCharacterCost[1])),
      };
    }
    conditions.push({
      kind: 'PREDICATE',
      left: { kind: 'COUNT', selector },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const thatCardType = body.match(/\bif that card'?s type includes "([^"]+)"/i);
  if (thatCardType) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'ACTION_RESULT',
          relations: ['PREVIOUS_ACTION_TARGET'],
          types: { kind: 'TYPE_INCLUDES_TEXT', values: [thatCardType[1]] },
          quantity: exactly_V2(1),
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  const revealedCardCost = body.match(/\bif the revealed card has a cost of (\d+) or (less|more)/i);
  if (revealedCardCost) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          subject: 'ACTION_RESULT',
          relations: ['PREVIOUS_ACTION_TARGET'],
          cost: {
            propertyLayer: 'CURRENT',
            comparison: revealedCardCost[2].toLowerCase() === 'less' ? 'AT_MOST' : 'AT_LEAST',
            value: numberValue_V2(Number(revealedCardCost[1])),
          },
          quantity: exactly_V2(1),
        },
      },
      operator: 'GREATER_OR_EQUAL',
      right: numberValue_V2(1),
    });
  }

  if (/\bif the chosen Character has a cost equal to the number of DON!! cards given to it/i.test(body)) {
    conditions.push({
      kind: 'PREDICATE',
      left: {
        kind: 'CHOSEN_CHARACTER_COST',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'], quantity: exactly_V2(1) },
      },
      operator: 'EQUAL',
      right: {
        kind: 'COUNT',
        selector: { subject: 'DON', relations: ['ATTACHED_TO_SELECTED_PREVIOUSLY'], quantity: { kind: 'ANY_NUMBER' } },
      },
    });
  }

  return conditions;
}

function buildEffectDefinition_V2(cardNumber: string, effectIndex: number, segment: string): { effect: EffectDefinition_V2; atoms: ParsedAtomicEffect_V2[] } {
  const { tags, body } = peelLeadingTags_V2(segment);
  const tagInfo = classifyTags_V2(tags);
  const alternateResolution = buildAlternateResolutionEffect_V2(cardNumber, effectIndex, segment, tags, tagInfo, body);
  if (alternateResolution) return alternateResolution;

  const chooseOne = splitChooseOneBody_V2(body);
  const bodyForConditions = chooseOne ? chooseOne.prefix : body;
  const allowActivationCosts = tagInfo.category === 'ACTIVATE'
    || /:\s*/.test(bodyForConditions)
    || /\bfor every card trashed\b/i.test(bodyForConditions);
  const leadingConditionText = bodyForConditions.match(/^\s*(if\b[^,]*,)/i)?.[1];
  const leadingConditions = leadingConditionText && isPureConditionClause_V2(leadingConditionText)
    ? detectInlineConditions_V2(leadingConditionText)
    : [];
  const hasLeadingConditions = leadingConditions.length > 0;
  const bodyClauses = splitAtomicClauses_V2(bodyForConditions)
    .filter((clause) => !isInlineTimingOnlyClause_V2(clause) && !isPureConditionClause_V2(clause));
  const keywordTagClauses = tags.filter((tag) => tag in KEYWORD_TAGS_V2);
  const atomClauses = bodyClauses.length > 0 ? [...keywordTagClauses, ...bodyClauses] : keywordTagClauses;
  const atoms: ParsedAtomicEffect_V2[] = [];
  const activationCosts: CostAction_V2[] = [];
  const resolutionNodes: ResolutionNode_V2[] = [];
  let atomIndex = 0;
  let lastActionId: string | undefined;
  let activeInlineCondition: ConditionExpression_V2 | undefined;

  const parseClause = (clause: string): { node?: ResolutionNode_V2; costs?: CostAction_V2[] } => {
    const parsed = parseAtomicAction_V2(clause, { allowActivationCost: allowActivationCosts });
    const canonicalClassification = classifyUnrecognizedTextAgainstCanonical_V2(parsed.unrecognizedKind, clause);
    const atomId = `${cardNumber}#${effectIndex}.${atomIndex}`;
    atomIndex += 1;
    const semanticIssues = semanticIssuesForParsedAtom_V2(clause, parsed);
    atoms.push({
      id: atomId,
      cardNumber,
      effectIndex,
      atomIndex: atomIndex - 1,
      markerTags: tags,
      rawText: clause,
      normalizedText: collapseSpaces_V2(clause),
      ...(parsed.action
        ? {
            parsedAction: parsed.action,
            semanticStatus: semanticIssues.length > 0 ? 'needsAudit' : 'safe',
            ...(semanticIssues.length > 0 ? { semanticIssues } : {}),
            canonicalAtoms: canonicalAtomsForAction_V2(parsed.action),
            canonicalCoverage: 'canonical' as const,
            canonicalRemark: 'Parser emitted a canonical V2 atom.',
            coverage: 'coveredByParser' as const,
          }
        : parsed.costs?.length
          ? {
              parsedCost: parsed.costs[0],
              parsedCosts: parsed.costs,
              semanticStatus: semanticIssues.length > 0 ? 'needsAudit' : 'safe',
              ...(semanticIssues.length > 0 ? { semanticIssues } : {}),
              canonicalAtoms: ['ActivationCost'],
              canonicalCoverage: 'canonical' as const,
              canonicalRemark: 'Parser lifted this clause into activationCost.',
              coverage: 'coveredByParser' as const,
            }
        : {
            coverage: 'uncovered' as const,
            uncoveredReason: parsed.reason,
            unrecognizedKind: parsed.unrecognizedKind,
            trackingRemark: parsed.trackingRemark,
            canonicalAtoms: canonicalClassification.atoms,
            canonicalCoverage: canonicalClassification.coverage,
            canonicalRemark: canonicalClassification.remark,
          }),
    });
    if (parsed.action) {
      let node: ResolutionNode_V2 = actionNode_V2(parsed.action, atomId);
      if (isResultDependentClause_V2(clause) && lastActionId) {
        node = isNegativeResultDependentClause_V2(clause)
          ? { kind: 'IF_ACTION_SUCCEEDED', actionResult: lastActionId, then: { kind: 'NO_OP' }, else: node }
          : { kind: 'IF_ACTION_SUCCEEDED', actionResult: lastActionId, then: node };
      } else if (isInlineConditionalActionClause_V2(clause)) {
        const clauseCondition = andConditions_V2(detectInlineConditions_V2(clause));
        const duplicatesLeadingCondition = clauseCondition
          ? leadingConditions.some((condition) => conditionKey_V2(condition) === conditionKey_V2(clauseCondition))
          : false;
        if (clauseCondition && !duplicatesLeadingCondition) {
          activeInlineCondition = clauseCondition;
          node = { kind: 'IF', condition: clauseCondition, then: node };
        }
      } else if (activeInlineCondition) {
        node = { kind: 'IF', condition: activeInlineCondition, then: node };
      }
      lastActionId = atomId;
      return { node };
    }
    if (parsed.costs?.length) return { costs: parsed.costs };
    return {};
  };

  atomClauses.forEach((clause) => {
    const parsed = parseClause(clause);
    if (parsed.node) resolutionNodes.push(parsed.node);
    if (parsed.costs) activationCosts.push(...parsed.costs);
  });

  if (chooseOne) {
    const options = chooseOne.options.map((optionText) => {
      activeInlineCondition = undefined;
      const optionNodes = splitAtomicClauses_V2(optionText)
        .filter((clause) => !isInlineTimingOnlyClause_V2(clause) && !isPureConditionClause_V2(clause))
        .map((clause) => parseClause(clause).node)
        .filter((node): node is ResolutionNode_V2 => Boolean(node));
      const optionNode = sequence_V2(optionNodes);
      const optionCondition = andConditions_V2(detectInlineConditions_V2(optionText));
      return optionCondition && optionNode.kind !== 'IF' ? { kind: 'IF' as const, condition: optionCondition, then: optionNode } : optionNode;
    });
    activeInlineCondition = undefined;
    resolutionNodes.push({
      kind: 'CHOOSE',
      chooser: 'PLAYER',
      options,
      minimumChoices: 1,
      maximumChoices: 1,
    });
  }

  const conditions = andConditions_V2([
    ...tagInfo.conditions,
    ...leadingConditions,
  ]);
  const inlineTiming = detectInlineTiming_V2(body);
  const category = inlineTiming ? 'AUTO' : tagInfo.category;
  const timing = tagInfo.timing ?? 'ON_ENTER_PLAY';
  const resolution = sequence_V2(groupConsecutiveConditionals_V2(resolutionNodes));

  return {
    effect: {
      id: `${cardNumber}#${effectIndex}`,
      source: {
        objectRef: 'THIS_CARD',
        owner: 'PLAYER',
        controller: 'PLAYER',
        sourceZone: 'NONE',
        effectIndex,
      },
      category,
      applicationMode: category === 'PERMANENT' ? 'CONTINUOUS' : 'ONE_SHOT',
      activationZones: sourceZoneForCategory_V2(category),
      timing: inlineTiming ?? timing_V2(timing),
      ...(conditions ? { conditions } : {}),
      ...(activationCosts.length > 0
        ? {
            activationCost: {
              payments: activationCosts,
              optionalPayment: 'REQUIRED_TO_ACTIVATE',
              executionPolicy: 'VERIFY_ALL_THEN_PAY_IN_ORDER',
            },
          }
        : {}),
      optionality: optionalityFromText_V2(segment),
      resolution: category === 'PERMANENT' ? normalizePermanentResolution_V2(resolution) : resolution,
      metadata: {
        sourceCardNumber: cardNumber,
        effectIndex,
        printedText: segment,
        normalizedText: collapseSpaces_V2(segment),
        parserVersion: EFFECT_PARSER_VERSION_V2,
        authoringStatus: atoms.some((atom) => atom.coverage === 'uncovered') ? 'UNCOVERED' : 'PARSED_ONLY',
      },
    },
    atoms,
  };
}

export function parseCardEffect_V2(cardNumber: string, effectText: string): ParsedEffect_V2 {
  const rawText = effectText ?? '';
  const normalized = collapseSpaces_V2(rawText);
  if (normalized.length === 0) {
    return {
      schemaVersion: EFFECT_SCHEMA_VERSION_V2,
      parserVersion: EFFECT_PARSER_VERSION_V2,
      cardNumber,
      rawText,
      effects: [],
      atomicEffects: [],
      warnings: ['Card has no effect text.'],
    };
  }

  const warnings: string[] = [];
  const effects: EffectDefinition_V2[] = [];
  const atomicEffects: ParsedAtomicEffect_V2[] = [];
  splitEffectSegments_V2(normalized).forEach((segment, effectIndex) => {
    const compiled = buildEffectDefinition_V2(cardNumber, effectIndex, segment);
    effects.push(compiled.effect);
    atomicEffects.push(...compiled.atoms);
  });

  const unknownTags = findTags_V2(normalized)
    .map((hit) => hit.tag)
    .filter((tag) => !(tag in TIMING_TAGS_V2) && !(tag in KEYWORD_TAGS_V2) && !/\[DON!!\s*x\s*\d+\]/i.test(tag) && !/^\[(Your|Opponent's) Turn\]$/i.test(tag) && !/^\[Once Per Turn\]$/i.test(tag) && bracketCardNamesFromText_V2(tag).length === 0);
  for (const tag of new Set(unknownTags)) warnings.push(`Unknown V2 marker tag preserved as raw text: ${tag}`);

  return { schemaVersion: EFFECT_SCHEMA_VERSION_V2, parserVersion: EFFECT_PARSER_VERSION_V2, cardNumber, rawText, effects, atomicEffects, warnings };
}

export function buildCoverageReportFromParse_V2(parsed: ParsedEffect_V2): CardEffectCoverageReport_V2 {
  const statuses: AtomicCoverageStatus_V2[] = parsed.atomicEffects.map((atom) => ({
    atomicEffectId: atom.id,
    cardNumber: atom.cardNumber,
    effectIndex: atom.effectIndex,
    atomIndex: atom.atomIndex,
    rawText: atom.rawText,
    parserStatus: atom.coverage === 'coveredByParser' ? 'recognized' : 'unrecognized',
    assignmentStatus: 'unassigned',
    status: atom.coverage === 'coveredByParser' ? 'covered' : 'uncovered',
    coveredByAssignmentIds: [],
    ...(atom.canonicalAtoms ? { canonicalAtoms: atom.canonicalAtoms } : {}),
    ...(atom.canonicalCoverage ? { canonicalCoverage: atom.canonicalCoverage } : {}),
    ...(atom.canonicalRemark ? { canonicalRemark: atom.canonicalRemark } : {}),
    ...(atom.unrecognizedKind ? { unrecognizedKind: atom.unrecognizedKind } : {}),
    ...(atom.uncoveredReason ? { uncoveredReason: atom.uncoveredReason } : {}),
    ...(atom.trackingRemark ? { trackingRemark: atom.trackingRemark } : {}),
  }));

  return {
    schemaVersion: EFFECT_SCHEMA_VERSION_V2,
    generatedBy: 'effectCompiler_V2',
    cardNumber: parsed.cardNumber,
    totalAtomicEffects: statuses.length,
    parserRecognizedAtomicEffects: statuses.filter((status) => status.parserStatus === 'recognized').length,
    parserUnrecognizedAtomicEffects: statuses.filter((status) => status.parserStatus === 'unrecognized').length,
    assignmentCoveredAtomicEffects: 0,
    assignmentPartialAtomicEffects: 0,
    assignmentUncoveredAtomicEffects: statuses.length,
    coveredAtomicEffects: statuses.filter((status) => status.status === 'covered').length,
    partialAtomicEffects: 0,
    uncoveredAtomicEffects: statuses.filter((status) => status.status === 'uncovered').length,
    statuses,
  };
}
