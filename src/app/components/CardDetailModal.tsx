/**
 * Card zoom/preview. Shows raw card text as display data only; effect logic
 * is mapped separately later through authored templates.
 */
import { useState } from 'react';
import type { CardDefinition } from '../../engine/state/card';
import { CARD_COLOR_TOKENS } from '../lib/cardColors';
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

function PreviewCardImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = src === null || failed;

  return (
    <div className="flex h-full min-h-0 aspect-[63/88] w-auto max-w-full items-center justify-center">
      {showPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 border border-gold/15 bg-black/30 text-slate-100/35">
          <span className="h-16 w-10 border-2 border-current shadow-[4px_4px_0_rgba(255,255,255,0.08)]" aria-hidden="true" />
          <span className="px-4 text-center font-heading text-xs font-bold uppercase leading-tight tracking-[0.14em]">No image available</span>
        </div>
      ) : (
        <img src={src} alt={alt} loading="eager" onError={() => setFailed(true)} className="h-full max-h-full w-full max-w-full object-contain drop-shadow-[0_18px_34px_rgba(0,0,0,0.5)]" />
      )}
    </div>
  );
}

export function CardDetailModal({ open, onClose, definition, imageUrl, setName }: CardDetailModalProps) {
  const stats = definition ? collectStats(definition) : [];

  return (
    <Modal
      open={open && definition !== null}
      onClose={onClose}
      maxWidthClassName="max-w-none rounded-none"
      bodyClassName="h-full max-h-full overflow-hidden"
      panelStyle={{ width: 'min(92vw, 76rem)', maxWidth: '92vw', height: '82vh', maxHeight: '82vh', borderRadius: 0 }}
    >
      {definition && (
        <div className="relative grid h-full min-h-0 grid-cols-[auto_minmax(0,1fr)] gap-4 overflow-hidden border-2 border-gold/35 bg-[#071126] p-4 text-slate-100 shadow-[0_18px_0_rgba(1,5,16,0.72),_0_34px_70px_rgba(0,0,0,0.46)]">
          <div className="pointer-events-none absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-18 grayscale" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,_rgba(255,211,74,0.16),_transparent_28%),linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.96))]" />

          <div className="relative z-10 flex h-full min-h-0 w-fit items-center justify-center">
            <PreviewCardImage src={imageUrl} alt={definition.name} />
          </div>

          <div className="relative z-10 flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="border-l-4 border-gold bg-black/24 py-2 pl-3 pr-10 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Card Preview</p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]">{definition.name}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-300/75">
                {definition.cardNumber}
                {setName ? ` - ${setName}` : ''}
                {definition.rarity ? ` - ${definition.rarity}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="navy">{definition.category}</Pill>
              {definition.colors.map((color) => (
                <span key={color} className="inline-flex items-center gap-1 border border-gold/20 bg-black/30 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-100 shadow-[0_4px_0_rgba(1,5,16,0.34)]">
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
                  <div key={stat.label} className="border border-gold/20 bg-black/30 px-3 py-2 text-center shadow-[0_5px_0_rgba(1,5,16,0.42)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold/70">{stat.label}</p>
                    <p className="text-lg font-black text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto border-2 border-cyan-200/15 bg-black/45 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-gold">Effect Text</p>
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-50">{definition.text || 'No card text.'}</p>
            </div>

            {definition.hasTrigger && (
              <div className="border border-gold/45 bg-gold/10 px-3 py-2 shadow-[0_5px_0_rgba(68,39,0,0.5)]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">Trigger</p>
                <p className="text-sm leading-6 text-slate-50">{definition.triggerText ?? definition.text}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
