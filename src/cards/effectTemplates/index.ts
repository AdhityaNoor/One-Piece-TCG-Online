/**
 * Card effect templates — public API.
 *
 * Runtime gameplay uses curated EffectProgram JSON assembled from reviewed
 * assignment files. Raw API/scraped effect text is never compiled or executed.
 */

// Registry (runtime) — what the engine receives at match start.
export { buildCuratedEffectRegistry, CURATED_EFFECT_PROGRAMS } from './curatedPrograms';

// Assembler — for tools, tests, and future online-deck validation.
export { buildRegistryFromAssignments } from './assembler';
export type { CardEffectAssignment } from './assembler';

// Template catalog — for authoring new assignments.
export { TEMPLATE_IDS, applyTemplate } from './catalog';
export type { TemplateId, TemplateParamMap } from './catalog';
