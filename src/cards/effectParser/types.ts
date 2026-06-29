/**
 * Structured-but-INERT representation of a card's effect text.
 *
 * Scope and ground rules (consistent with docs/01 + docs/02 + project rules
 * #6/#7): this layer DESCRIBES effect text, it never EXECUTES it. The output
 * here is a draft / authoring aid for the future hand-authored effect-template
 * system (`/src/cards/effectTemplates`) — not a substitute for it. Nothing in
 * `/src/engine` consumes this as logic. Every clause whose meaning isn't
 * matched by a tight, unambiguous recognizer is preserved as raw text and
 * flagged `needsTemplate`, never guessed (project rule: "Never assume a rule
 * if it is not explicitly supported").
 *
 * The descriptive vocabulary intentionally reuses the engine's own timing /
 * condition / category enums (engine/events/effectHook.ts) so a parsed
 * ability lines up 1:1 with the `EffectHook` shape the engine already
 * declares — the parser fills in the "WHEN/UNDER WHAT CONDITION" half that
 * `EffectHook` describes, leaving the "WHAT it does" half (effectTemplateId)
 * for human authoring.
 */
import type { EffectCategory, EffectCondition, EffectTimingKeyword } from '../../engine/events/effectHook';

/** How long a drafted action's result lasts. 'unspecified' when the text gives no clear duration. */
export type EffectDuration =
  | 'thisBattle' // "during this battle"
  | 'thisTurn' // "during this turn"
  | 'whileConditionMet' // gated by a [DON!! xN]/[Your Turn]/etc. condition with no explicit end
  | 'permanent'
  | 'unspecified';

/**
 * Coarse target descriptor for a drafted action. Deliberately conservative:
 * targeting is where guessing is most dangerous, so anything not matched by a
 * tight phrase becomes `{ kind: 'unspecified', raw }` and forces needsReview.
 */
export type EffectTarget =
  | { kind: 'self' } // "this card" / "this Character"
  | { kind: 'allYourCharacters' }
  | { kind: 'allCharacters' }
  | { kind: 'yourCharacters' } // "your Characters" (not necessarily ALL)
  | { kind: 'opponentCharacters' } // "your opponent's Characters"
  | { kind: 'yourLeader' }
  | { kind: 'opponentLeader' }
  | { kind: 'upTo'; count: number; raw: string } // "Up to N of your ..." — scope kept raw
  | { kind: 'unspecified'; raw: string };

/**
 * A single drafted "atom" of effect behavior.
 *
 * Two confidence tiers, both honest about the project's no-guess rule:
 *  - COUNT-CLEARING ops (`draw`, `modifyPower`, `grantKeyword`): emitted only
 *    when the action AND its target are confidently pinned. These let a card
 *    drop out of `needsReview` because nothing about them is guessed.
 *  - HINT ops (`ko`, `rest`, `trash`, `donFromDeck`, `giveDon`, `returnToHand`,
 *    `modifyCost`, `lookTopDeck`, `playCard`, `lifeChange`): the verb + amount
 *    are recognized to accelerate hand-authoring, but they always carry
 *    `needsReview: true` because surrounding restrictions (cost/power
 *    thresholds, sources, ordering) aren't modeled — so the card STAYS flagged.
 *
 * `optional: true` marks an action that sat under "You may …" (2-8 optional).
 * `conditional: true` marks one gated by an unmodeled "If …" precondition —
 * which always forces `needsReview` (the condition would otherwise be silently
 * dropped). An atom is always a DESCRIPTION, never an executed function.
 */
