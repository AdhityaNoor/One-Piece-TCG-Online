/**
 * matchHistory.reason is a free-text GameOverReason string from the engine
 * (see server/src/models/matchHistory.ts doc comment), not a structured
 * enum — unlike ranked's RankedResultType, which IS structured
 * (shared/ranked.ts). This is a best-effort keyword classifier so casual
 * match history can still show a result-type badge; ranked matches always
 * prefer their own structured resultType instead of this (see
 * matchHistoryService.ts).
 */
import type { ProfileMatchResultType } from '../../../shared/profile';

export function classifyCasualResultType(reason: string): ProfileMatchResultType {
  const lower = reason.toLowerCase();
  if (lower.includes('concede') || lower.includes('concession')) return 'concession';
  if (lower.includes('disconnect')) return 'disconnect';
  if (lower.includes('abandon')) return 'abandonment';
  if (lower.includes('timeout') || lower.includes('time out')) return 'timeout';
  if (lower.length === 0) return 'unknown';
  return 'normal';
}
