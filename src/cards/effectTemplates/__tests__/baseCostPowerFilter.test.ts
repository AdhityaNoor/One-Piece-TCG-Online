/**
 * Tests the BASE cost/power target filters (maxBasePower / maxBaseCost / exact* / min*), which read the
 * card's PRINTED value, ignoring continuous buffs/debuffs — distinct from the current-value maxPower/maxCost.
 *
 * Card wording drives the choice: "6000 base power or less" -> maxBasePower; "6000 power or less" -> maxPower.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { GameState, ContinuousEffectRecord } from '../../../engine/state/game';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 1, basePower: 1000 });
// Printed 5000 power; a +2000 continuous buff makes its CURRENT power 7000.
const FOE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE', cardNumber: 'SYN-FOE', category: 'character', baseCost: 4, basePower: 5000 });

function candidatesFor(filter: Record<string, number>) {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter }, optional: true }] },
  };
  const registry = buildRegistryFromAssignments([assignment]);
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  let srcId: string;
  let foeId: string;
  ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
  ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE));
  // +2000 continuous buff on the foe -> current power 7000, base still 5000.
  const buff: ContinuousEffectRecord = { id: 'ce-buff', sourceInstanceId: foeId, ownerId: 'p2', duration: 'permanent', description: '+2000', powerModifier: { appliesToInstanceId: foeId, amount: 2000 } };
  const state: GameState = { ...rig.state, continuousEffects: [...rig.state.continuousEffects, buff] };
  const fired = runTimings(registry['SYN-SRC'], ['activateMain'], state, srcId, rig.defs, null, registry);
  return { candidates: fired.state.pendingChoices[0]?.constraints.candidateInstanceIds ?? [], foeId };
}

describe('BASE vs CURRENT power/cost target filters', () => {
  it('maxBasePower reads the printed value (a buffed 7000/base-5000 Character still qualifies at 5000)', () => {
    const { candidates, foeId } = candidatesFor({ maxBasePower: 5000 });
    expect(candidates).toContain(foeId);
  });

  it('maxPower reads the CURRENT value (the same buffed Character is 7000, so 5000-or-less excludes it)', () => {
    const { candidates, foeId } = candidatesFor({ maxPower: 5000 });
    expect(candidates).not.toContain(foeId);
  });

  it('exactBasePower matches the printed value exactly, ignoring the buff', () => {
    expect(candidatesFor({ exactBasePower: 5000 }).candidates).toHaveLength(1);
    expect(candidatesFor({ exactBasePower: 7000 }).candidates).toHaveLength(0);
  });

  it('maxBaseCost reads the printed cost', () => {
    expect(candidatesFor({ maxBaseCost: 4 }).candidates).toHaveLength(1);
    expect(candidatesFor({ maxBaseCost: 3 }).candidates).toHaveLength(0);
  });
});
