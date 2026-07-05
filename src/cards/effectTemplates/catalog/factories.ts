/**
 * Template factories: translate reviewed timing + reusable functions to IR.
 *
 * This file produces plain JSON-serializable EffectProgram data. It does not
 * execute card text, and callers never pass raw card effect text.
 */
import type { Ability, EffectOp, EffectProgram } from '../../../engine/effects/effectIr';
import type { SequencedAbilityFunction, TemplateId, TemplateParamMap } from './templateDefs';

function program(cardNumber: string, abilities: Ability[]): EffectProgram {
  return { cardNumber, abilities };
}

function chooseOpponentCharacter(
  fn: 'koOpponentCharacter' | 'restOpponentCharacter',
  filter: { maxCost?: number; maxPower?: number; rested?: boolean; hasBlocker?: boolean },
  maxTargets = 1,
): EffectOp {
  const verb = fn === 'koOpponentCharacter' ? 'K.O.' : 'Rest';
  return {
    op: 'chooseTargets',
    var: 't',
    from: { sel: 'opponentCharacters', ...filter },
    min: 0,
    max: maxTargets,
    prompt: `${verb} up to ${maxTargets} of your opponent's Characters (or decline).`,
  };
}

function functionOps(f: SequencedAbilityFunction): EffectOp[] {
  const withSequenceGate = (ops: EffectOp[]): EffectOp[] =>
    f.ifPrevious ? ops.map((op) => ({ ...op, ifPrevious: f.ifPrevious })) : ops;

  const ops = ((): EffectOp[] => {
  switch (f.fn) {
    case 'draw':
      return [{ op: 'draw', amount: f.amount }];
    case 'addDonFromDeck':
      return [{ op: 'addDonFromDeck', count: f.count, rested: f.rested }];
    case 'giveDon':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerLeaderOrCharacters' },
          min: 0,
          max: 1,
          prompt: 'Give DON!! to your Leader or 1 of your Characters.',
        },
        { op: 'giveDon', target: { sel: 'var', name: 't' }, count: f.count },
      ];
    case 'koOpponentCharacter':
      return [chooseOpponentCharacter(f.fn, f.filter, f.maxTargets), { op: 'ko', target: { sel: 'var', name: 't' } }];
    case 'restOpponentCharacter':
      return [chooseOpponentCharacter(f.fn, f.filter, f.maxTargets), { op: 'rest', target: { sel: 'var', name: 't' } }];
    case 'returnToHand': {
      const from =
        f.target === 'any'
          ? ({ sel: 'allCharacters', maxCost: f.maxCost } as const)
          : ({ sel: 'opponentCharacters', maxCost: f.maxCost } as const);
      const promptSubject = f.target === 'any' ? 'Character' : "of your opponent's Characters";
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from,
          min: 0,
          max: 1,
          prompt: `Return up to 1 ${promptSubject} with a cost of ${f.maxCost} or less to the owner's hand (or decline).`,
        },
        { op: 'returnToHand', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'moveToBottomDeck': {
      const from =
        f.target === 'any'
          ? ({ sel: 'allCharacters', maxCost: f.maxCost } as const)
          : ({ sel: 'opponentCharacters', maxCost: f.maxCost } as const);
      const promptSubject = f.target === 'any' ? 'Character' : "of your opponent's Characters";
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from,
          min: 0,
          max: 1,
          prompt: `Place up to 1 ${promptSubject} with a cost of ${f.maxCost} or less at the bottom of the owner's deck (or decline).`,
        },
        { op: 'moveToBottomDeck', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'modifyCostOpponent': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentCharacters' },
          min: 0,
          max: maxTargets,
          prompt: `Give up to ${maxTargets} of your opponent's Characters ${f.amount} cost during this turn (or decline).`,
        },
        { op: 'addCost', target: { sel: 'var', name: 't' }, amount: f.amount, duration: 'duringThisTurn' },
      ];
    }
    case 'modifyPowerOpponent': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentCharacters' },
          min: 0,
          max: maxTargets,
          prompt: `Give up to ${maxTargets} of your opponent's Characters ${f.amount} power during this turn (or decline).`,
        },
        { op: 'addPower', target: { sel: 'var', name: 't' }, amount: f.amount, duration: 'duringThisTurn' },
      ];
    }
    case 'addPowerController': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerLeaderOrCharacters', ...f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Give up to ${maxTargets} of your Leader or Character cards +${f.amount} power (or decline).`,
        },
        { op: 'addPower', target: { sel: 'var', name: 't' }, amount: f.amount, duration: f.duration },
      ];
    }
    case 'addPowerControllerLeader':
      return [{ op: 'addPower', target: { sel: 'controllerLeader' }, amount: f.amount, duration: f.duration }];
    case 'addPowerControllerCharacter': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerCharacters', ...f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Give up to ${maxTargets} of your Characters +${f.amount} power (or decline).`,
        },
        { op: 'addPower', target: { sel: 'var', name: 't' }, amount: f.amount, duration: f.duration },
      ];
    }
    case 'modifyPowerOpponentLeaderOrCharacter': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentLeaderOrCharacters' },
          min: 0,
          max: maxTargets,
          prompt: `Give up to ${maxTargets} of your opponent's Leader or Character cards ${f.amount} power (or decline).`,
        },
        { op: 'addPower', target: { sel: 'var', name: 't' }, amount: f.amount, duration: f.duration },
      ];
    }
    case 'addKeywordSelf':
      return [
        {
          op: 'addKeyword',
          target: { sel: 'self' },
          keyword: f.keyword,
          duration: f.duration,
          ...(f.condition ? { condition: f.condition } : {}),
        },
      ];
    case 'preventBlockers': {
      if (f.target === 'chosenControllerLeaderOrCharacter') {
        return [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'controllerLeaderOrCharacters', ...f.filter },
            min: 0,
            max: 1,
            prompt: 'Choose up to 1 of your Leader or Character cards.',
          },
          {
            op: 'preventBlockers',
            target: { sel: 'var', name: 't' },
            duration: f.duration,
            ...(f.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: f.blockerPowerAtLeast } : {}),
          },
        ];
      }
      return [
        {
          op: 'preventBlockers',
          target: { sel: 'self' },
          duration: f.duration,
          ...(f.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: f.blockerPowerAtLeast } : {}),
        },
      ];
    }
    case 'drawAndTrash':
      return [
        { op: 'draw', amount: f.drawCount },
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand' },
          min: f.trashCount,
          max: f.trashCount,
          prompt: `Trash ${f.trashCount} card${f.trashCount === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ];
    case 'trashFromHand':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand' },
          min: f.count,
          max: f.count,
          prompt: `Trash ${f.count} card${f.count === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ];
    case 'trashTopDeck':
      return [{ op: 'trashTopDeck', count: f.count }];
    case 'playFromHand': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand', filter: f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Play up to ${maxTargets} matching Character card${maxTargets === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'playFromHand', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'triggerPlaySelf':
      return [{ op: 'playSelf' }];
    case 'searchTopDeck':
      return [
        {
          op: 'searchTopDeck',
          look: f.look,
          pick: f.pick,
          reveal: f.reveal,
          destination: f.destination,
          filter: f.filter,
          ...(f.remainder ? { remainder: f.remainder } : {}),
          prompt: `Look at the top ${f.look}: add up to ${f.pick} matching card${f.pick === 1 ? '' : 's'} to ${f.destination === 'lifeTop' ? 'the top of your Life cards' : 'your hand'}; the rest ${f.remainder === 'trash' ? 'go to your trash' : 'go to the bottom of your deck'}.`,
        },
      ];
    case 'addPowerSelf':
      return [
        {
          op: 'addPower',
          target: { sel: 'self' },
          amount: f.amount,
          duration: f.duration,
          ...(f.condition ? { condition: f.condition } : {}),
        },
      ];
    case 'setActiveSelf':
      return [{ op: 'setActive', target: { sel: 'self' } }];
    case 'setActiveControllerCharacter': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerCharacters', ...f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Set up to ${maxTargets} of your Characters as active (or decline).`,
        },
        { op: 'setActive', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'setActiveControllerDon':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerRestedDon' },
          min: 0,
          max: f.maxTargets,
          prompt: `Set up to ${f.maxTargets} of your DON!! cards as active (or decline).`,
        },
        { op: 'setActive', target: { sel: 'var', name: 't' } },
      ];
  }
  })();

  return withSequenceGate(ops);
}

const FACTORY_MAP: {
  [T in TemplateId]: (cardNumber: string, params: TemplateParamMap[T]) => EffectProgram;
} = {
  ability: (cn, p) => {
    const implicitGates = p.functions.some((f) => f.fn === 'giveDon')
      ? ([{ kind: 'selfRestedDonCount', atLeast: 1 }] as const)
      : [];
    const gates = [...(p.gate ?? []), ...implicitGates];
    return program(cn, [
      {
        timing: p.timing,
        ...(p.condition ? { condition: p.condition } : {}),
        ...(gates.length > 0 ? { gate: gates } : {}),
        ...(p.cost && p.cost.length > 0 ? { cost: p.cost } : {}),
        ...(p.oncePerTurn ? { oncePerTurn: true } : {}),
        ops: p.functions.flatMap(functionOps),
      },
    ]);
  },
};

export function applyTemplate<T extends TemplateId>(
  cardNumber: string,
  templateId: T,
  params: TemplateParamMap[T],
): EffectProgram {
  return FACTORY_MAP[templateId](cardNumber, params);
}
