/**
 * TRIAGE CLASSIFIER (capability bridge).
 *
 * Turns the inert parser's output (src/cards/effectParser) into a capability-aware
 * verdict: which catalog primitives a card maps to, and — when it can't be fully
 * expressed — the specific reason(s). This is the "compiler middle-end": the
 * parser is the front-end (English -> coarse ops), the capability registry is the
 * target ISA, and this module decides expressible / needsPrimitive / defer.
 *
 * It is DATA + pure functions only. It never executes card logic; buckets are
 * heuristic authoring guidance, not runtime behavior.
 */
import type { EffectAction, ParsedEffect } from '../../../effectParser/types';
import { EFFECT_PRIMITIVES } from './registry';

export type ParserOp = EffectAction['op'];

/**
 * Parser op -> the catalog fn that most directly expresses it (null = no catalog
 * primitive; the clause was `unrecognized`). Typed as a full Record so adding a
 * parser op without mapping it fails `npm run typecheck`.
 */
export const PARSER_OP_TO_CAPABILITY: Record<ParserOp, keyof typeof EFFECT_PRIMITIVES | null> = {
  draw: 'draw',
  modifyPower: 'addPower',
  modifyCost: 'addCost',
  grantKeyword: 'addKeyword',
  ko: 'ko',
  rest: 'rest',
  returnToHand: 'moveCards',
  trash: 'trashFromHand',
  donFromDeck: 'addDonFromDeck',
  giveDon: 'giveDon',
  lookTopDeck: 'searchTopDeck',
  playCard: 'playFromHand',
  lifeChange: 'moveCards',
  unrecognized: null,
};

export type ReasonClass = 'defer' | 'primitive';

export interface HardClauseRule {
  reason: string;
  /** 'defer' = needs real new engine capability; 'primitive' = one small addition unlocks it. */
  klass: ReasonClass;
  match: RegExp;
}

/**
 * Text patterns that block or complicate a clean mapping. Extend this list as new
 * card idioms show up — it is deliberately conservative (only well-known idioms).
 */
export const HARD_CLAUSE_RULES: HardClauseRule[] = [
  { reason: 'dynamic-scaling', klass: 'defer', match: /becomes the same as|for each|equal to the (number|total)/i },
  { reason: 'replacement-effect', klass: 'defer', match: /\binstead\b|would be (K\.O\.'d|removed)/i },
  { reason: 'custom-trigger', klass: 'defer', match: /This effect can be activated when|At the start of your (next )?turn|At the end of a battle|When (this|one of your|your) .*(is|are|becomes)/i },
  { reason: 'extra-turn', klass: 'defer', match: /take an extra turn/i },
  { reason: 'combined-total-gate', klass: 'primitive', match: /a total of \d|total (power|cost) of/i },
  { reason: 'attack-restriction', klass: 'primitive', match: /can attack Characters|can attack .*active|cannot attack/i },
  { reason: 'negate-effect', klass: 'primitive', match: /cannot activate \[|cannot be (removed|K\.O\.'d) by (your|effects)/i },
  { reason: 'opp-deck-manip', klass: 'primitive', match: /top of your opponent's deck|reveal 1 card from the top of your opponent's deck/i },
  { reason: 'self-power-gate', klass: 'primitive', match: /this Character has \d+ power or more/i },
  { reason: 'mixed-don-or-char-target', klass: 'primitive', match: /DON!! cards or Characters/i },
];

export type Bucket = 'expressible' | 'needsPrimitive' | 'defer';

export interface TriageVerdict {
  bucket: Bucket;
  /** Distinct catalog fns the parsed ops map to (draft hint). */
  capabilities: string[];
  /** Parser ops with no catalog mapping (unrecognized clauses). */
  unmappedOps: string[];
  /** Matched hard-clause reasons. */
  reasons: string[];
}

/** Collect the parser ops present across a parsed card's abilities. */
function opsOf(parsed: ParsedEffect): string[] {
  const ops: string[] = [];
  for (const ability of parsed.abilities) {
    for (const a of ability.actions) ops.push(a.op);
  }
  return ops;
}

/**
 * Classify a parsed card (already known NOT to be curated) into a triage bucket
 * with capability + reason detail. `text` is the raw effect text (for heuristics).
 */
export function classifyTriage(parsed: ParsedEffect, text: string): TriageVerdict {
  const ops = [...new Set(opsOf(parsed))];
  const capabilities = [
    ...new Set(
      ops
        .map((op) => PARSER_OP_TO_CAPABILITY[op as ParserOp])
        .filter((c): c is keyof typeof EFFECT_PRIMITIVES => c != null),
    ),
  ];
  const unmappedOps = ops.filter((op) => PARSER_OP_TO_CAPABILITY[op as ParserOp] == null);

  const matched = HARD_CLAUSE_RULES.filter((r) => r.match.test(text));
  const reasons = matched.map((r) => r.reason);

  let bucket: Bucket;
  if (matched.some((r) => r.klass === 'defer')) bucket = 'defer';
  else if (unmappedOps.length > 0 || matched.some((r) => r.klass === 'primitive')) bucket = 'needsPrimitive';
  else bucket = 'expressible';

  return { bucket, capabilities, unmappedOps, reasons };
}
