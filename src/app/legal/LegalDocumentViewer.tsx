/**
 * Tab strip + scrolling document body, shared by the two places the legal
 * documents are read: LegalScreen (in the app, from Settings) and
 * AuthTermsModal (on the sign-up form, before an account exists).
 *
 * It exists because those two places must show the SAME text. The sign-up
 * form is where consent is actually given, so showing a friendly summary
 * there and the real document elsewhere would mean players agree to one
 * thing and are bound by another. One viewer, one source (src/app/legal/content/*.md),
 * two frames around it.
 *
 * Owns its own scroll container so the tab strip stays fixed while a long
 * policy moves under it, and resets to the top on every tab change — a
 * reader who switches documents must not land halfway into the new one.
 */
import { useEffect, useRef, useState } from 'react';
import { MarkdownDocument } from '../components';
import {
  DEFAULT_LEGAL_DOCUMENT,
  LEGAL_DOCUMENTS,
  allUnfilledPlaceholders,
  getLegalDocument,
  type LegalDocumentId,
} from './legalDocuments';

/** A `./DMCA.md` cross-reference inside a document -> the tab that renders it. */
const FILE_TO_DOCUMENT: Record<string, LegalDocumentId> = {
  'TERMS.md': 'terms',
  'PRIVACY.md': 'privacy',
  'DMCA.md': 'dmca',
};

export interface LegalDocumentViewerProps {
  /** Which document to open on mount. Defaults to the Terms. */
  initialDoc?: LegalDocumentId;
  /** Extra classes for the scrolling body — used to cap height inside a modal. */
  bodyClassName?: string;
}

export function LegalDocumentViewer({ initialDoc, bodyClassName }: LegalDocumentViewerProps) {
  const [active, setActive] = useState<LegalDocumentId>(initialDoc ?? DEFAULT_LEGAL_DOCUMENT);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [active]);

  const current = getLegalDocument(active);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div role="tablist" aria-label="Legal documents" className="flex gap-2">
          {LEGAL_DOCUMENTS.map((document) => (
            <LegalTab
              key={document.id}
              label={document.tabLabel}
              selected={document.id === active}
              onSelect={() => setActive(document.id)}
            />
          ))}
        </div>
        <p className="px-1 text-center text-[11px] leading-4 text-white/45">{current.summary}</p>
      </div>

      <div
        ref={scrollRef}
        className={['min-h-0 flex-1 overflow-y-auto', bodyClassName ?? ''].filter(Boolean).join(' ')}
      >
        <UnfilledPlaceholderWarning />
        <MarkdownDocument
          markdown={current.markdown}
          onDocumentLink={(fileName) => {
            const target = FILE_TO_DOCUMENT[fileName];
            if (target) setActive(target);
          }}
        />
      </div>
    </div>
  );
}

function LegalTab({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={[
        'group relative flex-1 select-none px-3 py-2.5 font-heading text-[11px] font-black uppercase tracking-[0.12em]',
        'transition-colors duration-200 focus:outline-none',
        selected ? 'text-white' : 'text-white/55 hover:text-white/90',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 -skew-x-12 border transition-all duration-200',
          'group-focus-visible:ring-2 group-focus-visible:ring-[rgb(var(--op-gold-rgb))]',
          selected
            ? 'border-[rgb(var(--op-gold-rgb)/0.85)] bg-[rgb(var(--op-gold-rgb)/0.18)] shadow-[0_8px_22px_-6px_rgb(var(--op-gold-rgb)/0.55)]'
            : 'border-white/15 bg-black/25 group-hover:border-white/30',
        ].join(' ')}
      />
      <span className="relative z-10 block">{label}</span>
    </button>
  );
}

/**
 * Development-only nag. These documents once shipped with bracketed all-caps
 * placeholders that are meaningless to a player and embarrassing in
 * production, and the failure mode is silent — nobody notices a bracketed
 * name in a wall of policy text. legalDocuments.test.ts is the real gate;
 * this is the reminder for whoever is looking at the screen.
 */
function UnfilledPlaceholderWarning() {
  if (import.meta.env.PROD) return null;
  const placeholders = allUnfilledPlaceholders();
  if (placeholders.length === 0) return null;

  return (
    <div className="mb-5 border border-amber-300/35 bg-amber-500/10 p-3 text-[11px] leading-5 text-amber-100/90">
      <p className="font-bold uppercase tracking-[0.14em]">Not ready to publish — dev only</p>
      <p className="mt-1">
        {placeholders.length} placeholder{placeholders.length === 1 ? '' : 's'} still unfilled in src/app/legal/content:{' '}
        <span className="font-mono">{placeholders.join(' ')}</span>
      </p>
    </div>
  );
}
