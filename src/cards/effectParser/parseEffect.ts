/**
 * Top-level effect parser: raw `card_text` -> ParsedEffect.
 *
 * Pure, deterministic, JSON-serializable output. Imports only TYPES from the
 * engine (the timing/condition/category enums), never engine logic — same
 * one-directional boundary rule as /src/cards/normalization. Produces a
 * DESCRIPTION of the effect, never executes it (see types.ts header).
 *
 * Pipeline per card:
 *   1. Empty text  -> no abilities (2-8-5 "no base effect").
 *   2. Strip errata boilerplate (kept in raw, recorded as a warning).
 *   3. Segment the text at each ability-starting tag ([On Play], [Counter],
 *      [Trigger], ...). Leading condition tags attach to the first ability.
 *   4. Per segment: peel leading bracket tags -> conditions/timing/keywords;
 *      strip reminder text from the body (2-8-4); draft action atoms.
 */
import type { EffectCategory, EffectCondition, EffectTimingKeyword } from '../../engine/events/effectHook';
import { actionsNeedTemplate, parseActions } from './parseActions';
import {
  DON_MINUS_RE,
  DON_REQUIREMENT_RE,
  ERRATA_NOTES,
  KEYWORD_TAGS,
  TIMING_TAGS,
  collapseSpaces,
  findTags,
  stripReminderText,
} from './tags';
import type { EffectAction, EffectParseWarning, ParsedAbility, ParsedEffect } from './types';

const TRIGGER_TAG = '[Trigger]';

/** Indices in `text` where a new ability begins (a timing tag or [Trigger]). */
function abilityStartIndices(text: string): number[] {
  const starts: number[] = [];
  for (const hit of findTags(text)) {
    if (hit.tag in TIMING_TAGS || hit.tag === TRIGGER_TAG) starts.push(hit.index);
  }
  return starts;
}

/** Peels a leading run of whitespace-separated `[...]` tags off the front of a segment. */
function peelLeadingTags(segment: string): { tags: string[]; body: string } {
  const tags: string[] = [];
  let rest = segment;
  for (;;) {
    const trimmed = rest.replace(/^\s+/, '');
    if (!trimmed.startsWith('[')) {
      rest = trimmed;
      break;
    }
    const close = trimmed.indexOf(']');
    if (close === -1) {
      rest = trimmed;
      break;
    }
    tags.push(trimmed.slice(0, close + 1));
    rest = trimmed.slice(close + 1);
  }
  return { tags, body: rest };
}

interface ClassifiedTags {
  timing: EffectTimingKeyword;
  category: EffectCategory;
  conditions: EffectCondition[];
  donRequirement?: number;
  oncePerTurn: boolean;
  isTrigger: boolean;
  /** Leading keyword tags (e.g. a bare "[Blocker]") => self-granted keyword actions. */
  leadingKeywords: string[];
}

