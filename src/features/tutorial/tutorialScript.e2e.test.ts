/**
 * THE PROOF. Plays tutorialScript.ts's entire match — every beat, in order,
 * from Section 5 setup to game over — through the REAL engine
 * (validateAction / executeAction) and asserts the board matches what the
 * narration claims at every step.
 *
 * This test exists because the previous tutorial's lessons were written
 * against fabricated per-chapter boards and drifted out of sync with the
 * rules: dialogue promised cards that were not in hand and DON!! that were
 * not in the cost area. Nothing here can drift, because the numbers the
 * script says out loud (Life totals, DON!! counts, who is rested, who gets
 * K.O.'d) are asserted against the state the engine actually produced.
 *
 * matchStore is MOCKED down to the two player-id constants tutorialScenario
 * actually consumes: importing the real store drags in the whole app graph
 * (effect compiler, AI, animations, browser runtime), which node-based
 * engine tests must not depend on. The literals are pinned by the
 * "mock matches the real constants" test at the bottom. /cards/*.json is
 * served from /public via a fetch stub.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { validateAction, executeAction } from '../../engine/actions';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import type { GameState } from '../../engine/state/game';
import { buildTutorialScenario } from './tutorialScenario';
import { BASIC_GAME_FLOW, CARD_EFFECTS_1, CARD_EFFECTS_2, TUTORIAL_SCENARIOS, firstBeatIndexOfChapter } from './scenarios';
import type { TutorialBeat, TutorialScenarioDef } from './types';
import { actingPlayerId, resolveBeatActions, matchesBeat, activeDonIds } from './tutorialScriptRunner';

const PLAYER_A_ID = 'p1';
const PLAYER_B_ID = 'p2';
vi.mock('../../app/store/matchStore', () => ({ PLAYER_A_ID: 'p1', PLAYER_B_ID: 'p2', createActionId: () => `mock-action-${Math.random()}` }));

const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: unknown) => {
    const pathname = String(url).replace(/^https?:\/\/[^/]+/, '');
    try {
      const data = await readFile(path.join(PUBLIC_DIR, pathname.replace(/^\//, '')), 'utf-8');
      return { ok: true, status: 200, json: async () => JSON.parse(data) } as Response;
    } catch {
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }
  });
});

let counter = 0;
const newActionId = () => `tutorial-e2e-${++counter}`;

interface PlayLog {
  final: GameState;
  /** State captured immediately after each beat, keyed by beat id. */
  after: Map<string, GameState>;
  /** State as it stood when each beat BEGAN, keyed by beat id. */
  before: Map<string, GameState>;
  defs: Record<string, import('../../engine/state/card').CardDefinition>;
}

/** Plays the whole script; throws with the beat id if any action is illegal. */
async function playWholeScript(def: TutorialScenarioDef): Promise<PlayLog> {
  const scenario = await buildTutorialScenario(def);
  let state = scenario.state;
  const after = new Map<string, GameState>();
  const before = new Map<string, GameState>();

  for (const beat of def.beats) {
    before.set(beat.id, state);
    const actor = actingPlayerId(beat, scenario.studyingPlayerId, scenario.opponentPlayerId);
    if (actor && beat.action) {
      const actions = resolveBeatActions(state, scenario.defs, beat, actor, { newActionId });
      expect(actions.length, `beat ${beat.id} produced no actions`).toBeGreaterThan(0);
      for (const action of actions) {
        const validation = validateAction(state, action, scenario.defs, scenario.registry);
        expect(validation.reasons, `[${def.id}] beat '${beat.id}' dispatched an ILLEGAL ${action.type}`).toEqual([]);
        state = executeAction(state, action, scenario.defs, scenario.registry).state;
      }
      expect(state.pendingChoice ?? null, `[${def.id}] beat '${beat.id}' left an unresolved PendingChoice`).toBeNull();
    }
    after.set(beat.id, state);
  }

  return { final: state, after, before, defs: scenario.defs };
}

/** Playing a whole scenario is the expensive part — do it once per scenario. */
const playCache = new Map<string, Promise<PlayLog>>();
function play(def: TutorialScenarioDef): Promise<PlayLog> {
  const cached = playCache.get(def.id);
  if (cached) return cached;
  const running = playWholeScript(def);
  playCache.set(def.id, running);
  return running;
}

