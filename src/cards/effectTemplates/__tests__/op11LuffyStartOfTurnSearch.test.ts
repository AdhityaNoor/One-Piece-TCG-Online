/**
 * Regression: OP11-040 Luffy — start-of-turn search with 8+ DON!! fires at the
 * beginning of Refresh (before Draw / DON!!). Optional Activate is only offered
 * when the 8+ DON!! gate already passes (no empty prompt at DON < 8).
 */
import { describe, expect, it } from 'vitest';
import { executeAction } from '../../../engine/actions';
import { advanceAutomaticPhases } from '../../../engine/rules/phases/advanceAutomaticPhases';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  nextTestId,
  putDeckCards,
  putDon,
  putDonDeckCards,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP11_ASSIGNMENTS } from '../assignments/OP11';

const registry = buildRegistryFromAssignments(
  OP11_ASSIGNMENTS.filter((a) => a.cardNumber === 'OP11-040'),
);

describe('OP11-040 Luffy start-of-turn search', () => {
  it('offers the optional activate at Refresh start when the player already has 8 DON!!', () => {
    const luffy = makeLeaderDef({
      cardDefinitionId: 'OP11-040',
      cardNumber: 'OP11-040',
      name: 'Monkey.D.Luffy',
      life: 3,
      types: ['Straw Hat Crew'],
    });
    const strawHat = makeCharacterDef({
      cardDefinitionId: 'SHC-1',
      cardNumber: 'SHC-1',
      name: 'Nami',
      types: ['Straw Hat Crew'],
      baseCost: 3,
    });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'refresh',
      turnNumber: 5,
      leaderOverridesP1: luffy,
    });
    ({ rig } = putDon(rig, 'p1', 8));
    ({ rig } = putDeckCards(rig, 'p1', strawHat, 5));
    ({ rig } = putDonDeckCards(rig, 'p1', 2));

    const advanced = advanceAutomaticPhases(rig.state, rig.defs, registry);

    expect(advanced.state.currentPhase).toBe('refresh');
    expect(advanced.state.pendingChoices).toHaveLength(1);
    expect(advanced.state.pendingChoices[0]).toMatchObject({
      kind: 'YES_NO',
      sourceInstanceId: advanced.state.players.p1.leaderInstanceId,
    });
    // Must not have drawn or placed DON!! yet.
    expect(advanced.state.players.p1.hand.cardIds).toHaveLength(0);
    expect(advanced.state.players.p1.costArea.cardIds).toHaveLength(8);
  });

  it('after accepting with 8 DON!!, opens the Straw Hat Crew search', () => {
    const luffy = makeLeaderDef({
      cardDefinitionId: 'OP11-040',
      cardNumber: 'OP11-040',
      name: 'Monkey.D.Luffy',
      life: 3,
      types: ['Straw Hat Crew'],
    });
    const strawHat = makeCharacterDef({
      cardDefinitionId: 'SHC-1',
      cardNumber: 'SHC-1',
      name: 'Nami',
      types: ['Straw Hat Crew'],
      baseCost: 3,
    });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'refresh',
      turnNumber: 5,
      leaderOverridesP1: luffy,
    });
    ({ rig } = putDon(rig, 'p1', 8));
    const seeded = putDeckCards(rig, 'p1', strawHat, 5);
    rig = seeded.rig;

    const prompted = advanceAutomaticPhases(rig.state, rig.defs, registry);
    const yesNo = prompted.state.pendingChoices[0];

    const accepted = executeAction(
      prompted.state,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: nextTestId('yes'),
        playerId: 'p1',
        choiceId: yesNo.id,
        response: true,
      },
      rig.defs,
      registry,
    );

    const searchChoice = accepted.state.pendingChoices[0];
    expect(searchChoice.constraints.candidateInstanceIds).toEqual(
      expect.arrayContaining(seeded.deckIds.slice(0, 5)),
    );
    expect(accepted.state.currentPhase).toBe('refresh');
  });

  it('does not prompt Activate/Decline when DON!! is below 8', () => {
    const luffy = makeLeaderDef({
      cardDefinitionId: 'OP11-040',
      cardNumber: 'OP11-040',
      name: 'Monkey.D.Luffy',
      life: 3,
      types: ['Straw Hat Crew'],
    });
    const strawHat = makeCharacterDef({
      cardDefinitionId: 'SHC-1',
      cardNumber: 'SHC-1',
      name: 'Nami',
      types: ['Straw Hat Crew'],
      baseCost: 3,
    });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'refresh',
      turnNumber: 4,
      leaderOverridesP1: luffy,
    });
    ({ rig } = putDon(rig, 'p1', 7));
    ({ rig } = putDeckCards(rig, 'p1', strawHat, 5));
    ({ rig } = putDonDeckCards(rig, 'p1', 2));

    const advanced = advanceAutomaticPhases(rig.state, rig.defs, registry);

    expect(advanced.state.pendingChoices).toHaveLength(0);
    expect(advanced.state.currentPhase).toBe('main');
    expect(advanced.state.players.p1.costArea.cardIds.length).toBeGreaterThanOrEqual(7);
  });
});
