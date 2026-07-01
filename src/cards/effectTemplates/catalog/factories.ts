/**
 * Template factories: one function per TemplateId that produces an EffectProgram.
 *
 * These are the only place that translates template params → IR ops. The output
 * is plain JSON-serializable data; nothing here executes game logic.
 *
 * Rules:
 *   - Each factory must match the corresponding TemplateParamMap entry exactly.
 *   - Prompts are deterministic from params (no free-form strings in callers).
 *   - Do not reference raw card effect text here.
 */
import type { Ability, AbilityCost, EffectOp, EffectProgram } from '../../../engine/effects/effectIr';
import type { TemplateId, TemplateParamMap } from './templateDefs';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function program(cardNumber: string, abilities: Ability[]): EffectProgram {
  return { cardNumber, abilities };
}

function ability(
  trigger: Ability['trigger'],
  ops: EffectOp[],
  opts?: Partial<Pick<Ability, 'condition' | 'gate' | 'oncePerTurn' | 'cost'>>,
): Ability {
  return { trigger, ops, ...opts };
}

/** Build the opts object for activateMain abilities from optional cost + oncePerTurn. */
function activateOpts(cost: AbilityCost[] | undefined, oncePerTurn: boolean | undefined) {
  const opts: Partial<Pick<Ability, 'cost' | 'oncePerTurn'>> = {};
  if (cost !== undefined && cost.length > 0) opts.cost = cost;
  if (oncePerTurn) opts.oncePerTurn = true;
  return Object.keys(opts).length > 0 ? opts : undefined;
}

// ---------------------------------------------------------------------------
// Per-template factory functions
// ---------------------------------------------------------------------------