let played: PlayLog;
beforeAll(async () => {
  played = await play(BASIC_GAME_FLOW);
}, 60_000);

const lifeOf = (state: GameState, playerId: string) => state.players[playerId].lifeArea.cardIds.length;
const charNumbers = (log: PlayLog, state: GameState, playerId: string) =>
  state.players[playerId].characterArea.cardIds.map((id) => log.defs[state.cardsById[id].cardDefinitionId]?.cardNumber);

describe('the scripted tutorial match is legal from setup to game over', () => {
  it('every scripted action passes validateAction (asserted inside playWholeScript)', () => {
    expect(played.final).toBeDefined();
  });

  it('deals the exact opening hand the script names', () => {
    const state = played.after.get('setup.mulligan.player') as GameState;
    const hand = state.players[PLAYER_A_ID].hand.cardIds.map((id) => played.defs[state.cardsById[id].cardDefinitionId]?.cardNumber);
    expect(hand.sort()).toEqual([...BASIC_GAME_FLOW.openingHand].sort());
  });

  it('setup ends with both players on 5 Life and turn 1 belonging to the Instructor', () => {
    const state = played.after.get('setup.mulligan.player') as GameState;
    expect(state.setupState).toBeNull();
    expect(state.turnNumber).toBe(1);
    expect(state.activePlayerId).toBe(PLAYER_B_ID); // Instructor won the throw and chose to go first
    expect(lifeOf(state, PLAYER_A_ID)).toBe(5);
    expect(lifeOf(state, PLAYER_B_ID)).toBe(5);
  });

  it('turn 1: the first player takes only 1 DON!! and spends it on Streusen (6-4-1)', () => {
    const state = played.after.get('t1.play') as GameState;
    expect(charNumbers(played, state, PLAYER_B_ID)).toEqual(['OP03-115']);
    // 1 DON!! placed, all of it rested to pay a cost-1 Character.
    expect(state.players[PLAYER_B_ID].costArea.cardIds).toHaveLength(1);
    expect(activeDonIds(state, PLAYER_B_ID)).toHaveLength(0);
  });

  it('turn 2: you draw (going second does draw on turn 1) and play Chopa-Emon with exactly 2 DON!!', () => {
    const beforePlay = played.after.get('t2.don') as GameState;
    expect(beforePlay.players[PLAYER_A_ID].costArea.cardIds).toHaveLength(2);
    const state = played.after.get('t2.play') as GameState;
    expect(charNumbers(played, state, PLAYER_A_ID)).toEqual(['OP05-068']);
    expect(activeDonIds(state, PLAYER_A_ID)).toHaveLength(0);
  });

  it('turn 3: the Instructor’s attack lands and takes exactly one of your Life cards', () => {
    const state = played.after.get('t3.pass') as GameState;
    expect(state.currentBattle).toBeNull();
    expect(lifeOf(state, PLAYER_A_ID)).toBe(4);
    // 7-1-4-1: the Life card goes to hand, so damage is not pure loss.
    expect(state.players[PLAYER_A_ID].hand.cardIds.length).toBeGreaterThan(0);
  });

  it('turn 4: your first attack lands, and playing Zoro-Juurou afterwards proves attacking costs no DON!!', () => {
    const afterAttack = played.after.get('t4.pass') as GameState;
    expect(lifeOf(afterAttack, PLAYER_B_ID)).toBe(4);
    expect(activeDonIds(afterAttack, PLAYER_A_ID)).toHaveLength(4); // all 4 still active after attacking
    const afterPlay = played.after.get('t4.play') as GameState;
    expect(charNumbers(played, afterPlay, PLAYER_A_ID)).toContain('ST18-004');
  });

  it('turn 5: two attacks take you to 2 Life', () => {
    expect(lifeOf(played.after.get('t5.pass1') as GameState, PLAYER_A_ID)).toBe(3);
    expect(lifeOf(played.after.get('t5.pass2') as GameState, PLAYER_A_ID)).toBe(2);
  });

  it('turn 6: Zoro-Juurou K.O.s the RESTED Pekoms, who goes to the trash (7-1-4-1-2)', () => {
    const before = played.after.get('t6.pass1') as GameState;
    const pekoms = before.players[PLAYER_B_ID].characterArea.cardIds.find(
      (id) => played.defs[before.cardsById[id].cardDefinitionId]?.cardNumber === 'ST07-014',
    );
    expect(pekoms, 'Pekoms must still be on the board to be attacked').toBeDefined();
    expect(before.cardsById[pekoms as string].orientation, 'Pekoms must be RESTED to be a legal target').toBe('rested');

    const after = played.after.get('t6.pass2') as GameState;
    expect(charNumbers(played, after, PLAYER_B_ID)).not.toContain('ST07-014');
    expect(after.players[PLAYER_B_ID].trash.cardIds).toContain(pekoms);
    expect(lifeOf(after, PLAYER_B_ID)).toBe(3); // attacking a Character costs no Life
  });

  it('turn 7: both Counters repel their attacks, and the Counter cards go to the trash (7-1-3-2-1)', () => {
    const afterZoro = played.after.get('t7.passZoro') as GameState;
    expect(charNumbers(played, afterZoro, PLAYER_A_ID), 'Zoro-Juurou must survive at 7000 vs 6000').toContain('ST18-004');
    const afterLeader = played.after.get('t7.passLeader') as GameState;
    expect(lifeOf(afterLeader, PLAYER_A_ID), 'the Leader Counter must hold Life at 2').toBe(2);
    const trash = afterLeader.players[PLAYER_A_ID].trash.cardIds.map((id) => played.defs[afterLeader.cardsById[id].cardDefinitionId]?.cardNumber);
    expect(trash).toContain('OP05-063'); // O-Robi
    expect(trash).toContain('ST18-002'); // O-Nami
  });

  it('turn 8: three attacks empty the Instructor’s Life, then a DON!!-boosted Chopa-Emon wins it', () => {
    expect(lifeOf(played.after.get('t8.pass1') as GameState, PLAYER_B_ID)).toBe(2);
    expect(lifeOf(played.after.get('t8.pass2') as GameState, PLAYER_B_ID)).toBe(1);
    const atZero = played.after.get('t8.pass3') as GameState;
    expect(lifeOf(atZero, PLAYER_B_ID)).toBe(0);
    expect(atZero.gameOver, 'reaching 0 Life is not itself a loss — the next hit is').toBeFalsy();

    // 6-5-5-1: 8 DON!! given, +1000 each, so 3000 -> 11000.
    const boosted = played.after.get('t8.giveDon') as GameState;
    const chopa = boosted.players[PLAYER_A_ID].characterArea.cardIds.find(
      (id) => played.defs[boosted.cardsById[id].cardDefinitionId]?.cardNumber === 'OP05-068',
    ) as string;
    expect(boosted.cardsById[chopa].donAttached).toHaveLength(8);

    expect(played.final.gameOver?.winnerId).toBe(PLAYER_A_ID);
  });
});

