/**
 * The manager is written as a factory over injected dependencies precisely so
 * these can run in plain node with a stub AudioContext — no jsdom, no
 * WebAudio, no timing flakiness from a real clock.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SOUND_CUES } from '../cues';
import {
  MAX_TOTAL_VOICES,
  createSoundManager,
  type AudioBufferLike,
  type AudioContextLike,
  type AudioSettingsSnapshot,
  type BufferSourceLike,
  type GainLike,
} from '../soundManager';

interface Harness {
  ctx: AudioContextLike;
  started: { detune: number; gain: number; when: number }[];
  stopped: number;
  musicGain: () => number;
  endLast(): void;
}

function stubGain(): GainLike {
  const param = {
    value: 1,
    cancelScheduledValues: () => undefined,
    setValueAtTime: () => undefined,
    // The stub applies ramps instantly; these tests care about the target, not the glide.
    linearRampToValueAtTime: (value: number) => {
      param.value = value;
    },
  };
  return { gain: param, connect: () => undefined, disconnect: () => undefined };
}

function harness(): Harness {
  const started: Harness['started'] = [];
  let stopped = 0;
  const gains: GainLike[] = [];
  const sources: BufferSourceLike[] = [];
  const ctx: AudioContextLike = {
    currentTime: 0,
    destination: {},
    state: 'running',
    createGain: () => {
      const g = stubGain();
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const detune = { value: 0 };
      const source: BufferSourceLike = {
        buffer: null,
        loop: false,
        detune,
        onended: null,
        connect: () => undefined,
        disconnect: () => undefined,
        start: (when = 0) => started.push({ detune: detune.value, gain: gains[gains.length - 1]?.gain.value ?? 1, when }),
        stop: () => {
          stopped += 1;
        },
      };
      sources.push(source);
      return source;
    },
    decodeAudioData: async () => ({ duration: 0.4 }) as AudioBufferLike,
    resume: async () => undefined,
  };
  return {
    ctx,
    started,
    get stopped() {
      return stopped;
    },
    // Bus gains are created first, in BUS_ORDER: ui, game, battle, stinger, music.
    musicGain: () => gains[5]?.gain.value ?? -1,
    endLast: () => sources[sources.length - 1]?.onended?.(),
  } as Harness;
}

function makeManager(overrides: Partial<AudioSettingsSnapshot> = {}, h = harness()) {
  let now = 1000;
  const settings: AudioSettingsSnapshot = { sfxEnabled: true, sfxVolume: 1, musicEnabled: true, musicVolume: 0.5, ...overrides };
  const manager = createSoundManager({
    now: () => now,
    createContext: () => h.ctx,
    fetchArrayBuffer: async () => new ArrayBuffer(8),
    getSettings: () => settings,
  });
  return { manager, h, settings, advance: (ms: number) => (now += ms), setNow: (v: number) => (now = v) };
}

async function ready(overrides?: Partial<AudioSettingsSnapshot>) {
  const kit = makeManager(overrides);
  await kit.manager.preload('boot');
  await kit.manager.preload('match');
  return kit;
}

describe('soundManager — availability', () => {
  it('runs silent, without throwing, when the platform has no WebAudio', () => {
    const manager = createSoundManager({
      now: () => 0,
      createContext: () => null,
      fetchArrayBuffer: async () => new ArrayBuffer(0),
      getSettings: () => ({ sfxEnabled: true, sfxVolume: 1, musicEnabled: true, musicVolume: 1 }),
    });
    expect(manager.play('ui.click')).toBe('unavailable');
    expect(() => manager.stopAll()).not.toThrow();
  });

  it('reports a muted bus rather than burning a voice on it', async () => {
    const { manager } = await ready({ sfxEnabled: false });
    expect(manager.play('ui.click')).toBe('disabled');
  });

  it('survives a missing asset and never retries it', async () => {
    const fetchArrayBuffer = vi.fn(async () => {
      throw new Error('404');
    });
    const h = harness();
    let now = 0;
    const manager = createSoundManager({
      now: () => now,
      createContext: () => h.ctx,
      fetchArrayBuffer,
      getSettings: () => ({ sfxEnabled: true, sfxVolume: 1, musicEnabled: true, musicVolume: 1 }),
    });
    expect(manager.play('ui.click')).toBe('pending');
    // Let the fetch rejection settle through the load chain.
    await new Promise((resolve) => setTimeout(resolve, 0));
    now += 1000;
    expect(manager.play('ui.click')).toBe('unavailable');
    expect(fetchArrayBuffer).toHaveBeenCalledTimes(1);
  });
});

describe('soundManager — throttling', () => {
  it('drops a repeat inside the cue’s own window', async () => {
    const { manager, advance } = await ready();
    expect(manager.play('ui.click')).toBe('played');
    advance(10);
    expect(manager.play('ui.click')).toBe('throttled');
    advance(SOUND_CUES['ui.click'].throttleMs);
    expect(manager.play('ui.click')).toBe('played');
  });

  it('throttles against when a cue will SOUND, not when play() was called', async () => {
    // This is the whole reason a staggered batch works: parseSoundCues emits
    // three card.draw cues in one synchronous burst, spaced by delay.
    const { manager } = await ready();
    const gap = SOUND_CUES['card.draw'].throttleMs + 10;
    expect(manager.play('card.draw', { delayMs: 0 })).toBe('played');
    expect(manager.play('card.draw', { delayMs: gap })).toBe('played');
    expect(manager.play('card.draw', { delayMs: gap * 2 })).toBe('played');
    // ...but a fourth crammed into an already-claimed slot still drops.
    expect(manager.play('card.draw', { delayMs: gap * 2 + 1 })).toBe('throttled');
  });

  it('offsets a delayed cue on the audio clock', async () => {
    const { manager, h } = await ready();
    manager.play('card.draw', { delayMs: 640 });
    expect(h.started[0].when).toBeCloseTo(0.64, 5);
  });
});

describe('soundManager — voices', () => {
  it('detunes repeats so the same sample does not sound mechanical', async () => {
    const { manager, h } = await ready();
    for (let i = 0; i < 3; i += 1) manager.play('card.draw', { delayMs: i * 200 });
    const def = SOUND_CUES['card.draw'];
    const detunes = h.started.map((s) => s.detune);
    expect(new Set(detunes).size).toBeGreaterThan(1);
    // The jitter is measured around the cue's fixed bias, not around zero.
    for (const d of detunes) expect(Math.abs(d - def.detuneBiasCents)).toBeLessThanOrEqual(def.detuneCents);
  });

  it('centres a cue on its pitch bias, which is what lets cues share a recording', async () => {
    // battle.ko and battle.blocker are the same impact file; the bias is the
    // only thing that makes one read as heavy and the other as light. If this
    // stops being applied, half the SFX set collapses into one sound.
    const { manager, h } = await ready();
    const ko = SOUND_CUES['battle.ko'];
    const blocker = SOUND_CUES['battle.blocker'];
    expect(ko.src).toBe(blocker.src);

    manager.play('battle.ko');
    manager.play('battle.blocker');
    const [koVoice, blockerVoice] = h.started;
    expect(Math.abs(koVoice.detune - ko.detuneBiasCents)).toBeLessThanOrEqual(ko.detuneCents);
    expect(Math.abs(blockerVoice.detune - blocker.detuneBiasCents)).toBeLessThanOrEqual(blocker.detuneCents);
    // Their jitter windows must not overlap, or the two gestures blur together.
    expect(koVoice.detune).toBeLessThan(blockerVoice.detune);
  });

  it('plays a zero-bias, zero-spread cue at its recorded pitch', async () => {
    const { manager, h } = await ready();
    expect(SOUND_CUES['stinger.game.win'].detuneCents).toBe(0);
    expect(SOUND_CUES['stinger.game.win'].detuneBiasCents).toBe(0);
    manager.play('stinger.game.win');
    expect(h.started[0].detune).toBe(0);
  });

  it('caps how many copies of one cue can sound at once', async () => {
    const { manager } = await ready();
    const max = SOUND_CUES['card.draw'].maxVoices;
    const gap = SOUND_CUES['card.draw'].throttleMs + 5;
    for (let i = 0; i < max + 2; i += 1) manager.play('card.draw', { delayMs: i * gap });
    expect(manager.debugState().voices).toBeLessThanOrEqual(max);
  });

  it('lets a K.O. take the last slot from a hover tick', async () => {
    const { manager } = await ready();
    // Fill the graph with the lowest-priority cue available.
    const gap = SOUND_CUES['ui.hover'].throttleMs + 5;
    for (let i = 0; i < MAX_TOTAL_VOICES + 4; i += 1) manager.play('ui.hover', { delayMs: i * gap });
    const before = manager.debugState().voices;
    expect(manager.play('battle.ko')).toBe('played');
    expect(manager.debugState().voices).toBeLessThanOrEqual(Math.max(before, MAX_TOTAL_VOICES));
  });

  it('frees the slot when a voice ends naturally', async () => {
    const { manager, h } = await ready();
    manager.play('battle.ko');
    expect(manager.debugState().voices).toBe(1);
    h.endLast();
    expect(manager.debugState().voices).toBe(0);
  });

  it('stopAll silences everything currently sounding', async () => {
    const { manager } = await ready();
    manager.play('battle.ko');
    manager.play('card.play.character');
    manager.stopAll();
    expect(manager.debugState().voices).toBe(0);
  });
});

describe('soundManager — mixing', () => {
  it('ducks the music bed under a stinger and lets it back up', async () => {
    vi.useFakeTimers();
    const { manager, h } = await ready();
    const base = 0.5;
    expect(h.musicGain()).toBeCloseTo(base, 5);
    manager.play('stinger.game.win');
    expect(h.musicGain()).toBeCloseTo(base * SOUND_CUES['stinger.game.win'].duckMusicTo, 5);
    vi.advanceTimersByTime(5000);
    expect(h.musicGain()).toBeCloseTo(base, 5);
    vi.useRealTimers();
  });

  it('follows the user’s volume sliders on the bus gains', async () => {
    const h = harness();
    const settings: AudioSettingsSnapshot = { sfxEnabled: true, sfxVolume: 1, musicEnabled: true, musicVolume: 0.5 };
    const manager = createSoundManager({
      now: () => 0,
      createContext: () => h.ctx,
      fetchArrayBuffer: async () => new ArrayBuffer(8),
      getSettings: () => settings,
    });
    await manager.preload('boot');
    settings.musicVolume = 0.2;
    settings.sfxEnabled = false;
    manager.syncSettings();
    expect(h.musicGain()).toBeCloseTo(0.2, 5);
    expect(manager.play('ui.click')).toBe('disabled');
  });

  it('plays a batch from parseSoundCues in one call', async () => {
    const { manager, h } = await ready();
    manager.playEvents([
      { cueId: 'phase.draw', delayMs: 0 },
      { cueId: 'card.draw', delayMs: 640 },
    ]);
    expect(h.started).toHaveLength(2);
  });
});

describe('soundManager — music', () => {
  /** Let every queued microtask and the stub fetch settle. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('never stacks two copies of the same bed, even called twice mid-download', async () => {
    // The bug this guards: a bed is several MB and loads asynchronously, so
    // the first request is still downloading when the second arrives. Both
    // resolve, both start, and the player hears the track twice a few hundred
    // milliseconds out of phase. React StrictMode fires every effect twice, so
    // this was the DEFAULT behaviour on entering a match in dev, and any
    // settings change that re-ran the effect reproduced it in prod.
    const { manager, h } = await ready();
    manager.playMusic('music.battle');
    manager.playMusic('music.battle');
    await settle();
    expect(h.started).toHaveLength(1);

    // And again once it is genuinely playing.
    manager.playMusic('music.battle');
    await settle();
    expect(h.started).toHaveLength(1);
  });

  it('drops a bed whose download lands after it was stopped', async () => {
    const { manager, h } = await ready();
    manager.playMusic('music.battle');
    manager.stopMusic(0);
    await settle();
    expect(h.started).toHaveLength(0);
  });

  it('lets a later request win over one still in flight', async () => {
    const { manager, h } = await ready();
    manager.playMusic('music.battle');
    manager.playMusic('music.victory');
    await settle();
    expect(h.started).toHaveLength(1);
    // The one that sounds is the one asked for last.
    expect(h.started[0].gain).toBeCloseTo(SOUND_CUES['music.victory'].gain, 5);
  });

  it('still starts the bed while music is muted, so unmuting joins it in progress', async () => {
    // Otherwise turning music on mid-match either does nothing until the next
    // screen change, or restarts the track from the top.
    const { manager, h } = await ready({ musicEnabled: false });
    manager.playMusic('music.battle');
    await settle();
    expect(h.started).toHaveLength(1);
    expect(h.musicGain()).toBe(0);
  });

  it('stops the previous bed when swapping to another', async () => {
    const { manager, h } = await ready();
    manager.playMusic('music.battle');
    await settle();
    const stoppedBefore = h.stopped;
    manager.playMusic('music.victory', 0);
    await settle();
    expect(h.started).toHaveLength(2);
    expect(h.stopped).toBeGreaterThan(stoppedBefore);
  });
});
