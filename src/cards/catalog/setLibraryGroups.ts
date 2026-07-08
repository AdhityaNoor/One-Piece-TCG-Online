/**
 * Groups set codes for the card library / deck builder set dropdown.
 */
import type { SetSummaryDto } from '../api/types';
import { formatSetLibraryOptionLabel } from './setDisplayNames';

export type SetLibraryGroupId = 'structureDeck' | 'set' | 'extraBooster' | 'premiumBooster' | 'promotional' | 'other';

export const SET_LIBRARY_GROUP_LABELS: Record<SetLibraryGroupId, string> = {
  structureDeck: 'Structure Decks',
  set: 'Sets',
  extraBooster: 'Extra Booster',
  premiumBooster: 'Premium Booster',
  promotional: 'Promo',
  other: 'Other',
};

/** Tailwind classes for grouped set-library section headers. */
export const SET_LIBRARY_GROUP_COLORS: Record<SetLibraryGroupId, string> = {
  set: 'text-gold',
  structureDeck: 'text-cyan-300',
  extraBooster: 'text-purple-300',
  premiumBooster: 'text-amber-300',
  promotional: 'text-emerald-300',
  other: 'text-slate-300',
};

/** Display order for grouped set-library dropdown sections. */
export const SET_LIBRARY_GROUP_ORDER: SetLibraryGroupId[] = [
  'set',
  'structureDeck',
  'extraBooster',
  'premiumBooster',
  'promotional',
  'other',
];

export interface SetLibraryDropdownGroup {
  id: SetLibraryGroupId;
  label: string;
  sets: SetSummaryDto[];
}

export interface SetLibraryDropdownSections {
  /** Virtual "All Sets" row — rendered outside optgroups. */
  allSets: SetSummaryDto | null;
  groups: SetLibraryDropdownGroup[];
}

export function classifySetLibraryGroup(setCode: string): SetLibraryGroupId {
  const code = setCode.toUpperCase();
  if (code.startsWith('ST')) return 'structureDeck';
  if (code.startsWith('OP')) return 'set';
  if (code.startsWith('EB')) return 'extraBooster';
  if (code.startsWith('PRB')) return 'premiumBooster';
  if (code === 'P') return 'promotional';
  return 'other';
}

/** Buckets catalog sets into labeled dropdown sections, preserving each bucket's input order. */
export function buildSetLibraryDropdownSections(sets: SetSummaryDto[]): SetLibraryDropdownSections {
  const allSets = sets.find((row) => row.set_id === 'all') ?? null;
  const buckets = Object.fromEntries(SET_LIBRARY_GROUP_ORDER.map((id) => [id, [] as SetSummaryDto[]])) as Record<
    SetLibraryGroupId,
    SetSummaryDto[]
  >;

  for (const row of sets) {
    if (row.set_id === 'all') continue;
    buckets[classifySetLibraryGroup(row.set_id)].push(row);
  }

  const groups = SET_LIBRARY_GROUP_ORDER.map((id) => ({
    id,
    label: SET_LIBRARY_GROUP_LABELS[id],
    sets: buckets[id],
  })).filter((group) => group.sets.length > 0);

  return { allSets, groups };
}

export function setLibraryOptionLabel(set: SetSummaryDto): string {
  return formatSetLibraryOptionLabel(set.set_id, set.set_name);
}
