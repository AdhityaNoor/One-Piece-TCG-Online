/**
 * Template factories: translate reviewed timing + reusable functions to IR.
 *
 * This file produces plain JSON-serializable EffectProgram data. It does not
 * execute card text, and callers never pass raw card effect text.
 */
import type { Ability, EffectOp, EffectProgram, NonSuspendingEffectOp, Selector } from '../../../engine/effects/effectIr';
import type { KoReplacementAction, KoReplacementLeaderOrNamedFilter } from '../../../engine/state/game';
import type { MoveCardDestination, MoveCardSource, SequencedAbilityFunction, TargetFilter, TargetSpec, TemplateId, TemplateParamMap } from './templateDefs';

function koReplacementAction(f: {
  trashSelf?: true;
  trashFromHand?: { count: number; filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } };
  returnDon?: { count?: number };
  restDon?: { count?: number };
  lifeToHand?: { position?: 'top' | 'topOrBottom' };
  trashLife?: { position?: 'top' | 'bottom' | 'topOrBottom' };
  trashSource?: true;
  returnSourceToHand?: true;
  restSource?: true;
  restCharacter?: true;
  restCards?: { count?: number };
  restCharacterFilter?: { minCost?: number; excludeSourceName?: boolean; typeIncludes?: string };
  bottomDeckCharacter?: true;
  trashSelfAndDraw?: { amount: number };
  trashTrashToDeckBottom?: { count: number };
  turnTopLifeFace?: { faceUp: boolean };
  giveSelfPowerPenalty?: { amount: number; duration: import('../../../engine/effects/effectIr').IrDuration };
  giveLeaderPowerPenalty?: { amount: number; duration: import('../../../engine/effects/effectIr').IrDuration };
  moveTargetToLifeFaceDown?: true;
  restTargetAndTrashFromHand?: { filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } };
  restLeaderOrNamed?: KoReplacementLeaderOrNamedFilter;
}): KoReplacementAction {
  if (f.restLeaderOrNamed) return { kind: 'restLeaderOrNamed', filter: f.restLeaderOrNamed };
  if (f.restTargetAndTrashFromHand) return { kind: 'restTargetAndTrashFromHand', ...(f.restTargetAndTrashFromHand.filter ? { filter: f.restTargetAndTrashFromHand.filter } : {}) };
  if (f.returnDon) return { kind: 'payAbilityCosts', costs: [{ kind: 'donMinus', count: f.returnDon.count ?? 1 }] };
  if (f.restDon) return { kind: 'payAbilityCosts', costs: [{ kind: 'restDon', count: f.restDon.count ?? 1 }] };
  if (f.lifeToHand) return { kind: 'chooseLifeToHand', position: f.lifeToHand.position ?? 'top' };
  if (f.trashLife) return { kind: 'trashLife', position: f.trashLife.position ?? 'topOrBottom' };
  if (f.restSource) return { kind: 'restSource' };
  if (f.restCharacter) {
    return {
      kind: 'restCharacter',
      count: 1,
      ...(f.restCharacterFilter ? { filter: f.restCharacterFilter } : {}),
    };
  }
  if (f.restCards) return { kind: 'restCards', count: f.restCards.count ?? 1 };
  if (f.bottomDeckCharacter) return { kind: 'bottomDeckCharacter', count: 1 };
  if (f.trashSelfAndDraw) return { kind: 'trashSelfAndDraw', drawAmount: f.trashSelfAndDraw.amount };
  if (f.trashTrashToDeckBottom) return { kind: 'trashTrashToDeckBottom', count: f.trashTrashToDeckBottom.count };
  if (f.turnTopLifeFace) return { kind: 'turnTopLifeFace', faceUp: f.turnTopLifeFace.faceUp };
  if (f.giveSelfPowerPenalty) return { kind: 'giveSelfPowerPenalty', amount: f.giveSelfPowerPenalty.amount, duration: f.giveSelfPowerPenalty.duration };
  if (f.giveLeaderPowerPenalty) return { kind: 'giveLeaderPowerPenalty', amount: f.giveLeaderPowerPenalty.amount, duration: f.giveLeaderPowerPenalty.duration };
  if (f.moveTargetToLifeFaceDown) return { kind: 'moveTargetToLifeFaceDown' };
  if (f.returnSourceToHand) return { kind: 'returnSourceToHand' };
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
    if (target.ref === 'eventPlayedCharacter') return { sel: 'eventPlayedCharacter' };
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
  if (target.group === 'charactersOrStages') return { sel: 'var', name: 't' };

  throw new Error(`Unsupported target ${JSON.stringify(target)}`);
}

