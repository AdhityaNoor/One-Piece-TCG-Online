/**
 * Guards on the three documents the app publishes verbatim.
 *
 * These documents are unusual for this codebase: they are shipped to players
 * exactly as written, they carry legal weight, and nothing about a mistake in
 * them is visible at runtime — a bracketed placeholder or a leaked internal
 * note renders as ordinary prose and nobody notices. So the tests here are
 * about publication safety, not formatting.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LEGAL_DOCUMENTS,
  allUnfilledPlaceholders,
  findUnfilledPlaceholders,
  getLegalDocument,
  type LegalDocumentId,
} from '../legalDocuments';

const KNOWN_FILES = new Set(['TERMS.md', 'PRIVACY.md', 'DMCA.md']);

describe('legal documents', () => {
  it('loads all three documents with content', () => {
    expect(LEGAL_DOCUMENTS.map((d) => d.id)).toEqual(['terms', 'privacy', 'dmca']);
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.markdown.length).toBeGreaterThan(1000);
      expect(doc.markdown.trimStart().startsWith('# ')).toBe(true);
      expect(doc.tabLabel.length).toBeLessThanOrEqual(16);
      expect(doc.summary).not.toBe('');
    }
  });

  it('resolves every id to its own document', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(getLegalDocument(doc.id).id).toBe(doc.id);
    }
  });

  /**
   * The published documents must never carry operator-facing notes. One did:
   * DMCA.md held a blockquote reminding the operator to register a DMCA agent
   * with the US Copyright Office, which would have shipped to players as part
   * of the takedown policy. Internal notes belong in docs/legal/README.md or
   * docs/legal/RISK-MEMO.md, neither of which is imported by the app.
   */
  it('contains no operator-facing notes or internal references', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.markdown).not.toContain('Note for the operator');
      expect(doc.markdown).not.toContain('RISK-MEMO');
      expect(doc.markdown).not.toContain('INTERNAL');
    }
  });

  /**
   * Cross-document links are rendered as tab switches (see
   * LegalDocumentViewer), which only works for files the viewer knows about.
   * A link to a document that is not published would silently render as inert
   * text — correct, but not what the author meant.
   */
  it('only cross-references documents that are actually published', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      const relative = doc.markdown.match(/\]\(\.\/([^)]+)\)/g) ?? [];
      for (const link of relative) {
        const file = /\]\(\.\/([^)]+)\)/.exec(link)?.[1] ?? '';
        expect(KNOWN_FILES.has(file), `${doc.id} links to unpublished ${file}`).toBe(true);
      }
    }
  });

  it('every document is reachable from the navigation type', () => {
    const ids: LegalDocumentId[] = ['terms', 'privacy', 'dmca'];
    expect(LEGAL_DOCUMENTS.map((d) => d.id).sort()).toEqual([...ids].sort());
  });
});

/**
 * These three files used to live in `docs/legal/`. That built fine locally and
 * failed on Vercel with "Could not resolve ../../../docs/legal/TERMS.md?raw",
 * because `.vercelignore` (and `.dockerignore`, and `.gcloudignore`) all
 * exclude `docs/` — the files were never uploaded. Anything the bundle imports
 * has to live inside the source tree.
 *
 * The import in legalDocuments.ts already fails the build if they move back.
 * This guards the subtler mistake: leaving a SECOND copy behind in docs/legal,
 * which would look authoritative, get edited, and silently never ship.
 */
describe('published documents live in the source tree', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');

  it('has no stale duplicate under docs/legal', () => {
    for (const file of KNOWN_FILES) {
      const stale = path.join(repoRoot, 'docs', 'legal', file);
      expect(existsSync(stale), `${file} must not also exist in docs/legal`).toBe(false);
    }
  });

  it('keeps the internal memo OUT of the source tree', () => {
    const bundled = path.join(repoRoot, 'src', 'app', 'legal', 'content', 'RISK-MEMO.md');
    expect(existsSync(bundled), 'RISK-MEMO.md must never be bundled').toBe(false);
  });
});

describe('findUnfilledPlaceholders', () => {
  /**
   * NOTE FOR FUTURE FIND-AND-REPLACE: the string literals below are FIXTURES.
   * They deliberately contain the bracketed placeholder tokens this function
   * is built to detect, so a repo-wide replace of `[CONTACT EMAIL]` and
   * friends will rewrite them and break these tests — which is exactly what
   * happened once. If that happens again, restore the brackets here rather
   * than "fixing" the expectations.
   */
  const OPERATOR = '[' + 'OPERATOR NAME' + ']';
  const LEGAL = '[' + 'LEGAL EMAIL' + ']';
  const CONTACT = '[' + 'CONTACT EMAIL' + ']';

  it('finds all-caps bracketed placeholders', () => {
    expect(findUnfilledPlaceholders(`Contact ${OPERATOR} at ${LEGAL}.`)).toEqual([OPERATOR, LEGAL]);
  });

  it('does not flag Markdown link text', () => {
    expect(findUnfilledPlaceholders('See [our IP & Takedown Policy](./DMCA.md) for details.')).toEqual([]);
    expect(findUnfilledPlaceholders('[Privacy Policy](./PRIVACY.md)')).toEqual([]);
  });

  it('does not flag ordinary sentence-case brackets', () => {
    expect(findUnfilledPlaceholders('a bracketed [aside] here')).toEqual([]);
  });

  it('deduplicates repeats', () => {
    expect(findUnfilledPlaceholders(`${CONTACT} ... ${CONTACT}`)).toEqual([CONTACT]);
  });

  /**
   * This was informational while the documents still carried
   * [OPERATOR NAME], [CONTACT EMAIL], [LEGAL EMAIL], [CITY] and [PROVINCE].
   * Those are all filled in now, so it is a hard gate: a document must never
   * reach a player with a bracketed blank where a name, an address or an
   * inbox belongs. If this fails, finish the document — do not delete the
   * test.
   */
  it('ships no unfilled placeholders in any published document', () => {
    expect(allUnfilledPlaceholders()).toEqual([]);
  });
});
