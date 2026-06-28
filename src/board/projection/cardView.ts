/**
 * Layer 3 (UI board projection): flattens a CardInstance + its CardDefinition
 * + its cosmetic image URL into the one read-only shape board components
 * render from. Nothing here is authoritative — `power`/`cost` are read via
 * the SAME computeCurrentPower/computeCurrentCost the engine itself uses
 * (rules/shared/power.ts), so the board never reimplements that math, but
 * this module still only ever produces display data, never a verdict on
 * legality (project rule: only Layers 1-2 decide legality/outcome).
 */
import type { CardCategory, Color, Orientation } from '../../engine/state/card';
import type { GameState } from '../../engine/state/game';
import { computeCurrentCost, computeCurrentPower, type CardDefinitionLookup } from '../../engine/rules/shared';

export interface CardView {
  instanceId: string;
  cardDefinitionId: string;
  name: string;
  category: CardCategory;
  cardNumber: string;
  colors: Color[];
  text: string;
  imageUrl: string | null;
  /** Leader/Character only; null for Event/Stage/DON!!. */
  power: number | null;
  /** Character/Stage/Event only; null for Leader/DON!!. */
  cost: number | null;
  /** Character only (printed Counter value 2-10, when present). */
  counter: number | null;
  /** Leader only. */
  life: number | null;
  orientation: Orientation | null;
  /** DON!! only — see card.ts CardInstance.donRested doc comment. */
  donRested: boolean;
  donAttachedCount: number;
  summoningSick: boolean;
  hasBlocker: boolean;
  hasRush: boolean;
  hasDoubleAttack: boolean;
  isUnblockable: boolean;
  hasTrigger: boolean;
  /** True if defs lookup was missing this card's definition — display fallback, never thrown (UI must stay resilient; see definitions.ts which DOES throw for the engine). */
  isUnknownDefinition: boolean;
}

export function buildCardView(
  defs: CardDefinitionLookup,
  state: GameState,
  images: Record<string, string | null>,
  instanceId: string
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
      imageUrl: null,
      power: null,
      cost: null,
      counter: null,
      life: null,
      orientation: instance?.orientation ?? null,
      donRested: instance?.donRested ?? false,
      donAttachedCount: instance?.donAttached.length ?? 0,
      summoningSick: instance?.summoningSick ?? false,
      hasBlocker: false,
      hasRush: false,
      hasDoubleAttack: false,
      isUnblockable: false,
      hasTrigger: false,
      isUnknownDefinition: true,
    };
  }

  const isPowerCard = def.category === 'leader' || def.category === 'character';
  const isCostCard = def.category === 'character' || def.category === 'stage' || def.category === 'event';

  return {
    instanceId,
    cardDefinitionId: instance.cardDefinitionId,
    name: def.name,
    category: def.category,
    cardNumber: def.cardNumber,
    colors: def.colors,
    text: def.text,
    imageUrl: images[instance.cardDefinitionId] ?? null,
    power: isPowerCard ? computeCurrentPower(defs, state, instanceId) : null,
    cost: isCostCard ? computeCurrentCost(defs, state, instanceId) : null,
    counter: def.category === 'character' ? def.counter ?? null : null,
    life: def.category === 'leader' ? def.life ?? null : null,
    orientation: instance.orientation,
    donRested: instance.donRested ?? false,
    donAttachedCount: instance.donAttached.length,
    summoningSick: instance.summoningSick,
    hasBlocker: def.hasBlocker,
    hasRush: def.hasRush,
    hasDoubleAttack: def.hasDoubleAttack,
    isUnblockable: def.isUnblockable,
    hasTrigger: def.hasTrigger,
    isUnknownDefinition: false,
  };
}