function stageFilterFromTarget(filter: TargetFilter | undefined): { maxCost?: number; exactCost?: number; rested?: boolean } {
  return {
    ...(filter?.maxCost !== undefined ? { maxCost: filter.maxCost } : {}),
    ...(filter?.exactCost !== undefined ? { exactCost: filter.exactCost } : {}),
    ...(filter?.rested !== undefined ? { rested: filter.rested } : {}),
  };
}

function chooseFromTarget(target: TargetSpec): Extract<EffectOp, { op: 'chooseTargets' }>['from'] | null {
  if ('ref' in target) {
    if (target.ref === 'battleOpponent') return { sel: 'battleOpponent' };
    return null;
  }

  if (target.group === 'leader') return null;
  if (target.group === 'leaderOrCharacters' && target.player === 'controller') return { sel: 'controllerLeaderOrCharacters', ...target.filter };
  if (target.group === 'leaderOrCharacters' && target.player === 'opponent') {
    const { restedLeader, ...charFilter } = target.filter ?? {};
    return {
      sel: 'opponentLeaderOrCharacters',
      ...(restedLeader !== undefined ? { restedLeader } : {}),
      ...charFilter,
    };
  }
  if (target.group === 'characters' && target.player === 'controller') return { sel: 'controllerCharacters', ...target.filter };
  if (target.group === 'characters' && target.player === 'opponent') return { sel: 'opponentCharacters', ...target.filter };
  if (target.group === 'charactersOrDon' && target.player === 'opponent') {
    return {
      sel: 'union',
      members: [
        { sel: 'opponentCharacters', ...(target.filter?.maxCost !== undefined ? { maxCost: target.filter.maxCost } : {}) },
        { sel: 'opponentUnattachedDon' },
      ],
    };
  }
  if (target.group === 'charactersOrStages') {
    const stageFilter = stageFilterFromTarget(target.filter);
    if (target.player === 'controller') {
      return { sel: 'union', members: [{ sel: 'controllerCharacters', ...target.filter }, { sel: 'controllerStages', ...stageFilter }] };
    }
    if (target.player === 'opponent') {
      return { sel: 'union', members: [{ sel: 'opponentCharacters', ...target.filter }, { sel: 'opponentStages', ...stageFilter }] };
    }
    return { sel: 'union', members: [{ sel: 'allCharacters', ...target.filter }, { sel: 'allStages', ...stageFilter }] };
  }
  if (target.group === 'characters' && target.player === 'any') return { sel: 'allCharacters', ...target.filter };

  throw new Error(`Unsupported target choice source ${JSON.stringify(target)}`);
}

function targetOps(
  target: TargetSpec,
  effect: (target: Selector) => EffectOp,
  options: { optional?: boolean; minTargets?: number; maxTargets?: number; maxCombinedPower?: number; prompt?: string } = {},
): EffectOp[] {
  const from = chooseFromTarget(target);
  if (!from) return [effect(selectorFromTarget(target))];
  const max = options.maxTargets ?? 1;
  const min = options.minTargets ?? (options.optional ?? true ? 0 : Math.min(1, max));
  return [
    {
      op: 'chooseTargets',
      var: 't',
      from,
      min,
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
      if (from.player === 'controller') return { sel: 'controllerStages', ...(from.filter?.maxCost !== undefined ? { maxCost: from.filter.maxCost } : {}), ...(from.filter?.exactCost !== undefined ? { exactCost: from.filter.exactCost } : {}) };
      if (from.player === 'opponent') return { sel: 'opponentStages', ...(from.filter?.maxCost !== undefined ? { maxCost: from.filter.maxCost } : {}), ...(from.filter?.exactCost !== undefined ? { exactCost: from.filter.exactCost } : {}) };
      if (from.player === 'any') return { sel: 'allStages' };
      break;
    case 'characters':
      if (from.player === 'controller') return { sel: 'controllerCharacters', ...from.filter };
      if (from.player === 'opponent') return { sel: 'opponentCharacters', ...from.filter };
      if (from.player === 'any') return { sel: 'allCharacters', ...from.filter };
      break;
    case 'life':
      if (from.player === 'controller' && from.position === 'top') return { sel: 'controllerLifeTop' };
      if (from.player === 'opponent' && from.position === 'top') return { sel: 'opponentLifeTop' };
      if (from.player === 'controller' && from.position === 'topOrBottom') return { sel: 'controllerLifeTopBottom' };
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
  if (to.zone === 'deck' && to.player === 'owner' && to.position === 'top') return { op: 'moveToTopDeck', target };
  if (to.zone === 'trash' && to.player === 'owner') return { op: 'trashCards', target };
  throw new Error(`Unsupported move destination ${JSON.stringify(to)}`);
}

function moveCardsOps(f: Extract<SequencedAbilityFunction, { fn: 'moveCards' }>): EffectOp[] {
  const optional = f.optional ?? false;
  const count = ('count' in f.from ? f.from.count : undefined) ?? f.maxTargets ?? 1;
  const minTargets = f.minTargets ?? (optional ? 0 : Math.min(1, count));
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
  if (f.from.zone === 'life' && f.from.position === 'top' && f.from.player === 'opponent' && f.to.zone === 'hand' && f.to.player === 'owner') {
    if (optional) {
      return [{
        op: 'chooseLifeToHand',
        position: 'top',
        optional: true,
        player: 'opponent',
        prompt: f.prompt ?? 'You may add 1 card from the top of your opponent\'s Life cards to the owner\'s hand.',
      }];
    }
    return [{ op: 'moveLifeTopToHand', player: 'opponent', count }];
  }
  if (f.from.zone === 'life' && f.from.position === 'top' && f.from.player === 'opponent' && f.to.zone === 'trash' && f.to.player === 'owner') {
    if (optional) {
      const target = { sel: 'var', name: 't' } as const;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentLifeTop' },
          min: 0,
          max: count,
          prompt: f.prompt ?? `Choose up to ${count} card${count === 1 ? '' : 's'} from the top of your opponent's Life cards to trash.`,
          ...(f.chooser ? { chooser: f.chooser } : {}),
        },
        { op: 'trashCards', target },
      ];
    }
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
      min: minTargets,
      max: count,
      prompt: f.prompt ?? `${optional ? 'Choose up to' : 'Choose'} ${count} card${count === 1 ? '' : 's'} to move.`,
      ...(f.chooser ? { chooser: f.chooser } : {}),
    },
    moveOp,
  ];
}

