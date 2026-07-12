import type { SavedDeck } from '../../../src/cards/decks/savedDeck';

export interface RankedRoomParticipant {
  playerId: string;
  displayName: string;
  seatId: 'p1' | 'p2';
  deckSnapshot: SavedDeck;
}

export interface RankedRoomOptions {
  rankedMatchId?: string;
  rankedSeasonId?: string;
  rankedParticipants?: RankedRoomParticipant[];
}

