/**
 * The Action Logs screen (Task: "don't forget to implement action logs
 * screen in the gameplay"). Implemented as an in-screen Modal launched from
 * MatchScreen rather than a new NavigationTarget — navigationStore.ts's
 * union is closed and this is a match-scoped overlay, not a destination you
 * navigate to independently of an in-progress match.
 *
 * Reads `state.log` directly and renders it newest-first. `state.log` is
 * ALWAYS the full cumulative log (every handler does
 * `log: [...state.log, ...logger.log]`), so no client-side accumulation is
 * needed — this component is a pure, stateless projection of GameState.
 *
 * `visibility` (logEntry.ts: 'public' | {visibleTo:[...]}) is rendered as a
 * "Secret" badge rather than hidden outright: this is the local hotseat
 * DEBUG board, where both hands are already visible by design (project
 * rule: "Card visibility must be modeled properly, even if both hands are
 * visible in debug mode" — the modeling lives in this flag continuing to
 * exist and being shown, not in hiding it from a board that shows
 * everything else anyway).
 */
import { useState } from 'react';
import type { GameLogEntry } from '../../../engine/logs/logEntry';
import { Modal } from '../Modal';
import { Pill } from '../Pill';
import { Button } from '../Button';

export interface ActionLogPanelProps {
  open: boolean;
  onClose: () => void;
  log: GameLogEntry[];
}

function isSecret(entry: GameLogEntry): boolean {
  return entry.visibility !== 'public';
}

export function ActionLogPanel({ open, onClose, log }: ActionLogPanelProps) {
  const [publicOnly, setPublicOnly] = useState(false);
  const visible = publicOnly ? log.filter((e) => !isSecret(e)) : log;
  const ordered = [...visible].reverse();

  return (
    <Modal open={open} onClose={onClose} title="Action Log" maxWidthClassName="max-w-xl">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50">{log.length} entries</p>
          <Button variant="ghost" size="sm" onClick={() => setPublicOnly((v) => !v)}>
            {publicOnly ? 'Show secret info' : 'Public only'}
          </Button>
        </div>

        {ordered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/30">No log entries yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {ordered.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/40">
                  <span>#{entry.sequence}</span>
                  <span>·</span>
                  <span>Turn {entry.turnNumber || '–'}</span>
                  <span>·</span>
                  <span>{entry.phase}</span>
                  {entry.actorPlayerId && (
                    <>
                      <span>·</span>
                      <span>{entry.actorPlayerId}</span>
                    </>
                  )}
                  <span className="ml-auto flex gap-1">
                    <Pill tone="neutral">{entry.type}</Pill>
                    {isSecret(entry) && <Pill tone="brand">Secret</Pill>}
                  </span>
                </div>
                <p className="text-xs text-white/85">{entry.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
