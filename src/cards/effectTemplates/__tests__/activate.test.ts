/**
 * [Activate: Main] end-to-end: ACTIVATE_CARD_EFFECT fires a card's compiled
 * activateMain ability through the interpreter, with sequential ops (a target
 * choice, then give-DON) and [Once Per Turn] enforcement.
 * Rules: 8-1-3-2 (activate), 6-5-5 (give DON!!), 10-2-13 (once per turn).
 */
import { describe, expect, it } from 'vitest';
import { createSampleGameState } from '../../../engine/state/__fixtures__/sampleGameState';
import { validateActivateCardEffect, executeActivateCardEffect } from '../../../engine/actions/handlers/activateCardEffect';
import { resumeChoice } from '../../../engine/effects';
import { compileRegistry } from '../programs';
import { compileEffect } from '../compile';
import type { ActivateCardEffectAction } from '../../../engine/actions/action';
import type { CardInstance } from '../../../engine/state/card';
import type { GameState } from '../../../engine/state/game';

const NAMI = { cardNumber: 'ST01-007', effectText: '[Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.' };
const LUFFY = { cardNumber: 'ST01-001', effectText: '[Activate: Main] [Once Per Turn] Give this Leader or 1 of your Characters up to 1 rested DON!! card.' };
const registry = compileRegistry([NAMI, LUFFY]);
const NO_DEFS = {};

function inst(id: string, cardNumber: string, zone: CardInstance['currentZone'], owner: string, extra: Partial<CardInstance> = {}): CardInstance {
  return { instanceId: id, cardDefinitionId: cardNumber, ownerId: owner, controllerId: owner, currentZone: zone, orientation: 'active', faceState: 'faceUp', donAttached: [], appliedContinuousEffectIds: [], oncePerTurnUsed: [], summoningSick: false, revealedTo: 'all', ...extra };
}

function setup(): GameState {
  const base = createSampleGameState();
  const nami = inst('nami', 'ST01-007', 'characterArea', 'p1');
  const don = inst('don1', 'DON', 'costArea', 'p1', { orientation: null, donRested: false });
  const p1 = base.players.p1;
  return {
    ...base,
    cardsById: { ...base.cardsById, nami, don1: don },
    players: { ...base.players, p1: { ...p1, characterArea: { ...p1.characterArea, cardIds: ['nami'] }, costArea: { ...p1.costArea, cardIds: ['don1'] } } },
  };
}

const action: ActivateCardEffectAction = { type: 'ACTIVATE_CARD_EFFECT', actionId: 'a', playerId: 'p1', sourceInstanceId: 'nami', effectId: 'nami-act', donInstanceIds: [] };

describe('compiler lowers [Activate: Main] give-DON', () => {
  it('compiles both Nami (give to ...) and Luffy leader (give <target> up to N) phrasings', () => {
    expect(compileEffect(NAMI.cardNumber, NAMI.effectText)?.abilities[0]).toMatchObject({ trigger: 'activateMain', oncePerTurn: true });
    expect(compileEffect(LUFFY.cardNumber, LUFFY.effectText)?.abilities[0]).toMatchObject({ trigger: 'activateMain', oncePerTurn: true });
  });
});

describe('ACTIVATE_CARD_EFFECT', () => {
  it('validates a no-cost activatable card in the Main Phase', () => {
    expect(validateActivateCardEffect(setup(), action, registry).legal).toBe(true);
  });

  it('rejects when not your card / not in play', () => {
    const r = validateActivateCardEffect(setup(), { ...action, sourceInstanceId: 'p2-leader' }, registry);
    expect(r.legal).toBe(false);
  });

  it('fires the ability: raises the give-DON choice, then resume gives 1 DON', () => {
    const fired = executeActivateCardEffect(setup(), action, NO_DEFS, registry);
    expect(fired.pendingChoices).toHaveLength(1);
    expect(fired.pendingChoices[0].constraints.candidateInstanceIds).toEqual(['p1-leader', 'nami']);
    // Once-per-turn marked at activation.
    expect(fired.state.cardsById.nami.oncePerTurnUsed).toContain('nami-act');

    const resumed = resumeChoice(fired.state, fired.pendingChoices[0].id, ['p1-leader'], registry, NO_DEFS, 'b');
    expect(resumed.state.cardsById['p1-leader'].donAttached).toEqual(['don1']);
    expect(resumed.state.cardsById.don1.donRested).toBe(true);
  });

  it('enforces [Once Per Turn]: a second activation is rejected', () => {
    const fired = executeActivateCardEffect(setup(), action, NO_DEFS, registry);
    const resumed = resumeChoice(fired.state, fired.pendingChoices[0].id, [], registry, NO_DEFS, 'b').state;
    expect(validateActivateCardEffect(resumed, action, registry).legal).toBe(false);
  });

  it('rejects activation costs (not modeled yet)', () => {
    expect(validateActivateCardEffect(setup(), { ...action, donInstanceIds: ['don1'] }, registry).legal).toBe(false);
  });
});
