/**
 * Power/cost resolution. Source of truth: 2-6 (power), 2-7 (cost),
 * 6-5-5-2 (+1000 per attached DON!! during its owner's turn), 7-1-3-2-1
 * (Counter Character "during this battle" boost), 8-1-3-3
 * (permanent/continuous effects).
 *
 * Card-effect power modifiers ARE now read, via GameState.continuousEffects'
 * structured `powerModifier` payload (see game.ts). Each modifier's optional
 * condition ([DON!! xN], [Your Turn]/[Opponent's Turn]) is re-evaluated here on
 * every read, so a conditional buff turns on/off as DON!! attaches or the turn
 * flips, with no extra bookkeeping. Cost modifiers use the same record model.
 */
import type { ContinuousEffectRecord, ContinuousKeyword, ContinuousPowerCondition, GameState, PowerAuraGroup, PowerScale, SourceStateCondition } from '../../state/game';
import { type CardDefinitionLookup, getDefinition } from './definitions';
import { evaluateGates } from '../../effects/gates';

/** True if any of `types` (possibly slash/comma-joined tribal strings) includes `required` (case-insensitive substring). */
function typeIncludes(types: string[], required: string): boolean {
  const needle = required.toLowerCase();
  return types.some((t) =>
    t
      .split(/[\/,]+/)
      .map((p) => p.trim().toLowerCase())
      .some((p) => p.includes(needle)),
  );
}

/** True if `instanceId` is in the aura's dynamic target set (owner's Leader/Characters, optionally type-filtered). */
function targetInAuraGroup(group: PowerAuraGroup, record: ContinuousEffectRecord, state: GameState, instanceId: string, defs: CardDefinitionLookup): boolean {
  const target = state.cardsById[instanceId];
  if (!target) return false;
  if (group.opponentCharacters) {
    if (target.currentZone !== 'characterArea') return false;
    if (target.controllerId === record.ownerId) return false;
  } else {
    if (target.controllerId !== record.ownerId) return false;
    if (target.currentZone !== 'leaderArea' && target.currentZone !== 'characterArea') return false;
  }
  if (group.charactersOnly && target.currentZone === 'leaderArea') return false;
  if (group.anyOfTypes !== undefined) {
    const def = getDefinition(defs, target);
    if (!group.anyOfTypes.some((t) => typeIncludes(def.types, t))) return false;
  }
  return true;
}

/** Gate evaluated against the modifier's SOURCE card, re-checked on every read. */
function sourceConditionApplies(cond: SourceStateCondition | undefined, record: ContinuousEffectRecord, state: GameState): boolean {
  if (!cond) return true;
  const src = state.cardsById[record.sourceInstanceId];
  if (!src) return false;
  if (cond.rested !== undefined && (src.orientation === 'rested') !== cond.rested) return false;
  if (cond.donAttachedAtLeast !== undefined && src.donAttached.length < cond.donAttachedAtLeast) return false;
  if (cond.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === src.ownerId;
    if (cond.turn === 'your' && !isOwnersTurn) return false;
    if (cond.turn === 'opponent' && isOwnersTurn) return false;
  }
  return true;
}

function conditionApplies(cond: ContinuousPowerCondition | undefined, record: ContinuousEffectRecord, state: GameState, instanceId: string, defs: CardDefinitionLookup): boolean {
  if (!cond) return true;
  const instance = state.cardsById[instanceId];
  if (cond.donAttachedAtLeast !== undefined && instance.donAttached.length < cond.donAttachedAtLeast) return false;
  if (cond.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === instance.ownerId;
    if (cond.turn === 'your' && !isOwnersTurn) return false;
    if (cond.turn === 'opponent' && isOwnersTurn) return false;
  }
  // "If <board state>" gate, re-evaluated each read against the modifier's owner.
  if (cond.gate && !evaluateGates(cond.gate, state, defs, record.ownerId)) return false;
  return true;
}

function powerModifierApplies(record: ContinuousEffectRecord, state: GameState, instanceId: string, defs: CardDefinitionLookup): boolean {
  const mod = record.powerModifier;
  if (!mod) return false;
  // Target selection: a single fixed instance, or a dynamic aura group.
  if (mod.appliesToInstanceId !== undefined) {
    if (mod.appliesToInstanceId !== instanceId) return false;
  } else if (mod.appliesToGroup !== undefined) {
    if (!targetInAuraGroup(mod.appliesToGroup, record, state, instanceId, defs)) return false;
  } else {
    return false;
  }
  // Target-side gate (existing semantics) AND source-side gate (auras / source-state).
  return conditionApplies(mod.condition, record, state, instanceId, defs) && sourceConditionApplies(mod.sourceCondition, record, state);
}

function costModifierApplies(record: ContinuousEffectRecord, state: GameState, instanceId: string, defs: CardDefinitionLookup): boolean {
  const mod = record.costModifier;
  if (!mod || mod.appliesToInstanceId !== instanceId) return false;
  return conditionApplies(mod.condition, record, state, instanceId, defs);
}

