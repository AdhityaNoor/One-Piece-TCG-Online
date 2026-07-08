/**
 * Template factories: translate reviewed timing + reusable functions to IR.
 *
 * This file produces plain JSON-serializable EffectProgram data. It does not
 * execute card text, and callers never pass raw card effect text.
 */
import type { Ability, EffectOp, EffectProgram, NonSuspendingEffectOp, Selector } from '../../../engine/effects/effectIr';
import type { KoReplacementAction } from '../../../engine/state/game';
import type { MoveCardDestination, MoveCardSource, SequencedAbilityFunction, TargetSpec, TemplateId, TemplateParamMap } from './templateDefs';

function koReplacementAction(f: {
  trashSelf?: true;
  trashFromHand?: { count: number; filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } };
  returnDon?: { count?: number };
  restDon?: { count?: number };
  lifeToHand?: { position?: 'top' | 'topOrBottom' };
  trashSource?: true;
  restSource?: true;
  restCharacter?: true;
}): KoReplacementAction {
  if (f.returnDon) return { kind: 'payAbilityCosts', costs: [{ kind: 'donMinus', count: f.returnDon.count ?? 1 }] };
  if (f.restDon) return { kind: 'payAbilityCosts', costs: [{ kind: 'restDon', count: f.restDon.count ?? 1 }] };
  if (f.lifeToHand) return { kind: 'chooseLifeToHand', position: f.lifeToHand.position ?? 'top' };
  if (f.restSource) return { kind: 'restSource' };
  if (f.restCharacter) return { kind: 'restCharacter', count: 1 };
  if (f.trashSource) return { kind: 'trashSource' };
  if (f.trashSelf) return { kind: 'trashSelf' };
  return {
    kind: 'trashFromHand',
    count: f.trashFromHand?.count ?? 1,
    ...(f.trashFromHand?.filter ? { filter: f.trashFromHand.filter } : {}),
  };
}

function program(cardNumber: string, abilities: Ability[]): EffectProgram {
  return { cardNumber, abilities };
}

function selectorFromTarget(target: TargetSpec): Selector {
  if ('ref' in target) {
    if (target.ref === 'self') return { sel: 'self' };
    if (target.ref === 'previous') return { sel: 'var', name: 't' };
    if (target.ref === 'battleOpponent') return { sel: 'var', name: 't' };
  }

  if (target.group === 'leader' && target.player === 'controller') return { sel: 'controllerLeader' };
  if (target.group === 'leader' && target.player === 'opponent') {
    return {
      sel: 'opponentLeader',
      ...(target.filter?.rested !== undefined ? { rested: target.filter.rested } : {}),
    };
  }
  if (target.group === 'leaderOrCharacters' && target.player === 'controller') return { sel: 'var', name: 't' };
  if (target.group === 'leaderOrCharacters' && target.player === 'opponent') return { sel: 'var', name: 't' };
  if (target.group === 'characters') return { sel: 'var', name: 't' };
  if (target.group === 'charactersOrDon' && target.player === 'opponent') return { sel: 'var', name: 't' };

  throw new Error(`Unsupported target ${JSON.stringify(target)}`);
}

function chooseFromTarget(target: TargetSpec): Extract<EffectOp, { op: 'chooseTargets' }>['from'] | null {
  if ('ref' in target) {
    if (target.ref === 'battleOpponent') return { sel: 'battleOpponent' };
    return null;
  }

  if (target.group === 'leader') return null;
  if (target.group === 'leaderOrCharacters' && target.player === 'controller') return { sel: 'controllerLeaderOrCharacters', ...target.filter };
  if (target.group === 'leaderOrCharacters' && target.player === 'opponent') return { sel: 'opponentLeaderOrCharacters' };
  if (target.group === 'characters' && target.player === 'controller') return { sel: 'controllerCharacters', ...target.filter };
  if (target.group === 'characters' && target.player === 'opponent') return { sel: 'opponentCharacters', ...target.filter };
  if (target.group === 'charactersOrDon' && target.player === 'opponent') return { sel: 'opponentCharactersOrDon' };
  if (target.group === 'characters' && target.player === 'any') return { sel: 'allCharacters', ...target.filter };

  throw new Error(`Unsupported target choice source ${JSON.stringify(target)}`);
}

