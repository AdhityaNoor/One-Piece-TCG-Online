/**
 * Layer 3 (UI board projection): the "why can't I do that?" statuses for one card on the field.
 *
 * Every entry here is a restriction the ENGINE already enforces and the board previously showed
 * no trace of — the affordance simply disappeared (or, worse, stayed and failed validation on
 * click) with nothing telling the player which card did it to them. Nothing in this module
 * decides legality: each status is read from the engine's own lookup in rules/shared/power.ts or
 * effects/effectNegation.ts, so the rule stays in Layers 1-2 and this file only labels the
 * verdict (see cardView.ts' header for the same contract on power/cost).
 *
 * Rules referenced:
 *  - 7-1-1-1 attack declaration ("this Character cannot attack") -> `cannotAttack`
 *  - 7-1-2-1 [Blocker] activation ("cannot activate [Blocker]")  -> `cannotBlock`
 *  - "this card cannot be rested" (blocks attacking, [Blocker], rest costs) -> `cannotRest`
 *  - 8-x effect negation ("negate the effect of that card")      -> `nullified`
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared/definitions';
import { findAttackRestrictionRecord, findBlockerRestrictionRecord, findRestRestrictionRecord, hasContinuousKeyword } from '../../engine/rules/shared/power';
import { findEffectNegationRecord } from '../../engine/effects/effectNegation';
import type { ContinuousEffectDuration, ContinuousEffectRecord, GameState } from '../../engine/state/game';

export type CardStatusKey = 'cannotAttack' | 'cannotBlock' | 'cannotRest' | 'nullified';

export interface CardStatus {
  key: CardStatusKey;
  /** Short all-caps board label. Kept to two words so it fits a card's width without scaling. */
  label: string;
  /** Long form for the tooltip / screen reader: what is blocked, by which card, for how long. */
  detail: string;
}

/** Zones a status can appear in. A card in hand/trash/deck has no restriction worth showing. */
const FIELD_ZONES = new Set(['leaderArea', 'characterArea', 'stageArea']);

const EMPTY: readonly CardStatus[] = Object.freeze([]);

/**
 * Human phrasing for a record's duration. Deliberately vague for 'permanent': the engine drops
 * the record when its source leaves the field, so "for the rest of the game" would be a stronger
 * claim than the rules support (project rule: never assert a rule the document does not).
 */
const DURATION_TEXT: Record<ContinuousEffectDuration, string> = {
  untilStartOfNextTurn: 'until the start of the next turn',
  endOfTurn: 'until the end of this turn',
  endOfOpponentsTurn: "until the end of the opponent's next turn",
  duringThisTurn: 'during this turn',
  duringThisBattle: 'during this battle',
  permanent: 'while the source stays in play',
};

/** "from Trafalgar Law, until the end of this turn" — the half of the tooltip that names the cause. */
function causeText(defs: CardDefinitionLookup, state: GameState, record: ContinuousEffectRecord): string {
  const source = state.cardsById[record.sourceInstanceId];
  const name = source ? defs[source.cardDefinitionId]?.name : undefined;
  const duration = DURATION_TEXT[record.duration];
  return name ? `from ${name}, ${duration}` : duration;
}

/**
 * Every status currently on `instanceId`, in a stable display order (attack, block, nullified).
 * Returns a shared frozen empty array for the overwhelmingly common no-status case so the board's
 * memoised tiles keep a stable reference and do not re-render on every projection.
 */
export function computeCardStatuses(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
): readonly CardStatus[] {
  const instance = state.cardsById[instanceId];
  if (!instance || !FIELD_ZONES.has(instance.currentZone)) return EMPTY;
  if (state.continuousEffects.length === 0) return EMPTY;

  const def = defs[instance.cardDefinitionId];
  const statuses: CardStatus[] = [];

  // 7-1-1-1. Only Leaders and Characters can declare an attack at all, so a Stage carrying an
  // attack restriction has nothing to report.
  if (def?.category === 'leader' || def?.category === 'character') {
    const record = findAttackRestrictionRecord(state, instanceId, defs);
    if (record) {
      statuses.push({
        key: 'cannotAttack',
        label: "Can't attack",
        detail: `Cannot declare an attack (${causeText(defs, state, record)}).`,
      });
    }
  }

  // 7-1-2-1. Shown only on a card that HAS [Blocker] — on anything else the restriction is real
  // but inert, and a badge would read as a new penalty rather than a cancelled one. On a Blocker
  // it is the opposite: the orange [Blocker] hexagon is still on the card while the engine
  // refuses the activation, so without this the tile actively lies.
  const hasBlocker = (def?.hasBlocker ?? false) || hasContinuousKeyword(defs, state, instanceId, 'blocker');
  if (hasBlocker) {
    const record = findBlockerRestrictionRecord(state, instanceId, defs);
    if (record) {
      statuses.push({
        key: 'cannotBlock',
        label: "Can't block",
        detail: `Cannot activate [Blocker] (${causeText(defs, state, record)}).`,
      });
    }
  }

  // "Cannot be rested". Resting is how a card attacks (7-1-1-1), how [Blocker] is activated
  // (7-1-2-1) and how a "rest this card:" cost is paid, so this one badge stands for all three —
  // shown on its own rather than as Can't attack + Can't block so the player can see it is ONE
  // lock (e.g. OP16-032 Boa Hancock) rather than two unrelated ones. Source-scoped records
  // ("cannot be rested by your opponent's effects") do not reach here: they never block a
  // self-rest, so findRestRestrictionRecord is called with no rest source.
  if (def?.category === 'leader' || def?.category === 'character') {
    const record = findRestRestrictionRecord(state, instanceId, defs);
    if (record) {
      statuses.push({
        key: 'cannotRest',
        label: "Can't rest",
        detail: `Cannot be rested (${causeText(defs, state, record)}) — so it cannot attack, activate [Blocker], or pay a "rest this card" cost.`,
      });
    }
  }

  // Effect negation. Gated on the card actually having printed text: a controller-wide negation
  // ("your [On Play] effects are negated") otherwise paints a badge on every vanilla Character.
  // `null` timing = "anything on this card is negated", so a timing-scoped negation still shows
  // (the tooltip is what says which timings) — see findEffectNegationRecord.
  if (def && def.text.trim().length > 0) {
    const record = findEffectNegationRecord(state, instanceId, null, defs);
    if (record) {
      const timings = record.effectNegation?.negatedTimings;
      const scope = timings?.length ? `${timings.join(', ')} effects are negated` : 'Effects are negated';
      statuses.push({
        key: 'nullified',
        label: 'Nullified',
        detail: `${scope} (${causeText(defs, state, record)}).`,
      });
    }
  }

  return statuses.length > 0 ? statuses : EMPTY;
}
