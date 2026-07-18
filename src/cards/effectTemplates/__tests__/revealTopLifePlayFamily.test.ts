/**
 * Engine-capability test for the `revealTopLifePlay` effect verb (ST13-007 Sabo,
 * ST13-010 Portgas.D.Ace, ST13-014 Monkey.D.Luffy):
 *   "[Activate: Main] You may trash this Character: Reveal 1 card from the top of your
 *    Life cards. If that card is a [Name] with a cost of 5, you may play that card.
 *    If you do, up to 1 of your Leader gains +2000 power until the end of your
 *    opponent's next turn."
 *
 * The verb reveals the top Life card (public), and — only when it matches the filter —
 * offers an optional play-from-Life. The `then` branch (the Leader buff) runs only when
 * the card was actually played. Synthetic cards + generic assignments.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putLifeCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
// The matching top-Life card: a cost-5 Character named "Sabo".
const MATCH = makeCharacterDef({ cardDefinitionId: 'SYN-SABO', cardNumber: 'SYN-SABO', name: 'Sabo', category: 'character', baseCost: 5, basePower: 6000 });
// A non-matching Life card (wrong name/cost).
const OFF = makeCharacterDef({ cardDefinitionId: 'SYN-OFF', cardNumber: 'SYN-OFF', name: 'Koala', category: 'character', baseCost: 3, basePower: 4000 });

const assignment: CardEffectAssignment = {
  cardNumber: 'SYN-SRC',
  templateId: 'ability',
  params: {
    timing: 'activateMain',
    functions: [
      {
        fn: 'revealTopLifePlay',
        filter: { category: 'character', name: 'Sabo', exactCost: 5 },
        then: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn' }],
      },
    ],
  },
};

describe('family: revealTopLifePlay (reveal top Life, optionally play it, then buff)', () => {
  it('reveals a matching top-Life card, plays it from Life on confirm, and applies the Leader buff', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    // MATCH sits on TOP of Life (index 0), OFF beneath it.
    let lifeIds: string[];
    ({ rig, lifeIds } = putLifeCards(rig, 'p1', [MATCH, OFF]));
    const topLifeId = lifeIds[0];

    const leaderId = rig.state.players.p1.leaderInstanceId;
    const leaderBefore = computeCurrentPower(rig.defs, rig.state, leaderId);

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    // The top Life card was revealed (now public) and an optional SELECT_OPTION play prompt is pending.
    expect(fired.state.cardsById[topLifeId].revealedTo).toBe('all');
    const choice = fired.state.pendingChoices[0];
    expect(choice.kind).toBe('SELECT_OPTION');
    expect(choice.constraints.options?.map((o) => o.label)).toEqual(['doNotPlay', 'play']);

    // Choose "play" (index 1).
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, 1, rig.defs, null, registry).state;

    // The revealed Life instance left Life and a fresh Sabo instance is now in play.
    expect(state.players.p1.lifeArea.cardIds).not.toContain(topLifeId);
    expect(state.players.p1.lifeArea.cardIds).toEqual([lifeIds[1]]); // only OFF remains
    const played = state.players.p1.characterArea.cardIds
      .map((id) => state.cardsById[id])
      .find((c) => c.cardDefinitionId === MATCH.cardDefinitionId);
    expect(played).toBeDefined();
    expect(played?.currentZone).toBe('characterArea');

    // The Leader buff fired (only because the card was played).
    expect(computeCurrentPower(rig.defs, state, leaderId)).toBe(leaderBefore + 2000);
  });

  it('declining the optional play leaves the card in Life and applies no buff', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    let lifeIds: string[];
    ({ rig, lifeIds } = putLifeCards(rig, 'p1', [MATCH, OFF]));
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const leaderBefore = computeCurrentPower(rig.defs, rig.state, leaderId);

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    // Choose "doNotPlay" (index 0).
    const state = resumeProgram(registry['SYN-SRC'], fired.state, choice, 0, rig.defs, null, registry).state;

    expect(state.players.p1.lifeArea.cardIds).toEqual(lifeIds); // both Life cards untouched
    expect(computeCurrentPower(rig.defs, state, leaderId)).toBe(leaderBefore); // no buff
  });

  it('does not offer a play (and applies no buff) when the top Life card does not match', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    // OFF is on top now — the reveal matches nothing.
    let lifeIds: string[];
    ({ rig, lifeIds } = putLifeCards(rig, 'p1', [OFF, MATCH]));
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const leaderBefore = computeCurrentPower(rig.defs, rig.state, leaderId);

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);

    // No pending play choice; the ability completed after the (unmatched) reveal.
    expect(fired.state.pendingChoices).toHaveLength(0);
    expect(fired.state.players.p1.lifeArea.cardIds).toEqual(lifeIds); // Life untouched
    expect(computeCurrentPower(rig.defs, fired.state, leaderId)).toBe(leaderBefore); // no buff
  });
});
