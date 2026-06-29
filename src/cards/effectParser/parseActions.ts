/**
 * Draft "action atom" recognizers.
 *
 * Pipeline: split an ability body into sentences, normalize each ("You may …"
 * optionality, leading bracket tags, "Then,"), then run a recognizer chain.
 *
 * Two tiers (see types.ts EffectAction):
 *  - COUNT-CLEARING (draw / modifyPower / grantKeyword): emitted only when the
 *    action AND target are confidently pinned, so the card can leave
 *    needsReview. A leading "If …" precondition forces needsReview (the
 *    condition would otherwise be silently dropped — a guess we refuse to make).
 *  - HINTS (ko / rest / trash / donFromDeck / giveDon / returnToHand /
 *    modifyCost / lookTopDeck / playCard / lifeChange): verb+amount recognized
 *    to accelerate authoring, but always needsReview (surrounding restrictions
 *    aren't modeled). A sentence matching NO recognizer becomes `unrecognized`.
 */
import { collapseSpaces } from './tags';
import type { EffectAction, EffectDuration, EffectTarget } from './types';

const WORD_NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
function toNum(w: string): number {
  const n = Number(w);
  return Number.isFinite(n) ? n : (WORD_NUM[w.toLowerCase()] ?? NaN);
}

function detectDuration(clause: string, conditionGated: boolean): EffectDuration {
  if (/during this battle/i.test(clause)) return 'thisBattle';
  if (/during this turn/i.test(clause)) return 'thisTurn';
  if (conditionGated) return 'whileConditionMet';
  return 'unspecified';
}

