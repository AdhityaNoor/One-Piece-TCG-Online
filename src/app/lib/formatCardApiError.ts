/**
 * Human-readable summary of a CardApiError for any screen that surfaces API
 * failures (Card Library, Deck Builder). Centralized so every screen
 * describes the same error the same way, and so none of them are tempted to
 * dump raw response bodies into the UI — consistent with treating the API as
 * data-only and never letting its failures (or its exact wire shape) leak
 * into what the user sees as anything other than a plain status message.
 */
import type { CardApiError } from '../../cards/api';

export function formatCardApiError(error: CardApiError): string {
  switch (error.kind) {
    case 'network':
      return `Network error: ${error.message}`;
    case 'http':
      return `The card API returned an error (HTTP ${error.status}).`;
    case 'parse':
      return 'The card API returned a response that could not be parsed.';
    case 'shape-mismatch':
      return 'The card API returned data in an unexpected shape.';
    default:
      return 'Unknown card API error.';
  }
}
