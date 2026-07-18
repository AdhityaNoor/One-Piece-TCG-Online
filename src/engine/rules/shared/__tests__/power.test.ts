import { describe, expect, it } from 'vitest';
import type { ContinuousEffectRecord } from '../../../state/game';
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

  it("scales Leader power by controllerCharacters count (P-024)", () => {
    const allyDef = makeCharacterDef({ basePower: 2000, cardNumber: 'ALLY-1' });
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const first = putCharacterInPlay(rig, 'p1', allyDef);
    rig = first.rig;
    const second = putCharacterInPlay(rig, 'p1', makeCharacterDef({ basePower: 1000, cardNumber: 'ALLY-2' }));
    rig = second.rig;

    const record: ContinuousEffectRecord = {
      id: 'scale-chars',
      sourceInstanceId: leaderId,
      ownerId: 'p1',
      duration: 'duringThisTurn',
      description: '+1000 per Character',
      powerModifier: {
        appliesToInstanceId: leaderId,
        amount: 0,
        scale: { per: 'controllerCharacters', step: 1, amountPer: 1000 },
      },
    };
    const state = { ...rig.state, continuousEffects: [record] };
    // Leader base 5000 + 2 Characters × 1000
    expect(computeCurrentPower(rig.defs, state, leaderId)).toBe(7000);
  });
});
