import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { resumeProgram, runTimings } from '../interpreter';
import { cannotAttack, getAttackTrashTax, mustPlayCharactersRested } from '../../rules/shared/power';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putInHand,
  putDon,
} from '../../rules/shared/__tests__/testRig';
import { executeDeclareAttack, validateDeclareAttack } from '../../rules/battle/declareAttack';
import { executeResolvePendingChoice, validateResolvePendingChoice } from '../../actions/handlers/resolvePendingChoice';
import type { DeclareAttackAction, ResolvePendingChoiceAction } from '../../actions/action';
import { executePlayCharacter } from '../../actions/handlers/playCharacter';
import type { PlayCharacterAction } from '../../actions/action';

describe('EB02-039 nameMatchesPreviousMove', () => {
  it('playFromTrash only offers trash cards matching the trashed hand card name', () => {
    const event: CardEffectAssignment = {
      cardNumber: 'SYN-GERMA',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        functions: [
          { fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', typeIncludes: 'GERMA 66', maxBasePower: 4000 }, optional: true },
          {
            fn: 'playFromTrash',
            filter: { category: 'character', minBasePower: 5000, maxBasePower: 7000, nameMatchesPreviousMove: true },
            ifPrevious: 'previousMovedAny',
          },
        ],
      },
    };
    const registry = buildRegistryFromAssignments([event]);
    const sourceDef = makeCharacterDef({ cardDefinitionId: 'SYN-GERMA', cardNumber: 'SYN-GERMA', baseCost: 1 });
    const handTwin = makeCharacterDef({
      cardDefinitionId: 'GERMA-HAND',
      cardNumber: 'GERMA-HAND',
      name: 'Vinsmoke Ichiji',
      types: ['GERMA 66'],
      basePower: 4000,
      baseCost: 4,
    });
    const trashMatch = makeCharacterDef({
      cardDefinitionId: 'GERMA-TRASH-MATCH',
      cardNumber: 'GERMA-TRASH-MATCH',
      name: 'Vinsmoke Ichiji',
      types: ['GERMA 66'],
      basePower: 6000,
      baseCost: 5,
    });
    const trashOther = makeCharacterDef({
      cardDefinitionId: 'GERMA-TRASH-OTHER',
      cardNumber: 'GERMA-TRASH-OTHER',
      name: 'Vinsmoke Niji',
      types: ['GERMA 66'],
      basePower: 6000,
      baseCost: 5,
    });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', sourceDef));
    const hand = putInHand(rig, 'p1', handTwin);
    // Put both candidates into trash via putCharacter then move — use putInHand + trash via zone setup.
    const trashA = putInHand(hand.rig, 'p1', trashMatch);
    const trashB = putInHand(trashA.rig, 'p1', trashOther);
    // Move trash candidates to trash zone.
    let state = trashB.rig.state;
    for (const id of [trashA.instanceId, trashB.instanceId]) {
      const inst = state.cardsById[id];
      const p = state.players.p1;
      state = {
        ...state,
        cardsById: { ...state.cardsById, [id]: { ...inst, currentZone: 'trash' } },
        players: {
          ...state.players,
          p1: {
            ...p,
            hand: { ...p.hand, cardIds: p.hand.cardIds.filter((x) => x !== id) },
            trash: { ...p.trash, cardIds: [...p.trash.cardIds, id] },
          },
        },
      };
    }
    const defs = {
      ...trashB.rig.defs,
      [sourceDef.cardDefinitionId]: sourceDef,
      [handTwin.cardDefinitionId]: handTwin,
      [trashMatch.cardDefinitionId]: trashMatch,
      [trashOther.cardDefinitionId]: trashOther,
    };

    const first = runTimings(registry['SYN-GERMA'], ['activateMain'], state, sourceId, defs, null, registry);
    expect(first.pendingChoices[0]?.constraints.candidateInstanceIds).toContain(hand.instanceId);
    const afterTrash = resumeProgram(registry['SYN-GERMA'], first.state, first.pendingChoices[0], [hand.instanceId], defs, null, registry);
    expect(afterTrash.pendingChoices.length).toBeGreaterThan(0);
    const playChoice = afterTrash.pendingChoices[0];
    expect(playChoice.constraints.candidateInstanceIds).toContain(trashA.instanceId);
    expect(playChoice.constraints.candidateInstanceIds).not.toContain(trashB.instanceId);
  });
});

