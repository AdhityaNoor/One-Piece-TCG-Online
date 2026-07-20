import { describe, expect, it } from 'vitest';
import type { EffectOp } from '../../../engine/effects/effectIr';
import { ALL_ASSIGNMENTS } from '../assignments';
import type { CardEffectAssignment, TemplateBinding } from '../assembler';
import { applyTemplate } from '../catalog/factories';
import type { SequencedAbilityFunction } from '../catalog/templateDefs';

type SequenceField = 'ifPrevious' | 'ifGate' | 'ifPreviousMovedAnyCostAtLeast' | 'ifPreviousSelectedPowerAtMost';

const SEQUENCE_FIELDS: readonly SequenceField[] = [
  'ifPrevious',
  'ifGate',
  'ifPreviousMovedAnyCostAtLeast',
  'ifPreviousSelectedPowerAtMost',
];

function bindingsFor(assignment: CardEffectAssignment): readonly TemplateBinding[] {
  return 'templates' in assignment ? assignment.templates : [assignment];
}

function functionsFor(binding: TemplateBinding): readonly SequencedAbilityFunction[] {
  return binding.templateId === 'ability' ? binding.params.functions : [];
}

function nestedFunctions(fn: SequencedAbilityFunction): readonly SequencedAbilityFunction[] {
  if (fn.fn === 'chooseOne') return fn.options.flatMap((option) => option.functions);
  if (fn.fn === 'optionalRevealTypeFromHand') return fn.then ?? [];
  if (fn.fn === 'revealTopThen') return fn.then;
  if (fn.fn === 'revealTopLifePlay') return fn.then ?? [];
  if (fn.fn === 'revealOpponentTopIfChosenCostMatches') return fn.then;
  return [];
}

function collectFunctions(functions: readonly SequencedAbilityFunction[]): SequencedAbilityFunction[] {
  const collected: SequencedAbilityFunction[] = [];
  for (const fn of functions) {
    collected.push(fn);
    collected.push(...collectFunctions(nestedFunctions(fn)));
  }
  return collected;
}

function ownSequenceFields(fn: SequencedAbilityFunction): SequenceField[] {
  return SEQUENCE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(fn, field));
}

function hasSameSequenceGate(op: EffectOp, fn: SequencedAbilityFunction, field: SequenceField): boolean {
  return JSON.stringify(op[field]) === JSON.stringify(fn[field]);
}

describe('sequence gate lowering across curated assignments', () => {
  it('applies each function sequence gate at the function boundary only', () => {
    const failures: string[] = [];

    for (const assignment of ALL_ASSIGNMENTS) {
      for (const binding of bindingsFor(assignment)) {
        for (const [functionIndex, fn] of collectFunctions(functionsFor(binding)).entries()) {
          const fields = ownSequenceFields(fn);
          if (fields.length === 0) continue;

          const program = applyTemplate(`${assignment.cardNumber}#sequence-${functionIndex}`, 'ability', {
            timing: 'onPlay',
            functions: [fn],
          });
          const ops = program.abilities[0]?.ops ?? [];
          const first = ops[0];
          if (!first) {
            failures.push(`${assignment.cardNumber} ${fn.fn}: no ops generated`);
            continue;
          }

          for (const field of fields) {
            if (!hasSameSequenceGate(first, fn, field)) {
              failures.push(`${assignment.cardNumber} ${fn.fn}: first op missing ${field}`);
            }
            ops.slice(1).forEach((op, opIndex) => {
              if (hasSameSequenceGate(op, fn, field)) {
                failures.push(`${assignment.cardNumber} ${fn.fn}: internal op ${opIndex + 1} repeats ${field}`);
              }
            });
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
