import type { GameLogEntry } from '../../engine/logs/logEntry';

function stringData(entry: GameLogEntry, key: string): string | null {
  const value = entry.data[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function logSourceCardLabel(entry: GameLogEntry): string | null {
  const name = stringData(entry, 'sourceCardName');
  const number = stringData(entry, 'sourceCardNumber');
  if (name && number) return `${name} (${number})`;
  return name ?? number;
}

export function logEffectText(entry: GameLogEntry): string | null {
  const triggerText = stringData(entry, 'triggerText');
  if (entry.type === 'TRIGGER_REVEALED' && triggerText) return triggerText;
  return stringData(entry, 'effectText') ?? triggerText;
}
