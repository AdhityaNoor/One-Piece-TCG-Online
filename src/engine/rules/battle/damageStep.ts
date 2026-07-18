/**
 * Damage Step + End of Battle (7-1-4, 7-1-5). Fully automatic — triggered
 * synchronously by passStep.ts when the defending player passes out of the
 * Counter Step. Never blocks on player input (the stubbed [Trigger]
 * limitation below is exactly why).
 *
 * 7-1-4: attacker power >= (current) target power required to succeed.
 * Only the DEFENDER can ever be affected by a single Battle — Character
 * battles never deal damage back to the attacker (one-directional combat).
 *
 * 7-1-4-1-1-3: [Double Attack] deals 2 Life-card hits instead of 1 when the
 * target is a Leader.
 *
 * 9-2-1 / 1-2-1-1: a player who would take damage with an already-empty
 * Life area loses immediately ("decked out on Life", distinct from the
 * Draw Phase's main-deck deck-out in runDrawPhase.ts). Checked once per
 * Life-card hit, in order, so a lethal 2nd hit from [Double Attack] is
 * still detected even if the 1st hit exactly empties the Life area.
 *
 * KNOWN LIMITATION ([Trigger], 10-1-5-2, project decision: "stub
 * everything"): every Life card revealed by damage is unconditionally
 * added to hand. The real rule offers a choice — activate the [Trigger]
 * effect (then trash the card) or add it to hand — but there is no
 * effect-template system to actually run a [Trigger] effect yet, so the
 * "activate?" choice is skipped entirely and the safe always-available
 * baseline (add to hand) is taken every time. hasTrigger is still surfaced
 * in the log for visibility.
 *
 * KO'd Characters keep their existing instanceId moving to trash (see
 * handlers/playStage.ts doc comment for why re-minting isn't needed for a
 * card leaving for good). Attached DON!! needs no special handling either
 * — see handlers/resolvePendingChoice.ts doc comment.
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import type { PendingChoice } from '../../events/pendingChoice';
import { createActionLogger } from '../shared/actionLogger';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../shared/definitions';
import { computeCurrentPower, findKoImmunityRecord, hasContinuousKeyword, withKoImmunityConsumed } from '../shared/power';
import { resolveLifeLeaveDestination } from '../shared/lifeLeaveDestination';
import { getOpponentId } from '../shared/players';
import { buildKoReplacementConfirmChoice, findKoReplacementRecord } from '../shared/koAttempt';
import { fireOnKO, fireOnBattle, fireOnBattleKoedOpponent, fireLifeDamageDealtReactions, fireLifeRemovedReactions, fireLifeToHandReactions, type EffectTemplateRegistry } from '../../effects';
import { consumeEndOfBattleDelayedEffects } from '../phases/delayedEffects';
import type { KoReplacementResumeState } from '../../events/pendingChoice';
import { effectLogDataForSource } from '../../logs/effectLogData';

export interface DamageStepResult {
  state: GameState;
  log: GameLogEntry[];
  /** Any choice an [On K.O.] effect raised (resolved after the battle, via the dispatch gate). */
  pendingChoices: PendingChoice[];
}

