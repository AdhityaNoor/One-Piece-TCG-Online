/**
 * "How far is the player through THIS beat" — deliberately a tiny module of
 * its own, because getting it wrong is subtle and expensive.
 *
 * THE BUG THIS EXISTS TO PREVENT. Progress was once a bare `useRef(0)` reset
 * by an effect keyed on the beat index. React runs effects AFTER the render
 * that already advanced the beat, so for one render the NEW beat was measured
 * against the OLD beat's count. Usually a second render (from `setLineIndex(0)`)
 * corrected it in time — but when the outgoing beat had a single line that
 * setState was a no-op, no second render happened, and the incoming beat read
 * as already satisfied and auto-advanced with the player never touching the
 * board. A whole "end your turn" step vanished that way, leaving the engine a
 * turn behind the script and every later scripted action illegal.
 *
 * The fix is structural rather than a timing tweak: a count is stored WITH the
 * id of the beat that earned it, so progress belonging to another beat is not
 * something this type can express.
 */

export interface BeatProgress {
  beatId: string;
  /** Engine-accepted dispatches that satisfied this beat's own scripted action. */
  dispatches: number;
  /** Whether a PendingChoice for the studying player has been seen while this beat was current. */
  sawPrompt: boolean;
}

export const EMPTY_BEAT_PROGRESS: BeatProgress = { beatId: '', dispatches: 0, sawPrompt: false };

/** Progress for `beatId`, or a zeroed record when the stored progress belongs to a different beat. */
export function progressFor(stored: BeatProgress, beatId: string): BeatProgress {
  return stored.beatId === beatId ? stored : { beatId, dispatches: 0, sawPrompt: false };
}

/** Records progress against `beatId`, discarding anything another beat had accumulated. */
export function noteProgress(stored: BeatProgress, beatId: string, patch: Partial<Omit<BeatProgress, 'beatId'>>): BeatProgress {
  return { ...progressFor(stored, beatId), ...patch, beatId };
}
