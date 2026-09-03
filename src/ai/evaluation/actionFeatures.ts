/**
 * Features describing a (state, ACTION) pair — the input to the action policy.
 *
 * WHY THIS EXISTS SEPARATELY FROM positionFeatures.ts
 * Position features answer "how good is this board for me". Fitting them to
 * game outcomes produced a decent state evaluator that did NOT improve play
 * (see scripts/ai-sim/fitWeights.ts and the Stage 1 finding: a deliberately
 * SUICIDAL weight set still won 54.7% of its games, which means the position
 * evaluator was barely steering the CPU at all). What actually steers it is
 * actionEvaluator.ts — roughly sixty hand-picked constants that rank the legal
 * actions directly. Those constants are what a model fitted to human play can
 * inform, and they take an ACTION as input, not a board. Hence these features.
 *
 * THE LEARNING PROBLEM THIS SHAPE IMPLIES
 * Each decision is one legal set and one choice out of it. That is a discrete
 * choice problem, so the model is a conditional logit: a single shared weight
 * vector, softmaxed over whatever actions happened to be legal at that moment.
 * The immediate consequence, and the reason the feature list below looks the
 * way it does: ANY FEATURE THAT IS CONSTANT ACROSS ONE DECISION'S LEGAL SET
 * CANCELS OUT of that decision's likelihood and can never be fitted. "My Life
 * total" is such a feature — it is the same for every action I could take right
 * now. So Life appears here only INTERACTED with the action ("this attack is
 * declared while I am at low Life"), never on its own.
 *
 * COST CONTRACT
 * This runs once per legal action per decision, inside the CPU's turn budget,
 * so it must stay cheap: table lookups and arithmetic only. No engine
 * simulation, no cloning, no effect resolution. Anything that needs to know
 * what an action would DO belongs in the evaluator, not here.
 *
 * VISIBILITY CONTRACT
 * Offline fitting replays matches through a per-seat REDACTED view, so a
 * feature the acting seat could not actually see would be extractable during
 * training and missing (or wrong) at runtime. Every read below is either the
 * seat's own information or public — opponent hand size, never its contents.
 */
import type { GameAction } from '../../engine/actions/action';
import type { CardDefinitionLookup } from '../../engine/rules/shared/definitions';
import { getDefinition } from '../../engine/rules/shared/definitions';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import {
  opponentHandCount,
  ownActiveDonIds,
  ownFieldCardIds,
  ownHandIds,
  ownLifeCount,
  opponentLifeCount,
} from '../visibility/playerView';
import { analyzeCounterNeed, availableCounterPower } from './counterEfficiency';

/**
 * Feature order is the contract between the fitter and the runtime. Appending
 * is safe; REORDERING OR REMOVING SILENTLY INVALIDATES EVERY FITTED VECTOR,
 * which is why the fitted artifact records this list and the loader checks it.
 */
export const ACTION_FEATURE_KEYS = [
  // --- What kind of action is this? ---------------------------------------
  // PLAY_CHARACTER is the reference category and deliberately has no
  // indicator: with a shared weight vector, one type must be the zero point or
  // the indicators are collinear and the fit is unidentifiable.
  'isPassStep',
  'isEndMainPhase',
  'isDeclareAttack',
  'isGiveDon',
  'isPlayStage',
  'isEventMain',
  'isActivateEffect',
  'isBlocker',
  'isCounterCharacter',
  'isCounterEvent',
  'isResolveChoice',

  // --- Resource commitment ------------------------------------------------
  'donSpent',
  'donRemainingAfter',
  'spendsAllDon',
  'handSizeAfter',

  // --- The card being committed ------------------------------------------
  'subjectPower',
  'subjectCost',
  'subjectHasBlocker',
  'subjectHasRush',

  // --- Attack shape -------------------------------------------------------
  'attackTargetIsLeader',
  'attackPowerAdvantage',
  'attackKosTarget',
  'attackIntoActiveBlocker',
  'attackAtLowOwnLife',
  'attackNearOpponentLethal',

  // --- Defence shape ------------------------------------------------------
  'counterClosesDeficit',
  'counterOverkill',
  'counterHopeless',
  'counterDefendsLeader',
] as const;

export type ActionFeatureKey = (typeof ACTION_FEATURE_KEYS)[number];
export type ActionFeatures = Record<ActionFeatureKey, number>;

/** Starting Life, used only to normalise Life-derived interactions. */
const STARTING_LIFE_REFERENCE = 10;

