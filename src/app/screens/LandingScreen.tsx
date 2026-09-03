/**
 * The unified pre-menu landing flow. Replaces the old, disconnected
 * AuthScreen (which dropped straight into a login form the instant the app
 * loaded, with no visual relationship to the main menu it handed off to).
 *
 * Flow:
 *   1. App loads -> only a "Start" button is shown (BrandLogo + Start).
 *   2. Start clicked -> auth card appears (replaces the Start button).
 *   3. Sign In / Sign Up switch via the segmented tabs on the card.
 *   4. Login/signup succeeds -> App.tsx's gate flips (`status ===
 *      'authenticated'`) and swaps this whole screen out for the real
 *      nav stack, which defaults to MainMenuScreen -> the main menu buttons
 *      "appear" via that existing hand-off, not anything owned by this file.
 *
 * `stage` here is local UI state only, independent of authStore's `status`
 * — this screen never decides auth outcomes, only which of its own panels
 * is visible. App.tsx still owns the actual gate (status !== 'authenticated'
 * && !offlineMode) and is untouched by this stage machine.
 *
 * Shares BrandLogo + LandingBackdrop with MainMenuScreen so Start ->
 * Login/Signup -> Main Menu reads as one continuous page instead of a hard
 * cut between unrelated screens, which is the whole point of merging these
 * into "the landing page" rather than a separate auth screen. The logo stays
 * ON SCREEN through the auth stages for the same reason — it used to vanish
 * the moment you pressed Start, which broke exactly the continuity this file
 * exists to create.
 */
import { useState, type FormEvent, type ReactNode } from 'react';
import { BrandLogo, Button, FanProjectDisclaimerLine, GameCanvasScreen, LandingBackdrop } from '../components';
import { useAuthStore } from '../store/authStore';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { AuthTermsModal, REQUIRED_TERMS } from './AuthTermsModal';

type Stage = 'start' | 'login' | 'signup';

