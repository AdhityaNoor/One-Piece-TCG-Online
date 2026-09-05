/**
 * The playback engine behind every cue. Layer 5 (presentation) — it must never
 * be imported by /src/engine or /src/cards.
 *
 * Written as a factory over injected dependencies (clock, audio context,
 * asset fetch, settings read) rather than as a module that reaches for
 * `window`, so the whole thing is testable in plain node. The browser
 * singleton lives in runtime.ts.
 *
 * What it guarantees, and why each one matters in a card game:
 *  - THROTTLING       a 5-card draw is 5 log entries; without a per-cue gap
 *                     you get a machine-gun instead of a riffle.
 *  - VOICE CAPS       per cue and globally, so a chain of effects can never
 *                     stack 40 simultaneous sources and clip the master.
 *  - PRIORITY         when the global cap is hit, a K.O. outranks a hover tick.
 *  - DETUNE           each cue has a fixed pitch bias plus a random ±spread.
 *                     The bias lets many cues share one recording and still
 *                     read as distinct; the spread stops repeats sounding
 *                     stamped out.
 *  - DUCKING          stingers pull the music bed down and let it back up.
 *  - ONE BED          music requests are idempotent while a track is still
 *                     downloading, so repeated calls can never stack two
 *                     copies of the same bed.
 *  - NEVER THROWS     a missing asset, a blocked autoplay, or a browser with
 *                     no WebAudio degrades to silence. Audio is never
 *                     load-bearing for gameplay.
 */
import { SOUND_CUES, cuesInGroup, type SoundBus, type SoundCueEvent, type SoundCueId, type SoundPreloadGroup } from './cues';

/* ------------------------------------------------------------------ types */
/** Structural subsets of the WebAudio API — kept DOM-free so tests can stub them. */
export interface AudioParamLike {
  value: number;
  cancelScheduledValues(startTime: number): void;
  setValueAtTime(value: number, startTime: number): void;
  linearRampToValueAtTime(value: number, endTime: number): void;
}
export interface GainLike {
  gain: AudioParamLike;
  connect(destination: unknown): unknown;
  disconnect(): void;
}
export interface BufferSourceLike {
  buffer: AudioBufferLike | null;
  loop: boolean;
  detune: { value: number };
  onended: (() => void) | null;
  connect(destination: unknown): unknown;
  disconnect(): void;
  start(when?: number): void;
  stop(when?: number): void;
}
export interface AudioBufferLike {
  duration: number;
}
export interface AudioContextLike {
  readonly currentTime: number;
  readonly destination: unknown;
  readonly state: string;
  createGain(): GainLike;
  createBufferSource(): BufferSourceLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  resume(): Promise<void>;
}

export interface AudioSettingsSnapshot {
  sfxEnabled: boolean;
  /** 0..1 master for ui/game/battle/stinger. */
  sfxVolume: number;
  musicEnabled: boolean;
  /** 0..1 master for the music bus. */
  musicVolume: number;
}

export interface SoundManagerDeps {
  now(): number;
  /** Returns null when the platform has no WebAudio — the manager then no-ops. */
  createContext(): AudioContextLike | null;
  fetchArrayBuffer(url: string): Promise<ArrayBuffer>;
  getSettings(): AudioSettingsSnapshot;
  /** Optional sink for diagnostics; defaults to swallowing everything. */
  onWarning?(message: string, error?: unknown): void;
}

export interface PlayOptions {
  /** Milliseconds from now. Used to line a cue up with the card flight it belongs to. */
  delayMs?: number;
  /** Extra trim on top of the cue's static gain (0..1). */
  gain?: number;
  /** Overrides the cue's random detune for this one play. */
  detuneCents?: number;
}

export type PlayOutcome = 'played' | 'throttled' | 'capped' | 'disabled' | 'unavailable' | 'pending';

/* -------------------------------------------------------------- constants */
/** Hard ceiling on simultaneous voices across every bus. */
export const MAX_TOTAL_VOICES = 16;
/** A cue whose asset is still downloading is dropped if it arrives later than this — better silent than late. */
const LATE_ARRIVAL_MS = 350;
/** Ramp used when ducking the music bed down, and when releasing it. */
const DUCK_ATTACK_S = 0.08;
const DUCK_RELEASE_S = 0.45;
/** Musical crossfade when swapping beds. */
const DEFAULT_MUSIC_FADE_MS = 900;

const BUS_ORDER: SoundBus[] = ['ui', 'game', 'battle', 'stinger', 'music'];

interface ActiveVoice {
  cueId: SoundCueId;
  priority: number;
  startedAt: number;
  source: BufferSourceLike;
  gainNode: GainLike;
  stopped: boolean;
}

interface ActiveDuck {
  factor: number;
}