function zeroFeatures(): ActionFeatures {
  const out = {} as ActionFeatures;
  for (const key of ACTION_FEATURE_KEYS) out[key] = 0;
  return out;
}

/**
 * Per-decision values that are the same for every candidate action. Computed
 * once and passed in, both because recomputing them per action is wasteful and
 * because it makes the "constant features cancel" rule above impossible to
 * violate by accident — nothing in here is emitted as a feature on its own.
 */
export interface ActionFeatureContext {
  state: GameState;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  playerId: string;
  activeDonCount: number;
  handSize: number;
  ownLife: number;
  opponentLife: number;
  opponentHandSize: number;
  /** Counter power still in hand, for the hopeless-counter feature. */
  availableCounter: number;
}

export function createActionFeatureContext(
  state: GameState,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  playerId: string,
): ActionFeatureContext {
  return {
    state,
    defs,
    registry,
    playerId,
    activeDonCount: ownActiveDonIds(state, playerId).length,
    handSize: ownHandIds(state, playerId).length,
    ownLife: ownLifeCount(state, playerId),
    opponentLife: opponentLifeCount(state, playerId),
    opponentHandSize: opponentHandCount(state, playerId),
    availableCounter: availableCounterPower(state, defs, playerId, registry),
  };
}

/**
 * Per-decision context, memoised on the state object.
 *
 * The scorer asks for one of these once per CANDIDATE ACTION, but everything in
 * it depends only on (state, seat) — so without a cache the hand is walked and
 * counter power re-totalled for every legal action, tens of times per decision.
 * Keyed on the state's identity: the engine hands out a new object for every
 * applied action, so a stale entry cannot outlive the position it describes.
 */
const contextCache = new WeakMap<GameState, Map<string, ActionFeatureContext>>();

export function actionFeatureContextFor(
  state: GameState,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  playerId: string,
): ActionFeatureContext {
  let bySeat = contextCache.get(state);
  if (!bySeat) {
    bySeat = new Map();
    contextCache.set(state, bySeat);
  }
  const hit = bySeat.get(playerId);
  if (hit) return hit;
  const built = createActionFeatureContext(state, defs, registry, playerId);
  bySeat.set(playerId, built);
  return built;
}

/** True when the opponent controls an Active Character with [Blocker]. */
function opponentHasActiveBlocker(ctx: ActionFeatureContext): boolean {
  const { state, defs, playerId } = ctx;
  for (const [id, instance] of Object.entries(state.cardsById)) {
    if (instance.controllerId === playerId) continue;
    if (instance.currentZone !== 'characterArea') continue;
    if (instance.orientation !== 'active') continue;
    const def = getDefinition(defs, instance);
    if (def.hasBlocker) return true;
    void id;
  }
  return false;
}

