/**
 * Tutorial sound cues. Thin adapter onto the shared audio layer (/src/audio)
 * so the tutorial's vocabulary ('draw', 'lifeBreak', ...) maps onto the same
 * cue registry, mixer, throttling and user settings as the real match — there
 * is no second audio path any more.
 *
 * The underlying assets in public/audio/sfx/ are placeholders; replacing one
 * changes both the tutorial and the live game at once.
 */
import { playCue } from '../../audio';
import type { SoundCueId } from '../../audio';

export type TutorialSoundCue = 'draw' | 'place' | 'donAttach' | 'attack' | 'counter' | 'lifeBreak' | 'success' | 'confirm';

const CUE_BY_STEP: Record<TutorialSoundCue, SoundCueId> = {
  draw: 'card.draw',
  place: 'card.play.character',
  donAttach: 'don.attach',
  attack: 'battle.attack.declare',
  counter: 'battle.counter.card',
  lifeBreak: 'battle.life.take',
  success: 'ui.success',
  confirm: 'ui.confirm',
};

export function playTutorialCue(cue: TutorialSoundCue): void {
  playCue(CUE_BY_STEP[cue]);
}
