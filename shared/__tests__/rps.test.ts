/**
 * The RPS cycle and its draw handling. Worth exhaustive coverage despite being
 * nine lines of logic: this is the ONLY thing standing between the server's
 * verdict and the client's, and a single flipped pair would hand the wrong
 * player the first-turn decision in a way that looks like a networking bug.
 */
import { describe, expect, it } from 'vitest';
import {
  applyRpsPick,
  beats,
  createRpsToss,
  lockedRpsIds,
  nextRpsRound,
  rpsPublicView,
  isRpsChoice,
  randomRpsChoice,
  resolveRpsRound,
  RPS_CHOICES,
  RPS_PRESENTATION,
  type RpsChoice,
} from '../rps';

describe('RPS rules', () => {
  it('implements the three canonical beats', () => {
    expect(beats('rock', 'scissors')).toBe(true);
    expect(beats('scissors', 'paper')).toBe(true);
    expect(beats('paper', 'rock')).toBe(true);
  });

  it('has no choice that beats itself', () => {
    for (const choice of RPS_CHOICES) expect(beats(choice, choice)).toBe(false);
  });

  it('is strictly asymmetric across the whole matrix', () => {
    // For every ordered pair of DIFFERENT choices, exactly one direction wins.
    for (const a of RPS_CHOICES) {
      for (const b of RPS_CHOICES) {
        if (a === b) continue;
        expect(beats(a, b)).toBe(!beats(b, a));
      }
    }
  });

  it('gives every choice exactly one win and one loss', () => {
    for (const a of RPS_CHOICES) {
      const wins = RPS_CHOICES.filter((b) => beats(a, b));
      const losses = RPS_CHOICES.filter((b) => beats(b, a));
      expect(wins).toHaveLength(1);
      expect(losses).toHaveLength(1);
    }
  });

  it('resolves a round to the right side regardless of argument order', () => {
    const home = { id: 'p1' as const, choice: 'rock' as RpsChoice };
    const away = { id: 'p2' as const, choice: 'scissors' as RpsChoice };
    expect(resolveRpsRound(home, away)).toEqual({ winnerId: 'p1', loserId: 'p2', draw: false });
    // Swapping the arguments must not swap the winner — the ids carry the identity.
    expect(resolveRpsRound(away, home)).toEqual({ winnerId: 'p1', loserId: 'p2', draw: false });
  });

  it('reports equal choices as a draw with no winner or loser', () => {
    for (const choice of RPS_CHOICES) {
      expect(resolveRpsRound({ id: 'p1', choice }, { id: 'p2', choice })).toEqual({
        winnerId: null,
        loserId: null,
        draw: true,
      });
    }
  });

  it('never produces a draw between different choices', () => {
    for (const a of RPS_CHOICES) {
      for (const b of RPS_CHOICES) {
        if (a === b) continue;
        const result = resolveRpsRound({ id: 'p1', choice: a }, { id: 'p2', choice: b });
        expect(result.draw).toBe(false);
        expect(result.winnerId).not.toBeNull();
        expect(result.loserId).not.toBe(result.winnerId);
      }
    }
  });

  it('validates wire input', () => {
    for (const choice of RPS_CHOICES) expect(isRpsChoice(choice)).toBe(true);
    for (const bad of ['ROCK', 'lizard', '', null, undefined, 3, {}]) expect(isRpsChoice(bad)).toBe(false);
  });

  it('can present every choice', () => {
    const labels = RPS_CHOICES.map((choice) => RPS_PRESENTATION[choice].label);
    for (const label of labels) expect(label).not.toBe('');
    // Distinct labels, or the reveal ("Rock vs Paper") stops saying anything.
    expect(new Set(labels).size).toBe(RPS_CHOICES.length);
  });

  it('picks a random choice across the full range, and never out of range', () => {
    // Boundary values of random() must stay inside the array — a bare
    // floor(r * 3) returns index 3 when r is exactly 1.
    expect(randomRpsChoice(() => 0)).toBe('rock');
    expect(randomRpsChoice(() => 0.999999)).toBe('scissors');
    expect(randomRpsChoice(() => 1)).toBe('scissors');
    const seen = new Set<RpsChoice>();
    for (let i = 0; i < 300; i += 1) seen.add(randomRpsChoice());
    expect(seen.size).toBe(RPS_CHOICES.length);
  });
});

