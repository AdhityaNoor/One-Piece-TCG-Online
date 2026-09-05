/**
 * Owns the music while a match is on screen.
 *
 * The menu bed (BacksoundControl's <audio> element) plays everywhere else and
 * knows nothing about matches, so this hook takes the handover explicitly:
 * suspend the menu bed, start the battle bed on the mixer's music bus, and
 * give it all back on the way out. Doing it through the mixer rather than a
 * second <audio> element is what lets a K.O. or a Life break duck the music,
 * and puts the bed under the same music slider as everything else.
 *
 * Layer 5 (presentation). It reads the match's gameOver flag and nothing else;
 * it never touches game state.
 */
import { useEffect } from 'react';
import { setMenuBedSuspended, soundManager } from '../../audio';

/** Fade used when the match ends and the result music takes over. */
const RESULT_FADE_MS = 450;

export interface MatchMusicOptions {
  /** False while the board is still being built — no bed until there is a match. */
  active: boolean;
  /** Null while the game is live; the local seat's result once it is over. */
  outcome: 'win' | 'lose' | null;
}

export function useMatchMusic({ active, outcome }: MatchMusicOptions): void {
  useEffect(() => {
    if (!active) return;
    // Hold the menu bed for as long as this screen is mounted, including
    // across the result screen — coming back to it mid-fanfare is jarring.
    setMenuBedSuspended(true);
    return () => {
      setMenuBedSuspended(false);
      soundManager.stopMusic();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (outcome === null) {
      soundManager.playMusic('music.battle');
      return;
    }
    // playMusic crossfades, so the battle loop bows out under the result
    // music rather than being cut off under the win/lose stinger.
    soundManager.playMusic(outcome === 'win' ? 'music.victory' : 'music.defeat', RESULT_FADE_MS);
  }, [active, outcome]);
}
