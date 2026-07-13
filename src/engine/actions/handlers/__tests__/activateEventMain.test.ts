import { describe, expect, it } from 'vitest';
import { validateActivateEventMain, executeActivateEventMain } from '../activateEventMain';
import type { ActivateEventMainAction } from '../../action';
import type { EffectTemplateRegistry } from '../../../effects';
import { buildBaseRig, putInHand, putDon, putDeckCards, makeEventDef, makeCharacterDef, nextTestId } from '../../../rules/shared/__tests__/testRig';

function activateEventAction(playerId: string, handCardInstanceId: string, donInstanceIds: string[], abilityCostDonInstanceIds: string[] = []): ActivateEventMainAction {
  return { type: 'ACTIVATE_EVENT_MAIN', actionId: nextTestId('action'), playerId, handCardInstanceId, donInstanceIds, abilityCostDonInstanceIds };
}

function mainRegistry(cardDefinitionId: string): EffectTemplateRegistry {
  return {
    [cardDefinitionId]: {
      cardNumber: cardDefinitionId,
      abilities: [{ timing: 'activateMain', ops: [{ op: 'draw', amount: 1 }] }],
    },
  };
}

describe('validateActivateEventMain', () => {
  it('rejects outside the Main Phase', () => {
    const base = buildBaseRig({ phase: 'end' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ baseCost: 0 }));
    const defId = rig.state.cardsById[instanceId].cardDefinitionId;
    const result = validateActivateEventMain(rig.state, activateEventAction('p1', instanceId, []), rig.defs, mainRegistry(defId));
    expect(result.legal).toBe(false);
  });

  it('rejects a non-turn-player', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p2', makeEventDef({ baseCost: 0 }));
    const defId = rig.state.cardsById[instanceId].cardDefinitionId;
    const result = validateActivateEventMain(rig.state, activateEventAction('p2', instanceId, []), rig.defs, mainRegistry(defId));
    expect(result.legal).toBe(false);
  });

  it('rejects a non-Event card category', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeCharacterDef({ baseCost: 0 }));
    const defId = rig.state.cardsById[instanceId].cardDefinitionId;
    const result = validateActivateEventMain(rig.state, activateEventAction('p1', instanceId, []), rig.defs, mainRegistry(defId));
    expect(result.legal).toBe(false);
  });

  it('rejects a DON!! count mismatched with cost', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ baseCost: 2 }));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const defId = withDon.state.cardsById[instanceId].cardDefinitionId;
    const result = validateActivateEventMain(withDon.state, activateEventAction('p1', instanceId, donIds), withDon.defs, mainRegistry(defId));
    expect(result.legal).toBe(false);
  });

  it('rejects an Event with no curated [Main] effect', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ baseCost: 0 }));
    const result = validateActivateEventMain(rig.state, activateEventAction('p1', instanceId, []), rig.defs, {});
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/curated \[Main\]/);
  });

  it('accepts a well-formed ACTIVATE_EVENT_MAIN', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ baseCost: 1 }));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    const defId = withDon.state.cardsById[instanceId].cardDefinitionId;
    const result = validateActivateEventMain(withDon.state, activateEventAction('p1', instanceId, donIds), withDon.defs, mainRegistry(defId));
    expect(result.legal).toBe(true);
  });

  it('validates structured DON!! -N [Main] ability costs separately from the Event play cost', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId } = putInHand(base, 'p1', makeEventDef({ cardDefinitionId: 'COSTED-MAIN', baseCost: 1 }));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 2);
    const registry: EffectTemplateRegistry = {
      'COSTED-MAIN': {
        cardNumber: 'COSTED-MAIN',
        abilities: [{ timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], ops: [{ op: 'draw', amount: 1 }] }],
      },
    };

    const missingAbilityCost = validateActivateEventMain(withDon.state, activateEventAction('p1', instanceId, [donIds[0]]), withDon.defs, registry);
    expect(missingAbilityCost.legal).toBe(false);
    expect(missingAbilityCost.reasons.join(' ')).toContain('Cost requires selecting 1 DON!! to return, but 0 were supplied.');

    const result = validateActivateEventMain(withDon.state, activateEventAction('p1', instanceId, [donIds[0]], [donIds[1]]), withDon.defs, registry);
    expect(result.legal).toBe(true);
  });
});

describe('executeActivateEventMain', () => {
  it('rests the paid DON!!, moves the Event to trash, and fires its curated [Main] effect', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeEventDef({ baseCost: 1, name: 'Humanized Event', cardNumber: 'TEST-001', text: '[Main] Draw 1 card.' });
    const { rig, instanceId: handInstanceId } = putInHand(base, 'p1', def);
    const { rig: withDeck } = putDeckCards(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'DRAWN' }), 1);
    const { rig: withDon, donIds } = putDon(withDeck, 'p1', 1);
    const registry = mainRegistry(def.cardDefinitionId);

    const result = executeActivateEventMain(withDon.state, activateEventAction('p1', handInstanceId, donIds), withDon.defs, registry);

    expect(result.state.players.p1.hand.cardIds).not.toContain(handInstanceId);
    expect(result.state.players.p1.trash.cardIds).toContain(handInstanceId);
    expect(result.state.cardsById[handInstanceId].currentZone).toBe('trash');
    expect(result.state.cardsById[donIds[0]].donRested).toBe(true);
    expect(result.state.players.p1.hand.cardIds).toHaveLength(1);

    const entry = result.log.find((e) => e.type === 'EFFECT_ACTIVATED');
    expect(entry).toBeDefined();
    expect(entry?.data).not.toHaveProperty('effectStubbed');
    expect(entry?.data).toMatchObject({
      sourceCardName: 'Humanized Event',
      sourceCardNumber: 'TEST-001',
      effectText: '[Main] Draw 1 card.',
    });
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('returns selected DON!! for a structured DON!! -N [Main] ability cost', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const def = makeEventDef({ cardDefinitionId: 'COSTED-MAIN-EXEC', baseCost: 1, name: 'Costed Main Event', text: '[Main] DON!! -1: Draw 1 card.' });
    const { rig, instanceId: handInstanceId } = putInHand(base, 'p1', def);
    const { rig: withDeck } = putDeckCards(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'DRAWN-COSTED' }), 1);
    const { rig: withDon, donIds } = putDon(withDeck, 'p1', 2);
    const registry: EffectTemplateRegistry = {
      [def.cardDefinitionId]: {
        cardNumber: def.cardDefinitionId,
        abilities: [{ timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], ops: [{ op: 'draw', amount: 1 }] }],
      },
    };

    const result = executeActivateEventMain(withDon.state, activateEventAction('p1', handInstanceId, [donIds[0]], [donIds[1]]), withDon.defs, registry);

    expect(result.state.cardsById[donIds[0]].donRested).toBe(true);
    expect(result.state.players.p1.costArea.cardIds).not.toContain(donIds[1]);
    expect(result.state.players.p1.donDeck.cardIds).toContain(donIds[1]);
    expect(result.state.players.p1.hand.cardIds).toHaveLength(1);
    expect(result.pendingChoices).toHaveLength(0);
  });
});
