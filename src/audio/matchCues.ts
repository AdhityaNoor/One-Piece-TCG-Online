/**
 * Turns a dispatch's game-log delta into sound cues — the audio sibling of
 * animations/cardMovement/parseLogEntries.ts, and deliberately shaped like it:
 * a PURE function over (prevState, logDelta) that emits presentation intents.
 * It reads game state; it never touches it, and the engine never imports it.
 *
 * Timing rule: a cue that describes a card ARRIVING somewhere is delayed by
 * the card-flight duration so the sound lands with the card, not with the
 * dispatch. Cues that describe an IMPACT (a declaration, a Life card being
 * taken, a K.O.) fire immediately — the hit is the moment, the flight is the
 * aftermath. With animations disabled every flight delay collapses to zero.
 */
import { FLIGHT_MS } from '../animations/cardMovement/types';
import { normalizeEngineZone } from '../animations/cardMovement/boardAnchors';
import type { GameLogEntry } from '../engine/logs/logEntry';
import type { GameState } from '../engine/state';
import type { SoundCueEvent, SoundCueId } from './cues';

/**
 * Spacing between two cues of the SAME id inside one batch. Smaller than the
 * card-flight stagger on purpose: identical short samples fired on the exact
 * same frame phase-cancel into one flat thump.
 */
export const AUDIO_STAGGER_MS = 70;

/** Beyond this many repeats of one cue in a single delta, stop emitting — a 10-card mill is one riffle, not ten. */
const MAX_REPEATS_PER_CUE = 4;

const DON_DEFINITION_ID = 'DON-GENERIC';

export interface ParseSoundCuesOptions {
  /** Whose seat is this client watching? null = spectator/hotseat, perspective cues are skipped. */
  localPlayerId: string | null;
  /** Mirrors settingsStore.animationsEnabled — with flights off, nothing waits for one. */
  animationsEnabled: boolean;
}

