/**
 * Per-seat hidden-information redaction.
 *
 * The implementation moved to src/engine/view/redactState.ts so the OFFLINE
 * replay path can reuse it: reconstructing training rows has exactly the same
 * requirement as sending state over the wire — never hand out a view of the
 * game that the seat in question could not legally have seen. Two copies of a
 * visibility rule is how a leak gets introduced, so there is only one.
 *
 * This module stays as the server's import site so room code is untouched.
 */
export {
  HIDDEN_CARD_DEF_ID,
  filterLogForSeat,
  redactStateForSeat,
  type RedactedView,
} from '../../../src/engine/view/redactState';
