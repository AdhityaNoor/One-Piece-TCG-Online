/** Board zones that have a visible anchor on the match table UI. */
export type BoardZoneId =
  | 'deck'
  | 'donDeck'
  | 'hand'
  | 'life'
  | 'trash'
  | 'characterArea'
  | 'leaderArea'
  | 'stageArea'
  | 'costArea';

export interface MovementAnchor {
  zone: BoardZoneId;
  /** When set, prefer the card tile's bounding box over the zone pile anchor. */
  instanceId?: string;
}

export interface CardMovementSpec {
  id: string;
  playerId: string;
  cardDefinitionId: string;
  imageUrl: string | null;
  faceDown: boolean;
  isDon: boolean;
  from: MovementAnchor;
  to: MovementAnchor;
  /** Live board tile to hide until this flight lands. */
  suppressInstanceId: string;
  /** Flip from card back to face art when landing in a hand the viewer owns. */
  revealFaceOnLand: boolean;
  /** Milliseconds to wait before starting this card (stagger within a batch). */
  delayMs: number;
}
