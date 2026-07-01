/**
 * The effect COMPILER front-end: card text -> EffectProgram IR.
 *
 * Pipeline: effect text --(parseEffect)--> parsed abilities + draft atoms
 * --(compileAbility)--> data-only IR ops that the engine's generic interpreter
 * runs. There is NO per-card code: a card becomes supported when the compiler
 * can lower its parsed effect to IR. Patterns the compiler can't yet lower are
 * dropped (the card stays unsupported) — never guessed into wrong behavior.
 *
 * Coverage grows by teaching the compiler new lowerings here, which then apply
 * to every card matching the pattern — not by hand-writing cards.
 */
import { parseEffect, type ParsedAbility } from '../effectParser';
import type { Ability, AbilityCost, AbilityGate, EffectOp, EffectProgram, IrCondition, IrTrigger, SearchFilter, Selector } from '../../engine/effects';

/** Re-emit a timing keyword tag so a stripped effect clause can be re-parsed under the same timing. */
function timingTag(timing: ParsedAbility['timing']): string | null {
  switch (timing) {
    case 'onPlay':
      return '[On Play]';
    case 'activateMain':
      return '[Activate: Main]';
    case 'whenAttacking':
      return '[When Attacking]';
    case 'onKO':
      return '[On K.O.]';
    case 'counter':
      return '[Counter]';
    default:
      return null;
  }
}