export type EffectAction =
  | { op: 'draw'; amount: number; optional?: boolean; conditional?: boolean; needsReview?: boolean }
  | { op: 'modifyPower'; amount: number; target: EffectTarget; duration: EffectDuration; optional?: boolean; conditional?: boolean; needsReview?: boolean }
  | { op: 'modifyCost'; amount: number; target: EffectTarget; duration: EffectDuration; optional?: boolean; conditional?: boolean; needsReview?: boolean }
  | { op: 'grantKeyword'; keyword: string; target: EffectTarget; duration: EffectDuration; optional?: boolean; conditional?: boolean; needsReview?: boolean }
  | { op: 'ko'; target: EffectTarget; amount?: number; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'rest'; target: EffectTarget; amount?: number; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'returnToHand'; target: EffectTarget; amount?: number; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'trash'; from: 'hand' | 'self' | 'deck' | 'unspecified'; amount?: number; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'donFromDeck'; amount: number; rested: boolean; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'giveDon'; amount: number; target: EffectTarget; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'lookTopDeck'; amount: number; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'playCard'; amount?: number; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'lifeChange'; direction: 'add' | 'trash'; amount?: number; optional?: boolean; conditional?: boolean; needsReview: true }
  | { op: 'unrecognized'; rawText: string };

/** Best-effort structured cost. `raw` is always preserved; structured fields are added only when unambiguous. */
export interface EffectCost {
  /** e.g. donRequirement from [DON!! xN] is a CONDITION not a cost; this is for activation costs like "rest"/"trash". */
  raw: string;
}

/**
 * One ability parsed out of a card's text. Mirrors `EffectHook`
 * (engine/events/effectHook.ts) — same category/timing/condition vocabulary —
 * with the parser-specific additions (`tags`, `donRequirement`, `actions`,
 * `isTrigger`, `needsTemplate`, `rawText`).
 */
export interface ParsedAbility {
  /** `${cardNumber}#${index}` — stable within a card's parse. */
  id: string;
  /** 8-1-3 effect category, best-effort from the timing tag. */
  category: EffectCategory;
  /** 8-1-3-1-1 / 10-2 activation timing. 'custom' when no defined keyword applies (e.g. [Trigger], plain permanent text). */
  timing: EffectTimingKeyword;
  /** 8-3-2 / 10-2-x gating conditions, distinct from timing. */
  conditions: EffectCondition[];
  /** Raw bracket tags this ability was derived from, verbatim (e.g. ["[On Play]"], ["[DON!! x1]","[Your Turn]"]). Never lossy. */
  tags: string[];
  /** X from [DON!! xN], if present. */
  donRequirement?: number;
  /** 10-2-13 [Once Per Turn]. */
  oncePerTurn: boolean;
  /** True for a [Trigger] clause (2-11) — has no EffectTimingKeyword of its own, surfaced as a flag instead. */
  isTrigger: boolean;
  /** Best-effort activation cost; null when none detected. */
  cost: EffectCost | null;
  /** Drafted behavior atoms (see EffectAction). */
  actions: EffectAction[];
  /**
   * True when this ability still needs a hand-authored template before the
   * engine can act on it — i.e. it has no recognized actions, or any action
   * is `unrecognized`/`needsReview`. The engine/template author keys off this.
   */
  needsTemplate: boolean;
  /** The exact slice of card_text this ability came from (reminder text included). */
  rawText: string;
}

/** A non-fatal note about something the parser could not fully structure. JSON-serializable. */
export interface EffectParseWarning {
  code:
    | 'no-effect-text' // card has empty/whitespace text (2-8-5 "no base effect")
    | 'unrecognized-actions' // ability body matched no action recognizer
    | 'ambiguous-target' // a recognized action had an unclear target
    | 'reminder-text-stripped' // parenthetical reminder text removed before action parsing (2-8-4)
    | 'errata-note-stripped' // boilerplate like "This card has been officially errata'd." removed
    | 'unknown-tag'; // a [bracket] tag the parser doesn't recognize
  cardNumber: string;
  message: string;
}

/** Full parse result for one card number. */
export interface ParsedEffect {
  cardNumber: string;
  abilities: ParsedAbility[];
  warnings: EffectParseWarning[];
  /** True if ANY ability needsTemplate (or there are no abilities but there is text). Quick "is this card engine-ready" gate. */
  needsReview: boolean;
}
