/**
 * ST13-003: face-up Life cards go to deck bottom instead of hand.
 */
import { describe, expect, it } from 'vitest';
import { CURATED_EFFECT_PROGRAMS } from '../../../cards/effectTemplates';
import { runTimings } from '../interpreter';
import { resolveDamageAndEndOfBattle } from '../../rules/battle/damageStep';
import { EffectContextImpl } from '../effectContext';
import { isFaceUpLifeRedirectedToDeckBottom } from '../../rules/shared/lifeToHandRestriction';
import {
  buildBaseRig,
  makeCharacterDef,
  putLifeCards,
} from '../../rules/shared/__tests__/testRig';
import type { BattleState } from '../../state/game';

function battleAt(attackerInstanceId: string, targetInstanceId: string): BattleState {
  return {
    attackerInstanceId,
    targetInstanceId,
    originalTargetInstanceId: targetInstanceId,
    step: 'damage',
    blockerUsed: false,
    battlePowerBonuses: {},
  };
}

describe('ST13-003 face-up Life → deck bottom', () => {
  it('registers the replacement at startOfGame', () => {
    const program = CURATED_EFFECT_PROGRAMS['ST13-003'];
    expect(program.abilities.some((a) => a.timing === 'startOfGame')).toBe(true);

    let rig = buildBaseRig({
      leaderOverridesP2: { cardDefinitionId: 'ST13-003', cardNumber: 'ST13-003', name: 'Monkey.D.Luffy' },
    });
    const leaderId = rig.state.players.p2.leaderInstanceId;
    const registered = runTimings(program, ['startOfGame'], rig.state, leaderId, rig.defs, null, { 'ST13-003': program });
    expect(isFaceUpLifeRedirectedToDeckBottom(registered.state, 'p2')).toBe(true);
  });

  it('battle damage: face-up Life goes to deck bottom; face-down Life still goes to hand', () => {
    const program = CURATED_EFFECT_PROGRAMS['ST13-003'];
    let rig = buildBaseRig({
      phase: 'main',
      activePlayerId: 'p1',
      leaderOverridesP2: { cardDefinitionId: 'ST13-003', cardNumber: 'ST13-003' },
    });
    const leaderId = rig.state.players.p2.leaderInstanceId;
    const registered = runTimings(program, ['startOfGame'], rig.state, leaderId, rig.defs, null, { 'ST13-003': program });
    rig = { ...rig, state: registered.state };

    const { rig: withLife, lifeIds } = putLifeCards(rig, 'p2', [
      makeCharacterDef({ cardDefinitionId: 'LIFE-FACE-UP', hasTrigger: true }),
      makeCharacterDef({ cardDefinitionId: 'LIFE-FACE-DOWN' }),
    ]);
    // Top Life is face-up; second remains face-down.
    const state = {
      ...withLife.state,
      cardsById: {
        ...withLife.state.cardsById,
        [lifeIds[0]]: { ...withLife.state.cardsById[lifeIds[0]], faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
      currentBattle: battleAt(withLife.state.players.p1.leaderInstanceId, withLife.state.players.p2.leaderInstanceId),
    };

    const result = resolveDamageAndEndOfBattle(state, withLife.defs, 'action-x', { 'ST13-003': program });

    expect(result.state.players.p2.lifeArea.cardIds).toEqual([lifeIds[1]]);
    expect(result.state.players.p2.hand.cardIds).not.toContain(lifeIds[0]);
    expect(result.state.players.p2.deck.cardIds.at(-1)).toBe(lifeIds[0]);
    expect(result.state.cardsById[lifeIds[0]].currentZone).toBe('deck');
    expect(result.pendingChoices).toHaveLength(0);
    expect(result.log.some((e) => e.type === 'TRIGGER_REVEALED')).toBe(false);

    // Face-down Life still goes to hand on the next hit (Double Attack not needed — fresh battle).
    const secondBattle = {
      ...result.state,
      currentBattle: battleAt(result.state.players.p1.leaderInstanceId, result.state.players.p2.leaderInstanceId),
    };
    const second = resolveDamageAndEndOfBattle(secondBattle, withLife.defs, 'action-y', { 'ST13-003': program });
    expect(second.state.players.p2.hand.cardIds).toContain(lifeIds[1]);
    expect(second.state.cardsById[lifeIds[1]].currentZone).toBe('hand');
  });

  it('effect moveToHand redirects face-up Life to deck bottom', () => {
    const program = CURATED_EFFECT_PROGRAMS['ST13-003'];
    let rig = buildBaseRig({
      leaderOverridesP1: { cardDefinitionId: 'ST13-003', cardNumber: 'ST13-003' },
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const registered = runTimings(program, ['startOfGame'], rig.state, leaderId, rig.defs, null, { 'ST13-003': program });
    rig = { ...rig, state: registered.state };

    const { rig: withLife, lifeIds } = putLifeCards(rig, 'p1', [makeCharacterDef()]);
    const faceUpState = {
      ...withLife.state,
      cardsById: {
        ...withLife.state.cardsById,
        [lifeIds[0]]: { ...withLife.state.cardsById[lifeIds[0]], faceState: 'faceUp' as const, revealedTo: 'all' as const },
      },
    };

    const ctx = new EffectContextImpl(faceUpState, leaderId, withLife.defs, 'test');
    ctx.moveToHand(lifeIds[0]);
    const finished = ctx.finish();

    expect(finished.state.players.p1.lifeArea.cardIds).not.toContain(lifeIds[0]);
    expect(finished.state.players.p1.hand.cardIds).not.toContain(lifeIds[0]);
    expect(finished.state.players.p1.deck.cardIds.at(-1)).toBe(lifeIds[0]);
  });
});
