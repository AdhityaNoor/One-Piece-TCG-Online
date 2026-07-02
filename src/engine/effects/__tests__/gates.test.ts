import { describe, expect, it } from 'vitest';
import { makeCharacterDef, buildBaseRig, putLifeCards } from '../../rules/shared/__tests__/testRig';
import { evaluateGates } from '../gates';

describe('evaluateGates', () => {
  it('checks opponent Life count gates from the ability controller perspective', () => {
    let rig = buildBaseRig();
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'TEST-LIFE', cardNumber: 'TEST-LIFE' });
    ({ rig } = putLifeCards(rig, 'p2', [lifeCard]));

    expect(evaluateGates([{ kind: 'opponentLife', atMost: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
    expect(evaluateGates([{ kind: 'opponentLife', atMost: 0 }], rig.state, rig.defs, 'p1')).toBe(false);
    expect(evaluateGates([{ kind: 'opponentLife', atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
  });
});
