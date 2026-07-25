/**
 * Tutorial sound cues. The project spec calls for contextual SFX (draw,
 * placement, DON!! attachment, attacks, counter, life break, success,
 * confirmation) — this repo currently only ships two audio assets
 * (`/audio/main-menu-backsound.mp3`, `/audio/ui-click.wav`; see
 * BacksoundControl.tsx), no per-action gameplay SFX exist yet. Rather than
 * silently doing nothing (or blocking the tutorial on asset production),
 * every cue below maps onto the one confirmation-style click that DOES
 * exist, respecting the user's existing sfxEnabled/sfxVolume settings — this
 * is a deliberate, documented placeholder (see cueUrl's TODO map), not a
 * finished sound design. Swapping in real per-cue assets later is a one-line
 * change per entry, nothing structural.
 */
import { useSettingsStore } from '../../app/store/settingsStore';

export type TutorialSoundCue = 'draw' | 'place' | 'donAttach' | 'attack' | 'counter' | 'lifeBreak' | 'success' | 'confirm';

/** TODO(tutorial-audio): replace every entry with its own real asset once sound design ships — tracked as a known limitation, not silently faked. */
const CUE_URL: Record<TutorialSoundCue, string> = {
  draw: '/audio/ui-click.wav',
  place: '/audio/ui-click.wav',
  donAttach: '/audio/ui-click.wav',
  attack: '/audio/ui-click.wav',
  counter: '/audio/ui-click.wav',
  lifeBreak: '/audio/ui-click.wav',
  success: '/audio/ui-click.wav',
  confirm: '/audio/ui-click.wav',
};

let sharedAudio: HTMLAudioElement | null = null;

export function playTutorialCue(cue: TutorialSoundCue): void {
  const { sfxEnabled, sfxVolume } = useSettingsStore.getState();
  if (!sfxEnabled || typeof Audio === 'undefined') return;
  try {
    if (!sharedAudio) sharedAudio = new Audio();
    sharedAudio.src = CUE_URL[cue];
    sharedAudio.volume = Math.max(0, Math.min(1, sfxVolume));
    sharedAudio.currentTime = 0;
    void sharedAudio.play().catch(() => {
      /* autoplay/user-gesture rejection — safe to ignore for a UI cue */
    });
  } catch {
    /* never let a missing/broken audio asset break the tutorial */
  }
}
