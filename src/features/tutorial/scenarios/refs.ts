/**
 * Card-reference shorthands shared by every scenario script.
 *
 * Keeping `leader` and `opposingLeader` as two distinct refs is not
 * pedantry: they are different cards, and conflating them once made every
 * scripted attack target the attacker's OWN Leader, which the engine
 * correctly rejected with "does not belong to the opponent".
 */
import type { TutorialCardRef } from '../types';

/** The acting player's own Leader — what you boost with a Counter, and what you attack WITH. */
export const LEADER: TutorialCardRef = { kind: 'leader' };
/** The other player's Leader — what you attack INTO. */
export const OPPOSING_LEADER: TutorialCardRef = { kind: 'opposingLeader' };
/** A Character the acting player controls, by printed card number. */
export const own = (cardNumber: string): TutorialCardRef => ({ kind: 'ownCharacter', cardNumber });
/** A Character the acting player's opponent controls, by printed card number. */
export const opposing = (cardNumber: string): TutorialCardRef => ({ kind: 'opposingCharacter', cardNumber });
