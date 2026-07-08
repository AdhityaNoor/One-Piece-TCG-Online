/**
 * Human-readable set names for the local catalog.
 *
 * Keys are set codes (OP01, ST01, …). Sourced from Limitless TCG set index
 * plus official product names where EN/JP differ (e.g. EB04 Egghead Crisis).
 */
import names from './setDisplayNames.json';

export const SET_DISPLAY_NAMES: Record<string, string> = names;

const VIRTUAL_SET_LABELS: Record<string, string> = {
  all: 'All Sets',
};

/** Resolve a display name for a set code, falling back to catalog/API text then the code itself. */
export function resolveSetDisplayName(setCode: string, fallbackName?: string): string {
  const code = setCode.toUpperCase();
  return SET_DISPLAY_NAMES[code] ?? fallbackName ?? setCode;
}

/** Label for set-library dropdown rows, e.g. "Romance Dawn (OP01)". */
export function formatSetLibraryOptionLabel(setCode: string, fallbackName?: string): string {
  if (setCode in VIRTUAL_SET_LABELS) return VIRTUAL_SET_LABELS[setCode];
  const displayName = resolveSetDisplayName(setCode, fallbackName);
  return displayName === setCode ? setCode : `${displayName} (${setCode})`;
}
