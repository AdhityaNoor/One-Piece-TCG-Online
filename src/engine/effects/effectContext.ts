/**
 * Concrete EffectContext — the interpreter's instruction set over a working
 * GameState. Accumulates a log delta + PendingChoices, then returns the
 * standard ActionExecuteResult via finish(). Each primitive mirrors the
 * canonical engine implementation so behavior can't drift.
 */
import type { ContinuousEffectDuration, ContinuousEffectRecord, ContinuousKeyword, ContinuousKoImmunityModifier, ContinuousKoReplacementModifier, ContinuousPowerCondition, GameState, KoImmunityAuraGroup, KoReplacementAuraGroup, PowerAuraGroup, SourceStateCondition } from '../state/game';
import type { CardDefinition, CardInstance } from '../state/card';
import type { PendingChoice } from '../events/pendingChoice';
import { mintRuntimeInstanceId } from '../rules/shared/mintInstance';
import type { ActionExecuteResult } from '../actions/actionExecuteResult';
import { createActionLogger, type ActionLogger } from '../rules/shared/actionLogger';
import type { GameLogEntry } from '../logs/logEntry';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';
import { getOpponentId } from '../rules/shared/players';
import { cannotBeRemovedFromFieldByEffect, cannotBeRestedByEffect, computeCurrentCost, computeCurrentPower, isKoImmune } from '../rules/shared/power';
import { isControllerLifeToHandPrevented } from '../rules/shared/lifeToHandRestriction';
import { isControllerCharacterPlayPrevented } from '../rules/shared/characterPlayRestriction';
import { isControllerHandPlayPrevented } from '../rules/shared/handPlayRestriction';
import { isControllerCharacterSetActiveDonPrevented } from '../rules/shared/characterSetActiveDonRestriction';
import { hasEmptyDeckDefeatDeferral, withDeckBecameZeroThisTurn } from '../rules/shared/emptyDeckDefeat';
import { koReplacementDescription, restReplacementDescription } from '../rules/shared/koAttempt';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { createSeededRng } from '../rng/seededRng';
import { effectLogDataForSource } from '../logs/effectLogData';
import type { EffectContext } from './effectTemplate';
import type { RemovedFromFieldDestination, SearchPickDestination, SearchRemainderDestination } from './effectIr';

export class EffectContextImpl implements EffectContext {
  readonly sourceInstanceId: string;
  readonly controllerId: string;
  readonly opponentId: string;

  private working: GameState;
  private readonly defs: CardDefinitionLookup;
  private readonly logger: ActionLogger;
  private readonly externalLog: GameLogEntry[] = [];
  private readonly pending: PendingChoice[] = [];
  /** Leader/Characters rested via rest(); drained by the interpreter to cascade [When Becomes Rested] (onRested). */
  private readonly rested: { targetInstanceId: string; cause: 'effect'; sourceInstanceId: string }[] = [];
  /** Instance ids this resolution moved to the trash via ko(); drained by the interpreter to cascade [On K.O.] (10-2-17). */
  private readonly koed: { targetInstanceId: string; cause: 'effect'; sourceInstanceId: string }[] = [];
  /** DON!! given to Leader/Character targets this resolution; drained for onDonGiven cascade. */
  private readonly donGiven: { targetInstanceId: string; count: number }[] = [];
  /** Cards removed from the field by this resolution's effects; drained for onRemovedFromField cascade. */
  private readonly fieldRemovals: {
    targetInstanceId: string;
    removedControllerId: string;
    effectControllerId: string;
    removedToZone: RemovedFromFieldDestination;
  }[] = [];
  /** Event instance ids queued for nested [Main] activation; drained after the main program finishes. */
  private readonly pendingEventActivations: string[] = [];
  /** New Character instance ids played from trash by this resolution; drained for onCharacterPlayedFromTrash reactions. */
  private readonly playedFromTrash: string[] = [];
  /** Characters played by this resolution; drained for played-character reactive windows. */
  private readonly playedCharacters: { instanceId: string; controllerId: string; fromCharacterEffect: boolean }[] = [];
  /** Hand cards trashed by this resolution's effects; drained for onHandTrashed cascade. */
  private readonly handTrashed: { ownerId: string; count: number; effectSourceInstanceId: string }[] = [];

  private static readonly FIELD_ZONES = new Set(['leaderArea', 'characterArea', 'stageArea']);

  private recordFieldRemoval(targetInstanceId: string, fromZone: CardInstance['currentZone'], toZone: RemovedFromFieldDestination): void {
    if (!EffectContextImpl.FIELD_ZONES.has(fromZone)) return;
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    this.fieldRemovals.push({
      targetInstanceId,
      removedControllerId: inst.controllerId,
      effectControllerId: this.controllerId,
      removedToZone: toZone,
    });
  }

  private recordDonGiven(targetInstanceId: string, count: number): void {
    if (count <= 0) return;
    this.donGiven.push({ targetInstanceId, count });
  }

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

  replaceState(state: GameState, log: GameLogEntry[] = []): void {
    this.working = state;
    this.externalLog.push(...log);
  }

  /** Merge an external ActionExecuteResult (e.g. onRested cascade) into this context. Returns true if suspended. */
  absorbActionResult(result: ActionExecuteResult): boolean {
    this.working = result.state;
    this.externalLog.push(...result.log);
    this.pending.push(...result.pendingChoices);
    return result.pendingChoices.length > 0;
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
  opponentHandIds(): string[] {
    return [...this.working.players[this.opponentId].hand.cardIds];
  }
  controllerHandIds(): string[] {
    return [...this.working.players[this.controllerId].hand.cardIds];
  }
  controllerTrashIds(): string[] {
    return [...this.working.players[this.controllerId].trash.cardIds];
  }
  opponentTrashIds(): string[] {
    return [...this.working.players[this.opponentId].trash.cardIds];
  }
  controllerDeckIds(): string[] {
    return [...this.working.players[this.controllerId].deck.cardIds];
  }
  controllerLifeTopBottomIds(): string[] {
    const ids = this.working.players[this.controllerId].lifeArea.cardIds;
    if (ids.length === 0) return [];
    const top = ids[0];
    const bottom = ids[ids.length - 1];
    return top === bottom ? [top] : [top, bottom];
  }
  opponentLifeTopIds(): string[] {
    const top = this.working.players[this.opponentId].lifeArea.cardIds[0];
    return top ? [top] : [];
  }
  controllerOrOpponentLifeTopIds(): string[] {
    const controllerTop = this.working.players[this.controllerId].lifeArea.cardIds[0];
    const opponentTop = this.working.players[this.opponentId].lifeArea.cardIds[0];
    return [controllerTop, opponentTop].filter((id): id is string => id !== undefined);
  }
  controllerDeckTopIds(): string[] {
    const top = this.working.players[this.controllerId].deck.cardIds[0];
    return top ? [top] : [];
  }
  lifeIds(playerId: string): string[] {
    return [...(this.working.players[playerId]?.lifeArea.cardIds ?? [])];
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

  /**
   * Publicly reveal a card without moving it (e.g. "Reveal 1 card from the top of
   * your deck"). Emits a public log naming the card; leaves zone/order untouched so
   * a following draw/search sees it in place. No-op if the instance is unknown.
   */
  revealCard(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const def = this.defs[inst.cardDefinitionId];
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${this.controllerId} revealed ${def?.name ?? instanceId} from the top of their deck.`,
      data: { revealedInstanceId: instanceId, cardDefinitionId: inst.cardDefinitionId },
      relatedCardInstanceIds: [instanceId],
      visibility: 'public',
    });
  }

  /**
   * Publicly reveal a card sitting in the Life area without moving it (e.g. "Reveal
   * 1 card from the top of your Life cards"). Marks it revealed-to-all and emits a
   * public log naming it; the card stays in place so a following play-from-Life sees
   * it on top. No-op if the instance is unknown.
   */
  revealLifeCard(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const def = this.defs[inst.cardDefinitionId];
    this.working = {
      ...this.working,
      cardsById: { ...this.working.cardsById, [instanceId]: { ...inst, revealedTo: 'all' } },
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${this.controllerId} revealed ${def?.name ?? instanceId} from the top of their Life cards.`,
      data: { revealedInstanceId: instanceId, cardDefinitionId: inst.cardDefinitionId },
      relatedCardInstanceIds: [instanceId],
      visibility: 'public',
    });
  }

