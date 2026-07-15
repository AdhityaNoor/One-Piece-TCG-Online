/**
 * Layer 3 (UI board projection): flattens a CardInstance + its CardDefinition
 * + its cosmetic image URL into the one read-only shape board components
 * render from. Nothing here is authoritative — `power`/`cost` are read via
 * the SAME computeCurrentPower/computeCurrentCost the engine itself uses
 * (rules/shared/power.ts), so the board never reimplements that math, but
 * this module still only ever produces display data, never a verdict on
 * legality (project rule: only Layers 1-2 decide legality/outcome).
 */
import type { CardCategory, Color, FaceState, Orientation } from '../../engine/state/card';
import type { GameState } from '../../engine/state/game';
import { computeCurrentCost, computeCurrentPower, hasContinuousKeyword, type CardDefinitionLookup } from '../../engine/rules/shared';
import {
  computeProjectedCostWithV2,
  computeProjectedPowerWithV2,
  hasProjectedKeywordWithV2,
  type V2ProjectionContext,
} from '../../engine/effects_V2/projectionAdapter_V2';

export interface CardView {
  instanceId: string;
  cardDefinitionId: string;
  name: string;
  category: CardCategory;
  cardNumber: string;
  colors: Color[];
  text: string;
  /** The card's [Trigger] text if it has one (from the definition), else null. */
  triggerText: string | null;
  imageUrl: string | null;
  /** Leader/Character only; null for Event/Stage/DON!!. */
  power: number | null;
  /** Printed/base power before DON!!, counter, and continuous modifiers. */
  basePower: number | null;
  /** Current power minus basePower; positive values are shown as a floating buff label. */
  powerDelta: number | null;
  /** Character/Stage/Event only; null for Leader/DON!!. */
  cost: number | null;
  /** Printed/base cost before continuous modifiers. */
  baseCost: number | null;
  /** Current cost minus baseCost; shown as a compact floating cost modifier label. */
  costDelta: number | null;
  /** Character only (printed Counter value 2-10, when present). */
  counter: number | null;
  /** Leader only. */
  life: number | null;
  orientation: Orientation | null;
  /**
   * 'faceUp' | 'faceDown'. Only meaningful for cards sitting in a Life area —
   * a Life card turned face-up by an effect (e.g. "turn the top Life card
   * face-up") should show its real art on the Life stack instead of a card
   * back. Every other zone's cards are always face-up by construction (hand,
   * field, trash are never face-down), so this is a no-op there.
   */
  faceState: FaceState;
  /** DON!! only — see card.ts CardInstance.donRested doc comment. */
  donRested: boolean;
  donAttachedCount: number;
  donAttachedIds: string[];
  /** Effect ids used by this instance this turn; UI-only for reminders, engine remains authoritative. */
  oncePerTurnUsed: string[];
  summoningSick: boolean;
  hasBlocker: boolean;
  hasRush: boolean;
  hasDoubleAttack: boolean;
  hasBanish: boolean;
  isUnblockable: boolean;
  hasTrigger: boolean;
  /** True if defs lookup was missing this card's definition — display fallback, never thrown (UI must stay resilient; see definitions.ts which DOES throw for the engine). */
  isUnknownDefinition: boolean;
}

