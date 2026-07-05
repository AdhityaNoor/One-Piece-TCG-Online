/**
 * Template factories: translate reviewed timing + reusable functions to IR.
 *
 * This file produces plain JSON-serializable EffectProgram data. It does not
 * execute card text, and callers never pass raw card effect text.
 */
import type { Ability, EffectOp, EffectProgram, NonSuspendingEffectOp } from '../../../engine/effects/effectIr';
import type { MoveCardDestination, MoveCardSource, SequencedAbilityFunction, TemplateId, TemplateParamMap } from './templateDefs';

function program(cardNumber: string, abilities: Ability[]): EffectProgram {
  return { cardNumber, abilities };
}

function chooseOpponentCharacter(
  fn: 'koOpponentCharacter' | 'restOpponentCharacter',
  filter: { maxCost?: number; exactCost?: number; maxPower?: number; rested?: boolean; hasBlocker?: boolean },
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

function nonSuspendingBranchOps(functions: SequencedAbilityFunction[]): NonSuspendingEffectOp[] {
  const ops = functions.flatMap(functionOps);
  const suspending = ops.find((op) => op.op === 'chooseTargets' || op.op === 'searchTopDeck' || op.op === 'playFromDeck' || op.op === 'peekLifeThenPlace' || op.op === 'chooseLifeToHand' || op.op === 'chooseOption');
  if (suspending) {
    throw new Error(`chooseOne branch cannot contain suspending op '${suspending.op}' yet.`);
  }
  return ops as NonSuspendingEffectOp[];
}

function selectorFromMoveSource(from: MoveCardSource): Extract<EffectOp, { op: 'chooseTargets' }>['from'] {
  switch (from.zone) {
    case 'deck':
      if (from.player === 'controller' && from.position === 'top') return { sel: 'controllerDeckTop' };
      break;
    case 'hand':
      if (from.player === 'controller') return { sel: 'controllerHand', ...(from.filter ? { filter: from.filter } : {}) };
      break;
    case 'characters':
      if (from.player === 'controller') return { sel: 'controllerCharacters', ...from.filter };
      if (from.player === 'opponent') return { sel: 'opponentCharacters', ...from.filter };
      if (from.player === 'any') return { sel: 'allCharacters', ...from.filter };
      break;
    case 'life':
      break;
  }
  throw new Error(`Unsupported move source ${JSON.stringify(from)}`);
}

function moveOpForDestination(to: MoveCardDestination, target: Extract<EffectOp, { op: 'moveToHand' }>['target']): EffectOp {
  if (to.zone === 'hand' && to.player === 'owner') return { op: 'moveToHand', target };
  if (to.zone === 'life' && (to.player === 'owner' || to.player === 'controller') && to.position === 'top') {
    return { op: 'moveToLifeTop', target, ...(to.faceUp ? { faceUp: true } : {}) };
  }
  throw new Error(`Unsupported move destination ${JSON.stringify(to)}`);
}

function moveCardsOps(f: Extract<SequencedAbilityFunction, { fn: 'moveCards' }>): EffectOp[] {
  const optional = f.optional ?? false;
  const count = ('count' in f.from ? f.from.count : undefined) ?? f.maxTargets ?? 1;
  if (f.from.zone === 'life' && f.from.position === 'topOrBottom' && f.from.player === 'controller' && f.to.zone === 'hand' && f.to.player === 'owner') {
    return [
      {
        op: 'chooseLifeToHand',
        position: 'topOrBottom',
        optional,
        prompt: f.prompt ?? `${optional ? 'You may add' : 'Add'} 1 card from the top or bottom of your Life cards to your hand.`,
      },
    ];
  }
  if (f.from.zone === 'life' && f.from.position === 'top' && f.from.player === 'opponent' && f.to.zone === 'trash' && f.to.player === 'owner') {
    return [{ op: 'trashLife', player: 'opponent', count }];
  }
  if (f.from.zone === 'life' && f.from.position === 'top' && f.from.player === 'controller' && f.to.zone === 'hand' && f.to.player === 'owner') {
    return [
      {
        op: 'chooseLifeToHand',
        position: 'top',
        optional,
        prompt: f.prompt ?? `${optional ? 'You may add' : 'Add'} the top card of your Life cards to your hand.`,
      },
    ];
  }

  const from = selectorFromMoveSource(f.from);
  const target = { sel: 'var', name: 't' } as const;
  const moveOp = moveOpForDestination(f.to, target);
  if (!optional && f.from.zone === 'deck' && f.from.position === 'top') {
    return [moveOpForDestination(f.to, { sel: 'controllerDeckTop' })];
  }
  return [
    {
      op: 'chooseTargets',
      var: 't',
      from,
      min: optional ? 0 : Math.min(1, count),
      max: count,
      prompt: f.prompt ?? `${optional ? 'Choose up to' : 'Choose'} ${count} card${count === 1 ? '' : 's'} to move.`,
    },
    moveOp,
  ];
}

function functionOps(f: SequencedAbilityFunction): EffectOp[] {
  const withSequenceGate = (ops: EffectOp[]): EffectOp[] =>
    f.ifPrevious || f.ifGate
      ? ops.map((op) => ({
          ...op,
          ...(f.ifPrevious ? { ifPrevious: f.ifPrevious } : {}),
          ...(f.ifGate ? { ifGate: f.ifGate } : {}),
        }))
      : ops;

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
      const filter = { ...(f.maxCost !== undefined ? { maxCost: f.maxCost } : {}), ...(f.maxPower !== undefined ? { maxPower: f.maxPower } : {}) };
      const from =
        f.target === 'any'
          ? ({ sel: 'allCharacters', ...filter } as const)
          : ({ sel: 'opponentCharacters', ...filter } as const);
      const promptSubject = f.target === 'any' ? 'Character' : "of your opponent's Characters";
      const limit = f.maxPower !== undefined ? `with ${f.maxPower} power or less` : `with a cost of ${f.maxCost} or less`;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from,
          min: 0,
          max: 1,
          prompt: `Place up to 1 ${promptSubject} ${limit} at the bottom of the owner's deck (or decline).`,
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
    case 'addKeywordControllerLeaderOrCharacter': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerLeaderOrCharacters', ...f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Give up to ${maxTargets} of your Leader or Character cards ${f.keyword}.`,
        },
        { op: 'addKeyword', target: { sel: 'var', name: 't' }, keyword: f.keyword, duration: f.duration },
      ];
    }
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
    case 'trashTypeFromHand':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand', filter: { ...(f.filter.typeIncludes ? { typeIncludes: f.filter.typeIncludes } : {}) } },
          min: f.count,
          max: f.count,
          prompt: `Trash ${f.count} ${f.filter.typeIncludes ? `{${f.filter.typeIncludes}} ` : ''}card${f.count === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ];
    case 'optionalTrashFromHand':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand' },
          min: 0,
          max: f.count,
          prompt: `You may trash ${f.count} card${f.count === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ];
    case 'trashFromOpponentHandChosenByOpponent':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentHand' },
          min: f.count,
          max: f.count,
          chooser: 'opponent',
          prompt: `Choose ${f.count} card${f.count === 1 ? '' : 's'} from your hand to trash.`,
        },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ];
    case 'trashTopDeck':
      return [{ op: 'trashTopDeck', count: f.count }];
    case 'moveCards':
      return moveCardsOps(f);
    case 'peekLifeAndPlace':
      return [
        {
          op: 'peekLifeThenPlace',
          from: { sel: 'controllerOrOpponentLifeTop' },
          prompt: 'Look at up to 1 card from the top of your or your opponent\'s Life cards. Select it to place it at the bottom; select none to leave it on top.',
        },
      ];
    case 'chooseOne':
      return [
        {
          op: 'chooseOption',
          chooser: f.chooser,
          prompt: f.prompt,
          options: f.options.map((option) => ({ label: option.label, ops: nonSuspendingBranchOps(option.functions) })),
        },
      ];
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
    case 'playFromDeck': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'playFromDeck',
          pick: maxTargets,
          filter: f.filter,
          prompt: `Play up to ${maxTargets} matching Character card${maxTargets === 1 ? '' : 's'} from your deck, then shuffle your deck.`,
        },
      ];
    }
    case 'moveFromTrashToHand': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerTrash', filter: f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Add up to ${maxTargets} matching card${maxTargets === 1 ? '' : 's'} from your trash to your hand.`,
        },
        { op: 'moveToHand', target: { sel: 'var', name: 't' } },
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
          ...(f.filter ? { filter: f.filter } : {}),
          ...(f.remainder ? { remainder: f.remainder } : {}),
          prompt:
            f.destination === 'deckTopOrBottom'
              ? `Look at the top ${f.look}: choose cards to return to the top of your deck in selected order; the rest go to the bottom.`
              : `Look at the top ${f.look}: add up to ${f.pick} matching card${f.pick === 1 ? '' : 's'} to ${f.destination === 'lifeTop' ? 'the top of your Life cards' : 'your hand'}; the rest ${f.remainder === 'trash' ? 'go to your trash' : 'go to the bottom of your deck'}.`,
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
    case 'restSelf':
      return [{ op: 'rest', target: { sel: 'self' } }];
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
    case 'restOpponentDon': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentActiveDon' },
          min: 0,
          max: maxTargets,
          prompt: `Rest up to ${maxTargets} of your opponent's DON!! cards (or decline).`,
        },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'addPowerAuraControllerTypes':
      return [
        {
          op: 'addPowerAura',
          group: { ownLeaderAndCharacters: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}) },
          amount: f.amount,
          duration: f.duration,
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
        },
      ];
    case 'addPowerControllerCharactersAll':
      return [
        {
          op: 'addPower',
          target: { sel: 'controllerCharacters', ...(f.filter?.typeIncludes ? { typeIncludes: f.filter.typeIncludes } : {}), ...(f.filter?.maxCost !== undefined ? { maxCost: f.filter.maxCost } : {}) },
          amount: f.amount,
          duration: f.duration,
        },
      ];
    case 'koImmunitySelf':
      return [
        {
          op: 'addKoImmunity',
          target: { sel: 'self' },
          scope: f.scope,
          duration: f.duration,
          ...(f.condition ? { condition: f.condition } : {}),
          ...(f.attackerCategory ? { attackerCategory: f.attackerCategory } : {}),
        },
      ];
    case 'koImmunityControllerCharactersAll':
      return [
        {
          op: 'addKoImmunity',
          target: { sel: 'controllerCharacters' },
          scope: f.scope,
          duration: f.duration,
          ...(f.condition ? { condition: f.condition } : {}),
        },
      ];
    case 'koImmunityChosen':
      return [{ op: 'addKoImmunity', target: { sel: 'var', name: 't' }, scope: f.scope, duration: f.duration }];
    case 'koAllCharacters':
      return [
        {
          op: 'ko',
          target: { sel: 'allCharacters', ...(f.filter?.maxCost !== undefined ? { maxCost: f.filter.maxCost } : {}), ...(f.filter?.maxPower !== undefined ? { maxPower: f.filter.maxPower } : {}) },
        },
      ];
    case 'koSelf':
      return [{ op: 'ko', target: { sel: 'self' } }];
    case 'giveDonControllerLeader':
      return [{ op: 'giveDon', target: { sel: 'controllerLeader' }, count: f.count }];
    case 'koBattleOpponent':
      return [
        { op: 'chooseTargets', var: 't', from: { sel: 'battleOpponent' }, min: 0, max: 1, prompt: "K.O. the opponent's Character you battled with (or decline)." },
        { op: 'ko', target: { sel: 'var', name: 't' } },
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
        ...(p.battlingOpponentAttribute ? { battlingOpponentAttribute: p.battlingOpponentAttribute } : {}),
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