/** Parse one "If …" clause into a board-state gate, or null if it isn't one we model. */
function parseOneGate(s: string): AbilityGate | null {
  const t = s.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^your leader is \[([^\]]+)\]$/i))) return { kind: 'leaderName', name: m[1].trim() };
  if ((m = t.match(/^your leader has the \{([^}]+)\} type$/i))) return { kind: 'leaderType', type: m[1].trim() };
  if ((m = t.match(/^your leader'?s type includes "([^"]+)"$/i))) return { kind: 'leaderType', type: m[1].trim() };
  if (/^your leader is multicolou?red$/i.test(t)) return { kind: 'leaderMulticolor' };
  if ((m = t.match(/^you have (\d+) or more characters$/i))) return { kind: 'selfCharacterCount', atLeast: Number(m[1]) };
  if ((m = t.match(/^you have (\d+) or less characters$/i))) return { kind: 'selfCharacterCount', atMost: Number(m[1]) };
  if ((m = t.match(/^your opponent has (\d+) or less characters$/i))) return { kind: 'opponentCharacterCount', atMost: Number(m[1]) };
  if ((m = t.match(/^your opponent has (\d+) or more characters$/i))) return { kind: 'opponentCharacterCount', atLeast: Number(m[1]) };
  if ((m = t.match(/^you have (\d+) or less life(?: cards?)?$/i))) return { kind: 'selfLife', atMost: Number(m[1]) };
  if ((m = t.match(/^you have (\d+) or more life(?: cards?)?$/i))) return { kind: 'selfLife', atLeast: Number(m[1]) };
  if ((m = t.match(/^you have (\d+) or less cards? in your hand$/i))) return { kind: 'selfHand', atMost: Number(m[1]) };
  if ((m = t.match(/^you have (\d+) or more cards? in your hand$/i))) return { kind: 'selfHand', atLeast: Number(m[1]) };
  return null;
}

/** Parse a (possibly "X and Y") condition string into gates; null if ANY part is unmodeled. */
function parseGates(condText: string): AbilityGate[] | null {
  const parts = condText.split(/\s+and\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const gates: AbilityGate[] = [];
  for (const part of parts) {
    const g = parseOneGate(part);
    if (!g) return null;
    gates.push(g);
  }
  return gates;
}

/**
 * "[timing] If <board condition(s)>, <effect>." Parse the gate, re-parse the
 * remaining effect on its own, lower it, and attach the gate. Bails (leaving the
 * card uncompiled) when the condition isn't one we can evaluate — never guessed.
 */
function lowerWithGate(pa: ParsedAbility): Ability | null {
  if (!pa.actions.some((a) => a.conditional)) return null;
  const tag = timingTag(pa.timing);
  if (!tag) return null;
  const stripped = pa.rawText.replace(/^(\s*\[[^\]]*\]\s*)+/, '').trim();
  const m = stripped.match(/^if (.+?),\s*([\s\S]+)$/i);
  if (!m) return null;
  const gates = parseGates(m[1]);
  if (!gates) return null;
  const sub = parseEffect('gate-split', `${tag} ${m[2]}`).abilities[0];
  if (!sub) return null;
  const lowered = compileAbility(sub);
  if (!lowered) return null;
  return { ...lowered, gate: gates };
}

/**
 * Timings that fire a one-shot effect "now" (vs. a registered static): the
 * generic interpreter runs the same op vocabulary for all of them, so most
 * lowerings accept any of these and carry the timing through as the trigger.
 */
type AutoOrActivateTiming = Extract<IrTrigger, 'onPlay' | 'activateMain' | 'whenAttacking' | 'onKO'>;
function isAutoOrActivate(timing: ParsedAbility['timing']): timing is AutoOrActivateTiming {
  return timing === 'onPlay' || timing === 'activateMain' || timing === 'whenAttacking' || timing === 'onKO';
}

/**
 * Activation costs — "DON!! −N", "You may rest/trash … :", "rest this …" — are
 * not modeled yet. An ability gated by one must NOT compile (it would become a
 * free effect). Bail rather than guess (project rule: never assume a rule).
 */
function hasActivationCost(rawText: string): boolean {
  return /don!!\s*[−-]\s*\d/i.test(rawText) || /\byou may\b[^.]*?:/i.test(rawText) || /\brest this\b/i.test(rawText);
}

/**
 * Split an ability's "cost: effect" prefix into structured costs + the effect
 * text. Returns null unless the WHOLE prefix is recognized costs (donMinus /
 * restThis / restDon) — an unrecognized cost component must not be silently
 * dropped, so we leave the whole ability uncompiled instead.
 */
function parseCostPrefix(rawText: string): { cost: AbilityCost[]; effectText: string } | null {
  const stripped = rawText.replace(/^(\s*\[[^\]]*\]\s*)+/, '').trim(); // remove leading [timing/keyword] tags
  const colon = stripped.indexOf(':');
  if (colon < 0) return null;
  const effectText = stripped.slice(colon + 1).trim();
  if (!effectText) return null;

  let residual = stripped
    .slice(0, colon)
    .replace(/\([^)]*\)/g, '') // drop explanatory parentheticals, e.g. DON!! −N (You may return …)
    .replace(/^you may\s+/i, '')
    .trim();

  const cost: AbilityCost[] = [];
  let progressed = true;
  while (residual.length > 0 && progressed) {
    progressed = false;
    residual = residual.replace(/^(?:and|,)\s+/i, '').trim();
    let m: RegExpMatchArray | null;
    if ((m = residual.match(/^don!!\s*[−-]\s*(\d+)/i))) cost.push({ kind: 'donMinus', count: Number(m[1]) });
    else if ((m = residual.match(/^rest (\d+) of your don!! cards?/i))) cost.push({ kind: 'restDon', count: Number(m[1]) });
    else if ((m = residual.match(/^rest this (?:character|stage|leader|card)/i))) cost.push({ kind: 'restThis' });
    else if ((m = residual.match(/^this (?:character|stage|leader|card)/i))) cost.push({ kind: 'restThis' });
    if (m) {
      residual = residual.slice(m[0].length).trim();
      progressed = true;
    }
  }

  if (cost.length === 0 || residual.length > 0) return null; // unrecognized leftover -> don't guess
  return { cost, effectText };
}

/**
 * Lower an [Activate: Main] or [Counter] ability that pays an activation cost: parse the
 * cost prefix, re-parse the remaining effect text on its own, lower that, and
 * attach the cost. Activated abilities only (the cost is paid by the action
 * handler before firing the IR) — other timings keep bailing on cost prefixes.
 */
function lowerWithCost(pa: ParsedAbility): Ability | null {
  if (pa.timing !== 'activateMain' && pa.timing !== 'counter') return null;
  const split = parseCostPrefix(pa.rawText);
  if (!split) return null;
  const tag = timingTag(pa.timing);
  if (!tag) return null;
  const sub = parseEffect('cost-split', `${tag} ${split.effectText}`).abilities[0];
  if (!sub) return null;
  const lowered = compileAbility(sub); // sub has no cost prefix -> no recursion loop
  if (!lowered) return null;
  return { ...lowered, cost: split.cost };
}

/**
 * An opponent-Character target's "cost/power N or less" restriction, lowered to
 * a filtered selector. Returns `ok:false` when the card has a `with …` clause
 * we can't lower to a static threshold (e.g. "cost equal to or less than the
 * total of …") — those stay uncompiled rather than guessed.
 */