// ── Scenario 2: the narration's own arithmetic, asserted ──────────────────
//
// Legality is not the same as honesty. These pin the numbers the Instructor
// says out loud — "you are on 3", "one more DON!!, active, for free" — to
// what the engine actually produced, so a line of dialogue cannot quietly
// stop being true.
describe('scenario 2 teaches what it claims (card effects are really firing)', () => {
  let s2: PlayLog;
  beforeAll(async () => {
    s2 = await play(CARD_EFFECTS_1);
  }, 90_000);

  const costArea = (state: GameState, playerId: string) => state.players[playerId].costArea.cardIds.length;

  it('[On Play]: Trafalgar Law hands back a DON!! the moment he lands', () => {
    const before = s2.before.get('s2.t4.play') as GameState;
    const after = s2.after.get('s2.t4.play') as GameState;
    // Four DON!! spent on the cost, one added back by the ability — so the
    // cost area is one card LARGER than it was, not four smaller.
    expect(costArea(before, PLAYER_A_ID)).toBe(4);
    expect(costArea(after, PLAYER_A_ID), '[On Play] should have added a DON!! from the DON!! deck').toBe(5);
    expect(activeDonIds(after, PLAYER_A_ID), 'and it arrives ACTIVE, so it is spendable this turn').toHaveLength(1);
  });

  it('[DON!! x1] + [When Attacking]: the Instructor’s Leader really swings for 7000', () => {
    // 5000 printed + 1000 from the given DON!! + 1000 from the ability. The
    // proof it landed is the Life card: a 6000 attack would also have
    // succeeded, so instead assert the ability's own power bonus is recorded.
    const attacking = s2.after.get('s2.t5.peek') as GameState;
    const battle = attacking.currentBattle;
    expect(battle, 'the Instructor should be mid-battle here').not.toBeNull();
    const power = computeCurrentPower(s2.defs, attacking, battle!.attackerInstanceId);
    expect(power, '5000 printed + 1000 given DON!! + 1000 from [When Attacking]').toBe(7000);
    expect(lifeOf(s2.after.get('s2.t5.pass') as GameState, PLAYER_A_ID), 'and it takes a Life card').toBe(3);
  });

  it('[Activate: Main] [Once Per Turn]: one Life traded for a card AND a DON!!', () => {
    const before = s2.before.get('s2.t6.activate') as GameState;
    const after = s2.after.get('s2.t6.takeLife') as GameState;
    expect(lifeOf(after, PLAYER_A_ID), 'the Life card is the price').toBe(lifeOf(before, PLAYER_A_ID) - 1);
    expect(after.players[PLAYER_A_ID].hand.cardIds.length, 'it becomes a card in hand').toBe(before.players[PLAYER_A_ID].hand.cardIds.length + 1);
    expect(costArea(after, PLAYER_A_ID), 'and at 3+ DON!! the second half adds one more').toBe(costArea(before, PLAYER_A_ID) + 1);
  });

  it('[End of Your Turn]: Chopper returns a DON!! and comes back with [Blocker]', () => {
    const before = s2.before.get('s2.t6.chopper') as GameState;
    const after = s2.after.get('s2.t6.chopper') as GameState;
    expect(costArea(after, PLAYER_A_ID), 'one DON!! goes back to the DON!! deck').toBe(costArea(before, PLAYER_A_ID) - 1);
    // The Blocker is what makes turn 7 open on the Block Step rather than
    // going straight to Counter — which is exactly what the next beat teaches.
    const blockStep = s2.before.get('s2.t7.declineBlock') as GameState;
    expect(blockStep.currentBattle?.step, 'a live [Blocker] means the defender is asked to block first').toBe('block');
  });

  it('stacked Counters must EXCEED the attacker, not match it', () => {
    // The lesson this test was written to protect: 7-1-4-1 makes an attack
    // succeed on equal power, so two +1000 Counters against a 7000 attack
    // would still have cost the player a Life card. Three is the honest
    // answer, and the script now says so.
    const beforePass = s2.before.get('s2.t7.pass') as GameState;
    const leaderId = beforePass.players[PLAYER_A_ID].leaderInstanceId as string;
    expect(computeCurrentPower(s2.defs, beforePass, leaderId), 'three Counters take a 5000 Leader to 8000').toBe(8000);

    const held = s2.after.get('s2.t7.pass') as GameState;
    expect(lifeOf(held, PLAYER_A_ID), '8000 turns the 7000 attack away with no Life lost').toBe(2);
    const trash = held.players[PLAYER_A_ID].trash.cardIds.map((id) => s2.defs[held.cardsById[id].cardDefinitionId]?.cardNumber);
    expect(trash).toContain('OP05-063');
    expect(trash).toContain('ST18-002');
    expect(trash).toContain('OP05-062');
  });

  it('[Rush]: Minochihuahua attacks on the very turn he is played', () => {
    const played8 = s2.after.get('s2.t8.rush') as GameState;
    const mino = played8.players[PLAYER_A_ID].characterArea.cardIds.find(
      (id) => s2.defs[played8.cardsById[id].cardDefinitionId]?.cardNumber === 'EB01-036',
    ) as string;
    expect(mino, 'Minochihuahua should be on the field').toBeDefined();
    // Same turn number when he arrived and when he attacked — the whole point
    // of [Rush], and something the engine rejects for any other Character.
    const attacked = s2.after.get('s2.t8.rushAttack') as GameState;
    expect(attacked.cardsById[mino].orientation, 'declaring an attack rests him').toBe('rested');
    expect(attacked.turnNumber).toBe(played8.turnNumber);
    expect(lifeOf(s2.after.get('s2.t8.pass1') as GameState, PLAYER_B_ID)).toBe(2);
  });

  it('ends with the Instructor beaten', () => {
    expect(lifeOf(s2.after.get('s2.t8.pass3') as GameState, PLAYER_B_ID)).toBe(0);
    expect(s2.final.gameOver, 'the scenario must actually finish the game').toBeTruthy();
  });
});

