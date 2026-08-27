/**
 * Regression: the Block Step must stay OPEN when the defender's only
 * [On Your Opponent's Attack] source carries a DON!! -N cost.
 *
 * hasAnyUsableOnOpponentsAttack is an AVAILABILITY question asked before anyone has chosen which
 * DON!! to return. It used to ask it with `canPayAbilityCost(..., [])`, which requires the exact
 * DON!! ids up front and therefore answered "unusable" for every costed ability — so
 * declareAttack skipped the whole Block Step whenever the defender had no Blocker, and the
 * ability could never be activated at all. The fix is canAffordAbilityCost.
 */
import { describe, expect, it } from 'vitest';
import { executeDeclareAttack } from '../declareAttack';
import { hasAnyUsableOnOpponentsAttack } from '../activateOnOpponentsAttack';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../../cards/effectTemplates/assembler';
import {
  buildBaseRig,
  makeCharacterDef,
  nextTestId,
  putCharacterInPlay,
  putDon,
  type Rig,
} from '../../shared/__tests__/testRig';

const COSTED_DEFENDER = makeCharacterDef({
  cardDefinitionId: 'TEST-ONOPP-COSTED',
  cardNumber: 'TEST-ONOPP-COSTED',
  name: 'Costed Reactor',
  basePower: 3000,
  text: "[On Your Opponent's Attack] DON!! -1: This Character gains +1000 power during this battle.",
});

/** "[On Your Opponent's Attack] DON!! -1: +1000 power during this battle." */
const REGISTRY = buildRegistryFromAssignments([
  {
    cardNumber: COSTED_DEFENDER.cardDefinitionId,
    templateId: 'ability',
    params: {
      timing: 'onOpponentsAttack',
      cost: [{ kind: 'donMinus', count: 1 }],
      functions: [{ fn: 'addPower', target: { ref: 'self' }, amount: 1000, duration: 'duringThisBattle' }],
    },
  },
] as CardEffectAssignment[]);

/**
 * p1's Leader attacks p2's Leader. p2 holds one costed [On Your Opponent's Attack] Character and
 * `defenderDon` active DON!! — and deliberately NO [Blocker], so the Block Step survives only if
 * the reactive ability counts as usable.
 */
function declareAttackAgainstDefender(defenderDon: number) {
  let rig: Rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
  ({ rig } = putCharacterInPlay(rig, 'p2', COSTED_DEFENDER));
  if (defenderDon > 0) ({ rig } = putDon(rig, 'p2', defenderDon));

  const attackerId = rig.state.players.p1.leaderInstanceId!;
  const targetId = rig.state.players.p2.leaderInstanceId!;
  const result = executeDeclareAttack(
    rig.state,
    { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: targetId },
    rig.defs,
    REGISTRY,
  );
  return { rig, state: result.state };
}

describe("[On Your Opponent's Attack] availability with a DON!! -N cost", () => {
  it('keeps the Block Step open when the defender can afford the cost but has not chosen DON!! yet', () => {
    const { rig, state } = declareAttackAgainstDefender(1);

    expect(hasAnyUsableOnOpponentsAttack(state, 'p2', REGISTRY, rig.defs)).toBe(true);
    expect(state.currentBattle?.step).toBe('block');
  });

  it('still skips the Block Step when the defender genuinely cannot afford the cost', () => {
    const { rig, state } = declareAttackAgainstDefender(0);

    expect(hasAnyUsableOnOpponentsAttack(state, 'p2', REGISTRY, rig.defs)).toBe(false);
    expect(state.currentBattle?.step).toBe('counter');
  });
});