export function buildCardView(
  defs: CardDefinitionLookup,
  state: GameState,
  images: Record<string, string | null>,
  instanceId: string,
  v2Projection?: V2ProjectionContext,
): CardView {
  const instance = state.cardsById[instanceId];
  const def = instance ? defs[instance.cardDefinitionId] : undefined;

  if (!instance || !def) {
    return {
      instanceId,
      cardDefinitionId: instance?.cardDefinitionId ?? 'unknown',
      name: 'Unknown card',
      category: 'character',
      cardNumber: '???',
      colors: [],
      text: '',
      triggerText: null,
      imageUrl: null,
      power: null,
      basePower: null,
      powerDelta: null,
      cost: null,
      baseCost: null,
      costDelta: null,
      counter: null,
      life: null,
      orientation: instance?.orientation ?? null,
      faceState: instance?.faceState ?? 'faceUp',
      donRested: instance?.donRested ?? false,
      donAttachedCount: instance?.donAttached.length ?? 0,
      donAttachedIds: instance?.donAttached ?? [],
      oncePerTurnUsed: instance?.oncePerTurnUsed ?? [],
      summoningSick: instance?.summoningSick ?? false,
      hasBlocker: false,
      hasRush: false,
      hasDoubleAttack: false,
      hasBanish: false,
      isUnblockable: false,
      hasTrigger: false,
      isUnknownDefinition: true,
    };
  }

  const isPowerCard = def.category === 'leader' || def.category === 'character';
  const isCostCard = def.category === 'character' || def.category === 'stage' || def.category === 'event';

  const power = isPowerCard
    ? v2Projection?.sidecars ? computeProjectedPowerWithV2(defs, state, instanceId, v2Projection) : computeCurrentPower(defs, state, instanceId)
    : null;
  const basePower = isPowerCard ? def.basePower ?? 0 : null;
  const cost = isCostCard
    ? v2Projection?.sidecars ? computeProjectedCostWithV2(defs, state, instanceId, v2Projection) : computeCurrentCost(defs, state, instanceId)
    : null;
  const baseCost = isCostCard ? def.baseCost ?? 0 : null;
  const hasV2Projection = Boolean(v2Projection?.sidecars);
  const v2Rush = hasProjectedKeywordWithV2(defs, state, instanceId, 'rush', v2Projection);
  const v2Blocker = hasProjectedKeywordWithV2(defs, state, instanceId, 'blocker', v2Projection);
  const v2DoubleAttack = hasProjectedKeywordWithV2(defs, state, instanceId, 'doubleAttack', v2Projection);
  const v2Banish = hasProjectedKeywordWithV2(defs, state, instanceId, 'banish', v2Projection);
  const v2Unblockable = hasProjectedKeywordWithV2(defs, state, instanceId, 'unblockable', v2Projection);

  return {
    instanceId,
    cardDefinitionId: instance.cardDefinitionId,
    name: def.name,
    category: def.category,
    cardNumber: def.cardNumber,
    colors: def.colors,
    text: def.text,
    triggerText: def.triggerText ?? null,
    imageUrl: images[instance.cardDefinitionId] ?? null,
    power,
    basePower,
    powerDelta: power !== null && basePower !== null ? power - basePower : null,
    cost,
    baseCost,
    costDelta: cost !== null && baseCost !== null ? cost - baseCost : null,
    counter: def.category === 'character' ? def.counter ?? null : null,
    life: def.category === 'leader' ? def.life ?? null : null,
    orientation: instance.orientation,
    faceState: instance.faceState,
    donRested: instance.donRested ?? false,
    donAttachedCount: instance.donAttached.length,
    donAttachedIds: instance.donAttached,
    oncePerTurnUsed: instance.oncePerTurnUsed,
    summoningSick: instance.summoningSick,
    hasBlocker: hasV2Projection ? v2Blocker ?? def.hasBlocker : def.hasBlocker || hasContinuousKeyword(defs, state, instanceId, 'blocker'),
    hasRush: hasV2Projection ? v2Rush ?? def.hasRush : def.hasRush || hasContinuousKeyword(defs, state, instanceId, 'rush'),
    hasDoubleAttack: hasV2Projection ? v2DoubleAttack ?? def.hasDoubleAttack : def.hasDoubleAttack || hasContinuousKeyword(defs, state, instanceId, 'doubleAttack'),
    hasBanish: hasV2Projection ? v2Banish ?? (def.hasBanish ?? false) : (def.hasBanish ?? false) || hasContinuousKeyword(defs, state, instanceId, 'banish'),
    isUnblockable: hasV2Projection ? v2Unblockable ?? def.isUnblockable : def.isUnblockable || hasContinuousKeyword(defs, state, instanceId, 'unblockable'),
    hasTrigger: def.hasTrigger,
    isUnknownDefinition: false,
  };
}
