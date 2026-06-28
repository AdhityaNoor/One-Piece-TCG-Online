import { describe, expect, it } from 'vitest';
import { validateActivateEventMain, executeActivateEventMain } from '../activateEventMain';
import type { ActivateEventMainAction } from '../../action';
import { buildBaseRig, putInHand, putDon, makeEventDef, makeCharacterDef, nextTestId } from '../../../rules/shared/__tests__/testRig';

function activateEventAction(playerId: string, handCardInstanceId: string, donInstanceIds: string[]): ActivateEventMainAction {
  return { type: 'ACTIVATE_EVENT_MAIN', actionId: nextTestId('action'), playerId, handCardInstanceId, donInstanceIds };
}

describe('validateActivateEventMain', () => {
  it('rejects outside the Main Phase', () => {
    const base = buildBaseRig({ phase: 'end' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ baseCost: 0 }));
    const result = validateActivateEventMain(rig.state, activateEventAction('p1', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a non-turn-player', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p2', makeEventDef({ baseCost: 0 }));
    const result = validateActivateEventMain(rig.state, activateEventAction('p2', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a non-Event card category', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeCharacterDef({ baseCost: 0 }));
    const result = validateActivateEventMain(rig.state, activateEventAction('p1', instanceId, []), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('rejects a DON!! count mismatched with cost', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ baseCost: 2 }));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const result = validateActivateEventMain(withDon.state, activateEventAction('p1', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(false);
  });

  it('accepts a well-formed ACTIVATE_EVENT_MAIN', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ baseCost: 1 }));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const result = validateActivateEventMain(withDon.state, activateEventAction('p1', instanceId, donIds), withDon.defs);
    expect(result.legal).toBe(true);
  });
});

describe('executeActivateEventMain', () => {
  it('rests the paid DON!! and moves the Event straight from hand to trash, stubbing the effect', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeEventDef({ baseCost: 1 });
    const { rig, instanceId: handInstanceId } = putInHand(base, 'p1', def);
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);

    const result = executeActivateEventMain(withDon.state, activateEventAction('p1', handInstanceId, donIds), withDon.defs);

    expect(result.state.players.p1.hand.cardIds).not.toContain(handInstanceId);
    expect(result.state.players.p1.trash.cardIds).toContain(handInstanceId);
    expect(result.state.cardsById[handInstanceId].currentZone).toBe('trash');
    expect(result.state.cardsById[donIds[0]].donRested).toBe(true);

    const entry = result.log.find((e) => e.type === 'EFFECT_ACTIVATED');
    expect(entry).toBeDefined();
    expect(entry?.data).toMatchObject({ effectStubbed: true });
    expect(result.pendingChoices).toHaveLength(0);
  });
});
