/**
 * Card zoom/preview. Shows raw card text as display data only; effect logic
 * is mapped separately later through authored templates.
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
    <Modal
      open={open && definition !== null}
      onClose={onClose}
      maxWidthClassName="max-w-none rounded-none"
      bodyClassName="h-full max-h-full overflow-hidden"
      panelStyle={{ width: '50vw', maxWidth: '50vw', height: '80vh', maxHeight: '80vh', borderRadius: 0 }}
    >
      {definition && (
        <div className="grid h-full min-h-0 grid-cols-[38%_minmax(0,1fr)] gap-4 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,210,97,0.12),_transparent_34%),linear-gradient(135deg,_#07101f,_#0d1830_52%,_#111827)] p-4 text-slate-100">
          <div className="flex min-h-0 items-center justify-center border border-white/10 bg-black/35 p-3">
            <CardImage src={imageUrl} alt={definition.name} eager className="h-full max-h-full !w-auto max-w-full rounded-none" />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="border-b border-white/10 pb-3 pr-9">
              <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-white">{definition.name}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-300/75">
                {definition.cardNumber}
                {setName ? ` - ${setName}` : ''}
                {definition.rarity ? ` - ${definition.rarity}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="navy">{definition.category}</Pill>
              {definition.colors.map((color) => (
                <span key={color} className="inline-flex items-center gap-1 border border-white/10 bg-white/8 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-100">
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="border border-white/10 bg-black/30 px-3 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100/55">{stat.label}</p>
                    <p className="text-lg font-black text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto border border-white/10 bg-slate-950/75 p-4">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/70">Effect Text</p>
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-50">{definition.text || 'No card text.'}</p>
            </div>

            {definition.hasTrigger && (
              <div className="border border-amber-300/40 bg-amber-300/10 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">Trigger</p>
                <p className="text-sm leading-6 text-slate-50">{definition.triggerText ?? definition.text}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
