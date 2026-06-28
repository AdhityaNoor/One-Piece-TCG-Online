/**
 * Draft "action atom" recognizers.
 *
 * Philosophy: recognize ONLY tight, unambiguous patterns. Everything else
 * becomes a single `{ op: 'unrecognized', rawText }` atom — the parser never
 * guesses what an unmatched clause does (project rule: don't assume rules).
 * Currently recognized, because their phrasing is stable across the card pool:
 *   - draw N card(s)
 *   - <target> gains +N power [duration]
 *   - <target> gains [Keyword]
 * KO / search / rest / give-DON / cost-payment recognizers are intentionally
 * NOT here yet — their targeting/phrasing varies too much to structure without
 * guessing. They surface as `unrecognized` and are tracked as future work.
 */
import { collapseSpaces } from './tags';
import type { EffectAction, EffectDuration, EffectTarget } from './types';

const POWER_RE = /\bgains?\s*\+\s*(\d+)\s*power\b/i;
const DRAW_RE = /\bdraws?\s+(\d+)\s+cards?\b/i;
const GRANT_KEYWORD_RE = /\bgains?\s*\[(Rush|Rush: Character|Blocker|Double Attack|Banish|Unblockable)\]/i;

/** Detects a duration phrase anywhere in the clause. */
function detectDuration(clause: string, conditionGated: boolean): EffectDuration {
  if (/during this battle/i.test(clause)) return 'thisBattle';
  if (/during this turn/i.test(clause)) return 'thisTurn';
  if (conditionGated) return 'whileConditionMet';
  return 'unspecified';
}

/**
 * Best-effort target from the words leading up to (or surrounding) an action
 * phrase. Conservative: unmatched => { kind: 'unspecified', raw }.
 */
function detectTarget(clause: string): EffectTarget {
  const c = clause.toLowerCase();
  if (/\ball of your characters\b/.test(c)) return { kind: 'allYourCharacters' };
  if (/\ball characters\b/.test(c)) return { kind: 'allCharacters' };
  // "this card" / "this Character" — self-reference.
  if (/\bthis (card|character|leader)\b/.test(c)) return { kind: 'self' };
  if (/\byour leader\b/.test(c) && !/character/.test(c)) return { kind: 'yourLeader' };
  const upTo = c.match(/up to (\d+)\b/);
  if (upTo) return { kind: 'upTo', count: Number(upTo[1]), raw: collapseSpaces(clause) };
  return { kind: 'unspecified', raw: collapseSpaces(clause) };
}

/**
 * Parses a single cleaned clause body (reminder text already stripped) into
 * draft atoms. `conditionGated` = the ability carried a [DON!! xN]/[Your Turn]
 * style condition, which informs default duration for an otherwise open-ended
 * power buff.
 */
export function parseActions(clauseBody: string, conditionGated: boolean): EffectAction[] {
  const body = collapseSpaces(clauseBody);
  if (body.length === 0) return [];

  const actions: EffectAction[] = [];
  let matchedAny = false;

  const draw = body.match(DRAW_RE);
  if (draw) {
    matchedAny = true;
    actions.push({ op: 'draw', amount: Number(draw[1]) });
  }

  const power = body.match(POWER_RE);
  if (power) {
    matchedAny = true;
    const target = detectTarget(body);
    actions.push({
      op: 'modifyPower',
      amount: Number(power[1]),
      target,
      duration: detectDuration(body, conditionGated),
      ...(target.kind === 'unspecified' ? { needsReview: true } : {}),
    });
  }

  const grant = body.match(GRANT_KEYWORD_RE);
  if (grant) {
    matchedAny = true;
    const target = detectTarget(body);
    actions.push({
      op: 'grantKeyword',
      keyword: grant[1],
      target,
      duration: detectDuration(body, conditionGated),
      ...(target.kind === 'unspecified' ? { needsReview: true } : {}),
    });
  }

  // If a recognizer fired but the clause clearly continues into other
  // sentences ("Then, ..."), the remainder is not structured — flag the whole
  // clause as still needing a template by also emitting an unrecognized atom
  // for the leftover, so partial recognition never masquerades as complete.
  if (matchedAny && /\bthen\b/i.test(body)) {
    const afterThen = body.slice(body.toLowerCase().indexOf('then'));
    actions.push({ op: 'unrecognized', rawText: collapseSpaces(afterThen) });
  }

  if (!matchedAny) {
    actions.push({ op: 'unrecognized', rawText: body });
  }

  return actions;
}

/** True if any action is unrecognized or flagged for review (=> the ability still needs a hand-authored template). */
export function actionsNeedTemplate(actions: EffectAction[]): boolean {
  if (actions.length === 0) return true;
  return actions.some((a) => a.op === 'unrecognized' || ('needsReview' in a && a.needsReview === true));
}
