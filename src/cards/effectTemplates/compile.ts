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
import type { Ability, EffectProgram, IrCondition, Selector } from '../../engine/effects';

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

function buildCondition(pa: ParsedAbility): IrCondition | undefined {
  const cond: IrCondition = {};
  if (pa.donRequirement !== undefined) cond.donAttachedAtLeast = pa.donRequirement;
  if (pa.conditions.includes('yourTurn')) cond.turn = 'your';
  if (pa.conditions.includes('opponentsTurn')) cond.turn = 'opponent';
  return Object.keys(cond).length > 0 ? cond : undefined;
}

/** Lower ONE parsed ability to IR, or null if no lowering matches it. */
function compileAbility(pa: ParsedAbility): Ability | null {
  const actions = pa.actions;
  if (actions.length !== 1) return null; // only single-op abilities for now

  const a = actions[0];

  // [On Play] / [Activate: Main] Draw N.
  if ((pa.timing === 'onPlay' || pa.timing === 'activateMain') && a.op === 'draw') {
    return { trigger: pa.timing, ...(pa.oncePerTurn ? { oncePerTurn: true } : {}), ops: [{ op: 'draw', amount: a.amount }] };
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

  // [On Play] K.O. up to 1 of your opponent's Characters [with cost/power N or less].
  if (pa.timing === 'onPlay' && a.op === 'ko' && a.target.kind === 'opponentCharacters') {
    const from = opponentTargetFrom(pa.rawText);
    if (!from) return null;
    return {
      trigger: 'onPlay',
      ops: [
        { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: "K.O. up to 1 of your opponent's Characters (or decline)." },
        { op: 'ko', target: { sel: 'var', name: 't' } },
      ],
    };
  }

  // [On Play] Rest up to 1 of your opponent's Characters [with cost/power N or less].
  if (pa.timing === 'onPlay' && a.op === 'rest' && a.target.kind === 'opponentCharacters') {
    const from = opponentTargetFrom(pa.rawText);
    if (!from) return null;
    return {
      trigger: 'onPlay',
      ops: [
        { op: 'chooseTargets', var: 't', from, min: 0, max: 1, prompt: "Rest up to 1 of your opponent's Characters (or decline)." },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ],
    };
  }

  // [On Play] / [Activate: Main] give up to 1 rested DON!! to your Leader or 1 of your Characters.
  if ((pa.timing === 'onPlay' || pa.timing === 'activateMain') && a.op === 'giveDon' && a.amount === 1) {
    const raw = a.target.kind === 'upTo' ? a.target.raw : '';
    if (/leader or/i.test(raw)) {
      return {
        trigger: pa.timing,
        ...(pa.oncePerTurn ? { oncePerTurn: true } : {}),
        ops: [
          { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrCharacters' }, min: 0, max: 1, prompt: 'Give 1 rested DON!! to your Leader or 1 of your Characters (or decline).' },
          { op: 'giveDon', target: { sel: 'var', name: 't' }, count: 1 },
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