export function LandingScreen() {
  const [stage, setStage] = useState<Stage>('start');

  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const continueOffline = useAuthStore((s) => s.continueOffline);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [termsOpen, setTermsOpen] = useState(false);

  const isSignup = stage === 'signup';
  const configured = isBackendConfigured();
  const allTermsAccepted = REQUIRED_TERMS.every((item) => accepted[item.id]);
  // Sign-up is BLOCKED until every box is ticked. Checked in two places on purpose:
  // `disabled` for the obvious affordance, and again in handleSubmit because a form can
  // still be submitted by pressing Enter in a text field.
  const canSubmit = configured && !busy && (!isSignup || allTermsAccepted);

  function goTo(next: Stage): void {
    clearError();
    setStage(next);
  }

  function toggleTerm(id: string): void {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!configured) return;
    if (isSignup && !allTermsAccepted) return;
    // On success authStore flips to `authenticated` and App.tsx swaps this
    // whole screen out for the main menu — nothing to navigate here.
    if (isSignup) await signup(email, username, password);
    else await login(email, password);
  }

  return (
    <GameCanvasScreen onBack={stage !== 'start' ? () => goTo('start') : undefined}>
      <LandingBackdrop />

      {stage === 'start' ? (
        <div className="relative flex h-full flex-col items-center justify-center gap-16 overflow-hidden">
          <BrandLogo />
          <nav className="relative z-10 flex w-full flex-col items-center gap-3" aria-label="Landing">
            <StartButton onClick={() => goTo('login')} />
            {/* Front door of the front door: the title stage is what a first-time
                visitor lands on and what a link preview shows, so the disclaimer
                has to be here too, not only on the form behind it. */}
            <FanProjectDisclaimerLine className="max-w-[34rem] px-4 pt-2" onOpenLegal={() => setTermsOpen(true)} />
          </nav>
        </div>
      ) : (
        /* The card sits RIGHT of centre on wide screens so the character art it used to
           cover stays visible — the backdrop is the most alive thing on this screen and
           the old centred panel parked directly over Luffy's face. */
        <div className="relative z-10 flex h-full min-h-0 w-full items-start justify-center overflow-y-auto overscroll-contain px-4 pb-8 pt-3 lg:justify-end lg:pr-[8%]">
          <div className="my-auto flex w-full max-w-[26rem] flex-col items-center gap-4">
            {/* A real small size, not `scale-*`: a transform would leave the hero-sized
                layout box behind and push the submit button off-screen. Hidden entirely on
                short viewports, where every pixel belongs to the form. */}
            <div className="relative hidden shrink-0 sm:block">
              <BrandLogo heightClassName="h-[3.25rem] lg:h-[4rem]" />
            </div>

            <AuthCard>
              <div className="flex gap-2.5 px-3 pb-1 pt-3">
                <AuthTab active={!isSignup} onClick={() => goTo('login')}>
                  Sign In
                </AuthTab>
                <AuthTab active={isSignup} onClick={() => goTo('signup')} disabled={!configured}>
                  Sign Up
                </AuthTab>
              </div>

              <div className="flex flex-col gap-4 px-5 pb-5 pt-1">
                <p className="text-center text-[13px] leading-5 text-slate-200/70">
                  {configured
                    ? isSignup
                      ? 'Create your crew. Your account name is your player handle.'
                      : 'Welcome back, captain. Your account name is your player handle.'
                    : null}
                </p>

                {!configured && (
                  <p className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3.5 text-[13px] leading-5 text-amber-100/90">
                    Online play isn't configured for this build (no backend URL set). Set <code>VITE_API_BASE_URL</code>{' '}
                    to enable accounts, or continue offline for local play.
                  </p>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                  <Field label="Email" htmlFor="auth-email">
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      disabled={!configured}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError();
                      }}
                      className={inputClass}
                    />
                  </Field>

                  {isSignup && (
                    <Field label="Username" htmlFor="auth-username" hint="2–20 characters. This is your public handle.">
                      <input
                        id="auth-username"
                        type="text"
                        autoComplete="nickname"
                        placeholder="StrawHatLuffy"
                        required
                        minLength={2}
                        maxLength={20}
                        disabled={!configured}
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          clearError();
                        }}
                        className={inputClass}
                      />
                    </Field>
                  )}

                  <Field label="Password" htmlFor="auth-password" hint={isSignup ? 'At least 8 characters' : undefined}>
                    <input
                      id="auth-password"
                      type="password"
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      disabled={!configured}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                      }}
                      className={inputClass}
                    />
                  </Field>

                  {isSignup && configured && (
                    <fieldset className="mt-0.5 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 p-3.5">
                      <legend className="px-1 font-heading text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--op-gold-rgb))]">
                        Before you join
                      </legend>
                      {REQUIRED_TERMS.map((item) => (
                        <TermCheckbox
                          key={item.id}
                          id={item.id}
                          checked={accepted[item.id] ?? false}
                          onChange={() => toggleTerm(item.id)}
                        >
                          {item.kind === 'terms' ? (
                            <>
                              I agree to the{' '}
                              <button
                                type="button"
                                onClick={() => setTermsOpen(true)}
                                className="font-bold text-[rgb(var(--op-gold-rgb))] underline underline-offset-2 hover:brightness-125"
                              >
                                Terms of Service and Privacy Policy
                              </button>
                              .
                            </>
                          ) : (
                            item.label
                          )}
                        </TermCheckbox>
                      ))}
                    </fieldset>
                  )}

                  {error && (
                    <p role="alert" className="rounded-2xl border border-red-400/50 bg-red-500/10 px-3.5 py-2.5 text-[13px] leading-5 text-red-200">
                      {error}
                    </p>
                  )}

                  <Button type="submit" variant="primary" fullWidth disabled={!canSubmit}>
                    {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
                  </Button>

                  {isSignup && configured && !allTermsAccepted && (
                    <p className="text-center text-[11px] leading-4 text-white/45">
                      Tick every box above to create your account.
                    </p>
                  )}
                </form>

                {!configured && (
                  <div className="border-t border-white/10 pt-4">
                    <Button variant="ghost" fullWidth onClick={() => continueOffline()}>
                      Continue offline (local play)
                    </Button>
                  </div>
                )}

                {/*
                  The landing screen is the app's front door and, for anyone
                  who never signs up, the only screen they will ever see — so
                  the fan-project disclaimer lives here rather than only
                  behind the account wall. It opens the same modal as the
                  sign-up checkbox, which now carries the full documents.
                */}
                <FanProjectDisclaimerLine className="border-t border-white/10 pt-3.5" onOpenLegal={() => setTermsOpen(true)} />
              </div>
            </AuthCard>
          </div>
        </div>
      )}

      <AuthTermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </GameCanvasScreen>
  );
}

/**
 * The card. The old one was `bg-[#0b1220]/90` — near-black, which read as a dead rectangle
 * punched into a bright, colourful backdrop. This is a lit navy with a gold hairline, a gold
 * accent bar along the top edge, and a soft outer glow, so it sits ON the art rather than
 * blocking it out.
 *
 * Corners are generously rounded (and every control inside follows) — the all-square
 * treatment read as a generic template panel, and the shape now echoes the rounded
 * parallelogram tabs sitting on it.
 */