function opponentTargetFrom(rawText: string): Selector | null {
  const cost = rawText.match(/cost of (\d+) or less/i);
  if (cost) return { sel: 'opponentCharacters', maxCost: Number(cost[1]) };
  const power = rawText.match(/(\d+) (?:base )?power or less/i);
  if (power) return { sel: 'opponentCharacters', maxPower: Number(power[1]) };
  if (/\bwith\b/i.test(rawText)) return null; // an unparsed restriction — don't guess
  return { sel: 'opponentCharacters' }; // no restriction
}

function upToTargetCount(rawText: string): number {
  const count = rawText.match(/\bup to (\d+)\b/i);
  return count ? Number(count[1]) : 1;
}

/**
 * The classic "searcher": [On Play]/[Activate: Main]/[Main] "Look at N cards
 * from the top of your deck; reveal up to M <filter> and add it to your hand.
 * Then, place the rest at the bottom of your deck." Lowers to one searchTopDeck
 * op. Conservative — only the reveal→hand form: the "play up to 1 …" (into
 * play) variant and disjunctive "… or up to 1 …" targets are left uncompiled
 * (return null) rather than guessed.
 */
function lowerSearch(pa: ParsedAbility): Ability | null {
  if (pa.timing !== 'onPlay' && pa.timing !== 'activateMain' && pa.timing !== 'whenAttacking') return null;
  // An unmodeled "If …" precondition would be silently dropped — don't guess.
  // ('conditional' in a) narrows out the `unrecognized` variant, which has no
  // such field — same guard idiom as actionsNeedTemplate() in parseActions.ts.
  if (pa.actions.some((a) => 'conditional' in a && a.conditional)) return null;
  const t = pa.rawText;
  const look = t.match(/look at (\d+) cards? from the top of your deck/i);
  if (!look) return null;
  // reveal→hand only; capture the clause that describes what may be revealed.
  const reveal = t.match(/reveal up to (\d+)([\s\S]*?)\band add (?:it|them) to your hand/i);
  if (!reveal) return null;
  if (!/at the bottom of your deck/i.test(t)) return null; // the rest must return to the bottom
  const clause = reveal[2];
  if (/\bor up to \d+/i.test(clause)) return null; // disjunctive target — too ambiguous to lower

  const filter: SearchFilter = {};
  const type = clause.match(/\{([^}]+)\}\s*type/i);
  if (type) filter.typeIncludes = type[1].trim();
  if (/other than \[/i.test(clause)) filter.excludeSelfName = true;
  if (/\bCharacter card/i.test(clause)) filter.category = 'character';
  else if (/\bEvent card/i.test(clause)) filter.category = 'event';
  else if (/\bStage card/i.test(clause)) filter.category = 'stage';
  const maxCost = clause.match(/cost of (\d+) or less/i);
  if (maxCost) filter.maxCost = Number(maxCost[1]);
  const minCost = clause.match(/cost of (\d+) or more/i);
  if (minCost) filter.minCost = Number(minCost[1]);
  const maxPower = clause.match(/(\d+) power or less/i);
  if (maxPower) filter.maxPower = Number(maxPower[1]);

  const lookN = Number(look[1]);
  const pick = Number(reveal[1]);
  const hasFilter = Object.keys(filter).length > 0;
  const condition = buildCondition(pa);
  return {
    trigger: pa.timing,
    ...(pa.oncePerTurn ? { oncePerTurn: true } : {}),
    ...(condition ? { condition } : {}),
    ops: [
      {
        op: 'searchTopDeck',
        look: lookN,
        pick,
        ...(hasFilter ? { filter } : {}),
        prompt: `Look at the top ${lookN}: add up to ${pick} matching card${pick === 1 ? '' : 's'} to your hand; the rest go to the bottom of your deck.`,
      },
    ],
  };
}

/**
 * "Add up to 1 [Name] / {Type} type [Character/Event] card [with a cost/power
 * restriction] from your trash to your hand." The parser mis-tags this as a
 * `trash` op, so we match on the ability's full text instead. Conservative:
 * bails on colour/[Trigger]/disjunction/"other than"/unparsed-"with" clauses.
 */
