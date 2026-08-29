import { describe, expect, it } from 'vitest';
import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { GameState } from '../../engine/state/game';
import { FLIGHT_MS } from '../../animations/cardMovement/types';
import { AUDIO_STAGGER_MS, parseSoundCues } from '../matchCues';

function logEntry(partial: Partial<GameLogEntry> & Pick<GameLogEntry, 'type' | 'id'>): GameLogEntry {
  return {
    sequence: 1,
    turnNumber: 1,
    phase: 'main',
    actorPlayerId: 'p1',
    message: '',
    data: {},
    relatedCardInstanceIds: [],
    visibility: 'public',
    causedByActionId: 'a1',
    ...partial,
  };
}

function card(instanceId: string, over: Record<string, unknown> = {}) {
  return {
    instanceId,
    cardDefinitionId: 'OP01-001',
    ownerId: 'p1',
    controllerId: 'p1',
    currentZone: 'characterArea',
    faceState: 'faceUp',
    orientation: 'active',
    donAttached: [],
    ...over,
  };
}

function player(life: number) {
  return { lifeArea: { cardIds: Array.from({ length: life }, (_, i) => `life${i}`) } };
}

function state(over: Partial<Record<string, unknown>> = {}): GameState {
  return {
    cardsById: {},
    players: { p1: player(4), p2: player(4) },
    activePlayerId: 'p1',
    turnNumber: 1,
    currentPhase: 'main',
    currentBattle: null,
    setupState: null,
    log: [],
    pendingChoices: [],
    continuousEffects: [],
    oncePerTurnUsage: {},
    isFirstTurnOfGame: false,
    rng: { seed: 's', cursor: 0 },
    gameOver: null,
    nextInstanceSeq: 0,
    ...over,
  } as unknown as GameState;
}

const OPTS = { localPlayerId: 'p1', animationsEnabled: true };

describe('parseSoundCues — card motion', () => {
  it('waits for the card to land before the draw is heard', () => {
    const cues = parseSoundCues(state(), [logEntry({ id: 'l1', type: 'CARD_DRAWN', relatedCardInstanceIds: ['c1'] })], OPTS);
    expect(cues).toEqual([{ cueId: 'card.draw', delayMs: FLIGHT_MS }]);
  });

  it('drops the flight delay when animations are off', () => {
    const cues = parseSoundCues(state(), [logEntry({ id: 'l1', type: 'CARD_DRAWN' })], { ...OPTS, animationsEnabled: false });
    expect(cues).toEqual([{ cueId: 'card.draw', delayMs: 0 }]);
  });

  it('staggers repeats of one cue so identical samples do not phase-cancel', () => {
    const delta = [1, 2, 3].map((n) => logEntry({ id: `l${n}`, type: 'CARD_DRAWN' }));
    const cues = parseSoundCues(state(), delta, OPTS);
    expect(cues.map((c) => c.delayMs)).toEqual([FLIGHT_MS, FLIGHT_MS + AUDIO_STAGGER_MS, FLIGHT_MS + 2 * AUDIO_STAGGER_MS]);
  });

  it('caps a mass mill at a handful of hits rather than one per card', () => {
    const delta = Array.from({ length: 10 }, (_, i) => logEntry({ id: `l${i}`, type: 'CARD_DRAWN' }));
    expect(parseSoundCues(state(), delta, OPTS)).toHaveLength(4);
  });

  it('picks the cue from the destination zone', () => {
    const cases: [string, string][] = [
      ['characterArea', 'card.play.character'],
      ['stageArea', 'card.play.stage'],
      ['trash', 'card.play.event'],
    ];
    for (const [zone, expected] of cases) {
      const cues = parseSoundCues(state(), [logEntry({ id: 'l', type: 'CARD_PLAYED', data: { from: 'hand', to: zone } })], OPTS);
      expect(cues[0].cueId).toBe(expected);
    }
  });

  it('hears the DON!! Phase bulk add as DON!!, not as generic movement', () => {
    const cues = parseSoundCues(
      state(),
      [logEntry({ id: 'l', type: 'CARD_MOVED', data: { zone: 'costArea', count: 2 }, relatedCardInstanceIds: ['d1', 'd2'] })],
      OPTS,
    );
    expect(cues.map((c) => c.cueId)).toEqual(['don.draw', 'don.draw']);
  });
});

