import { describe, expect, it } from 'vitest';
import type { GameLogEntry } from '../../../engine/logs/logEntry';
import { logEffectText, logSourceCardLabel } from '../logDisplay';

function entry(data: Record<string, unknown>, type: GameLogEntry['type'] = 'EFFECT_RESOLVED'): GameLogEntry {
  return {
    id: 'log-1',
    sequence: 1,
    turnNumber: 1,
    phase: 'main',
    actorPlayerId: 'p1',
    type,
    message: 'Resolved.',
    data,
    relatedCardInstanceIds: [],
    visibility: 'public',
    causedByActionId: null,
  };
}

describe('logDisplay', () => {
  it('labels source cards by name and number', () => {
    expect(logSourceCardLabel(entry({ sourceCardName: 'Monkey.D.Luffy', sourceCardNumber: 'OP01-001' }))).toBe(
      'Monkey.D.Luffy (OP01-001)',
    );
  });

  it('shows full effect text for normal effect logs', () => {
    expect(logEffectText(entry({ effectText: '[On Play] Draw 1 card.' }))).toBe('[On Play] Draw 1 card.');
  });

  it('prefers trigger text for trigger reveal logs', () => {
    expect(logEffectText(entry({ effectText: '[On Play] Draw 1 card. [Trigger] Play this card.', triggerText: 'Play this card.' }, 'TRIGGER_REVEALED'))).toBe(
      'Play this card.',
    );
  });
});
