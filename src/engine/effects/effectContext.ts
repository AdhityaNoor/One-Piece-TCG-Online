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
import { cannotBeRestedByEffect, computeCurrentCost, computeCurrentPower, isKoImmune } from '../rules/shared/power';
import { koReplacementDescription } from '../rules/shared/koAttempt';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { createSeededRng } from '../rng/seededRng';
import type { EffectContext } from './effectTemplate';
import type { SearchPickDestination, SearchRemainderDestination } from './effectIr';

export class EffectContextImpl implements EffectContext {
  readonly sourceInstanceId: string;
  readonly controllerId: string;
  readonly opponentId: string;

  private working: GameState;
  private readonly defs: CardDefinitionLookup;
  private readonly logger: ActionLogger;
  private readonly externalLog: GameLogEntry[] = [];
  private readonly pending: PendingChoice[] = [];
  /** Instance ids this resolution rested via rest(); drained by the interpreter to cascade [When Becomes Rested] (onRested). */
  private readonly rested: string[] = [];
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
  controllerOrOpponentLifeTopIds(): string[] {
    const controllerTop = this.working.players[this.controllerId].lifeArea.cardIds[0];
    const opponentTop = this.working.players[this.opponentId].lifeArea.cardIds[0];
    return [controllerTop, opponentTop].filter((id): id is string => id !== undefined);
  }
  controllerDeckTopIds(): string[] {
    const top = this.working.players[this.controllerId].deck.cardIds[0];
    return top ? [top] : [];
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
    effectSourceController?: 'opponent' | 'controller';
    effectSourceMaxBasePower?: number;
    effectSourceCategory?: 'leader' | 'character';
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
        ...(spec.condition ? { condition: spec.condition } : {}),
        ...(spec.effectSourceController ? { effectSourceController: spec.effectSourceController } : {}),
        ...(spec.effectSourceMaxBasePower !== undefined ? { effectSourceMaxBasePower: spec.effectSourceMaxBasePower } : {}),
        ...(spec.effectSourceCategory ? { effectSourceCategory: spec.effectSourceCategory } : {}),
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

  preventBlockers(spec: {
    appliesToAttackerInstanceId: string;
    duration: ContinuousEffectDuration;
    blockerPowerAtLeast?: number;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description:
        spec.description ??
        (spec.blockerPowerAtLeast === undefined
          ? 'opponent cannot activate Blocker'
          : `opponent cannot activate Blocker with ${spec.blockerPowerAtLeast} or more power`),
      blockerRestriction: {
        appliesToAttackerInstanceId: spec.appliesToAttackerInstanceId,
        ...(spec.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: spec.blockerPowerAtLeast } : {}),
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${record.description} while ${spec.appliesToAttackerInstanceId} attacks.`,
      data: { continuousEffectId: record.id, duration: spec.duration, blockerPowerAtLeast: spec.blockerPowerAtLeast },
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
    whileSummoningSick?: boolean;
    description?: string;
  }): void {
    const record: ContinuousEffectRecord = {
      id: `ce-${this.sourceInstanceId}-${this.working.continuousEffects.length}`,
      sourceInstanceId: this.sourceInstanceId,
      ownerId: this.controllerId,
      duration: spec.duration,
      description:
        spec.description ??
        (spec.forbiddenTarget === 'leader'
          ? 'cannot attack the opponent\'s Leader'
          : 'cannot attack'),
      attackRestriction: {
        appliesToInstanceId: spec.appliesToInstanceId,
        ...(spec.forbiddenTarget ? { forbiddenTarget: spec.forbiddenTarget } : {}),
        ...(spec.whileSummoningSick ? { whileSummoningSick: true } : {}),
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

  preventRest(spec: {
    appliesToInstanceId: string;
    duration: ContinuousEffectDuration;
    effectSourceController?: 'opponent' | 'controller';
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
      },
    };
    this.working = { ...this.working, continuousEffects: [...this.working.continuousEffects, record] };
    this.logger.push({
      actorPlayerId: this.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${spec.appliesToControllerId}'s effects negated (${record.description}).`,
      data: { continuousEffectId: record.id, duration: spec.duration, negatedTimings: spec.negatedTimings },
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
  }

  koApply(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
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
    this.koed.push(targetInstanceId);
  }

  ko(targetInstanceId: string): void {
    this.koApply(targetInstanceId);
  }

  /** Drain and return the ids rested via rest() this resolution (for onRested cascade). */
  takeRested(): string[] {
    const drained = [...this.rested];
    this.rested.length = 0;
    return drained;
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

  moveToBottomDeck(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const fromZone = inst.currentZone;
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

  private playStageFromHand(handInstanceId: string): void {
    const handInst = this.working.cardsById[handInstanceId];
    if (!handInst || handInst.currentZone !== 'hand') return;
    const def = this.defs[handInst.cardDefinitionId];
    if (!def || def.category !== 'stage') return;
    const controllerId = handInst.controllerId;
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
  }

  playCharacterFromTrash(trashInstanceId: string, rested = false): void {
    const trashInst = this.working.cardsById[trashInstanceId];
    if (!trashInst || trashInst.currentZone !== 'trash') return;
    const def = this.defs[trashInst.cardDefinitionId];
    if (!def || def.category !== 'character') return; // only Characters can be played to the field
    const controllerId = trashInst.controllerId;
    const player = this.working.players[controllerId];
    if (!player) return;

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

  playCharacterFromDeck(deckInstanceId: string, rested = false): void {
    const deckInst = this.working.cardsById[deckInstanceId];
    if (!deckInst || deckInst.currentZone !== 'deck') return;
    const def = this.defs[deckInst.cardDefinitionId];
    if (!def || def.category !== 'character') return;
    const controllerId = deckInst.controllerId;
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

  moveToHand(instanceId: string): void {
    const inst = this.working.cardsById[instanceId];
    if (!inst) return;
    const owner = this.working.players[inst.ownerId];
    if (!owner) return;
    const fromZone = inst.currentZone;
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
  }

  rest(targetInstanceId: string): void {
    const inst = this.working.cardsById[targetInstanceId];
    if (!inst) return;
    const isDon = inst.orientation === null; // DON!! track state via donRested, not orientation
    if (!isDon && cannotBeRestedByEffect(this.working, targetInstanceId, this.sourceInstanceId)) {
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
      this.rested.push(targetInstanceId);
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
    const isDon = inst.orientation === null; // DON!! carry orientation:null and track state via donRested
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

  trashLife(playerId: string, n: number): void {
    const player = this.working.players[playerId];
    if (!player || n <= 0) return;
    const moving = player.lifeArea.cardIds.slice(0, n); // top Life card(s); Life is face-down, so "up to N" is taken as the top N
    if (moving.length === 0) return;
    const remainingLife = player.lifeArea.cardIds.slice(moving.length);
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
    return { state, log: [...this.externalLog, ...this.logger.log], pendingChoices: this.pending };
  }
}