function isDon(state: GameState, instanceId: string | undefined): boolean {
  if (!instanceId) return false;
  return state.cardsById[instanceId]?.cardDefinitionId === DON_DEFINITION_ID;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function parseSoundCues(
  prevState: GameState,
  logDelta: readonly GameLogEntry[],
  options: ParseSoundCuesOptions,
): SoundCueEvent[] {
  const { localPlayerId, animationsEnabled } = options;
  const landing = animationsEnabled ? FLIGHT_MS : 0;
  const events: SoundCueEvent[] = [];
  const emitted = new Map<SoundCueId, number>();

  /** Records one cue, applying the per-cue repeat cap and same-cue stagger. */
  function emit(cueId: SoundCueId, delayMs = 0, gain?: number): void {
    const seen = emitted.get(cueId) ?? 0;
    if (seen >= MAX_REPEATS_PER_CUE) return;
    emitted.set(cueId, seen + 1);
    events.push({ cueId, delayMs: Math.max(0, Math.round(delayMs + seen * AUDIO_STAGGER_MS)), ...(gain === undefined ? {} : { gain }) });
  }

  // Life totals are walked forward across the delta so the "one Life left"
  // sting can fire off the hit that causes it, without needing nextState.
  const lifeRemaining = new Map<string, number>();
  for (const [playerId, player] of Object.entries(prevState.players)) {
    lifeRemaining.set(playerId, player.lifeArea.cardIds.length);
  }

  for (const entry of logDelta) {
    const data = entry.data;

    switch (entry.type) {
      case 'PHASE_CHANGED': {
        const phase = str(data.phase);
        if (phase === 'refresh') {
          emit('phase.refresh');
          // runRefreshPhase lists everything it set active on this one entry.
          if (entry.relatedCardInstanceIds.length > 0) emit('card.setactive', 120);
          if (entry.relatedCardInstanceIds.some((id) => isDon(prevState, id))) emit('don.refresh', 160);
        } else if (phase === 'draw') emit('phase.draw');
        else if (phase === 'don') emit('phase.don');
        else if (phase === 'main') emit('phase.main');
        else if (phase === 'end') emit('phase.end');
        // Anything else (e.g. the Block-Step skip note carrying `step`) is a
        // rules annotation, not a beat the player needs to hear.
        break;
      }

      case 'TURN_PASSED': {
        if (!localPlayerId || !entry.actorPlayerId) break;
        emit(entry.actorPlayerId === localPlayerId ? 'turn.begin.you' : 'turn.begin.opponent');
        break;
      }

      case 'CARD_DRAWN':
        emit('card.draw', landing);
        break;

      case 'CARD_PLAYED': {
        const to = normalizeEngineZone(data.to);
        if (to === 'stageArea') emit('card.play.stage', landing);
        else if (to === 'characterArea' || to === 'leaderArea') emit('card.play.character', landing);
        else if (to === 'trash') emit('card.play.event', 0);
        else emit('card.move', landing);
        break;
      }

      case 'CARD_MOVED': {
        const from = normalizeEngineZone(data.from);
        const to = normalizeEngineZone(data.to ?? data.zone);
        const ids = entry.relatedCardInstanceIds;

        // DON!! Phase bulk add is logged with no `from` (runDonPhase.ts).
        if (!from && to === 'costArea' && ids.length > 0) {
          for (let i = 0; i < ids.length; i += 1) emit('don.draw', landing);
          break;
        }
        if (to === 'costArea' && ids.some((id) => isDon(prevState, id))) {
          emit('don.return', landing);
          break;
        }
        if (to === 'trash') emit('card.trash', landing);
        else if (to === 'hand') emit('card.return.hand', landing);
        else if (to === 'characterArea') emit('card.play.character', landing);
        else if (to === 'stageArea') emit('card.play.stage', landing);
        else if (to === 'deck') emit('deck.shuffle', landing);
        else if (to) emit('card.move', landing);
        break;
      }

      case 'CHARACTER_KO':
        emit('battle.ko', landing);
        break;

      case 'CARD_RESTED':
        emit('card.rest');
        break;

      case 'DON_GIVEN':
        emit('don.attach');
        break;

      case 'DON_RETURNED':
        emit('don.return');
        break;

      case 'DON_RESTED':
        emit('don.rest');
        break;

      case 'ATTACK_DECLARED': {
        const targetId = str(data.targetInstanceId);
        const target = targetId ? prevState.cardsById[targetId] : undefined;
        emit(target?.currentZone === 'leaderArea' ? 'battle.attack.leader' : 'battle.attack.declare');
        break;
      }

      case 'BLOCKER_ACTIVATED':
        emit('battle.blocker');
        break;

      case 'COUNTER_ACTIVATED':
        emit('battle.counter.card');
        break;

      case 'DAMAGE_DEALT': {
        emit('battle.life.take');
        const damaged = entry.actorPlayerId;
        if (damaged) {
          const left = Math.max(0, (lifeRemaining.get(damaged) ?? 0) - 1);
          lifeRemaining.set(damaged, left);
          // Fires once, on the hit that takes YOU to your last Life card.
          if (left === 1 && damaged === localPlayerId) emit('stinger.life.critical', 700);
        }
        break;
      }

      case 'TRIGGER_REVEALED':
        emit('battle.trigger.reveal');
        break;

      case 'EFFECT_ACTIVATED': {
        const from = normalizeEngineZone(data.from);
        const to = normalizeEngineZone(data.to);
        const playedFromHand = from === 'hand' && to === 'trash';
        if (playedFromHand && prevState.currentBattle) emit('battle.counter.event');
        else if (playedFromHand) emit('card.play.event');
        else emit('effect.activate');
        break;
      }

      case 'EFFECT_RESOLVED': {
        if (data.debug === true) break; // play-test scaffolding, not a game beat
        emit('effect.resolve');
        break;
      }

      case 'CHOICE_REQUESTED': {
        // Only the player who has to decide should hear the prompt open.
        if (localPlayerId && entry.actorPlayerId && entry.actorPlayerId !== localPlayerId) break;
        emit('prompt.open');
        break;
      }

      case 'CHOICE_RESOLVED':
        emit('prompt.confirm');
        break;

      case 'GAME_OVER': {
        const winnerId = str(data.winnerId);
        if (!localPlayerId || !winnerId) break;
        emit(winnerId === localPlayerId ? 'stinger.game.win' : 'stinger.game.lose', 350);
        break;
      }

      default:
        break;
    }
  }

  return events;
}