  revealCards(instanceIds: string[]): void {
    const ids = instanceIds.filter((id) => this.working.cardsById[id]);
    if (ids.length === 0) return;
    const cardsById = { ...this.working.cardsById };
    for (const id of ids) cardsById[id] = { ...cardsById[id], revealedTo: 'all' };
    this.working = { ...this.working, cardsById };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${this.controllerId} revealed ${ids.length} card${ids.length === 1 ? '' : 's'}.`,
      data: { revealedInstanceIds: ids, cardDefinitionIds: ids.map((id) => cardsById[id].cardDefinitionId) },
      relatedCardInstanceIds: ids,
      visibility: 'public',
    });
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
      if (hasEmptyDeckDefeatDeferral(this.working, playerId)) {
        this.working = withDeckBecameZeroThisTurn(this.working, playerId);
        this.logger.push({
          actorPlayerId: playerId,
          type: 'EFFECT_RESOLVED',
          message: `${playerId} cannot draw — deck has 0 cards (draw skipped; empty-deck defeat deferred).`,
          data: { reason: 'emptyDeckDrawSkipped', playerId },
          relatedCardInstanceIds: [],
          visibility: 'public',
        });
        return;
      }
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
    let newPlayer = { ...player, deck: { ...player.deck, cardIds: restDeck }, hand: addToZoneBottom(player.hand, drawnId) };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: newPlayer },
      cardsById: { ...this.working.cardsById, [drawnId]: { ...this.working.cardsById[drawnId], currentZone: 'hand' } },
    };
    if (restDeck.length === 0) {
      this.working = withDeckBecameZeroThisTurn(this.working, playerId);
    }
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
    scale?: import('../state/game').PowerScale;
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
        ...(spec.scale ? { scale: spec.scale } : {}),
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

  addContinuousPowerAura(spec: {
    group: PowerAuraGroup;
    amount: number;
    duration: ContinuousEffectDuration;
    sourceCondition?: SourceStateCondition;
    condition?: ContinuousPowerCondition;
    scale?: import('../state/game').PowerScale;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `aura power ${spec.amount >= 0 ? '+' : ''}${spec.amount}`,
      powerModifier: {
        appliesToGroup: spec.group,
        amount: spec.amount,
        ...(spec.sourceCondition ? { sourceCondition: spec.sourceCondition } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
        ...(spec.scale ? { scale: spec.scale } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to a group.`,
      data: { continuousEffectId: record.id, amount: spec.amount, duration: spec.duration },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  setContinuousBasePowerAura(spec: {
    group: PowerAuraGroup;
    value: number;
    duration: ContinuousEffectDuration;
    sourceCondition?: SourceStateCondition;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `aura base power becomes ${spec.value}`,
      powerModifier: {
        appliesToGroup: spec.group,
        amount: 0,
        setBase: spec.value,
        ...(spec.sourceCondition ? { sourceCondition: spec.sourceCondition } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to a group.`,
      data: { continuousEffectId: record.id, setBasePower: spec.value, duration: spec.duration },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  addContinuousCostAura(spec: {
    group: PowerAuraGroup;
    amount: number;
    duration: ContinuousEffectDuration;
    sourceCondition?: SourceStateCondition;
    condition?: ContinuousPowerCondition;
    scale?: import('../state/game').PowerScale;
    description?: string;
    usesRemaining?: number;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `aura cost ${spec.amount >= 0 ? '+' : ''}${spec.amount}`,
      ...(spec.usesRemaining !== undefined ? { usesRemaining: spec.usesRemaining } : {}),
      costModifier: {
        appliesToGroup: spec.group,
        amount: spec.amount,
        ...(spec.sourceCondition ? { sourceCondition: spec.sourceCondition } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
        ...(spec.scale ? { scale: spec.scale } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to a group.`,
      data: { continuousEffectId: record.id, amount: spec.amount, duration: spec.duration },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  addContinuousCost(spec: {
    appliesToInstanceId: string;
    amount: number;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    scale?: import('../state/game').PowerScale;
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
        ...(spec.scale ? { scale: spec.scale } : {}),
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

  /** "base power becomes N" (2-6): register a SET modifier that overwrites the printed base power. */
  setContinuousBasePower(spec: {
    appliesToInstanceId: string;
    value: number;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `base power becomes ${spec.value}`,
      powerModifier: {
        appliesToInstanceId: spec.appliesToInstanceId,
        amount: 0,
        setBase: spec.value,
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, setBasePower: spec.value, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  /** "base cost becomes N" (2-7): register a SET modifier that overwrites the printed base cost. */
  setContinuousBaseCost(spec: {
    appliesToInstanceId: string;
    value: number;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `base cost becomes ${spec.value}`,
      costModifier: {
        appliesToInstanceId: spec.appliesToInstanceId,
        amount: 0,
        setBase: spec.value,
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, setBaseCost: spec.value, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  /** "base power becomes the same as your Leader's base power" — resolved at read time. */
  setContinuousBasePowerFromLeader(spec: {
    appliesToInstanceId: string;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    sourceCondition?: import('../state/game').SourceStateCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'base power becomes the same as your Leader\'s base power',
      powerModifier: {
        appliesToInstanceId: spec.appliesToInstanceId,
        amount: 0,
        setBaseFromLeader: true,
        ...(spec.condition ? { condition: spec.condition } : {}),
        ...(spec.sourceCondition ? { sourceCondition: spec.sourceCondition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  addContinuousKeyword(spec: {
    appliesToInstanceId: string;
    keyword: ContinuousKeyword;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `gains ${spec.keyword}`,
      keywordModifier: {
        appliesToInstanceId: spec.appliesToInstanceId,
        keyword: spec.keyword,
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, keyword: spec.keyword, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  addContinuousKeywordAura(spec: {
    group: PowerAuraGroup;
    keyword: ContinuousKeyword;
    duration: ContinuousEffectDuration;
    sourceCondition?: SourceStateCondition;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `aura gains ${spec.keyword}`,
      keywordModifier: {
        appliesToGroup: spec.group,
        keyword: spec.keyword,
        ...(spec.sourceCondition ? { sourceCondition: spec.sourceCondition } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to a group.`,
      data: { continuousEffectId: record.id, keyword: spec.keyword, duration: spec.duration },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  addContinuousKoImmunity(spec: {
    appliesToInstanceId: string;
    scope: 'battle' | 'effect' | 'any';
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    attackerCategory?: 'leader' | 'character';
    attackerAttribute?: string;
    effectSourceController?: 'opponent' | 'controller';
    effectSourceMaxBasePower?: number;
    effectSourceCategory?: 'leader' | 'character';
    effectSourceWithoutAttribute?: string;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? (spec.scope === 'battle' ? 'cannot be K.O.’d in battle' : 'cannot be K.O.’d'),
      koImmunityModifier: {
        appliesToInstanceId: spec.appliesToInstanceId,
        scope: spec.scope,
        ...(spec.attackerCategory ? { attackerCategory: spec.attackerCategory } : {}),
        ...(spec.attackerAttribute ? { attackerAttribute: spec.attackerAttribute } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
        ...(spec.effectSourceController ? { effectSourceController: spec.effectSourceController } : {}),
        ...(spec.effectSourceMaxBasePower !== undefined ? { effectSourceMaxBasePower: spec.effectSourceMaxBasePower } : {}),
        ...(spec.effectSourceCategory ? { effectSourceCategory: spec.effectSourceCategory } : {}),
        ...(spec.effectSourceWithoutAttribute ? { effectSourceWithoutAttribute: spec.effectSourceWithoutAttribute } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, scope: spec.scope, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  addContinuousKoImmunityAura(spec: {
    group: KoImmunityAuraGroup;
    scope: 'battle' | 'effect' | 'any';
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    sourceCondition?: SourceStateCondition;
    effectSourceController?: 'opponent' | 'controller';
    effectSourceMaxBasePower?: number;
    effectSourceCategory?: 'leader' | 'character';
    effectSourceWithoutAttribute?: string;
    description?: string;
  }): void {
    const mod: ContinuousKoImmunityModifier = {
      appliesToGroup: spec.group,
      scope: spec.scope,
      ...(spec.condition ? { condition: spec.condition } : {}),
      ...(spec.sourceCondition ? { sourceCondition: spec.sourceCondition } : {}),
      ...(spec.effectSourceController ? { effectSourceController: spec.effectSourceController } : {}),
      ...(spec.effectSourceMaxBasePower !== undefined ? { effectSourceMaxBasePower: spec.effectSourceMaxBasePower } : {}),
      ...(spec.effectSourceCategory ? { effectSourceCategory: spec.effectSourceCategory } : {}),
      ...(spec.effectSourceWithoutAttribute ? { effectSourceWithoutAttribute: spec.effectSourceWithoutAttribute } : {}),
    };
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? (spec.scope === 'battle' ? 'allies cannot be K.O.’d in battle' : 'allies cannot be K.O.’d'),
      koImmunityModifier: mod,
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} applied to a group.`,
      data: { continuousEffectId: record.id, scope: spec.scope, duration: spec.duration },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  addContinuousKoReplacement(spec: {
    appliesToInstanceId?: string;
    appliesToGroup?: KoReplacementAuraGroup;
    modifier: Omit<ContinuousKoReplacementModifier, 'appliesToInstanceId' | 'appliesToGroup'>;
    duration: ContinuousEffectDuration;
    description?: string;
  }): void {
    const mod: ContinuousKoReplacementModifier = {
      ...(spec.appliesToInstanceId !== undefined ? { appliesToInstanceId: spec.appliesToInstanceId } : {}),
      ...(spec.appliesToGroup !== undefined ? { appliesToGroup: spec.appliesToGroup } : {}),
      ...spec.modifier,
    };
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? koReplacementDescription(mod),
      koReplacementModifier: mod,
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} registered${spec.appliesToInstanceId ? ` on ${spec.appliesToInstanceId}` : ' as aura'}.`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: spec.appliesToInstanceId ? [spec.appliesToInstanceId] : [],
      visibility: 'public',
    });
  }

  addContinuousRestReplacement(spec: {
    appliesToInstanceId: string;
    modifier: Omit<import('../state/game').ContinuousRestReplacementModifier, 'appliesToInstanceId'>;
    duration: ContinuousEffectDuration;
    description?: string;
  }): void {
    const mod: import('../state/game').ContinuousRestReplacementModifier = {
      appliesToInstanceId: spec.appliesToInstanceId,
      ...spec.modifier,
    };
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? restReplacementDescription(mod),
      restReplacementModifier: mod,
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} registered on ${spec.appliesToInstanceId}.`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  preventBlockers(spec: {
    appliesToAttackerInstanceId: string;
    duration: ContinuousEffectDuration;
    blockerPowerAtLeast?: number;
    blockerPowerAtMost?: number;
    blockerMaxCost?: number;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description:
        spec.description ??
        (spec.blockerPowerAtLeast === undefined && spec.blockerPowerAtMost === undefined && spec.blockerMaxCost === undefined
          ? 'opponent cannot activate Blocker'
          : 'opponent cannot activate matching Blocker'),
      blockerRestriction: {
        appliesToAttackerInstanceId: spec.appliesToAttackerInstanceId,
        ...(spec.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: spec.blockerPowerAtLeast } : {}),
        ...(spec.blockerPowerAtMost !== undefined ? { blockerPowerAtMost: spec.blockerPowerAtMost } : {}),
        ...(spec.blockerMaxCost !== undefined ? { blockerMaxCost: spec.blockerMaxCost } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} while ${spec.appliesToAttackerInstanceId} attacks.`,
      data: {
        continuousEffectId: record.id,
        duration: spec.duration,
        blockerPowerAtLeast: spec.blockerPowerAtLeast,
        blockerPowerAtMost: spec.blockerPowerAtMost,
        blockerMaxCost: spec.blockerMaxCost,
      },
      relatedCardInstanceIds: [spec.appliesToAttackerInstanceId],
      visibility: 'public',
    });
  }

  suppressBlockerActivation(spec: {
    appliesToBlockerInstanceId: string;
    duration: ContinuousEffectDuration;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'cannot activate Blocker',
      blockerRestriction: { appliesToBlockerInstanceId: spec.appliesToBlockerInstanceId },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToBlockerInstanceId} cannot activate [Blocker] (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToBlockerInstanceId],
      visibility: 'public',
    });
  }

  preventAttack(spec: {
    appliesToInstanceId: string;
    duration: ContinuousEffectDuration;
    forbiddenTarget?: 'leader';
    forbiddenTargetFilter?: import('../state/game').ForbiddenAttackTargetFilter;
    whileSummoningSick?: boolean;
    attackUnlessGate?: import('./effectIr').AbilityGate[];
    condition?: import('../state/game').ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description:
        spec.description ??
        (spec.forbiddenTargetFilter
          ? 'cannot attack matching targets'
          : spec.forbiddenTarget === 'leader'
            ? 'cannot attack the opponent\'s Leader'
            : spec.attackUnlessGate?.length
              ? 'cannot attack unless gate passes'
              : 'cannot attack'),
      attackRestriction: {
        appliesToInstanceId: spec.appliesToInstanceId,
        ...(spec.forbiddenTarget ? { forbiddenTarget: spec.forbiddenTarget } : {}),
        ...(spec.forbiddenTargetFilter ? { forbiddenTargetFilter: spec.forbiddenTargetFilter } : {}),
        ...(spec.whileSummoningSick ? { whileSummoningSick: true } : {}),
        ...(spec.attackUnlessGate?.length ? { attackUnlessGate: spec.attackUnlessGate } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToInstanceId} cannot attack (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  preventAttackController(spec: {
    appliesToControllerId: string;
    duration: ContinuousEffectDuration;
    forbiddenTarget?: 'leader';
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? (spec.forbiddenTarget === 'leader' ? 'cannot attack the opponent\'s Leader' : 'cannot attack'),
      attackRestriction: {
        appliesToControllerId: spec.appliesToControllerId,
        ...(spec.forbiddenTarget ? { forbiddenTarget: spec.forbiddenTarget } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId} cannot attack (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  setForcedAttackTarget(spec: {
    appliesToInstanceId: string;
    duration: ContinuousEffectDuration;
    sourceCondition?: import('../state/game').SourceStateCondition;
    condition?: import('../state/game').ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'opponent must attack this Character',
      forcedAttackTarget: {
        appliesToInstanceId: spec.appliesToInstanceId,
        ...(spec.sourceCondition ? { sourceCondition: spec.sourceCondition } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToInstanceId} is the only legal attack target for the opponent (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  /** Retarget the in-progress battle's defender (7-1-2-1-style redirect during Block Step). */
  redirectAttackTarget(newTargetInstanceId: string): void {
    const battle = this.working.currentBattle;
    if (!battle) return;
    const target = this.working.cardsById[newTargetInstanceId];
    if (!target || (target.currentZone !== 'leaderArea' && target.currentZone !== 'characterArea')) return;
    if (target.controllerId !== this.controllerId) return;
    this.working = {
      ...this.working,
      currentBattle: { ...battle, targetInstanceId: newTargetInstanceId },
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `Attack target changed to ${newTargetInstanceId}.`,
      data: { newTargetInstanceId, previousTargetInstanceId: battle.targetInstanceId },
      relatedCardInstanceIds: [newTargetInstanceId, battle.attackerInstanceId],
      visibility: 'public',
    });
  }

  preventRest(spec: {
    appliesToInstanceId: string;
    duration: ContinuousEffectDuration;
    effectSourceController?: 'opponent' | 'controller';
    condition?: import('../state/game').ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'cannot be rested by effects',
      restRestriction: {
        appliesToInstanceId: spec.appliesToInstanceId,
        ...(spec.effectSourceController ? { effectSourceController: spec.effectSourceController } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToInstanceId} cannot be rested by effects (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  preventFieldRemoval(spec: {
    appliesToInstanceId?: string;
    appliesToGroup?: PowerAuraGroup;
    duration: ContinuousEffectDuration;
    effectSourceController?: 'opponent' | 'controller';
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'cannot be removed from the field by effects',
      fieldRemovalImmunityModifier: {
        ...(spec.appliesToInstanceId ? { appliesToInstanceId: spec.appliesToInstanceId } : {}),
        ...(spec.appliesToGroup ? { appliesToGroup: spec.appliesToGroup } : {}),
        ...(spec.effectSourceController ? { effectSourceController: spec.effectSourceController } : {}),
        ...(spec.condition ? { condition: spec.condition } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToInstanceId ?? 'matching cards'} cannot be removed from the field by effects (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: spec.appliesToInstanceId ? [spec.appliesToInstanceId] : [],
      visibility: 'public',
    });
  }

  negateEffect(spec: {
    appliesToInstanceId: string;
    duration: ContinuousEffectDuration;
    negatedTimings?: import('./effectIr').IrTiming[];
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'effect negated',
      effectNegation: {
        appliesToInstanceId: spec.appliesToInstanceId,
        ...(spec.negatedTimings?.length ? { negatedTimings: spec.negatedTimings } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToInstanceId} effect negated (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration, negatedTimings: spec.negatedTimings },
      relatedCardInstanceIds: [spec.appliesToInstanceId],
      visibility: 'public',
    });
  }

  negateControllerEffects(spec: {
    appliesToControllerId: string;
    duration: ContinuousEffectDuration;
    negatedTimings?: import('./effectIr').IrTiming[];
    appliesToCategories?: Exclude<import('../state/card').CardCategory, 'don'>[];
    exceptTypeIncludes?: string;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'controller effects negated',
      effectNegation: {
        appliesToControllerId: spec.appliesToControllerId,
        ...(spec.negatedTimings?.length ? { negatedTimings: spec.negatedTimings } : {}),
        ...(spec.appliesToCategories?.length ? { appliesToCategories: spec.appliesToCategories } : {}),
        ...(spec.exceptTypeIncludes ? { exceptTypeIncludes: spec.exceptTypeIncludes } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId}'s effects negated (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration, negatedTimings: spec.negatedTimings, appliesToCategories: spec.appliesToCategories, exceptTypeIncludes: spec.exceptTypeIncludes },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  preventControllerLifeToHand(spec: {
    appliesToControllerId: string;
    duration: ContinuousEffectDuration;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'cannot add Life cards to hand using your own effects',
      lifeToHandRestriction: { appliesToControllerId: spec.appliesToControllerId },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId} cannot add Life cards to hand using their own effects (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  preventControllerCharacterPlay(spec: {
    appliesToControllerId: string;
    duration: ContinuousEffectDuration;
    minBaseCost?: number;
    maxBaseCost?: number;
    description?: string;
  }): void {
    const costFilter =
      spec.minBaseCost !== undefined && spec.maxBaseCost !== undefined
        ? `with base cost ${spec.minBaseCost}–${spec.maxBaseCost}`
        : spec.minBaseCost !== undefined
          ? `with base cost ${spec.minBaseCost} or greater`
          : spec.maxBaseCost !== undefined
            ? `with base cost ${spec.maxBaseCost} or less`
            : '';
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? `cannot play Character cards ${costFilter}`.trim(),
      characterPlayRestriction: {
        appliesToControllerId: spec.appliesToControllerId,
        ...(spec.minBaseCost !== undefined ? { minBaseCost: spec.minBaseCost } : {}),
        ...(spec.maxBaseCost !== undefined ? { maxBaseCost: spec.maxBaseCost } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId} cannot play Character cards ${costFilter} (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration, minBaseCost: spec.minBaseCost, maxBaseCost: spec.maxBaseCost },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  preventControllerHandPlay(spec: {
    appliesToControllerId: string;
    duration: ContinuousEffectDuration;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'cannot play cards from hand',
      handPlayRestriction: { appliesToControllerId: spec.appliesToControllerId },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId} cannot play cards from hand (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  deferEmptyDeckDefeatToEndOfTurn(spec: {
    appliesToControllerId: string;
    duration: ContinuousEffectDuration;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'do not lose when deck has 0 cards; lose at end of that turn',
      emptyDeckDefeatDeferral: { appliesToControllerId: spec.appliesToControllerId },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId} does not lose when their deck has 0 cards; they lose at the end of the turn their deck becomes 0.`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  preventControllerCharacterSetActiveDon(spec: {
    appliesToControllerId: string;
    duration: ContinuousEffectDuration;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description: spec.description ?? 'cannot set DON!! cards as active using Character effects',
      characterSetActiveDonRestriction: { appliesToControllerId: spec.appliesToControllerId },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId} cannot set DON!! cards as active using Character effects (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  addRefreshCostRestriction(spec: {
    maxCost: number;
    scope?: 'bothPlayers';
    activationGate?: import('./effectIr').AbilityGate[];
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: 'permanent',
      description: spec.description ?? `Characters with a cost of ${spec.maxCost} or less do not become active during Refresh Phases`,
      refreshCostRestriction: {
        maxCost: spec.maxCost,
        scope: spec.scope ?? 'bothPlayers',
        ...(spec.activationGate?.length ? { activationGate: spec.activationGate } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: record.description,
      data: { continuousEffectId: record.id, maxCost: spec.maxCost },
      relatedCardInstanceIds: [this.sourceInstanceId],
      visibility: 'public',
    });
  }

  giveDon(targetInstanceId: string, count: number): void {
    this.giveDonFromCostArea(targetInstanceId, count, this.controllerId, { restedOnly: true });
  }

  /** Returns how many DON!! cards were attached (0 when none available). */
  giveDonFromCostArea(
    targetInstanceId: string,
    count: number,
    donOwnerId: string,
    filter: { restedOnly?: boolean; activeOnly?: boolean } = { restedOnly: true },
  ): number {
    const player = this.working.players[donOwnerId];
    if (!player) return 0;
    const attached = new Set<string>();
    for (const id of Object.keys(this.working.cardsById)) {
      for (const donId of this.working.cardsById[id].donAttached) attached.add(donId);
    }
    const available = player.costArea.cardIds.filter((id) => {
      if (attached.has(id)) return false;
      const don = this.working.cardsById[id];
      if (!don) return false;
      if (filter.activeOnly) return don.donRested === false;
      if (filter.restedOnly) return don.donRested === true;
      return true;
    });
    const toGive = available.slice(0, Math.max(0, count));
    if (toGive.length === 0) return 0;

    const cardsById = { ...this.working.cardsById };
    const target = cardsById[targetInstanceId];
    if (!target) return 0;
    cardsById[targetInstanceId] = { ...target, donAttached: [...target.donAttached, ...toGive] };
    this.working = { ...this.working, cardsById };

    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'DON_GIVEN',
      message: `gave ${toGive.length} DON!! from ${donOwnerId}'s cost area to ${targetInstanceId} (+${toGive.length * 1000} power, 6-5-5).`,
      data: { count: toGive.length, targetInstanceId, donInstanceIds: toGive, donOwnerId, ...filter },
      relatedCardInstanceIds: [targetInstanceId, ...toGive],
      visibility: 'public',
    });
    this.recordDonGiven(targetInstanceId, toGive.length);
    return toGive.length;
  }

  /** Reassign one DON!! already given on the field onto another Leader/Character/Stage. */
  giveGivenDon(donInstanceId: string, targetInstanceId: string): void {
    const don = this.working.cardsById[donInstanceId];
    const target = this.working.cardsById[targetInstanceId];
    const donDef = this.defs[don?.cardDefinitionId ?? ''];
    if (!don || !target || donDef?.category !== 'don') return;

    let hostId: string | null = null;
    for (const [id, inst] of Object.entries(this.working.cardsById)) {
      if (inst.donAttached.includes(donInstanceId)) {
        hostId = id;
        break;
      }
    }
    if (!hostId || hostId === targetInstanceId) return;

    const host = this.working.cardsById[hostId];
    const cardsById = { ...this.working.cardsById };
    cardsById[hostId] = { ...host, donAttached: host.donAttached.filter((d) => d !== donInstanceId) };
    cardsById[targetInstanceId] = { ...target, donAttached: [...target.donAttached, donInstanceId] };
    this.working = { ...this.working, cardsById };

    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'DON_GIVEN',
      message: `moved 1 given DON!! from ${hostId} to ${targetInstanceId}.`,
      data: { count: 1, targetInstanceId, donInstanceIds: [donInstanceId], fromInstanceId: hostId },
      relatedCardInstanceIds: [targetInstanceId, hostId, donInstanceId],
      visibility: 'public',
    });
    this.recordDonGiven(targetInstanceId, 1);
  }

  koApply(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    const fromZone = inst.currentZone;
    // "Cannot be K.O.'d" (scope 'any', e.g. ST05-017 rider): an effect K.O. is prevented.
    if (isKoImmune(this.defs, this.working, targetInstanceId, 'effect', { koSourceInstanceId: this.sourceInstanceId })) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${targetInstanceId} cannot be K.O.'d — the K.O. is prevented.`,
        data: { targetInstanceId, koPrevented: true },
        relatedCardInstanceIds: [targetInstanceId],
        visibility: 'public',
      });
      return;
    }
    // "Cannot be removed from the field by opponent's effects" (broader than K.O. immunity —
    // also blocks bounce/bottom-deck, see returnToHand/moveToBottomDeck below).
    if (cannotBeRemovedFromFieldByEffect(this.working, targetInstanceId, this.sourceInstanceId, this.defs)) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${targetInstanceId} cannot be removed from the field — the K.O. is prevented.`,
        data: { targetInstanceId, fieldRemovalPrevented: true },
        relatedCardInstanceIds: [targetInstanceId],
        visibility: 'public',
      });
      return;
    }
    const owner = this.working.players[inst.ownerId];
    const newOwner = {
      ...owner,
      characterArea: removeFromZone(owner.characterArea, targetInstanceId),
      stageArea: removeFromZone(owner.stageArea, targetInstanceId),
      trash: addToZoneTop(owner.trash, targetInstanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, currentZone: 'trash', donAttached: [] } },
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
    this.recordFieldRemoval(targetInstanceId, fromZone, 'trash');
    this.koed.push({ targetInstanceId, cause: 'effect', sourceInstanceId: this.sourceInstanceId });
  }

  ko(targetInstanceId: string): void {
    this.koApply(targetInstanceId);
  }

  /** Drain and return effect-rested Leader/Characters this resolution (for onRested cascade). */
  takeRested(): { targetInstanceId: string; cause: 'effect'; sourceInstanceId: string }[] {
    const drained = [...this.rested];
    this.rested.length = 0;
    return drained;
  }

  /** Drain K.O. events from this resolution (for [On K.O.] cascade). */
  takeKoed(): { targetInstanceId: string; cause: 'battle' | 'effect'; sourceInstanceId: string }[] {
    const drained = [...this.koed];
    this.koed.length = 0;
    return drained;
  }

  /** Drain DON!!-given events from this resolution (for onDonGiven cascade). */
  takeDonGiven(): { targetInstanceId: string; count: number }[] {
    const drained = [...this.donGiven];
    this.donGiven.length = 0;
    return drained;
  }

  takeFieldRemovals(): { targetInstanceId: string; removedControllerId: string; effectControllerId: string; removedToZone: RemovedFromFieldDestination }[] {
    const drained = [...this.fieldRemovals];
    this.fieldRemovals.length = 0;
    return drained;
  }

  takePendingEventActivations(): string[] {
    const drained = [...this.pendingEventActivations];
    this.pendingEventActivations.length = 0;
    return drained;
  }

  takePlayedFromTrash(): string[] {
    const drained = [...this.playedFromTrash];
    this.playedFromTrash.length = 0;
    return drained;
  }

  takePlayedCharacters(): { instanceId: string; controllerId: string; fromCharacterEffect: boolean }[] {
    const drained = [...this.playedCharacters];
    this.playedCharacters.length = 0;
    return drained;
  }

  private recordPlayedCharacter(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst || inst.currentZone !== 'characterArea') return;
    const sourceInst = this.working.cardsById[this.sourceInstanceId];
    const sourceDef = sourceInst ? this.defs[sourceInst.cardDefinitionId] : undefined;
    const fromCharacterEffect = sourceInst?.currentZone === 'characterArea' && sourceDef?.category === 'character';
    this.playedCharacters.push({ instanceId, controllerId: inst.controllerId, fromCharacterEffect });
  }

  takeHandTrashed(): { ownerId: string; count: number; effectSourceInstanceId: string }[] {
    const drained = [...this.handTrashed];
    this.handTrashed.length = 0;
    return drained;
  }

  returnToHand(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    const fromZone = inst.currentZone;
    if (
      (fromZone === 'characterArea' || fromZone === 'stageArea') &&
      cannotBeRemovedFromFieldByEffect(this.working, targetInstanceId, this.sourceInstanceId, this.defs)
    ) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${targetInstanceId} cannot be removed from the field — the return-to-hand is prevented.`,
        data: { targetInstanceId, fieldRemovalPrevented: true },
        relatedCardInstanceIds: [targetInstanceId],
        visibility: 'public',
      });
      return;
    }
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
    this.recordFieldRemoval(targetInstanceId, fromZone, 'hand');
  }

  moveToBottomDeck(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const fromZone = inst.currentZone;
    if (
      (fromZone === 'characterArea' || fromZone === 'stageArea') &&
      cannotBeRemovedFromFieldByEffect(this.working, instanceId, this.sourceInstanceId, this.defs)
    ) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${instanceId} cannot be removed from the field — the bottom-of-deck placement is prevented.`,
        data: { targetInstanceId: instanceId, fieldRemovalPrevented: true },
        relatedCardInstanceIds: [instanceId],
        visibility: 'public',
      });
      return;
    }
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const newOwner = {
      ...owner,
      hand: removeFromZone(owner.hand, instanceId),
      trash: removeFromZone(owner.trash, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      lifeArea: removeFromZone(owner.lifeArea, instanceId),
      deck: addToZoneBottom(owner.deck, instanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: {
        ...this.working.cardsById,
        [instanceId]: { ...inst, currentZone: 'deck', donAttached: [], summoningSick: false, revealedTo: [] },
      },
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was placed at the bottom of its owner's deck.`,
      data: { from: fromZone, to: 'deck', position: 'bottom', instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: 'public',
    });
    this.recordFieldRemoval(instanceId, fromZone, 'deck');
  }

  moveToTopDeck(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const fromZone = inst.currentZone;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const newOwner = {
      ...owner,
      hand: removeFromZone(owner.hand, instanceId),
      trash: removeFromZone(owner.trash, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      lifeArea: removeFromZone(owner.lifeArea, instanceId),
      deck: addToZoneTop(owner.deck, instanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: {
        ...this.working.cardsById,
        [instanceId]: { ...inst, currentZone: 'deck', donAttached: [], summoningSick: false, revealedTo: [] },
      },
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was placed at the top of its owner's deck.`,
      data: { from: fromZone, to: 'deck', position: 'top', instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: 'public',
    });
    this.recordFieldRemoval(instanceId, fromZone, 'deck');
  }

  moveToLifeTop(instanceId: string, faceUp = false): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const fromZone = inst.currentZone;
    const newOwner = {
      ...owner,
      hand: removeFromZone(owner.hand, instanceId),
      deck: removeFromZone(owner.deck, instanceId),
      trash: removeFromZone(owner.trash, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      lifeArea: addToZoneTop(removeFromZone(owner.lifeArea, instanceId), instanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: {
        ...this.working.cardsById,
        [instanceId]: {
          ...inst,
          currentZone: 'lifeArea',
          faceState: faceUp ? 'faceUp' : 'faceDown',
          donAttached: [],
          summoningSick: false,
          revealedTo: faceUp ? 'all' : [],
        },
      },
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was added to the top of its owner's Life cards${faceUp ? ' face-up' : ''}.`,
      data: { from: fromZone, to: 'lifeArea', position: 'top', faceUp, instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: faceUp ? 'public' : { visibleTo: [inst.ownerId] },
    });
    this.recordFieldRemoval(instanceId, fromZone, 'life');
  }

  moveToLifeBottom(instanceId: string, faceUp = false): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const fromZone = inst.currentZone;
    const newOwner = {
      ...owner,
      hand: removeFromZone(owner.hand, instanceId),
      deck: removeFromZone(owner.deck, instanceId),
      trash: removeFromZone(owner.trash, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      lifeArea: addToZoneBottom(removeFromZone(owner.lifeArea, instanceId), instanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: {
        ...this.working.cardsById,
        [instanceId]: { ...inst, currentZone: 'lifeArea', faceState: faceUp ? 'faceUp' : 'faceDown', donAttached: [], summoningSick: false, revealedTo: faceUp ? 'all' : [] },
      },
      continuousEffects: this.working.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was added to the bottom of its owner's Life cards${faceUp ? ' face-up' : ''}.`,
      data: { from: fromZone, to: 'lifeArea', position: 'bottom', faceUp, instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: faceUp ? 'public' : { visibleTo: [inst.ownerId] },
    });
    this.recordFieldRemoval(instanceId, fromZone, 'life');
  }

  turnLifeFace(instanceId: string, faceUp: boolean): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst || inst.currentZone !== 'lifeArea') return;
    this.working = {
      ...this.working,
      cardsById: { ...this.working.cardsById, [instanceId]: { ...inst, faceState: faceUp ? 'faceUp' : 'faceDown', revealedTo: faceUp ? 'all' : [] } },
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} (top of Life) was turned ${faceUp ? 'face-up' : 'face-down'}.`,
      data: { from: 'lifeArea', to: 'lifeArea', faceUp, instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: 'public',
    });
  }

  moveLifeToBottom(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst || inst.currentZone !== 'lifeArea') return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const newOwner = {
      ...owner,
      lifeArea: addToZoneBottom(removeFromZone(owner.lifeArea, instanceId), instanceId),
    };
    this.working = {
      ...this.working,
      players: { ...this.working.players, [inst.ownerId]: newOwner },
      cardsById: {
        ...this.working.cardsById,
        [instanceId]: { ...inst, faceState: 'faceDown', revealedTo: [] },
      },
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was placed at the bottom of its owner's Life cards.`,
      data: { from: 'lifeArea', to: 'lifeArea', position: 'bottom', instanceId },
      relatedCardInstanceIds: [instanceId],
      visibility: { visibleTo: [this.controllerId] },
    });
  }

  reorderLife(playerId: string, lifeOrderIds: string[], deckTopId?: string): void {
    const player = this.working.players[playerId];
    if (!player) return;
    const current = player.lifeArea.cardIds;
    const currentSet = new Set(current);
    const orderedLife = lifeOrderIds.filter((id) => currentSet.has(id) && id !== deckTopId);
    const missing = current.filter((id) => id !== deckTopId && !orderedLife.includes(id));
    const nextLifeIds = [...orderedLife, ...missing];

    let cardsById = { ...this.working.cardsById };
    if (deckTopId && currentSet.has(deckTopId)) {
      cardsById[deckTopId] = { ...cardsById[deckTopId], currentZone: 'deck', faceState: 'faceDown' };
    }
    for (const id of nextLifeIds) {
      cardsById[id] = { ...cardsById[id], currentZone: 'lifeArea' };
    }

    this.working = {
      ...this.working,
      cardsById,
      players: {
        ...this.working.players,
        [playerId]: {
          ...player,
          lifeArea: { ...player.lifeArea, cardIds: nextLifeIds },
          deck: deckTopId && currentSet.has(deckTopId) ? addToZoneTop(player.deck, deckTopId) : player.deck,
        },
      },
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${this.controllerId} reordered ${playerId}'s Life cards.`,
      data: { playerId, deckTopId },
      relatedCardInstanceIds: deckTopId ? [deckTopId, ...nextLifeIds] : nextLifeIds,
      visibility: { visibleTo: [this.controllerId] },
    });
  }

  turnAllLifeFace(playerId: string, faceUp: boolean): void {
    const ids = this.working.players[playerId]?.lifeArea.cardIds ?? [];
    let cardsById = this.working.cardsById;
    for (const id of ids) {
      const card = cardsById[id];
      if (!card) continue;
      cardsById = { ...cardsById, [id]: { ...card, faceState: faceUp ? 'faceUp' : 'faceDown' } };
    }
    this.working = { ...this.working, cardsById };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${this.controllerId} turned ${ids.length} Life card${ids.length === 1 ? '' : 's'} face-${faceUp ? 'up' : 'down'}.`,
      data: { playerId, faceUp, count: ids.length },
      relatedCardInstanceIds: ids,
      visibility: 'public',
    });
  }

  playSelf(): void {
    const inst = this.working.cardsById[this.sourceInstanceId];
    const def = inst ? this.defs[inst.cardDefinitionId] : undefined;
    if (!inst || !def) return;
    if (def.category === 'character') {
      this.playCharacterFromHand(this.sourceInstanceId);
      return;
    }
    if (def.category === 'stage') {
      this.playStageFromHand(this.sourceInstanceId);
    }
  }

  playFromHand(handInstanceId: string, rested = false): void {
    const handInst = this.working.cardsById[handInstanceId];
    const def = handInst ? this.defs[handInst.cardDefinitionId] : undefined;
    if (!handInst || !def || handInst.currentZone !== 'hand') return;
    if (isControllerHandPlayPrevented(this.working, handInst.controllerId)) {
      this.logger.push({
        actorPlayerId: handInst.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${handInst.controllerId} cannot play ${def.name} from hand — hand play is restricted this turn.`,
        data: { instanceId: handInstanceId, prevented: true },
        relatedCardInstanceIds: [handInstanceId],
        visibility: 'public',
      });
      return;
    }
    if (def.category === 'stage') {
      this.playStageFromHand(handInstanceId);
      return;
    }
    if (def.category === 'character') {
      this.playCharacterFromHand(handInstanceId, rested);
    }
  }

  queueEventActivationFromHand(handInstanceId: string): void {
    const handInst = this.working.cardsById[handInstanceId];
    if (!handInst || handInst.currentZone !== 'hand') return;
    if (isControllerHandPlayPrevented(this.working, handInst.controllerId)) {
      const def = this.defs[handInst.cardDefinitionId];
      this.logger.push({
        actorPlayerId: handInst.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${handInst.controllerId} cannot activate ${def?.name ?? handInstanceId} from hand — hand play is restricted this turn.`,
        data: { instanceId: handInstanceId, prevented: true },
        relatedCardInstanceIds: [handInstanceId],
        visibility: 'public',
      });
      return;
    }
    const def = this.defs[handInst.cardDefinitionId];
    if (!def || def.category !== 'event') return;
    const controllerId = handInst.controllerId;
    const player = this.working.players[controllerId];
    if (!player) return;

    const cardsById = {
      ...this.working.cardsById,
      [handInstanceId]: {
        ...handInst,
        currentZone: 'trash' as const,
        orientation: null,
        donAttached: [],
        faceState: 'faceUp' as const,
        revealedTo: 'all' as const,
      },
    };
    const newHand = removeFromZone(player.hand, handInstanceId);
    const newTrash = addToZoneTop(player.trash, handInstanceId);
    this.working = {
      ...this.working,
      cardsById,
      players: { ...this.working.players, [controllerId]: { ...player, hand: newHand, trash: newTrash } },
    };
    this.pendingEventActivations.push(handInstanceId);
    this.logger.push({
      actorPlayerId: controllerId,
      type: 'EFFECT_ACTIVATED',
      message: `${controllerId} activated [Main] Event ${def.name} from hand via an effect (no play cost).`,
      data: { from: 'hand', to: 'trash', cost: 0, instanceId: handInstanceId },
      relatedCardInstanceIds: [handInstanceId],
      visibility: 'public',
    });
  }

  queueEventActivationFromTrash(trashInstanceId: string): void {
    const inst = this.working.cardsById[trashInstanceId];
    if (!inst || inst.currentZone !== 'trash') return;
    const def = this.defs[inst.cardDefinitionId];
    if (!def || def.category !== 'event') return;
    this.pendingEventActivations.push(trashInstanceId);
    this.logger.push({
      actorPlayerId: inst.controllerId,
      type: 'EFFECT_ACTIVATED',
      message: `${inst.controllerId} activated [Main] Event ${def.name} from trash via an effect.`,
      data: { from: 'trash', to: 'trash', cost: 0, instanceId: trashInstanceId },
      relatedCardInstanceIds: [trashInstanceId],
      visibility: 'public',
    });
  }

  private playStageFromHand(handInstanceId: string): void {
    const handInst = this.working.cardsById[handInstanceId];
    if (!handInst || handInst.currentZone !== 'hand') return;
    const def = this.defs[handInst.cardDefinitionId];
    if (!def || def.category !== 'stage') return;
    const controllerId = handInst.controllerId;
    if (isControllerHandPlayPrevented(this.working, controllerId)) {
      this.logger.push({
        actorPlayerId: controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${controllerId} cannot play ${def.name} from hand — hand play is restricted this turn.`,
        data: { instanceId: handInstanceId, prevented: true },
        relatedCardInstanceIds: [handInstanceId],
        visibility: 'public',
      });
      return;
    }
    const player = this.working.players[controllerId];
    if (!player) return;

    let trash = player.trash;
    let cardsById = { ...this.working.cardsById };
    const displacedStageId = player.stageArea.cardIds[0];
    if (displacedStageId) {
      const displaced = cardsById[displacedStageId];
      if (displaced) {
        trash = addToZoneTop(trash, displacedStageId);
        cardsById[displacedStageId] = { ...displaced, currentZone: 'trash', orientation: null, donAttached: [], faceState: 'faceUp', revealedTo: 'all' };
      }
    }

    const minted = mintRuntimeInstanceId({ ...this.working, cardsById });
    const newId = minted.id;
    const newInstance: CardInstance = {
      instanceId: newId,
      cardDefinitionId: handInst.cardDefinitionId,
      ownerId: handInst.ownerId,
      controllerId,
      currentZone: 'stageArea',
      orientation: 'active',
      faceState: 'faceUp',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: 'all',
    };
    cardsById = { ...minted.state.cardsById, [newId]: newInstance };
    delete cardsById[handInstanceId];

    const newHand = removeFromZone(player.hand, handInstanceId);
    const newStageArea = addToZoneBottom({ ...player.stageArea, cardIds: [] }, newId);
    this.working = {
      ...minted.state,
      cardsById,
      players: { ...minted.state.players, [controllerId]: { ...player, hand: newHand, stageArea: newStageArea, trash } },
    };

    this.logger.push({
      actorPlayerId: controllerId,
      type: 'CARD_PLAYED',
      message: `${controllerId} played ${def.name} from hand via an effect (no cost).`,
      data: { from: 'hand', to: 'stageArea', cost: 0, oldInstanceId: handInstanceId, displacedStageId },
      relatedCardInstanceIds: displacedStageId ? [newId, displacedStageId] : [newId],
      visibility: 'public',
    });
  }

  playCharacterFromHand(handInstanceId: string, rested = false): void {
    const handInst = this.working.cardsById[handInstanceId];
    if (!handInst || handInst.currentZone !== 'hand') return;
    const def = this.defs[handInst.cardDefinitionId];
    if (!def || def.category !== 'character') return; // only Characters can be played to the field
    const controllerId = handInst.controllerId;
    if (isControllerHandPlayPrevented(this.working, controllerId)) {
      this.logger.push({
        actorPlayerId: controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${controllerId} cannot play ${def.name} from hand — hand play is restricted this turn.`,
        data: { instanceId: handInstanceId, prevented: true },
        relatedCardInstanceIds: [handInstanceId],
        visibility: 'public',
      });
      return;
    }
    if (isControllerCharacterPlayPrevented(this.working, controllerId, this.defs, handInst.cardDefinitionId)) {
      this.logger.push({
        actorPlayerId: controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${controllerId} cannot play ${def.name} from hand — Character play is restricted this turn.`,
        data: { instanceId: handInstanceId, prevented: true },
        relatedCardInstanceIds: [handInstanceId],
        visibility: 'public',
      });
      return;
    }
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
      orientation: rested ? 'rested' : 'active',
      faceState: 'faceUp',
      donAttached: [],
      currentPower: def.basePower ?? 0,
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: !def.hasRush, // 3-7-4, 10-1-6
      revealedTo: 'all',
      enteredPlayTurn: this.working.turnNumber,
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
      message: `${controllerId} played ${def.name} from hand via an effect (no cost, ${rested ? 'rested' : 'active'}).`,
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
    this.recordPlayedCharacter(newId);
  }

  playCharacterFromTrash(trashInstanceId: string, rested = false): string | null {
    const trashInst = this.working.cardsById[trashInstanceId];
    if (!trashInst || trashInst.currentZone !== 'trash') return null;
    const def = this.defs[trashInst.cardDefinitionId];
    if (!def || def.category !== 'character') return null; // only Characters can be played to the field
    const controllerId = trashInst.controllerId;
    if (isControllerCharacterPlayPrevented(this.working, controllerId, this.defs, trashInst.cardDefinitionId)) {
      this.logger.push({
        actorPlayerId: controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${controllerId} cannot play ${def.name} from trash — Character play is restricted this turn.`,
        data: { instanceId: trashInstanceId, prevented: true },
        relatedCardInstanceIds: [trashInstanceId],
        visibility: 'public',
      });
      return null;
    }
    const player = this.working.players[controllerId];
    if (!player) return null;

    const minted = mintRuntimeInstanceId(this.working); // 3-1-6: fresh instance entering play
    const newId = minted.id;
    const newInstance: CardInstance = {
      instanceId: newId,
      cardDefinitionId: trashInst.cardDefinitionId,
      ownerId: trashInst.ownerId,
      controllerId,
      currentZone: 'characterArea',
      orientation: rested ? 'rested' : 'active',
      faceState: 'faceUp',
      donAttached: [],
      currentPower: def.basePower ?? 0,
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: !def.hasRush, // 3-7-4, 10-1-6
      revealedTo: 'all',
      enteredPlayTurn: this.working.turnNumber,
    };
    const cardsById = { ...minted.state.cardsById, [newId]: newInstance };
    delete cardsById[trashInstanceId]; // old trash instance retired
    const newCharacterArea = addToZoneBottom(player.characterArea, newId);
    const newTrash = removeFromZone(player.trash, trashInstanceId);
    this.working = {
      ...minted.state,
      cardsById,
      players: { ...minted.state.players, [controllerId]: { ...player, trash: newTrash, characterArea: newCharacterArea } },
    };

    this.logger.push({
      actorPlayerId: controllerId,
      type: 'CARD_PLAYED',
      message: `${controllerId} played ${def.name} from trash via an effect (no cost, ${rested ? 'rested' : 'active'}).`,
      data: { from: 'trash', to: 'characterArea', cost: 0, oldInstanceId: trashInstanceId },
      relatedCardInstanceIds: [newId],
      visibility: 'public',
    });
    this.playedFromTrash.push(newId);

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
    this.recordPlayedCharacter(newId);
    return newId;
  }

  /**
   * Put a Character currently in the controller's Life area into play with no cost
   * (e.g. ST13 "Reveal 1 card from the top of your Life cards. If that card is a
   * [Name] with a cost of 5, you may play that card."). Mirrors
   * {@link playCharacterFromTrash}: only Characters are playable, Character-play
   * restrictions are honored, the Life instance is retired and a fresh field
   * instance minted, and Character-area overflow is enforced. Returns the new field
   * instance id, or null when the play is illegal (non-Character, prevented, or the
   * card is not actually in the Life area).
   */
  playCharacterFromLife(lifeInstanceId: string, rested = false): string | null {
    const lifeInst = this.working.cardsById[lifeInstanceId];
    if (!lifeInst || lifeInst.currentZone !== 'lifeArea') return null;
    const def = this.defs[lifeInst.cardDefinitionId];
    if (!def || def.category !== 'character') return null; // only Characters can be played to the field
    const controllerId = lifeInst.controllerId;
    if (isControllerCharacterPlayPrevented(this.working, controllerId, this.defs, lifeInst.cardDefinitionId)) {
      this.logger.push({
        actorPlayerId: controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${controllerId} cannot play ${def.name} from their Life area — Character play is restricted this turn.`,
        data: { instanceId: lifeInstanceId, prevented: true },
        relatedCardInstanceIds: [lifeInstanceId],
        visibility: 'public',
      });
      return null;
    }
    const player = this.working.players[controllerId];
    if (!player) return null;

    const minted = mintRuntimeInstanceId(this.working); // 3-1-6: fresh instance entering play
    const newId = minted.id;
    const newInstance: CardInstance = {
      instanceId: newId,
      cardDefinitionId: lifeInst.cardDefinitionId,
      ownerId: lifeInst.ownerId,
      controllerId,
      currentZone: 'characterArea',
      orientation: rested ? 'rested' : 'active',
      faceState: 'faceUp',
      donAttached: [],
      currentPower: def.basePower ?? 0,
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: !def.hasRush, // 3-7-4, 10-1-6
      revealedTo: 'all',
      enteredPlayTurn: this.working.turnNumber,
    };
    const cardsById = { ...minted.state.cardsById, [newId]: newInstance };
    delete cardsById[lifeInstanceId]; // old Life instance retired
    const newCharacterArea = addToZoneBottom(player.characterArea, newId);
    const newLifeArea = removeFromZone(player.lifeArea, lifeInstanceId);
    this.working = {
      ...minted.state,
      cardsById,
      players: { ...minted.state.players, [controllerId]: { ...player, lifeArea: newLifeArea, characterArea: newCharacterArea } },
    };

    this.logger.push({
      actorPlayerId: controllerId,
      type: 'CARD_PLAYED',
      message: `${controllerId} played ${def.name} from their Life area via an effect (no cost, ${rested ? 'rested' : 'active'}).`,
      data: { from: 'lifeArea', to: 'characterArea', cost: 0, oldInstanceId: lifeInstanceId },
      relatedCardInstanceIds: [newId],
      visibility: 'public',
    });

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
    this.recordPlayedCharacter(newId);
    return newId;
  }

  playCharacterFromDeck(deckInstanceId: string, rested = false): void {
    const deckInst = this.working.cardsById[deckInstanceId];
    if (!deckInst || deckInst.currentZone !== 'deck') return;
    const def = this.defs[deckInst.cardDefinitionId];
    if (!def || def.category !== 'character') return;
    const controllerId = deckInst.controllerId;
    if (isControllerCharacterPlayPrevented(this.working, controllerId, this.defs, deckInst.cardDefinitionId)) {
      this.logger.push({
        actorPlayerId: controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${controllerId} cannot play ${def.name} from deck — Character play is restricted this turn.`,
        data: { instanceId: deckInstanceId, prevented: true },
        relatedCardInstanceIds: [deckInstanceId],
        visibility: 'public',
      });
      return;
    }
    const player = this.working.players[controllerId];
    if (!player) return;

    const minted = mintRuntimeInstanceId(this.working);
    const newId = minted.id;
    const newInstance: CardInstance = {
      instanceId: newId,
      cardDefinitionId: deckInst.cardDefinitionId,
      ownerId: deckInst.ownerId,
      controllerId,
      currentZone: 'characterArea',
      orientation: rested ? 'rested' : 'active',
      faceState: 'faceUp',
      donAttached: [],
      currentPower: def.basePower ?? 0,
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: !def.hasRush,
      revealedTo: 'all',
      enteredPlayTurn: this.working.turnNumber,
    };
    const cardsById = { ...minted.state.cardsById, [newId]: newInstance };
    delete cardsById[deckInstanceId];
    const newCharacterArea = addToZoneBottom(player.characterArea, newId);
    const newDeck = removeFromZone(player.deck, deckInstanceId);
    this.working = {
      ...minted.state,
      cardsById,
      players: { ...minted.state.players, [controllerId]: { ...player, deck: newDeck, characterArea: newCharacterArea } },
    };

    this.logger.push({
      actorPlayerId: controllerId,
      type: 'CARD_PLAYED',
      message: `${controllerId} played ${def.name} from deck via an effect (no cost, ${rested ? 'rested' : 'active'}).`,
      data: { from: 'deck', to: 'characterArea', cost: 0, oldInstanceId: deckInstanceId },
      relatedCardInstanceIds: [newId],
      visibility: 'public',
    });

    const limit = newCharacterArea.maxSize ?? Infinity;
    if (newCharacterArea.cardIds.length > limit) {
      this.emitChoice({
        id: `${controllerId}__character-overflow-${newId}`,
        playerId: controllerId,
        kind: 'SELECT_CARDS',
        prompt: `Choose 1 Character to trash - more than ${limit} in your Character Area (3-7-6-1).`,
        constraints: { min: 1, max: 1, zoneId: 'characterArea', filterDescription: 'Any Character currently in your Character Area.' },
        sourceInstanceId: null,
        sourceEffectId: 'rule:characterAreaOverflow',
      });
    }
    this.recordPlayedCharacter(newId);
  }

  /**
   * Play a chosen deck Stage into the Stage area (no cost), mirroring
   * playCharacterFromDeck's "fresh instance, remove-from-deck" shape but for
   * Stage semantics: replaces (trashes) any existing Stage instead of an
   * overflow choice (3-8-5, mirrors executePlayStage), never summoning sick,
   * and never rested (Stages have no orientation-on-entry concept beyond
   * active). Used by Imu (OP13-079)'s "at the start of the game" ability —
   * see setup/advanceStartOfGameEffects.ts.
   */
  playStageFromDeck(deckInstanceId: string): void {
    const deckInst = this.working.cardsById[deckInstanceId];
    if (!deckInst || deckInst.currentZone !== 'deck') return;
    const def = this.defs[deckInst.cardDefinitionId];
    if (!def || def.category !== 'stage') return;
    const controllerId = deckInst.controllerId;
    const player = this.working.players[controllerId];
    if (!player) return;

    let cardsById = { ...this.working.cardsById };
    let trash = player.trash;
    const displacedStageId = player.stageArea.cardIds[0];
    if (displacedStageId) {
      cardsById[displacedStageId] = { ...cardsById[displacedStageId], currentZone: 'trash', donAttached: [] };
      trash = addToZoneTop(trash, displacedStageId);
      this.logger.push({
        actorPlayerId: controllerId,
        type: 'CARD_MOVED',
        message: `${controllerId}'s previous Stage was trashed to make room for a new one (3-8-5).`,
        data: { from: 'stageArea', to: 'trash' },
        relatedCardInstanceIds: [displacedStageId],
        visibility: 'public',
      });
    }

    const minted = mintRuntimeInstanceId(this.working);
    const newId = minted.id;
    const newInstance: CardInstance = {
      instanceId: newId,
      cardDefinitionId: deckInst.cardDefinitionId,
      ownerId: deckInst.ownerId,
      controllerId,
      currentZone: 'stageArea',
      orientation: 'active',
      faceState: 'faceUp',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: 'all',
    };
    cardsById = { ...minted.state.cardsById, ...cardsById, [newId]: newInstance };
    delete cardsById[deckInstanceId];
    const newStageArea = addToZoneBottom({ ...player.stageArea, cardIds: [] }, newId);
    const newDeck = removeFromZone(player.deck, deckInstanceId);
    this.working = {
      ...minted.state,
      cardsById,
      players: { ...minted.state.players, [controllerId]: { ...player, deck: newDeck, stageArea: newStageArea, trash } },
    };

    this.logger.push({
      actorPlayerId: controllerId,
      type: 'CARD_PLAYED',
      message: `${controllerId} played ${def.name} from deck via an effect (no cost).`,
      data: { from: 'deck', to: 'stageArea', cost: 0, oldInstanceId: deckInstanceId },
      relatedCardInstanceIds: [newId],
      visibility: 'public',
    });
  }

  shuffleDeck(playerId: string): void {
    const player = this.working.players[playerId];
    if (!player) return;
    const seededRng = createSeededRng(this.working.rng.seed);
    const shuffled = seededRng.shuffle(this.working.rng, player.deck.cardIds);
    this.working = {
      ...this.working,
      rng: shuffled.nextState,
      players: {
        ...this.working.players,
        [playerId]: { ...player, deck: { ...player.deck, cardIds: shuffled.result } },
      },
    };
    this.logger.push({
      actorPlayerId: playerId,
      type: 'EFFECT_RESOLVED',
      message: `${playerId} shuffled their deck after an effect.`,
      data: { zone: 'deck', count: shuffled.result.length },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  returnHandShuffleDraw(playerId: string, drawAmount?: number): number {
    const player = this.working.players[playerId];
    if (!player) return 0;
    const returnedIds = [...player.hand.cardIds];
    const returnedCount = returnedIds.length;
    const combined = [...player.deck.cardIds, ...returnedIds];
    const seededRng = createSeededRng(this.working.rng.seed);
    const shuffled = seededRng.shuffle(this.working.rng, combined);
    const cardsById = { ...this.working.cardsById };
    for (const id of shuffled.result) {
      const card = cardsById[id];
      if (card) cardsById[id] = { ...card, currentZone: 'deck', revealedTo: [] };
    }
    this.working = {
      ...this.working,
      rng: shuffled.nextState,
      players: {
        ...this.working.players,
        [playerId]: {
          ...player,
          hand: { ...player.hand, cardIds: [] },
          deck: { ...player.deck, cardIds: shuffled.result },
        },
      },
      cardsById,
    };
    this.logger.push({
      actorPlayerId: playerId,
      type: 'EFFECT_RESOLVED',
      message: `${playerId} returned ${returnedCount} card${returnedCount === 1 ? '' : 's'} from hand to deck and shuffled.`,
      data: { returnedCount, returnedInstanceIds: returnedIds },
      relatedCardInstanceIds: returnedIds,
      visibility: 'public',
    });
    const toDraw = drawAmount ?? returnedCount;
    if (toDraw > 0) this.draw(playerId, toDraw);
    return returnedCount;
  }

  moveToHand(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const fromZone = inst.currentZone;
    if (
      fromZone === 'lifeArea' &&
      inst.ownerId === this.controllerId &&
      isControllerLifeToHandPrevented(this.working, inst.ownerId)
    ) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${inst.ownerId} cannot add Life cards to hand using their own effects — move prevented.`,
        data: { instanceId, prevented: true },
        relatedCardInstanceIds: [instanceId],
        visibility: 'public',
      });
      return;
    }
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const newOwner = {
      ...owner,
      deck: removeFromZone(owner.deck, instanceId),
      trash: removeFromZone(owner.trash, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      lifeArea: removeFromZone(owner.lifeArea, instanceId),
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
    this.recordFieldRemoval(instanceId, fromZone, 'hand');
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
      deck: removeFromZone(owner.deck, instanceId),
      characterArea: removeFromZone(owner.characterArea, instanceId),
      stageArea: removeFromZone(owner.stageArea, instanceId),
      lifeArea: removeFromZone(owner.lifeArea, instanceId),
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
    if (EffectContextImpl.FIELD_ZONES.has(fromZone)) this.recordFieldRemoval(instanceId, fromZone, 'trash');
    if (fromZone === 'hand') {
      this.handTrashed.push({ ownerId: inst.ownerId, count: 1, effectSourceInstanceId: this.sourceInstanceId });
    }
  }

  rest(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    const isDon = inst.orientation === null; // DON!! track state via donRested, not orientation
    if (!isDon && cannotBeRestedByEffect(this.working, targetInstanceId, this.sourceInstanceId, this.defs)) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${targetInstanceId} could not be rested by this effect.`,
        data: { targetInstanceId, sourceInstanceId: this.sourceInstanceId },
        relatedCardInstanceIds: [targetInstanceId],
        visibility: 'public',
      });
      return;
    }
    if (isDon) {
      if (inst.donRested === true) return;
      this.working = { ...this.working, cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, donRested: true } } };
    } else {
      if (inst.orientation === 'rested') return;
      this.working = { ...this.working, cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, orientation: 'rested' } } };
      this.rested.push({ targetInstanceId, cause: 'effect', sourceInstanceId: this.sourceInstanceId });
    }
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${targetInstanceId} was rested by an effect (4-4-1).`,
      data: { targetInstanceId },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
  }

  /**
   * "This card will not become active in its controller's next Refresh Phase." Sets a one-shot flag
   * the Refresh Phase honours then clears (see runRefreshPhase.ts). Works for Leader/Character and
   * cost-area DON!! alike. No-op if the instance is unknown.
   */
  preventNextRefresh(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst || inst.skipNextRefresh === true) return;
    this.working = { ...this.working, cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, skipNextRefresh: true } } };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${targetInstanceId} will not become active in its controller's next Refresh Phase.`,
      data: { targetInstanceId },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
  }

  /**
   * Set a card as active — the inverse of rest() (2-4-3). Leaders/Characters use
   * `orientation`; DON!! cards use the `donRested` flag. No-op if already active
   * or the instance is unknown, mirroring rest()'s guard.
   */
  setActive(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    const isDon = inst.orientation === null;
    if (
      isDon &&
      isControllerCharacterSetActiveDonPrevented(this.working, this.controllerId, this.sourceInstanceId)
    ) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${this.controllerId} cannot set DON!! cards as active using Character effects — move prevented.`,
        data: { instanceId: targetInstanceId, prevented: true },
        relatedCardInstanceIds: [targetInstanceId, this.sourceInstanceId],
        visibility: 'public',
      });
      return;
    }
    if (isDon) {
      if (inst.donRested !== true) return;
      this.working = { ...this.working, cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, donRested: false } } };
    } else {
      if (inst.orientation === 'active') return;
      this.working = { ...this.working, cardsById: { ...this.working.cardsById, [targetInstanceId]: { ...inst, orientation: 'active' } } };
    }
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${targetInstanceId} was set as active by an effect (2-4-3).`,
      data: { targetInstanceId },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
  }

  scheduleDelayedEffect(effect: import('../state/game').DelayedEffectRecord): void {
    if (
      effect.kind === 'setActiveControllerDonAtEndOfTurn' &&
      isControllerCharacterSetActiveDonPrevented(this.working, effect.ownerId, effect.sourceInstanceId)
    ) {
      this.logger.push({
        actorPlayerId: this.controllerId,
        type: 'EFFECT_RESOLVED',
        message: `${effect.ownerId} cannot schedule DON!! set-active at end of turn — Character effect restriction is active.`,
        data: { delayedEffectKind: effect.kind, prevented: true },
        relatedCardInstanceIds: [effect.sourceInstanceId],
        visibility: 'public',
      });
      return;
    }
    this.working = {
      ...this.working,
      delayedEffects: [...(this.working.delayedEffects ?? []), effect],
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${effect.sourceInstanceId} scheduled a delayed effect.`,
      data: { delayedEffectId: effect.id, delayedEffectKind: effect.kind },
      relatedCardInstanceIds: [effect.sourceInstanceId],
      visibility: 'public',
    });
  }

  returnDonToDonDeck(donInstanceId: string): void {
    const inst = this.working.cardsById[donInstanceId];
    if (!inst || inst.currentZone !== 'costArea') return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    let cardsById = { ...this.working.cardsById };
    for (const [id, card] of Object.entries(cardsById)) {
      if (card.donAttached.includes(donInstanceId)) {
        cardsById = { ...cardsById, [id]: { ...card, donAttached: card.donAttached.filter((donId) => donId !== donInstanceId) } };
      }
    }
    cardsById[donInstanceId] = { ...inst, currentZone: 'donDeck', donRested: false };
    this.working = {
      ...this.working,
      cardsById,
      players: {
        ...this.working.players,
        [inst.ownerId]: {
          ...owner,
          costArea: removeFromZone(owner.costArea, donInstanceId),
          donDeck: addToZoneTop(owner.donDeck, donInstanceId),
        },
      },
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'DON_RETURNED',
      message: `${inst.ownerId} returned 1 DON!! to their DON!! deck by an effect.`,
      data: { donInstanceIds: [donInstanceId] },
      relatedCardInstanceIds: [donInstanceId],
      visibility: 'public',
    });
  }

  trashLife(playerId: string, n: number, position: 'top' | 'bottom' = 'top'): void {
    const player = this.working.players[playerId];
    if (!player || n <= 0) return;
    const lifeIds = player.lifeArea.cardIds;
    const moving = position === 'bottom' ? lifeIds.slice(-n) : lifeIds.slice(0, n);
    if (moving.length === 0) return;
    const remainingLife = position === 'bottom'
      ? lifeIds.slice(0, lifeIds.length - moving.length)
      : lifeIds.slice(moving.length);
    let trash = player.trash;
    const cardsById = { ...this.working.cardsById };
    for (const id of moving) {
      trash = addToZoneTop(trash, id);
      cardsById[id] = { ...cardsById[id], currentZone: 'trash', faceState: 'faceUp', revealedTo: 'all' };
    }
    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: { ...player, lifeArea: { ...player.lifeArea, cardIds: remainingLife }, trash } },
      cardsById,
    };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'CARD_MOVED',
      message: `Trashed the top ${moving.length} Life card(s) of ${playerId}.`,
      data: { from: 'lifeArea', to: 'trash', count: moving.length, playerId },
      relatedCardInstanceIds: moving,
      visibility: 'public',
    });
  }

  trashHandDownTo(handSize: number, playerId: string = this.controllerId): void {
    if (!this.working.players[playerId]) return;
    while (this.working.players[playerId].hand.cardIds.length > handSize) {
      const handIds = this.working.players[playerId].hand.cardIds;
      const toTrash = handIds[handIds.length - 1];
      if (!toTrash) break;
      this.trashCard(toTrash);
    }
  }

  trashFaceUpLife(): void {
    const player = this.working.players[this.controllerId];
    if (!player) return;
    const faceUpIds = player.lifeArea.cardIds.filter((id) => this.working.cardsById[id]?.faceState === 'faceUp');
    for (const id of faceUpIds) this.trashCard(id);
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
    if (remainingDeck.length === 0) {
      this.working = withDeckBecameZeroThisTurn(this.working, playerId);
    }
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

  searchResolve(playerId: string, lookedIds: string[], chosenIds: string[], remainder: SearchRemainderDestination, reveal: boolean, destination: SearchPickDestination, bottomOrderIds?: string[]): void {
    const player = this.working.players[playerId];
    if (!player || lookedIds.length === 0) return;

    // Only honor choices that were actually among the looked-at cards (defensive
    // against a forged resume selection), preserving looked order.
    const lookedSet = new Set(lookedIds);
    const chosenSet = new Set(chosenIds.filter((id) => lookedSet.has(id)));
    const chosen = lookedIds.filter((id) => chosenSet.has(id));
    const rest = lookedIds.filter((id) => !chosenSet.has(id));
    const restSet = new Set(rest);
    const orderedRest =
      remainder === 'bottom' && bottomOrderIds && bottomOrderIds.length === rest.length && bottomOrderIds.every((id) => restSet.has(id))
        ? bottomOrderIds
        : rest;

    // The looked cards are exactly the top N — drop them off the top, then the
    // unrevealed rest returns to the bottom (6-? deck ops; "in any order" is a
    // player nicety we resolve deterministically as looked order).
    let deck = { ...player.deck, cardIds: player.deck.cardIds.slice(lookedIds.length) };
    let hand = player.hand;
    let lifeArea = player.lifeArea;
    let trash = player.trash;
    const cardsById = { ...this.working.cardsById };

    for (const id of chosen) {
      if (destination === 'lifeTop') {
        lifeArea = addToZoneTop(lifeArea, id);
        cardsById[id] = { ...cardsById[id], currentZone: 'lifeArea', revealedTo: reveal ? 'all' : [playerId] };
      } else if (destination === 'trash') {
        trash = addToZoneTop(trash, id);
        cardsById[id] = { ...cardsById[id], currentZone: 'trash', revealedTo: 'all' };
      } else {
        hand = addToZoneBottom(hand, id);
        cardsById[id] = { ...cardsById[id], currentZone: 'hand', revealedTo: reveal ? 'all' : [playerId] };
      }
    }
    for (const id of orderedRest) {
      if (remainder === 'trash') {
        trash = addToZoneTop(trash, id);
        cardsById[id] = { ...cardsById[id], currentZone: 'trash', revealedTo: 'all' };
      } else {
        deck = addToZoneBottom(deck, id);
        cardsById[id] = { ...cardsById[id], currentZone: 'deck', revealedTo: [] };
      }
    }

    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: { ...player, hand, lifeArea, deck, trash } },
      cardsById,
    };
    const remainderText = remainder === 'trash' ? 'trashed' : 'returned to the bottom of the deck';
    const destinationText = destination === 'lifeTop' ? 'to the top of Life' : 'to hand';

    this.logger.push({
      actorPlayerId: playerId,
      type: 'EFFECT_RESOLVED',
      message: `Searched the top ${lookedIds.length}: ${reveal ? 'revealed and ' : ''}added ${chosen.length} ${destinationText}, ${remainderText} ${rest.length}.`,
      data: { lookedCount: lookedIds.length, addedCount: chosen.length, addedInstanceIds: reveal ? chosen : [], privateAddedInstanceIds: reveal ? [] : chosen, reveal, destination, remainder, remainderCount: orderedRest.length, remainderInstanceIds: orderedRest },
      relatedCardInstanceIds: chosen,
      visibility: reveal ? 'public' : { visibleTo: [playerId] },
    });
  }

  searchDeckResolve(playerId: string, chosenIds: string[], reveal: boolean): void {
    const player = this.working.players[playerId];
    if (!player) return;

    const deckSet = new Set(player.deck.cardIds);
    const chosen = chosenIds.filter((id) => deckSet.has(id));
    const chosenSet = new Set(chosen);
    const remainingDeckIds = player.deck.cardIds.filter((id) => !chosenSet.has(id));
    const seededRng = createSeededRng(this.working.rng.seed);
    const shuffled = seededRng.shuffle(this.working.rng, remainingDeckIds);

    let hand = player.hand;
    const cardsById = { ...this.working.cardsById };
    for (const id of chosen) {
      hand = addToZoneBottom(hand, id);
      cardsById[id] = { ...cardsById[id], currentZone: 'hand', revealedTo: reveal ? 'all' : [playerId] };
    }
    for (const id of shuffled.result) {
      const card = cardsById[id];
      if (card) cardsById[id] = { ...card, currentZone: 'deck', revealedTo: [] };
    }

    this.working = {
      ...this.working,
      rng: shuffled.nextState,
      players: {
        ...this.working.players,
        [playerId]: { ...player, hand, deck: { ...player.deck, cardIds: shuffled.result } },
      },
      cardsById,
    };
    this.logger.push({
      actorPlayerId: playerId,
      type: 'EFFECT_RESOLVED',
      message: `${playerId} searched their deck: ${reveal ? 'revealed and ' : ''}added ${chosen.length} card${chosen.length === 1 ? '' : 's'} to hand, then shuffled.`,
      data: { searchedZone: 'deck', addedCount: chosen.length, addedInstanceIds: reveal ? chosen : [], privateAddedInstanceIds: reveal ? [] : chosen, reveal, remainingDeckCount: shuffled.result.length },
      relatedCardInstanceIds: chosen,
      visibility: reveal ? 'public' : { visibleTo: [playerId] },
    });
  }

  searchPlayResolve(playerId: string, lookedIds: string[], chosenIds: string[], remainder: SearchRemainderDestination, rested = false, bottomOrderIds?: string[]): void {
    const player = this.working.players[playerId];
    if (!player || lookedIds.length === 0) return;

    const lookedSet = new Set(lookedIds);
    const chosenSet = new Set(chosenIds.filter((id) => lookedSet.has(id)));
    const chosen = lookedIds.filter((id) => chosenSet.has(id));
    const rest = lookedIds.filter((id) => !chosenSet.has(id));
    const restSet = new Set(rest);
    const orderedRest =
      remainder === 'bottom' && bottomOrderIds && bottomOrderIds.length === rest.length && bottomOrderIds.every((id) => restSet.has(id))
        ? bottomOrderIds
        : rest;

    let deck = { ...player.deck, cardIds: player.deck.cardIds.slice(lookedIds.length) };
    let characterArea = player.characterArea;
    let trash = player.trash;
    let nextState = this.working;
    let cardsById = { ...nextState.cardsById };
    const playedIds: string[] = [];

    for (const oldId of chosen) {
      const deckInst = cardsById[oldId];
      const def = this.defs[deckInst?.cardDefinitionId ?? ''];
      if (!deckInst || !def || def.category !== 'character') continue;
      const minted = mintRuntimeInstanceId({ ...nextState, cardsById });
      nextState = minted.state;
      cardsById = { ...minted.state.cardsById };
      const newId = minted.id;
      cardsById[newId] = {
        instanceId: newId,
        cardDefinitionId: deckInst.cardDefinitionId,
        ownerId: deckInst.ownerId,
        controllerId: deckInst.controllerId,
        currentZone: 'characterArea',
        orientation: rested ? 'rested' : 'active',
        faceState: 'faceUp',
        donAttached: [],
        currentPower: def.basePower ?? 0,
        appliedContinuousEffectIds: [],
        oncePerTurnUsed: [],
        summoningSick: !def.hasRush,
        revealedTo: 'all',
        enteredPlayTurn: nextState.turnNumber,
      };
      delete cardsById[oldId];
      characterArea = addToZoneBottom(characterArea, newId);
      playedIds.push(newId);
    }

    for (const id of orderedRest) {
      if (remainder === 'trash') {
        trash = addToZoneTop(trash, id);
        cardsById[id] = { ...cardsById[id], currentZone: 'trash', revealedTo: 'all' };
      } else {
        deck = addToZoneBottom(deck, id);
        cardsById[id] = { ...cardsById[id], currentZone: 'deck', revealedTo: [] };
      }
    }

    this.working = {
      ...nextState,
      players: { ...nextState.players, [playerId]: { ...player, deck, characterArea, trash } },
      cardsById,
    };

    this.logger.push({
      actorPlayerId: playerId,
      type: 'CARD_PLAYED',
      message: `${playerId} searched the top ${lookedIds.length} and played ${playedIds.length} Character card${playedIds.length === 1 ? '' : 's'} (${rested ? 'rested' : 'active'}).`,
      data: { lookedCount: lookedIds.length, playedCount: playedIds.length, playedInstanceIds: playedIds, remainder, remainderCount: orderedRest.length, remainderInstanceIds: orderedRest, rested },
      relatedCardInstanceIds: playedIds,
      visibility: 'public',
    });

    const limit = characterArea.maxSize ?? Infinity;
    if (characterArea.cardIds.length > limit) {
      this.emitChoice({
        id: `${playerId}__character-overflow-${playedIds[playedIds.length - 1] ?? 'search-play'}`,
        playerId,
        kind: 'SELECT_CARDS',
        prompt: `Choose 1 Character to trash - more than ${limit} in your Character Area (3-7-6-1).`,
        constraints: { min: 1, max: 1, zoneId: 'characterArea', filterDescription: 'Any Character currently in your Character Area.' },
        sourceInstanceId: null,
        sourceEffectId: 'rule:characterAreaOverflow',
      });
    }
    for (const id of playedIds) this.recordPlayedCharacter(id);
  }

  searchResolveTopOrBottom(playerId: string, lookedIds: string[], topOrderIds: string[], bottomOrderIds: string[]): void {
    const player = this.working.players[playerId];
    if (!player || lookedIds.length === 0) return;

    const lookedSet = new Set(lookedIds);
    const top = topOrderIds.filter((id) => lookedSet.has(id));
    const topSet = new Set(top);
    const remaining = lookedIds.filter((id) => !topSet.has(id));
    const remainingSet = new Set(remaining);
    const bottom =
      bottomOrderIds.length === remaining.length && bottomOrderIds.every((id) => remainingSet.has(id))
        ? bottomOrderIds
        : remaining;

    const deck = {
      ...player.deck,
      cardIds: [...top, ...player.deck.cardIds.slice(lookedIds.length), ...bottom],
    };
    const cardsById = { ...this.working.cardsById };
    for (const id of lookedIds) {
      cardsById[id] = { ...cardsById[id], currentZone: 'deck', revealedTo: [] };
    }

    this.working = {
      ...this.working,
      players: { ...this.working.players, [playerId]: { ...player, deck } },
      cardsById,
    };
    this.logger.push({
      actorPlayerId: playerId,
      type: 'EFFECT_RESOLVED',
      message: `${playerId} reordered the top ${lookedIds.length} card(s) of their deck.`,
      data: { lookedCount: lookedIds.length, topOrderIds: top, bottomOrderIds: bottom },
      relatedCardInstanceIds: lookedIds,
      visibility: { visibleTo: [playerId] },
    });
  }

  searchResolveHandWithTopOrBottomRemainder(
    playerId: string,
    lookedIds: string[],
    handIds: string[],
    topOrderIds: string[],
    bottomOrderIds: string[],
    reveal: boolean,
  ): void {
    const player = this.working.players[playerId];
    if (!player || lookedIds.length === 0) return;

    const lookedSet = new Set(lookedIds);
    const handChosen = handIds.filter((id) => lookedSet.has(id));
    const handSet = new Set(handChosen);
    const rest = lookedIds.filter((id) => !handSet.has(id));
    const restSet = new Set(rest);
    const top = topOrderIds.filter((id) => restSet.has(id));
    const topSet = new Set(top);
    const remaining = rest.filter((id) => !topSet.has(id));
    const remainingSet = new Set(remaining);
    const bottom =
      bottomOrderIds.length === remaining.length && bottomOrderIds.every((id) => remainingSet.has(id))
        ? bottomOrderIds
        : remaining;

    let deck = { ...player.deck, cardIds: player.deck.cardIds.slice(lookedIds.length) };
    let hand = player.hand;
    const cardsById = { ...this.working.cardsById };

    for (const id of handChosen) {
      hand = addToZoneBottom(hand, id);
      cardsById[id] = { ...cardsById[id], currentZone: 'hand', revealedTo: reveal ? 'all' : [playerId] };
    }
    deck = { ...deck, cardIds: [...top, ...deck.cardIds, ...bottom] };
    for (const id of rest) {
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
      message: `Searched the top ${lookedIds.length}: ${reveal ? 'revealed and ' : ''}added ${handChosen.length} to hand, reordered ${rest.length} to top/bottom.`,
      data: { lookedCount: lookedIds.length, addedCount: handChosen.length, topOrderIds: top, bottomOrderIds: bottom, reveal },
      relatedCardInstanceIds: handChosen,
      visibility: reveal ? 'public' : { visibleTo: [playerId] },
    });
  }

  searchPlayResolveWithTopOrBottomRemainder(
    playerId: string,
    lookedIds: string[],
    playIds: string[],
    topOrderIds: string[],
    bottomOrderIds: string[],
    rested = false,
  ): void {
    const player = this.working.players[playerId];
    if (!player || lookedIds.length === 0) return;

    const lookedSet = new Set(lookedIds);
    const chosen = playIds.filter((id) => lookedSet.has(id));
    const chosenSet = new Set(chosen);
    const rest = lookedIds.filter((id) => !chosenSet.has(id));
    const restSet = new Set(rest);
    const top = topOrderIds.filter((id) => restSet.has(id));
    const topSet = new Set(top);
    const remaining = rest.filter((id) => !topSet.has(id));
    const remainingSet = new Set(remaining);
    const bottom =
      bottomOrderIds.length === remaining.length && bottomOrderIds.every((id) => remainingSet.has(id))
        ? bottomOrderIds
        : remaining;

    let deck = { ...player.deck, cardIds: player.deck.cardIds.slice(lookedIds.length) };
    let characterArea = player.characterArea;
    let nextState = this.working;
    let cardsById = { ...nextState.cardsById };
    const playedIds: string[] = [];

    for (const oldId of chosen) {
      const deckInst = cardsById[oldId];
      const def = this.defs[deckInst?.cardDefinitionId ?? ''];
      if (!deckInst || !def || def.category !== 'character') continue;
      const minted = mintRuntimeInstanceId({ ...nextState, cardsById });
      nextState = minted.state;
      cardsById = { ...minted.state.cardsById };
      const newId = minted.id;
      cardsById[newId] = {
        instanceId: newId,
        cardDefinitionId: deckInst.cardDefinitionId,
        ownerId: deckInst.ownerId,
        controllerId: deckInst.controllerId,
        currentZone: 'characterArea',
        orientation: rested ? 'rested' : 'active',
        faceState: 'faceUp',
        donAttached: [],
        currentPower: def.basePower ?? 0,
        appliedContinuousEffectIds: [],
        oncePerTurnUsed: [],
        summoningSick: !def.hasRush,
        revealedTo: 'all',
        enteredPlayTurn: nextState.turnNumber,
      };
      delete cardsById[oldId];
      characterArea = addToZoneBottom(characterArea, newId);
      playedIds.push(newId);
    }

    deck = { ...deck, cardIds: [...top, ...deck.cardIds, ...bottom] };
    for (const id of rest) {
      cardsById[id] = { ...cardsById[id], currentZone: 'deck', revealedTo: [] };
    }

    this.working = {
      ...nextState,
      players: { ...nextState.players, [playerId]: { ...player, deck, characterArea } },
      cardsById,
    };

    this.logger.push({
      actorPlayerId: playerId,
      type: 'CARD_PLAYED',
      message: `${playerId} searched the top ${lookedIds.length} and played ${playedIds.length} Character card${playedIds.length === 1 ? '' : 's'} (${rested ? 'rested' : 'active'}), reordered ${rest.length} to top/bottom.`,
      data: { lookedCount: lookedIds.length, playedCount: playedIds.length, playedInstanceIds: playedIds, topOrderIds: top, bottomOrderIds: bottom, rested },
      relatedCardInstanceIds: playedIds,
      visibility: 'public',
    });

    const limit = characterArea.maxSize ?? Infinity;
    if (characterArea.cardIds.length > limit) {
      this.emitChoice({
        id: `${playerId}__character-overflow-${playedIds[playedIds.length - 1] ?? 'search-play'}`,
        playerId,
        kind: 'SELECT_CARDS',
        prompt: `Choose 1 Character to trash - more than ${limit} in your Character Area (3-7-6-1).`,
        constraints: { min: 1, max: 1, zoneId: 'characterArea', filterDescription: 'Any Character currently in your Character Area.' },
        sourceInstanceId: null,
        sourceEffectId: 'rule:characterAreaOverflow',
      });
    }
    for (const id of playedIds) this.recordPlayedCharacter(id);
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
    const sourceEffectData = effectLogDataForSource(this.working, this.defs, this.sourceInstanceId);
    const decoratedLog = this.logger.log.map((entry) => {
      if (entry.type !== 'EFFECT_ACTIVATED' && entry.type !== 'EFFECT_RESOLVED' && entry.type !== 'CHOICE_REQUESTED') {
        return entry;
      }
      return { ...entry, data: { ...sourceEffectData, ...entry.data } };
    });
    const state: GameState = {
      ...this.working,
      log: [...this.working.log, ...decoratedLog],
      pendingChoices: [...this.working.pendingChoices, ...this.pending],
    };
    return { state, log: [...this.externalLog, ...decoratedLog], pendingChoices: this.pending };
  }
}