function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 bg-[radial-gradient(ellipse_at_center,_rgb(var(--op-gold-rgb)/0.22),_transparent_70%)] blur-2xl"
      />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[rgb(var(--op-gold-rgb)/0.55)] bg-gradient-to-b from-[#1a2d78] via-[#101b48] to-[#080e28] shadow-[0_22px_60px_rgba(0,0,0,0.65)]">
        {/* Inset above the rounded corners so the accent reads as a bar, not as two
            slivers clipped off by the corner radius. */}
        <div aria-hidden="true" className="mx-auto h-[3px] w-[72%] rounded-full bg-gradient-to-r from-transparent via-[rgb(var(--op-gold-rgb))] to-transparent" />
        {/* Top sheen — stops the large flat fill from looking like dead space. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.07] to-transparent" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

/**
 * Segmented Sign In / Sign Up switch, in the game's parallelogram button shape.
 *
 * The SKEW LIVES ON A BACKGROUND SPAN, not on the button: skewing the button
 * itself would drag the label with it (Button.tsx has to counter-skew its own
 * text for exactly this reason), and a counter-skewed label re-introduces the
 * blurry-glyph problem on a 12px uppercase tracking-heavy word. The frame is
 * softly rounded so the sharp parallelogram points don't fight the rounded card
 * The shape itself stays the app's sharp -skew-x-12 parallelogram, identical to
 * Button.tsx / the main-menu tabs — only the panel and the inputs are rounded.
 */
function AuthTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={[
        'group relative flex-1 select-none px-3 py-2.5 font-heading text-xs font-black uppercase tracking-[0.14em]',
        'transition-colors duration-200 focus:outline-none',
        active ? 'text-white' : 'text-white/55 hover:text-white/90',
        disabled ? 'cursor-not-allowed opacity-40' : '',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 -skew-x-12 border transition-all duration-200',
          'group-focus-visible:ring-2 group-focus-visible:ring-[rgb(var(--op-gold-rgb))] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#101b48]',
          active
            ? 'border-[rgb(var(--op-gold-rgb)/0.85)] bg-[rgb(var(--op-gold-rgb)/0.18)] shadow-[0_8px_22px_-6px_rgb(var(--op-gold-rgb)/0.55)]'
            : 'border-white/15 bg-black/25 group-hover:border-white/30 group-hover:bg-black/15',
        ].join(' ')}
      />
      <span className="relative z-10 block">{children}</span>
    </button>
  );
}

/** Big, obviously-tappable checkbox — the whole row is the label. */
function TermCheckbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="group flex cursor-pointer items-start gap-2.5 text-[12px] leading-[1.35rem] text-slate-200/80">
      <input id={id} type="checkbox" checked={checked} onChange={onChange} required className="peer sr-only" />
      <span
        aria-hidden="true"
        className={[
          'mt-[0.15rem] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-[11px] font-black transition',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--op-gold-rgb))]',
          checked
            ? 'border-[rgb(var(--op-gold-rgb))] bg-[rgb(var(--op-gold-rgb))] text-black'
            : 'border-white/35 bg-black/40 text-transparent group-hover:border-white/60',
        ].join(' ')}
      >
        ✓
      </span>
      <span>{children}</span>
    </label>
  );
}

/** The Start CTA — the game's skewed menu-button shape, at hero scale. */
function StartButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-14 w-full max-w-[21rem] select-none px-7 font-heading text-base font-black uppercase tracking-[0.12em] text-white transition-transform duration-200 hover:scale-x-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061024]"
    >
      <span aria-hidden="true" className="absolute inset-0 -skew-x-12 border border-white/80 bg-red-600/55 transition-colors duration-200 group-hover:border-white group-hover:bg-red-600/70" />
      <span className="relative z-10 flex h-full items-center justify-center transition-transform duration-200 group-hover:scale-x-[0.6667]">
        Start
      </span>
    </button>
  );
}

const inputClass =
  // Lifted off pure black: the old `bg-[#050a14]/95` inputs read as holes in the panel.
  'h-11 w-full rounded-xl border border-white/20 bg-white/[0.07] px-3.5 text-sm text-white placeholder:text-white/30 outline-none transition ' +
  'hover:border-white/35 focus:border-[rgb(var(--op-gold-rgb))] focus:bg-white/[0.1] focus:ring-2 focus:ring-[rgb(var(--op-gold-rgb)/0.35)] ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-[rgb(var(--op-gold-rgb))]">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-4 text-white/40">{hint}</span>}
    </label>
  );
}
