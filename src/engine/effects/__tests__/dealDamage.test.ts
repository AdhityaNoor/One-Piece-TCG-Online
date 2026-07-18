/**
 * Effect-sourced Life damage (`dealDamage` / dealLifeDamage).
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../interpreter';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
  putLifeCards,
} from '../../rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { applyTemplate } from '../../../cards/effectTemplates/catalog/factories';

describe('dealDamage', () => {
  it('factory: optional wraps chooseOption; mandatory is a single op', () => {
    const optional = applyTemplate('T', 'ability', {
      timing: 'onKO',
      functions: [{ fn: 'dealDamage', amount: 1, optional: true }],
    });
    expect(optional.abilities[0].ops[0]).toMatchObject({ op: 'chooseOption' });

    const mandatory = applyTemplate('T', 'ability', {
      timing: 'activateMain',
      functions: [{ fn: 'dealDamage', amount: 1, player: 'opponent' }],
    });
    expect(mandatory.abilities[0].ops[0]).toMatchObject({ op: 'dealDamage', amount: 1, player: 'opponent' });
  });

  it('moves top Life to hand and marks previousMovedAny for Then clauses', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-DMG',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        functions: [
          { fn: 'dealDamage', player: 'opponent', amount: 1 },
          { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
        ],
      },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    const lifeDef = makeCharacterDef({ cardDefinitionId: 'LIFE-1', cardNumber: 'LIFE-1', hasTrigger: false });
    const deckDef = makeCharacterDef({ cardDefinitionId: 'DECK-1', cardNumber: 'DECK-1' });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    ({ rig } = putLifeCards(rig, 'p2', [lifeDef]));
    ({ rig } = putDeckCards(rig, 'p1', deckDef, 2));
    const { rig: withSrc, instanceId } = putCharacterInPlay(
      rig,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'SYN-DMG', cardNumber: 'SYN-DMG' }),
    );

    const beforeLife = withSrc.state.players.p2.lifeArea.cardIds.length;
    const beforeOppHand = withSrc.state.players.p2.hand.cardIds.length;
    const beforeP1Hand = withSrc.state.players.p1.hand.cardIds.length;

    const result = runTimings(
      registry['SYN-DMG'],
      ['activateMain'],
      withSrc.state,
      instanceId,
      withSrc.defs,
      null,
      registry,
    );

    expect(result.state.players.p2.lifeArea.cardIds).toHaveLength(beforeLife - 1);
    expect(result.state.players.p2.hand.cardIds).toHaveLength(beforeOppHand + 1);
    expect(result.state.players.p1.hand.cardIds.length).toBe(beforeP1Hand + 1);
    expect(result.state.gameOver).toBeNull();
  });

  it('ends the game when dealing damage to a player with 0 Life', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-DMG',
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'dealDamage', player: 'opponent', amount: 1 }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    const rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const { rig: withSrc, instanceId } = putCharacterInPlay(
      rig,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'SYN-DMG', cardNumber: 'SYN-DMG' }),
    );

    const result = runTimings(registry['SYN-DMG'], ['activateMain'], withSrc.state, instanceId, withSrc.defs, null, registry);
    expect(result.state.gameOver).toEqual({ winnerId: 'p1', reason: 'lifeDamageAtZero' });
  });

  it('OP06-116 damage branch: deal 1 when opp has exactly 1 Life, then controller Life→hand', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'OP06-116',
      templates: [
        {
          templateId: 'ability',
          params: {
            timing: 'activateMain',
            functions: [{
              fn: 'chooseOne',
              chooser: 'controller',
              prompt: 'Choose one:',
              options: [
                { label: 'ko', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] },
                {
                  label: 'damage',
                  functions: [
                    { fn: 'dealDamage', player: 'opponent', amount: 1, ifGate: [{ kind: 'opponentLife', atLeast: 1, atMost: 1 }] },
                    {
                      fn: 'moveCards',
                      from: { zone: 'life', player: 'controller', position: 'top' },
                      to: { zone: 'hand', player: 'owner' },
                      ifPrevious: 'previousMovedAny',
                    },
                  ],
                },
              ],
            }],
          },
        },
      ],
    };
    const registry = buildRegistryFromAssignments([assignment]);
    const oppLife = makeCharacterDef({ cardDefinitionId: 'OPP-LIFE', cardNumber: 'OPP-LIFE' });
    const selfLife = makeCharacterDef({ cardDefinitionId: 'SELF-LIFE', cardNumber: 'SELF-LIFE' });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let oppLifeIds: string[];
    let selfLifeIds: string[];
    ({ rig, lifeIds: oppLifeIds } = putLifeCards(rig, 'p2', [oppLife]));
    ({ rig, lifeIds: selfLifeIds } = putLifeCards(rig, 'p1', [selfLife]));
    const { rig: withSrc, instanceId } = putCharacterInPlay(
      rig,
      'p1',
      makeCharacterDef({ cardDefinitionId: 'OP06-116', cardNumber: 'OP06-116' }),
    );

    const prompted = runTimings(registry['OP06-116'], ['activateMain'], withSrc.state, instanceId, withSrc.defs, null, registry);
    const chooseOne = prompted.state.pendingChoices[0];
    expect(chooseOne.kind).toBe('SELECT_OPTION');

    // Damage branch (index 1) deals opp damage, then prompts for controller Life→hand.
    const afterDamage = resumeProgram(registry['OP06-116'], prompted.state, chooseOne, 1, withSrc.defs, null, registry);
    expect(afterDamage.state.players.p2.lifeArea.cardIds).toHaveLength(0);
    expect(afterDamage.state.players.p2.hand.cardIds).toContain(oppLifeIds[0]);
    const lifeToHand = afterDamage.state.pendingChoices[0];
    expect(lifeToHand.kind).toBe('SELECT_OPTION');

    const resolved = resumeProgram(registry['OP06-116'], afterDamage.state, lifeToHand, 0, withSrc.defs, null, registry).state;
    expect(resolved.players.p1.lifeArea.cardIds).toHaveLength(0);
    expect(resolved.players.p1.hand.cardIds).toContain(selfLifeIds[0]);
  });
});