describe('parseSoundCues — battle', () => {
  it('separates an attack on a Leader from an attack on a Character', () => {
    const prev = state({ cardsById: { leader: card('leader', { currentZone: 'leaderArea' }), ch: card('ch') } });
    const attack = (target: string) => parseSoundCues(prev, [logEntry({ id: 'l', type: 'ATTACK_DECLARED', data: { targetInstanceId: target } })], OPTS)[0].cueId;
    expect(attack('leader')).toBe('battle.attack.leader');
    expect(attack('ch')).toBe('battle.attack.declare');
  });

  it('treats an Event played from hand during a battle as a Counter', () => {
    const data = { from: 'hand', to: 'trash' };
    const inBattle = state({ currentBattle: { attackerInstanceId: 'a', targetInstanceId: 'b' } });
    expect(parseSoundCues(inBattle, [logEntry({ id: 'l', type: 'EFFECT_ACTIVATED', data })], OPTS)[0].cueId).toBe('battle.counter.event');
    expect(parseSoundCues(state(), [logEntry({ id: 'l', type: 'EFFECT_ACTIVATED', data })], OPTS)[0].cueId).toBe('card.play.event');
  });

  it('sounds the last-Life sting only on your own final Life card', () => {
    const twoLife = state({ players: { p1: player(2), p2: player(2) } });
    const yours = parseSoundCues(twoLife, [logEntry({ id: 'l', type: 'DAMAGE_DEALT', actorPlayerId: 'p1' })], OPTS);
    expect(yours.map((c) => c.cueId)).toEqual(['battle.life.take', 'stinger.life.critical']);

    const theirs = parseSoundCues(twoLife, [logEntry({ id: 'l', type: 'DAMAGE_DEALT', actorPlayerId: 'p2' })], OPTS);
    expect(theirs.map((c) => c.cueId)).toEqual(['battle.life.take']);
  });

  it('walks Life forward across a multi-hit delta instead of re-firing the sting', () => {
    const threeLife = state({ players: { p1: player(3), p2: player(3) } });
    const delta = [1, 2].map((n) => logEntry({ id: `l${n}`, type: 'DAMAGE_DEALT', actorPlayerId: 'p1' }));
    const cues = parseSoundCues(threeLife, delta, OPTS);
    expect(cues.filter((c) => c.cueId === 'stinger.life.critical')).toHaveLength(1);
  });
});

describe('parseSoundCues — perspective', () => {
  it('announces whose turn it is from the viewer’s seat', () => {
    const passed = logEntry({ id: 'l', type: 'TURN_PASSED', actorPlayerId: 'p2' });
    expect(parseSoundCues(state(), [passed], OPTS)[0].cueId).toBe('turn.begin.opponent');
    expect(parseSoundCues(state(), [passed], { ...OPTS, localPlayerId: 'p2' })[0].cueId).toBe('turn.begin.you');
  });

  it('stays quiet about turn ownership for a spectator', () => {
    const passed = logEntry({ id: 'l', type: 'TURN_PASSED', actorPlayerId: 'p2' });
    expect(parseSoundCues(state(), [passed], { ...OPTS, localPlayerId: null })).toEqual([]);
  });

  it('only opens the prompt for the player who has to choose', () => {
    const asked = logEntry({ id: 'l', type: 'CHOICE_REQUESTED', actorPlayerId: 'p2' });
    expect(parseSoundCues(state(), [asked], OPTS)).toEqual([]);
    expect(parseSoundCues(state(), [asked], { ...OPTS, localPlayerId: 'p2' })[0].cueId).toBe('prompt.open');
  });

  it('resolves game over to win or loss for this client', () => {
    const over = logEntry({ id: 'l', type: 'GAME_OVER', data: { winnerId: 'p1' } });
    expect(parseSoundCues(state(), [over], OPTS)[0].cueId).toBe('stinger.game.win');
    expect(parseSoundCues(state(), [over], { ...OPTS, localPlayerId: 'p2' })[0].cueId).toBe('stinger.game.lose');
  });
});

describe('parseSoundCues — noise control', () => {
  it('ignores play-test scaffolding entries', () => {
    expect(parseSoundCues(state(), [logEntry({ id: 'l', type: 'EFFECT_RESOLVED', data: { debug: true } })], OPTS)).toEqual([]);
  });

  it('ignores rules annotations that are not a beat', () => {
    // declareAttack logs the [Unblockable] Block-Step skip as PHASE_CHANGED.
    expect(parseSoundCues(state(), [logEntry({ id: 'l', type: 'PHASE_CHANGED', data: { step: 'counter' } })], OPTS)).toEqual([]);
  });

  it('never emits a negative delay', () => {
    const delta = [logEntry({ id: 'l', type: 'CARD_RESTED' }), logEntry({ id: 'l2', type: 'DON_RESTED' })];
    expect(parseSoundCues(state(), delta, OPTS).every((c) => c.delayMs >= 0)).toBe(true);
  });
});
