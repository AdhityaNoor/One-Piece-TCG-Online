/**
 * Concrete EffectContext — the interpreter's instruction set over a working
 * GameState. Accumulates a log delta + PendingChoices, then returns the
 * standard ActionExecuteResult via finish(). Each primitive mirrors the
 * canonical engine implementation so behavior can't drift.
 */
import type { ContinuousEffectDuration, ContinuousEffectRecord, ContinuousPowerCondition, GameState } from '../state/game';
import type { CardDefinition, CardInstance } from '../state/card';
import type { PendingChoice } from '../events/pendingChoice';
import { mintRuntimeInstanceId } from '../rules/shared/mintInstance';
import type { ActionExecuteResult } from '../actions/actionExecuteResult';
import { createActionLogger, type ActionLogger } from '../rules/shared/actionLogger';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';
import { getOpponentId } from '../rules/shared/players';
import { computeCurrentCost, computeCurrentPower } from '../rules/shared/power';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import type { EffectContext } from './effectTemplate';

export class EffectContextImpl implements EffectContext {
  readonly sourceInstanceId: string;
  readonly controllerId: string;
  readonly opponentId: string;

  private working: GameState;
  private readonly defs: CardDefinitionLookup;
  private readonly logger: ActionLogger;
  private readonly pending: PendingChoice[] = [];
  /** Instance ids this resolution moved to the trash via ko(); drained by the interpreter to cascade [On K.O.] (10-2-17). */
  private readonly koed: string[] = [];

  constructor(state: GameState, sourceInstanceId: string, defs: CardDefinitionLookup, actionId: string | null) {
    this.working = state;
    this.defs = defs;
    this.sourceInstanceId = sourceInstanceId;
    const source = state.cardsById[sourceInstanceId];
    this.controllerId = source ? source.controllerId : state.activePlayerId;
    this.opponentId = getOpponentId(state, this.controllerId);
    this.logger = createActionLogger(state, actionId);
  }

  state(): GameState {
    return this.working;
  }

  controllerLeaderId(): string {
    return this.working.players[this.controllerId].leaderInstanceId;
  }
  controllerCharacterIds(): string[] {
    return [...this.working.players[this.controllerId].characterArea.cardIds];
  }
  opponentCharacterIds(): string[] {
    return [...this.working.players[this.opponentId].characterArea.cardIds];
  }
  controllerHandIds(): string[] {
    return [...this.working.players[this.controllerId].hand.cardIds];
  }
  controllerTrashIds(): string[] {
    return [...this.working.players[this.controllerId].trash.cardIds];
  }
  powerOf(instanceId: string): number {
    return computeCurrentPower(this.defs, this.working, instanceId);
  }
  costOf(instanceId: string): number {
    return computeCurrentCost(this.defs, this.working, instanceId);
  }
  definitionOf(instanceId: string): CardDefinition | undefined {
    const inst = this.working.cardsById[instanceId];
    return inst ? this.defs[inst.cardDefinitionId] : undefined;
  }
  topOfDeck(playerId: string, n: number): string[] {
    const player = this.working.players[playerId];
    if (!player) return [];
    return player.deck.cardIds.slice(0, Math.max(0, n));
  }

  draw(playerId: string, n: number): void {
    for (let i = 0; i < n; i++) {
      if (this.working.gameOver) return;
      this.drawOne(playerId);
    }
  }

