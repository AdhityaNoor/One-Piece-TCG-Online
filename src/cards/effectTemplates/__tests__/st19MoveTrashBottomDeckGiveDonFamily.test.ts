/**
 * Engine-capability tests for ST19's "You may place 1 card from your trash at the bottom of
 * your deck: <payoff>" activated-ability shape (ST19-004 Hina, ST19-005 Monkey.D.Garp):
 * an optional `moveCards` (trash -> bottom of owner's deck) gating a payoff via `ifPrevious:
 * 'previousMovedAny'`. Also covers Hina's static "[DON!! x1] [Opponent's Turn] +4 cost".
 *
 * Uses the actual ST19 assignments, not synthetic ones, since the family is fully reviewed.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { computeCurrentCost } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { ST19_ASSIGNMENTS } from '../assignments/ST19';
import type { GameState } from '../../../engine/state/game';

const HINA = makeCharacterDef({ cardDefinitionId: 'ST19-004', cardNumber: 'ST19-004', category: 'character', baseCost: 4, basePower: 3000 });
const GARP = makeCharacterDef({ cardDefinitionId: 'ST19-005', cardNumber: 'ST19-005', category: 'character', baseCost: 5, basePower: 6000 });
const FILLER = makeCharacterDef({ cardDefinitionId: 'SYN-FILLER', cardNumber: 'SYN-FILLER', category: 'character', baseCost: 1, basePower: 1000 });
const FOE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE', cardNumber: 'SYN-FOE', category: 'character', baseCost: 4, basePower: 5000 });

const registry = buildRegistryFromAssignments(ST19_ASSIGNMENTS);

/** Moves a hand card straight into the owner's trash (bypassing a real trash action). */
function putInTrash(rig: ReturnType<typeof buildBaseRig>, playerId: 'p1' | 'p2', def: Parameters<typeof putInHand>[2]) {
  const { rig: withHand, instanceId } = putInHand(rig, playerId, def);
  const player = withHand.state.players[playerId];
  const state: GameState = {
    ...withHand.state,
    players: { ...withHand.state.players, [playerId]: { ...player, hand: { ...player.hand, cardIds: player.hand.cardIds.filter((id) => id !== instanceId) }, trash: { ...player.trash, cardIds: [instanceId, ...player.trash.cardIds] } } },
    cardsById: { ...withHand.state.cardsById, [instanceId]: { ...withHand.state.cardsById[instanceId], currentZone: 'trash' } },
  };
  return { rig: { state, defs: withHand.defs }, instanceId };
}

describe('ST19-005 Monkey.D.Garp — [Activate: Main] place 1 trash card at bottom of deck: give opponent Character -1 cost', () => {
  it('offers the payoff only after a trash card is actually moved', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let garpId: string;
    ({ rig, instanceId: garpId } = putCharacterInPlay(rig, 'p1', GARP));
    let filler1: string;
    ({ rig, instanceId: filler1 } = putInTrash(rig, 'p1', FILLER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE));

    const fired = runTimings(registry['ST19-005'], ['activateMain'], rig.state, garpId, rig.defs, null, registry);
    const moveChoice = fired.state.pendingChoices[0];
    expect(moveChoice.constraints.candidateInstanceIds).toContain(filler1);

    const afterMove = resumeProgram(registry['ST19-005'], fired.state, moveChoice, [filler1], rig.defs, null, registry);
    // The trashed card is now on the bottom of its owner's deck.
    expect(afterMove.state.cardsById[filler1].currentZone).toBe('deck');
    expect(afterMove.state.players.p1.trash.cardIds).not.toContain(filler1);

    const payoffChoice = afterMove.state.pendingChoices[0];
    expect(payoffChoice.constraints.candidateInstanceIds).toEqual([foeId]);
    const resolved = resumeProgram(registry['ST19-005'], afterMove.state, payoffChoice, [foeId], rig.defs, null, registry);
    expect(computeCurrentCost(rig.defs, resolved.state, foeId)).toBe(3);
  });

  it('does not offer the cost-reduction payoff when the player declines to move a trash card', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let garpId: string;
    ({ rig, instanceId: garpId } = putCharacterInPlay(rig, 'p1', GARP));
    let filler1: string;
    ({ rig, instanceId: filler1 } = putInTrash(rig, 'p1', FILLER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE));

    const fired = runTimings(registry['ST19-005'], ['activateMain'], rig.state, garpId, rig.defs, null, registry);
    const moveChoice = fired.state.pendingChoices[0];
    const declined = resumeProgram(registry['ST19-005'], fired.state, moveChoice, [], rig.defs, null, registry);
    expect(declined.state.pendingChoices).toHaveLength(0);
    expect(computeCurrentCost(rig.defs, declined.state, foeId)).toBe(4);
  });
});

describe('ST19-004 Hina — [DON!! x1] [Opponent\'s Turn] gains +4 cost; activated give-DON payoff', () => {
  it('gains +4 cost only while a DON!! is attached and it is the opponent\'s turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 4 });
    let hinaId: string;
    ({ rig, instanceId: hinaId } = putCharacterInPlay(rig, 'p1', HINA, { donAttached: ['don-1'] }));
    const state = runTimings(registry['ST19-004'], ['onEnterPlay'], rig.state, hinaId, rig.defs, null, registry).state;
    expect(computeCurrentCost(rig.defs, state, hinaId)).toBe(8);
  });

  it('activated ability gives a rested DON!! to the Leader/Character chosen after moving a trash card', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let hinaId: string;
    ({ rig, instanceId: hinaId } = putCharacterInPlay(rig, 'p1', HINA));
    let filler1: string;
    ({ rig, instanceId: filler1 } = putInTrash(rig, 'p1', FILLER));
    rig = putDon(rig, 'p1', 1, { rested: true }).rig;
    const leaderId = rig.state.players.p1.leaderInstanceId;

    const fired = runTimings(registry['ST19-004'], ['activateMain'], rig.state, hinaId, rig.defs, null, registry);
    const moveChoice = fired.state.pendingChoices[0];
    const afterMove = resumeProgram(registry['ST19-004'], fired.state, moveChoice, [filler1], rig.defs, null, registry);

    const donChoice = afterMove.state.pendingChoices[0];
    expect(donChoice.constraints.candidateInstanceIds).toContain(leaderId);
    const resolved = resumeProgram(registry['ST19-004'], afterMove.state, donChoice, [leaderId], rig.defs, null, registry);
    expect(resolved.state.cardsById[leaderId].donAttached).toHaveLength(1);
  });
});

