/**
 * CRUD for admin card-legality overrides. See
 * models/cardLegalityOverride.ts doc comment for the known limitation:
 * the client's deck-builder legality checks don't consult this yet.
 */
import { cardLegalityOverrides } from '../db/mongo';
import { AdminServiceError } from './errors';
import type { AdminCardLegalityOverride, SetCardLegalityOverrideRequest } from '../../../shared/admin';
import type { CardLegalityOverrideDocument } from '../models/cardLegalityOverride';

const CARD_NUMBER_RE = /^[A-Z0-9]+-[A-Z0-9]+$/i;
const VALID_STATUSES = ['legal', 'extraLegal', 'banned'] as const;

function toView(doc: CardLegalityOverrideDocument): AdminCardLegalityOverride {
  return { cardNumber: doc.cardNumber, status: doc.status, note: doc.note, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy };
}

export class CardLegalityService {
  async list(): Promise<AdminCardLegalityOverride[]> {
    const docs = await cardLegalityOverrides().find().sort({ cardNumber: 1 }).toArray();
    return docs.map(toView);
  }

  async setOverride(adminId: string, cardNumberRaw: string, body: SetCardLegalityOverrideRequest): Promise<AdminCardLegalityOverride> {
    const cardNumber = cardNumberRaw.trim().toUpperCase();
    if (!CARD_NUMBER_RE.test(cardNumber)) throw new AdminServiceError(400, 'VALIDATION', 'Invalid card number format (expected e.g. OP01-001).');
    if (!VALID_STATUSES.includes(body.status)) throw new AdminServiceError(400, 'VALIDATION', 'Invalid legality status.');

    const doc: CardLegalityOverrideDocument = {
      cardNumber,
      status: body.status,
      note: body.note?.trim().slice(0, 300) || null,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };
    await cardLegalityOverrides().updateOne({ cardNumber }, { $set: doc }, { upsert: true });
    return toView(doc);
  }

  async removeOverride(cardNumberRaw: string): Promise<void> {
    const cardNumber = cardNumberRaw.trim().toUpperCase();
    const result = await cardLegalityOverrides().deleteOne({ cardNumber });
    if (result.deletedCount === 0) throw new AdminServiceError(404, 'NOT_FOUND', `No override for card "${cardNumber}".`);
  }
}