const FACTORY_MAP: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [T in TemplateId]: (cardNumber: string, params: TemplateParamMap[T]) => EffectProgram;
} = {
  // --- draw ---

  onPlayDraw: (cn, p) =>
    program(cn, [ability('onPlay', [{ op: 'draw', amount: p.amount }])]),

  onKODraw: (cn, p) =>
    program(cn, [ability('onKO', [{ op: 'draw', amount: p.amount }])]),

  // --- DON!! ramp ---

  onPlayAddDonFromDeck: (cn, p) =>
    program(cn, [ability('onPlay', [{ op: 'addDonFromDeck', count: p.count, rested: p.rested }])]),

  onKOAddDonFromDeck: (cn, p) =>
    program(cn, [ability('onKO', [{ op: 'addDonFromDeck', count: p.count, rested: p.rested }])]),

  // --- give DON!! (attach from cost area) ---

  onPlayGiveDon: (cn, p) =>
    program(cn, [
      ability('onPlay', [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerLeaderOrCharacters' },
          min: 0,
          max: 1,
          prompt: 'Give DON!! to your Leader or 1 of your Characters.',
        },
        { op: 'giveDon', target: { sel: 'var', name: 't' }, count: p.count },
      ]),
    ]),

  activateMainGiveDon: (cn, p) =>
    program(cn, [
      ability(
        'activateMain',
        [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'controllerLeaderOrCharacters' },
            min: 0,
            max: 1,
            prompt: 'Give DON!! to your Leader or 1 of your Characters.',
          },
          { op: 'giveDon', target: { sel: 'var', name: 't' }, count: p.count },
        ],
        { oncePerTurn: true },
      ),
    ]),

  // --- K.O. ---

  onPlayKoOpponentCharacter: (cn, p) =>
    program(cn, [
      ability('onPlay', [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentCharacters', ...p.filter },
          min: 0,
          max: 1,
          prompt: "K.O. up to 1 of your opponent's Characters (or decline).",
        },
        { op: 'ko', target: { sel: 'var', name: 't' } },
      ]),
    ]),

  triggerKoOpponentCharacter: (cn, p) =>
    program(cn, [
      ability('trigger', [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentCharacters', ...p.filter },
          min: 0,
          max: 1,
          prompt: "K.O. up to 1 of your opponent's Characters (or decline).",
        },
        { op: 'ko', target: { sel: 'var', name: 't' } },
      ]),
    ]),

  activateMainKo: (cn, p) =>
    program(cn, [
      ability(
        'activateMain',
        [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'opponentCharacters', ...p.filter },
            min: 0,
            max: 1,
            prompt: "K.O. up to 1 of your opponent's Characters (or decline).",
          },
          { op: 'ko', target: { sel: 'var', name: 't' } },
        ],
        activateOpts(p.cost, p.oncePerTurn),
      ),
    ]),

  // --- rest ---

  onPlayRestOpponentCharacter: (cn, p) =>
    program(cn, [
      ability('onPlay', [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentCharacters', ...p.filter },
          min: 0,
          max: 1,
          prompt: "Rest up to 1 of your opponent's Characters (or decline).",
        },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ]),
    ]),

  activateMainRest: (cn, p) =>
    program(cn, [
      ability(
        'activateMain',
        [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'opponentCharacters', ...p.filter },
            min: 0,
            max: 1,
            prompt: "Rest up to 1 of your opponent's Characters (or decline).",
          },
          { op: 'rest', target: { sel: 'var', name: 't' } },
        ],
        activateOpts(p.cost, p.oncePerTurn),
      ),
    ]),

  // --- bounce ---

  onPlayReturnToHand: (cn, p) => {
    const from =
      p.target === 'any'
        ? ({ sel: 'allCharacters', maxCost: p.maxCost } as const)
        : ({ sel: 'opponentCharacters', maxCost: p.maxCost } as const);
    const promptSubject = p.target === 'any' ? 'Character' : "of your opponent's Characters";
    return program(cn, [
      ability('onPlay', [
        {
          op: 'chooseTargets',
          var: 't',
          from,
          min: 0,
          max: 1,
          prompt: `Return up to 1 ${promptSubject} with a cost of ${p.maxCost} or less to the owner's hand (or decline).`,
        },
        { op: 'returnToHand', target: { sel: 'var', name: 't' } },
      ]),
    ]);
  },

  // --- modify cost (opponent) ---

  onPlayModifyCostOpponent: (cn, p) =>
    program(cn, [
      ability('onPlay', [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentCharacters' },
          min: 0,
          max: 1,
          prompt: `Give up to 1 of your opponent's Characters ${p.amount} cost during this turn (or decline).`,
        },
        { op: 'addCost', target: { sel: 'var', name: 't' }, amount: p.amount, duration: 'duringThisTurn' },
      ]),
    ]),

  whenAttackingModifyCostOpponent: (cn, p) =>
    program(cn, [
      ability(
        'whenAttacking',
        [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'opponentCharacters' },
            min: 0,
            max: 1,
            prompt: `Give up to 1 of your opponent's Characters ${p.amount} cost during this turn (or decline).`,
          },
          { op: 'addCost', target: { sel: 'var', name: 't' }, amount: p.amount, duration: 'duringThisTurn' },
        ],
        p.donRequired !== undefined ? { condition: { donAttachedAtLeast: p.donRequired } } : undefined,
      ),
    ]),

  activateMainModifyCostOpponent: (cn, p) =>
    program(cn, [
      ability(
        'activateMain',
        [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'opponentCharacters' },
            min: 0,
            max: 1,
            prompt: `Give up to 1 of your opponent's Characters ${p.amount} cost during this turn (or decline).`,
          },
          { op: 'addCost', target: { sel: 'var', name: 't' }, amount: p.amount, duration: 'duringThisTurn' },
        ],
        activateOpts(p.cost, p.oncePerTurn),
      ),
    ]),

  // --- modify power (opponent) ---

  whenAttackingModifyPowerOpponent: (cn, p) => {
    const maxTargets = p.maxTargets ?? 1;
    return program(cn, [
      ability(
        'whenAttacking',
        [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'opponentCharacters' },
            min: 0,
            max: maxTargets,
            prompt: `Give up to ${maxTargets} of your opponent's Characters ${p.amount} power during this turn (or decline).`,
          },
          { op: 'addPower', target: { sel: 'var', name: 't' }, amount: p.amount, duration: 'duringThisTurn' },
        ],
        p.donRequired !== undefined ? { condition: { donAttachedAtLeast: p.donRequired } } : undefined,
      ),
    ]);
  },

  // --- draw + discard ---

  onPlayDrawAndTrash: (cn, p) =>
    program(cn, [
      ability('onPlay', [
        { op: 'draw', amount: p.drawCount },
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand' },
          min: p.trashCount,
          max: p.trashCount,
          prompt: `Trash ${p.trashCount} card${p.trashCount === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ]),
    ]),

  whenAttackingDrawAndTrash: (cn, p) =>
    program(cn, [
      ability(
        'whenAttacking',
        [
          { op: 'draw', amount: p.drawCount },
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'controllerHand' },
            min: p.trashCount,
            max: p.trashCount,
            prompt: `Trash ${p.trashCount} card${p.trashCount === 1 ? '' : 's'} from your hand.`,
          },
          { op: 'trashCards', target: { sel: 'var', name: 't' } },
        ],
        p.donRequired !== undefined ? { condition: { donAttachedAtLeast: p.donRequired } } : undefined,
      ),
    ]),

  // --- searcher ---

  onPlaySearchTopDeck: (cn, p) =>
    program(cn, [
      ability('onPlay', [
        {
          op: 'searchTopDeck',
          look: p.look,
          pick: p.pick,
          filter: p.filter,
          prompt: `Look at the top ${p.look}: add up to ${p.pick} matching card${p.pick === 1 ? '' : 's'} to your hand; the rest go to the bottom of your deck.`,
        },
      ]),
    ]),

  activateMainSearchTopDeck: (cn, p) =>
    program(cn, [
      ability(
        'activateMain',
        [
          {
            op: 'searchTopDeck',
            look: p.look,
            pick: p.pick,
            filter: p.filter,
            prompt: `Look at the top ${p.look}: add up to ${p.pick} matching card${p.pick === 1 ? '' : 's'} to your hand; the rest go to the bottom of your deck.`,
          },
        ],
        activateOpts(p.cost, p.oncePerTurn),
      ),
    ]),

  // --- passive DON!! attachment power boost ---

  donAttachedSelfPower: (cn, p) =>
    program(cn, [
      ability('onEnterPlay', [
        {
          op: 'addPower',
          target: { sel: 'self' },
          amount: p.amount,
          duration: 'permanent',
          condition: { donAttachedAtLeast: p.donAttachedAtLeast },
        },
      ]),
    ]),
};

// ---------------------------------------------------------------------------
// Public dispatcher
// ---------------------------------------------------------------------------

/**
 * Produce an EffectProgram for a card using the named template and params.
 * Type-safe: TypeScript narrows `params` to `TemplateParamMap[T]` based on `templateId`.
 */
export function applyTemplate<T extends TemplateId>(
  cardNumber: string,
  templateId: T,
  params: TemplateParamMap[T],
): EffectProgram {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (FACTORY_MAP[templateId] as (cn: string, p: any) => EffectProgram)(cardNumber, params);
}
