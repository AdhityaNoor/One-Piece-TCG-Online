/**
 * Card zoom/preview — project requirement "Card zoom/preview required for
 * small screens". Shows the full-size art plus every CardDefinition display
 * field (2-1 through 2-17). `text`/`triggerText` are rendered as plain
 * strings only — this component never parses or executes card text (project
 * rule: card text is data, not logic; see /src/cards/effectTemplates for
 * where behavior actually lives, once it exists).
 */
import type { CardDefinition } from '../../engine/state/card';
import { CARD_COLOR_TOKENS } from '../lib/cardColors';
import { CardImage } from './CardImage';
import { Modal } from './Modal';
import { Pill } from './Pill';

export interface CardDetailModalProps {
  open: boolean;
  onClose: () => void;
  definition: CardDefinition | null;
  imageUrl: string | null;
  setName?: string;
}

interface StatEntry {
  label: string;
  value: string | number;
}

function collectStats(definition: CardDefinition): StatEntry[] {
  const stats: StatEntry[] = [];
  if (definition.life !== undefined) stats.push({ label: 'Life', value: definition.life });
  if (definition.basePower !== undefined) stats.push({ label: 'Power', value: definition.basePower });
  if (definition.baseCost !== undefined) stats.push({ label: 'Cost', value: definition.baseCost });
  if (definition.counter !== undefined) stats.push({ label: 'Counter', value: `+${definition.counter}` });
  return stats;
}

export function CardDetailModal({ open, onClose, definition, imageUrl, setName }: CardDetailModalProps) {
  const stats = definition ? collectStats(definition) : [];

  return (
    <Modal open={open && definition !== null} onClose={onClose} maxWidthClassName="max-w-2xl">
      {definition && (
        <div className="flex flex-col gap-4 p-5 sm:flex-row">
          <div className="w-full sm:w-56 sm:flex-shrink-0">
            <CardImage src={imageUrl} alt={definition.name} eager />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy-900">{definition.name}</h2>
              <p className="text-xs text-navy-900/50">
                {definition.cardNumber}
                {setName ? ` · ${setName}` : ''}
                {definition.rarity ? ` · ${definition.rarity}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="navy">{definition.category}</Pill>
              {definition.colors.map((color) => (
                <span key={color} className="inline-flex items-center gap-1 text-xs font-medium text-navy-900/70">
                  <span className={['h-2.5 w-2.5 rounded-full', CARD_COLOR_TOKENS[color].dotClassName].join(' ')} aria-hidden="true" />
                  {CARD_COLOR_TOKENS[color].label}
                </span>
              ))}
              {definition.types.map((type) => (
                <Pill key={type} tone="neutral">
                  {type}
                </Pill>
              ))}
            </div>

            {stats.length > 0 && (
              <div className="flex gap-4 rounded-xl bg-surface-panel px-3 py-2">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-[10px] uppercase tracking-wide text-navy-900/40">{stat.label}</p>
                    <p className="text-sm font-bold text-navy-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-900/80">{definition.text || 'No card text.'}</p>

            {definition.hasTrigger && (
              <div className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gold-600">Trigger</p>
                <p className="text-sm text-navy-900/80">{definition.triggerText ?? definition.text}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
