/**
 * revealTopThen family — "Reveal 1 card from the top of your deck. If <predicate>, <effect>."
 *
 * The primitive reveals the top card (public, left in place), tests it against an
 * optional SearchFilter predicate, and runs the `then` branch ONLY on a match — the
 * compiler gates every branch op on `ifPrevious: 'previousRevealMatched'`. Branch ops
 * may themselves suspend (e.g. a targeted K.O.); the reveal result persists across the
 * suspension. These tests exercise the whole capability with synthetic defs, not one
 * specific card number (per the "test the semantic family" convention).
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { SearchFilter } from '../../../engine/effects/effectIr';
import type { SequencedAbilityFunction } from '../catalog/templateDefs';

const SRC = makeCharacterDef({ cardDefinitionId: 'REV-SRC', cardNumber: 'REV-SRC', basePower: 2000 });
const MATCH = makeCharacterDef({ cardDefinitionId: 'REV-MATCH', cardNumber: 'REV-MATCH', basePower: 7000, types: ['Whitebeard Pirates'] });
const MISS = makeCharacterDef({ cardDefinitionId: 'REV-MISS', cardNumber: 'REV-MISS', basePower: 3000, types: ['Navy'] });
const FILLER = makeCharacterDef({ cardDefinitionId: 'REV-FILLER', cardNumber: 'REV-FILLER', basePower: 1000 });
const FOE = makeCharacterDef({ cardDefinitionId: 'REV-FOE', cardNumber: 'REV-FOE', basePower: 4000 });

function run(topDef: typeof MATCH | undefined, filter: SearchFilter | undefined, then: SequencedAbilityFunction[], withFoe = false) {
  const assignment: CardEffectAssignment = {
    cardNumber: 'REV-SRC',
    templateId: 'ability',
    params: { timing: 'activateMain', functions: [{ fn: 'revealTopThen', ...(filter ? { filter } : {}), then }] },
  };
  const registry = buildRegistryFromAssignments([assignment]);
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  let srcId: string;
  ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
  if (topDef) {
    ({ rig } = putDeckCards(rig, 'p1', topDef, 1)); // this card becomes the deck top (cardIds[0])
    ({ rig } = putDeckCards(rig, 'p1', FILLER, 2)); // filler below, so a draw doesn't empty the deck
  } // topDef undefined => deck stays empty (empty-deck case)
  let foeId: string | undefined;
  if (withFoe) ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE));
  const fired = runTimings(registry['REV-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
  return { fired, srcId, foeId };
}

describe('revealTopThen', () => {
  it('runs the branch when the revealed top card matches the predicate (draw)', () => {
    const before = 0;
    const { fired } = run(MATCH, { typeIncludes: 'Whitebeard Pirates' }, [{ fn: 'draw', amount: 1 }]);
    expect(fired.state.players.p1.hand.cardIds.length).toBe(before + 1);
  });

  it('skips the branch when the revealed top card does NOT match', () => {
    const { fired } = run(MISS, { typeIncludes: 'Whitebeard Pirates' }, [{ fn: 'draw', amount: 1 }]);
    expect(fired.state.players.p1.hand.cardIds.length).toBe(0);
  });

  it('matches on printed power via minPower ("6000 power or more")', () => {
    const hit = run(MATCH, { minPower: 6000 }, [{ fn: 'draw', amount: 1 }]);
    expect(hit.fired.state.players.p1.hand.cardIds.length).toBe(1);
    const missLow = run(MISS, { minPower: 6000 }, [{ fn: 'draw', amount: 1 }]); // 3000 power
    expect(missLow.fired.state.players.p1.hand.cardIds.length).toBe(0);
  });

  it('applies a conditional self-buff branch on a match', () => {
    const { fired, srcId } = run(MATCH, { minPower: 6000 }, [{ fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn' }]);
    const buffs = fired.state.continuousEffects.filter((ce) => ce.powerModifier?.appliesToInstanceId === srcId);
    expect(buffs).toHaveLength(1);
    expect(buffs[0]?.powerModifier?.amount).toBe(3000);
  });

  it('lets a suspending branch op (targeted K.O.) run only on a match', () => {
    const matched = run(MATCH, { minPower: 6000 }, [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }], true);
    expect(matched.fired.state.pendingChoices).toHaveLength(1);
    expect(matched.fired.state.pendingChoices[0]?.constraints.candidateInstanceIds).toContain(matched.foeId);

    const notMatched = run(MISS, { minPower: 6000 }, [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }], true);
    expect(notMatched.fired.state.pendingChoices).toHaveLength(0);
  });

  it('treats an empty deck as no match (no branch, no crash)', () => {
    const { fired } = run(undefined, { minPower: 6000 }, [{ fn: 'draw', amount: 1 }]);
    // Empty deck: nothing to reveal => no match => draw branch skipped, no throw.
    expect(fired.state.players.p1.hand.cardIds.length).toBe(0);
    expect(fired.state.gameOver).toBeNull();
  });

  it('runs an unconditional reveal branch (no filter) on any top card', () => {
    const { fired } = run(MISS, undefined, [{ fn: 'draw', amount: 1 }]);
    expect(fired.state.players.p1.hand.cardIds.length).toBe(1);
  });
});