export function extractActionFeatures(
  ctx: ActionFeatureContext,
  action: GameAction,
): ActionFeatures {
  const f = zeroFeatures();
  const { state, defs, playerId } = ctx;

  // --- Type indicators ----------------------------------------------------
  switch (action.type) {
    case 'PASS_STEP': f.isPassStep = 1; break;
    case 'END_MAIN_PHASE': f.isEndMainPhase = 1; break;
    case 'DECLARE_ATTACK': f.isDeclareAttack = 1; break;
    case 'GIVE_DON': f.isGiveDon = 1; break;
    case 'PLAY_STAGE': f.isPlayStage = 1; break;
    case 'ACTIVATE_EVENT_MAIN': f.isEventMain = 1; break;
    case 'ACTIVATE_CARD_EFFECT': f.isActivateEffect = 1; break;
    case 'ACTIVATE_BLOCKER': f.isBlocker = 1; break;
    case 'ACTIVATE_COUNTER_CHARACTER': f.isCounterCharacter = 1; break;
    case 'ACTIVATE_COUNTER_EVENT': f.isCounterEvent = 1; break;
    case 'RESOLVE_PENDING_CHOICE': f.isResolveChoice = 1; break;
    default: break; // PLAY_CHARACTER is the reference category
  }

  // --- Resource commitment ------------------------------------------------
  const donSpent =
    'donInstanceIds' in action && Array.isArray(action.donInstanceIds)
      ? action.donInstanceIds.length
      : 0;
  f.donSpent = donSpent / 10;
  f.donRemainingAfter = Math.max(0, ctx.activeDonCount - donSpent) / 10;
  f.spendsAllDon = donSpent > 0 && donSpent >= ctx.activeDonCount ? 1 : 0;

  // Which actions consume a card from hand. Counters and Events leave hand too,
  // and "how empty does this leave me" is a real cost the CPU ignores today.
  const consumesHandCard =
    action.type === 'PLAY_CHARACTER' ||
    action.type === 'PLAY_STAGE' ||
    action.type === 'ACTIVATE_EVENT_MAIN' ||
    action.type === 'ACTIVATE_COUNTER_CHARACTER' ||
    action.type === 'ACTIVATE_COUNTER_EVENT';
  f.handSizeAfter = Math.max(0, ctx.handSize - (consumesHandCard ? 1 : 0)) / 10;

  // --- The card being committed ------------------------------------------
  const subjectId =
    'handCardInstanceId' in action && typeof action.handCardInstanceId === 'string'
      ? action.handCardInstanceId
      : 'attackerInstanceId' in action && typeof action.attackerInstanceId === 'string'
        ? action.attackerInstanceId
        : 'sourceInstanceId' in action && typeof action.sourceInstanceId === 'string'
          ? action.sourceInstanceId
          : null;

  if (subjectId) {
    const instance = state.cardsById[subjectId];
    if (instance) {
      const def = getDefinition(defs, instance);
      f.subjectCost = (def.baseCost ?? 0) / 10;
      f.subjectHasBlocker = def.hasBlocker ? 1 : 0;
      f.subjectHasRush = def.hasRush ? 1 : 0;
      // Power of a card still in hand has no board modifiers to apply, so the
      // printed value is the honest number; on board, ask the engine.
      f.subjectPower =
        (instance.currentZone === 'hand'
          ? (def.basePower ?? 0)
          : computeCurrentPower(defs, state, subjectId)) / 1000;
    }
  }

  // --- Attack shape -------------------------------------------------------
  if (action.type === 'DECLARE_ATTACK') {
    const attackerPower = computeCurrentPower(defs, state, action.attackerInstanceId);
    const target = state.cardsById[action.targetInstanceId];
    const targetPower = computeCurrentPower(defs, state, action.targetInstanceId);
    const targetIsLeader = target?.currentZone === 'leaderArea';

    f.attackTargetIsLeader = targetIsLeader ? 1 : 0;
    f.attackPowerAdvantage = (attackerPower - targetPower) / 1000;
    // 7-1-5: a Character is KO'd when the attack's power reaches its power. A
    // Leader never is — it loses Life instead — so this stays 0 there.
    f.attackKosTarget = !targetIsLeader && attackerPower >= targetPower ? 1 : 0;
    f.attackIntoActiveBlocker = opponentHasActiveBlocker(ctx) ? 1 : 0;
    // Interactions, not standalone Life terms — see the header note on why a
    // bare Life feature cannot be fitted here.
    f.attackAtLowOwnLife = ctx.ownLife <= 2 ? 1 : 0;
    f.attackNearOpponentLethal = targetIsLeader && ctx.opponentLife <= 2 ? 1 : 0;
  }

  // --- Defence shape ------------------------------------------------------
  const battle = state.currentBattle;
  if (battle && battle.step === 'counter') {
    const need = analyzeCounterNeed(state, defs, battle.targetInstanceId);
    if (need) {
      const defender = state.cardsById[battle.targetInstanceId];
      const defendingLeader = defender?.currentZone === 'leaderArea';

      let contributed = 0;
      if (action.type === 'ACTIVATE_COUNTER_CHARACTER' && subjectId) {
        const instance = state.cardsById[subjectId];
        if (instance) contributed = getDefinition(defs, instance).counter ?? 0;
      }
      if (contributed > 0) {
        // Interacted with the action, not emitted bare: "the Leader is being
        // attacked" is true for every candidate in this set and would cancel.
        f.counterDefendsLeader = defendingLeader ? 1 : 0;
        f.counterClosesDeficit = contributed >= need.deficit ? 1 : 0;
        f.counterOverkill = Math.max(0, contributed - need.deficit) / 1000;
        // The bug this whole feature exists to teach: spending counter power
        // that cannot possibly reach the deficit is strictly worse than
        // passing, because the attack connects either way.
        f.counterHopeless = ctx.availableCounter < need.deficit ? 1 : 0;
      }
    }
  }

  void ownFieldCardIds;
  return f;
}

export function actionFeaturesToVector(features: ActionFeatures): number[] {
  return ACTION_FEATURE_KEYS.map((key) => features[key]);
}
