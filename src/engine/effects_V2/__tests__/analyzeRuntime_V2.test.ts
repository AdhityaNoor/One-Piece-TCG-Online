import { describe, expect, it } from 'vitest';
import type { EffectProgram_V2 } from '../../../cards/effectCompiler_V2/effectIr_V2';
import { analyzeEffectPrograms_V2 } from '../analyzeRuntime_V2';

describe('analyzeEffectPrograms_V2', () => {
  it('counts V2 action, cost, node, and nested choice primitives', () => {
    const program: EffectProgram_V2 = {
      schemaVersion: 'op-tcg-effect-v2.0.0',
      cardNumber: 'TEST-001',
      canonicalEffects: [],
      abilities: [
        {
          abilityId: 'TEST-001#0',
          timing: { kind: 'STANDARD_TIMING', timing: 'ACTIVATE_MAIN' },
          activationCost: {
            payments: [{ type: 'DON_MINUS_COST', count: { kind: 'NUMBER', value: 1 }, selectableZones: ['COST_AREA'] }],
            optionalPayment: 'REQUIRED_TO_ACTIVATE',
            executionPolicy: 'VERIFY_ALL_THEN_PAY_IN_ORDER',
          },
          resolution: {
            kind: 'SEQUENCE',
            nodes: [
              { kind: 'ACTION', action: { type: 'DRAW_CARD', player: 'PLAYER', count: { kind: 'NUMBER', value: 1 } } },
              {
                kind: 'CHOOSE',
                chooser: 'PLAYER',
                minimumChoices: 1,
                maximumChoices: 1,
                options: [
                  { kind: 'ACTION', action: { type: 'REORDER_CARDS', selector: { subject: 'ACTION_RESULT' }, destination: { zone: 'DECK', position: 'BOTTOM' }, orderChooser: 'PLAYER' } },
                  { kind: 'ACTION', action: { type: 'SET_DAMAGE', source: { subject: 'CARD', relations: ['THIS_CARD'] }, targetPlayer: 'OPPONENT', amount: { kind: 'NUMBER', value: 1 } } },
                ],
              },
            ],
          },
        },
      ],
    };

    const summary = analyzeEffectPrograms_V2({ [program.cardNumber]: program });

    expect(summary.byPrimitive['cost:DON_MINUS_COST']).toMatchObject({ count: 1, status: 'implemented' });
    expect(summary.byPrimitive['action:DRAW_CARD']).toMatchObject({ count: 1, status: 'implemented' });
    expect(summary.byPrimitive['node:SEQUENCE']).toMatchObject({ count: 1, status: 'implemented' });
    expect(summary.byPrimitive['action:REORDER_CARDS']).toMatchObject({ count: 1, status: 'implemented' });
    expect(summary.byPrimitive['action:SET_DAMAGE']).toMatchObject({ count: 1, status: 'planned' });
    expect(summary.plannedUsages).toBeGreaterThan(0);
  });
});
