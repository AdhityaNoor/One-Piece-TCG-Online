import { cardEffectTextToHtml } from '../lib/cardEffectTextHtml';

export interface StyledCardEffectTextProps {
  text: string;
  className?: string;
  emptyLabel?: string;
}

export function StyledCardEffectText({ text, className = '', emptyLabel = 'No card text.' }: StyledCardEffectTextProps) {
  const trimmed = text.trim();
  if (!trimmed) {
    return <p className={className}>{emptyLabel}</p>;
  }

  return (
    <div
      className={['ability-content ability-text whitespace-pre-wrap text-base leading-7 text-slate-50', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: cardEffectTextToHtml(trimmed) }}
    />
  );
}

export interface StyledTriggerEffectProps {
  text: string;
  className?: string;
}

/** Trigger row styled like the custom card maker preview (yellow label + body). */
export function StyledTriggerEffect({ text, className = '' }: StyledTriggerEffectProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <div className={['trigger-row inline-flex w-full flex-wrap items-start gap-0 overflow-hidden rounded-md bg-[#080808] px-0 py-0 text-sm leading-6 text-white', className].filter(Boolean).join(' ')}>
      <span className="trigger-row-label shrink-0">Trigger</span>
      <span
        className="trigger-row-copy min-w-0 flex-1 py-1"
        dangerouslySetInnerHTML={{ __html: cardEffectTextToHtml(trimmed) }}
      />
    </div>
  );
}