function targetOps(
  target: TargetSpec,
  effect: (target: Selector) => EffectOp,
  options: { optional?: boolean; maxTargets?: number; maxCombinedPower?: number; prompt?: string } = {},
): EffectOp[] {
  const from = chooseFromTarget(target);
  if (!from) return [effect(selectorFromTarget(target))];
  const max = options.maxTargets ?? 1;
  return [
    {
      op: 'chooseTargets',
      var: 't',
      from,
      min: options.optional ?? true ? 0 : Math.min(1, max),
      max,
      prompt: options.prompt ?? `Choose ${options.optional ?? true ? 'up to ' : ''}${max} target${max === 1 ? '' : 's'}.`,
      ...(options.maxCombinedPower !== undefined ? { maxCombinedPower: options.maxCombinedPower } : {}),
    },
    effect(selectorFromTarget(target)),
  ];
}

function selectorFromMoveSource(from: MoveCardSource): Extract<EffectOp, { op: 'chooseTargets' }>['from'] {
  switch (from.zone) {
    case 'deck':
      if (from.player === 'controller' && from.position === 'top') return { sel: 'controllerDeckTop' };
      break;
    case 'hand':
      if (from.player === 'controller') return { sel: 'controllerHand', ...(from.filter ? { filter: from.filter } : {}) };
      if (from.player === 'opponent') return { sel: 'opponentHand' };
      break;
    case 'trash':
      if (from.player === 'controller') return { sel: 'controllerTrash', ...(from.filter ? { filter: from.filter } : {}) };
      if (from.player === 'opponent') return { sel: 'opponentTrash', ...(from.filter ? { filter: from.filter } : {}) };
      break;
    case 'stages':
      if (from.player === 'controller') return { sel: 'controllerStages', ...(from.filter?.maxCost !== undefined ? { maxCost: from.filter.maxCost } : {}) };
      if (from.player === 'opponent') return { sel: 'opponentStages', ...(from.filter?.maxCost !== undefined ? { maxCost: from.filter.maxCost } : {}) };
      if (from.player === 'any') return { sel: 'allStages' };
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
  if (to.zone === 'life' && (to.player === 'owner' || to.player === 'controller') && to.position === 'topOrBottom') {
    return {
      op: 'chooseOption',
      prompt: 'Place the card at the top or bottom of the Life cards.',
      options: [
        { label: 'top', ops: [{ op: 'moveToLifeTop', target, ...(to.faceUp ? { faceUp: true } : {}) }] },
        { label: 'bottom', ops: [{ op: 'moveToLifeBottom', target, ...(to.faceUp ? { faceUp: true } : {}) }] },
      ],
    };
  }
  if (to.zone === 'deck' && to.player === 'owner' && to.position === 'bottom') return { op: 'moveToBottomDeck', target };
  if (to.zone === 'trash' && to.player === 'owner') return { op: 'trashCards', target };
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
  if (f.from.zone === 'life' && f.from.position === 'topOrBottom' && f.from.player === 'controller' && f.to.zone === 'trash' && f.to.player === 'owner') {
    return [
      {
        op: 'chooseLifeToTrash',
        position: 'topOrBottom',
        optional,
        prompt: f.prompt ?? `${optional ? 'You may trash' : 'Trash'} 1 card from the top or bottom of your Life cards.`,
      },
    ];
  }
  if (f.from.zone === 'life' && f.from.position === 'top' && f.from.player === 'opponent' && f.to.zone === 'trash' && f.to.player === 'owner') {
    return [{ op: 'trashLife', player: 'opponent', count }];
  }
  if (f.from.zone === 'life' && f.from.position === 'top' && f.from.player === 'controller' && f.to.zone === 'trash' && f.to.player === 'owner') {
    if ('untilLife' in f.from && f.from.untilLife !== undefined) {
      return [{ op: 'trashLife', player: 'controller', untilLife: f.from.untilLife }];
    }
    return [{ op: 'trashLife', player: 'controller', count }];
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
      ...(f.chooser ? { chooser: f.chooser } : {}),
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
    case 'giveDon': {
      const optional = f.optional ?? false;
      if (f.targetName !== undefined) {
        return [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'controllerLeaderOrCharacters', name: f.targetName },
            min: optional ? 0 : 1,
            max: 1,
            prompt: `Give DON!! to your [${f.targetName}].`,
          },
          {
            op: 'giveDonFromCostArea',
            target: { sel: 'var', name: 't' },
            count: f.count,
            donOwner: 'controller',
            ...(f.activeDonOnly ? { activeOnly: true } : { restedOnly: true }),
          },
        ];
      }
      const from = f.charactersOnly
        ? ({ sel: 'controllerCharacters' as const, ...(f.targetTypeIncludes ? { typeIncludes: f.targetTypeIncludes } : {}) })
        : ({ sel: 'controllerLeaderOrCharacters' as const, ...(f.targetTypeIncludes ? { typeIncludes: f.targetTypeIncludes } : {}) });
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from,
          min: optional ? 0 : 1,
          max: 1,
          prompt: 'Give DON!! to your Leader or 1 of your Characters.',
        },
        { op: 'giveDon', target: { sel: 'var', name: 't' }, count: f.count },
      ];
    }
    case 'preventBlockersOnPreviousTarget':
      return [{ op: 'preventBlockers', target: { sel: 'var', name: 't' }, duration: f.duration, ifPrevious: 'previousMovedAny' }];
    case 'preventAttackLeaderWhileSummoningSick':
      return [{ op: 'preventAttack', target: { sel: 'self' }, duration: f.duration, forbiddenTarget: 'leader', whileSummoningSick: true }];
    case 'giveGivenDon': {
      const optional = f.optional ?? true;
      const count = f.count ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 'don',
          from: { sel: 'controllerAttachedDon' },
          min: optional ? 0 : count,
          max: count,
          prompt: 'Choose up to 1 of your currently given DON!! cards.',
        },
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerCharacters', ...(f.targetTypeIncludes ? { typeIncludes: f.targetTypeIncludes } : {}) },
          min: optional ? 0 : 1,
          max: 1,
          prompt: 'Give the chosen DON!! to 1 of your Characters.',
          ifPrevious: 'previousSelectedAny',
        },
        { op: 'giveGivenDon', donTarget: { sel: 'var', name: 'don' }, characterTarget: { sel: 'var', name: 't' } },
      ];
    }
    case 'ko':
      return targetOps(f.target, (target) => ({ op: 'ko', target }), {
        optional: f.optional,
        maxTargets: f.maxTargets,
        maxCombinedPower: f.maxCombinedPower,
        prompt: f.prompt,
      });
    case 'rest':
      return targetOps(f.target, (target) => ({ op: 'rest', target }), { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt });
    case 'preventRefresh':
      return targetOps(f.target, (target) => ({ op: 'preventRefresh', target }), { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt });
    case 'preventAttack':
      return targetOps(
        f.target,
        (target) => ({
          op: 'preventAttack',
          target,
          duration: f.duration,
          ...(f.attackUnlessGate?.length ? { attackUnlessGate: f.attackUnlessGate } : {}),
          ...(f.forbiddenTargetFilter ? { forbiddenTargetFilter: f.forbiddenTargetFilter } : {}),
          ...(f.condition ? { condition: f.condition } : {}),
        }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'preventAttackAll':
      return [{
        op: 'preventAttackController',
        player: 'controller',
        duration: f.duration,
        ...(f.forbiddenTarget ? { forbiddenTarget: f.forbiddenTarget } : {}),
      }];
    case 'setForcedAttackTarget':
      return [{
        op: 'setForcedAttackTarget',
        target: { sel: 'self' },
        duration: f.duration,
        ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
        ...(f.condition ? { condition: f.condition } : {}),
      }];
    case 'preventRest':
      return targetOps(
        f.target,
        (target) => ({ op: 'preventRest', target, duration: f.duration, ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}), ...(f.condition ? { condition: f.condition } : {}) }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'negateEffect':
      return targetOps(
        f.target,
        (target) => ({
          op: 'negateEffect',
          target,
          duration: f.duration,
          ...(f.negatedTimings?.length ? { negatedTimings: f.negatedTimings } : {}),
        }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'negateControllerEffects':
      return [{
        op: 'negateControllerEffects',
        player: f.player,
        duration: f.duration,
        ...(f.negatedTimings?.length ? { negatedTimings: f.negatedTimings } : {}),
      }];
    case 'addCost':
      return targetOps(
        f.target,
        (target) => ({ op: 'addCost', target, amount: f.amount, duration: f.duration ?? 'duringThisTurn', ...(f.condition ? { condition: f.condition } : {}) }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'addPower':
      return targetOps(
        f.target,
        (target) => ({ op: 'addPower', target, amount: f.amount, duration: f.duration, ...(f.condition ? { condition: f.condition } : {}) }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'setBasePower':
      return targetOps(
        f.target,
        (target) => ({ op: 'setBasePower', target, value: f.value, duration: f.duration, ...(f.condition ? { condition: f.condition } : {}) }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'setBaseCost':
      return targetOps(
        f.target,
        (target) => ({ op: 'setBaseCost', target, value: f.value, duration: f.duration, ...(f.condition ? { condition: f.condition } : {}) }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'addKeyword':
      return targetOps(
        f.target,
        (target) => ({ op: 'addKeyword', target, keyword: f.keyword, duration: f.duration, ...(f.condition ? { condition: f.condition } : {}) }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'addKeywordAuraControllerTypes':
      return [
        {
          op: 'addKeywordAura',
          group: { ownLeaderAndCharacters: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}), ...(f.anyOfNames ? { anyOfNames: f.anyOfNames } : {}) },
          keyword: f.keyword,
          duration: f.duration,
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          ...(f.gate ? { condition: { gate: f.gate } } : {}),
        },
      ];
    case 'addKeywordAuraControllerCharacters':
      return [
        {
          op: 'addKeywordAura',
          group: { ownLeaderAndCharacters: true, charactersOnly: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}), ...(f.anyOfNames ? { anyOfNames: f.anyOfNames } : {}) },
          keyword: f.keyword,
          duration: f.duration,
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          ...(f.gate ? { condition: { gate: f.gate } } : {}),
        },
      ];
    case 'preventBlockers': {
      if (f.target === 'chosenControllerLeaderOrCharacter') {
        const chooseFrom = {
          sel: 'controllerLeaderOrCharacters' as const,
          ...(f.filter?.typeIncludes ? { typeIncludes: f.filter.typeIncludes } : {}),
          ...(f.filter?.name ? { name: f.filter.name } : {}),
          ...(f.filter?.minPower !== undefined ? { minPower: f.filter.minPower } : {}),
        };
        return [
          {
            op: 'chooseTargets',
            var: 't',
            from: chooseFrom,
            min: 0,
            max: 1,
            prompt: 'Choose up to 1 of your Leader or Character cards.',
          },
          ...(f.powerBonus !== undefined
            ? [{ op: 'addPower' as const, target: { sel: 'var' as const, name: 't' }, amount: f.powerBonus, duration: f.duration }]
            : []),
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
    case 'suppressBlockerOnTarget':
      return targetOps(f.target, (target) => ({ op: 'suppressBlockerActivation', target, duration: f.duration }), { optional: f.optional, maxTargets: f.maxTargets });
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
          from: { sel: 'controllerHand', filter: { ...f.filter } },
          min: f.optional ? 0 : f.count,
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
    case 'moveAllCharactersToBottomDeck':
      return [{ op: 'moveToBottomDeck', target: { sel: 'allCharacters', ...(f.filter ?? {}) } }];
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
          options: f.options.map((option) => ({ label: option.label, ops: option.functions.flatMap(functionOps) })),
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
        { op: 'playFromHand', target: { sel: 'var', name: 't' }, ...(f.rested ? { rested: true } : {}) },
      ];
    }
    case 'playFromDeck': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'playFromDeck',
          pick: maxTargets,
          filter: f.filter,
          ...(f.rested ? { rested: true } : {}),
          prompt: `Play up to ${maxTargets} matching Character card${maxTargets === 1 ? '' : 's'} from your deck, then shuffle your deck.`,
        },
      ];
    }
    case 'playFromTrash': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerTrash', filter: f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Play up to ${maxTargets} matching Character card${maxTargets === 1 ? '' : 's'} from your trash${f.rested ? ' rested' : ''}.`,
        },
        { op: 'playFromTrash', target: { sel: 'var', name: 't' }, ...(f.rested ? { rested: true } : {}) },
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
          ...(f.rested ? { rested: true } : {}),
          prompt:
            f.destination === 'deckTopOrBottom'
              ? `Look at the top ${f.look}: choose cards to return to the top of your deck in selected order; the rest go to the bottom.`
              : f.destination === 'play'
                ? `Look at the top ${f.look}: play up to ${f.pick} matching card${f.pick === 1 ? '' : 's'}${f.rested ? ' rested' : ''}; the rest ${f.remainder === 'trash' ? 'go to your trash' : 'go to the bottom of your deck'}.`
                : `Look at the top ${f.look}: add up to ${f.pick} matching card${f.pick === 1 ? '' : 's'} to ${f.destination === 'lifeTop' ? 'the top of your Life cards' : 'your hand'}; the rest ${f.remainder === 'trash' ? 'go to your trash' : 'go to the bottom of your deck'}.`,
        },
      ];
    case 'addPowerSelf':
      return targetOps({ ref: 'self' }, (target) => ({ op: 'addPower', target, amount: f.amount, duration: f.duration, ...(f.condition ? { condition: f.condition } : {}) }));
    case 'addPowerSelfScaling':
      return [{ op: 'addPower', target: { sel: 'self' }, amount: 0, duration: f.duration, scale: { per: f.per, step: f.step, amountPer: f.amountPer }, ...(f.condition ? { condition: f.condition } : {}) }];
    case 'restSelf':
      return [{ op: 'rest', target: { sel: 'self' } }];
    case 'turnTopLifeFace':
      return [
        { op: 'chooseTargets', var: 't', from: { sel: 'controllerLifeTop' }, min: 0, max: 1, prompt: `You may turn the top card of your Life face-${f.faceUp ? 'up' : 'down'}.` },
        { op: 'turnLifeFace', target: { sel: 'var', name: 't' }, faceUp: f.faceUp },
      ];
    case 'restControllerLeaderOrStage':
      return [
        { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrStage', ...(f.typeIncludes ? { typeIncludes: f.typeIncludes } : {}) }, min: 0, max: 1, prompt: f.typeIncludes ? `You may rest 1 of your {${f.typeIncludes}} Leader or Stage cards.` : 'You may rest 1 of your Leader or Stage cards.' },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ];
    case 'setActiveSelf':
      return [{ op: 'setActive', target: { sel: 'self' } }];
    case 'setActiveControllerLeader':
      return [{ op: 'setActive', target: { sel: 'controllerLeader' } }];
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
    case 'returnOpponentDon':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentFieldDon' },
          min: f.count,
          max: f.count,
          chooser: 'opponent',
          prompt: `Choose ${f.count} DON!! card${f.count === 1 ? '' : 's'} from your field to return to your DON!! deck.`,
        },
        { op: 'returnDonToDonDeck', target: { sel: 'var', name: 't' } },
      ];
    case 'addPowerAuraControllerTypes':
      return [
        {
          op: 'addPowerAura',
          group: { ownLeaderAndCharacters: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}), ...(f.anyOfNames ? { anyOfNames: f.anyOfNames } : {}) },
          amount: f.amount,
          duration: f.duration,
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          ...(f.gate ? { condition: { gate: f.gate } } : {}),
        },
      ];
    case 'setBasePowerAuraControllerTypes':
      return [
        {
          op: 'setBasePowerAura',
          group: { ownLeaderAndCharacters: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}), ...(f.anyOfNames ? { anyOfNames: f.anyOfNames } : {}) },
          value: f.value,
          duration: f.duration,
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          ...(f.gate ? { condition: { gate: f.gate } } : {}),
        },
      ];
    case 'addPowerAuraOpponentCharacters':
      return [{ op: 'addPowerAura', group: { opponentCharacters: true }, amount: f.amount, duration: f.duration, ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}), ...(f.gate ? { condition: { gate: f.gate } } : {}) }];
    case 'addPowerAuraControllerCharacters':
      return [{
        op: 'addPowerAura',
        group: { ownLeaderAndCharacters: true, charactersOnly: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}), ...(f.anyOfNames ? { anyOfNames: f.anyOfNames } : {}) },
        amount: f.amount,
        duration: f.duration,
        ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
        ...(f.targetCondition || f.gate ? { condition: { ...(f.targetCondition ?? {}), ...(f.gate ? { gate: f.gate } : {}) } } : {}),
      }];
    case 'addCostAuraControllerCharacters':
      return [{ op: 'addCostAura', group: { ownLeaderAndCharacters: true, charactersOnly: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}) }, amount: f.amount, duration: f.duration, ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}), ...(f.gate ? { condition: { gate: f.gate } } : {}) }];
    case 'addCostAuraOpponentCharacters':
      return [{ op: 'addCostAura', group: { opponentCharacters: true }, amount: f.amount, duration: f.duration, ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}), ...(f.gate ? { condition: { gate: f.gate } } : {}) }];
    case 'addCostAuraSameCardInHand':
      return [{ op: 'addCostAura', group: { controllerSameDefinitionInHand: true }, amount: f.amount, duration: f.duration, ...(f.gate ? { condition: { gate: f.gate } } : {}) }];
    case 'addNextPlayFromHandCostDiscount': {
      const condition = f.filter?.minBaseCost !== undefined ? { minBaseCost: f.filter.minBaseCost } : undefined;
      return [{
        op: 'addCostAura',
        group: {
          controllerCharactersInHand: true,
          ...(f.filter?.typeIncludes ? { anyOfTypes: [f.filter.typeIncludes] } : {}),
        },
        amount: f.amount,
        duration: 'duringThisTurn',
        usesRemaining: 1,
        ...(condition ? { condition } : {}),
      }];
    }
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
          ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}),
          ...(f.effectSourceMaxBasePower !== undefined ? { effectSourceMaxBasePower: f.effectSourceMaxBasePower } : {}),
          ...(f.effectSourceCategory ? { effectSourceCategory: f.effectSourceCategory } : {}),
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
    case 'koImmunityAuraControllerCharacters':
      return [
        {
          op: 'addKoImmunityAura',
          group: {
            ownLeaderAndCharacters: true,
            charactersOnly: true,
            ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}),
            ...(f.excludeSource ? { excludeSource: true } : {}),
          },
          scope: f.scope,
          duration: f.duration,
          ...(f.targetCondition ? { condition: f.targetCondition } : {}),
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}),
        },
      ];
    case 'koImmunityChosen':
      return [{ op: 'addKoImmunity', target: { sel: 'var', name: 't' }, scope: f.scope, duration: f.duration }];
    case 'registerKoReplacementSelf':
      return [
        {
          op: 'registerKoReplacement',
          appliesTo: 'self',
          scope: f.scope ?? 'any',
          ...(f.oncePerTurn ? { oncePerTurn: true } : {}),
          action: koReplacementAction(f),
          duration: f.duration,
        },
      ];
    case 'registerKoReplacementAura':
      return [
        {
          op: 'registerKoReplacement',
          appliesTo: 'aura',
          group: {
            ownLeaderAndCharacters: true,
            charactersOnly: f.charactersOnly ?? true,
            ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}),
            ...(f.anyOfNames ? { anyOfNames: f.anyOfNames } : {}),
            ...(f.anyOfAttributes ? { anyOfAttributes: f.anyOfAttributes } : {}),
            ...(f.excludeSource ? { excludeSource: true } : {}),
          },
          scope: f.scope ?? 'any',
          ...(f.oncePerTurn ? { oncePerTurn: true } : {}),
          ...(f.targetCondition ? { condition: f.targetCondition } : {}),
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          action: koReplacementAction(f),
          duration: f.duration,
        },
      ];
    case 'koAllCharacters':
      return [
        {
          op: 'ko',
          target: { sel: 'allCharacters', ...(f.filter?.maxCost !== undefined ? { maxCost: f.filter.maxCost } : {}), ...(f.filter?.maxPower !== undefined ? { maxPower: f.filter.maxPower } : {}) },
        },
      ];
    case 'giveDonControllerLeader':
      return [{ op: 'giveDon', target: { sel: 'controllerLeader' }, count: f.count }];
    case 'giveDonFromOpponentCostArea':
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentCharacters' },
          min: f.optional === false ? 1 : 0,
          max: f.maxTargets ?? 1,
          prompt: 'Give DON!! from opponent cost area to 1 of their Characters.',
        },
        { op: 'giveDonFromCostArea', target: { sel: 'var', name: 't' }, count: f.count, donOwner: 'opponent', ...(f.restedOnly === true ? { restedOnly: true } : {}) },
      ];
    case 'giveDonFromPreviousTargetOwnerCostArea':
      return [
        {
          op: 'chooseTargets',
          var: 't2',
          from: { sel: 'ownerLeaderOrCharactersOfVar', varName: 't' },
          min: f.optional === false ? 1 : 0,
          max: 1,
          prompt: 'Give rested DON!! to Leader or 1 Character.',
        },
        {
          op: 'giveDonFromCostArea',
          target: { sel: 'var', name: 't2' },
          count: f.count,
          donOwner: { fromVar: 't' },
          restedOnly: f.restedOnly !== false,
        },
      ];
    case 'revealTopThen': {
      // Reveal the top card, then run the branch only if it matched: every branch op
      // is gated on `previousRevealMatched` (the reveal op sets that binding and it
      // persists across the branch, including across suspensions). Branch functions
      // must not carry their own ifPrevious — it is overwritten here.
      const branch = f.then.flatMap(functionOps).map((op) => ({ ...op, ifPrevious: 'previousRevealMatched' as const }));
      return [{ op: 'revealTopDeck', ...(f.filter ? { filter: f.filter } : {}) }, ...branch];
    }
    case 'revealOpponentTopIfChosenCostMatches': {
      const branch = f.then.flatMap(functionOps).map((op) => ({ ...op, ifPrevious: 'previousRevealMatched' as const }));
      return [
        { op: 'chooseCost', min: f.costMin ?? 0, max: f.costMax ?? 10, prompt: 'Choose a cost.' },
        { op: 'revealOpponentDeckTop' },
        ...branch,
      ];
    }
    case 'revealOpponentDeckTop':
      return [{ op: 'revealOpponentDeckTop' }];
  }
  })();

  return withSequenceGate(ops);
}

const FACTORY_MAP: {
  [T in TemplateId]: (cardNumber: string, params: TemplateParamMap[T]) => EffectProgram;
} = {
  ability: (cn, p) => {
    const implicitGates = p.functions.some((f) => f.fn === 'giveDon' || f.fn === 'giveGivenDon')
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
