/**
 * Regression tests for the beat-progress rule. These are cheap, but they pin
 * the exact defect that made the tutorial skip a step in live play while every
 * engine-level test stayed green: progress leaking from one beat to the next.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_BEAT_PROGRESS, noteProgress, progressFor } from './tutorialBeatProgress';

describe('beat progress belongs to the beat that earned it', () => {
  it('counts dispatches for the beat they were made on', () => {
    let progress = noteProgress(EMPTY_BEAT_PROGRESS, 'a', { dispatches: 1 });
    expect(progressFor(progress, 'a').dispatches).toBe(1);
    progress = noteProgress(progress, 'a', { dispatches: progressFor(progress, 'a').dispatches + 1 });
    expect(progressFor(progress, 'a').dispatches).toBe(2);
  });

  it('reads ZERO for a different beat, even before anything has reset it', () => {
    // This is the whole point. The old implementation reset the counter in an
    // effect, so between advancing the beat and that effect running, beat 'b'
    // saw beat 'a''s count and considered itself already done.
    const progress = noteProgress(EMPTY_BEAT_PROGRESS, 'a', { dispatches: 1 });
    expect(progressFor(progress, 'b').dispatches, "beat 'b' must not inherit beat 'a''s progress").toBe(0);
    expect(progressFor(progress, 'b').sawPrompt).toBe(false);
  });

  it('does not carry a seen prompt across beats either', () => {
    const progress = noteProgress(EMPTY_BEAT_PROGRESS, 'a', { sawPrompt: true });
    expect(progressFor(progress, 'a').sawPrompt).toBe(true);
    expect(progressFor(progress, 'b').sawPrompt, 'a prompt seen on one beat must not complete the next').toBe(false);
  });

  it('replaces, rather than merges, when the beat changes', () => {
    let progress = noteProgress(EMPTY_BEAT_PROGRESS, 'a', { dispatches: 3, sawPrompt: true });
    progress = noteProgress(progress, 'b', { dispatches: 1 });
    expect(progress).toEqual({ beatId: 'b', dispatches: 1, sawPrompt: false });
  });
});
