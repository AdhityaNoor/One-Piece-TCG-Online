/**
 * The app's legal documents, imported as raw Markdown from `./content/`.
 *
 * WHY THE MARKDOWN FILES ARE THE SOURCE OF TRUTH, and not a copy pasted into
 * a `.tsx`: a legal document that exists twice drifts, and the copy that
 * drifts is always the one nobody is reading when it matters. `?raw` makes
 * the shipped page a projection of the file rather than a transcription of
 * it, so editing the Markdown is the only way to change what a player sees.
 *
 * WHY `./content/` AND NOT `docs/legal/`, where these files started: anything
 * the bundle imports has to survive every deploy target's ignore list, and
 * `.vercelignore`, `.dockerignore` and `.gcloudignore` all exclude `docs/`.
 * The local build was fine and the Vercel build failed with "Could not
 * resolve ../../../docs/legal/TERMS.md?raw" — the file simply was not
 * uploaded. A published document is application content, not documentation,
 * so it lives in the source tree with the code that renders it.
 *
 * That split is now load-bearing in the other direction too: `docs/legal/`
 * keeps only the material that must NEVER ship — README.md (the operator's
 * checklist) and RISK-MEMO.md (an internal exposure assessment) — and those
 * stay excluded from every deploy precisely because `docs/` is ignored.
 *
 * The corollary is that ANYTHING written in the three files below is public.
 *
 * `?raw` typing comes from `vite/client` (see src/vite-env.d.ts). Vitest runs
 * through the same Vite pipeline, so these imports resolve in tests too.
 */
import termsMarkdown from './content/TERMS.md?raw';
import privacyMarkdown from './content/PRIVACY.md?raw';
import dmcaMarkdown from './content/DMCA.md?raw';

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
