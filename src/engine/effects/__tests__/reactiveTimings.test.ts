import { describe, expect, it } from 'vitest';
import type { GameState } from '../../state/game';
import type { EffectProgram } from '../effectIr';
import { resumeProgram, runTimings } from '../interpreter';
import { hasContinuousKeyword } from '../../rules/shared/power';
import {
  fireCharacterPlayedFromHandReactions,
  fireEventActivatedReactions,
  fireOpponentBlockerActivatedReactions,
} from '../fireTiming';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  nextTestId,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putDonDeckCards,
  putInHand,
} from '../../rules/shared/__tests__/testRig';

describe('reactive timings', () => {
  it('onOpponentEventActivated draws for Usopp when opponent activates an Event', () => {
    const usoppDef = makeCharacterDef({ cardDefinitionId: 'OP01-004-DEF', cardNumber: 'OP01-004', baseCost: 2 });
    const deckCardDef = makeCharacterDef({ cardDefinitionId: 'DECK-DEF', cardNumber: 'DECK-001', baseCost: 1 });
    const base = buildBaseRig({ activePlayerId: 'p2' });
    const withDeck = putDeckCards(base, 'p2', deckCardDef, 5);
    const withDon = putDon(withDeck.rig, 'p2', 1);
    const withUsopp = putCharacterInPlay(withDon.rig, 'p2', usoppDef, { donAttached: [withDon.donIds[0]!] });

    const registry = {
      [usoppDef.cardDefinitionId]: {
        cardNumber: 'OP01-004',
        abilities: [{
          timing: 'onOpponentEventActivated',
          oncePerTurn: true,
          condition: { donAttachedAtLeast: 1, turn: 'your' },
          ops: [{ op: 'draw', amount: 1 }],
        }],
      } satisfies EffectProgram,
    };

    const handBefore = withUsopp.rig.state.players.p2.hand.cardIds.length;
    const result = fireEventActivatedReactions(withUsopp.rig.state, 'p1', registry, withUsopp.rig.defs, 'test');
    expect(result.state.players.p2.hand.cardIds.length).toBe(handBefore + 1);
  });

  it('onYouEventActivated adds DON!! during opponent turn for Sugar leader (OP10-003)', () => {
    const sugarLeader = makeLeaderDef({ cardDefinitionId: 'OP10-003-DEF', cardNumber: 'OP10-003' });
    const base = buildBaseRig({ activePlayerId: 'p2', leaderOverridesP1: sugarLeader });
    const withDonDeck = putDonDeckCards(base, 'p1', 3);
    const fieldBefore = withDonDeck.rig.state.players.p1.costArea.cardIds.length;

    const registry = {
      [sugarLeader.cardDefinitionId]: {
        cardNumber: 'OP10-003',
        abilities: [{
          timing: 'onYouEventActivated',
          oncePerTurn: true,
          condition: { turn: 'opponent' },
          ops: [{ op: 'addDonFromDeck', count: 1, rested: false }],
        }],
      } satisfies EffectProgram,
    };

    const result = fireEventActivatedReactions(withDonDeck.rig.state, 'p1', registry, withDonDeck.rig.defs, 'test');
    expect(result.state.players.p1.costArea.cardIds.length).toBe(fieldBefore + 1);
    expect(result.state.players.p1.donDeck.cardIds.length).toBe(2);
    const addedId = result.state.players.p1.costArea.cardIds.at(-1)!;
    expect(result.state.cardsById[addedId].donRested).toBe(false);
  });

  it('drawUntilHandCount only draws the missing cards to reach the target hand size', () => {
    const sourceDef = makeCharacterDef({ cardDefinitionId: 'DRAW-UNTIL-SOURCE', cardNumber: 'TEST-DRAW-UNTIL' });
    const handDef = makeCharacterDef({ cardDefinitionId: 'HAND-CARD', cardNumber: 'HAND-001' });
    const deckDef = makeCharacterDef({ cardDefinitionId: 'DECK-CARD', cardNumber: 'DECK-001' });
    const base = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const withSource = putCharacterInPlay(base, 'p1', sourceDef);
    const withHand = putInHand(withSource.rig, 'p1', handDef);
    const withDeck = putDeckCards(withHand.rig, 'p1', deckDef, 5);

    const program = {
      cardNumber: 'TEST-DRAW-UNTIL',
      abilities: [{ timing: 'onPlay', ops: [{ op: 'drawUntilHandCount', targetCount: 3 }] }],
    } satisfies EffectProgram;

    const result = runTimings(program, ['onPlay'], withDeck.rig.state, withSource.instanceId, withDeck.rig.defs, 'test', { [sourceDef.cardDefinitionId]: program });

    expect(result.state.players.p1.hand.cardIds.length).toBe(3);
    expect(result.state.players.p1.deck.cardIds.length).toBe(3);
  });

  it('onCharacterPlayedFromHand sets DON!! active for Sanji leader', () => {
    const sanjiLeader = makeLeaderDef({ cardDefinitionId: 'OP02-026-DEF', cardNumber: 'OP02-026' });
    const vanillaDef = makeCharacterDef({ cardDefinitionId: 'VAN-DEF', cardNumber: 'VAN-001', baseCost: 1, text: '[Blocker]' });
    const base = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: sanjiLeader });
    const withDon = putDon(base, 'p1', 3, { rested: true });
    const played = putCharacterInPlay(withDon.rig, 'p1', vanillaDef);

    const registry = {
      [sanjiLeader.cardDefinitionId]: {
        cardNumber: 'OP02-026',
        abilities: [{
          timing: 'onCharacterPlayedFromHand',
          oncePerTurn: true,
          gate: [{ kind: 'playedCharacterNoBaseEffect' }, { kind: 'selfCharacterCount', atMost: 3 }],
          ops: [
            { op: 'chooseTargets', var: 't', from: { sel: 'controllerRestedDon' }, min: 0, max: 2, prompt: 'Set DON active' },
            { op: 'setActive', target: { sel: 'var', name: 't' } },
          ],
        }],
      } satisfies EffectProgram,
    };

    const fired = fireCharacterPlayedFromHandReactions(
      played.rig.state,
      'p1',
      played.instanceId,
      registry,
      played.rig.defs,
      'test',
    );
    const choice = fired.state.pendingChoices[0];
    expect(choice).toBeDefined();
    const donIds = withDon.donIds.slice(0, 2);
    const resolved = resumeProgram(registry[sanjiLeader.cardDefinitionId], fired.state, choice!, donIds, played.rig.defs, 'test', registry);
    for (const id of donIds) {
      expect(resolved.state.cardsById[id]?.donRested).toBe(false);
    }
  });

  it('onOpponentBlockerActivated K.O.s for ST10-006', () => {
    const luffyDef = makeCharacterDef({ cardDefinitionId: 'ST10-006-DEF', cardNumber: 'ST10-006', baseCost: 5 });
    const targetDef = makeCharacterDef({ cardDefinitionId: 'TGT-DEF', cardNumber: 'TGT-001', baseCost: 4, basePower: 5000 });
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const withLuffy = putCharacterInPlay(base, 'p1', luffyDef);
    const withTarget = putCharacterInPlay(withLuffy.rig, 'p2', targetDef);

    const registry = {
      [luffyDef.cardDefinitionId]: {
        cardNumber: 'ST10-006',
        abilities: [{
          timing: 'onOpponentBlockerActivated',
          oncePerTurn: true,
          ops: [{ op: 'ko', target: { sel: 'opponentCharacters', maxPower: 8000 } }],
        }],
      } satisfies EffectProgram,
    };

    const result = fireOpponentBlockerActivatedReactions(withTarget.rig.state, 'p1', registry, withTarget.rig.defs, 'test');
    expect(result.state.cardsById[withTarget.instanceId]?.currentZone).toBe('trash');
  });

  it('onCharacterPlayedFromTrash can grant Rush to the played Character', () => {
    const yamatoLeader = makeLeaderDef({ cardDefinitionId: 'OP16-079-DEF', cardNumber: 'OP16-079' });
    const sourceDef = makeCharacterDef({ cardDefinitionId: 'PLAY-FROM-TRASH-SOURCE' });
    const wanoDef = makeCharacterDef({
      cardDefinitionId: 'WANO-TRASH-CHAR',
      cardNumber: 'WANO-001',
      types: ['Land of Wano'],
      hasRush: false,
    });
    const base = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: yamatoLeader });
    const withSource = putCharacterInPlay(base, 'p1', sourceDef);
    const trashId = nextTestId('trash-character');
    const player = withSource.rig.state.players.p1;
    const state: GameState = {
      ...withSource.rig.state,
      cardsById: {
        ...withSource.rig.state.cardsById,
        [trashId]: {
          instanceId: trashId,
          cardDefinitionId: wanoDef.cardDefinitionId,
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
      players: {
        ...withSource.rig.state.players,
        p1: { ...player, trash: { ...player.trash, cardIds: [trashId] } },
      },
    };
    const defs = { ...withSource.rig.defs, [sourceDef.cardDefinitionId]: sourceDef, [wanoDef.cardDefinitionId]: wanoDef };
    const registry = {
      [sourceDef.cardDefinitionId]: {
        cardNumber: 'PLAY-FROM-TRASH-SOURCE',
        abilities: [{ timing: 'activateMain', ops: [{ op: 'playFromTrash', target: { sel: 'controllerTrash', filter: { typeIncludes: 'Land of Wano' } } }] }],
      } satisfies EffectProgram,
      [yamatoLeader.cardDefinitionId]: {
        cardNumber: 'OP16-079',
        abilities: [{
          timing: 'onCharacterPlayedFromTrash',
          gate: [{ kind: 'playedCharacterTypeIncludes', typeIncludes: 'Land of Wano' }],
          ops: [{ op: 'addKeyword', target: { sel: 'eventPlayedCharacter' }, keyword: 'rush', duration: 'duringThisTurn' }],
        }],
      } satisfies EffectProgram,
    };

    const result = runTimings(registry[sourceDef.cardDefinitionId], ['activateMain'], state, withSource.instanceId, defs, 'test', registry, false);
    const playedId = result.state.players.p1.characterArea.cardIds.find((id) => result.state.cardsById[id]?.cardDefinitionId === wanoDef.cardDefinitionId);

    expect(playedId).toBeDefined();
    expect(hasContinuousKeyword(defs, result.state, playedId!, 'rush')).toBe(true);
  });
});
