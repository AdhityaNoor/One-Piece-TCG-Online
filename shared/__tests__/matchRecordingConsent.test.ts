/**
 * The consent rule is small enough that its edges are the whole story: what an
 * unanswered seat means, and what a single decline does to the other seat.
 */
import { describe, expect, it } from 'vitest';
import { decliningSeatIds, shouldRecordMatch } from '../matchRecordingConsent';

describe('shouldRecordMatch', () => {
  it('records when both seats agree', () => {
    expect(shouldRecordMatch([
      { seatId: 'p1', contributeMatchData: true },
      { seatId: 'p2', contributeMatchData: true },
    ])).toBe(true);
  });

  it('is stopped by ONE decline, whichever seat it is', () => {
    // The point of the rule: a trajectory covers both players, so the seat that
    // declined cannot be excluded from a recording of the other seat's match.
    expect(shouldRecordMatch([
      { seatId: 'p1', contributeMatchData: false },
      { seatId: 'p2', contributeMatchData: true },
    ])).toBe(false);
    expect(shouldRecordMatch([
      { seatId: 'p1', contributeMatchData: true },
      { seatId: 'p2', contributeMatchData: false },
    ])).toBe(false);
  });

  it('treats an unanswered seat as consent, matching the shipped default', () => {
    // An older client that does not send the field must behave as it does
    // today, or shipping this change would silently switch recording off.
    expect(shouldRecordMatch([{ seatId: 'p1' }, { seatId: 'p2' }])).toBe(true);
    expect(shouldRecordMatch([
      { seatId: 'p1' },
      { seatId: 'p2', contributeMatchData: false },
    ])).toBe(false);
  });

  it('does not treat an empty room as consent', () => {
    expect(shouldRecordMatch([])).toBe(false);
  });
});

describe('decliningSeatIds', () => {
  it('names only the seats that actually said no', () => {
    expect(decliningSeatIds([
      { seatId: 'p1', contributeMatchData: false },
      { seatId: 'p2' },
    ])).toEqual(['p1']);
  });
});