function lowerRecoverFromTrash(pa: ParsedAbility): Ability | null {
  if (!isAutoOrActivate(pa.timing) && pa.timing !== 'counter') return null;
  if (pa.actions.some((a) => a.conditional)) return null;
  if (hasActivationCost(pa.rawText)) return null;
  const m = pa.rawText.match(/add up to \d+ ([\s\S]*?) from your trash to your hand/i);
  if (!m) return null;
  const clause = m[1];
  if (/\[trigger\]|other than|\bor \{|\b(red|blue|green|purple|black|yellow)\b/i.test(clause)) return null;

  const filter: SearchFilter = {};
  const type = clause.match(/\{([^}]+)\}\s*type/i);
  const name = clause.match(/^\s*(?:a |an )?\[([^\]]+)\]/i);
  if (type) filter.typeIncludes = type[1].trim();
  else if (name) filter.name = name[1].trim();
  if (/\bCharacter\b/i.test(clause)) filter.category = 'character';
  else if (/\bEvent\b/i.test(clause)) filter.category = 'event';
  else if (/\bStage\b/i.test(clause)) filter.category = 'stage';
  const maxCost = clause.match(/cost of (\d+) or less/i);
  if (maxCost) filter.maxCost = Number(maxCost[1]);
  const maxPower = clause.match(/(\d+) power or less/i);
  if (maxPower) filter.maxPower = Number(maxPower[1]);

  const restriction = !!(filter.typeIncludes || filter.name || filter.category || filter.maxCost !== undefined || filter.maxPower !== undefined);
  if (!restriction) return null; // "add up to 1 card from your trash" — too broad, don't guess
  if (/\bwith\b/i.test(clause) && filter.maxCost === undefined && filter.maxPower === undefined) return null; // unparsed restriction

  const condition = buildCondition(pa);
  return {
    trigger: pa.timing as AutoOrActivateTiming | 'counter',
    ...(condition ? { condition } : {}),
    ops: [
      { op: 'chooseTargets', var: 't', from: { sel: 'controllerTrash', filter }, min: 0, max: 1, prompt: 'Add up to 1 matching card from your trash to your hand (or decline).' },
      { op: 'moveToHand', target: { sel: 'var', name: 't' } },
    ],
  };
}

/**
 * A permanent self-power static: "[DON!! xN] / [Your|Opponent's Turn] [If
 * <board>,] this Character gains +M power." Registered at play-entry as a
 * continuous modifier whose condition (DON!!/turn + any "If" board gate) is
 * re-checked on every power read. Bails if an "If" clause isn't a modeled gate.
 */
function lowerSelfPowerStatic(pa: ParsedAbility): Ability | null {
  if (pa.timing !== 'custom' || pa.actions.length !== 1) return null;
  const a = pa.actions[0];
  if (a.op !== 'modifyPower' || a.target.kind !== 'self') return null;

  let condition = buildCondition(pa);
  if (a.conditional) {
    const stripped = pa.rawText.replace(/^(\s*\[[^\]]*\]\s*)+/, '').trim();
    const m = stripped.match(/^if (.+?),/i);
    if (!m) return null;
    const gates = parseGates(m[1]);
    if (!gates) return null;
    condition = { ...(condition ?? {}), gate: gates };
  }
  return {
    trigger: 'onEnterPlay',
    ops: [{ op: 'addPower', target: { sel: 'self' }, amount: a.amount, duration: 'permanent', ...(condition ? { condition } : {}) }],
  };
}

function buildCondition(pa: ParsedAbility): IrCondition | undefined {
  const cond: IrCondition = {};
  if (pa.donRequirement !== undefined) cond.donAttachedAtLeast = pa.donRequirement;
  if (pa.conditions.includes('yourTurn')) cond.turn = 'your';
  if (pa.conditions.includes('opponentsTurn')) cond.turn = 'opponent';
  return Object.keys(cond).length > 0 ? cond : undefined;
}