// ── Scenario 3: keywords that change the rules of a battle ────────────────
//
// These are the assertions that make the Instructor's claims checkable. Every
// one of them is a sentence the script says out loud — "the Life card is
// trashed without activating its Trigger", "this one successful attack takes
// TWO Life cards" — turned into something the engine has to keep true.
describe('scenario 3 teaches what it claims (keywords really apply)', () => {
  let s3: PlayLog;
  beforeAll(async () => {
    s3 = await play(CARD_EFFECTS_2);
  }, 90_000);

  const numbersIn = (log: PlayLog, state: GameState, ids: readonly string[]) =>
    ids.map((id) => log.defs[state.cardsById[id].cardDefinitionId]?.cardNumber);

  it('a Stage card goes to the Stage zone, not the Character area', () => {
    const after = s3.after.get('s3.t2.play') as GameState;
    expect(numbersIn(s3, after, after.players[PLAYER_A_ID].stageArea.cardIds)).toEqual(['OP09-080']);
    expect(numbersIn(s3, after, after.players[PLAYER_A_ID].characterArea.cardIds)).not.toContain('OP09-080');
  });

  it('[Trigger]: the revealed Life card pays out, and is trashed rather than kept', () => {
    const before = s3.before.get('s3.t3.trigger') as GameState;
    const after = s3.after.get('s3.t3.trigger') as GameState;
    expect(after.players[PLAYER_A_ID].costArea.cardIds.length, 'the [Trigger] adds a DON!! card').toBe(
      before.players[PLAYER_A_ID].costArea.cardIds.length + 1,
    );
    expect(
      numbersIn(s3, after, after.players[PLAYER_A_ID].trash.cardIds),
      'using a [Trigger] trashes the card instead of keeping it in hand',
    ).toContain('OP03-072');
  });

  it('[Blocker]: the attack is REDIRECTED, so the Leader takes nothing', () => {
    const declared = s3.before.get('s3.t6.block') as GameState;
    const blocked = s3.after.get('s3.t6.block') as GameState;
    // Same battle, new target: that is the whole mechanic.
    expect(declared.currentBattle?.targetInstanceId).toBe(declared.players[PLAYER_B_ID].leaderInstanceId);
    expect(numbersIn(s3, blocked, [blocked.currentBattle!.targetInstanceId])).toEqual(['ST20-001']);
    expect(blocked.currentBattle!.originalTargetInstanceId, 'the original target is remembered').toBe(
      declared.players[PLAYER_B_ID].leaderInstanceId,
    );

    const resolved = s3.after.get('s3.t6.pass') as GameState;
    expect(lifeOf(resolved, PLAYER_B_ID), 'a blocked attack costs a card, not a Life card').toBe(4);
    expect(numbersIn(s3, resolved, resolved.players[PLAYER_B_ID].trash.cardIds)).toContain('ST20-001');
  });

  it('[Counter] Event: +3000 from hand turns a 7000 attack away', () => {
    const boosted = s3.before.get('s3.t7.pass') as GameState;
    const leaderId = boosted.players[PLAYER_A_ID].leaderInstanceId as string;
    expect(computeCurrentPower(s3.defs, boosted, leaderId), '5000 + 3000').toBe(8000);
    expect(lifeOf(s3.after.get('s3.t7.pass') as GameState, PLAYER_A_ID), 'no Life lost').toBe(3);
  });

  it('[Banish]: the Life card is trashed and its [Trigger] never fires', () => {
    const before = s3.before.get('s3.t8.banish') as GameState;
    const after = s3.after.get('s3.t8.pass1') as GameState;
    expect(lifeOf(before, PLAYER_B_ID)).toBe(3);
    expect(lifeOf(after, PLAYER_B_ID)).toBe(2);

    // The card in that slot was pinned BECAUSE it prints a [Trigger] — the
    // claim "without activating its Trigger" is meaningless otherwise.
    expect(s3.defs['OP03-105']?.hasTrigger, 'the banished card must actually have a [Trigger]').toBe(true);
    expect(numbersIn(s3, after, after.players[PLAYER_B_ID].trash.cardIds), 'banished Life goes to the trash').toContain('OP03-105');
    expect(numbersIn(s3, after, after.players[PLAYER_B_ID].hand.cardIds), 'and never reaches the hand').not.toContain('OP03-105');
    expect(after.pendingChoices, 'and it is never offered as a [Trigger]').toEqual([]);
  });

  it('[Double Attack]: one successful attack takes TWO Life cards', () => {
    const before = s3.before.get('s3.t8.doubleAttack') as GameState;
    const after = s3.after.get('s3.t8.pass2') as GameState;
    expect(lifeOf(before, PLAYER_B_ID)).toBe(2);
    expect(lifeOf(after, PLAYER_B_ID), 'two Life cards from a single attack').toBe(0);
  });

  it('ends with the Instructor beaten', () => {
    expect(s3.final.gameOver, 'the scenario must actually finish the game').toBeTruthy();
  });
});

