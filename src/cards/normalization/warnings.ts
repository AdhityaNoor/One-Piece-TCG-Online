/**
 * Structured, JSON-serializable record of "the API gave us something we
 * couldn't confidently map" — emitted instead of throwing or silently
 * dropping data, per project rule "do not assume rules; mark as TODO".
 * Carried through to the saved deck snapshot (project requirement) so a
 * deck builder UI can surface "this card's data may be incomplete" rather
 * than hiding the gap.
 */
export type NormalizationWarningCode =
  | 'unrecognized-color'
  | 'unrecognized-attribute'
  | 'unsplit-sub-types'
  | 'missing-image'
  | 'ambiguous-canonical-printing'
  | 'inconsistent-text-across-printings'
  | 'trigger-text-best-effort';

export interface NormalizationWarning {
  code: NormalizationWarningCode;
  /** The card NUMBER (card_set_id) this warning is about, e.g. "OP01-119". */
  cardNumber: string;
  message: string;
  field?: string;
}

export function warn(code: NormalizationWarningCode, cardNumber: string, message: string, field?: string): NormalizationWarning {
  return { code, cardNumber, message, field };
}
