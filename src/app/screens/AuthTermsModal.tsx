/**
 * The terms a new account must accept, and the modal that shows them in full.
 *
 * IMPORTANT: this copy is a plain-language PLACEHOLDER written to make the consent flow
 * real and honest, not reviewed legal text. It deliberately says only things this project
 * actually does (fan-made, cosmetic-only, stores an email + username + decks). Replace it
 * with vetted wording before any public launch — and if you ever need to PROVE consent,
 * the acceptance has to be recorded server-side at signup; today the gate is client-side
 * only, so it stops the flow but leaves no audit trail.
 */
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
    label: 'I understand this is a fan-made project, not affiliated with or endorsed by Bandai, Shueisha, or Toei Animation.',
  },
  { id: 'accept-age', label: 'I am 13 years of age or older.' },
];

export function AuthTermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Terms & Privacy" maxWidthClassName="max-w-2xl" bodyClassName="max-h-[70vh] overflow-y-auto p-5">
      <div className="flex flex-col gap-4 text-sm leading-6 text-slate-200/85">
        <p className="border border-amber-300/30 bg-amber-500/10 p-3 text-amber-100/90">
          Placeholder copy. This summarises how the app actually behaves today; it has not been reviewed by a lawyer.
        </p>

        <Section title="What this is">
          A fan-made, non-commercial simulator for the One Piece Card Game. It is not affiliated with, sponsored by, or
          endorsed by Bandai, Shueisha, or Toei Animation. All card names, artwork, and trademarks belong to their
          respective owners and are used here for play only. Nothing here is for sale.
        </Section>

        <Section title="Your account">
          Creating an account stores your email address, your username, a hashed password, and the decks you save. Your
          username is your public player handle — other players can see it. Keep your password to yourself; you are
          responsible for what happens under your account.
        </Section>

        <Section title="Fair play">
          Play the game as intended. Do not cheat, exploit bugs to gain an advantage, automate matches, harass other
          players, or pick a username that is abusive or impersonates someone else. Accounts that do may be suspended.
        </Section>

        <Section title="Your data">
          Your data is used to run the game and nothing else — it is not sold or shared with advertisers. Cosmetic
          choices (sleeves, DON!! art) and saved decks sync to your account so they follow you between devices. Ask and
          your account and its data can be deleted.
        </Section>

        <Section title="No warranty">
          This is a hobby project offered as-is. Matches, ratings, and saved data may be lost, reset, or changed as the
          game is developed, and it may become unavailable at any time.
        </Section>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-heading text-[11px] font-black uppercase tracking-[0.18em] text-[rgb(var(--op-gold-rgb))]">{title}</h3>
      <p className="mt-1">{children}</p>
    </section>
  );
}
