/**
 * The Terms of Service, Privacy Policy, and IP & Takedown Policy, rendered
 * from `src/app/legal/content/*.md` (see src/app/legal/legalDocuments.ts for why the
 * Markdown files are the source of truth rather than a copy in JSX).
 *
 * The screen is only the frame. The tab strip, cross-document links, and
 * scrolling all live in LegalDocumentViewer, which AuthTermsModal reuses so
 * that the text a player agrees to at sign-up and the text they can re-read
 * later are the same text.
 *
 * Scrolling is owned by the document body, not the page: AppShell holds the
 * one `h-dvh` for the app (see AppShell.tsx), so this screen sizes with
 * `h-full` and lets the panel underneath it scroll.
 */
import { GameCanvasScreen } from '../components';
import { LegalDocumentViewer } from '../legal/LegalDocumentViewer';
import type { LegalDocumentId } from '../legal/legalDocuments';
import { useNavigationStore } from '../store/navigationStore';

export interface LegalScreenProps {
  /** Which document to open on mount. Defaults to the Terms. */
  doc?: LegalDocumentId;
}

export function LegalScreen({ doc }: LegalScreenProps) {
  const goBack = useNavigationStore((state) => state.goBack);

  return (
    <GameCanvasScreen onBack={goBack}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col py-2">
        <LegalDocumentViewer
          initialDoc={doc}
          bodyClassName="border-2 border-gold/25 bg-[linear-gradient(180deg,_rgba(10,28,66,0.86),_rgba(3,9,24,0.92))] px-4 py-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] sm:px-7 sm:py-6"
        />
      </div>
    </GameCanvasScreen>
  );
}
