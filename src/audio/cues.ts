/**
 * The sound cue catalogue — Layer 5 (presentation) only. Nothing here is game
 * state and nothing in /src/engine may import it.
 *
 * A cue is ONE gesture: something the player did, or something the rules did
 * that the player should hear. Engine log entries are mapped onto cues in
 * matchCues.ts; UI components fire them directly via playCue().
 *
 * ASSETS. Most cues now play a real recording from public/audio/sfx/src/ —
 * eight files covering click, alert, card, impact, victory, defeat and the two
 * music beds. A handful of cues (hover ticks, shuffles, whooshes, the effect
 * sparkle layer) have no recording that fits and still play the generated
 * placeholder from scripts/audio/generate.py; they are marked PLACEHOLDER
 * below. Replacing any of them means dropping a new .ogg at the same path.
 * See docs/09-audio-and-sound-design.md.
 */

/**
 * Mix buses. Each gets its own gain node so whole categories can be ducked or
 * trimmed without touching individual cues.
 *  - ui      menus, buttons, deck builder. Always allowed, even outside a match.
 *  - game    match flow: phases, card motion, DON!!, prompts.
 *  - battle  combat and card effects — the loudest, most transient layer.
 *  - stinger rare, deliberately dominant moments; ducks music while it plays.
 *  - music   looping beds.
 */
export type SoundBus = 'ui' | 'game' | 'battle' | 'stinger' | 'music';

/** When the asset is fetched. 'boot' at app start, 'match' when a board mounts, 'lazy' on first play. */
export type SoundPreloadGroup = 'boot' | 'match' | 'lazy';

export interface SoundCueDef {
  /** Public path of the asset. Stable contract: swap the file, keep the path. */
  src: string;
  bus: SoundBus;
  /** Static mix trim (0..1). This is the SOUND DESIGN level, not a user setting. */
  gain: number;
  /** Minimum gap between two plays of this cue; calls inside the window are dropped. */
  throttleMs: number;
  /** Cap on simultaneous voices for this one cue. */
  maxVoices: number;
  /** Higher survives when the global voice cap is reached. */
  priority: number;
  /** Per-play random detune (± cents) so repeats of the same cue don't machine-gun. */
  detuneCents: number;
  /**
   * Fixed pitch shift in cents, applied on top of the random spread. This is
   * what lets many cues share one recording and still read as separate
   * gestures: a K.O. is the attack sample dropped half an octave, a [Blocker]
   * is the same sample lifted. 0 plays the asset at its recorded pitch.
   */
  detuneBiasCents: number;
  /** Duck the music bus to this factor while the cue plays (1 = no ducking). */
  duckMusicTo: number;
  loop: boolean;
  group: SoundPreloadGroup;
}

/** Defaults every cue starts from; each entry below overrides only what differs. */
const BASE = {
  gain: 0.8,
  throttleMs: 40,
  maxVoices: 3,
  priority: 5,
  detuneCents: 25,
  detuneBiasCents: 0,
  duckMusicTo: 1,
  loop: false,
  group: 'match',
} satisfies Omit<SoundCueDef, 'src' | 'bus'>;

function cue(src: string, bus: SoundBus, overrides: Partial<SoundCueDef> = {}): SoundCueDef {
  return { ...BASE, src, bus, ...overrides };
}

/* ---------------------------------------------------------- source assets */
/**
 * The recordings. Many cues point at the same file on purpose — soundManager
 * keys its buffer cache by URL, so every click-flavoured cue in the app
 * decodes exactly once and costs one download.
 */
const CLICK = '/audio/sfx/src/ui-click.ogg';
const ALERT = '/audio/sfx/src/ui-alert2.ogg';
const CARD = '/audio/sfx/src/draw-card.ogg';
const IMPACT = '/audio/sfx/src/attack.ogg';
const VICTORY = '/audio/sfx/src/victory.ogg';
const DEFEAT = '/audio/sfx/src/defeat.ogg';
const BED_BATTLE = '/audio/sfx/src/battle.ogg';
const BED_MENU = '/audio/sfx/src/main2.ogg';