function classifyTags(tags: string[], cardNumber: string, warnings: EffectParseWarning[]): ClassifiedTags {
  const result: ClassifiedTags = {
    timing: 'custom',
    category: 'permanent',
    conditions: [],
    oncePerTurn: false,
    isTrigger: false,
    leadingKeywords: [],
  };
  let timingSet = false;

  for (const tag of tags) {
    if (tag in TIMING_TAGS) {
      if (!timingSet) {
        result.timing = TIMING_TAGS[tag].timing;
        result.category = TIMING_TAGS[tag].category;
        timingSet = true;
      }
      continue;
    }
    if (tag === TRIGGER_TAG) {
      result.isTrigger = true;
      if (!timingSet) result.category = 'auto';
      continue;
    }
    const donReq = tag.match(DON_REQUIREMENT_RE);
    if (donReq) {
      result.donRequirement = Number(donReq[1]);
      if (!result.conditions.includes('donAtLeastX')) result.conditions.push('donAtLeastX');
      continue;
    }
    if (DON_MINUS_RE.test(tag)) {
      if (!result.conditions.includes('donMinusX')) result.conditions.push('donMinusX');
      continue;
    }
    if (/^\[your turn\]$/i.test(tag)) {
      if (!result.conditions.includes('yourTurn')) result.conditions.push('yourTurn');
      continue;
    }
    if (/^\[opponent's turn\]$/i.test(tag)) {
      if (!result.conditions.includes('opponentsTurn')) result.conditions.push('opponentsTurn');
      continue;
    }
    if (/^\[once per turn\]$/i.test(tag)) {
      result.oncePerTurn = true;
      if (!result.conditions.includes('oncePerTurn')) result.conditions.push('oncePerTurn');
      continue;
    }
    if (KEYWORD_TAGS.has(tag)) {
      result.leadingKeywords.push(tag.slice(1, -1)); // strip brackets
      continue;
    }
    warnings.push({
      code: 'unknown-tag',
      cardNumber,
      message: `Unrecognized leading tag "${tag}" preserved but not classified.`,
    });
  }

  return result;
}

function parseSegment(segment: string, index: number, cardNumber: string, warnings: EffectParseWarning[]): ParsedAbility {
  const rawText = collapseSpaces(segment);
  const { tags, body } = peelLeadingTags(segment);
  const classified = classifyTags(tags, cardNumber, warnings);

  const conditionGated = classified.conditions.length > 0 || classified.donRequirement !== undefined;

  const { cleaned, removed } = stripReminderText(body);
  if (removed) {
    warnings.push({
      code: 'reminder-text-stripped',
      cardNumber,
      message: 'Parenthetical reminder text (2-8-4) removed before action parsing.',
    });
  }

  const actions: EffectAction[] = [];
  // A bare leading keyword (e.g. "[Blocker]") is a self-granted permanent keyword.
  for (const keyword of classified.leadingKeywords) {
    actions.push({ op: 'grantKeyword', keyword, target: { kind: 'self' }, duration: 'permanent' });
  }
  actions.push(...parseActions(cleaned, conditionGated));

  const needsTemplate = actionsNeedTemplate(actions);
  if (needsTemplate) {
    warnings.push({
      code: 'unrecognized-actions',
      cardNumber,
      message: `Ability "${rawText.slice(0, 60)}${rawText.length > 60 ? '…' : ''}" needs a hand-authored template.`,
    });
  }

  return {
    id: `${cardNumber}#${index}`,
    category: classified.category,
    timing: classified.timing,
    conditions: classified.conditions,
    tags,
    ...(classified.donRequirement !== undefined ? { donRequirement: classified.donRequirement } : {}),
    oncePerTurn: classified.oncePerTurn,
    isTrigger: classified.isTrigger,
    cost: null, // structured cost detection is future work; donRequirement is a CONDITION, not a cost.
    actions,
    needsTemplate,
    rawText,
  };
}

/** Parses one card's raw text into structured-but-inert ability descriptors. */
export function parseEffect(cardNumber: string, cardText: string): ParsedEffect {
  const warnings: EffectParseWarning[] = [];

  // 1. Strip errata boilerplate (record it, keep nothing executable on it).
  let working = cardText;
  for (const note of ERRATA_NOTES) {
    if (working.includes(note)) {
      working = working.split(note).join(' ');
      warnings.push({ code: 'errata-note-stripped', cardNumber, message: `Removed boilerplate: "${note}"` });
    }
  }
  working = working.trim();

  // 2. No effect text (2-8-5).
  if (working.length === 0) {
    warnings.push({ code: 'no-effect-text', cardNumber, message: 'Card has no base effect text.' });
    return { cardNumber, abilities: [], warnings, needsReview: false };
  }

  // 3. Segment at ability-start tags; the first ability absorbs any leading condition tags.
  const starts = abilityStartIndices(working);
  const cuts = starts.length === 0 ? [0] : [0, ...starts.slice(1)];

  const abilities: ParsedAbility[] = [];
  for (let i = 0; i < cuts.length; i++) {
    const from = cuts[i];
    const to = i + 1 < cuts.length ? cuts[i + 1] : working.length;
    const segment = working.slice(from, to);
    if (collapseSpaces(segment).length === 0) continue;
    abilities.push(parseSegment(segment, i, cardNumber, warnings));
  }

  const needsReview = abilities.some((a) => a.needsTemplate) || (abilities.length === 0 && working.length > 0);
  return { cardNumber, abilities, warnings, needsReview };
}
