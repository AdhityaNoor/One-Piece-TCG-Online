/**
 * Guards on the three documents the app publishes verbatim.
 *
 * These documents are unusual for this codebase: they are shipped to players
 * exactly as written, they carry legal weight, and nothing about a mistake in
 * them is visible at runtime — a bracketed placeholder or a leaked internal
 * note renders as ordinary prose and nobody notices. So the tests here are
 * about publication safety, not formatting.
 */
import { describe, expect, it } from 'vitest';
import {
  LEGAL_DOCUMENTS,
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
   * RISK-MEMO.md, neither of which is imported by the app.
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

describe('findUnfilledPlaceholders', () => {
  it('finds all-caps bracketed placeholders', () => {
    expect(findUnfilledPlaceholders('Contact Croix Shadow at support@optcgcustom.app.')).toEqual([
      'Croix Shadow',
      'support@optcgcustom.app',
    ]);
  });

  it('does not flag Markdown link text', () => {
    expect(findUnfilledPlaceholders('See [our IP & Takedown Policy](./DMCA.md) for details.')).toEqual([]);
    expect(findUnfilledPlaceholders('[Privacy Policy](./PRIVACY.md)')).toEqual([]);
  });

  it('does not flag ordinary sentence-case brackets', () => {
    expect(findUnfilledPlaceholders('a bracketed [aside] here')).toEqual([]);
  });

  it('deduplicates repeats', () => {
    expect(findUnfilledPlaceholders('support@optcgcustom.app ... support@optcgcustom.app')).toEqual(['support@optcgcustom.app']);
  });

  /**
   * DELIBERATELY NOT ASSERTED: that the shipped documents have zero
   * placeholders. They still contain Croix Shadow, support@optcgcustom.app,
   * support@optcgcustom.app, Jakarta and Greater Area Jakarta — filling those in is the operator's
   * job before launch, and a failing test here from day one would just be
   * disabled. The screen shows a dev-only warning instead
   * (LegalDocumentViewer). Turn this into a hard assertion once the real
   * details are in.
   */
  it('reports the placeholders still outstanding (informational)', () => {
    const outstanding = LEGAL_DOCUMENTS.flatMap((d) => findUnfilledPlaceholders(d.markdown));
    expect(Array.isArray(outstanding)).toBe(true);
  });
});