/** Still a generated placeholder — nothing in the drop fits this gesture yet. */
const ph = (folder: string, name: string) => `/audio/sfx/${folder}/${name}.ogg`;

const ui = (src: string, o?: Partial<SoundCueDef>) => cue(src, 'ui', { group: 'boot', ...o });
const game = (src: string, o?: Partial<SoundCueDef>) => cue(src, 'game', o);
const battle = (src: string, o?: Partial<SoundCueDef>) => cue(src, 'battle', o);

export const SOUND_CUES = {
  // ------------------------------------------------------------------- UI
  // Hover is the one place a synthetic tick beats a recorded click: it fires
  // on every pointer move across a card grid, where a 260ms sample would
  // smear into mush. PLACEHOLDER, deliberately.
  'ui.hover': ui(ph('ui', 'hover'), { gain: 0.22, throttleMs: 55, priority: 1, maxVoices: 2 }),
  'ui.card.hover': ui(ph('ui', 'card-hover'), { gain: 0.2, throttleMs: 60, priority: 1, maxVoices: 2 }),

  'ui.click': ui(CLICK, { gain: 0.5, throttleMs: 45, priority: 4 }),
  'ui.confirm': ui(CLICK, { gain: 0.62, priority: 6, detuneBiasCents: 200 }),
  'ui.back': ui(CLICK, { gain: 0.5, detuneBiasCents: -250 }),
  'ui.toggle.on': ui(CLICK, { gain: 0.5, detuneBiasCents: 150 }),
  'ui.toggle.off': ui(CLICK, { gain: 0.5, detuneBiasCents: -150 }),
  'ui.tab': ui(CLICK, { gain: 0.42, detuneBiasCents: 80 }),
  'ui.modal.open': ui(ALERT, { gain: 0.45, detuneBiasCents: -100 }),
  'ui.modal.close': ui(CLICK, { gain: 0.4, detuneBiasCents: -300 }),
  'ui.error': ui(ALERT, { gain: 0.55, throttleMs: 220, priority: 7, detuneBiasCents: -300 }),
  'ui.success': ui(ALERT, { gain: 0.55, throttleMs: 200, priority: 7, detuneBiasCents: 250 }),
  'ui.notify': ui(ALERT, { gain: 0.45, throttleMs: 300 }),
  'ui.slider.tick': ui(CLICK, { gain: 0.15, throttleMs: 70, priority: 1, maxVoices: 2, detuneBiasCents: 500 }),
  // A whoosh, not a click. PLACEHOLDER.
  'ui.screen.transition': ui(ph('ui', 'screen-transition'), { gain: 0.45, throttleMs: 250, maxVoices: 1 }),
  // The logo sting is its own composed piece. PLACEHOLDER.
  'ui.brand.stinger': ui(ph('ui', 'brand-stinger'), { gain: 0.75, throttleMs: 2000, maxVoices: 1, priority: 9, duckMusicTo: 0.35 }),
  'ui.card.detail.open': ui(CLICK, { gain: 0.45, detuneBiasCents: 120 }),
  'ui.card.detail.close': ui(CLICK, { gain: 0.4, detuneBiasCents: -200 }),
  'ui.deck.add': ui(CARD, { gain: 0.5, throttleMs: 55, detuneBiasCents: 150 }),
  'ui.deck.remove': ui(CARD, { gain: 0.45, throttleMs: 55, detuneBiasCents: -200 }),
  'ui.deck.save': ui(ALERT, { gain: 0.6, throttleMs: 400, priority: 7, detuneBiasCents: 150 }),
  'ui.deck.invalid': ui(ALERT, { gain: 0.6, throttleMs: 400, priority: 7, detuneBiasCents: -400 }),
  'ui.chat.send': ui(CLICK, { gain: 0.35, throttleMs: 120, detuneBiasCents: 300 }),
  'ui.chat.receive': ui(CLICK, { gain: 0.4, throttleMs: 400, detuneBiasCents: 450 }),
  // A searching loop, not a one-shot. PLACEHOLDER.
  'ui.matchmaking.search': ui(ph('ui', 'matchmaking-search'), { gain: 0.5, throttleMs: 1000, maxVoices: 1 }),
  'ui.matchmaking.found': ui(ALERT, { gain: 0.75, throttleMs: 1500, maxVoices: 1, priority: 9, duckMusicTo: 0.4 }),
  'ui.rank.up': ui(VICTORY, { gain: 0.8, throttleMs: 2000, maxVoices: 1, priority: 9, duckMusicTo: 0.3, detuneCents: 0 }),
  'ui.unlock': ui(ALERT, { gain: 0.65, throttleMs: 500, priority: 8, detuneBiasCents: 350 }),

  // ---------------------------------------------------------------- MATCH
  'match.start': game(ALERT, { gain: 0.8, maxVoices: 1, priority: 9, duckMusicTo: 0.35, detuneBiasCents: -150 }),
  'match.rps.throw': game(CARD, { gain: 0.55, detuneBiasCents: 200 }),
  'match.rps.win': game(ALERT, { gain: 0.7, priority: 8, detuneBiasCents: 300 }),
  'match.rps.lose': game(ALERT, { gain: 0.65, priority: 8, detuneBiasCents: -450 }),
  // A riffle is many cards at once — one card sample can't fake it. PLACEHOLDER.
  'match.mulligan.shuffle': game(ph('match', 'mulligan-shuffle'), { gain: 0.6, maxVoices: 1, throttleMs: 300 }),
  'match.deal': game(CARD, { gain: 0.4, throttleMs: 20, maxVoices: 6, detuneCents: 60, priority: 3 }),
  'match.leader.reveal': game(IMPACT, { gain: 0.8, maxVoices: 1, priority: 9, duckMusicTo: 0.4, detuneBiasCents: -200 }),
  'match.concede': game(ALERT, { gain: 0.7, maxVoices: 1, priority: 8, detuneBiasCents: -500 }),

  // ----------------------------------------------------------------- TURN
  'turn.begin.you': game(ALERT, { gain: 0.6, maxVoices: 1, throttleMs: 400, priority: 8, duckMusicTo: 0.6, detuneBiasCents: 100 }),
  'turn.begin.opponent': game(ALERT, { gain: 0.5, maxVoices: 1, throttleMs: 400, priority: 8, duckMusicTo: 0.6, detuneBiasCents: -350 }),

  // ---------------------------------------------------------------- PHASE
  'phase.refresh': game(CARD, { gain: 0.4, maxVoices: 1, throttleMs: 300, detuneBiasCents: -150 }),
  'phase.draw': game(CARD, { gain: 0.4, maxVoices: 1, throttleMs: 300, detuneBiasCents: -40 }),
  'phase.don': game(CARD, { gain: 0.45, maxVoices: 1, throttleMs: 300, detuneBiasCents: 250 }),
  'phase.main': game(CLICK, { gain: 0.35, maxVoices: 1, throttleMs: 300, detuneBiasCents: -200 }),
  'phase.end': game(CLICK, { gain: 0.35, maxVoices: 1, throttleMs: 300, detuneBiasCents: -400 }),

  // ----------------------------------------------------------------- CARD
  'card.draw': game(CARD, { gain: 0.5, throttleMs: 25, maxVoices: 5, detuneCents: 55, priority: 4 }),
  'card.play.character': game(CARD, { gain: 0.65, detuneCents: 45, priority: 6, detuneBiasCents: -150 }),
  'card.play.stage': game(CARD, { gain: 0.65, priority: 6, detuneBiasCents: -300 }),
  'card.play.event': game(CARD, { gain: 0.6, priority: 6, detuneBiasCents: 150 }),
  'card.move': game(CARD, { gain: 0.35, throttleMs: 25, maxVoices: 5, detuneCents: 60, priority: 3, detuneBiasCents: 100 }),
  'card.return.hand': game(CARD, { gain: 0.5, detuneCents: 40, detuneBiasCents: 280 }),
  'card.trash': game(CARD, { gain: 0.5, throttleMs: 25, maxVoices: 4, detuneCents: 50, detuneBiasCents: -400 }),
  'card.rest': game(CLICK, { gain: 0.4, throttleMs: 25, maxVoices: 4, detuneCents: 55, priority: 3, detuneBiasCents: -150 }),
  'card.setactive': game(CLICK, { gain: 0.35, throttleMs: 25, maxVoices: 5, detuneCents: 60, priority: 2, detuneBiasCents: 150 }),
  'card.reveal': game(CARD, { gain: 0.55, detuneCents: 40, priority: 6, detuneBiasCents: 350 }),

  // ----------------------------------------------------------------- DECK
  // See match.mulligan.shuffle. PLACEHOLDER.
  'deck.shuffle': game(ph('deck', 'shuffle'), { gain: 0.55, maxVoices: 1, throttleMs: 400 }),

  // ------------------------------------------------------------------ DON
  'don.draw': game(CARD, { gain: 0.5, throttleMs: 20, maxVoices: 6, detuneCents: 45, priority: 4, detuneBiasCents: 300 }),
  'don.attach': game(CLICK, { gain: 0.5, throttleMs: 25, maxVoices: 5, detuneCents: 45, priority: 5, detuneBiasCents: 200 }),
  'don.return': game(CLICK, { gain: 0.45, throttleMs: 25, maxVoices: 4, detuneCents: 45, detuneBiasCents: -220 }),
  'don.rest': game(CLICK, { gain: 0.3, throttleMs: 20, maxVoices: 6, detuneCents: 70, priority: 2, detuneBiasCents: -100 }),
  'don.refresh': game(CARD, { gain: 0.5, maxVoices: 1, throttleMs: 300, detuneBiasCents: 200 }),

  // --------------------------------------------------------------- BATTLE
  // The whole combat layer is one impact recording, pitched. Down = heavier
  // (leader hit, K.O., Life taken); up = lighter (blocker, fizzle).
  'battle.attack.declare': battle(IMPACT, { gain: 0.7, maxVoices: 2, priority: 7 }),
  'battle.attack.leader': battle(IMPACT, { gain: 0.8, maxVoices: 2, priority: 8, detuneBiasCents: -250 }),
  'battle.blocker': battle(IMPACT, { gain: 0.7, maxVoices: 2, priority: 7, detuneBiasCents: 300 }),
  'battle.counter.card': battle(CARD, { gain: 0.6, maxVoices: 3, detuneCents: 40, priority: 6, detuneBiasCents: -200 }),
  'battle.counter.event': battle(IMPACT, { gain: 0.7, maxVoices: 2, priority: 7, detuneBiasCents: 450 }),
  'battle.clash': battle(IMPACT, { gain: 0.75, maxVoices: 2, detuneCents: 35, priority: 7, detuneBiasCents: 150 }),
  'battle.nullified': battle(IMPACT, { gain: 0.55, maxVoices: 2, priority: 6, detuneBiasCents: 600 }),
  'battle.ko': battle(IMPACT, { gain: 0.9, maxVoices: 2, detuneCents: 30, priority: 9, duckMusicTo: 0.6, detuneBiasCents: -500 }),
  'battle.life.take': battle(IMPACT, { gain: 0.85, maxVoices: 2, throttleMs: 90, priority: 9, duckMusicTo: 0.55, detuneBiasCents: -400 }),
  'battle.trigger.reveal': battle(ALERT, { gain: 0.8, maxVoices: 1, priority: 9, duckMusicTo: 0.4, detuneBiasCents: 400 }),

  // --------------------------------------------------------------- EFFECT
  // The effect layer stays on its generated sparkles: activate/resolve fire
  // several times per resolution chain, and a recorded click there turns an
  // effect chain into typing. PLACEHOLDER — the clearest gap in the set.
  'effect.activate': battle(ph('effect', 'activate'), { gain: 0.55, throttleMs: 60, maxVoices: 3, detuneCents: 40, priority: 5 }),
  'effect.resolve': battle(ph('effect', 'resolve'), { gain: 0.4, throttleMs: 70, maxVoices: 3, detuneCents: 45, priority: 3 }),
  'effect.buff': battle(ph('effect', 'buff'), { gain: 0.6, throttleMs: 45, maxVoices: 4, detuneCents: 50 }),
  'effect.debuff': battle(ph('effect', 'debuff'), { gain: 0.6, throttleMs: 45, maxVoices: 4, detuneCents: 50 }),
  'effect.search': battle(ph('effect', 'search'), { gain: 0.55, maxVoices: 1, throttleMs: 300 }),
  'effect.negate': battle(IMPACT, { gain: 0.6, maxVoices: 2, priority: 7, detuneBiasCents: 550 }),

  // --------------------------------------------------------------- PROMPT
  // CHOICE_REQUESTED — the board is waiting on this player. Same alert as a
  // modal, a touch brighter, because it interrupts play rather than a menu.
  'prompt.open': game(ALERT, { gain: 0.5, maxVoices: 1, throttleMs: 150, priority: 7, detuneBiasCents: -50 }),
  'prompt.select': game(CLICK, { gain: 0.35, throttleMs: 40, detuneCents: 55, priority: 4, detuneBiasCents: 250 }),
  'prompt.confirm': game(CLICK, { gain: 0.5, priority: 6, detuneBiasCents: 180 }),
  'prompt.cancel': game(CLICK, { gain: 0.45, priority: 6, detuneBiasCents: -340 }),

  // -------------------------------------------------------------- STINGER
  'stinger.life.critical': cue(ALERT, 'stinger', { gain: 0.8, maxVoices: 1, throttleMs: 5000, priority: 10, duckMusicTo: 0.3, detuneBiasCents: -500 }),
  'stinger.game.win': cue(VICTORY, 'stinger', { gain: 0.95, maxVoices: 1, throttleMs: 5000, priority: 10, duckMusicTo: 0.15, detuneCents: 0 }),
  'stinger.game.lose': cue(DEFEAT, 'stinger', { gain: 0.9, maxVoices: 1, throttleMs: 5000, priority: 10, duckMusicTo: 0.15, detuneCents: 0 }),

  // ---------------------------------------------------------------- MUSIC
  // Beds never detune — a pitched loop drifts against itself on every restart.
  'music.menu': cue(BED_MENU, 'music', { gain: 1, loop: true, maxVoices: 1, group: 'lazy', priority: 0, detuneCents: 0 }),
  'music.battle': cue(BED_BATTLE, 'music', { gain: 1, loop: true, maxVoices: 1, group: 'lazy', priority: 0, detuneCents: 0 }),
  'music.battle.tense': cue(BED_BATTLE, 'music', { gain: 1, loop: true, maxVoices: 1, group: 'lazy', priority: 0, detuneCents: 0 }),
  'music.victory': cue(VICTORY, 'music', { gain: 1, loop: false, maxVoices: 1, group: 'lazy', priority: 0, detuneCents: 0 }),
  'music.defeat': cue(DEFEAT, 'music', { gain: 1, loop: false, maxVoices: 1, group: 'lazy', priority: 0, detuneCents: 0 }),
} satisfies Record<string, SoundCueDef>;

export type SoundCueId = keyof typeof SOUND_CUES;

export const SOUND_CUE_IDS = Object.keys(SOUND_CUES) as SoundCueId[];

export function isSoundCueId(value: unknown): value is SoundCueId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SOUND_CUES, value);
}

export function cuesInGroup(group: SoundPreloadGroup): SoundCueId[] {
  return SOUND_CUE_IDS.filter((id) => SOUND_CUES[id].group === group);
}

/** A cue scheduled relative to "now" — what matchCues.ts produces. */
export interface SoundCueEvent {
  cueId: SoundCueId;
  /** Milliseconds from the moment the batch is fired. */
  delayMs: number;
  /** Extra per-event trim on top of the cue's static gain (0..1). */
  gain?: number;
}