describe.each(TUTORIAL_SCENARIOS)('script integrity: $id', (def) => {
  it('every beat has dialogue, and every player action beat states an objective', () => {
    for (const beat of def.beats) {
      expect(beat.lines.length, `beat ${beat.id} has no dialogue`).toBeGreaterThan(0);
      for (const line of beat.lines) expect(line.trim().length).toBeGreaterThan(0);
      if (beat.actor === 'player' && beat.action) {
        expect(beat.objective?.trim().length, `player beat ${beat.id} needs an objective`).toBeGreaterThan(0);
      }
    }
  });

  it('beat ids are unique', () => {
    const ids = def.beats.map((beat) => beat.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('beats are grouped into chapters in play order, with no chapter interleaved', () => {
    const order = def.chapters.map((chapter) => chapter.id);
    const seen: string[] = [];
    for (const beat of def.beats) {
      if (seen[seen.length - 1] !== beat.chapter) seen.push(beat.chapter);
    }
    expect(seen).toEqual(order);
  });

  it('each chapter’s beats all belong to that chapter’s turn', () => {
    for (const chapter of def.chapters) {
      for (const beat of def.beats.filter((entry) => entry.chapter === chapter.id)) {
        expect(beat.turn, `beat ${beat.id}`).toBe(chapter.turn);
      }
    }
  });

  it('every beat belongs to a declared chapter', () => {
    const declared = new Set(def.chapters.map((chapter) => chapter.id));
    for (const beat of def.beats) {
      expect(declared.has(beat.chapter), `beat '${beat.id}' has undeclared chapter '${beat.chapter}'`).toBe(true);
    }
  });

  it('a player dispatching the scripted action satisfies matchesBeat', async () => {
    // Guards the UI gate: what resolveBeatActions produces must be accepted
    // by matchesBeat, or a player who does exactly what they are told would
    // be told they are wrong.
    const scenario = await buildTutorialScenario(def);
    let state = scenario.state;
    for (const beat of def.beats) {
      const actor = actingPlayerId(beat, scenario.studyingPlayerId, scenario.opponentPlayerId);
      if (!actor || !beat.action) continue;
      const actions = resolveBeatActions(state, scenario.defs, beat, actor, { newActionId });
      if (beat.actor === 'player') {
        expect(matchesBeat(state, scenario.defs, beat, actor, actions[0]), `beat ${beat.id}`).toBe(true);
      }
      for (const action of actions) state = executeAction(state, action, scenario.defs, scenario.registry).state;
    }
  }, 60_000);

  // ── Defence beats must be REACHABLE, not just legal ────────────────────
  //
  // Reported from live play as "chapter 8 tells me to Counter but the
  // Instructor isn't even attacking". The action being legal is not enough:
  // a Counter is only meaningful if the engine is actually parked in a
  // battle's Counter Step (7-1-3) with the right card under attack, because
  // that is the only moment the board offers the player anything to click.
  it('every Counter beat begins with a live battle in its Counter Step', async () => {
    const { before, defs } = await play(def);
    const counterBeats = def.beats.filter((beat) => beat.action?.kind === 'counterCharacter');
    if (counterBeats.length === 0) return; // not every scenario teaches Counters

    for (const beat of counterBeats) {
      const state = before.get(beat.id);
      expect(state, `no captured state for ${beat.id}`).toBeDefined();
      const battle = state!.currentBattle;
      expect(battle, `beat '${beat.id}' asks for a Counter with no battle in progress`).not.toBeNull();
      expect(battle!.step, `beat '${beat.id}' is not at the Counter Step`).toBe('counter');

      // The attacker has to be the Instructor's, and resting it is what
      // declaring the attack does — if it is still active, no attack happened.
      const attacker = state!.cardsById[battle!.attackerInstanceId];
      expect(attacker, `beat '${beat.id}' has no attacker instance`).toBeDefined();
      expect(attacker.ownerId, `beat '${beat.id}': the attacker should be the Instructor's`).toBe(PLAYER_B_ID);
      expect(attacker.orientation, `beat '${beat.id}': a declared attacker must be rested`).toBe('rested');

      // And the card being defended has to be the player's.
      const defender = state!.cardsById[battle!.targetInstanceId];
      expect(defender.ownerId, `beat '${beat.id}': the defender should be the player's`).toBe(PLAYER_A_ID);
      void defs;
    }
  }, 60_000);

  it("turn 7's first attack rests Charlotte Opera and puts Zoro-Juurou under attack", async () => {
    // The exact step the bug report landed on, pinned by name so a future
    // failure reads as "this lesson broke" rather than "some action is illegal".
    const { before, defs } = await play(BASIC_GAME_FLOW);
    const state = before.get('t7.counterZoro');
    const battle = state!.currentBattle;
    expect(battle).not.toBeNull();

    const numberOf = (instanceId: string) => defs[state!.cardsById[instanceId].cardDefinitionId]?.cardNumber;
    expect(numberOf(battle!.attackerInstanceId), 'attacker should be Charlotte Opera').toBe('OP03-106');
    expect(numberOf(battle!.targetInstanceId), 'target should be Zoro-Juurou').toBe('ST18-004');
    expect(state!.cardsById[battle!.targetInstanceId].orientation, 'Zoro-Juurou is targetable because he is rested').toBe('rested');
  }, 60_000);

  // ── "Restart chapter" / "Previous" must land on a PLAYABLE board ────────
  //
  // TutorialManager reaches any chapter by rebuilding the match and replaying
  // beats [0, firstBeatIndexOfChapter) — the same trick that makes Restart
  // Chapter cheap. If that replay drifts by even one action the player is
  // dropped onto a board the next beat cannot act on, which is precisely the
  // "it tells me to Counter but the Instructor never attacked" report: the
  // script had moved on and the board had not.
  it('replaying into every chapter leaves that chapter’s first action legal', async () => {
    for (const chapter of def.chapters) {
      const jumpTarget = firstBeatIndexOfChapter(def, chapter.id);
      const scenario = await buildTutorialScenario(def);
      let state = scenario.state;

      for (let i = 0; i < jumpTarget; i += 1) {
        const past = def.beats[i];
        const actor = actingPlayerId(past, scenario.studyingPlayerId, scenario.opponentPlayerId);
        if (!actor || !past.action) continue;
        for (const action of resolveBeatActions(state, scenario.defs, past, actor, { newActionId })) {
          const verdict = validateAction(state, action, scenario.defs, scenario.registry);
          expect(
            verdict.reasons,
            `[${def.id}] replaying into '${chapter.id}' produced an ILLEGAL ${action.type} at beat '${past.id}'`,
          ).toEqual([]);
          state = executeAction(state, action, scenario.defs, scenario.registry).state;
        }
      }

      // Now the first acting beat of the chapter itself must be legal.
      const upcoming = def.beats.slice(jumpTarget).find((beat) => beat.action);
      if (!upcoming) continue;
      const actor = actingPlayerId(upcoming, scenario.studyingPlayerId, scenario.opponentPlayerId)!;
      const actions = resolveBeatActions(state, scenario.defs, upcoming, actor, { newActionId });
      const verdict = validateAction(state, actions[0], scenario.defs, scenario.registry);
      expect(
        verdict.reasons,
        `[${def.id}] after jumping to '${chapter.id}', its first beat '${upcoming.id}' is not playable`,
      ).toEqual([]);
    }
  }, 120_000);

  it('mocked player ids match the real matchStore constants (source-text pin)', async () => {
    const source = await readFile(path.resolve(__dirname, '../../app/store/matchStore.ts'), 'utf-8');
    expect(source).toContain(`export const PLAYER_A_ID = '${PLAYER_A_ID}'`);
    expect(source).toContain(`export const PLAYER_B_ID = '${PLAYER_B_ID}'`);
  });
});
