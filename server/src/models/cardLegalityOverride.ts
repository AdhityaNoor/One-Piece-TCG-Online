/**
 * Admin-editable override of a card's tournament legality (Admin CMS "Card
 * Management" > card legality modification). The baseline legality
 * (`legal` | `extraLegal` | `banned`) already exists per card number, but is
 * sourced from a GENERATED static registry (src/cards/format/generatedRegistry.ts)
 * that isn't admin-editable — this collection is a live override layer an
 * admin can write without regenerating that file.
 *
 * KNOWN LIMITATION: the deck builder's live legality checks
 * (evaluateDeckFormatStatus.ts / formatKindForCardNumber) do not consult
 * this collection yet — this ships the override storage + admin CRUD only.
 * Wiring it into the client's legality evaluation is a separate follow-up
 * (would need a public read endpoint the deck builder fetches and merges
 * over the generated registry at runtime).
 */
import type { ObjectId } from 'mongodb';

export type CardLegalityStatus = 'legal' | 'extraLegal' | 'banned';

export interface CardLegalityOverrideDocument {
  _id?: ObjectId;
  /** 2-14 card number, e.g. "OP01-001". */
  cardNumber: string;
  status: CardLegalityStatus;
  note: string | null;
  updatedAt: string;
  updatedBy: string;
}