function keywordModifierApplies(record: ContinuousEffectRecord, state: GameState, instanceId: string, keyword: ContinuousKeyword, defs: CardDefinitionLookup): boolean {
  const mod = record.keywordModifier;
  if (!mod || mod.appliesToInstanceId !== instanceId || mod.keyword !== keyword) return false;
  return conditionApplies(mod.condition, record, state, instanceId, defs);
}


/** Dynamic "+X for every N of <source>" term, counted against the modifier's owner. */
function scaleAmount(scale: PowerScale | undefined, ownerId: string, state: GameState, defs: CardDefinitionLookup): number {
  if (!scale) return 0;
  const player = state.players[ownerId];
  if (!player) return 0;
  let count = 0;
  switch (scale.per) {
    case 'controllerHand':
      count = player.hand.cardIds.length;
      break;
    case 'controllerTrash':
      count = player.trash.cardIds.length;
      break;
    case 'controllerTrashEvents':
      count = player.trash.cardIds.filter((id) => defs[state.cardsById[id]?.cardDefinitionId ?? '']?.category === 'event').length;
      break;
    case 'controllerRestedDon': {
      const attached = new Set<string>();
      for (const inst of Object.values(state.cardsById)) {
        if (inst.controllerId !== ownerId) continue;
        for (const d of inst.donAttached) attached.add(d);
      }
      count = player.costArea.cardIds.filter((id) => state.cardsById[id]?.donRested === true && !attached.has(id)).length;
      break;
    }
  }
  return scale.step > 0 ? Math.floor(count / scale.step) * scale.amountPer : 0;
}

export function computeCurrentPower(defs: CardDefinitionLookup, state: GameState, instanceId: string): number {
  const instance = state.cardsById[instanceId];
  const def = getDefinition(defs, instance);
  let base = def.basePower ?? 0;
  const donBonus = state.activePlayerId === instance.ownerId ? instance.donAttached.length * 1000 : 0; // 6-5-5-2
  const battleBonus = state.currentBattle?.battlePowerBonuses[instanceId] ?? 0; // 7-1-3-2-1
  let continuousBonus = 0; // 8-1-3-3 card-effect power modifiers
  for (const record of state.continuousEffects) {
    if (!powerModifierApplies(record, state, instanceId, defs)) continue;
    const mod = record.powerModifier!;
    if (mod.setBase !== undefined) {
      // "base power becomes N" (2-6): overwrite the base. Last applicable set wins,
      // since continuousEffects is in append (recalculation) order (8-1-3-3-5).
      base = mod.setBase;
    } else {
      continuousBonus += mod.amount + scaleAmount(mod.scale, record.ownerId, state, defs);
    }
  }
  return base + donBonus + battleBonus + continuousBonus;
}

export function computeCurrentCost(defs: CardDefinitionLookup, state: GameState, instanceId: string): number {
  const instance = state.cardsById[instanceId];
  const def = getDefinition(defs, instance);
  let base = def.baseCost ?? 0;
  let continuousDelta = 0;
  for (const record of state.continuousEffects) {
    if (!costModifierApplies(record, state, instanceId, defs)) continue;
    const mod = record.costModifier!;
    // "base cost becomes N" (2-7): overwrite the base; last applicable set wins.
    if (mod.setBase !== undefined) base = mod.setBase;
    else continuousDelta += mod.amount;
  }
  return Math.max(0, base + continuousDelta);
}

export function hasContinuousKeyword(defs: CardDefinitionLookup, state: GameState, instanceId: string, keyword: ContinuousKeyword): boolean {
  return state.continuousEffects.some((record) => keywordModifierApplies(record, state, instanceId, keyword, defs));
}

/**
 * Whether `instanceId` currently cannot be K.O.'d for the given `cause`
 * (re-evaluated per K.O. attempt). A 'battle'-scope immunity only blocks battle
 * K.O.s (7-1-4-2); an 'any'-scope immunity blocks any K.O. source. Each modifier's
 * optional condition ([DON!! xN] / turn / board gate) must also hold.
 */
export function isKoImmune(defs: CardDefinitionLookup, state: GameState, instanceId: string, cause: 'battle' | 'effect'): boolean {
  return state.continuousEffects.some((record) => {
    const mod = record.koImmunityModifier;
    if (!mod || mod.appliesToInstanceId !== instanceId) return false;
    if (mod.scope === 'battle' && cause !== 'battle') return false;
    if (mod.scope === 'effect' && cause !== 'effect') return false;
    // "by Leaders/Characters": the current battle's attacker must be of that category.
    if (mod.attackerCategory !== undefined) {
      const attackerId = state.currentBattle?.attackerInstanceId;
      const attackerDef = attackerId ? defs[state.cardsById[attackerId]?.cardDefinitionId ?? ''] : undefined;
      if (attackerDef?.category !== mod.attackerCategory) return false;
    }
    return conditionApplies(mod.condition, record, state, instanceId, defs);
  });
}

/**
 * Whether `instanceId` currently cannot declare an attack (7-1-1-1) due to a card-effect
 * restriction (e.g. "cannot attack until the end of your opponent's next turn"). Distinct
 * from the innate summoning-sickness check (3-7-4), which declareAttack.ts checks separately.
 */
export function cannotAttack(state: GameState, instanceId: string): boolean {
  return state.continuousEffects.some((record) => record.attackRestriction?.appliesToInstanceId === instanceId);
}
