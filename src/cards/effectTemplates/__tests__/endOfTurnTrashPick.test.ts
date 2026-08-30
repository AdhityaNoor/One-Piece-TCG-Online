/**
 * "Then, trash 1 of your {FILM} type Characters at the end of this turn." (OP06-006)
 *
 * WHICH Character is trashed is the controller's choice. The end-of-turn step cannot prompt
 * (phases/phaseStepResult.ts: automatic phases never block on input), so the engine used to take
 * `characterArea.find(matching)` — the first one on the board — with no prompt at all. The pick
 * is now made when the ability resolves and carried on the delayed record; a pick that has left
 * the field by end of turn falls back to the first match, and so does a declined pick.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP06_ASSIGNMENTS } from '../assignments/OP06';

const registry = buildRegistryFromAssignments(OP06_ASSIGNMENTS.filter((a) => a.cardNumber === 'OP06-006'));
const SOURCE = makeCharacterDef({ cardDefinitionId: 'OP06-006', cardNumber: 'OP06-006', name: 'Source', baseCost: 4, basePower: 6000, types: ['FILM'] });
const FILM_A = makeCharacterDef({ cardDefinitionId: 'FILM-A', cardNumber: 'FILM-A', name: 'Film A', types: ['FILM'] });
const FILM_B = makeCharacterDef({ cardDefinitionId: 'FILM-B', cardNumber: 'FILM-B', name: 'Film B', types: ['FILM'] });

function rig() {
  let r = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
  let sourceId: string;
  let aId: string;
  let bId: string;
  ({ rig: r, instanceId: aId } = putCharacterInPlay(r, 'p1', FILM_A));
  ({ rig: r, instanceId: bId } = putCharacterInPlay(r, 'p1', FILM_B));
  ({ rig: r, instanceId: sourceId } = putCharacterInPlay(r, 'p1', SOURCE, { donAttached: ['don-x'] }));
  return { r, sourceId, aId, bId };
}

const endTurn = (state: Parameters<typeof runEndPhaseAndHandoff>[0], defs: Parameters<typeof runEndPhaseAndHandoff>[1]) =>
  runEndPhaseAndHandoff({ ...state, currentPhase: 'end' }, defs, registry).state;

describe('OP06-006 — the player picks which {FILM} Character is trashed at end of turn', () => {
  it('trashes the CHOSEN Character, not the first one on the board', () => {
    const { r, sourceId, aId, bId } = rig();

    const fired = runTimings(registry['OP06-006'], ['whenAttacking'], r.state, sourceId, r.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice, 'the ability asks which Character to trash').toBeDefined();
    expect(choice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([aId, bId, sourceId]));

    const scheduled = resumeProgram(registry['OP06-006'], fired.state, choice, [bId], r.defs, null, registry);
    const ended = endTurn(scheduled.state, r.defs);

    expect(ended.players.p1.characterArea.cardIds).not.toContain(bId);
    expect(ended.players.p1.characterArea.cardIds).toContain(aId); // the first match survives
  });

  it('still trashes a matching Character when the pick is declined (the trash is mandatory)', () => {
    const { r, sourceId, aId } = rig();

    const fired = runTimings(registry['OP06-006'], ['whenAttacking'], r.state, sourceId, r.defs, null, registry);
    const scheduled = resumeProgram(registry['OP06-006'], fired.state, fired.state.pendingChoices[0], [], r.defs, null, registry);
    const ended = endTurn(scheduled.state, r.defs);

    expect(ended.players.p1.characterArea.cardIds).not.toContain(aId); // falls back to the first match
  });

  it('falls back when the chosen Character has already left the field', () => {
    const { r, sourceId, aId, bId } = rig();

    const fired = runTimings(registry['OP06-006'], ['whenAttacking'], r.state, sourceId, r.defs, null, registry);
    const scheduled = resumeProgram(registry['OP06-006'], fired.state, fired.state.pendingChoices[0], [bId], r.defs, null, registry);

    // B is K.O.'d during the turn: the end-of-turn trash must still happen, on another match.
    const withoutB = {
      ...scheduled.state,
      players: {
        ...scheduled.state.players,
        p1: {
          ...scheduled.state.players.p1,
          characterArea: { ...scheduled.state.players.p1.characterArea, cardIds: scheduled.state.players.p1.characterArea.cardIds.filter((id) => id !== bId) },
          trash: { ...scheduled.state.players.p1.trash, cardIds: [...scheduled.state.players.p1.trash.cardIds, bId] },
        },
      },
      cardsById: { ...scheduled.state.cardsById, [bId]: { ...scheduled.state.cardsById[bId], currentZone: 'trash' as const } },
    };

    const ended = endTurn(withoutB, r.defs);
    expect(ended.players.p1.characterArea.cardIds).not.toContain(aId);
  });
});
