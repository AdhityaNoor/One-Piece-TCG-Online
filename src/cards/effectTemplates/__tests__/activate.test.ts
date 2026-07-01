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
const COST_DRAW = { cardNumber: 'CD-01', effectText: '[Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Draw 1 card.' };
const registry = compileRegistry([NAMI, LUFFY, COST_DRAW]);
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

  it('rejects a stray donInstanceIds payload (costs are paid automatically, not via the action)', () => {
    expect(validateActivateCardEffect(setup(), { ...action, donInstanceIds: ['don1'] }, registry).legal).toBe(false);
  });

  it('pays a DON!! −1 activation cost, then resolves the effect (returns 1 DON!! to the deck and draws 1)', () => {
    const base = setup(); // don1 in cost area, nami in play
    const s: GameState = {
      ...base,
      cardsById: { ...base.cardsById, cd: inst('cd', 'CD-01', 'characterArea', 'p1'), topcard: inst('topcard', 'F', 'deck', 'p1') },
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          characterArea: { ...base.players.p1.characterArea, cardIds: ['nami', 'cd'] },
          deck: { ...base.players.p1.deck, cardIds: ['topcard'] },
          donDeck: { ...base.players.p1.donDeck, cardIds: [] },
        },
      },
    };
    const costAction: ActivateCardEffectAction = { ...action, sourceInstanceId: 'cd', effectId: 'cd-act' };
    expect(validateActivateCardEffect(s, costAction, registry).legal).toBe(true);

    const fired = executeActivateCardEffect(s, costAction, NO_DEFS, registry);
    // Cost paid: the DON!! returned from the cost area to the DON!! deck.
    expect(fired.state.players.p1.donDeck.cardIds).toContain('don1');
    expect(fired.state.players.p1.costArea.cardIds).not.toContain('don1');
    // Effect resolved: drew the top card.
    expect(fired.state.players.p1.hand.cardIds).toContain('topcard');
  });

  it('rejects a DON!! −1 ability when there is no DON!! on the field to return', () => {
    const base = setup();
    const s: GameState = {
      ...base,
      cardsById: { ...base.cardsById, cd: inst('cd', 'CD-01', 'characterArea', 'p1') },
      players: {
        ...base.players,
        p1: { ...base.players.p1, characterArea: { ...base.players.p1.characterArea, cardIds: ['nami', 'cd'] }, costArea: { ...base.players.p1.costArea, cardIds: [] } },
      },
    };
    const costAction: ActivateCardEffectAction = { ...action, sourceInstanceId: 'cd', effectId: 'cd-act' };
    const r = validateActivateCardEffect(s, costAction, registry);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/returning 1 DON!!|DON!!.*available/i);
  });
});
