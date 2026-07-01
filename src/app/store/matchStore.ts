/**
 * Holds the live, authoritative GameState for the local hotseat match in
 * progress. This is the ONE place in /src/app allowed to call the engine's
 * validate/execute dispatch pair (engine/actions/dispatch.ts) directly —
 * every other store/component reads `state`/`defs` from here and calls
 * `dispatch()`, never `cardsById`/`players`/etc. mutators of its own
 * (project rule: "the UI must never directly mutate game state").
 *
 * `dispatch()` is deliberately the SAME {state, action, defs} -> {state,
 * log, pendingChoices} round trip a future network-authoritative server
 * would run — see project ground rule "design local hotseat as if every
 * click will later become a network request." Nothing here decides
 * legality; `validateAction`/`executeAction` do that (Layer 1/2). This
 * store is just the synchronous local transport for now.
 */
import { create } from 'zustand';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import type { GameAction } from '../../engine/actions';
import { validateAction, executeAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { buildCuratedEffectRegistry } from '../../cards/effectTemplates';
import { hashSeed } from '../../engine/rng';
import { createPreGameState } from '../../engine/setup';
import type { GameState } from '../../engine/state';
import { buildCardDefinitionLookup, buildCardImageLookup, savedDeckToPlayerSetupInput } from '../lib/savedDeckToSetupInput';

/**
 * Build the match's card-effect registry from curated EffectProgram data.
 * Raw CardDefinition.text is never compiled or executed at runtime; it is only
 * display/reference text. A card gets behavior only when its cardNumber has an
 * explicit reviewed program in /src/cards/effectTemplates/curatedPrograms.ts.
 */
function buildRegistryFromDefs(defs: CardDefinitionLookup): EffectTemplateRegistry {
  return buildCuratedEffectRegistry(defs);
}

/** Fixed, stable player ids for the local hotseat match — both sides are the same human, alternating. */
export const PLAYER_A_ID = 'p1';
export const PLAYER_B_ID = 'p2';

export type MatchStartResult = { ok: true } | { ok: false; reasons: string[] };
export type MatchDispatchResult = { ok: true } | { ok: false; reasons: string[] };

function generateRandomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** New id for GameAction.actionId — see action.ts: "unique per dispatch, useful for replay/dedup over network." */
export function createActionId(): string {
  return generateRandomId('action');
}

interface MatchStoreState {
  state: GameState | null;
  defs: CardDefinitionLookup;
  /** Compiled card effects injected into every validate/execute call, so [On Play]/[Activate: Main]/etc. fire in-game. Keyed by cardNumber (== cardDefinitionId). */
  registry: EffectTemplateRegistry;
  /** cardDefinitionId -> cosmetic image URL, for board/zoom UI only — never read by the engine. See savedDeckToSetupInput.ts. */
  cardImagesByDefinitionId: Record<string, string | null>;
  /** Which two SavedDeck ids the live match was started with, so the Match screen can tell "still the requested match" apart from "navigated here with different decks" without restarting on every re-render. */
  startedWithDeckIds: { a: string; b: string } | null;
  /** Reasons the most recent startMatch() call failed, for the Match screen to display. Cleared on the next successful start. */
  startError: string[] | null;

  startMatch(deckA: SavedDeck, deckB: SavedDeck): MatchStartResult;
  dispatch(action: GameAction): MatchDispatchResult;
  reset(): void;
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  state: null,
  defs: {},
  registry: {},
  cardImagesByDefinitionId: {},
  startedWithDeckIds: null,
  startError: null,

  startMatch(deckA, deckB) {
    const p1Input = savedDeckToPlayerSetupInput(deckA, PLAYER_A_ID);
    const p2Input = savedDeckToPlayerSetupInput(deckB, PLAYER_B_ID);

    // The seed is the root of randomness for this match — it does not itself
    // need to be deterministic (cf. shuffling a real deck before play), only
    // every DRAW from it does (createSeededRng makes that true).
    const seed = generateRandomId('seed');

    // 5-2-1-4-1: the going-first-or-second DECISION is explicitly out of the
    // engine's scope ("no intervention of any kind is allowed"); resolving
    // WHO gets to make that decision (the real-life coin-flip/RPS-or-similar
    // step) is the same kind of out-of-band input. Derived from the match
    // seed rather than Math.random() purely so a given seed always
    // reproduces the same pre-game flow too.
    const decidingPlayerId = hashSeed(seed) % 2 === 0 ? PLAYER_A_ID : PLAYER_B_ID;

    const result = createPreGameState(p1Input, p2Input, {
      decidingPlayerId,
      rngState: { seed, cursor: 0 },
    });

    if (!result.ok) {
      set({ state: null, defs: {}, registry: {}, cardImagesByDefinitionId: {}, startedWithDeckIds: null, startError: result.reasons });
      return { ok: false, reasons: result.reasons };
    }

    const defs = buildCardDefinitionLookup([deckA, deckB]);
    set({
      state: result.state,
      defs,
      registry: buildRegistryFromDefs(defs),
      cardImagesByDefinitionId: buildCardImageLookup([deckA, deckB]),
      startedWithDeckIds: { a: deckA.deckId, b: deckB.deckId },
      startError: null,
    });
    return { ok: true };
  },

  dispatch(action) {
    const { state, defs, registry } = get();
    if (!state) {
      return { ok: false, reasons: ['No match is in progress.'] };
    }
    const validation = validateAction(state, action, defs, registry);
    if (!validation.legal) {
      return { ok: false, reasons: validation.reasons };
    }
    // executeAction re-validates internally — see dispatch.ts doc comment.
    // That's intentional, harmless redundancy, not a bug to "optimize away".
    const result = executeAction(state, action, defs, registry);
    set({ state: result.state });
    return { ok: true };
  },

  reset() {
    set({ state: null, defs: {}, registry: {}, cardImagesByDefinitionId: {}, startedWithDeckIds: null, startError: null });
  },
}));
