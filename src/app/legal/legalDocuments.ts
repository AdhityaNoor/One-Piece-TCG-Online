/**
 * The app's legal documents, imported straight from `docs/legal/*.md`.
 *
 * WHY THE MARKDOWN FILES ARE THE SOURCE OF TRUTH, and not a copy pasted into
 * a `.tsx`: a legal document that exists twice drifts, and the copy that
 * drifts is always the one nobody is reading when it matters. `docs/legal/`
 * is where the documents are reviewed, diffed, and (eventually) handed to a
 * lawyer; `?raw` makes the shipped page a projection of that file rather
 * than a transcription of it. Editing the Markdown is the only way to change
 * what a player sees.
 *
 * The corollary is that ANYTHING written in those three files is public.
 * Operator-facing notes belong in `docs/legal/README.md` or
 * `docs/legal/RISK-MEMO.md`, neither of which is imported here — RISK-MEMO in
 * particular is an internal exposure assessment and must never be bundled.
 *
 * `?raw` typing comes from `vite/client` (see src/vite-env.d.ts). Vitest runs
 * through the same Vite pipeline, so these imports resolve in tests too.
 */
import termsMarkdown from '../../../docs/legal/TERMS.md?raw';
import privacyMarkdown from '../../../docs/legal/PRIVACY.md?raw';
import dmcaMarkdown from '../../../docs/legal/DMCA.md?raw';

export type LegalDocumentId = 'terms' | 'privacy' | 'dmca';

export interface LegalDocument {
  id: LegalDocumentId;
  /** Full title, used as the document heading. */
  title: string;
  /** Short label for the tab strip — must stay short enough for a phone. */
  tabLabel: string;
  /** One line under the tab strip, so a player knows what they opened. */
  summary: string;
  markdown: string;
}

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    tabLabel: 'Terms',
    summary: 'What you agree to by playing here.',
    markdown: termsMarkdown,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    tabLabel: 'Privacy',
    summary: 'What data this game holds, and how to get it back or deleted.',
    markdown: privacyMarkdown,
  },
  {
    id: 'dmca',
    title: 'IP & Takedown Policy',
    tabLabel: 'IP & Takedowns',
    summary: 'For rights holders — how to reach us and what happens next.',
    markdown: dmcaMarkdown,
  },
];

export const DEFAULT_LEGAL_DOCUMENT: LegalDocumentId = 'terms';

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  const found = LEGAL_DOCUMENTS.find((doc) => doc.id === id);
  // Non-null by construction: LegalDocumentId is a closed union over the array
  // above. The fallback exists only so a future id added to the type without a
  // matching entry degrades to the Terms rather than rendering a blank screen.
  return found ?? LEGAL_DOCUMENTS[0];
}

/**
 * Placeholders still awaiting the operator's real details, e.g. `[OPERATOR
 * NAME]`. Exported so a test can fail the build once they are filled in and
 * someone reintroduces one, and so the screen can warn during development
 * instead of quietly showing a player a bracketed blank.
 *
 * Matches an all-caps bracketed token only, so ordinary bracketed prose and
 * Markdown links are never flagged.
 */
export function findUnfilledPlaceholders(markdown: string): string[] {
  const matches = markdown.match(/\[[A-Z][A-Z ,&/-]{2,}\]/g) ?? [];
  return Array.from(new Set(matches));
}

/** Every placeholder still outstanding across all published documents. */
export function allUnfilledPlaceholders(): string[] {
  const all = LEGAL_DOCUMENTS.flatMap((doc) => findUnfilledPlaceholders(doc.markdown));
  return Array.from(new Set(all)).sort();
}
