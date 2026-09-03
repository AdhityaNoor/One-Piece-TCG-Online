/**
 * The terms a new account must accept, and the modal that shows them.
 *
 * This modal opens from the sign-up form, which is the one moment consent is
 * actually given — so it shows the REAL documents (docs/legal/TERMS.md,
 * PRIVACY.md, DMCA.md) through the same viewer as LegalScreen, not a
 * friendlier summary of them. A player who ticks the box has been shown the
 * text that binds them.
 *
 * KNOWN LIMITATION, unchanged: the gate is client-side only. It stops the
 * sign-up flow but leaves no audit trail, so this cannot PROVE consent. To
 * prove it, the acceptance (document version + timestamp) has to be recorded
 * server-side at signup — see server/src/auth/routes.ts. Worth doing before
 * any public launch; the documents are versioned by their "Last updated"
 * line, which is what such a record should store.
 */
import { LegalDocumentViewer } from '../legal/LegalDocumentViewer';
import { Modal } from '../components';

/** One required tick on the sign-up form. `id` is only used as a React key / input id. */
export interface TermsCheckItem {
  id: string;
  /** Rendered next to the checkbox. `terms` gets the clickable link treatment. */
  label: string;
  kind?: 'terms';
}

export const REQUIRED_TERMS: TermsCheckItem[] = [
  { id: 'accept-terms', label: 'I agree to the Terms of Service and Privacy Policy.', kind: 'terms' },
  {
    id: 'accept-fan-project',
    label:
      'I understand this is a fan-made project, not affiliated with or endorsed by Bandai, Shueisha, or Toei Animation.',
  },
  { id: 'accept-age', label: 'I am 13 years of age or older.' },
];

export function AuthTermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Terms, Privacy & Takedowns"
      maxWidthClassName="max-w-3xl"
      bodyClassName="flex max-h-[78vh] flex-col p-4 sm:p-5"
    >
      <LegalDocumentViewer bodyClassName="pr-1" />
    </Modal>
  );
}
