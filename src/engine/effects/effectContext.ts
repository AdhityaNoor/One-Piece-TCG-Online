/**
 * Concrete EffectContext — the interpreter's instruction set over a working
 * GameState. Accumulates a log delta + PendingChoices, then returns the
 * standard ActionExecuteResult via finish(). Each primitive mirrors the
 * canonical engine implementation so behavior can't drift.
 */
import type { ContinuousEffectDuration, ContinuousEffectRecord, ContinuousPowerCondition, GameState } from '../state/game';
import type { PendingChoice } from '../events/pendingChoice';
import type { ActionExecuteResult } from '../actions/actionExecuteResult';
import { createActionLogger, type ActionLogger } from '../rules/shared/actionLogger';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';
import { getOpponentId } from '../rules/shared/players';
import type { EffectContext } from './effectTemplate';

export class EffectContextImpl implements EffectContext {
  readonly sourceInstanceId: string;
  readonly controllerId: string;
  readonly opponentId: string;

  private working: GameState;
  private readonly logger: ActionLogger;
  private readonly pending: PendingChoice[] = [];

  constructor(state: GameState, sourceInstanceId: string, actionId: string | null) {
    this.working = state;
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
