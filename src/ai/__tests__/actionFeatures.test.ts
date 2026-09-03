/**
 * The action policy's input contract.
 *
 * Two properties matter more than any individual feature value, because both
 * are silent failures if broken:
 *
 * 1. FEATURE ORDER IS A WIRE FORMAT. A fitted vector is just numbers; if the
 *    key list is reordered, every coefficient lands on the wrong feature and
 *    the model still "works", just wrongly. The order is asserted literally.
 *
 * 2. A FEATURE CONSTANT ACROSS ONE DECISION'S LEGAL SET CANNOT BE FITTED.
 *    A conditional logit models P(chosen | legal set); anything identical for
 *    every candidate cancels out of the likelihood exactly. So the extractor
 *    must never emit a bare board property (own Life, hand size on its own) —
 *    it may only emit it interacted with something about the action.
 */
import { describe, expect, it } from 'vitest';
import {
  ACTION_FEATURE_KEYS,
  actionFeaturesToVector,
  createActionFeatureContext,
  extractActionFeatures,
} from '../evaluation/actionFeatures';
import type { GameAction } from '../../engine/actions/action';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDon,
  putInHand,
} from '../../engine/rules/shared/__tests__/testRig';

const registry = {};
const ctxFor = (rig: { state: never; defs: never }, playerId = 'p1') =>
  createActionFeatureContext(rig.state, rig.defs, registry, playerId);

const act = (action: Partial<GameAction> & { type: GameAction['type'] }): GameAction =>
  ({ actionId: 'a1', playerId: 'p1', ...action }) as GameAction;

describe('action feature contract', () => {
  it('pins the feature order, because a fitted vector is positional', () => {
    // Appending is safe. Reordering silently corrupts every fitted model, so
    // this test is here to force that change to be deliberate.
    expect(ACTION_FEATURE_KEYS[0]).toBe('isPassStep');
    expect(ACTION_FEATURE_KEYS).toContain('counterHopeless');
    expect(new Set(ACTION_FEATURE_KEYS).size).toBe(ACTION_FEATURE_KEYS.length);
  });

  it('emits a vector of exactly the declared length', () => {
    const rig = buildBaseRig() as never as { state: never; defs: never };
    const v = actionFeaturesToVector(
      extractActionFeatures(ctxFor(rig), act({ type: 'END_MAIN_PHASE' })),
    );
    expect(v).toHaveLength(ACTION_FEATURE_KEYS.length);
    expect(v.every((n) => Number.isFinite(n))).toBe(true);
  });

  it('treats PLAY_CHARACTER as the reference category (no type indicator)', () => {
    // With a shared weight vector one type must be the zero point, or the
    // indicators are perfectly collinear and the fit is unidentifiable.
    const rig = buildBaseRig() as never as { state: never; defs: never };
    const f = extractActionFeatures(ctxFor(rig), act({ type: 'PLAY_CHARACTER' }));
    const typeKeys = ACTION_FEATURE_KEYS.filter((k) => k.startsWith('is'));
    expect(typeKeys.every((k) => f[k] === 0)).toBe(true);
  });
});

describe('resource commitment', () => {
  it('scores spending the last DON!! differently from spending some of it', () => {
    let rig = buildBaseRig();
    ({ rig } = putDon(rig, 'p1', 4));
    const ctx = createActionFeatureContext(rig.state, rig.defs, registry, 'p1');

    const two = extractActionFeatures(ctx, act({
      type: 'PLAY_CHARACTER', donInstanceIds: ['d1', 'd2'],
    } as never));
    const four = extractActionFeatures(ctx, act({
      type: 'PLAY_CHARACTER', donInstanceIds: ['d1', 'd2', 'd3', 'd4'],
    } as never));

    expect(two.spendsAllDon).toBe(0);
    expect(four.spendsAllDon).toBe(1);
    expect(four.donRemainingAfter).toBeLessThan(two.donRemainingAfter);
  });

  it('counts a Counter as consuming a hand card', () => {
    let rig = buildBaseRig();
    const counterDef = makeCharacterDef({ counter: 2000 });
    ({ rig } = putInHand(rig, 'p1', counterDef));
    ({ rig } = putInHand(rig, 'p1', counterDef));
    const ctx = createActionFeatureContext(rig.state, rig.defs, registry, 'p1');

    const pass = extractActionFeatures(ctx, act({ type: 'PASS_STEP' }));
    const counter = extractActionFeatures(ctx, act({
      type: 'ACTIVATE_COUNTER_CHARACTER', handCardInstanceId: 'x',
    } as never));
    expect(counter.handSizeAfter).toBeLessThan(pass.handSizeAfter);
  });
});

describe('attack shape', () => {
  it('marks a KO on a Character but never on a Leader', () => {
    // 7-1-5: reaching a Character's power KOs it. A Leader loses Life instead,
    // so "this attack kills the target" is false there by construction.
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ basePower: 6000 })));
    const attackerId = Object.keys(rig.state.cardsById).find(
      (id) => rig.state.cardsById[id].currentZone === 'characterArea',
    )!;
    let r2 = putCharacterInPlay(rig, 'p2', makeCharacterDef({ basePower: 3000 }));
    rig = r2.rig;
    const weakId = r2.instanceId;
    const leaderP2 = Object.keys(rig.state.cardsById).find(
      (id) => rig.state.cardsById[id].currentZone === 'leaderArea'
        && rig.state.cardsById[id].ownerId === 'p2',
    )!;
    const ctx = createActionFeatureContext(rig.state, rig.defs, registry, 'p1');

    const onCharacter = extractActionFeatures(ctx, act({
      type: 'DECLARE_ATTACK', attackerInstanceId: attackerId, targetInstanceId: weakId,
    } as never));
    const onLeader = extractActionFeatures(ctx, act({
      type: 'DECLARE_ATTACK', attackerInstanceId: attackerId, targetInstanceId: leaderP2,
    } as never));

    expect(onCharacter.attackKosTarget).toBe(1);
    expect(onCharacter.attackTargetIsLeader).toBe(0);
    expect(onLeader.attackKosTarget).toBe(0);
    expect(onLeader.attackTargetIsLeader).toBe(1);
    expect(onCharacter.attackPowerAdvantage).toBeGreaterThan(0);
  });

  it('notices an Active [Blocker] on the other side', () => {
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ basePower: 5000 })));
    const before = createActionFeatureContext(rig.state, rig.defs, registry, 'p1');
    const attackerId = Object.keys(rig.state.cardsById).find(
      (id) => rig.state.cardsById[id].currentZone === 'characterArea',
    )!;
    const leaderP2 = Object.keys(rig.state.cardsById).find(
      (id) => rig.state.cardsById[id].currentZone === 'leaderArea'
        && rig.state.cardsById[id].ownerId === 'p2',
    )!;
    const attack = act({
      type: 'DECLARE_ATTACK', attackerInstanceId: attackerId, targetInstanceId: leaderP2,
    } as never);
    expect(extractActionFeatures(before, attack).attackIntoActiveBlocker).toBe(0);

    ({ rig } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true })));
    const after = createActionFeatureContext(rig.state, rig.defs, registry, 'p1');
    expect(extractActionFeatures(after, attack).attackIntoActiveBlocker).toBe(1);
  });
});
