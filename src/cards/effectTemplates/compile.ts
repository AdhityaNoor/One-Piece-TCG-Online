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
import type { Ability, EffectProgram, IrCondition, IrTrigger, SearchFilter, Selector } from '../../engine/effects';

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
 * An opponent-Character target's "cost/power N or less" restriction, lowered to
 * a filtered selector. Returns `ok:false` when the card has a `with …` clause
 * we can't lower to a static threshold (e.g. "cost equal to or less than the
 * total of …") — those stay uncompiled rather than guessed.
 */
function opponentTargetFrom(rawText: string): Selector | null {
  const cost = rawText.match(/cost of (\d+) or less/i);
  if (cost) return { sel: 'opponentCharacters', maxCost: Number(cost[1]) };
  const power = rawText.match(/(\d+) power or less/i);
  if (power) return { sel: 'opponentCharacters', maxPower: Number(power[1]) };
  if (/\bwith\b/i.test(rawText)) return null; // an unparsed restriction — don't guess
  return { sel: 'opponentCharacters' }; // no restriction
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
  if (pa.actions.some((a) => a.conditional)) return null;
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

function buildCondition(pa: ParsedAbility): IrCondition | undefined {
  const cond: IrCondition = {};
  if (pa.donRequirement !== undefined) cond.donAttachedAtLeast = pa.donRequirement;
  if (pa.conditions.includes('yourTurn')) cond.turn = 'your';
  if (pa.conditions.includes('opponentsTurn')) cond.turn = 'opponent';
  return Object.keys(cond).length > 0 ? cond : undefined;
}

/** Lower ONE parsed ability to IR, or null if no lowering matches it. */
function compileAbility(pa: ParsedAbility): Ability | null {
  // Multi-clause patterns are matched on the ability's full text BEFORE the
  // single-action guard below (the parser splits a searcher into 3 sentences).
  const search = lowerSearch(pa);
  if (search) return search;

  const actions = pa.actions;
  if (actions.length !== 1) return null; // only single-op abilities for now

  const a = actions[0];

  // An unmodeled "If …" precondition (parser sets `conditional`) would be
  // silently dropped if we compiled the action anyway — bail rather than guess
  // (project rule: "Never assume a rule … mark as TODO / needs confirmation").
  if (a.conditional) return null;

  // [DON!! xN] / [Your|Opponent's Turn] gate, re-checked when the ability fires
  // (evalCondition in interpreter.ts). undefined when the text has no such gate.
  const condition = buildCondition(pa);

  // [On Play] / [Activate: Main] / [When Attacking] / [On K.O.] Draw N.
  if (isAutoOrActivate(pa.timing) && a.op === 'draw') {
    return { trigger: pa.timing, ...(pa.oncePerTurn ? { oncePerTurn: true } : {}), ...(condition ? { condition } : {}), ops: [{ op: 'draw', amount: a.amount }] };
  }

  // Permanent self "[DON!! xN] / [Your|Opponent's Turn] gains +M power" — a
  // static registered at play-entry, gated by a re-checked condition.
  if (pa.timing === 'custom' && a.op === 'modifyPower' && a.target.kind === 'self') {
    const condition = buildCondition(pa);
    return {
      trigger: 'onEnterPlay',
      ops: [{ op: 'addPower', target: { sel: 'self' }, amount: a.amount, duration: 'permanent', ...(condition ? { condition } : {}) }],
    };
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
  if (pa.timing === 'counter' && a.op === 'modifyPower' && (/leader or/i.test(pa.rawText) || a.target.kind === 'yourLeader' || a.target.kind === 'self' || a.target.kind === 'yourCharacters')) {
    return {
      trigger: 'counter',
      ...(condition ? { condition } : {}),
      ops: [
        { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrCharacters' }, min: 0, max: 1, prompt: `Choose your Leader or 1 Character to gain +${a.amount} power this battle (or decline).` },
        { op: 'addPower', target: { sel: 'var', name: 't' }, amount: a.amount, duration: 'duringThisBattle' },
      ],
    };
  }

  // [On Play] / [When Attacking] K.O. up to 1 of your opponent's Characters [with cost/power N or less].
  if ((pa.timing === 'onPlay' || pa.timing === 'whenAttacking') && a.op === 'ko' && a.target.kind === 'opponentCharacters') {
    const from = opponentTargetFrom(pa.rawText);
    if (!from) return null;
    return {
      trigger: pa.timing,
      ...(condition ? { condition } : {}),
      ops: [
        { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: "K.O. up to 1 of your opponent's Characters (or decline)." },
        { op: 'ko', target: { sel: 'var', name: 't' } },
      ],
    };
  }

  // [On Play] / [When Attacking] Rest up to 1 of your opponent's Characters [with cost/power N or less].
  if ((pa.timing === 'onPlay' || pa.timing === 'whenAttacking') && a.op === 'rest' && a.target.kind === 'opponentCharacters') {
    const from = opponentTargetFrom(pa.rawText);
    if (!from) return null;
    return {
      trigger: pa.timing,
      ...(condition ? { condition } : {}),
      ops: [
        { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: "Rest up to 1 of your opponent's Characters (or decline)." },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ],
    };
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
      const signed = `${a.amount >= 0 ? '+' : ''}${a.amount}`;

      if (a.target.kind === 'opponentCharacters' || /opponent/i.test(raw)) {
        const from = opponentTargetFrom(pa.rawText);
        if (from) {
          return {
            trigger,
            ...(condition ? { condition } : {}),
            ops: [
              { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: `Give up to 1 of your opponent's Characters ${signed} power (or decline).` },
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

  // Self-mill: "Trash N cards from the top of your deck."
  if (isAutoOrActivate(pa.timing) && a.op === 'trash' && a.from === 'deck' && typeof a.amount === 'number' && a.amount > 0 && !hasActivationCost(pa.rawText)) {
    return { trigger: pa.timing, ...(condition ? { condition } : {}), ops: [{ op: 'trashTopDeck', count: a.amount }] };
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
