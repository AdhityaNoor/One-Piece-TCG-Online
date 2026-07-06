/**
 * Engine-capability test for the semantic family used across OP06 (OP06-046/053/056/058)
 * and OP01+: "Place up to 1 Character with a cost of N or less at the bottom of the owner's deck"
 * — the generic `moveCards` function with `from: { zone: 'characters' }` and
 * `to: { zone: 'deck', position: 'bottom' }`.
 *
 * This is the family, not any single card: a filtered target choice whose chosen
 * card is removed from play and placed on the bottom of ITS OWNER's deck.
 * Synthetic cards + a generic assignment.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 4, basePower: 5000 });
const LOW = makeCharacterDef({ cardDefinitionId: 'SYN-LOW', cardNumber: 'SYN-LOW', category: 'character', baseCost: 2, basePower: 3000 });
const HIGH = makeCharacterDef({ cardDefinitionId: 'SYN-HIGH', cardNumber: 'SYN-HIGH', category: 'character', baseCost: 5, basePower: 6000 });

describe("semantic family: moveCards → bottom of owner's deck (cost-filtered)", () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ],
    },
  };

  it('offers only Characters within the cost filter, then places the chosen one on the bottom of its owner deck', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let lowId: string; // opponent, cost 2 → candidate
    let highId: string; // opponent, cost 5 → excluded by maxCost 2
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: lowId } = putCharacterInPlay(rig, 'p2', LOW));
    ({ rig, instanceId: highId } = putCharacterInPlay(rig, 'p2', HIGH));

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain(lowId);
    expect(choice.constraints.candidateInstanceIds).not.toContain(highId);
    // "up to 1" → declining is allowed.
    expect(choice.constraints.min).toBe(0);

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice, [lowId], rig.defs, null, registry).state;

    // Chosen card left the character area and is now on the bottom of ITS OWNER's (p2) deck.
    expect(resolved.cardsById[lowId].currentZone).toBe('deck');
    expect(resolved.players.p2.characterArea.cardIds).not.toContain(lowId);
    const p2deck = resolved.players.p2.deck.cardIds;
    expect(p2deck[p2deck.length - 1]).toBe(lowId);
    // Unchosen higher-cost Character stays in play.
    expect(resolved.cardsById[highId].currentZone).toBe('characterArea');
  });
});
