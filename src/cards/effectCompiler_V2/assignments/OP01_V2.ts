import { actionNode_V2, leaderOrCharacterSelector_V2, numberValue_V2, sequence_V2, timing_V2, upTo_V2 } from '../helpers_V2';
import type { EffectAssignment_V2 } from '../types_V2';

export const OP01_ASSIGNMENTS_V2: readonly EffectAssignment_V2[] = [
  {
    assignmentId: 'v2:OP01-001:0',
    cardNumber: 'OP01-001',
    effectIndex: 0,
    status: 'ASSIGNED',
    printedText: '[DON!! x1] [Your Turn] All of your Characters gain +1000 power.',
    coveredAtomicEffectIds: ['OP01-001#0.0'],
    effect: {
      category: 'PERMANENT',
      applicationMode: 'CONTINUOUS',
      activationZones: ['LEADER_AREA'],
      timing: timing_V2('ON_ENTER_PLAY'),
      conditions: {
        kind: 'AND',
        conditions: [
          {
            kind: 'PREDICATE',
            left: { kind: 'ATTACHED_DON_COUNT', selector: { subject: 'CARD', relations: ['THIS_CARD'] } },
            operator: 'GREATER_OR_EQUAL',
            right: numberValue_V2(1),
          },
          {
            kind: 'PREDICATE',
            left: { kind: 'CURRENT_TURN_PLAYER' },
            operator: 'EQUAL',
            right: { kind: 'EFFECT_OWNER' },
          },
        ],
      },
      optionality: 'MANDATORY',
      resolution: {
        kind: 'CREATE_CONTINUOUS_EFFECT',
        selector: {
          subject: 'CARD',
          controller: 'PLAYER',
          zones: ['CHARACTER_AREA'],
          cardCategories: ['CHARACTER'],
          quantity: { kind: 'ALL' },
        },
        modifier: {
          type: 'STAT_MODIFIER',
          stat: 'POWER',
          operation: 'ADD',
          value: numberValue_V2(1000),
        },
        duration: { kind: 'WHILE_CONDITION', condition: { kind: 'TRUE' } },
      },
      duration: { kind: 'WHILE_SOURCE_VALID' },
    },
  },
  {
    assignmentId: 'v2:OP01-026:0',
    cardNumber: 'OP01-026',
    effectIndex: 0,
    status: 'ASSIGNED',
    printedText: "[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, K.O. up to 1 of your opponent's Characters with 4000 power or less.",
    coveredAtomicEffectIds: ['OP01-026#0.0', 'OP01-026#0.1'],
    effect: {
      category: 'ACTIVATE',
      applicationMode: 'ONE_SHOT',
      activationZones: ['HAND'],
      timing: timing_V2('EVENT_COUNTER'),
      optionality: 'MANDATORY',
      resolution: sequence_V2([
        actionNode_V2(
          {
            type: 'MODIFY_POWER',
            selector: leaderOrCharacterSelector_V2('PLAYER', upTo_V2(1)),
            propertyLayer: 'CURRENT_VALUE',
            operation: 'ADD',
            value: numberValue_V2(4000),
            duration: { kind: 'THIS_BATTLE' },
          },
          'OP01-026#0.0',
        ),
        actionNode_V2(
          {
            type: 'KO_CARD',
            selector: {
              subject: 'CARD',
              controller: 'OPPONENT',
              zones: ['CHARACTER_AREA'],
              cardCategories: ['CHARACTER'],
              power: {
                propertyLayer: 'CURRENT',
                comparison: 'AT_MOST',
                value: numberValue_V2(4000),
              },
              quantity: upTo_V2(1),
              chooser: 'EFFECT_OWNER',
            },
            cause: 'EFFECT',
          },
          'OP01-026#0.1',
        ),
      ]),
    },
  },
];
