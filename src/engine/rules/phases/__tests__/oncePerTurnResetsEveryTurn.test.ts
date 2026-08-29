/**
 * [Once Per Turn] is a PER-TURN usage limit, not a per-round one.
 *
 * docs/OPTCG_Canonical_Effect_Structure.md section 17 models the standard
 * keyword as `{ maximumUses: 1, period: PER_TURN, trackerScope: CARD_OBJECT }`.
 * A turn belongs to ONE player, but BOTH players' cards act during it —
 * [Blocker], [Counter], [On Your Opponent's Attack], [Opponent's Turn], and
 * the "when your Leader is attacked" watchers all fire on the turn the card's
 * controller is NOT the turn player.
 *
 * The Refresh Phase used to clear `oncePerTurnUsed` only for the turn player's
 * own cards, so such an ability reset once per ROUND: spend it on your own
 * turn and it was still marked used when the opponent attacked you, and the
 * player was silently never prompted. Reported against OP17-040
 * (Edward.Newgate) — "no prompt when my Leader is attacked".
 */
import { describe, expect, it } from 'vitest';
import { runRefreshPhase } from '../runRefreshPhase';
import { executeDeclareAttack } from '../../battle/declareAttack';
import type { DeclareAttackAction } from '../../../actions/action';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  putCharacterInPlay,
  putInHand,
  nextTestId,
} from '../../shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../../../../cards/effectTemplates/assembler';
import { OP17_ASSIGNMENTS } from '../../../../cards/effectTemplates/assignments/OP17';

const registry = buildRegistryFromAssignments([...OP17_ASSIGNMENTS]);

const NEWGATE = makeCharacterDef({
  cardDefinitionId: 'OP17-040',
  cardNumber: 'OP17-040',
  name: 'Edward.Newgate',
  baseCost: 6,
  basePower: 8000,
  types: ['Rocks Pirates'],
});
const FILLER = makeCharacterDef({ cardDefinitionId: 'FILLER-OPT', cardNumber: 'F-OPT', name: 'Filler' });

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId, attackerInstanceId, targetInstanceId };
}

describe('Refresh Phase — [Once Per Turn] budgets refill for BOTH players', () => {
  it("clears the non-turn player's oncePerTurnUsed as well", () => {
    let rig = buildBaseRig({ phase: 'refresh', activePlayerId: 'p1' });
    let mine: string;
    let theirs: string;
    ({ rig, instanceId: mine } = putCharacterInPlay(rig, 'p1', makeCharacterDef(), { oncePerTurnUsed: ['eff'] }));
    ({ rig, instanceId: theirs } = putCharacterInPlay(rig, 'p2', makeCharacterDef(), { oncePerTurnUsed: ['eff'] }));

    const result = runRefreshPhase(rig.state);

    expect(result.state.cardsById[mine].oncePerTurnUsed).toEqual([]);
    expect(result.state.cardsById[theirs].oncePerTurnUsed).toEqual([]);
  });

  it("leaves the non-turn player's rested cards rested (only the usage budget is global)", () => {
    let rig = buildBaseRig({ phase: 'refresh', activePlayerId: 'p1' });
    let theirs: string;
    ({ rig, instanceId: theirs } = putCharacterInPlay(rig, 'p2', makeCharacterDef(), { orientation: 'rested', oncePerTurnUsed: ['eff'] }));

    const result = runRefreshPhase(rig.state);

    expect(result.state.cardsById[theirs].orientation).toBe('rested');
    expect(result.state.cardsById[theirs].oncePerTurnUsed).toEqual([]);
  });
});

describe('OP17-040 — the [Once Per Turn] spent on your turn does not eat the opponent turn', () => {
  const buildRig = () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'LEADER-ROCKS', cardNumber: 'L-ROCKS', types: ['Rocks Pirates'] }),
    });
    let newgateId: string;
    ({ rig, instanceId: newgateId } = putCharacterInPlay(rig, 'p1', NEWGATE));
    for (let i = 0; i < 3; i += 1) rig = putInHand(rig, 'p1', FILLER).rig;
    return { rig, newgateId };
  };

  it('prompts again when the opponent attacks your Leader on the NEXT turn', () => {
    const { rig, newgateId } = buildRig();
    const p1Leader = rig.state.players.p1.leaderInstanceId;
    const p2Leader = rig.state.players.p2.leaderInstanceId;

    // Your turn: your Leader attacks — the [Once Per Turn] is spent.
    const myAttack = executeDeclareAttack(rig.state, declareAttack('p1', p1Leader, p2Leader), rig.defs, registry);
    expect(myAttack.pendingChoices).toHaveLength(1);
    expect(myAttack.state.cardsById[newgateId].oncePerTurnUsed).toContain('op17-040-rocks-leader');

    // Hand the turn to the opponent: their Refresh Phase starts a NEW turn, which
    // refills every card's per-turn budget — including yours.
    const opponentTurn = runRefreshPhase({
      ...myAttack.state,
      activePlayerId: 'p2',
      turnNumber: myAttack.state.turnNumber + 1,
      currentPhase: 'refresh',
      currentBattle: null,
      pendingChoices: [],
    });
    expect(opponentTurn.state.cardsById[newgateId].oncePerTurnUsed).toEqual([]);

    // Opponent attacks your Leader: you must be asked again.
    const theirAttack = executeDeclareAttack(
      { ...opponentTurn.state, currentPhase: 'main' },
      declareAttack('p2', p2Leader, p1Leader),
      rig.defs,
      registry,
    );

    expect(theirAttack.pendingChoices).toHaveLength(1);
    expect(theirAttack.pendingChoices[0].playerId).toBe('p1');
    expect(theirAttack.pendingChoices[0].sourceInstanceId).toBe(newgateId);
  });

  it('still allows only ONE use within a single turn', () => {
    const { rig: base, newgateId } = buildRig();
    const p1Leader = base.state.players.p1.leaderInstanceId;
    // Opponent's turn, two attackers, one Leader of yours to hit.
    let rig: typeof base = { ...base, state: { ...base.state, activePlayerId: 'p2' } };
    let firstAttacker: string;
    let secondAttacker: string;
    ({ rig, instanceId: firstAttacker } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 5000 })));
    ({ rig, instanceId: secondAttacker } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 5000 })));

    const first = executeDeclareAttack(rig.state, declareAttack('p2', firstAttacker, p1Leader), rig.defs, registry);
    expect(first.pendingChoices).toHaveLength(1);
    expect(first.state.cardsById[newgateId].oncePerTurnUsed).toContain('op17-040-rocks-leader');

    const second = executeDeclareAttack(
      { ...first.state, currentBattle: null, pendingChoices: [] },
      declareAttack('p2', secondAttacker, p1Leader),
      rig.defs,
      registry,
    );
    expect(second.pendingChoices).toHaveLength(0);
  });
});
