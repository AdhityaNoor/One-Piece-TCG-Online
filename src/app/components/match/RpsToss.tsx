/**
 * Pre-game Rock-Paper-Scissors: the out-of-band step (Comprehensive Rules
 * 5-2-1-4-1) that decides WHICH player then chooses to go first or second.
 * It replaced a coin toss whose outcome was, in every mode, already fixed
 * before the animation started.
 *
 * Presentational only. It renders a round, reports a pick, and shows the
 * result; it never resolves anything. Whoever owns the toss decides — the
 * Colyseus room for a real match, the local VS-AI driver for a CPU one — so
 * there is exactly one implementation of "does rock beat paper" in play
 * (shared/rps.ts), not one per surface.
 *
 * Reuses the settings-panel glass tokens and ChoicePromptPanel pieces, so it
 * sits in the same visual family as every other blocking pre-game panel
 * rather than introducing a second look for the same moment.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { RPS_CHOICES, RPS_PRESENTATION, RPS_REVEAL_MS, type RpsChoice } from '../../../../shared/rps';
import { ChoicePromptActionRow, ChoicePromptOption } from './ChoicePromptPanel';
import {
  SETTINGS_PANEL_BODY,
  SETTINGS_PANEL_LABEL,
  SETTINGS_PANEL_SCRIM,
  SETTINGS_PANEL_SHELL,
  SETTINGS_PANEL_TITLE,
} from '../settingsPanelStyles';

/**
 * Re-exported so the components that render a toss keep importing their timing
 * from the panel they are timing, while the number itself stays in shared/rps
 * where the server reads the same one.
 */
export { RPS_REVEAL_MS };

export type RpsVerdict = 'win' | 'lose' | 'draw';

export interface RpsTossProps {
  /** 1-based round; a change resets the local reveal animation. */
  round: number;
  /** Name shown for the local side. */
  youLabel: string;
  /** Name shown for the other side. */
  themLabel: string;
  /** This side's locked pick, or null while still choosing. */
  yourChoice: RpsChoice | null;
  /**
   * True when this side has thrown but the choice itself isn't known locally
   * — the reconnect case, where the server reports the seat as locked and the
   * optimistic echo is gone. Without it the row would unlock and invite a
   * second throw the server would (correctly) ignore. Defaults to
   * `!!yourChoice`, which is the ordinary case.
   */
  youLocked?: boolean;
  /** True once the other side has locked in — shown WITHOUT revealing what they chose. */
  themLocked: boolean;
  /** Both picks, present only once the round is decided. */
  reveal: { yours: RpsChoice; theirs: RpsChoice; verdict: RpsVerdict } | null;
  /** Who now chooses to go first or second. Shown under a decisive result. */
  deciderLabel?: string | null;
  onPick: (choice: RpsChoice) => void;
  /** Extra line under the panel (connection notices, validation errors). */
  footer?: ReactNode;
}

const VERDICT_COPY: Record<RpsVerdict, { title: string; tone: string }> = {
  win: { title: 'Win', tone: 'text-emerald-300' },
  lose: { title: 'Lose', tone: 'text-rose-300' },
  draw: { title: 'Draw', tone: 'text-amber-200' },
};

/**
 * The three throws as HANDS, not the objects they stand for — a closed fist, a
 * flat palm, two fingers in a V. One vocabulary across the set: the same palm
 * and the same thumb every time, so the fingers are the only thing that
 * differs and the only thing a player has to read.
 *
 * Line art on `currentColor` rather than emoji: emoji render in the system's
 * own colour and style, which is the one thing on this screen that would not
 * match the rest of the panel.
 */
/**
 * The three throws as HANDS, not the objects they stand for. The art lives in
 * public/ui-icons/RHS and is drawn as a CSS mask over `currentColor` — the
 * same trick RankBadge uses for the ranked-ladder silhouettes — so each hand
 * inherits the panel's text colour and every state that already works on text
 * (dimmed when locked, full strength when selected) works on it unchanged.
 * An <img> of a white SVG could not do that.
 *
 * The three files share one drawing scale but not one height: a raised V is
 * taller than a fist, and that is true of hands. Sizing each to its own share
 * of the tallest preserves the relationship rather than stretching a fist to
 * match, and anchoring them to the bottom of the box puts every wrist on the
 * same line.
 */
const CHOICE_ART: Record<RpsChoice, { src: string; heightPct: number }> = {
  rock: { src: '/ui-icons/RHS/rock.svg', heightPct: 70 },
  paper: { src: '/ui-icons/RHS/paper.svg', heightPct: 91 },
  scissors: { src: '/ui-icons/RHS/scissors.svg', heightPct: 100 },
};

const GLYPH_BOX: Record<'lg' | 'sm', string> = {
  lg: 'h-[clamp(4.4rem,12vw,7rem)] w-[clamp(4.4rem,12vw,7rem)]',
  sm: 'h-[2.1rem] w-[2.1rem]',
};

function ChoiceGlyph({ choice, size = 'lg' }: { choice: RpsChoice; size?: 'lg' | 'sm' }) {
  const { label } = RPS_PRESENTATION[choice];
  const { src, heightPct } = CHOICE_ART[choice];
  return (
    <span
      role="img"
      aria-label={label}
      className={`block shrink-0 ${GLYPH_BOX[size]}`}
      style={{
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center bottom',
        maskPosition: 'center bottom',
        WebkitMaskSize: `auto ${heightPct}%`,
        maskSize: `auto ${heightPct}%`,
      }}
    />
  );
}

