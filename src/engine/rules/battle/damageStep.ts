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
import { createActionLogger } from '../shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../shared/definitions';
import { computeCurrentPower } from '../shared/power';
import { getOpponentId } from '../shared/players';

export interface DamageStepResult {
  state: GameState;
  log: GameLogEntry[];
}

export function resolveDamageAndEndOfBattle(state: GameState, defs: CardDefinitionLookup, causedByActionId: string | null): DamageStepResult {
  const battle = state.currentBattle;
  if (!battle) {
    throw new Error('resolveDamageAndEndOfBattle requires an in-progress Battle.');
  }
  const logger = createActionLogger(state, causedByActionId);

  const attackerId = battle.attackerInstanceId;
  const targetId = battle.targetInstanceId;
  const attackerPlayerId = state.activePlayerId;
  const defendingPlayerId = getOpponentId(state, attackerPlayerId);

  const attackerPower = computeCurrentPower(defs, state, attackerId);
  const targetPower = computeCurrentPower(defs, state, targetId);
  const attackerDef = getDefinition(defs, state.cardsById[attackerId]);

  logger.push({
    actorPlayerId: attackerPlayerId,
    type: 'DAMAGE_DEALT',
    message: `Damage Step: ${attackerPower} (attacker) vs ${targetPower} (defender) (7-1-4).`,
    data: { attackerInstanceId: attackerId, targetInstanceId: targetId, attackerPower, targetPower },
    relatedCardInstanceIds: [attackerId, targetId],
    visibility: 'public',
  });

  let nextState: GameState = state;

  if (attackerPower >= targetPower) {
    const target = state.cardsById[targetId];

    if (target.currentZone === 'leaderArea') {
      const hitCount = attackerDef.hasDoubleAttack ? 2 : 1;
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
        cardsById = { ...cardsById, [lifeCardId]: { ...cardsById[lifeCardId], currentZone: 'hand', faceState: 'faceUp' } };
        player = { ...player, lifeArea: { ...player.lifeArea, cardIds: restLife }, hand: addToZoneTop(player.hand, lifeCardId) };

        if (lifeDef?.hasTrigger) {
          logger.push({
            actorPlayerId: defendingPlayerId,
            type: 'TRIGGER_REVEALED',
            message: `${defendingPlayerId}'s revealed Life card has [Trigger] — effect text not executed (stubbed this milestone); added to hand.`,
            data: { lifeCardInstanceId: lifeCardId, effectStubbed: true },
            relatedCardInstanceIds: [lifeCardId],
            visibility: { visibleTo: [defendingPlayerId] },
          });
        }
        logger.push({
          actorPlayerId: defendingPlayerId,
          type: 'DAMAGE_DEALT',
          message: `${defendingPlayerId} took 1 Life damage (hit ${hit + 1}/${hitCount}) — Life card added to hand (7-1-4-1).`,
          data: { hit: hit + 1, of: hitCount },
          relatedCardInstanceIds: [lifeCardId],
          visibility: { visibleTo: [defendingPlayerId] },
        });
      }

      if (!lethal) {
        nextState = { ...nextState, players: { ...nextState.players, [defendingPlayerId]: player }, cardsById };
      }
    } else {
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

  nextState = { ...nextState, currentBattle: null, log: [...state.log, ...logger.log] };

  return { state: nextState, log: logger.log };
}