function functionOps(f: SequencedAbilityFunction): EffectOp[] {
  const withSequenceGate = (ops: EffectOp[]): EffectOp[] =>
    f.ifPrevious || f.ifPreviousMovedAnyCostAtLeast !== undefined || f.ifGate
      ? ops.map((op) => ({
          ...op,
          ...(f.ifPrevious ? { ifPrevious: f.ifPrevious } : {}),
          ...(f.ifPreviousMovedAnyCostAtLeast !== undefined ? { ifPreviousMovedAnyCostAtLeast: f.ifPreviousMovedAnyCostAtLeast } : {}),
          ...(f.ifGate ? { ifGate: f.ifGate } : {}),
        }))
      : ops;

  const ops = ((): EffectOp[] => {
  switch (f.fn) {
    case 'draw':
      return [{ op: 'draw', amount: f.amount, ...(f.player ? { player: f.player } : {}) }];
    case 'drawUntilHandCount':
      return [{ op: 'drawUntilHandCount', targetCount: f.targetCount, ...(f.player ? { player: f.player } : {}) }];
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
        ? ({ sel: 'controllerCharacters' as const, ...(f.targetTypeIncludes ? { typeIncludes: f.targetTypeIncludes } : {}), ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}) })
        : ({ sel: 'controllerLeaderOrCharacters' as const, ...(f.targetTypeIncludes ? { typeIncludes: f.targetTypeIncludes } : {}), ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}) });
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from,
          min: optional ? 0 : 1,
          max: 1,
          prompt: 'Give DON!! to your Leader or 1 of your Characters.',
        },
        f.activeDonOnly
          ? { op: 'giveDonFromCostArea', target: { sel: 'var', name: 't' }, count: f.count, donOwner: 'controller', activeOnly: true }
          : { op: 'giveDon', target: { sel: 'var', name: 't' }, count: f.count },
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
      return targetOps(
        f.target,
        (target) => ({
          op: 'preventRefresh',
          target,
          ...(f.maxCost !== undefined ? { maxCost: f.maxCost } : {}),
        }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
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
    case 'redirectAttackTarget':
      return targetOps(
        f.target,
        (target) => ({ op: 'redirectAttackTarget', target }),
        { optional: f.optional, maxTargets: f.maxTargets ?? 1, prompt: f.prompt },
      );
    case 'swapBasePower': {
      const from = chooseFromTarget(f.target);
      if (!from) throw new Error(`swapBasePower requires a choosable target, got ${JSON.stringify(f.target)}`);
      const minT = f.minTargets ?? 2;
      const maxT = f.maxTargets ?? minT;
      const leaderAndCharacter = f.swapKind === 'leaderAndCharacter';
      return [
        {
          op: 'chooseTargets',
          var: 'swap',
          from,
          min: minT,
          max: maxT,
          prompt: f.prompt ?? (leaderAndCharacter ? 'Select your Leader and 1 Character to swap base power.' : `Select ${minT} cards to swap base power.`),
          ...(leaderAndCharacter ? { mustIncludeControllerLeader: true } : {}),
        },
        {
          op: 'swapBasePower',
          var: 'swap',
          duration: f.duration,
          ...(leaderAndCharacter ? { mustIncludeControllerLeader: true } : {}),
        },
      ];
    }
    case 'preventRest':
      return targetOps(
        f.target,
        (target) => ({ op: 'preventRest', target, duration: f.duration, ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}), ...(f.condition ? { condition: f.condition } : {}) }),
        { optional: f.optional, maxTargets: f.maxTargets, prompt: f.prompt },
      );
    case 'preventFieldRemoval':
      return targetOps(
        f.target,
        (target) => ({ op: 'preventFieldRemoval', target, duration: f.duration, ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}), ...(f.condition ? { condition: f.condition } : {}) }),
        {},
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
        ...(f.appliesToCategories?.length ? { appliesToCategories: f.appliesToCategories } : {}),
        ...(f.exceptTypeIncludes ? { exceptTypeIncludes: f.exceptTypeIncludes } : {}),
      }];
    case 'preventControllerLifeToHand':
      return [{
        op: 'preventControllerLifeToHand',
        player: f.player ?? 'controller',
        duration: f.duration,
      }];
    case 'preventControllerCharacterPlay':
      return [{
        op: 'preventControllerCharacterPlay',
        player: f.player ?? 'controller',
        duration: f.duration,
        ...(f.minBaseCost !== undefined ? { minBaseCost: f.minBaseCost } : {}),
        ...(f.maxBaseCost !== undefined ? { maxBaseCost: f.maxBaseCost } : {}),
      }];
    case 'preventControllerHandPlay':
      return [{
        op: 'preventControllerHandPlay',
        player: f.player ?? 'controller',
        duration: f.duration,
      }];
    case 'preventControllerCharacterSetActiveDon':
      return [{
        op: 'preventControllerCharacterSetActiveDon',
        player: f.player ?? 'controller',
        duration: f.duration,
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
    case 'setBasePowerFromSource': {
      const sourceFrom = chooseFromTarget(f.source);
      if (sourceFrom) {
        return [
          {
            op: 'chooseTargets',
            var: 'basePowerSource',
            from: sourceFrom,
            min: f.optional ? 0 : 1,
            max: f.maxTargets ?? 1,
            prompt: f.prompt ?? 'Select a card to copy power from.',
          },
          {
            op: 'setBasePowerFromSource',
            target: selectorFromTarget(f.target),
            source: { sel: 'var', name: 'basePowerSource' },
            duration: f.duration,
            ifPrevious: 'previousSelectedAny',
            ...(f.condition ? { condition: f.condition } : {}),
          },
        ];
      }
      return [{
        op: 'setBasePowerFromSource',
        target: selectorFromTarget(f.target),
        source: selectorFromTarget(f.source),
        duration: f.duration,
        ...(f.condition ? { condition: f.condition } : {}),
      }];
    }
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
      if (f.target === 'controllerLeader') {
        return [
          {
            op: 'preventBlockers',
            target: { sel: 'controllerLeader' },
            duration: f.duration,
            ...(f.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: f.blockerPowerAtLeast } : {}),
            ...(f.blockerPowerAtMost !== undefined ? { blockerPowerAtMost: f.blockerPowerAtMost } : {}),
            ...(f.blockerMaxCost !== undefined ? { blockerMaxCost: f.blockerMaxCost } : {}),
          },
        ];
      }
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
            ...(f.blockerPowerAtMost !== undefined ? { blockerPowerAtMost: f.blockerPowerAtMost } : {}),
            ...(f.blockerMaxCost !== undefined ? { blockerMaxCost: f.blockerMaxCost } : {}),
          },
        ];
      }
      return [
        {
          op: 'preventBlockers',
          target: { sel: 'self' },
          duration: f.duration,
          ...(f.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: f.blockerPowerAtLeast } : {}),
          ...(f.blockerPowerAtMost !== undefined ? { blockerPowerAtMost: f.blockerPowerAtMost } : {}),
          ...(f.blockerMaxCost !== undefined ? { blockerMaxCost: f.blockerMaxCost } : {}),
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
    case 'drawAndTrashByTypedCharacterCount':
      return [
        { op: 'drawByTypedCharacterCount', typeIncludes: f.typeIncludes },
        {
          op: 'trashFromHandByCountVar',
          countVar: '__lastDrawCount',
          prompt: 'Trash the same number of cards from your hand.',
        },
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
    case 'optionalRevealTypeFromHand': {
      const count = f.count ?? 1;
      if (count > 1) {
        return [{
          op: 'chooseOption',
          prompt: f.prompt ?? `You may reveal ${count} cards from your hand.`,
          ifGate: [{ kind: 'selfHandMatching', atLeast: count, ...(f.filter ?? {}) }],
          options: [
            { label: 'doNotReveal', ops: [{ op: 'revealCards', target: { sel: 'var', name: '__none' } }] },
            {
              label: 'reveal',
              ops: [
                { op: 'chooseTargets', var: 't', from: { sel: 'controllerHand', ...(f.filter ? { filter: f.filter } : {}) }, min: count, max: count, prompt: f.prompt ?? `Reveal ${count} cards from your hand.` },
                { op: 'revealCards', target: { sel: 'var', name: 't' } },
              ],
            },
          ],
        }];
      }
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand', ...(f.filter ? { filter: f.filter } : {}) },
          min: 0,
          max: 1,
          prompt: f.prompt ?? 'You may reveal 1 card from your hand.',
        },
        { op: 'revealCards', target: { sel: 'var', name: 't' }, ifPrevious: 'previousSelectedAny' },
      ];
    }
    case 'optionalTrashFromHand': {
      const anyNumber = f.anyNumber === true;
      const count = f.count ?? 1;
      const filterLabel = f.filter?.anyOf
        ? 'Event or Stage'
        : f.filter?.category === 'event'
          ? 'Event'
          : f.filter?.category === 'stage'
            ? 'Stage'
            : '';
      return [
        {
          op: 'chooseTargets',
          var: 't',
          // excludeSelf: this cost sometimes pays for a "play this card" trigger
          // (see triggerPlaySelf) while the source card is itself still sitting
          // in hand (a Life [Trigger] card revealed into hand before its
          // ability resolves) — without this, the card could trash itself as
          // its own cost and silently forfeit its own "play this" clause.
          // Harmless no-op for non-hand-timed uses (e.g. onPlay), since the
          // source is already on the field by the time those fire.
          from: { sel: 'controllerHand', excludeSelf: true, ...(f.filter ? { filter: f.filter } : {}) },
          min: 0,
          max: anyNumber ? -1 : count,
          prompt: anyNumber
            ? `You may trash any number of ${filterLabel || ''} cards from your hand.`.replace(/\s+/g, ' ').trim()
            : `You may trash ${count} card${count === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'trashCards', target: { sel: 'var', name: 't' } },
      ];
    }
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
    case 'revealOpponentHand': {
      const count = f.count ?? 0;
      if (count <= 0) return [{ op: 'revealCards', target: { sel: 'opponentHand' } }];
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'opponentHand' },
          min: count,
          max: count,
          prompt: `Choose ${count} card${count === 1 ? '' : 's'} from your opponent's hand to reveal.`,
        },
        { op: 'revealCards', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'trashTopDeck':
      return [{ op: 'trashTopDeck', count: f.count }];
    case 'trashSelf':
      return [{ op: 'trashCards', target: { sel: 'self' } }];
    case 'returnSelfToHand':
      return [{ op: 'moveToHand', target: { sel: 'self' } }];
    case 'moveCards':
      return moveCardsOps(f);
    case 'moveAllCards':
      return [moveOpForDestination(f.to, selectorFromMoveSource(f.from))];
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
      const category = f.filter.category;
      const noun = category === 'stage' ? 'Stage' : category === 'event' ? 'Event' : 'Character';
      const player = f.player ?? 'controller';
      const chooser = f.chooser ?? player;
      const whoseHand = player === 'opponent' ? "your opponent's hand" : 'your hand';
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: player === 'opponent' ? 'opponentHand' : 'controllerHand', filter: f.filter },
          min: 0,
          max: maxTargets,
          chooser,
          prompt: `Play up to ${maxTargets} matching ${noun} card${maxTargets === 1 ? '' : 's'} from ${whoseHand}.`,
          ...(f.distinctNames ? { distinctNames: true } : {}),
        },
        { op: 'playFromHand', target: { sel: 'var', name: 't' }, ...(f.rested ? { rested: true } : {}) },
      ];
    }
    case 'activateEventFromHand': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerHand', filter: f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Activate up to ${maxTargets} matching Event card${maxTargets === 1 ? '' : 's'} from your hand.`,
        },
        { op: 'activateEventFromHand', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'activateEventFromTrash': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerTrash', filter: f.filter },
          min: 0,
          max: maxTargets,
          prompt: `Activate up to ${maxTargets} matching Event card${maxTargets === 1 ? '' : 's'} from your trash.`,
        },
        { op: 'activateEventFromTrash', target: { sel: 'var', name: 't' } },
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
    case 'playStageFromDeck': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'playStageFromDeck',
          pick: maxTargets,
          filter: f.filter,
          prompt: `Play up to ${maxTargets} matching Stage card${maxTargets === 1 ? '' : 's'} from your deck, then shuffle your deck.`,
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
          ...(f.distinctNames ? { distinctNames: true } : {}),
        },
        { op: 'playFromTrash', target: { sel: 'var', name: 't' }, ...(f.rested ? { rested: true } : {}) },
      ];
    }
    case 'playSelfFromTrash':
      return [{ op: 'playFromTrash', target: { sel: 'self' } }];
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
              ? `Look at the top ${f.look}: choose the order for the looked card${f.look === 1 ? '' : 's'}. You will choose top or bottom next.`
              : f.destination === 'play'
                ? `Look at the top ${f.look}: play up to ${f.pick} matching card${f.pick === 1 ? '' : 's'}${f.rested ? ' rested' : ''}; the rest ${f.remainder === 'trash' ? 'go to your trash' : 'go to the bottom of your deck'}.`
                : `Look at the top ${f.look}: add up to ${f.pick} matching card${f.pick === 1 ? '' : 's'} to ${f.destination === 'lifeTop' ? 'the top of your Life cards' : 'your hand'}; the rest ${f.remainder === 'trash' ? 'go to your trash' : f.remainder === 'deckTopOrBottom' ? 'are placed at the top or bottom of your deck in any order' : 'go to the bottom of your deck'}.`,
        },
      ];
    case 'searchDeck':
      return [
        {
          op: 'searchDeck',
          pick: f.pick,
          reveal: f.reveal,
          destination: f.destination,
          ...(f.filter ? { filter: f.filter } : {}),
          prompt: `Search your deck: add up to ${f.pick} matching card${f.pick === 1 ? '' : 's'} to your hand, then shuffle your deck.`,
        },
      ];
    case 'addPowerSelf':
      return targetOps({ ref: 'self' }, (target) => ({ op: 'addPower', target, amount: f.amount, duration: f.duration, ...(f.condition ? { condition: f.condition } : {}) }));
    case 'addPowerSelfPerPreviousTrashed':
      return [
        {
          op: 'addPower',
          target: { sel: 'self' },
          amount: 0,
          amountPerVar: f.countVar ?? 't',
          amountPer: f.amountPer,
          duration: f.duration,
          ...(f.ifPrevious ? { ifPrevious: f.ifPrevious } : {}),
        },
      ];
    case 'addPowerSelfScaling':
      return [{ op: 'addPower', target: { sel: 'self' }, amount: 0, duration: f.duration, scale: { per: f.per, step: f.step, amountPer: f.amountPer }, ...(f.condition ? { condition: f.condition } : {}) }];
    case 'restSelf':
      return [{ op: 'rest', target: { sel: 'self' } }];
    case 'turnTopLifeFace': {
      const count = f.count ?? 1;
      if (count > 1) {
        return [{
          op: 'chooseOption',
          prompt: `You may turn ${count} cards from the top of your Life face-${f.faceUp ? 'up' : 'down'}.`,
          options: [
            { label: 'doNotTurnLife', ops: [] },
            {
              label: 'turnLife',
              ops: [
                { op: 'chooseTargets', var: 't', from: { sel: 'controllerLifeTopN', count }, min: count, max: count, prompt: `Turn ${count} cards from the top of your Life face-${f.faceUp ? 'up' : 'down'}.` },
                { op: 'turnLifeFace', target: { sel: 'var', name: 't' }, faceUp: f.faceUp },
              ],
            },
          ],
        }];
      }
      return [
        { op: 'chooseTargets', var: 't', from: { sel: 'controllerLifeTop' }, min: 0, max: 1, prompt: `You may turn the top card of your Life face-${f.faceUp ? 'up' : 'down'}.` },
        { op: 'turnLifeFace', target: { sel: 'var', name: 't' }, faceUp: f.faceUp },
      ];
    }
    case 'turnAllLifeFace':
      return [{ op: 'turnAllLifeFace', player: f.player ?? 'controller', faceUp: f.faceUp }];
    case 'lookLifeAndReorder':
      return [{
        op: 'lookLifeAndReorder',
        player: f.player ?? 'controller',
        ...(f.moveOneToDeckTop ? { moveOneToDeckTop: true } : {}),
        prompt: f.moveOneToDeckTop
          ? 'Look at all Life cards. Choose the card to place on top of your deck first, then order the rest back into Life.'
          : 'Look at all Life cards and choose their order from top to bottom.',
      }];
    case 'restControllerLeaderOrStage':
      return [
        { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrStage', ...(f.typeIncludes ? { typeIncludes: f.typeIncludes } : {}) }, min: 0, max: 1, prompt: f.typeIncludes ? `You may rest 1 of your {${f.typeIncludes}} Leader or Stage cards.` : 'You may rest 1 of your Leader or Stage cards.' },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ];
    case 'setActiveSelf':
      return [{ op: 'setActive', target: { sel: 'self' } }];
    case 'setActiveControllerLeader':
      return [{ op: 'setActive', target: { sel: 'controllerLeader' } }];
    case 'setActiveControllerCharacters':
      return [{ op: 'setActive', target: { sel: 'controllerCharacters', ...f.filter } }];
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
    case 'setActiveControllerDonAtEndOfTurn':
      return [{ op: 'scheduleSetActiveControllerDonAtEndOfTurn', maxTargets: f.maxTargets }];
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
    case 'restControllerDon': {
      const maxTargets = f.maxTargets ?? 1;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerActiveDon' },
          min: 0,
          max: maxTargets,
          prompt: `Rest up to ${maxTargets} of your DON!! cards (or decline).`,
        },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'restControllerCards': {
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: {
            sel: 'union',
            members: [
              { sel: 'controllerActiveLeader' },
              { sel: 'controllerCharacters', rested: false },
              { sel: 'controllerActiveStages' },
              { sel: 'controllerActiveDon' },
            ],
          },
          min: f.optional === false ? f.count : 0,
          max: f.count,
          prompt: f.optional === false
            ? `Rest ${f.count} of your cards.`
            : `You may rest up to ${f.count} of your cards.`,
        },
        { op: 'rest', target: { sel: 'var', name: 't' } },
      ];
    }
    case 'restOpponentDonAtStartOfNextMain':
      return [{ op: 'scheduleRestOpponentDonAtStartOfNextMain', maxTargets: f.maxTargets ?? 1 }];
    case 'trashSelfAtEndOfTurn':
      return [{ op: 'scheduleTrashSourceAtEndOfTurn' }];
    case 'moveSelfToBottomDeckAtEndOfBattle':
      return [{ op: 'scheduleMoveSourceToBottomDeckAtEndOfBattle' }];
    case 'moveBattleOpponentToBottomDeckAtEndOfBattle': {
      const maxCost = f.maxCost ?? 5;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'battleOpponent', maxCost },
          min: 0,
          max: 1,
          prompt: `You may place 1 of your opponent's Characters with a cost of ${maxCost} or less at the bottom of their owner's deck at the end of this battle.`,
        },
        { op: 'scheduleMoveInstanceToBottomDeckAtEndOfBattle', fromVar: 't', index: 0, ifPrevious: 'previousSelectedAny' },
      ];
    }
    case 'movePreviousMovedToBottomDeckAtEndOfTurn':
      return [{ op: 'scheduleMoveInstanceToBottomDeckAtEndOfTurn', fromVar: '__lastMovedIds', index: 0 }];
    case 'trashControllerCharacterAtEndOfTurn':
      return [{ op: 'scheduleTrashControllerCharacterAtEndOfTurn', ...(f.filter?.typeIncludes ? { typeIncludes: f.filter.typeIncludes } : {}) }];
    case 'returnDonToMatchOpponentAtEndOfTurn':
      return [{ op: 'scheduleReturnDonToMatchOpponentAtEndOfTurn' }];
    case 'moveDeckTopToLifeAtEndOfTurn': {
      const leaderGate = f.gates?.find((gate): gate is { kind: 'leaderType'; type: string } => gate.kind === 'leaderType');
      return [{ op: 'scheduleMoveDeckTopToLifeAtEndOfTurn', ...(leaderGate ? { requiresLeaderType: leaderGate.type } : {}) }];
    }
    case 'trashHandDownTo':
      return [{ op: 'trashHandDownTo', handSize: f.handSize }];
    case 'trashFaceUpLife':
      return [{ op: 'trashFaceUpLife' }];
    case 'returnSelfToHandAtEndOfTurn':
      return [{ op: 'scheduleReturnSourceToHandAtEndOfTurn' }];
    case 'preventRefreshOnGivenCharacterAtEndOfTurn':
      return [{
        op: 'schedulePreventRefreshOnCharacterAtEndOfTurn',
        fromVar: '__lastMovedIds',
        minDonAttached: f.minDonAttached,
        requireRested: f.requireRested !== false,
      }];
    case 'preventRefreshOnCharactersCostAtMost':
      return [{
        op: 'addRefreshCostRestriction',
        maxCost: f.maxCost,
        scope: 'bothPlayers',
        ...(f.activationGate?.length ? { activationGate: f.activationGate } : {}),
      }];
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
    case 'optionalReturnControllerDon': {
      const maxTargets = f.maxTargets ?? 10;
      return [
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerFieldDon' },
          min: 0,
          max: maxTargets,
          prompt: 'You may return 1 or more DON!! cards from your field to your DON!! deck.',
        },
        { op: 'returnDonToDonDeck', target: { sel: 'var', name: 't' } },
      ];
    }
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
      return [{ op: 'addCostAura', group: { ownLeaderAndCharacters: true, charactersOnly: true, ...(f.anyOfTypes ? { anyOfTypes: f.anyOfTypes } : {}), ...(f.anyOfNames ? { anyOfNames: f.anyOfNames } : {}) }, amount: f.amount, duration: f.duration, ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}), ...(f.gate ? { condition: { gate: f.gate } } : {}) }];
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
          ...(f.attackerAttribute ? { attackerAttribute: f.attackerAttribute } : {}),
          ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}),
          ...(f.effectSourceMaxBasePower !== undefined ? { effectSourceMaxBasePower: f.effectSourceMaxBasePower } : {}),
          ...(f.effectSourceCategory ? { effectSourceCategory: f.effectSourceCategory } : {}),
          ...(f.effectSourceWithoutAttribute ? { effectSourceWithoutAttribute: f.effectSourceWithoutAttribute } : {}),
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
          ...(f.replacementTriggers ? { replacementTriggers: f.replacementTriggers } : {}),
          ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}),
          ...(f.activationGate ? { activationGate: f.activationGate } : {}),
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
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
            ...(f.anyOfColors ? { anyOfColors: f.anyOfColors } : {}),
            ...(f.excludeSource ? { excludeSource: true } : {}),
          },
          scope: f.scope ?? 'any',
          ...(f.oncePerTurn ? { oncePerTurn: true } : {}),
          ...(f.replacementTriggers ? { replacementTriggers: f.replacementTriggers } : {}),
          ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}),
          ...(f.effectSourceCategory ? { effectSourceCategory: f.effectSourceCategory } : {}),
          ...(f.targetCondition ? { condition: f.targetCondition } : {}),
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          action: koReplacementAction(f),
          duration: f.duration,
        },
      ];
    case 'registerRestReplacementSelf':
      return [
        {
          op: 'registerRestReplacement',
          ...(f.oncePerTurn ? { oncePerTurn: true } : {}),
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
          ...(f.effectSourceController ? { effectSourceController: f.effectSourceController } : {}),
          ...(f.effectSourceCategory ? { effectSourceCategory: f.effectSourceCategory } : {}),
          action: { kind: 'restCharacter' as const, count: 1 },
          duration: f.duration,
        },
      ];
    case 'setBasePowerFromLeader':
      return [
        {
          op: 'setBasePowerFromLeader',
          target: selectorFromTarget(f.target),
          duration: f.duration,
          ...(f.condition ? { condition: f.condition } : {}),
          ...(f.sourceCondition ? { sourceCondition: f.sourceCondition } : {}),
        },
      ];
    case 'drawByEventCount':
      return [{ op: 'drawByEventCount', countField: f.countField }];
    case 'returnHandShuffleDraw':
      return [{
        op: 'returnHandShuffleDraw',
        ...(f.player ? { player: f.player } : {}),
        ...(f.drawAmount !== undefined ? { drawAmount: f.drawAmount } : {}),
      }];
    case 'koAllCharacters':
      {
        const filter = { ...(f.filter?.maxCost !== undefined ? { maxCost: f.filter.maxCost } : {}), ...(f.filter?.maxPower !== undefined ? { maxPower: f.filter.maxPower } : {}), ...(f.filter?.rested !== undefined ? { rested: f.filter.rested } : {}) };
        const target =
          f.player === 'controller' ? { sel: 'controllerCharacters' as const, ...filter, ...(f.excludeSource ? { excludeSelf: true } : {}) }
          : f.player === 'opponent' ? { sel: 'opponentCharacters' as const, ...filter }
          : { sel: 'allCharacters' as const, ...filter, ...(f.excludeSource ? { excludeSelf: true } : {}) };
        return [{ op: 'ko', target }];
      }
    case 'giveDonControllerLeader':
      return [{ op: 'giveDon', target: { sel: 'controllerLeader' }, count: f.count }];
    case 'giveDonLeaderAndCharacter':
      return [
        { op: 'giveDon', target: { sel: 'controllerLeader' }, count: f.count },
        {
          op: 'chooseTargets',
          var: 't',
          from: { sel: 'controllerCharacters' },
          min: 0,
          max: 1,
          prompt: 'Give up to 1 rested DON!! card to 1 of your Characters.',
        },
        { op: 'giveDon', target: { sel: 'var', name: 't' }, count: f.count },
      ];
    case 'giveDonSelf':
      return [{ op: 'giveDon', target: { sel: 'self' }, count: f.count }];
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
  noRuntime: (cn) => program(cn, []),
  ability: (cn, p) => {
    const implicitGates = p.functions.some((f) => (f.fn === 'giveDon' && !f.activeDonOnly && !f.skipRestedDonGate) || f.fn === 'giveGivenDon')
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
        ...(p.optionalActivate ? { optionalActivate: true } : {}),
        ...(p.battlingOpponentAttribute ? { battlingOpponentAttribute: p.battlingOpponentAttribute } : {}),
        ...(p.battleTargetIsOpponentLeader ? { battleTargetIsOpponentLeader: true } : {}),
        ...(p.requiresOpponentKoed ? { requiresOpponentKoed: true } : {}),
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