/** Lower ONE parsed ability to IR, or null if no lowering matches it. */
function compileAbility(pa: ParsedAbility): Ability | null {
  // [Trigger] (10-1-5-2): the parser tags these as `custom` timing. Recognize
  // them by the leading tag, lower the inner effect exactly as if it were an
  // [On Play] (immediate effect), then re-tag the ability as the 'trigger'
  // timing so the Damage Step can fire it when the Life card is revealed.
  if (pa.timing === 'custom' && /^\s*\[trigger\]/i.test(pa.rawText)) {
    const asOnPlay = compileAbility({ ...pa, timing: 'onPlay' });
    return asOnPlay ? { ...asOnPlay, trigger: 'trigger' } : null;
  }

  // Multi-clause patterns are matched on the ability's full text BEFORE the
  // single-action guard below (the parser splits a searcher into 3 sentences).
  const search = lowerSearch(pa);
  if (search) return search;

  // Cost-prefixed [Activate: Main] abilities: pay-then-effect (handled before the
  // single-action guard, since the parser splits cost+effect into many actions).
  const costed = lowerWithCost(pa);
  if (costed) return costed;

  // Recover-from-trash (parser mis-tags it; matched on raw text like search).
  const recover = lowerRecoverFromTrash(pa);
  if (recover) return recover;

  // "If <board condition>, <effect>" — parse the gate, lower the inner effect.
  const gated = lowerWithGate(pa);
  if (gated) return gated;

  // Permanent self-power static (custom timing), with optional re-checked "If" gate.
  const staticPower = lowerSelfPowerStatic(pa);
  if (staticPower) return staticPower;

  const actions = pa.actions;
  if (actions.length === 0) return null;
  if (actions.length === 1) return compileSingleAction(pa);

  // Multi-action ability: lower each action independently and concatenate its
  // ops into ONE ability (shared trigger + condition). This is the compounding
  // payoff — every combination of already-supported single ops now composes
  // (draw+trash, debuff+draw, …). Sequential `chooseTargets` reuse var 't'
  // safely: each is consumed by its own op before the next one binds.
  const trigger = triggerFor(pa.timing);
  if (!trigger) return null; // custom/static handled by the dedicated lowerings above
  if (actions.some((act) => 'conditional' in act && act.conditional)) return null; // "If …" handled by the gate path
  const composedCondition = buildCondition(pa);
  const allOps: EffectOp[] = [];
  for (const action of actions) {
    const sub = compileSingleAction({ ...pa, actions: [action] });
    if (!sub) return null; // any action we can't lower → bail the whole ability (never partial)
    allOps.push(...sub.ops);
  }
  if (allOps.length === 0) return null;
  return { trigger, ...(pa.oncePerTurn ? { oncePerTurn: true } : {}), ...(composedCondition ? { condition: composedCondition } : {}), ops: allOps };
}

/** Maps a parser timing to the IR trigger used for composed abilities (null for custom/static). */
function triggerFor(timing: ParsedAbility['timing']): IrTrigger | null {
  switch (timing) {
    case 'onPlay':
    case 'activateMain':
    case 'whenAttacking':
    case 'onKO':
    case 'counter':
      return timing;
    default:
      return null;
  }
}