describe('RPS toss bookkeeping', () => {
  const SIDES = ['p1', 'p2'] as const;

  it('starts at round 1 with nothing locked', () => {
    const toss = createRpsToss();
    expect(toss.round).toBe(1);
    expect(lockedRpsIds(toss, SIDES)).toEqual([]);
  });

  it('does not report a choice back to the caller until both sides are in', () => {
    const toss = createRpsToss();
    const first = applyRpsPick(toss, SIDES, 'p1', 1, 'rock');
    expect(first.kind).toBe('locked');
    // 'locked' has no `picks` field at all — only 'resolved' does.
    expect('picks' in first).toBe(false);
    expect(lockedRpsIds(first.state, SIDES)).toEqual(['p1']);
  });

  it('publishes who has locked in and NOTHING about what they picked', () => {
    // The security property. The toss state itself must hold the pick, so the
    // guard is that the publishable view never carries it: if this view could
    // leak the first mover's choice, the second could always beat it.
    let toss = createRpsToss();
    toss = applyRpsPick(toss, SIDES, 'p1', 1, 'rock').state;
    const view = rpsPublicView(toss, SIDES);
    expect(view).toEqual({ round: 1, lockedIds: ['p1'] });
    for (const choice of RPS_CHOICES) expect(JSON.stringify(view)).not.toContain(choice);
  });

  it('resolves once both are in, revealing both picks together', () => {
    let toss = createRpsToss();
    toss = applyRpsPick(toss, SIDES, 'p1', 1, 'rock').state;
    const out = applyRpsPick(toss, SIDES, 'p2', 1, 'scissors');
    expect(out.kind).toBe('resolved');
    if (out.kind !== 'resolved') throw new Error('unreachable');
    expect(out.picks).toEqual({ p1: 'rock', p2: 'scissors' });
    expect(out.winnerId).toBe('p1');
  });

  it('treats a pick as final — a second one from the same side is ignored', () => {
    let toss = createRpsToss();
    toss = applyRpsPick(toss, SIDES, 'p1', 1, 'rock').state;
    const retry = applyRpsPick(toss, SIDES, 'p1', 1, 'paper');
    expect(retry.kind).toBe('ignored');
    // ...and the original pick is what resolves the round.
    const out = applyRpsPick(retry.state, SIDES, 'p2', 1, 'scissors');
    if (out.kind !== 'resolved') throw new Error('unreachable');
    expect(out.picks.p1).toBe('rock');
  });

  it('ignores a pick for the wrong round', () => {
    const toss = createRpsToss();
    expect(applyRpsPick(toss, SIDES, 'p1', 2, 'rock').kind).toBe('ignored');
    expect(applyRpsPick(toss, SIDES, 'p1', 0, 'rock').kind).toBe('ignored');
  });

  it('ignores unknown sides and malformed choices', () => {
    const toss = createRpsToss();
    expect(applyRpsPick(toss, SIDES, 'p3', 1, 'rock').kind).toBe('ignored');
    expect(applyRpsPick(toss, SIDES, 'p1', 1, 'lizard').kind).toBe('ignored');
    expect(applyRpsPick(toss, SIDES, 'p1', 1, null).kind).toBe('ignored');
  });

  it('replays on a draw, and a stale pick from the drawn round no longer counts', () => {
    let toss = createRpsToss();
    toss = applyRpsPick(toss, SIDES, 'p1', 1, 'paper').state;
    const drawn = applyRpsPick(toss, SIDES, 'p2', 1, 'paper');
    if (drawn.kind !== 'resolved') throw new Error('unreachable');
    expect(drawn.winnerId).toBeNull();

    toss = nextRpsRound(drawn.state);
    expect(toss.round).toBe(2);
    expect(lockedRpsIds(toss, SIDES)).toEqual([]);
    // A click that raced the draw still carries round 1 and must not be
    // counted as this side's answer to round 2.
    expect(applyRpsPick(toss, SIDES, 'p1', 1, 'rock').kind).toBe('ignored');

    toss = applyRpsPick(toss, SIDES, 'p1', 2, 'rock').state;
    const out = applyRpsPick(toss, SIDES, 'p2', 2, 'paper');
    if (out.kind !== 'resolved') throw new Error('unreachable');
    expect(out.winnerId).toBe('p2');
  });

  it('always terminates on a decisive round, however many draws precede it', () => {
    // Drive the loop the way both callers do and check it always lands on a winner.
    for (const scripted of [['rock', 'rock', 'paper', 'paper', 'scissors', 'rock'] as RpsChoice[]]) {
      let toss = createRpsToss();
      let winner: string | null = null;
      for (let i = 0; i < scripted.length && winner === null; i += 2) {
        toss = applyRpsPick(toss, SIDES, 'p1', toss.round, scripted[i]).state;
        const out = applyRpsPick(toss, SIDES, 'p2', toss.round, scripted[i + 1]);
        if (out.kind !== 'resolved') throw new Error('unreachable');
        winner = out.winnerId;
        if (winner === null) toss = nextRpsRound(out.state);
      }
      // Round 1 rock/rock and round 2 paper/paper draw; round 3 is p1 scissors
      // against p2 rock, so rock takes it.
      expect(winner).toBe('p2');
      expect(toss.round).toBe(3);
    }
  });
});
