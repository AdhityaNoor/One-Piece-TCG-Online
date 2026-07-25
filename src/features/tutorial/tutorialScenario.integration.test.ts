/**
 * Engine-truth integration tests for the scripted tutorial boards: each
 * chapter's objective is DISPATCHED against the real engine
 * (validateAction/executeAction) exactly the way the UI would, proving the
 * scenario states make the taught action legal — the regression this guards
 * is real: the original scenario parked every chapter at turnNumber 1,
 * where 6-5-6-1 makes DECLARE_ATTACK illegal, so "attack with your Leader"
 * could never be performed.
 *
 * matchStore is MOCKED down to the two player-id constants tutorialScenario
 * actually consumes: importing the real store drags in the whole app graph
 * (effect compiler, AI, animations, browser runtime), which node-based
 * engine tests must not depend on. The literals are pinned by the
 * "mock matches the real constants" test at the bottom of this file — if
 * matchStore ever renames its ids, that test fails loudly instead of this
 * suite silently testing the wrong players. /cards/*.json is served from
 * /public via a fetch stub.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { validateAction, executeAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { GameState } from '../../engine/state/game';
import { buildTutorialScenario } from './tutorialScenario';
import { evaluateCompletion } from './TutorialStateMachine';

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

let actionCounter = 0;
const id = () => `tutorial-test-action-${++actionCounter}`;

function cardNumberOf(state: GameState, defs: CardDefinitionLookup, instanceId: string): string | undefined {
  return defs[state.cardsById[instanceId]?.cardDefinitionId]?.cardNumber;
}

describe('scripted tutorial boards vs the real engine', () => {
  it('leaderAttacks: the Leader attack is LEGAL and lands (regression: illegal on turn 1 per 6-5-6-1)', async () => {
    const scenario = await buildTutorialScenario('leaderAttacks');
    let state = scenario.state;
    const attacker = state.players[PLAYER_A_ID].leaderInstanceId;
    const target = state.players[PLAYER_B_ID].leaderInstanceId;

    const declare = { type: 'DECLARE_ATTACK' as const, actionId: id(), playerId: PLAYER_A_ID, attackerInstanceId: attacker, targetInstanceId: target };
    const validation = validateAction(state, declare, scenario.defs);
    expect(validation.reasons).toEqual([]);
    expect(validation.legal).toBe(true);

    state = executeAction(state, declare, scenario.defs).state;
    // Instructor's lone Character has no [Blocker] -> engine skips to the Counter Step.
    expect(state.currentBattle?.step).toBe('counter');

    // Instructor declines to counter (what TutorialManager's auto-defense dispatches).
    state = executeAction(state, { type: 'PASS_STEP', actionId: id(), playerId: PLAYER_B_ID }, scenario.defs).state;
    expect(state.currentBattle).toBeNull();
    expect(state.players[PLAYER_B_ID].lifeArea.cardIds).toHaveLength(4);
    expect(state.pendingChoices).toEqual([]); // sanitizeLife: no [Trigger] surprises mid-lesson
    expect(evaluateCompletion(state, PLAYER_A_ID, { kind: 'opponentLifeAtMost', count: 4 })).toBe(true);
  });

  it('playingCharacters: Zoro (OP01-025) is in hand and playable with the scripted active DON!!', async () => {
    const scenario = await buildTutorialScenario('playingCharacters');
    let state = scenario.state;
    const player = state.players[PLAYER_A_ID];

    const zoroInHand = player.hand.cardIds.find((cardId) => cardNumberOf(state, scenario.defs, cardId) === 'OP01-025');
    expect(zoroInHand).toBeDefined();
    const activeDon = player.costArea.cardIds.filter((donId) => state.cardsById[donId].donRested === false);
    expect(activeDon.length).toBeGreaterThanOrEqual(3); // Zoro costs 3

    const play = { type: 'PLAY_CHARACTER' as const, actionId: id(), playerId: PLAYER_A_ID, handCardInstanceId: zoroInHand as string, donInstanceIds: activeDon.slice(0, 3) };
    expect(validateAction(state, play, scenario.defs).legal).toBe(true);
    state = executeAction(state, play, scenario.defs).state;
    expect(evaluateCompletion(state, PLAYER_A_ID, { kind: 'playerCharactersAtLeast', count: 1 })).toBe(true);
  });

  it('characterAttacks: scripted Zoro K.O.s the rested Black Maria', async () => {
    const scenario = await buildTutorialScenario('characterAttacks');
    let state = scenario.state;
    const zoro = state.players[PLAYER_A_ID].characterArea.cardIds[0];
    const maria = state.players[PLAYER_B_ID].characterArea.cardIds[0];
    expect(cardNumberOf(state, scenario.defs, zoro)).toBe('OP01-025');
    expect(cardNumberOf(state, scenario.defs, maria)).toBe('OP08-074');
    expect(state.cardsById[maria].orientation).toBe('rested'); // 7-1-1-2 legal target

    const declare = { type: 'DECLARE_ATTACK' as const, actionId: id(), playerId: PLAYER_A_ID, attackerInstanceId: zoro, targetInstanceId: maria };
    expect(validateAction(state, declare, scenario.defs).legal).toBe(true);
    state = executeAction(state, declare, scenario.defs).state;
    state = executeAction(state, { type: 'PASS_STEP', actionId: id(), playerId: PLAYER_B_ID }, scenario.defs).state;
    expect(evaluateCompletion(state, PLAYER_A_ID, { kind: 'opponentCharactersAtMost', count: 0 })).toBe(true);
  });

  it('counterStep: countering with Nami repels Kaido; passing without countering does not', async () => {
    const scenario = await buildTutorialScenario('counterStep');

    // Path 1: counter with Nami (+1000 -> 6000 vs 5000), then pass — Life preserved.
    let state = scenario.state;
    expect(state.currentBattle?.step).toBe('counter');
    const nami = state.players[PLAYER_A_ID].hand.cardIds.find((cardId) => cardNumberOf(state, scenario.defs, cardId) === 'ST01-007');
    expect(nami).toBeDefined();
    const counter = {
      type: 'ACTIVATE_COUNTER_CHARACTER' as const,
      actionId: id(),
      playerId: PLAYER_A_ID,
      handCardInstanceId: nami as string,
      boostTargetInstanceId: state.players[PLAYER_A_ID].leaderInstanceId,
    };
    expect(validateAction(state, counter, scenario.defs).legal).toBe(true);
    state = executeAction(state, counter, scenario.defs).state;
    state = executeAction(state, { type: 'PASS_STEP', actionId: id(), playerId: PLAYER_A_ID }, scenario.defs).state;
    expect(state.currentBattle).toBeNull();
    expect(state.players[PLAYER_A_ID].lifeArea.cardIds).toHaveLength(5);
    expect(evaluateCompletion(state, PLAYER_A_ID, { kind: 'attackRepelledKeepingLife', count: 5 })).toBe(true);

    // Path 2: just passing lets the 5000-vs-5000 tie land (7-1-4) — objective NOT met.
    let passed = scenario.state;
    passed = executeAction(passed, { type: 'PASS_STEP', actionId: id(), playerId: PLAYER_A_ID }, scenario.defs).state;
    expect(passed.players[PLAYER_A_ID].lifeArea.cardIds).toHaveLength(4);
    expect(evaluateCompletion(passed, PLAYER_A_ID, { kind: 'attackRepelledKeepingLife', count: 5 })).toBe(false);
  });

  it('blockers: Chopper redirects the attack, is K.O.’d, and Life stays intact', async () => {
    const scenario = await buildTutorialScenario('blockers');
    let state = scenario.state;
    expect(state.currentBattle?.step).toBe('block');
    const chopper = state.players[PLAYER_A_ID].characterArea.cardIds[0];
    expect(cardNumberOf(state, scenario.defs, chopper)).toBe('OP10-011');

    const block = { type: 'ACTIVATE_BLOCKER' as const, actionId: id(), playerId: PLAYER_A_ID, blockerInstanceId: chopper };
    expect(validateAction(state, block, scenario.defs).legal).toBe(true);
    state = executeAction(state, block, scenario.defs).state;
    expect(state.currentBattle?.targetInstanceId).toBe(chopper); // 7-1-2-1 re-target

    state = executeAction(state, { type: 'PASS_STEP', actionId: id(), playerId: PLAYER_A_ID }, scenario.defs).state;
    expect(state.currentBattle).toBeNull();
    expect(state.players[PLAYER_A_ID].lifeArea.cardIds).toHaveLength(5);
    expect(evaluateCompletion(state, PLAYER_A_ID, { kind: 'attackRepelledKeepingLife', count: 5 })).toBe(true);
  });

  it('winningTheGame: one Leader hit on the zero-Life Instructor wins (1-2-1-1)', async () => {
    const scenario = await buildTutorialScenario('winningTheGame');
    let state = scenario.state;
    expect(state.players[PLAYER_B_ID].lifeArea.cardIds).toHaveLength(0);

    const declare = {
      type: 'DECLARE_ATTACK' as const,
      actionId: id(),
      playerId: PLAYER_A_ID,
      attackerInstanceId: state.players[PLAYER_A_ID].leaderInstanceId,
      targetInstanceId: state.players[PLAYER_B_ID].leaderInstanceId,
    };
    expect(validateAction(state, declare, scenario.defs).legal).toBe(true);
    state = executeAction(state, declare, scenario.defs).state;
    state = executeAction(state, { type: 'PASS_STEP', actionId: id(), playerId: PLAYER_B_ID }, scenario.defs).state;
    expect(state.gameOver?.winnerId).toBe(PLAYER_A_ID);
    expect(evaluateCompletion(state, PLAYER_A_ID, { kind: 'gameWon' })).toBe(true);
  });

  it('mocked player ids match the real matchStore constants (source-text pin — importing the real store here would defeat the mock)', async () => {
    const source = await readFile(path.resolve(__dirname, '../../app/store/matchStore.ts'), 'utf-8');
    expect(source).toContain(`export const PLAYER_A_ID = '${PLAYER_A_ID}'`);
    expect(source).toContain(`export const PLAYER_B_ID = '${PLAYER_B_ID}'`);
  });

  it('donCards: the base board has active DON!! ready to give (6-5-5)', async () => {
    const scenario = await buildTutorialScenario('donCards');
    const player = scenario.state.players[PLAYER_A_ID];
    const activeDon = player.costArea.cardIds.filter((donId) => scenario.state.cardsById[donId].donRested === false);
    expect(activeDon.length).toBeGreaterThanOrEqual(1);
    const give = {
      type: 'GIVE_DON' as const,
      actionId: id(),
      playerId: PLAYER_A_ID,
      donInstanceId: activeDon[0],
      targetInstanceId: player.leaderInstanceId,
    };
    expect(validateAction(scenario.state, give, scenario.defs).legal).toBe(true);
  });
});