/**
 * This panel is a full-screen moment, not the gear menu the shared tokens were
 * sized for, so it restates their recipe (same weight, casing, tracking and
 * colour) at a scale that carries the room. Restated rather than appended to,
 * because two competing `text-[…]` utilities on one element resolve by
 * stylesheet order, not by which was written last.
 */
const RPS_EYEBROW = 'text-[13px] font-black uppercase tracking-[0.24em] text-white/72';
const RPS_SLOT_LABEL = 'text-[13px] font-black uppercase tracking-[0.2em] text-white/68';
const RPS_BODY = 'text-[15px] leading-6 text-white/58';

/** One side's slot during the reveal: a card back until it flips to the choice. */
function RevealSlot({ label, choice, hidden, delayMs }: { label: string; choice: RpsChoice | null; hidden: boolean; delayMs: number }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (hidden || !choice) {
      setFlipped(false);
      return;
    }
    const timer = window.setTimeout(() => setFlipped(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [choice, hidden, delayMs]);

  return (
    <div className="flex min-w-[9rem] flex-col items-center gap-3">
      <span className={RPS_SLOT_LABEL}>{label}</span>
      <div
        className={[
          'flex h-[clamp(7rem,17vw,9.5rem)] w-[clamp(7rem,17vw,9.5rem)] items-center justify-center rounded-2xl border transition-all duration-300',
          flipped ? 'scale-100 border-white/25 bg-white/10' : 'scale-95 border-white/12 bg-black/30',
        ].join(' ')}
      >
        {flipped && choice ? <ChoiceGlyph choice={choice} /> : <span className="text-5xl font-light text-white/25">?</span>}
      </div>
    </div>
  );
}

export function RpsToss({
  round,
  youLabel,
  themLabel,
  yourChoice,
  youLocked,
  themLocked,
  reveal,
  deciderLabel,
  onPick,
  footer,
}: RpsTossProps) {
  const locked = youLocked ?? !!yourChoice;
  return (
    <div className={`fixed inset-0 z-50 overflow-hidden text-white ${SETTINGS_PANEL_SCRIM}`}>
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <section className="pointer-events-auto relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <p className={`mb-4 ${RPS_EYEBROW}`}>Rock Paper Scissors{round > 1 ? ` · Round ${round}` : ''}</p>
        <h2 className="font-display text-[clamp(2.8rem,8vw,6rem)] font-black uppercase leading-[0.92] tracking-[0.04em] text-white/72">
          {reveal ? VERDICT_COPY[reveal.verdict].title : 'Throw'}
        </h2>
        <p className={`mt-5 max-w-3xl ${RPS_BODY}`}>
          {reveal
            ? reveal.verdict === 'draw'
              ? 'A draw — another round decides it.'
              : `${deciderLabel ?? ''} chooses who goes first.`
            : 'The winner chooses whether to go first or second.'}
        </p>

        <div className="my-10 flex items-end justify-center gap-10">
          <RevealSlot label={youLabel} choice={reveal ? reveal.yours : yourChoice} hidden={!reveal && !yourChoice} delayMs={0} />
          <span className="mb-[3.2rem] text-[13px] font-black uppercase tracking-[0.2em] text-white/35">vs</span>
          {/* The opponent's slot stays face-down until the reveal — the panel is
              never handed their choice before the round is decided. */}
          <RevealSlot label={themLabel} choice={reveal ? reveal.theirs : null} hidden={!reveal} delayMs={reveal ? 260 : 0} />
        </div>

        {reveal ? (
          <div className={`w-full max-w-2xl rounded-2xl p-5 ${SETTINGS_PANEL_SHELL}`}>
            <p className={`${RPS_EYEBROW} ${VERDICT_COPY[reveal.verdict].tone}`}>{VERDICT_COPY[reveal.verdict].title}</p>
            <p className={`mt-3 ${RPS_SLOT_LABEL}`}>
              {RPS_PRESENTATION[reveal.yours].label} vs {RPS_PRESENTATION[reveal.theirs].label}
            </p>
            {reveal.verdict !== 'draw' && deciderLabel && (
              <p className={`mt-3 ${RPS_BODY}`}>
                <span className={RPS_SLOT_LABEL}>{deciderLabel}</span> chooses who goes first.
              </p>
            )}
          </div>
        ) : (
          <>
            <ChoicePromptActionRow>
              {RPS_CHOICES.map((choice) => {
                const selected = yourChoice === choice;
                return (
                  <ChoicePromptOption
                    key={choice}
                    size="lg"
                    className={[
                      'min-w-[12rem] flex-1 rounded-xl transition-transform',
                      locked ? '' : 'hover:-translate-y-0.5',
                      selected ? 'ring-2 ring-white/70' : locked ? 'opacity-45' : '',
                    ].join(' ')}
                    disabled={locked}
                    onClick={() => onPick(choice)}
                  >
                    <span className="flex items-center justify-center gap-3">
                      <ChoiceGlyph choice={choice} size="sm" />
                      {RPS_PRESENTATION[choice].label}
                    </span>
                  </ChoicePromptOption>
                );
              })}
            </ChoicePromptActionRow>
            <p className={`mt-5 ${RPS_BODY}`}>
              {locked
                ? themLocked
                  ? 'Both locked in — revealing...'
                  : `Locked in. Waiting for ${themLabel}...`
                : themLocked
                  ? `${themLabel} has locked in. Your throw.`
                  : 'Pick your throw.'}
            </p>
          </>
        )}

        {footer}
        <div className="mt-10 h-px w-[min(42rem,78vw)] bg-white/10" />
      </section>
    </div>
  );
}
