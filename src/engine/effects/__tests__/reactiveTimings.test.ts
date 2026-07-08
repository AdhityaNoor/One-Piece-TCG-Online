import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../effectIr';
import { resumeProgram } from '../interpreter';
import {
  fireCharacterPlayedFromHandReactions,
  fireEventActivatedReactions,
  fireOpponentBlockerActivatedReactions,
} from '../fireTiming';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putDeckCards,
  putDon,
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
});