export interface SoundManager {
  play(cueId: SoundCueId, options?: PlayOptions): PlayOutcome;
  /** Fire a batch produced by matchCues.parseSoundCues. */
  playEvents(events: readonly SoundCueEvent[]): void;
  playMusic(cueId: SoundCueId, fadeMs?: number): void;
  stopMusic(fadeMs?: number): void;
  preload(group: SoundPreloadGroup): Promise<void>;
  /** Resume a context the browser suspended until a user gesture. Safe to call repeatedly. */
  unlock(): void;
  /** Silence everything currently sounding (leaving a match, tabbing away). */
  stopAll(): void;
  /** Re-read settings and apply them to the bus gains. */
  syncSettings(): void;
  /** Test/diagnostic view. */
  debugState(): { voices: number; loaded: number; failed: number; contextState: string | null };
}

export function createSoundManager(deps: SoundManagerDeps): SoundManager {
  const warn = deps.onWarning ?? (() => undefined);

  let ctx: AudioContextLike | null = null;
  let contextFailed = false;
  let master: GainLike | null = null;
  const buses = new Map<SoundBus, GainLike>();

  const buffers = new Map<string, AudioBufferLike>();
  const inflight = new Map<string, Promise<AudioBufferLike | null>>();
  const failed = new Set<string>();

  const lastPlayedAt = new Map<SoundCueId, number>();
  const voices: ActiveVoice[] = [];
  let ducks: ActiveDuck[] = [];

  let musicVoice: ActiveVoice | null = null;
  let musicCueId: SoundCueId | null = null;
  /**
   * Bumped on every music request. A bed is fetched asynchronously, so by the
   * time a buffer arrives the request that asked for it may have been
   * superseded or stopped; a load that resolves against a stale token is
   * dropped instead of started.
   */
  let musicRequestSeq = 0;
  /** The bed asked for but not yet sounding. Guards against starting it twice. */
  let pendingMusicCueId: SoundCueId | null = null;

  /* --------------------------------------------------------- graph setup */
  function ensureGraph(): AudioContextLike | null {
    if (ctx || contextFailed) return ctx;
    try {
      const created = deps.createContext();
      if (!created) {
        contextFailed = true;
        return null;
      }
      ctx = created;
      master = created.createGain();
      master.gain.value = 1;
      master.connect(created.destination);
      for (const bus of BUS_ORDER) {
        const node = created.createGain();
        node.gain.value = 1;
        node.connect(master);
        buses.set(bus, node);
      }
      syncSettings();
      return ctx;
    } catch (error) {
      contextFailed = true;
      warn('audio: could not create an AudioContext; running silent', error);
      return null;
    }
  }

  /** The user-facing volume for a bus, before ducking. */
  function busBaseGain(bus: SoundBus): number {
    const s = deps.getSettings();
    if (bus === 'music') return s.musicEnabled ? clamp01(s.musicVolume) : 0;
    return s.sfxEnabled ? clamp01(s.sfxVolume) : 0;
  }

  function syncSettings(): void {
    if (!ctx) return;
    for (const bus of BUS_ORDER) {
      const node = buses.get(bus);
      if (!node) continue;
      node.gain.value = bus === 'music' ? busBaseGain(bus) * currentDuckFactor() : busBaseGain(bus);
    }
  }

  /* ------------------------------------------------------------- ducking */
  /** Deepest duck currently held. 1 means the music bed is at its normal level. */
  function currentDuckFactor(): number {
    return ducks.reduce((min, d) => Math.min(min, d.factor), 1);
  }

  /**
   * Pull the music bed down for `holdMs`, then let it back up. Each duck is
   * released by identity rather than by an expiry timestamp, so two
   * overlapping stingers hold the bed down until the LAST one finishes
   * instead of the first one's release yanking it back up under the second.
   */
  function applyDuck(factor: number, holdMs: number): void {
    if (!ctx || factor >= 1) return;
    const musicBus = buses.get('music');
    if (!musicBus) return;
    const duck: ActiveDuck = { factor };
    ducks.push(duck);
    rampTo(musicBus.gain, busBaseGain('music') * currentDuckFactor(), DUCK_ATTACK_S);
    setTimeout(() => {
      ducks = ducks.filter((d) => d !== duck);
      if (!ctx) return;
      const node = buses.get('music');
      if (!node) return;
      rampTo(node.gain, busBaseGain('music') * currentDuckFactor(), DUCK_RELEASE_S);
    }, holdMs);
  }

  function rampTo(param: AudioParamLike, value: number, seconds: number): void {
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(value, t + seconds);
    } catch {
      param.value = value;
    }
  }

  /* ------------------------------------------------------------- buffers */
  function loadBuffer(url: string): Promise<AudioBufferLike | null> {
    const cached = buffers.get(url);
    if (cached) return Promise.resolve(cached);
    if (failed.has(url)) return Promise.resolve(null);
    const existing = inflight.get(url);
    if (existing) return existing;

    const active = ensureGraph();
    if (!active) return Promise.resolve(null);

    const promise = deps
      .fetchArrayBuffer(url)
      .then((data) => active.decodeAudioData(data))
      .then((buffer) => {
        buffers.set(url, buffer);
        inflight.delete(url);
        return buffer;
      })
      .catch((error) => {
        // A missing or undecodable asset is permanently skipped rather than
        // retried on every play — a 404 must not turn into a request storm.
        failed.add(url);
        inflight.delete(url);
        warn(`audio: could not load ${url}`, error);
        return null;
      });
    inflight.set(url, promise);
    return promise;
  }

  /* -------------------------------------------------------------- voices */
  function releaseVoice(voice: ActiveVoice): void {
    const index = voices.indexOf(voice);
    if (index !== -1) voices.splice(index, 1);
    if (voice.stopped) return;
    voice.stopped = true;
    try {
      voice.source.onended = null;
      voice.source.stop();
    } catch {
      /* already stopped — WebAudio throws on a double stop */
    }
    try {
      voice.source.disconnect();
      voice.gainNode.disconnect();
    } catch {
      /* node already torn down */
    }
  }

  /** Frees a slot for `priority`, or reports that nothing quieter was playing. */
  function makeRoom(cueId: SoundCueId, priority: number, maxVoices: number): boolean {
    const sameCue = voices.filter((v) => v.cueId === cueId);
    if (sameCue.length >= maxVoices) {
      const oldest = sameCue.reduce((a, b) => (a.startedAt <= b.startedAt ? a : b));
      releaseVoice(oldest);
    }
    if (voices.length < MAX_TOTAL_VOICES) return true;
    // Global cap: evict the quietest-ranked voice, oldest first among ties.
    const victim = voices
      .filter((v) => v.priority < priority)
      .sort((a, b) => a.priority - b.priority || a.startedAt - b.startedAt)[0];
    if (!victim) return false;
    releaseVoice(victim);
    return true;
  }

  function startVoice(
    cueId: SoundCueId,
    buffer: AudioBufferLike,
    options: PlayOptions,
    scheduledAt: number,
  ): PlayOutcome {
    const def = SOUND_CUES[cueId];
    const active = ensureGraph();
    if (!active) return 'unavailable';
    const bus = buses.get(def.bus);
    if (!bus) return 'unavailable';
    if (!makeRoom(cueId, def.priority, def.maxVoices)) return 'capped';

    try {
      const source = active.createBufferSource();
      source.buffer = buffer;
      source.loop = def.loop;
      // Bias first, jitter around it: the bias is what makes a K.O. and a
      // [Blocker] read as different gestures when they share one recording,
      // and the jitter keeps repeats of either from sounding stamped out.
      const spread = options.detuneCents ?? def.detuneCents;
      const jitter = spread > 0 ? (Math.random() * 2 - 1) * spread : 0;
      const detune = def.detuneBiasCents + jitter;
      if (detune !== 0) source.detune.value = detune;

      const gainNode = active.createGain();
      gainNode.gain.value = clamp01(def.gain * clamp01(options.gain ?? 1));
      source.connect(gainNode);
      gainNode.connect(bus);

      const voice: ActiveVoice = {
        cueId,
        priority: def.priority,
        startedAt: scheduledAt,
        source,
        gainNode,
        stopped: false,
      };
      source.onended = () => releaseVoice(voice);
      voices.push(voice);
      source.start(active.currentTime + Math.max(0, options.delayMs ?? 0) / 1000);

      if (def.duckMusicTo < 1) {
        applyDuck(def.duckMusicTo, Math.round(buffer.duration * 1000) + 250);
      }
      if (def.bus === 'music') {
        musicVoice = voice;
        musicCueId = cueId;
      }
      return 'played';
    } catch (error) {
      warn(`audio: failed to start ${cueId}`, error);
      return 'unavailable';
    }
  }

  /* ----------------------------------------------------------- public API */
  function play(cueId: SoundCueId, options: PlayOptions = {}): PlayOutcome {
    const def = SOUND_CUES[cueId];
    if (!def) return 'unavailable';
    if (busBaseGain(def.bus) <= 0) return 'disabled';

    const now = deps.now();
    // Throttling is measured against when the cue will SOUND, not when play()
    // was called. A batch from parseSoundCues is dispatched in one synchronous
    // burst with staggered delays; comparing against `now` would throttle away
    // every cue after the first and silence the stagger entirely.
    const scheduledAt = now + Math.max(0, options.delayMs ?? 0);
    const last = lastPlayedAt.get(cueId);
    if (last !== undefined && scheduledAt - last < def.throttleMs) return 'throttled';
    lastPlayedAt.set(cueId, scheduledAt);

    if (!ensureGraph()) return 'unavailable';

    const cached = buffers.get(def.src);
    if (cached) return startVoice(cueId, cached, options, scheduledAt);
    if (failed.has(def.src)) return 'unavailable';

    void loadBuffer(def.src).then((buffer) => {
      if (!buffer) return;
      // Loops are worth playing whenever they arrive; a one-shot that missed
      // its moment is not — firing a K.O. thump two seconds late is worse
      // than not firing it.
      if (!def.loop && deps.now() - scheduledAt > LATE_ARRIVAL_MS) return;
      startVoice(cueId, buffer, options, scheduledAt);
    });
    return 'pending';
  }

  function playEvents(events: readonly SoundCueEvent[]): void {
    for (const event of events) {
      play(event.cueId, { delayMs: event.delayMs, gain: event.gain });
    }
  }

  /**
   * Swap the bed. Safe to call repeatedly with the same cue — and that matters
   * more than it sounds: a React effect fires twice under StrictMode, and a
   * settings change re-runs the effects that own the music. A bed is several
   * megabytes, so the first call is almost always still downloading when the
   * second arrives, which is why "is it already playing?" is not a sufficient
   * guard on its own. Without the pending check, two loads of the same track
   * resolve a few hundred milliseconds apart and the player hears the music
   * twice, very slightly out of phase.
   */
  function playMusic(cueId: SoundCueId, fadeMs = DEFAULT_MUSIC_FADE_MS): void {
    if (pendingMusicCueId === cueId) return;
    if (musicCueId === cueId && musicVoice && !musicVoice.stopped) return;

    stopMusic(fadeMs);
    const request = ++musicRequestSeq;
    // Claim the slot before the await, so a second call in the same tick sees
    // this one and returns instead of queueing a duplicate.
    pendingMusicCueId = cueId;
    musicCueId = cueId;

    const def = SOUND_CUES[cueId];
    if (!def || !ensureGraph()) {
      pendingMusicCueId = null;
      return;
    }

    // A bed is started even while the music setting is off: the music bus is
    // simply at zero gain, so turning music back on mid-match brings it in
    // where it should be rather than starting the track over from silence.
    const begin = (buffer: AudioBufferLike): void => {
      if (request !== musicRequestSeq) return; // stopped or superseded while loading
      pendingMusicCueId = null;
      if (startVoice(cueId, buffer, {}, deps.now()) !== 'played') return;
      const voice = musicVoice;
      if (!voice || !ctx) return;
      voice.gainNode.gain.value = 0;
      rampTo(voice.gainNode.gain, clamp01(def.gain), fadeMs / 1000);
    };

    const cached = buffers.get(def.src);
    if (cached) {
      begin(cached);
      return;
    }
    void loadBuffer(def.src).then((buffer) => {
      if (!buffer) {
        if (request === musicRequestSeq) pendingMusicCueId = null;
        return;
      }
      begin(buffer);
    });
  }

  function stopMusic(fadeMs = DEFAULT_MUSIC_FADE_MS): void {
    // Invalidate anything in flight first: a bed whose download lands after a
    // stop must not sneak in behind it.
    musicRequestSeq += 1;
    pendingMusicCueId = null;
    const voice = musicVoice;
    musicVoice = null;
    musicCueId = null;
    if (!voice || voice.stopped) return;
    if (!ctx || fadeMs <= 0) {
      releaseVoice(voice);
      return;
    }
    rampTo(voice.gainNode.gain, 0, fadeMs / 1000);
    setTimeout(() => releaseVoice(voice), fadeMs + 50);
  }

  async function preload(group: SoundPreloadGroup): Promise<void> {
    if (!ensureGraph()) return;
    await Promise.all(cuesInGroup(group).map((id) => loadBuffer(SOUND_CUES[id].src)));
  }

  function unlock(): void {
    const active = ensureGraph();
    if (!active || active.state !== 'suspended') return;
    void active.resume().catch((error) => warn('audio: resume rejected', error));
  }

  function stopAll(): void {
    for (const voice of [...voices]) releaseVoice(voice);
    musicRequestSeq += 1;
    pendingMusicCueId = null;
    musicVoice = null;
    musicCueId = null;
    ducks = [];
    syncSettings();
  }

  return {
    play,
    playEvents,
    playMusic,
    stopMusic,
    preload,
    unlock,
    stopAll,
    syncSettings,
    debugState: () => ({
      voices: voices.length,
      loaded: buffers.size,
      failed: failed.size,
      contextState: ctx?.state ?? null,
    }),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