  private drawOne(playerId: string): void {
    const player = this.working.players[playerId];
    if (!player) return;
    if (player.deck.cardIds.length === 0) {
      const opponentId = getOpponentId(this.working, playerId);
      this.logger.push({
        actorPlayerId: playerId,
        type: 'GAME_OVER',
        message: `${playerId} attempted to draw from an empty deck and loses by decking out (9-2-1).`,
        data: { reason: 'deckedOut', loserId: playerId, winnerId: opponentId },
        relatedCardInstanceIds: [],
        visibility: 'public',
      });
      this.working = { ...this.working, gameOver: { winnerId: opponentId, reason: 'deckedOut' } };
      return;
    }
    const [drawnId, ...restDeck] = player.deck.cardIds;
    const newPlayer = { ...player, deck: { ...player.deck, cardIds: restDeck }, hand: addToZoneBottom(player.hand, drawnId) };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: newPlayer },
      cardsById: { ...this.working.cardsById, [drawnId]: { ...this.working.cardsById[drawnId], currentZone: 'hand' } },
    };
    this.logger.push({
      actorPlayerId: playerId,
      type: 'CARD_DRAWN',
      message: `${playerId} drew 1 card from an effect.`,
      data: { count: 1 },
      relatedCardInstanceIds: [drawnId],
      visibility: { visibleTo: [playerId] },
    });
  }

  addContinuousPower(spec: {
    appliesToInstanceId: string;
    amount: number;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `power ${spec.amount >= 0 ? '+' : ''}${spec.amount}`,
      powerModifier: {
        appliesToInstanceId: spec.appliesToInstanceId,
        amount: spec.amount,
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, amount: spec.amount, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  addContinuousCost(spec: {
    appliesToInstanceId: string;
    amount: number;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `cost ${spec.amount >= 0 ? '+' : ''}${spec.amount}`,
      costModifier: {
        appliesToInstanceId: spec.appliesToInstanceId,
        amount: spec.amount,
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, amount: spec.amount, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  giveDon(targetInstanceId: string, count: number): void {
    const controller = this.working.players[this.controllerId];
    const attached = new Set<string>();
    for (const id of Object.keys(this.working.cardsById)) {
      for (const donId of this.working.cardsById[id].donAttached) attached.add(donId);
    }
    const available = controller.costArea.cardIds.filter((id) => !attached.has(id));
    const toGive = available.slice(0, Math.max(0, count));
    if (toGive.length === 0) return;

    const cardsById = { ...this.working.cardsById };
    for (const donId of toGive) cardsById[donId] = { ...cardsById[donId], donRested: true };
    const target = cardsById[targetInstanceId];
    cardsById[targetInstanceId] = { ...target, donAttached: [...target.donAttached, ...toGive] };
    this.working = { ...this.working, cardsById };

    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'DON_GIVEN',
      message: `gave ${toGive.length} rested DON!! to ${targetInstanceId} (+${toGive.length * 1000} power, 6-5-5).`,
      data: { count: toGive.length, targetInstanceId, donInstanceIds: toGive },
      relatedCardInstanceIds: [targetInstanceId, ...toGive],
      visibility: 'public',
    });
  }

  ko(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    const newOwner = {
      ...owner,
      characterArea: removeFromZone(owner.characterArea, targetInstanceId),
      trash: addToZoneTop(owner.trash, targetInstanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, currentZone: 'trash', donAttached: [] } },
      // Leave-play cleanup: drop continuous effects this card was the source of (3-1-6).
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== targetInstanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CHARACTER_KO',
      message: `${targetInstanceId} was K.O.'d and moved to trash (7-1-4-1-2).`,
      data: { targetInstanceId },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
    this.koed.push(targetInstanceId); // cascade [On K.O.] after this resolution finishes
  }

  /** Drain and return the ids K.O.'d via ko() this resolution (for [On K.O.] cascade). */
  takeKoed(): string[] {
    const drained = [...this.koed];
    this.koed.length = 0;
    return drained;
  }

  returnToHand(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    const newOwner = {
      ...owner,
      characterArea: removeFromZone(owner.characterArea, targetInstanceId),
      stageArea: removeFromZone(owner.stageArea, targetInstanceId),
      hand: addToZoneBottom(owner.hand, targetInstanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: {
        ...this.working.cardsById,
        // Leaving play resets in-play state; the card is now a hand card, visible only to its owner (3-1-6).
        [targetInstanceId]: { ...inst, currentZone: 'hand', donAttached: [], summoningSick: false, revealedTo: [inst.ownerId] },
      },
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== targetInstanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${targetInstanceId} was returned to its owner's hand (bounce).`,
      data: { from: 'characterArea', to: 'hand', targetInstanceId },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
  }

  playCharacterFromHand(handInstanceId: string): void {
    const handInst = this.working.cardsById[handInstanceId];
    if (!handInst || handInst.currentZone !== 'hand') return;
    const def = this.defs[handInst.cardDefinitionId];
    if (!def || def.category !== 'character') return; // only Characters can be played to the field
    const controllerId = handInst.controllerId;
    const player = this.working.players[controllerId];
    if (!player) return;

    const minted = mintRuntimeInstanceId(this.working); // 3-1-6: fresh instance entering play
    const newId = minted.id;
    const newInstance: CardInstance = {
      instanceId: newId,
      cardDefinitionId: handInst.cardDefinitionId,
      ownerId: handInst.ownerId,
      controllerId,
      currentZone: 'characterArea',
      orientation: 'active',
      faceState: 'faceUp',
      donAttached: [],
      currentPower: def.basePower ?? 0,
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: !def.hasRush, // 3-7-4, 10-1-6
      revealedTo: 'all',
    };
    const cardsById = { ...minted.state.cardsById, [newId]: newInstance };
    delete cardsById[handInstanceId]; // old hand instance retired
    const newCharacterArea = addToZoneBottom(player.characterArea, newId);
    const newHand = removeFromZone(player.hand, handInstanceId);
    this.working = {
      ...minted.state,
      cardsById,
      players: { ...minted.state.players, [controllerId]: { ...player, hand: newHand, characterArea: newCharacterArea } },
    };

    this.logger.push({
      actorPlayerId: controllerId,
      type: 'CARD_PLAYED',
      message: `${controllerId} played ${def.name} from hand via an effect (no cost).`,
      data: { from: 'hand', to: 'characterArea', cost: 0, oldInstanceId: handInstanceId },
      relatedCardInstanceIds: [newId],
      visibility: 'public',
    });

    // 3-7-6-1: a 6th Character forces a trash-down choice (same sentinel the
    // PLAY_CHARACTER handler / PendingChoicePrompt already handle).
    const limit = newCharacterArea.maxSize ?? Infinity;
    if (newCharacterArea.cardIds.length > limit) {
      this.emitChoice({
        id: `${controllerId}__character-overflow-${newId}`,
        playerId: controllerId,
        kind: 'SELECT_CARDS',
        prompt: `Choose 1 Character to trash — more than ${limit} in your Character Area (3-7-6-1).`,
        constraints: { min: 1, max: 1, zoneId: 'characterArea', filterDescription: 'Any Character currently in your Character Area.' },
        sourceInstanceId: null,
        sourceEffectId: 'rule:characterAreaOverflow',
      });
    }
  }

  moveToHand(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const fromZone = inst.currentZone;
    const newOwner = {
      ...owner,
      trash: removeFromZone(owner.trash, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      hand: addToZoneBottom(owner.hand, instanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: { ...this.working.cardsById, [instanceId]: { ...inst, currentZone: 'hand', donAttached: [], revealedTo: [inst.ownerId] } },
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was added to ${inst.ownerId}'s hand (from ${fromZone}).`,
      data: { from: fromZone, to: 'hand', instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: { visibleTo: [inst.ownerId] },
    });
  }

  trashCard(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const fromZone = inst.currentZone;
    const newOwner = {
      ...owner,
      hand: removeFromZone(owner.hand, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      trash: addToZoneTop(owner.trash, instanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: { ...this.working.cardsById, [instanceId]: { ...inst, currentZone: 'trash', donAttached: [], revealedTo: 'all' } },
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was trashed (from ${fromZone}).`,
      data: { from: fromZone, to: 'trash', instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: 'public',
    });
  }

  rest(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst || inst.orientation === 'rested') return;
    this.working = { ...this.working, cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, orientation: 'rested' } } };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${targetInstanceId} was rested by an effect (4-4-1).`,
      data: { targetInstanceId },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
  }

  trashTopOfDeck(playerId: string, n: number): void {
    const player = this.working.players[playerId];
    if (!player || n <= 0) return;
    const moving = player.deck.cardIds.slice(0, n);
    if (moving.length === 0) return;
    const remainingDeck = player.deck.cardIds.slice(moving.length);
    let trash = player.trash;
    const cardsById = { ...this.working.cardsById };
    for (const id of moving) {
      trash = addToZoneTop(trash, id);
      cardsById[id] = { ...cardsById[id], currentZone: 'trash', revealedTo: 'all' };
    }
    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: { ...player, deck: { ...player.deck, cardIds: remainingDeck }, trash } },
      cardsById,
    };
    this.logger.push({
      actorPlayerId: playerId,
      type: 'CARD_MOVED',
      message: `${playerId} trashed the top ${moving.length} card(s) of their deck (self-mill).`,
      data: { from: 'deck', to: 'trash', count: moving.length },
      relatedCardInstanceIds: moving,
      visibility: 'public',
    });
  }

  addDonFromDeck(playerId: string, n: number, rested: boolean): void {
    const player = this.working.players[playerId];
    if (!player || n <= 0) return;
    const moving = player.donDeck.cardIds.slice(0, n);
    if (moving.length === 0) return;
    const remainingDonDeck = player.donDeck.cardIds.slice(moving.length);
    let costArea = player.costArea;
    const cardsById = { ...this.working.cardsById };
    for (const id of moving) {
      costArea = addToZoneBottom(costArea, id);
      cardsById[id] = { ...cardsById[id], currentZone: 'costArea', donRested: rested };
    }
    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: { ...player, donDeck: { ...player.donDeck, cardIds: remainingDonDeck }, costArea } },
      cardsById,
    };
    this.logger.push({
      actorPlayerId: playerId,
      type: 'CARD_MOVED',
      message: `${playerId} added ${moving.length} DON!! from the DON!! deck to the cost area (${rested ? 'rested' : 'active'}).`,
      data: { from: 'donDeck', to: 'costArea', count: moving.length, rested, donInstanceIds: moving },
      relatedCardInstanceIds: moving,
      visibility: 'public',
    });
  }

  searchResolve(playerId: string, lookedIds: string[], chosenIds: string[]): void {
    const player = this.working.players[playerId];
    if (!player || lookedIds.length === 0) return;

    // Only honor choices that were actually among the looked-at cards (defensive
    // against a forged resume selection), preserving looked order.
    const lookedSet = new Set(lookedIds);
    const chosenSet = new Set(chosenIds.filter((id) => lookedSet.has(id)));
    const chosen = lookedIds.filter((id) => chosenSet.has(id));
    const rest = lookedIds.filter((id) => !chosenSet.has(id));

    // The looked cards are exactly the top N — drop them off the top, then the
    // unrevealed rest returns to the bottom (6-? deck ops; "in any order" is a
    // player nicety we resolve deterministically as looked order).
    let deck = { ...player.deck, cardIds: player.deck.cardIds.slice(lookedIds.length) };
    let hand = player.hand;
    const cardsById = { ...this.working.cardsById };

    for (const id of chosen) {
      hand = addToZoneBottom(hand, id);
      cardsById[id] = { ...cardsById[id], currentZone: 'hand', revealedTo: [playerId] };
    }
    for (const id of rest) {
      deck = addToZoneBottom(deck, id);
      cardsById[id] = { ...cardsById[id], currentZone: 'deck', revealedTo: [] };
    }

    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: { ...player, hand, deck } },
      cardsById,
    };

    this.logger.push({
      actorPlayerId: playerId,
      type: 'EFFECT_RESOLVED',
      message: `Searched the top ${lookedIds.length}: added ${chosen.length} to hand, returned ${rest.length} to the bottom of the deck.`,
      data: { lookedCount: lookedIds.length, addedCount: chosen.length, addedInstanceIds: chosen, bottomedCount: rest.length },
      relatedCardInstanceIds: chosen,
      visibility: { visibleTo: [playerId] },
    });
  }

  emitChoice(choice: PendingChoice): void {
    this.pending.push(choice);
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CHOICE_REQUESTED',
      message: choice.prompt,
      data: { choiceId: choice.id, min: choice.constraints.min, max: choice.constraints.max },
      relatedCardInstanceIds: choice.constraints.candidateInstanceIds ?? [],
      visibility: 'public',
    });
  }

  finish(): ActionExecuteResult {
    const state: GameState = {
      ...this.working,
      log: [...this.working.log, ...this.logger.log],
      pendingChoices: [...this.working.pendingChoices, ...this.pending],
    };
    return { state, log: this.logger.log, pendingChoices: this.pending };
  }
}
