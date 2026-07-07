import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putDeckCards, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases/runEndPhaseAndHandoff';
import type { CardInstance } from '../../../engine/state/card';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { buildRegistryFromAssignments } from '../assembler';
import { OP14_ASSIGNMENTS } from '../assignments/OP14';
import { OP15_ASSIGNMENTS } from '../assignments/OP15';
import { OP16_ASSIGNMENTS } from '../assignments/OP16';

const PERONA = makeCharacterDef({ cardDefinitionId: 'OP14-111', cardNumber: 'OP14-111', category: 'character', baseCost: 4, basePower: 5000 });
const HUMAN_EMBARRASSING = makeEventDef({ cardDefinitionId: 'OP15-097', cardNumber: 'OP15-097', category: 'event', baseCost: 2 });
const MR3 = makeCharacterDef({ cardDefinitionId: 'OP16-056', cardNumber: 'OP16-056', category: 'character', baseCost: 4, basePower: 5000 });
const THRILLER_BARK = makeCharacterDef({ cardDefinitionId: 'SYN-TB', cardNumber: 'SYN-TB', category: 'character', baseCost: 4, basePower: 4000, types: ['Thriller Bark Pirates'] });
const FOE_BASE5 = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-BASE5', cardNumber: 'SYN-FOE-BASE5', category: 'character', baseCost: 5, basePower: 5000 });
const FOE_COST6 = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-COST6', cardNumber: 'SYN-FOE-COST6', category: 'character', baseCost: 6, basePower: 6000 });
const DECK_CARD = makeCharacterDef({ cardDefinitionId: 'SYN-DECK', cardNumber: 'SYN-DECK', category: 'character', baseCost: 1, basePower: 1000 });

const registry = buildRegistryFromAssignments([...OP14_ASSIGNMENTS, ...OP15_ASSIGNMENTS, ...OP16_ASSIGNMENTS]);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

function trashInstance(instanceId: string, def: typeof THRILLER_BARK): CardInstance {
  return {
    instanceId,
    cardDefinitionId: def.cardDefinitionId,
    ownerId: 'p1',
    controllerId: 'p1',
    currentZone: 'trash',
    orientation: null,
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false,
    revealedTo: 'all',
  };
}

describe('OP14/OP15/OP16 attack-restriction assignments', () => {
  it('OP14-111 applies its restriction from [On K.O.] until the end of the opponent turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', PERONA));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_COST6));

    const fired = runTimings(registry['OP14-111'], ['onKO'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['OP14-111'], fired.state, choice, [foeId], rig.defs, null, registry);

    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 6 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(p2Turn, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(false);
  });

  it('OP14-111 [Trigger] plays a matching Thriller Bark Pirates Character from trash rested', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', PERONA));
    rig = {
      defs: { ...rig.defs, [THRILLER_BARK.cardDefinitionId]: THRILLER_BARK },
      state: {
        ...rig.state,
        cardsById: { ...rig.state.cardsById, 'tb-trash': trashInstance('tb-trash', THRILLER_BARK) },
        players: { ...rig.state.players, p1: { ...rig.state.players.p1, trash: { ...rig.state.players.p1.trash, cardIds: ['tb-trash'] } } },
      },
    };

    const fired = runTimings(registry['OP14-111'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['OP14-111'], fired.state, choice, ['tb-trash'], rig.defs, null, registry).state;
    const playedId = resolved.players.p1.characterArea.cardIds.find((id) => resolved.cardsById[id].cardDefinitionId === THRILLER_BARK.cardDefinitionId);
    expect(playedId).toBeDefined();
    expect(resolved.cardsById[playedId!].orientation).toBe('rested');
  });

  it('OP15-097 requires 10 trash cards, then locks a base-cost-5-or-less opponent Character', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', HUMAN_EMBARRASSING));
    for (let i = 0; i < 10; i += 1) {
      rig = {
        defs: { ...rig.defs, [DECK_CARD.cardDefinitionId]: DECK_CARD },
        state: {
          ...rig.state,
          cardsById: {
            ...rig.state.cardsById,
            [`trash-${i}`]: {
              instanceId: `trash-${i}`,
              cardDefinitionId: DECK_CARD.cardDefinitionId,
              ownerId: 'p1',
              controllerId: 'p1',
              currentZone: 'trash',
              orientation: null,
              faceState: 'faceUp',
              donAttached: [],
              appliedContinuousEffectIds: [],
              oncePerTurnUsed: [],
              summoningSick: false,
              revealedTo: 'all',
            },
          },
          players: { ...rig.state.players, p1: { ...rig.state.players.p1, trash: { ...rig.state.players.p1.trash, cardIds: [...rig.state.players.p1.trash.cardIds, `trash-${i}`] } } },
        },
      };
    }
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_BASE5));

    const fired = runTimings(registry['OP15-097'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['OP15-097'], fired.state, choice, [foeId], rig.defs, null, registry);

    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 6 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(p2Turn, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(false);
    expect(runEndPhaseAndHandoff({ ...p2Turn, currentPhase: 'end' }, rig.defs, registry).state.continuousEffects).toEqual([]);
  });

  it('OP16-056 trashes itself as a cost, draws 2, then locks an opponent Character', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', MR3));
    ({ rig } = putDeckCards(rig, 'p1', DECK_CARD, 3));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE_COST6));
    const handBefore = rig.state.players.p1.hand.cardIds.length;

    const fired = runTimings(registry['OP16-056'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    expect(fired.state.cardsById[sourceId].currentZone).toBe('trash');
    expect(fired.state.players.p1.hand.cardIds.length - handBefore).toBe(2);

    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['OP16-056'], fired.state, choice, [foeId], rig.defs, null, registry);
    const p2Turn = { ...resolved.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const, turnNumber: 6 };
    const p1LeaderId = p2Turn.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(p2Turn, declareAttack('p2', foeId, p1LeaderId), rig.defs).legal).toBe(false);
  });
});
