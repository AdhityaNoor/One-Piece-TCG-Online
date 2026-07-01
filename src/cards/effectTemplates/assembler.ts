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
 *   - Duplicate card numbers are detected (second entry wins + console.warn in dev).
 *   - Output is JSON-serializable: every EffectProgram comes from a factory that
 *     only produces plain data ops.
 *   - Raw card text NEVER touches this path.
 */
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
export type CardEffectAssignment = {
  [T in TemplateId]: {
    /** Card number exactly as it appears in the card catalog (e.g. "OP01-016"). */
    cardNumber: string;
    /** Which reusable template shape this card uses. */
    templateId: T;
    /** Template-specific parameters. TypeScript narrows this from TemplateParamMap[T]. */
    params: TemplateParamMap[T];
  };
}[TemplateId];

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

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
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[effectTemplates] duplicate assignment for ${a.cardNumber} — last one wins`);
      }
    }
    // Cast needed: TypeScript can't prove the union member lines up without a
    // runtime switch, but TemplateParamMap guarantees correctness statically.
    registry[a.cardNumber] = applyTemplate(
      a.cardNumber,
      a.templateId,
      a.params as TemplateParamMap[typeof a.templateId],
    );
  }

  return registry;
}
