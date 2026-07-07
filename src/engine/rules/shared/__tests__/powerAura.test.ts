import { describe, expect, it } from 'vitest';
import type { ContinuousEffectRecord, ContinuousPowerCondition, GameState, PowerAuraGroup, SourceStateCondition } from '../../../state/game';
import { computeCurrentPower } from '../power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from './testRig';

function powerAura(
  group: PowerAuraGroup,
  amount: number,
  sourceInstanceId: string,
  sourceCondition?: SourceStateCondition,
  condition?: ContinuousPowerCondition,
): ContinuousEffectRecord {
  return {
    id: `power-aura-${amount}`,
    sourceInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `aura power ${amount >= 0 ? '+' : ''}${amount}`,
    powerModifier: { appliesToGroup: group, amount, ...(sourceCondition ? { sourceCondition } : {}), ...(condition ? { condition } : {}) },
  };
}

describe('continuous power aura (addPowerAura)', () => {
  it('board-gated aura (EB01-024): applies +1000 to {SMILE} Characters only while hand size ≤ 4', () => {
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ basePower: 1000 }));
    const smile = putCharacterInPlay(src.rig, 'p1', makeCharacterDef({ basePower: 2000, types: ['SMILE'] }));
    const plain = putCharacterInPlay(smile.rig, 'p1', makeCharacterDef({ basePower: 3000, types: ['Straw Hat Crew'] }));

    const group: PowerAuraGroup = { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['SMILE'] };
    const gate: ContinuousPowerCondition = { gate: [{ kind: 'selfHand', atMost: 4 }] };
    const aura = powerAura(group, 1000, src.instanceId, undefined, gate);

    const smallHand: GameState = {
      ...plain.rig.state,
      players: {
        ...plain.rig.state.players,
        p1: { ...plain.rig.state.players.p1, hand: { cardIds: ['h1', 'h2', 'h3'] } },
      },
      continuousEffects: [aura],
    };
    expect(computeCurrentPower(plain.rig.defs, smallHand, smile.instanceId)).toBe(3000); // 2000 + 1000
    expect(computeCurrentPower(plain.rig.defs, smallHand, plain.instanceId)).toBe(3000); // wrong type

    const bigHand: GameState = {
      ...smallHand,
      players: {
        ...smallHand.players,
        p1: { ...smallHand.players.p1, hand: { cardIds: ['h1', 'h2', 'h3', 'h4', 'h5'] } },
      },
    };
    expect(computeCurrentPower(plain.rig.defs, bigHand, smile.instanceId)).toBe(2000); // gate not met
  });

  it('board-gated opponent aura (OP01-091): applies −1000 only on your turn with 10+ DON!! on field', () => {
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ basePower: 1000 }));
    const opp = putCharacterInPlay(src.rig, 'p2', makeCharacterDef({ basePower: 5000 }));

    let rig = opp.rig;
    const donIds: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const put = putDon(rig, 'p1', 1);
      rig = put.rig;
      donIds.push(...put.donIds);
    }

    const group: PowerAuraGroup = { opponentCharacters: true };
    const gate: ContinuousPowerCondition = { gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }] };
    const aura = powerAura(group, -1000, src.instanceId, { turn: 'your' }, gate);

    const met: GameState = { ...rig.state, continuousEffects: [aura] };
    expect(computeCurrentPower(rig.defs, met, opp.instanceId)).toBe(4000); // 5000 - 1000

    const wrongTurn: GameState = { ...met, activePlayerId: 'p2' };
    expect(computeCurrentPower(rig.defs, wrongTurn, opp.instanceId)).toBe(5000);

    const fewDon: GameState = {
      ...met,
      players: {
        ...met.players,
        p1: { ...met.players.p1, costArea: { ...met.players.p1.costArea, cardIds: donIds.slice(0, 9) } },
      },
    };
    expect(computeCurrentPower(rig.defs, fewDon, opp.instanceId)).toBe(5000);
  });

  it('source-rested aura (OP14-027): applies only while the source Character is rested on opponent turn', () => {
    const base = buildBaseRig({ activePlayerId: 'p2' }); // p1's opponent turn
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ basePower: 1000 }));
    const opp = putCharacterInPlay(src.rig, 'p2', makeCharacterDef({ basePower: 5000 }));

    const group: PowerAuraGroup = { opponentCharacters: true };
    const aura = powerAura(group, -1000, src.instanceId, { turn: 'opponent', rested: true });

    const srcRested: GameState = {
      ...opp.rig.state,
      cardsById: { ...opp.rig.state.cardsById, [src.instanceId]: { ...opp.rig.state.cardsById[src.instanceId], orientation: 'rested' } },
      continuousEffects: [aura],
    };
    expect(computeCurrentPower(opp.rig.defs, srcRested, opp.instanceId)).toBe(4000);

    const srcActive: GameState = {
      ...srcRested,
      cardsById: { ...srcRested.cardsById, [src.instanceId]: { ...srcRested.cardsById[src.instanceId], orientation: 'active' } },
    };
    expect(computeCurrentPower(opp.rig.defs, srcActive, opp.instanceId)).toBe(5000);
  });

  it('named aura (ST30-001): applies +3000 to matching Leader/Characters by printed name on opponent turn', () => {
    const base = buildBaseRig({ activePlayerId: 'p2' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ name: 'Luffy & Ace', basePower: 5000 }));
    const ace = putCharacterInPlay(src.rig, 'p1', makeCharacterDef({ name: 'Portgas.D.Ace', basePower: 6000 }));
    const luffy = putCharacterInPlay(ace.rig, 'p1', makeCharacterDef({ name: 'Monkey.D.Luffy', basePower: 4000 }));
    const other = putCharacterInPlay(luffy.rig, 'p1', makeCharacterDef({ name: 'Sanji', basePower: 3000 }));

    const group: PowerAuraGroup = { ownLeaderAndCharacters: true, anyOfNames: ['Portgas.D.Ace', 'Monkey.D.Luffy'] };
    const aura = powerAura(group, 3000, src.instanceId, { turn: 'opponent' });
    const state: GameState = { ...other.rig.state, continuousEffects: [aura] };

    const leaderId = other.rig.state.players.p1.leaderInstanceId;
    expect(computeCurrentPower(other.rig.defs, state, leaderId)).toBe(5000); // wrong name
    expect(computeCurrentPower(other.rig.defs, state, ace.instanceId)).toBe(9000);
    expect(computeCurrentPower(other.rig.defs, state, luffy.instanceId)).toBe(7000);
    expect(computeCurrentPower(other.rig.defs, state, other.instanceId)).toBe(3000);
  });

  it('applies +2000 only while the Character itself is rested on opponent turn (OP14-026)', () => {
    const base = buildBaseRig({ activePlayerId: 'p2' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ basePower: 5000 }));
    const rig = src.rig;

    const mod: ContinuousEffectRecord = {
      id: 'oden-buff',
      sourceInstanceId: src.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: '+2000 while rested on opp turn',
      powerModifier: { appliesToInstanceId: src.instanceId, amount: 2000, condition: { turn: 'opponent', rested: true } },
    };
    const active: GameState = { ...rig.state, continuousEffects: [mod], cardsById: { ...rig.state.cardsById, [src.instanceId]: { ...rig.state.cardsById[src.instanceId], orientation: 'active' } } };
    expect(computeCurrentPower(rig.defs, active, src.instanceId)).toBe(5000);

    const rested: GameState = { ...active, cardsById: { ...active.cardsById, [src.instanceId]: { ...active.cardsById[src.instanceId], orientation: 'rested' } } };
    expect(computeCurrentPower(rig.defs, rested, src.instanceId)).toBe(7000);
  });
});
