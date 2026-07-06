/**
 * Engine-capability test for the `playFromTrash` effect verb added for the recursion cards
 * (OP08-090/092, OP09-085, OP10-090, OP07-105/115, OP06-098, …):
 *   "Play up to 1 {Type} Character card with a cost of N or less from your trash [rested]."
 *
 * Mirrors `playFromHand`/`playFromDeck`: a filtered choice over the controller's trash, then the
 * chosen Character enters the Character Area as a fresh instance — active by default, or rested when
 * `rested: true`. Synthetic cards + a generic assignment.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import type { CardInstance } from '../../../engine/state/card';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
const MATCH = makeCharacterDef({ cardDefinitionId: 'SYN-MATCH', cardNumber: 'SYN-MATCH', category: 'character', baseCost: 2, basePower: 3000, types: ['Thriller Bark Pirates'] });
const OFF = makeCharacterDef({ cardDefinitionId: 'SYN-OFF', cardNumber: 'SYN-OFF', category: 'character', baseCost: 5, basePower: 6000, types: ['Thriller Bark Pirates'] });

function trashInstance(instanceId: string, def: typeof MATCH): CardInstance {
  return {
    instanceId, cardDefinitionId: def.cardDefinitionId, ownerId: 'p1', controllerId: 'p1',
    currentZone: 'trash', orientation: null, faceState: 'faceUp', donAttached: [],
    appliedContinuousEffectIds: [], oncePerTurnUsed: [], summoningSick: false, revealedTo: 'all',
  } as CardInstance;
}

describe('family: playFromTrash (recur a filtered Character from your trash)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'activateMain', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 }, rested: true }] },
  };

  it('offers only matching trash Characters, then plays the chosen one rested into the Character Area', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    // Seed the trash: one matching (cost 2) and one off-filter (cost 5).
    rig = {
      defs: { ...rig.defs, [MATCH.cardDefinitionId]: MATCH, [OFF.cardDefinitionId]: OFF },
      state: {
        ...rig.state,
        cardsById: { ...rig.state.cardsById, 'tr-match': trashInstance('tr-match', MATCH), 'tr-off': trashInstance('tr-off', OFF) },
        players: { ...rig.state.players, p1: { ...rig.state.players.p1, trash: { ...rig.state.players.p1.trash, cardIds: ['tr-match', 'tr-off'] } } },
      },
    };

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain('tr-match');
    expect(choice.constraints.candidateInstanceIds).not.toContain('tr-off'); // cost 5 excluded by maxCost 2

    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, ['tr-match'], rig.defs, null, registry).state;

    // The chosen trash instance is gone; a fresh MATCH instance is in play, rested.
    expect(state.players.p1.trash.cardIds).not.toContain('tr-match');
    const played = state.players.p1.characterArea.cardIds
      .map((id) => state.cardsById[id])
      .find((c) => c.cardDefinitionId === MATCH.cardDefinitionId);
    expect(played).toBeDefined();
    expect(played?.currentZone).toBe('characterArea');
    expect(played?.orientation).toBe('rested');
  });
});
