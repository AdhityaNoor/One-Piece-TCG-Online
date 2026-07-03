import { describe, expect, it } from 'vitest';
import { computeCurrentPower } from '../power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from './testRig';

describe('computeCurrentPower', () => {
  it("counts attached DON!! power only during that card owner's turn", () => {
    const characterDef = makeCharacterDef({ basePower: 3000 });
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const { rig, instanceId } = putCharacterInPlay(base, 'p1', characterDef, { donAttached: ['don-1', 'don-2'] });

    expect(computeCurrentPower(rig.defs, rig.state, instanceId)).toBe(5000);

    const opponentTurnState = { ...rig.state, activePlayerId: 'p2' as const };
    expect(computeCurrentPower(rig.defs, opponentTurnState, instanceId)).toBe(3000);
  });
});
