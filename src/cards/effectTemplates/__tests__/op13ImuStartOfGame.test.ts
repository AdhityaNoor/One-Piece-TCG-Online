/**
 * Engine-capability test for OP13-079 (Imu)'s "at the start of the game, play
 * up to 1 {Mary Geoise} type Stage card from your deck" clause — the new
 * 'startOfGame' IrTiming + 'playStageFromDeck' primitive, exercised end to
 * end through the real setup flow (advanceStartOfGameEffects) rather than
 * runTimings directly, since the whole point of this mechanic is that it
 * fires from setup/before opening hands are dealt, not from the normal
 * card-play/battle cascade.
 *
 * The card's other clause ("cannot include Events cost 2+ in deck") is out
 * of scope — no deck-validation hook exists yet, see the PARTIAL comment on
 * OP13-079 in assignments/OP13.ts.
 */
import { describe, expect, it } from 'vitest';
import { createPreGameState } from '../../../engine/setup/createPreGameState';
import { executeChooseGoingFirst } from '../../../engine/setup/applyChooseGoingFirst';
import { advanceStartOfGameEffects } from '../../../engine/setup/advanceStartOfGameEffects';
import { resumeProgram } from '../../../engine/effects/interpreter';
import { makePlayerSetupInput, makeDeckOf } from '../../../engine/setup/__tests__/fixtures';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { CardDefinition } from '../../../engine/state/card';
import type { CardDefinitionLookup } from '../../../engine/rules/shared/definitions';

const IMU_DEF: CardDefinition = {
  cardDefinitionId: 'OP13-079-def',
  name: 'Imu',
  category: 'leader',
  colors: ['black'],
  types: ['World Government'],
  basePower: 5000,
  text: '',
  life: 4,
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'OP13-079',
};

const PLAIN_LEADER_DEF: CardDefinition = {
  cardDefinitionId: 'plain-leader-def',
  name: 'Plain Leader',
  category: 'leader',
  colors: ['red'],
  types: [],
  basePower: 5000,
  text: '',
  life: 5,
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'PLAIN-LEADER',
};

const MARY_GEOISE_STAGE_DEF: CardDefinition = {
  cardDefinitionId: 'mary-geoise-stage-def',
  name: 'Mary Geoise',
  category: 'stage',
  colors: ['black'],
  types: ['Mary Geoise'],
  baseCost: 2,
  text: '',
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'OP13-STAGE-TEST',
};

const OFF_TYPE_STAGE_DEF: CardDefinition = {
  cardDefinitionId: 'off-type-stage-def',
  name: 'Not Mary Geoise',
  category: 'stage',
  colors: ['red'],
  types: ['Some Other Type'],
  baseCost: 1,
  text: '',
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'OP13-STAGE-OFFTYPE',
};

const IMU_ASSIGNMENT: CardEffectAssignment = {
  cardNumber: 'OP13-079',
  templateId: 'ability',
  params: { timing: 'startOfGame', functions: [{ fn: 'playStageFromDeck', filter: { category: 'stage', typeIncludes: 'Mary Geoise' }, maxTargets: 1 }] },
};

function buildDefs(): CardDefinitionLookup {
  return {
    [IMU_DEF.cardDefinitionId]: IMU_DEF,
    [PLAIN_LEADER_DEF.cardDefinitionId]: PLAIN_LEADER_DEF,
    [MARY_GEOISE_STAGE_DEF.cardDefinitionId]: MARY_GEOISE_STAGE_DEF,
    [OFF_TYPE_STAGE_DEF.cardDefinitionId]: OFF_TYPE_STAGE_DEF,
  };
}

