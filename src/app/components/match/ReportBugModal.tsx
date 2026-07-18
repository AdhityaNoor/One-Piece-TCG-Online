/**
 * "Report a Bug" modal, launched from MatchScreen's Paused modal. Lets the
 * reporter (a) optionally pick which played card the bug is about, from the
 * match's own play history (buildBugReportCardOptions — CARD_PLAYED log
 * entries only) and (b) describe the issue in free text. Submitting sends
 * both plus the full cumulative GameLogEntry[] ("record the battle log
 * verbosely" requirement) to the backend via bugReportStore.submit.
 *
 * Pure projection + one store's worth of local UI state — no engine imports,
 * no dispatch, same boundary MatchChatPanel documents for chat.
 */
import { useEffect, type CSSProperties } from 'react';
import type { GameLogEntry } from '../../../engine/logs/logEntry';
import type { MatchModeTag } from '../../../../shared/support';
import type { BugReportCardOption } from '../../lib/bugReportCardOptions';
import { useBugReportStore } from '../../store/bugReportStore';
import { Modal } from '../Modal';
import { Button } from '../Button';

/** navy-950 from tailwind.config.js — see the card-select <option> doc comment below for why this has to be inline rather than a Tailwind class. */
const OPTION_STYLE: CSSProperties = { backgroundColor: '#070b1c', color: '#ffffff' };

export interface ReportBugModalProps {
  open: boolean;
  onClose: () => void;
  matchMode: MatchModeTag;
  matchId: string | null;
  turnNumber: number;
  phase: string;
  log: GameLogEntry[];
  cardOptions: BugReportCardOption[];
}

export function ReportBugModal({ open, onClose, matchMode, matchId, turnNumber, phase, log, cardOptions }: ReportBugModalProps) {
  const description = useBugReportStore((s) => s.description);
  const selectedCardInstanceId = useBugReportStore((s) => s.selectedCardInstanceId);
  const status = useBugReportStore((s) => s.status);
  const error = useBugReportStore((s) => s.error);
  const setDescription = useBugReportStore((s) => s.setDescription);
  const selectCard = useBugReportStore((s) => s.selectCard);
  const submit = useBugReportStore((s) => s.submit);
  const reset = useBugReportStore((s) => s.reset);

  // Fresh draft every time the modal is (re)opened — a stale description or
  // card pick from a previous report shouldn't silently carry over.
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose(): void {
    onClose();
  }

  async function handleSubmit(): Promise<void> {
    const ok = await submit({ matchMode, matchId, turnNumber, phase, log, cardOptions });
    if (ok) {
      // Leave the success state visible for a beat instead of yanking the
      // modal closed under the reporter — they close it themselves.
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Report a Bug" maxWidthClassName="max-w-lg">
      {status === 'success' ? (
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-200/85">
            Thanks — your report was submitted along with the battle log for this match. We'll use it to track down the issue.
          </p>
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-200/70">
            Describe what went wrong. If it's about a specific card, pick it below — we'll attach the full match log automatically so we
            can see exactly what happened.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bug-report-card" className="text-[11px] font-black uppercase tracking-[0.12em] text-white/50">
              Card (optional)
            </label>
            <select
              id="bug-report-card"
              value={selectedCardInstanceId ?? ''}
              onChange={(event) => selectCard(event.target.value || null)}
              disabled={status === 'submitting'}
              className="h-10 w-full border border-white/25 bg-white/[0.07] px-3 text-sm text-white outline-none focus:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/*
                Native <option> elements render in the OS's own dropdown
                popup, not this component's DOM styling — the parent
                <select>'s bg-white/[0.07] + text-white classes don't reach
                them, so most browsers fell back to a light/white popup
                background with our white text on top of it (invisible until
                the browser's own hover highlight provided contrast). Setting
                an explicit dark background + white text inline is the
                reliable cross-browser fix for styling native option rows.
              */}
              <option value="" style={OPTION_STYLE}>
                No specific card
              </option>
              {cardOptions.map((option) => (
                <option key={option.cardInstanceId} value={option.cardInstanceId} style={OPTION_STYLE}>
                  {option.label}
                </option>
              ))}
            </select>
            {cardOptions.length === 0 && (
              <p className="text-xs text-white/40">No cards have been played onto the board yet this match.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bug-report-description" className="text-[11px] font-black uppercase tracking-[0.12em] text-white/50">
              What happened?
            </label>
            <textarea
              id="bug-report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={status === 'submitting'}
              rows={5}
              maxLength={2000}
              placeholder="e.g. This card's [On Play] effect should have let me draw a card, but nothing happened."
              className="w-full resize-none border border-white/25 bg-white/[0.07] p-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-right text-[10px] text-white/35">{description.length}/2000</p>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={handleClose} disabled={status === 'submitting'}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={() => void handleSubmit()} disabled={status === 'submitting' || !description.trim()}>
              {status === 'submitting' ? 'Submitting…' : 'Submit Report'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