export function resolveDamageAndEndOfBattle(
  state: GameState,
  defs: CardDefinitionLookup,
  causedByActionId: string | null,
  registry: EffectTemplateRegistry = {},
): DamageStepResult {
  const battle = state.currentBattle;
  if (!battle) {
    throw new Error('resolveDamageAndEndOfBattle requires an in-progress Battle.');
  }
  const logger = createActionLogger(state, causedByActionId);

  const attackerId = battle.attackerInstanceId;
  const targetId = battle.targetInstanceId;
  const attackerPlayerId = state.activePlayerId;
  const defendingPlayerId = getOpponentId(state, attackerPlayerId);

  // "battles an opponent Character" (for [On Battle], 8-1-3): true when the final
  // target is a Character, regardless of the battle's outcome. Captured before any
  // KO mutation moves the target to the trash.
  const targetWasCharacter = state.cardsById[targetId]?.currentZone === 'characterArea';

  let nextState: GameState = state;
  // [On Battle] (8-1-3) must fire before the power comparison so modifiers
  // granted by that timing affect this Damage Step.
  let onBattleLog: GameLogEntry[] = [];
  let onBattlePending: PendingChoice[] = [];
  if (targetWasCharacter && !nextState.gameOver) {
    const attackerInst = nextState.cardsById[attackerId];
    if (attackerInst) {
      nextState = {
        ...nextState,
        cardsById: {
          ...nextState.cardsById,
          [attackerId]: { ...attackerInst, battledOpponentCharacterTurn: nextState.turnNumber },
        },
      };
    }
    const obA = fireOnBattle(nextState, attackerId, registry, defs, causedByActionId);
    nextState = obA.state;
    onBattleLog = [...onBattleLog, ...obA.log];
    onBattlePending = [...onBattlePending, ...obA.pendingChoices];

    if (nextState.cardsById[targetId]?.currentZone === 'characterArea') {
      const obD = fireOnBattle(nextState, targetId, registry, defs, causedByActionId);
      nextState = obD.state;
      onBattleLog = [...onBattleLog, ...obD.log];
      onBattlePending = [...onBattlePending, ...obD.pendingChoices];
    }
  }

  const attackerPower = computeCurrentPower(defs, nextState, attackerId);
  const targetPower = computeCurrentPower(defs, nextState, targetId);
  const attackerDef = getDefinition(defs, nextState.cardsById[attackerId]);

  logger.push({
    actorPlayerId: attackerPlayerId,
    type: 'DAMAGE_DEALT',
    message: `Damage Step: ${attackerPower} (attacker) vs ${targetPower} (defender) (7-1-4).`,
    data: { attackerInstanceId: attackerId, targetInstanceId: targetId, attackerPower, targetPower },
    relatedCardInstanceIds: [attackerId, targetId],
    visibility: 'public',
  });

  // [On K.O.] effects can append their own log/choices once the Character is
  // trashed; collected here and merged into the final result.
  let koLog: GameLogEntry[] = [];
  let koPending: PendingChoice[] = [];
  // [Trigger] (10-1-5-2): revealed Life cards with a curated trigger raise an
  // "activate?" choice, resolved after the battle (see resolvePendingChoice.ts).
  const triggerPending: PendingChoice[] = [];

  if (attackerPower >= targetPower) {
    const target = nextState.cardsById[targetId];

    if (target.currentZone === 'leaderArea') {
      const hasCuratedDoubleAttackGrant = registry[attackerDef.cardDefinitionId]?.abilities.some((ability) =>
        ability.ops.some((op) => op.op === 'addKeyword' && op.keyword === 'doubleAttack'),
      );
      const hasDoubleAttack = (!hasCuratedDoubleAttackGrant && attackerDef.hasDoubleAttack) || hasContinuousKeyword(defs, nextState, attackerId, 'doubleAttack');
      const hitCount = hasDoubleAttack ? 2 : 1;
      let player = nextState.players[defendingPlayerId];
      let cardsById = { ...nextState.cardsById };
      let lethal = false;

      for (let hit = 0; hit < hitCount && !lethal; hit += 1) {
        if (player.lifeArea.cardIds.length === 0) {
          lethal = true;
          logger.push({
            actorPlayerId: defendingPlayerId,
            type: 'GAME_OVER',
            message: `${defendingPlayerId} took damage with no Life remaining and loses (9-2-1).`,
            data: { reason: 'lifeDamageAtZero', loserId: defendingPlayerId, winnerId: attackerPlayerId },
            relatedCardInstanceIds: [],
            visibility: 'public',
          });
          nextState = { ...nextState, players: { ...nextState.players, [defendingPlayerId]: player }, cardsById, gameOver: { winnerId: attackerPlayerId, reason: 'lifeDamageAtZero' } };
          break;
        }

        const [lifeCardId, ...restLife] = player.lifeArea.cardIds;
        const lifeDef = defs[cardsById[lifeCardId].cardDefinitionId];
        const banished = !!attackerDef.hasBanish || hasContinuousKeyword(defs, nextState, attackerId, 'banish');
        // Resolve before flipping face-up: ST13-003 only redirects cards that were already face-up.
        const leaveTo = resolveLifeLeaveDestination(nextState, defendingPlayerId, lifeCardId, { banished });
        cardsById = {
          ...cardsById,
          [lifeCardId]: {
            ...cardsById[lifeCardId],
            currentZone: leaveTo === 'trash' ? 'trash' : leaveTo === 'deckBottom' ? 'deck' : 'hand',
            faceState: 'faceUp',
            revealedTo: leaveTo === 'hand' ? cardsById[lifeCardId].revealedTo : 'all',
          },
        };
        player = {
          ...player,
          lifeArea: { ...player.lifeArea, cardIds: restLife },
          ...(leaveTo === 'trash'
            ? { trash: addToZoneTop(player.trash, lifeCardId) }
            : leaveTo === 'deckBottom'
              ? { deck: addToZoneBottom(player.deck, lifeCardId) }
              : { hand: addToZoneTop(player.hand, lifeCardId) }),
        };

        if (leaveTo === 'trash') {
          logger.push({
            actorPlayerId: defendingPlayerId,
            type: 'DAMAGE_DEALT',
            message: `${defendingPlayerId}'s damaged Life card was trashed by [Banish]; its [Trigger] cannot activate.`,
            data: { lifeCardInstanceId: lifeCardId, banish: true, triggerSuppressed: !!lifeDef?.hasTrigger },
            relatedCardInstanceIds: [lifeCardId],
            visibility: 'public',
          });
        } else if (leaveTo === 'deckBottom') {
          logger.push({
            actorPlayerId: defendingPlayerId,
            type: 'DAMAGE_DEALT',
            message: `${defendingPlayerId}'s face-up Life card was placed at the bottom of their deck instead of hand; its [Trigger] cannot activate.`,
            data: { lifeCardInstanceId: lifeCardId, faceUpLifeToDeckBottom: true, triggerSuppressed: !!lifeDef?.hasTrigger },
            relatedCardInstanceIds: [lifeCardId],
            visibility: 'public',
          });
        } else if (lifeDef?.hasTrigger) {
          const hasCuratedTrigger = !!registry[lifeCardId ? cardsById[lifeCardId].cardDefinitionId : '']?.abilities.some((ab) => ab.timing === 'lifeTrigger');
          if (hasCuratedTrigger) {
            // Offer to activate it (10-1-5-2). The card is in hand for now; a
            // "yes" moves it to the trash and resolves the trigger.
            triggerPending.push({
              id: `${defendingPlayerId}__life-trigger-${lifeCardId}`,
              playerId: defendingPlayerId,
              kind: 'YES_NO',
              prompt: `A revealed Life card has a [Trigger] — activate it? (It will be trashed instead of kept in hand.)`,
              constraints: { min: 0, max: 1 },
              sourceInstanceId: lifeCardId,
              sourceEffectId: 'rule:lifeTrigger',
            });
            logger.push({
              actorPlayerId: defendingPlayerId,
              type: 'TRIGGER_REVEALED',
              message: `${defendingPlayerId}'s revealed Life card has a [Trigger] — activation offered (10-1-5-2).`,
              data: { ...effectLogDataForSource(nextState, defs, lifeCardId), lifeCardInstanceId: lifeCardId },
              relatedCardInstanceIds: [lifeCardId],
              visibility: { visibleTo: [defendingPlayerId] },
            });
          } else {
            logger.push({
              actorPlayerId: defendingPlayerId,
              type: 'TRIGGER_REVEALED',
              message: `${defendingPlayerId}'s revealed Life card has [Trigger] — not yet implemented; added to hand.`,
              data: { ...effectLogDataForSource(nextState, defs, lifeCardId), lifeCardInstanceId: lifeCardId, effectStubbed: true },
              relatedCardInstanceIds: [lifeCardId],
              visibility: { visibleTo: [defendingPlayerId] },
            });
          }
        }
        const leaveLabel =
          leaveTo === 'trash' ? 'trashed by [Banish]'
            : leaveTo === 'deckBottom' ? 'placed at the bottom of their deck'
              : 'added to hand';
        logger.push({
          actorPlayerId: defendingPlayerId,
          type: 'DAMAGE_DEALT',
          message: `${defendingPlayerId} took 1 Life damage (hit ${hit + 1}/${hitCount}) — Life card ${leaveLabel} (7-1-4-1).`,
          data: {
            hit: hit + 1,
            of: hitCount,
            banish: leaveTo === 'trash' || undefined,
            faceUpLifeToDeckBottom: leaveTo === 'deckBottom' || undefined,
          },
          relatedCardInstanceIds: [lifeCardId],
          visibility: leaveTo === 'hand' ? { visibleTo: [defendingPlayerId] } : 'public',
        });

        // Commit this hit before reactions so Life→hand / deck→Life mutations are not wiped.
        nextState = { ...nextState, players: { ...nextState.players, [defendingPlayerId]: player }, cardsById };

        if (leaveTo === 'hand' && !lethal) {
          const lifeToHand = fireLifeToHandReactions(
            nextState,
            defendingPlayerId,
            registry,
            defs,
            causedByActionId,
          );
          nextState = lifeToHand.state;
          player = nextState.players[defendingPlayerId];
          cardsById = { ...nextState.cardsById };
          onBattleLog = [...onBattleLog, ...lifeToHand.log];
          onBattlePending = [...onBattlePending, ...lifeToHand.pendingChoices];
          if (lifeToHand.pendingChoices.length > 0) break;
        }

        const lifeDamage = fireLifeDamageDealtReactions(
          nextState,
          attackerPlayerId,
          registry,
          defs,
          causedByActionId,
        );
        nextState = lifeDamage.state;
        player = nextState.players[defendingPlayerId];
        cardsById = { ...nextState.cardsById };
        onBattleLog = [...onBattleLog, ...lifeDamage.log];
        onBattlePending = [...onBattlePending, ...lifeDamage.pendingChoices];
        if (lifeDamage.pendingChoices.length > 0) break;

        const lifeRemoved = fireLifeRemovedReactions(nextState, registry, defs, causedByActionId);
        nextState = lifeRemoved.state;
        player = nextState.players[defendingPlayerId];
        cardsById = { ...nextState.cardsById };
        onBattleLog = [...onBattleLog, ...lifeRemoved.log];
        onBattlePending = [...onBattlePending, ...lifeRemoved.pendingChoices];
        if (lifeRemoved.pendingChoices.length > 0) break;
      }
    } else {
      const battleImmunity = findKoImmunityRecord(defs, nextState, targetId, 'battle');
      if (battleImmunity) {
        // Character target that "cannot be K.O.'d in battle" (e.g. ST05-008 Shiki):
        // the attack connects but the Character survives (7-1-4-2 K.O. is prevented).
        nextState = withKoImmunityConsumed(nextState, battleImmunity);
        logger.push({
          actorPlayerId: attackerPlayerId,
          type: 'DAMAGE_DEALT',
          message: `'${targetId}' cannot be K.O.'d in battle — it survives (7-1-4-2 prevented).`,
          data: { targetInstanceId: targetId, koPrevented: true },
          relatedCardInstanceIds: [targetId],
          visibility: 'public',
        });
      } else {
        const replacementRecord = findKoReplacementRecord(nextState, targetId, 'battle', defs);
        if (replacementRecord) {
          const replaceChoice = buildKoReplacementConfirmChoice(nextState, targetId, replacementRecord, `${targetId}__battle-ko-replace`, {
            abilityIndex: 0,
            opIndex: 0,
            bindings: {},
            koReplacement: {
              phase: 'confirm',
              targetInstanceId: targetId,
              recordId: replacementRecord.id,
              cause: 'battle',
              actorPlayerId: attackerPlayerId,
              battle: {
                causedByActionId,
                attackerId,
                attackerPlayerId,
                defendingPlayerId,
                priorLogCount: state.log.length,
                onBattleLogLen: onBattleLog.length,
                triggerPending: [...triggerPending],
                onBattlePending: [...onBattlePending],
              },
            },
          });
          return {
            state: { ...nextState, pendingChoices: [...nextState.pendingChoices, replaceChoice], log: [...state.log, ...logger.log, ...onBattleLog] },
            log: [...logger.log, ...onBattleLog],
            pendingChoices: [replaceChoice, ...onBattlePending, ...triggerPending],
          };
        }
        // Character target: KO'd (7-1-4-2). Attacker is never affected.
        const owner = nextState.players[target.ownerId];
        const cardsById = { ...nextState.cardsById, [targetId]: { ...target, currentZone: 'trash' as const, donAttached: [] } };
        const newCharacterArea = removeFromZone(owner.characterArea, targetId);
        const newTrash = addToZoneTop(owner.trash, targetId);
        const newOwner = { ...owner, characterArea: newCharacterArea, trash: newTrash };

        logger.push({
          actorPlayerId: attackerPlayerId,
          type: 'CHARACTER_KO',
          message: `'${targetId}' was K.O.'d and trashed (7-1-4-2).`,
          data: { instanceId: targetId },
          relatedCardInstanceIds: [targetId],
          visibility: 'public',
        });

        nextState = { ...nextState, cardsById, players: { ...nextState.players, [target.ownerId]: newOwner } };

        // [On K.O.] (10-2-17) fires now that the Character is in the trash.
        // No-op without a curated onKO ability; collect its log/choices.
        const koFired = fireOnKO(nextState, targetId, registry, defs, causedByActionId, { cause: 'battle', sourceInstanceId: attackerId });
        nextState = koFired.state;
        koLog = [...koLog, ...koFired.log];
        koPending = [...koPending, ...koFired.pendingChoices];

        const koedBattle = fireOnBattleKoedOpponent(nextState, attackerId, registry, defs, causedByActionId);
        nextState = koedBattle.state;
        onBattleLog = [...onBattleLog, ...koedBattle.log];
        onBattlePending = [...onBattlePending, ...koedBattle.pendingChoices];
      }
    }
  } else {
    logger.push({
      actorPlayerId: attackerPlayerId,
      type: 'DAMAGE_DEALT',
      message: 'Attack failed — attacker power was less than the defender\'s (7-1-4).',
      data: { succeeded: false },
      relatedCardInstanceIds: [attackerId, targetId],
      visibility: 'public',
    });
  }

  if (!nextState.gameOver) {
    logger.push({
      actorPlayerId: attackerPlayerId,
      type: 'PHASE_CHANGED',
      message: 'End of Battle (7-1-5) — battle-only power bonuses expire, control returns to the Main Phase.',
      data: { step: 'endOfBattle' },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  // End of Battle (7-1-5): the Battle ends and battle-only continuous power
  // effects (duration 'duringThisBattle') expire — mirrors how nulling
  // currentBattle drops battlePowerBonuses. "Until end of turn" effects are
  // expired later, in runEndPhaseAndHandoff.ts.
  const endBattleDelayed = consumeEndOfBattleDelayedEffects(nextState, attackerId);
  nextState = endBattleDelayed.state;
  nextState = {
    ...nextState,
    currentBattle: null,
    continuousEffects: nextState.continuousEffects.filter((ce) => ce.duration !== 'duringThisBattle'),
    log: [...state.log, ...logger.log, ...koLog, ...onBattleLog, ...endBattleDelayed.log],
  };

  return { state: { ...nextState, pendingChoices: [...nextState.pendingChoices, ...triggerPending] }, log: [...logger.log, ...koLog, ...onBattleLog, ...endBattleDelayed.log], pendingChoices: [...koPending, ...triggerPending, ...onBattlePending] };
}

/** Complete a battle after a K.O. replacement prompt resolved during the Damage Step. */
export function finishBattleAfterKoDecision(
  state: GameState,
  defs: CardDefinitionLookup,
  kr: KoReplacementResumeState,
  registry: EffectTemplateRegistry,
  actionId: string | null,
): DamageStepResult {
  const battle = state.currentBattle;
  if (!battle) return { state, log: [], pendingChoices: [] };

  let nextState = state;
  let koLog: GameLogEntry[] = [];
  let koPending: PendingChoice[] = [];
  const targetId = kr.targetInstanceId;
  const targetInTrash = nextState.cardsById[targetId]?.currentZone === 'trash';

  if (targetInTrash) {
    const koFired = fireOnKO(nextState, targetId, registry, defs, actionId ?? kr.battle?.causedByActionId ?? null, {
      cause: 'battle',
      sourceInstanceId: kr.battle?.attackerId,
    });
    nextState = koFired.state;
    koLog = koFired.log;
    koPending = koFired.pendingChoices;

    const attackerId = kr.battle?.attackerId;
    if (attackerId) {
      const koedBattle = fireOnBattleKoedOpponent(nextState, attackerId, registry, defs, actionId ?? kr.battle?.causedByActionId ?? null);
      nextState = koedBattle.state;
      koLog = [...koLog, ...koedBattle.log];
      koPending = [...koPending, ...koedBattle.pendingChoices];
    }
  } else {
    const logger = createActionLogger(nextState, actionId);
    logger.push({
      actorPlayerId: kr.actorPlayerId,
      type: 'EFFECT_RESOLVED',
      message: `'${targetId}' survived battle — K.O. was replaced.`,
      data: { targetInstanceId: targetId, koReplacement: true },
      relatedCardInstanceIds: [targetId],
      visibility: 'public',
    });
    koLog = logger.log;
  }

  if (!nextState.gameOver) {
    const logger = createActionLogger(nextState, actionId);
    logger.push({
      actorPlayerId: kr.battle?.attackerPlayerId ?? kr.actorPlayerId,
      type: 'PHASE_CHANGED',
      message: 'End of Battle (7-1-5) — battle-only power bonuses expire, control returns to the Main Phase.',
      data: { step: 'endOfBattle' },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    koLog = [...koLog, ...logger.log];
  }

  const endBattleDelayed = consumeEndOfBattleDelayedEffects(nextState, kr.battle?.attackerId ?? null);
  nextState = endBattleDelayed.state;
  koLog = [...koLog, ...endBattleDelayed.log];

  nextState = {
    ...nextState,
    currentBattle: null,
    continuousEffects: nextState.continuousEffects.filter((ce) => ce.duration !== 'duringThisBattle'),
    log: [...nextState.log, ...koLog],
    pendingChoices: [...nextState.pendingChoices, ...(kr.battle?.triggerPending ?? [])],
  };

  return {
    state: nextState,
    log: koLog,
    pendingChoices: [...koPending, ...(kr.battle?.onBattlePending ?? []), ...(kr.battle?.triggerPending ?? [])],
  };
}