describe('OP13-079 (Imu) startOfGame: play up to 1 Mary Geoise Stage from deck', () => {
  it('fires before opening hands are dealt, offering only matching Stages, and shuffles after resolving', () => {
    const registry = buildRegistryFromAssignments([IMU_ASSIGNMENT]);
    const defs = buildDefs();

    const p1 = makePlayerSetupInput('p1', {
      leader: IMU_DEF,
      deck: [...makeDeckOf(47), MARY_GEOISE_STAGE_DEF, OFF_TYPE_STAGE_DEF, OFF_TYPE_STAGE_DEF],
    });
    const p2 = makePlayerSetupInput('p2', { leader: PLAIN_LEADER_DEF });

    const pregame = createPreGameState(p1, p2, { decidingPlayerId: 'p1', rngState: { seed: 'imu-seed', cursor: 0 } });
    if (!pregame.ok) throw new Error(`Expected createPreGameState to succeed, got: ${pregame.reasons.join('; ')}`);

    const chosen = executeChooseGoingFirst(pregame.state, { type: 'CHOOSE_GOING_FIRST', actionId: 'a1', playerId: 'p1', goingFirst: true });
    expect(chosen.state.setupState?.stage).toBe('awaitingStartOfGameLeaderEffect');
    // Hands must NOT be dealt yet — the startOfGame timing (5-2-1-5-1) fires
    // strictly before opening hands are dealt (5-2-1-6).
    expect(chosen.state.players.p1.hand.cardIds).toHaveLength(0);
    expect(chosen.state.players.p2.hand.cardIds).toHaveLength(0);

    const advanced = advanceStartOfGameEffects(chosen.state, defs, registry, 'a1');
    // Imu's ability suspends on a choice of which Mary Geoise Stage to play.
    expect(advanced.state.pendingChoices).toHaveLength(1);
    const choice = advanced.state.pendingChoices[0];
    expect(choice.playerId).toBe('p1');
    // Only the single matching Mary Geoise Stage should be offered, not the two off-type Stages.
    const p1DeckIds = chosen.state.players.p1.deck.cardIds;
    const maryGeoiseDeckId = p1DeckIds.find((id) => chosen.state.cardsById[id].cardDefinitionId === MARY_GEOISE_STAGE_DEF.cardDefinitionId);
    expect(maryGeoiseDeckId).toBeDefined();
    expect(choice.constraints.candidateInstanceIds).toEqual([maryGeoiseDeckId]);
    // Setup stays parked at the same stage (still queued) while the choice is pending — opening hands not dealt yet.
    expect(advanced.state.setupState?.stage).toBe('awaitingStartOfGameLeaderEffect');
    expect(advanced.state.players.p1.hand.cardIds).toHaveLength(0);

    const resolved = resumeProgram(registry['OP13-079'], advanced.state, choice, [maryGeoiseDeckId as string], defs, 'a1', registry).state;

    // Mary Geoise Stage is now in play, no longer in the deck.
    expect(resolved.players.p1.stageArea.cardIds).toEqual([maryGeoiseDeckId]);
    expect(resolved.cardsById[maryGeoiseDeckId as string].currentZone).toBe('stageArea');
    expect(resolved.players.p1.deck.cardIds).not.toContain(maryGeoiseDeckId);
    // Deck shuffled back down to 49 (50 - 1 played).
    expect(resolved.players.p1.deck.cardIds).toHaveLength(49);

    // The queue continues automatically (resuming a pending choice re-enters
    // dispatch.ts in real play, which calls advanceAutomaticPhases again) —
    // draining it here directly should now proceed straight to dealing hands
    // (no more players left in startOfGameEffectQueue, p2's Leader has no
    // startOfGame ability).
    const finished = advanceStartOfGameEffects(resolved, defs, registry, 'a1');
    expect(finished.state.setupState?.stage).toBe('awaitingMulliganDecision');
    expect(finished.state.players.p1.hand.cardIds).toHaveLength(5);
    expect(finished.state.players.p2.hand.cardIds).toHaveLength(5);
  });

  it('offers no choice (0 candidates) and proceeds straight to dealing hands when no Mary Geoise Stage is in the deck', () => {
    const registry = buildRegistryFromAssignments([IMU_ASSIGNMENT]);
    const defs = buildDefs();

    const p1 = makePlayerSetupInput('p1', { leader: IMU_DEF });
    const p2 = makePlayerSetupInput('p2', { leader: PLAIN_LEADER_DEF });

    const pregame = createPreGameState(p1, p2, { decidingPlayerId: 'p1', rngState: { seed: 'imu-no-stage-seed', cursor: 0 } });
    if (!pregame.ok) throw new Error(`Expected createPreGameState to succeed, got: ${pregame.reasons.join('; ')}`);

    const chosen = executeChooseGoingFirst(pregame.state, { type: 'CHOOSE_GOING_FIRST', actionId: 'a1', playerId: 'p1', goingFirst: true });
    const advanced = advanceStartOfGameEffects(chosen.state, defs, registry, 'a1');

    // No matching Stage anywhere in a 50-card filler-only deck: with zero
    // eligible candidates the interpreter never emits a choice at all (see
    // interpreter.ts's playStageFromDeck suspend-case: `if (eligible.length
    // === 0) { shuffle; continue; }`) — it shuffles and proceeds straight
    // through to dealing hands, with no Stage ever played.
    expect(advanced.state.pendingChoices).toHaveLength(0);
    expect(advanced.state.setupState?.stage).toBe('awaitingMulliganDecision');
    expect(advanced.state.players.p1.stageArea.cardIds).toHaveLength(0);
    expect(advanced.state.players.p1.hand.cardIds).toHaveLength(5);
  });

  it('a Leader with no startOfGame ability (plain leader) skips straight to dealing hands', () => {
    const registry = buildRegistryFromAssignments([]);
    const defs = buildDefs();

    const p1 = makePlayerSetupInput('p1', { leader: PLAIN_LEADER_DEF });
    const p2 = makePlayerSetupInput('p2', { leader: PLAIN_LEADER_DEF });

    const pregame = createPreGameState(p1, p2, { decidingPlayerId: 'p1', rngState: { seed: 'no-imu-seed', cursor: 0 } });
    if (!pregame.ok) throw new Error(`Expected createPreGameState to succeed, got: ${pregame.reasons.join('; ')}`);

    const chosen = executeChooseGoingFirst(pregame.state, { type: 'CHOOSE_GOING_FIRST', actionId: 'a1', playerId: 'p1', goingFirst: true });
    const advanced = advanceStartOfGameEffects(chosen.state, defs, registry, 'a1');

    expect(advanced.state.pendingChoices).toHaveLength(0);
    expect(advanced.state.setupState?.stage).toBe('awaitingMulliganDecision');
    expect(advanced.state.players.p1.hand.cardIds).toHaveLength(5);
    expect(advanced.state.players.p2.hand.cardIds).toHaveLength(5);
  });
});
