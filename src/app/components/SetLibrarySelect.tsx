import { useMemo } from 'react';
import type { SetSummaryDto } from '../../cards/api/types';
import {
  buildSetLibraryDropdownSections,
  SET_LIBRARY_GROUP_COLORS,
  setLibraryOptionLabel,
} from '../../cards/catalog';
import { OpSelect, type OpSelectGroup, type OpSelectOption } from './OpSelect';

export interface SetLibrarySelectProps {
  sets: SetSummaryDto[];
  value: string;
  disabled?: boolean;
  title?: string;
  onChange: (setId: string) => void;
}

export function SetLibrarySelect({ sets, value, disabled = false, title, onChange }: SetLibrarySelectProps) {
  const sections = useMemo(() => buildSetLibraryDropdownSections(sets), [sets]);

  const leadingOptions = useMemo<OpSelectOption[] | undefined>(
    () => (sections.allSets ? [{ value: sections.allSets.set_id, label: setLibraryOptionLabel(sections.allSets) }] : undefined),
    [sections.allSets],
  );

  const groups = useMemo<OpSelectGroup[]>(
    () =>
      sections.groups.map((group) => ({
        id: group.id,
        label: group.label,
        headerClassName: SET_LIBRARY_GROUP_COLORS[group.id],
        options: group.sets.map((set) => ({
          value: set.set_id,
          label: setLibraryOptionLabel(set),
        })),
      })),
    [sections.groups],
  );

  return (
    <OpSelect
      value={value}
      disabled={disabled}
      title={title}
      leadingOptions={leadingOptions}
      groups={groups}
      onChange={onChange}
    />
  );
}
