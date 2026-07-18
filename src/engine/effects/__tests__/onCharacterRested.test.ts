/**
 * Board-wide onCharacterRested ("If a Character is rested by your effect").
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../interpreter';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putInHand,
} from '../../rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { evaluateGates } from '../gates';

describe('onCharacterRested', () => {
  it('restedByControllerEffect passes only for the ability owner\'s resting effect', () => {
    let rig = buildBaseRig();
    const { rig: withSelf, instanceId: selfId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'SELF', cardNumber: 'SELF' }));
    const { rig: withOpp, instanceId: oppId } = putCharacterInPlay(withSelf, 'p2', makeCharacterDef({ cardDefinitionId: 'OPP', cardNumber: 'OPP' }));
    rig = withOpp;
    const gate = [{ kind: 'restedByControllerEffect' as const }];
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined, { restCause: 'effect', restSourceInstanceId: selfId })).toBe(true);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined, { restCause: 'effect', restSourceInstanceId: oppId })).toBe(false);
    expect(evaluateGates(gate, rig.state, rig.defs, 'p1', undefined, {})).toBe(false);
  });

  it('OP07-031 shape: drawAndTrash when another Character is rested by your effect', () => {
    const watcher: CardEffectAssignment = {
      cardNumber: 'SYN-BARTO',
      templateId: 'ability',
      params: {
        timing: 'onCharacterRested',
        oncePerTurn: true,
        condition: { turn: 'your' },
        gate: [{ kind: 'restedByControllerEffect' }],
        functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }],
      },
    };
    const rester: CardEffectAssignment = {
      cardNumber: 'SYN-REST',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        functions: [{ fn: 'restAllCharacters', player: 'opponent' }],
      },
    };
    const registry = buildRegistryFromAssignments([watcher, rester]);

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const deckDef = makeCharacterDef({ cardDefinitionId: 'DECK', cardNumber: 'DECK' });
    const handDef = makeCharacterDef({ cardDefinitionId: 'HAND', cardNumber: 'HAND' });
    ({ rig } = putDeckCards(rig, 'p1', deckDef, 2));
    ({ rig } = putInHand(rig, 'p1', handDef));
    const { rig: withWatcher, instanceId: watcherId } = putCharacterInPlay(
      rig,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'SYN-BARTO', cardNumber: 'SYN-BARTO' }),
    );
    const { rig: withRester, instanceId: resterId } = putCharacterInPlay(
      withWatcher,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'SYN-REST', cardNumber: 'SYN-REST' }),
    );
    const { rig: withVictim, instanceId: victimId } = putCharacterInPlay(
      withRester,
      'p2',
      makeCharacterDef({ cardDefinitionId: 'VICTIM', cardNumber: 'VICTIM' }),
    );

    const beforeHand = withVictim.state.players.p1.hand.cardIds.length;
    const result = runTimings(
      registry['SYN-REST'],
      ['activateMain'],
      withVictim.state,
      resterId,
      withVictim.defs,
      'test-rest',
      registry,
    );

    expect(result.state.cardsById[victimId]?.orientation).toBe('rested');
    // drawAndTrash suspends on trash-from-hand choice after drawing.
    expect(result.state.players.p1.hand.cardIds.length).toBe(beforeHand + 1);
    expect(result.pendingChoices.some((c) => c.sourceInstanceId === watcherId && c.kind === 'SELECT_CARDS')).toBe(true);
  });

  it('does not fire when the opponent rests a Character by their effect', () => {
    const watcher: CardEffectAssignment = {
      cardNumber: 'SYN-BARTO2',
      templateId: 'ability',
      params: {
        timing: 'onCharacterRested',
        oncePerTurn: true,
        condition: { turn: 'your' },
        gate: [{ kind: 'restedByControllerEffect' }],
        functions: [{ fn: 'draw', amount: 1 }],
      },
    };
    const rester: CardEffectAssignment = {
      cardNumber: 'SYN-OPP-REST',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        functions: [{ fn: 'restAllCharacters', player: 'opponent' }],
      },
    };
    const registry = buildRegistryFromAssignments([watcher, rester]);

    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 3 });
    const deckDef = makeCharacterDef({ cardDefinitionId: 'DECK2', cardNumber: 'DECK2' });
    ({ rig } = putDeckCards(rig, 'p1', deckDef, 2));
    const { rig: withWatcher } = putCharacterInPlay(
      rig,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'SYN-BARTO2', cardNumber: 'SYN-BARTO2' }),
    );
    // Victim is p1's Character; opponent (p2) rests it.
    const { rig: withVictim, instanceId: victimId } = putCharacterInPlay(
      withWatcher,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'VICTIM2', cardNumber: 'VICTIM2' }),
    );
    const { rig: withRester, instanceId: resterId } = putCharacterInPlay(
      withVictim,
      'p2',
      makeCharacterDef({ cardDefinitionId: 'SYN-OPP-REST', cardNumber: 'SYN-OPP-REST' }),
    );

    const beforeHand = withRester.state.players.p1.hand.cardIds.length;
    const result = runTimings(
      registry['SYN-OPP-REST'],
      ['activateMain'],
      withRester.state,
      resterId,
      withRester.defs,
      'opp-rest',
      registry,
    );

    expect(result.state.cardsById[victimId]?.orientation).toBe('rested');
    expect(result.state.players.p1.hand.cardIds.length).toBe(beforeHand);
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('OP10-036 shape: prompts setActiveControllerDon after your effect rests a Character', () => {
    const watcher: CardEffectAssignment = {
      cardNumber: 'SYN-PERONA',
      templateId: 'ability',
      params: {
        timing: 'onCharacterRested',
        oncePerTurn: true,
        condition: { turn: 'your' },
        gate: [{ kind: 'restedByControllerEffect' }],
        functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }],
      },
    };
    const rester: CardEffectAssignment = {
      cardNumber: 'SYN-REST2',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        functions: [{ fn: 'restAllCharacters', player: 'opponent' }],
      },
    };
    const registry = buildRegistryFromAssignments([watcher, rester]);

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    ({ rig } = putDon(rig, 'p1', 2, { rested: true }));
    const { rig: withWatcher, instanceId: watcherId } = putCharacterInPlay(
      rig,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'SYN-PERONA', cardNumber: 'SYN-PERONA' }),
    );
    const { rig: withRester, instanceId: resterId } = putCharacterInPlay(
      withWatcher,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'SYN-REST2', cardNumber: 'SYN-REST2' }),
    );
    const { rig: withVictim } = putCharacterInPlay(
      withRester,
      'p2',
      makeCharacterDef({ cardDefinitionId: 'VICTIM3', cardNumber: 'VICTIM3' }),
    );

    const result = runTimings(
      registry['SYN-REST2'],
      ['activateMain'],
      withVictim.state,
      resterId,
      withVictim.defs,
      'perona-rest',
      registry,
    );

    expect(result.pendingChoices.some((c) => c.sourceInstanceId === watcherId && c.kind === 'SELECT_CARDS')).toBe(true);
  });
});