/** Lower a SINGLE-action ability (its one parsed action) to IR, or null if unsupported. */
function compileSingleAction(pa: ParsedAbility): Ability | null {
  const a = pa.actions[0];
  if (!a) return null;

  // An unmodeled "If …" precondition (parser sets `conditional`) would be
  // silently dropped if we compiled the action anyway — bail rather than guess
  // (project rule: "Never assume a rule … mark as TODO / needs confirmation").
  // `unrecognized` actions have no `conditional` field at all (and fall
  // through every op-specific branch below anyway), so guard with `in`.
  if ('conditional' in a && a.conditional) return null;

  // [DON!! xN] / [Your|Opponent's Turn] gate, re-checked when the ability fires
  // (evalCondition in interpreter.ts). undefined when the text has no such gate.
  const condition = buildCondition(pa);

  // [On Play] / [Activate: Main] / [When Attacking] / [On K.O.] / [Counter] Draw N.
  if ((isAutoOrActivate(pa.timing) || pa.timing === 'counter') && a.op === 'draw') {
    return { trigger: pa.timing as AutoOrActivateTiming | 'counter', ...(pa.oncePerTurn ? { oncePerTurn: true } : {}), ...(condition ? { condition } : {}), ops: [{ op: 'draw', amount: a.amount }] };
  }

  // [When Attacking] / [On K.O.] This Character gains +M power (temporary).
  // Battle-scoped when the text says "during this battle", else turn-scoped;
  // both expire on their own (End of Battle / End Phase) — see damageStep.ts /
  // runEndPhaseAndHandoff.ts.
  if ((pa.timing === 'whenAttacking' || pa.timing === 'onKO') && a.op === 'modifyPower' && a.target.kind === 'self') {
    const duration = a.duration === 'thisBattle' ? 'duringThisBattle' : 'duringThisTurn';
    return { trigger: pa.timing, ...(condition ? { condition } : {}), ops: [{ op: 'addPower', target: { sel: 'self' }, amount: a.amount, duration }] };
  }

  // [Counter] Up to 1 of your Leader or Character cards gains +M power during
  // this battle. "Up to 1" -> optional single target (min 0).
  if (pa.timing === 'counter' && a.op === 'modifyPower' && (/your leader or/i.test(pa.rawText) || a.target.kind === 'yourLeader' || a.target.kind === 'self' || a.target.kind === 'yourCharacters')) {
    return {
      trigger: 'counter',
      ...(condition ? { condition } : {}),
      ops: [
        { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrCharacters' }, min: 0, max: 1, prompt: `Choose your Leader or 1 Character to gain +${a.amount} power this battle (or decline).` },
        { op: 'addPower', target: { sel: 'var', name: 't' }, amount: a.amount, duration: 'duringThisBattle' },
      ],
    };
  }

  // [On Play] / [When Attacking] / [Activate: Main] / [Counter] K.O.
  // up to 1 of your opponent's Characters [with cost/power N or less].
  if ((pa.timing === 'onPlay' || pa.timing === 'whenAttacking' || pa.timing === 'activateMain' || (pa.timing === 'counter' && !hasActivationCost(pa.rawText))) && a.op === 'ko' && a.target.kind === 'opponentCharacters') {
    const from = opponentTargetFrom(pa.rawText);
    if (!from) return null;
    return {
      trigger: pa.timing as AutoOrActivateTiming | 'counter',
      ...(condition ? { condition } : {}),
      ops: [
        { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: "K.O. up to 1 of your opponent's Characters (or decline)." },
        { op: 'ko', target: { sel: 'var', name: 't' } },
      ],
    };
  }

  // [On Play] / [When Attacking] / [Activate: Main] / [Counter] Rest
  // up to 1 of your opponent's Characters [with cost/power N or less].
  if ((pa.timing === 'onPlay' || pa.timing === 'whenAttacking' || pa.timing === 'activateMain' || (pa.timing === 'counter' && !hasActivationCost(pa.rawText))) && a.op === 'rest' && a.target.kind === 'opponentCharacters') {
    const from = opponentTargetFrom(pa.rawText);
    if (!from) return null;
    return {
      trigger: pa.timing as AutoOrActivateTiming | 'counter',
      ...(condition ? { condition } : {}),
      ops: [
        { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: "Rest up to 1 of your opponent's Characters (or decline)." },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ],
    };
  }

  // [timing] Return up to 1 of your opponent's Characters [with cost/base power N
  // or less] to the owner's hand (bounce). Costless variants only here — cost-
  // gated ones go through the activation-cost path (lowerWithCost).
  if (a.op === 'returnToHand' && a.target.kind === 'opponentCharacters' && (isAutoOrActivate(pa.timing) || pa.timing === 'counter') && !hasActivationCost(pa.rawText)) {
    const from = opponentTargetFrom(pa.rawText);
    if (from) {
      return {
        trigger: pa.timing as AutoOrActivateTiming | 'counter',
        ...(condition ? { condition } : {}),
        ops: [
          { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: "Return up to 1 of your opponent's Characters to its owner's hand (or decline)." },
          { op: 'returnToHand', target: { sel: 'var', name: 't' } },
        ],
      };
    }
  }

  // [On Play] / [Activate: Main] / [When Attacking] give up to 1 rested DON!! to your Leader or 1 of your Characters.
  // Match on the ability's full text, not the atom's target: phrasings like
  // "give THIS Leader or 1 of your Characters up to 1 DON" make the parser tag
  // the target as `self`, but the intended target set is still leader+characters.
  if (isAutoOrActivate(pa.timing) && a.op === 'giveDon' && a.amount === 1) {
    if (/leader or/i.test(pa.rawText)) {
      return {
        trigger: pa.timing,
        ...(pa.oncePerTurn ? { oncePerTurn: true } : {}),
        ...(condition ? { condition } : {}),
        ops: [
          { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrCharacters' }, min: 0, max: 1, prompt: 'Give 1 rested DON!! to your Leader or 1 of your Characters (or decline).' },
          { op: 'giveDon', target: { sel: 'var', name: 't' }, count: 1 },
        ],
      };
    }
  }

  // Temporary power modifier (±X "during this turn/battle") to a Character —
  // opponent debuff, your single target, or your whole board (AoE). Reuses the
  // continuous-power op; the modifier expires on its own (End of Turn / End of
  // Battle). Activation-cost-gated variants are excluded above.
  if (a.op === 'modifyPower' && a.target.kind !== 'self' && (a.duration === 'thisTurn' || a.duration === 'thisBattle')) {
    const okTiming = isAutoOrActivate(pa.timing) || pa.timing === 'counter';
    if (okTiming && !hasActivationCost(pa.rawText)) {
      const trigger = pa.timing as AutoOrActivateTiming | 'counter';
      const duration = a.duration === 'thisBattle' ? 'duringThisBattle' : 'duringThisTurn';
      const raw = a.target.kind === 'upTo' ? a.target.raw : '';
      const maxTargets = a.target.kind === 'upTo' ? a.target.count : upToTargetCount(pa.rawText);
      const signed = `${a.amount >= 0 ? '+' : ''}${a.amount}`;

      if (a.target.kind === 'opponentLeader' || /opponent'?s? leader or character/i.test(pa.rawText)) {
        return {
          trigger,
          ...(condition ? { condition } : {}),
          ops: [
            { op: 'chooseTargets', var: 't', from: { sel: 'opponentLeaderOrCharacters' }, min: 0, max: 1, prompt: `Give up to 1 of your opponent's Leader or Characters ${signed} power (or decline).` },
            { op: 'addPower', target: { sel: 'var', name: 't' }, amount: a.amount, duration },
          ],
        };
      }

      if (a.target.kind === 'opponentCharacters' || /opponent/i.test(raw)) {
        const from = opponentTargetFrom(pa.rawText);
        if (from) {
          return {
            trigger,
            ...(condition ? { condition } : {}),
            ops: [
            { op: 'chooseTargets', var: 't', from, min: 0, max: maxTargets, prompt: `Give up to ${maxTargets} of your opponent's Characters ${signed} power (or decline).` },
              { op: 'addPower', target: { sel: 'var', name: 't' }, amount: a.amount, duration },
            ],
          };
        }
      } else if (a.target.kind === 'allYourCharacters') {
        return {
          trigger,
          ...(condition ? { condition } : {}),
          ops: [{ op: 'addPower', target: { sel: 'controllerCharacters' }, amount: a.amount, duration }],
        };
      } else if (a.target.kind === 'yourCharacters' || a.target.kind === 'yourLeader' || (a.target.kind === 'upTo' && /\byour\b/i.test(raw))) {
        return {
          trigger,
          ...(condition ? { condition } : {}),
          ops: [
            { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrCharacters' }, min: 0, max: 1, prompt: `Give your Leader or 1 Character ${signed} power (or decline).` },
            { op: 'addPower', target: { sel: 'var', name: 't' }, amount: a.amount, duration },
          ],
        };
      }
    }
  }

  // Temporary cost modifier (±X "during this turn/battle") to a Character.
  // Uses the same continuous-effect expiry path as temporary power modifiers.
  if (a.op === 'modifyCost' && (a.duration === 'thisTurn' || a.duration === 'thisBattle')) {
    const okTiming = isAutoOrActivate(pa.timing) || pa.timing === 'counter';
    if (okTiming && !hasActivationCost(pa.rawText)) {
      const trigger = pa.timing as AutoOrActivateTiming | 'counter';
      const duration = a.duration === 'thisBattle' ? 'duringThisBattle' : 'duringThisTurn';
      const raw = a.target.kind === 'upTo' ? a.target.raw : '';
      const maxTargets = a.target.kind === 'upTo' ? a.target.count : upToTargetCount(pa.rawText);
      const signed = `${a.amount >= 0 ? '+' : ''}${a.amount}`;

      if (a.target.kind === 'opponentCharacters' || /opponent/i.test(raw)) {
        const from = opponentTargetFrom(pa.rawText);
        if (from) {
          return {
            trigger,
            ...(condition ? { condition } : {}),
            ops: [
              { op: 'chooseTargets', var: 't', from, min: 0, max: maxTargets, prompt: `Give up to ${maxTargets} of your opponent's Characters ${signed} cost (or decline).` },
              { op: 'addCost', target: { sel: 'var', name: 't' }, amount: a.amount, duration },
            ],
          };
        }
      } else if (a.target.kind === 'self') {
        return {
          trigger,
          ...(condition ? { condition } : {}),
          ops: [{ op: 'addCost', target: { sel: 'self' }, amount: a.amount, duration }],
        };
      }
    }
  }

  // Self-mill: "Trash N cards from the top of your deck."
  if (isAutoOrActivate(pa.timing) && a.op === 'trash' && a.from === 'deck' && typeof a.amount === 'number' && a.amount > 0 && !hasActivationCost(pa.rawText)) {
    return { trigger: pa.timing, ...(condition ? { condition } : {}), ops: [{ op: 'trashTopDeck', count: a.amount }] };
  }

  // DON!! ramp: "Add up to N DON!! cards from your DON!! deck and set them as active/rested."
  if (isAutoOrActivate(pa.timing) && a.op === 'donFromDeck' && typeof a.amount === 'number' && a.amount > 0 && !hasActivationCost(pa.rawText)) {
    return { trigger: pa.timing, ...(condition ? { condition } : {}), ops: [{ op: 'addDonFromDeck', count: a.amount, rested: !!a.rested }] };
  }

  // Trash N cards from your hand (an EFFECT, e.g. "draw 2 and trash 1"; mandatory
  // unless "up to"). Distinct from the deck self-mill above (a.from === 'deck').
  if ((isAutoOrActivate(pa.timing) || pa.timing === 'counter') && a.op === 'trash' && a.from === 'hand' && typeof a.amount === 'number' && a.amount > 0 && !hasActivationCost(pa.rawText)) {
    const n = a.amount;
    const min = a.optional ? 0 : n;
    return {
      trigger: pa.timing as AutoOrActivateTiming | 'counter',
      ...(condition ? { condition } : {}),
      ops: [
        { op: 'chooseTargets', var: 't', from: { sel: 'controllerHand' }, min, max: n, prompt: `Trash ${n} card${n === 1 ? '' : 's'} from your hand.` },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ],
    };
  }

  // [timing] Play up to 1 [Name] / {Type} type / Character card [with a cost/power
  // restriction] from your hand. Requires a parsed restriction and bails on any
  // clause it can't fully model (Trigger/colour/disjunction/multi/other-than).
  if (a.op === 'playCard' && /from your hand/i.test(pa.rawText) && (isAutoOrActivate(pa.timing) || pa.timing === 'counter') && !hasActivationCost(pa.rawText)) {
    const t = pa.rawText;
    const filter: SearchFilter = { category: 'character' };
    const type = t.match(/\{([^}]+)\}\s*type/i);
    const name = t.match(/play up to \d+ (?:a |an )?\[([^\]]+)\]/i);
    if (type) filter.typeIncludes = type[1].trim();
    else if (name) filter.name = name[1].trim();
    const maxCost = t.match(/cost of (\d+) or less/i);
    const exactCost = t.match(/cost of (\d+)(?! or)/i);
    const maxPower = t.match(/(\d+) power or less/i);
    if (maxCost) filter.maxCost = Number(maxCost[1]);
    else if (exactCost) filter.exactCost = Number(exactCost[1]);
    if (maxPower) filter.maxPower = Number(maxPower[1]);

    const parsedRestriction = !!(filter.typeIncludes || filter.name || filter.maxCost !== undefined || filter.exactCost !== undefined || filter.maxPower !== undefined);
    const unparsedExtra =
      /\band a \[trigger\]/i.test(t) ||
      /no base effect/i.test(t) ||
      /\bor \{/i.test(t) ||
      /\band up to 1\b/i.test(t) ||
      /other than/i.test(t) ||
      /\b(red|blue|green|purple|black|yellow)\s+character/i.test(t) ||
      (/\bwith\b/i.test(t) && filter.maxCost === undefined && filter.exactCost === undefined && filter.maxPower === undefined);

    if (parsedRestriction && !unparsedExtra) {
      return {
        trigger: pa.timing as AutoOrActivateTiming | 'counter',
        ...(condition ? { condition } : {}),
        ops: [
          { op: 'chooseTargets', var: 't', from: { sel: 'controllerHand', filter }, min: 0, max: 1, prompt: 'Play up to 1 matching Character from your hand (or decline).' },
          { op: 'playFromHand', target: { sel: 'var', name: 't' } },
        ],
      };
    }
  }

  return null;
}

/** Compile a card's effect text to a program, or null if nothing lowered. */
export function compileEffect(cardNumber: string, effectText: string): EffectProgram | null {
  const parsed = parseEffect(cardNumber, effectText);
  const abilities: Ability[] = [];
  for (const pa of parsed.abilities) {
    const ability = compileAbility(pa);
    if (ability) abilities.push(ability);
  }
  return abilities.length > 0 ? { cardNumber, abilities } : null;
}
