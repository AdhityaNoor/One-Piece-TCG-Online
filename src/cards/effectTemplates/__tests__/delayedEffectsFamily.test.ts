/**
 * Engine-capability tests for deferred (scheduled) effect primitives:
 *   - trashSelfAtEndOfTurn
 *   - moveSelfToBottomDeckAtEndOfBattle
 *   - movePreviousMovedToBottomDeckAtEndOfTurn
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { consumeEndOfBattleDelayedEffects } from '../../../engine/rules/phases/delayedEffects';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import type { CardInstance } from '../../../engine/state/card';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 1, basePower: 1000 });
const PLAYED = makeCharacterDef({ cardDefinitionId: 'SYN-PLAY', cardNumber: 'SYN-PLAY', category: 'character', baseCost: 3, basePower: 3000, types: ['SWORD'] });

function trashInstance(instanceId: string, def: typeof PLAYED): CardInstance {
  return {
    instanceId, cardDefinitionId: def.cardDefinitionId, ownerId: 'p1', controllerId: 'p1',
    currentZone: 'trash', orientation: null, faceState: 'faceUp', donAttached: [],
    appliedContinuousEffectIds: [], oncePerTurnUsed: [], summoningSick: false, revealedTo: 'all',
  } as CardInstance;
}

function programFor(fn: CardEffectAssignment) {
  return buildRegistryFromAssignments([fn]);
}

describe('semantic family: delayed effects', () => {
  it('trashSelfAtEndOfTurn trashes the source at end of turn', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'trashSelfAtEndOfTurn' }] },
    };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));

    const scheduled = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    expect(scheduled.state.delayedEffects).toHaveLength(1);
    expect(scheduled.state.cardsById[sourceId].currentZone).toBe('characterArea');

    const ended = runEndPhaseAndHandoff({ ...scheduled.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.cardsById[sourceId].currentZone).toBe('trash');
    expect(ended.delayedEffects ?? []).toHaveLength(0);
  });

  it('moveSelfToBottomDeckAtEndOfBattle places the source on the bottom of deck', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'whenAttacking', functions: [{ fn: 'moveSelfToBottomDeckAtEndOfBattle' }] },
    };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));

    const scheduled = runTimings(registry['SYN-SRC'], ['whenAttacking'], rig.state, sourceId, rig.defs, null, registry);
    expect(scheduled.state.delayedEffects).toHaveLength(1);

    const afterBattle = consumeEndOfBattleDelayedEffects(scheduled.state, sourceId).state;
    expect(afterBattle.cardsById[sourceId].currentZone).toBe('deck');
    expect(afterBattle.players.p1.deck.cardIds.at(-1)).toBe(sourceId);
    expect(afterBattle.delayedEffects ?? []).toHaveLength(0);
  });

  it('movePreviousMovedToBottomDeckAtEndOfTurn schedules only when a prior step moved a card', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: {
        timing: 'onPlay',
        functions: [
          { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'SWORD' } },
          { fn: 'movePreviousMovedToBottomDeckAtEndOfTurn', ifPrevious: 'previousMovedAny' },
        ],
      },
    };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    rig = {
      defs: { ...rig.defs, [PLAYED.cardDefinitionId]: PLAYED },
      state: {
        ...rig.state,
        cardsById: { ...rig.state.cardsById, 'tr-play': trashInstance('tr-play', PLAYED) },
        players: { ...rig.state.players, p1: { ...rig.state.players.p1, trash: { ...rig.state.players.p1.trash, cardIds: ['tr-play'] } } },
      },
    };

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice).toBeDefined();

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice, ['tr-play'], rig.defs, null, registry);
    expect(resolved.state.delayedEffects?.some((e) => e.kind === 'moveInstanceToBottomDeckAtEndOfTurn')).toBe(true);

    const played = resolved.state.players.p1.characterArea.cardIds
      .map((id) => resolved.state.cardsById[id])
      .find((c) => c.cardDefinitionId === PLAYED.cardDefinitionId);
    expect(played).toBeDefined();

    const ended = runEndPhaseAndHandoff({ ...resolved.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.cardsById[played!.instanceId].currentZone).toBe('deck');
    expect(ended.players.p1.deck.cardIds.at(-1)).toBe(played!.instanceId);
  });

  it('trashControllerCharacterAtEndOfTurn trashes a matching Character at end of turn', () => {
    const FILM = makeCharacterDef({ cardDefinitionId: 'SYN-FILM', cardNumber: 'SYN-FILM', category: 'character', baseCost: 2, basePower: 2000, types: ['FILM'] });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'whenAttacking', functions: [{ fn: 'trashControllerCharacterAtEndOfTurn', filter: { typeIncludes: 'FILM' } }] },
    };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let filmId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: filmId } = putCharacterInPlay(
      { ...rig, defs: { ...rig.defs, [FILM.cardDefinitionId]: FILM } },
      'p1',
      FILM,
    ));

    const scheduled = runTimings(registry['SYN-SRC'], ['whenAttacking'], rig.state, sourceId, rig.defs, null, registry);
    expect(scheduled.state.delayedEffects).toHaveLength(1);

    const ended = runEndPhaseAndHandoff({ ...scheduled.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.cardsById[filmId].currentZone).toBe('trash');
    expect(ended.cardsById[sourceId].currentZone).toBe('characterArea');
  });

  it('returnDonToMatchOpponentAtEndOfTurn returns excess DON!! at end of turn', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'returnDonToMatchOpponentAtEndOfTurn' }] },
    };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const withDon = putDon(rig, 'p1', 4, { rested: true });
    rig = putDon(withDon.rig, 'p2', 2, { rested: true }).rig;

    const scheduled = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const ended = runEndPhaseAndHandoff({ ...scheduled.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.players.p1.costArea.cardIds).toHaveLength(2);
    expect(ended.delayedEffects ?? []).toHaveLength(0);
  });

  it('trashHandDownTo trashes excess hand cards during endOfTurn', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'endOfTurn', functions: [{ fn: 'trashHandDownTo', handSize: 2 }] },
    };
    const registry = programFor(assignment);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const handIds = ['h1', 'h2', 'h3', 'h4'];
    rig = {
      ...rig,
      state: {
        ...rig.state,
        players: { ...rig.state.players, p1: { ...rig.state.players.p1, hand: { ...rig.state.players.p1.hand, cardIds: handIds } } },
        cardsById: {
          ...rig.state.cardsById,
          ...Object.fromEntries(handIds.map((id) => [id, {
            instanceId: id, cardDefinitionId: SRC.cardDefinitionId, ownerId: 'p1', controllerId: 'p1',
            currentZone: 'hand', orientation: null, faceState: 'faceUp', donAttached: [],
            appliedContinuousEffectIds: [], oncePerTurnUsed: [], summoningSick: false, revealedTo: ['p1'],
          }])),
        },
      },
    };

    const ended = runEndPhaseAndHandoff({ ...rig.state, currentPhase: 'end' }, rig.defs, registry).state;
    expect(ended.players.p1.hand.cardIds).toHaveLength(2);
    expect(handIds.filter((id) => ended.cardsById[id]?.currentZone === 'trash')).toHaveLength(2);
    void sourceId;
  });
});
