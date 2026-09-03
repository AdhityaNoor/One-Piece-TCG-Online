# Candidate weight sets

Each file is a partial `EvaluatorWeights` override, merged onto
`DEFAULT_EVALUATOR_WEIGHTS`. Feed one to the arena:

    npx tsx scripts/ai-sim/validateWeights.ts \
      --weights=scripts/ai-sim/candidates/fast-wide-search.json \
      --diff=hard --pairs=30

Note: `validateWeights.ts` with NO `--weights` compares the baseline against
itself. That is a useful calibration check (it should read ~50%), but it is not
a test of anything else — pass the file.

## fast-wide-search.json

The open question from Stage 2. `projectOpponentTurn` plays out the opponent's
whole next turn at every lookahead leaf; measured, it costs ~2.2x per decision
and changes the chosen action in only 4.4% of them. Dropping it and spending the
budget on twice the search width still runs ~1.9x faster than today's hard.

Ship it only if it holds parity over 200+ hard games. Hard games are ~6s each,
so `--pairs=30` across 4 matchups is 240 games — budget ~25 minutes.

The 4.4% it changes are plausibly the defensive "do I die on the crack-back"
reads the projection exists for, so parity is the bar, not a win.

## The confound, and the two files that resolve it

`fast-wide-search.json` changes TWO things at once — skip the projection AND
double the search width — which is a badly designed experiment. Measured at hard
over 27 games it split hard:

    tuned     78.6% [52.4-92.4]  11W-3L  SIGNIFICANT
    held-out  20.0% [ 5.7-51.0]   2W-8L

Helps one family of matchups, hurts the other. The held-out pool is where the
grindy leaders live (OP04-001 cannot attack at all; OP03-021, OP02-093), which is
exactly where losing the opponent-turn projection should hurt: it is the AI's
"do I die on the crack-back" read.

But with both changes bundled, the gain cannot be attributed. So:

- `wider-search-only.json` — `lookaheadTopK: 16`, projection KEPT. If the tuned-pool
  gain survives here, wider search is a free strength win (it costs time, not skill).
- `skip-projection-only.json` — projection dropped, width unchanged. Isolates what
  the projection is actually worth.

### Result so far (2026-08-30)

`skip-projection-only` over 11 hard games reproduces the SAME split without any
width change — so the split is caused by dropping the projection, not by the
wider search:

    tuned     83.3% [43.6-97.0]  5W-1L
    held-out  40.0% [11.8-76.9]  2W-3L   (3 of 5 timed out)

Small sample, but it matches the mechanism predicted in advance: the projection
is the AI's defensive read, and the held-out pool is where defence decides games.

CAVEAT on the earlier 27-game `fast-wide-search` numbers (tuned 78.6% SIGNIFICANT
/ held-out 20.0%): those were collected BEFORE adjudication existed, so unfinished
games were dropped from the denominator. Whether a game finishes correlates with
the weakness being measured, so treat those figures as directional only.

Run each against baseline at hard before concluding anything about either:

    npx tsx scripts/ai-sim/longArena.ts \
      --weights=scripts/ai-sim/candidates/wider-search-only.json \
      --diff=hard --target=60 --budget=50 \
      --checkpoint=wider-only.checkpoint.json

DO NOT ship `fast-wide-search.json`. On the evidence it trades away control
matchups for aggro ones, which is a worse CPU, not a faster one.

## policy-prior-selfplay.json — REJECTED (expected)

An action policy (`scripts/ai-sim/fitPolicy.ts`) fitted to 74 self-play games,
winners' decisions only, applied at `strength: 8`.

```
tuned matchups   : 45.6% [38.1%-53.4%] | 73W-87L | not significant
held-out matchups: 47.5% [39.9%-55.2%] | 76W-84L | not significant
```

This candidate exists to be rejected, and the number is the point rather than a
disappointment. The model was fitted to decisions the CPU itself made, so the
best it can do is reproduce the evaluator it is supposed to improve — held-out
top-1 was 54.8% against a 22.0% random baseline, which says the pipeline works
and says nothing whatever about play quality. Adding a noisy copy of the
existing ranking on top of the existing ranking is, unsurprisingly, not an
improvement.

Re-fit this against `--source=online` rows (matches between people) before
drawing any conclusion about whether the policy prior helps. Keep the file: it
is the control that makes the human-data number interpretable.
