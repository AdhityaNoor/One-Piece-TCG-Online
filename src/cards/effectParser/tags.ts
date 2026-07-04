/**
 * Bracket-tag tables and low-level text tokenizing for the effect parser.
 *
 * Card text encodes timing/condition/keyword metadata as `[...]` bracket
 * tags (Comprehensive Rules Section 10). This module knows the tag spellings;
 * it makes no behavioral decision — it only classifies tags and slices text.
 */
import type { EffectCategory, EffectTimingKeyword } from '../../engine/events/effectHook';

/**
 * Tags that START a new ability (an activation timing). Spellings are taken
 * verbatim from observed card_text. Section references in comments.
 */
export const TIMING_TAGS: Record<string, { timing: EffectTimingKeyword; category: EffectCategory }> = {
  '[On Play]': { timing: 'onPlay', category: 'auto' }, // 10-2-x / 8-1-3-1
  '[When Attacking]': { timing: 'whenAttacking', category: 'auto' },
  '[On Block]': { timing: 'onBlock', category: 'auto' },
  "[On Your Opponent's Attack]": { timing: 'onOpponentsAttack', category: 'auto' },
  '[On K.O.]': { timing: 'onKO', category: 'auto' }, // 10-2-17
  '[End of Your Turn]': { timing: 'endOfYourTurn', category: 'auto' },
  "[End of Your Opponent's Turn]": { timing: 'endOfOpponentsTurn', category: 'auto' },
  '[Activate: Main]': { timing: 'activateMain', category: 'activate' }, // 8-1-3-2
  '[Main]': { timing: 'activateMain', category: 'activate' }, // Event [Main]
  '[Counter]': { timing: 'counter', category: 'auto' }, // Event [Counter]
  '[Trigger]': { timing: 'lifeTrigger', category: 'auto' }, // 2-11 / 10-1-5-2
};

/** Ability keyword tags (10-1) that are abilities in their own right, not timings — e.g. a vanilla "[Blocker]" card. */
export const KEYWORD_TAGS = new Set<string>([
  '[Rush]',
  '[Rush: Character]',
  '[Blocker]',
  '[Double Attack]',
  '[Banish]',
  '[Unblockable]',
]);

/** Boilerplate sentences that are not effects and are stripped before parsing (kept in rawText, recorded as a warning). */
export const ERRATA_NOTES = [
  "This card has been officially errata'd.",
  'This card has been officially erratad.',
];

/** Matches a [DON!! xN] condition tag, capturing N. */
export const DON_REQUIREMENT_RE = /\[DON!!\s*x\s*(\d+)\]/i;

/** Matches a "DON!! −N" / "DON!! -N" cost-reduction condition (10-2-x), capturing N. */
export const DON_MINUS_RE = /DON!!\s*[−-]\s*(\d+)/;

/** Finds every top-level [bracket] tag occurrence with its position. Nested brackets are not expected in card_text. */
export interface TagHit {
  tag: string; // includes the brackets, verbatim
  index: number; // start offset in the source string
  endIndex: number; // offset just past the closing bracket
}

export function findTags(text: string): TagHit[] {
  const hits: TagHit[] = [];
  const re = /\[[^\]]+\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    hits.push({ tag: m[0], index: m.index, endIndex: m.index + m[0].length });
  }
  return hits;
}

/**
 * Removes parenthetical reminder text (2-8-4 — non-functional explanatory
 * notes) so action recognizers run on the operative text only. Returns the
 * cleaned string and whether anything was removed.
 */
export function stripReminderText(text: string): { cleaned: string; removed: boolean } {
  let removed = false;
  const cleaned = text.replace(/\(([^)]*)\)/g, () => {
    removed = true;
    return ' ';
  });
  return { cleaned: collapseSpaces(cleaned), removed };
}

/** Collapses runs of whitespace to single spaces and trims. */
export function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
