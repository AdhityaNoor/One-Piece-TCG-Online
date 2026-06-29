/**
 * Builds the injectable registry of compiled card effects.
 *
 * The app calls `compileRegistry(cards)` with the local card catalog
 * (cardNumber + English effect text) at startup; every card the compiler can
 * lower becomes playable, with zero per-card code. Cards that don't lower are
 * simply absent (no effect fires) — exactly the cards on the effect-review
 * worklist.
 */
import type { EffectTemplateRegistry } from '../../engine/effects';
import { compileEffect } from './compile';

export interface CompilableCard {
  cardNumber: string;
  effectText: string;
}

export function compileRegistry(cards: CompilableCard[]): EffectTemplateRegistry {
  const registry: EffectTemplateRegistry = {};
  let compiled = 0;
  for (const card of cards) {
    const program = compileEffect(card.cardNumber, card.effectText ?? '');
    if (program) {
      registry[card.cardNumber] = program;
      compiled++;
    }
  }
  // (compiled count is returned implicitly via Object.keys(registry).length)
  void compiled;
  return registry;
}