/** Best-effort target. Conservative: unmatched => { kind: 'unspecified', raw }. */
function detectTarget(clause: string): EffectTarget {
  const c = clause.toLowerCase();
  if (/all of your characters/.test(c)) return { kind: 'allYourCharacters' };
  if (/all characters/.test(c)) return { kind: 'allCharacters' };
  if (/this (card|character|leader)/.test(c)) return { kind: 'self' };
  if (/(your )?opponent'?s? leader/.test(c)) return { kind: 'opponentLeader' };
  if (/(your )?opponent'?s? characters?/.test(c)) return { kind: 'opponentCharacters' };
  const upTo = c.match(/up to (\d+)\b/);
  if (upTo) return { kind: 'upTo', count: Number(upTo[1]), raw: collapseSpaces(clause) };
  if (/your leader/.test(c)) return { kind: 'yourLeader' };
  if (/your characters?/.test(c)) return { kind: 'yourCharacters' };
  return { kind: 'unspecified', raw: collapseSpaces(clause) };
}

interface SentenceFlags {
  optional: boolean;
  conditional: boolean;
  conditionGated: boolean;
}

/**
 * Splits an ability body into sentence-ish clauses. Splits only on a
 * period/semicolon FOLLOWED by whitespace, so the "K.O." abbreviation
 * (normalized to "KO" first) and dotted card names like "Monkey.D.Luffy" are
 * not fragmented. A leading "Then," on a clause is stripped.
 */
function splitSentences(body: string): string[] {
  return body
    .replace(/K\.O\./gi, 'KO')
    .split(/(?<=[.;])\s+/)
    .map((s) => collapseSpaces(s).replace(/^then,?\s*/i, ''))
    .filter((s) => s.length > 0);
}

/** Recognize the count-clearing ops on one normalized sentence; null if none. */
function clearingOps(sentence: string, flags: SentenceFlags): EffectAction[] {
  const out: EffectAction[] = [];
  const c = sentence.toLowerCase();
  const needs = flags.conditional || undefined;
  const opt = flags.optional || undefined;

  const draw = c.match(/\bdraws?\s+(\d+|a|an|one|two|three)\s+cards?\b/);
  if (draw) out.push({ op: 'draw', amount: toNum(draw[1]), ...(opt ? { optional: true } : {}), ...(needs ? { conditional: true, needsReview: true } : {}) });

  const power = sentence.match(/([+\-−])\s?(\d{3,4})\s*power\b/i);
  if (power) {
    const target = detectTarget(sentence);
    const amount = (power[1] === '+' ? 1 : -1) * Number(power[2]);
    const review = needs || target.kind === 'unspecified' || undefined;
    out.push({ op: 'modifyPower', amount, target, duration: detectDuration(c, flags.conditionGated), ...(opt ? { optional: true } : {}), ...(flags.conditional ? { conditional: true } : {}), ...(review ? { needsReview: true } : {}) });
  }

  const cost = c.match(/([+\-−])\s?(\d+)\s*cost\b/) || (/costs?\s+(\d+)\s+less/.test(c) ? ['', '-', (c.match(/costs?\s+(\d+)\s+less/) as RegExpMatchArray)[1]] : null);
  if (cost) {
    const target = detectTarget(sentence);
    const amount = (cost[1] === '+' ? 1 : -1) * Number(cost[2]);
    const review = needs || target.kind === 'unspecified' || undefined;
    out.push({ op: 'modifyCost', amount, target, duration: detectDuration(c, flags.conditionGated), ...(opt ? { optional: true } : {}), ...(flags.conditional ? { conditional: true } : {}), ...(review ? { needsReview: true } : {}) });
  }

  const grant = sentence.match(/\bgains?\s*\[(Rush|Rush: Character|Blocker|Double Attack|Banish|Unblockable)\]/i);
  if (grant) {
    const target = detectTarget(sentence);
    const review = needs || target.kind === 'unspecified' || undefined;
    out.push({ op: 'grantKeyword', keyword: grant[1], target, duration: detectDuration(c, flags.conditionGated), ...(opt ? { optional: true } : {}), ...(flags.conditional ? { conditional: true } : {}), ...(review ? { needsReview: true } : {}) });
  }
  return out;
}

/** Recognize the HINT ops (always needsReview). */
function hintOps(sentence: string, flags: SentenceFlags): EffectAction[] {
  const out: EffectAction[] = [];
  const c = sentence.toLowerCase();
  const base = { ...(flags.optional ? { optional: true as const } : {}), ...(flags.conditional ? { conditional: true as const } : {}), needsReview: true as const };
  const upTo = (): number | undefined => {
    const m = c.match(/up to (\d+)/);
    return m ? Number(m[1]) : undefined;
  };

  if (/\bko\b\.?\s+(?:up to|\d|a |an |that|this|the |all|one|your|chosen)/.test(c)) out.push({ op: 'ko', target: detectTarget(sentence), amount: upTo(), ...base });
  // "rest" but not "the rest" (= remainder) and not "rested" alone.
  if (/\brest (up to \d+|\d+|it|that|this|your|all|one|the chosen)/.test(c)) out.push({ op: 'rest', target: detectTarget(sentence), amount: upTo(), ...base });
  if (/\btrash\b/.test(c)) {
    const from = /from your hand/.test(c) ? 'hand' : /this card/.test(c) ? 'self' : /from .* deck|top of your deck/.test(c) ? 'deck' : 'unspecified';
    const m = c.match(/trash\s+(\d+|a|an|one|two|three)\b/);
    out.push({ op: 'trash', from, ...(m ? { amount: toNum(m[1]) } : {}), ...base });
  }
  const donDeck = c.match(/add up to (\d+) don!! cards? from your don!! deck/);
  if (donDeck) out.push({ op: 'donFromDeck', amount: Number(donDeck[1]), rested: /and rest it|rest them|set it as rested/.test(c), ...base });
  const giveDon = c.match(/give up to (\d+) (?:rested )?don!! cards?/);
  if (giveDon) out.push({ op: 'giveDon', amount: Number(giveDon[1]), target: detectTarget(sentence), ...base });
  if (/return .*to (?:the |its |their )?(?:owner'?s? |your )?hand|return up to \d+/.test(c)) out.push({ op: 'returnToHand', target: detectTarget(sentence), amount: upTo(), ...base });
  const look = c.match(/look at (\d+) cards? from the top of your deck/);
  if (look) out.push({ op: 'lookTopDeck', amount: Number(look[1]), ...base });
  if (/\bplay (up to \d+|this card|\d+|a |1 )/.test(c)) out.push({ op: 'playCard', amount: upTo(), ...base });
  if (/add (?:\d+|up to \d+|the top) .*to (?:the top of )?your life|to your life area/.test(c)) out.push({ op: 'lifeChange', direction: 'add', amount: upTo(), ...base });
  if (/trash .*(?:from .* life|life cards?)/.test(c)) out.push({ op: 'lifeChange', direction: 'trash', amount: upTo(), ...base });
  return out;
}

/**
 * Parses a cleaned clause body (reminder text already stripped) into draft
 * atoms. `conditionGated` = the ability carried a [DON!! xN]/[Your Turn]-style
 * bracket condition (informs default duration; distinct from inline "If …").
 */
export function parseActions(clauseBody: string, conditionGated: boolean): EffectAction[] {
  const body = collapseSpaces(clauseBody);
  if (body.length === 0) return [];

  const actions: EffectAction[] = [];
  for (const sentenceRaw of splitSentences(body)) {
    const optional = /\byou may\b/i.test(sentenceRaw);
    const conditional = /\bif (you|your|this|the|an?|there|a )/i.test(sentenceRaw);
    // Strip optionality wording for matching; keep everything else verbatim.
    const sentence = collapseSpaces(sentenceRaw.replace(/\byou may\b/gi, ''));
    const flags: SentenceFlags = { optional, conditional, conditionGated };

    const matched = [...clearingOps(sentence, flags), ...hintOps(sentence, flags)];
    if (matched.length > 0) actions.push(...matched);
    else actions.push({ op: 'unrecognized', rawText: sentenceRaw });
  }
  return actions;
}

/** True if any action is unrecognized or flagged for review (=> still needs a hand-authored template). */
export function actionsNeedTemplate(actions: EffectAction[]): boolean {
  if (actions.length === 0) return true;
  return actions.some((a) => a.op === 'unrecognized' || ('needsReview' in a && a.needsReview === true));
}
