/**
 * Card effect compiler (front-end).
 *
 * Lowers card text into the engine's EffectProgram IR (src/engine/effects),
 * which the engine's generic interpreter executes. Behavior is compiled DATA,
 * not per-card code. The app injects `compileRegistry(catalog)` into the
 * dispatcher; the engine never imports this module (one-directional boundary).
 */
export { compileEffect } from './compile';
export { compileRegistry, type CompilableCard } from './programs';