describe('OP09-022 forceCharactersPlayedRested', () => {
  it('registers permanent played-rested and forces PLAY_CHARACTER to enter rested', () => {
    const lim: CardEffectAssignment = {
      cardNumber: 'SYN-LIM',
      templateId: 'ability',
      params: { timing: 'onEnterPlay', functions: [{ fn: 'forceCharactersPlayedRested', duration: 'permanent' }] },
    };
    const registry = buildRegistryFromAssignments([lim]);
    const limDef = makeCharacterDef({ cardDefinitionId: 'SYN-LIM', cardNumber: 'SYN-LIM', baseCost: 3 });
    const vanilla = makeCharacterDef({ cardDefinitionId: 'SYN-VANILLA', cardNumber: 'SYN-VANILLA', baseCost: 2, basePower: 3000 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let limId: string;
    ({ rig, instanceId: limId } = putCharacterInPlay(rig, 'p1', limDef));
    const entered = runTimings(registry['SYN-LIM'], ['onEnterPlay'], rig.state, limId, rig.defs, null, registry).state;
    expect(mustPlayCharactersRested(entered, 'p1')).toBe(true);

    const withDon = putDon({ state: entered, defs: { ...rig.defs, [limDef.cardDefinitionId]: limDef, [vanilla.cardDefinitionId]: vanilla } }, 'p1', 2);
    const hand = putInHand(withDon.rig, 'p1', vanilla);
    const playAction: PlayCharacterAction = {
      type: 'PLAY_CHARACTER',
      actionId: 'play-1',
      playerId: 'p1',
      handCardInstanceId: hand.instanceId,
      donInstanceIds: withDon.donIds.slice(0, 2),
    };
    const played = executePlayCharacter(hand.rig.state, playAction, hand.rig.defs, registry);
    const fieldId = played.state.players.p1.characterArea.cardIds.find((id) => played.state.cardsById[id]?.cardDefinitionId === vanilla.cardDefinitionId)!;
    expect(played.state.cardsById[fieldId].orientation).toBe('rested');
  });
});

describe('OP08-043 attackUnlessTrashFromHand', () => {
  it('blocks attack with <2 hand cards and requires trash tax when attacking', () => {
    const whitebeard = makeLeaderDef({
      cardDefinitionId: 'WB-LEADER',
      cardNumber: 'WB-LEADER',
      name: 'Edward.Newgate',
      types: ['Whitebeard Pirates'],
    });
    const newgate: CardEffectAssignment = {
      cardNumber: 'SYN-NEWGATE',
      templateId: 'ability',
      params: {
        timing: 'onPlay',
        gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }, { kind: 'selfLife', atMost: 2 }],
        functions: [{
          fn: 'preventAttackAll',
          player: 'opponent',
          charactersOnly: true,
          duration: 'endOfOpponentsTurn',
          attackUnlessTrashFromHand: 2,
        }],
      },
    };
    const registry = buildRegistryFromAssignments([newgate]);
    const srcDef = makeCharacterDef({ cardDefinitionId: 'SYN-NEWGATE', cardNumber: 'SYN-NEWGATE', baseCost: 10 });
    const foeDef = makeCharacterDef({ cardDefinitionId: 'FOE', cardNumber: 'FOE', baseCost: 3, basePower: 4000 });

    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 4,
      leaderOverridesP1: whitebeard,
    });
    let srcId: string;
    let foeId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', srcDef));
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', foeDef));
    const afterPlay = runTimings(registry['SYN-NEWGATE'], ['onPlay'], rig.state, srcId, rig.defs, null, registry).state;

    // Opponent's turn — their Character is taxed.
    const oppTurn = { ...afterPlay, activePlayerId: 'p2' as const, turnNumber: 5 };
    expect(getAttackTrashTax(oppTurn, foeId, rig.defs)).toBe(2);
    expect(cannotAttack(oppTurn, foeId, rig.defs)).toBe(true); // empty hand

    const h1 = putInHand({ state: oppTurn, defs: rig.defs }, 'p2', makeCharacterDef({ cardDefinitionId: 'H1', cardNumber: 'H1' }));
    const h2 = putInHand(h1.rig, 'p2', makeCharacterDef({ cardDefinitionId: 'H2', cardNumber: 'H2' }));
    expect(cannotAttack(h2.rig.state, foeId, h2.rig.defs)).toBe(false);

    const attack: DeclareAttackAction = {
      type: 'DECLARE_ATTACK',
      actionId: 'atk-1',
      playerId: 'p2',
      attackerInstanceId: foeId,
      targetInstanceId: h2.rig.state.players.p1.leaderInstanceId!,
    };
    expect(validateDeclareAttack(h2.rig.state, attack, h2.rig.defs).legal).toBe(true);
    const declared = executeDeclareAttack(h2.rig.state, attack, h2.rig.defs, registry);
    expect(declared.pendingChoices[0]?.sourceEffectId).toBe('rule:attackTrashTax');
    expect(declared.pendingChoices[0]?.constraints.min).toBe(2);

    const resolve: ResolvePendingChoiceAction = {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: 'tax-1',
      playerId: 'p2',
      choiceId: declared.pendingChoices[0].id,
      response: [h1.instanceId, h2.instanceId],
    };
    expect(validateResolvePendingChoice(declared.state, resolve, h2.rig.defs).legal).toBe(true);
    const paid = executeResolvePendingChoice(declared.state, resolve, h2.rig.defs, registry);
    expect(paid.state.players.p2.hand.cardIds).toHaveLength(0);
    expect(paid.state.players.p2.trash.cardIds).toEqual(expect.arrayContaining([h1.instanceId, h2.instanceId]));
    expect(paid.state.currentBattle?.attackerInstanceId).toBe(foeId);
  });
});
