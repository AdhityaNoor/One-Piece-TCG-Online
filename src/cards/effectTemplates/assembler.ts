/**
 * Effect template assembler.
 *
 * Takes a flat list of reviewed CardEffectAssignments — each binding one card
 * number to a named template ID + typed params — and produces an
 * EffectTemplateRegistry the engine can use at runtime.
 *
 * This replaces the old monolithic CURATED_EFFECT_PROGRAMS object: instead of
 * hand-growing one big map, reviewers add per-card assignments to their set's
 * file, and the assembler produces the registry automatically.
 *
 * Invariants enforced at assembly time:
 *   - Duplicate card numbers are detected (second entry wins + console.warn).
 *   - Output is JSON-serializable: every EffectProgram comes from a factory that
 *     only produces plain data ops.
 *   - Raw card text NEVER touches this path.
 */
import type { EffectProgram } from '../../engine/effects/effectIr';
import type { EffectTemplateRegistry } from '../../engine/effects/effectTemplate';
import { applyTemplate } from './catalog/factories';
import type { TemplateId, TemplateParamMap } from './catalog/templateDefs';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * One reviewed card → template binding.
 *
 * The union distributes over TemplateId so TypeScript narrows `params` to the
 * correct shape for each `templateId` discriminant — no `any` in callers.
 */
export type TemplateBinding = {
  [T in TemplateId]: {
    /** Which reusable template shape this card uses. */
    templateId: T;
    /** Template-specific parameters. TypeScript narrows this from TemplateParamMap[T]. */
    params: TemplateParamMap[T];
  };
}[TemplateId];

export type CardEffectAssignment =
  | ({ cardNumber: string } & TemplateBinding)
  | { cardNumber: string; templates: readonly TemplateBinding[] };

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function bindingsFor(a: CardEffectAssignment): readonly TemplateBinding[] {
  return 'templates' in a ? a.templates : [a];
}

/**
 * Build an EffectTemplateRegistry from a list of reviewed assignments.
 * Call this once at startup (or test time) — output is plain data.
 */
export function buildRegistryFromAssignments(
  assignments: readonly CardEffectAssignment[],
): EffectTemplateRegistry {
  const registry: EffectTemplateRegistry = {};

  for (const a of assignments) {
    if (registry[a.cardNumber] !== undefined) {
      // Should never happen if sets are reviewed carefully; warn loudly.
      console.warn(`[effectTemplates] duplicate assignment for ${a.cardNumber} - last one wins`);
    }
    let cannotBePlayedByEffects = false;
    let cannotIncludeCategoryCostOrMore: EffectProgram['cannotIncludeCategoryCostOrMore'];
    let mustHaveType: EffectProgram['mustHaveType'];
    const abilities = bindingsFor(a).flatMap((binding) => {
      const prog = applyTemplate(
        a.cardNumber,
        binding.templateId,
        binding.params as TemplateParamMap[typeof binding.templateId],
      );
      if (prog.cannotBePlayedByEffects) cannotBePlayedByEffects = true;
      if (prog.cannotIncludeCategoryCostOrMore) cannotIncludeCategoryCostOrMore = prog.cannotIncludeCategoryCostOrMore;
      if (prog.mustHaveType) mustHaveType = prog.mustHaveType;
      return prog.abilities;
    });
    registry[a.cardNumber] = {
      cardNumber: a.cardNumber,
      abilities,
      ...(cannotBePlayedByEffects ? { cannotBePlayedByEffects: true } : {}),
      ...(cannotIncludeCategoryCostOrMore ? { cannotIncludeCategoryCostOrMore } : {}),
      ...(mustHaveType ? { mustHaveType } : {}),
    };
  }

  return registry;
}
