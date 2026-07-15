/**
 * Curated card-effect registry.
 *
 * This is the runtime source of card behavior for the game engine. It is built
 * entirely from reviewed per-set assignment files; raw API/scraped card text
 * stays in the card catalog as reference data and is never executed.
 *
 * Architecture:
 *   assignments/<SET>.ts   reviewed cardNumber → templateId + params bindings
 *   catalog/templateDefs   typed parameter schemas per template ID
 *   catalog/factories      IR-producing factory per template
 *   assembler              buildRegistryFromAssignments → EffectTemplateRegistry
 *
 * To add coverage for a card:
 *   1. Read the card's ruling-confirmed English effect text.
 *   2. Pick the matching templateId (or add a new template if none fits).
 *   3. Add a CardEffectAssignment to the appropriate set file in assignments/.
 *   4. Run `npm run coverage` to verify the curated count increased.
 *
 * Parser/compiler tools (scripts/effect-*) may assist triage but never feed
 * runtime behavior directly.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { buildRegistryFromAssignments } from './assembler';
import { ALL_ASSIGNMENTS } from './assignments';

/**
 * The full curated registry: every card number that has a reviewed EffectProgram.
 * Built once at module load from reviewed assignment files — plain data, no text parsing.
 */
export const CURATED_EFFECT_PROGRAMS: EffectTemplateRegistry =
  buildRegistryFromAssignments(ALL_ASSIGNMENTS);

/**
 * Filter the curated registry down to cards present in the provided definition
 * lookup. Pass this to the engine at match start — the engine never calls
 * buildRegistryFromAssignments itself (no /src/cards import in /src/engine).
 */
export function buildCuratedEffectRegistry(defs: CardDefinitionLookup): EffectTemplateRegistry {
  const registry: EffectTemplateRegistry = {};
  for (const [cardDefinitionId, definition] of Object.entries(defs)) {
    const program = CURATED_EFFECT_PROGRAMS[definition.cardNumber] ?? CURATED_EFFECT_PROGRAMS[cardDefinitionId];
    if (program) {
      registry[cardDefinitionId] = program;
      registry[definition.cardNumber] = program;
    }
  }
  return registry;
}
