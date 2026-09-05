/**
 * Public surface of the audio layer (Layer 5 — presentation).
 *
 * Play something:      playCue('ui.confirm')
 * Play a match batch:  soundManager.playEvents(parseSoundCues(prev, delta, opts))
 * Change the bed:      soundManager.playMusic('music.battle')
 *
 * Real recordings live in public/audio/sfx/src/ and are shared across cues,
 * pitch-shifted per cue. The dozen cues still on a generated placeholder are
 * flagged in public/audio/sfx/manifest.json. Swapping a placeholder .ogg in
 * place needs no code change. See docs/09-audio-and-sound-design.md.
 */
export {
  SOUND_CUES,
  SOUND_CUE_IDS,
  cuesInGroup,
  isSoundCueId,
  type SoundBus,
  type SoundCueDef,
  type SoundCueEvent,
  type SoundCueId,
  type SoundPreloadGroup,
} from './cues';
export {
  createSoundManager,
  MAX_TOTAL_VOICES,
  type AudioSettingsSnapshot,
  type PlayOptions,
  type PlayOutcome,
  type SoundManager,
  type SoundManagerDeps,
} from './soundManager';
export { AUDIO_STAGGER_MS, parseSoundCues, type ParseSoundCuesOptions } from './matchCues';
export { resolveClickCue, resolveHoverCue, type CueElementLike } from './uiCues';
export {
  configureAudioSettings,
  installAudioUnlock,
  isMenuBedSuspended,
  setMenuBedSuspended,
  soundManager,
  subscribeMenuBed,
} from './runtime';

import type { PlayOptions, PlayOutcome } from './soundManager';
import type { SoundCueId } from './cues';
import { soundManager } from './runtime';

/** Fire-and-forget one cue. Never throws; returns why it was dropped, if it was. */
export function playCue(cueId: SoundCueId, options?: PlayOptions): PlayOutcome {
  return soundManager.play(cueId, options);
}
