/**
 * Layer-3 cosmetic context: makes each seat's resolved deck accessories
 * (main-deck sleeve, DON!! sleeve, DON!! card art) available to the many
 * face-down/token leaf components (CardBackArt, DON token art) without
 * threading a prop through every intermediate board component.
 *
 * This is PROJECTION-only state (like CasualMatchPresentation): it changes
 * how the fixed GameState is drawn, never the state itself. The engine has
 * no idea it exists. Provided once at the Match screen root from
 * matchStore.accessoriesByPlayerId; consumed by CardBackArt via `playerId`.
 *
 * Fallback discipline: when there's no provider (e.g. a standalone story,
 * the deck-builder preview) or no entry for a seat, resolvers return
 * undefined and callers use their existing bundled default — so nothing
 * breaks when accessories aren't wired for a given surface.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { ResolvedDeckAccessories } from '../../lib/savedDeckToSetupInput';

const MatchAccessoriesContext = createContext<Record<string, ResolvedDeckAccessories>>({});

export function MatchAccessoriesProvider({ value, children }: { value: Record<string, ResolvedDeckAccessories>; children: ReactNode }) {
  return <MatchAccessoriesContext.Provider value={value}>{children}</MatchAccessoriesContext.Provider>;
}

/** Resolved accessories for one seat, or undefined when unknown (caller falls back to bundled defaults). */
export function useSeatAccessories(playerId: string | undefined): ResolvedDeckAccessories | undefined {
  const map = useContext(MatchAccessoriesContext);
  if (!playerId) return undefined;
  return map[playerId];
}

/** The DON!! card art URL for a seat, or undefined to use the bundled default. */
export function useSeatDonArtUrl(playerId: string | undefined): string | undefined {
  return useSeatAccessories(playerId)?.donArtUrl;
}
