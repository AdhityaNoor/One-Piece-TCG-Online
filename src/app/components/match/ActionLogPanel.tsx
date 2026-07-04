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

/** engine playerId -> display username. Absent/empty labels fall back to the raw id (hotseat shows p1/p2). */
export type PlayerNameMap = Record<string, string>;

export interface ActionLogPanelProps {
  open: boolean;
  onClose: () => void;
  log: GameLogEntry[];
  playerNames?: PlayerNameMap;
}

export interface ActionLogDockProps {
  log: GameLogEntry[];
  playerNames?: PlayerNameMap;
}

function isSecret(entry: GameLogEntry): boolean {
  return entry.visibility !== 'public';
}

function nameFor(playerId: string, playerNames?: PlayerNameMap): string {
  return playerNames?.[playerId] ?? playerId;
}

export function ActionLogPanel({ open, onClose, log, playerNames }: ActionLogPanelProps) {
  return (
    <Modal open={open} onClose={onClose} title="Action Log" maxWidthClassName="max-w-xl">
      <ActionLogContent log={log} playerNames={playerNames} />
    </Modal>
  );
}

export function ActionLogDock({ log, playerNames }: ActionLogDockProps) {
  return (
    <aside className="flex min-h-0 flex-col border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
      <ActionLogDockContent log={log} playerNames={playerNames} />
    </aside>
  );
}

function CompactLogBadge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'brand' }) {
  return (
    <span
      className={[
        'max-w-full truncate border px-1.5 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.12em]',
        tone === 'brand' ? 'border-brand/30 bg-brand/20 text-rose-100' : 'border-white/10 bg-white/10 text-white/58',
      ].join(' ')}
      title={children}
    >
      {children}
    </span>
  );
}

function ActionLogDockContent({ log, playerNames }: { log: GameLogEntry[]; playerNames?: PlayerNameMap }) {
  const [publicOnly, setPublicOnly] = useState(false);
  const visible = publicOnly ? log.filter((entry) => !isSecret(entry)) : log;
  const ordered = [...visible].reverse();

  return (
    <>
      <div className="border-b border-gold/25 bg-black/18 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Match</p>
            <h2 className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">Logs</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/48">{log.length} entries</p>
          </div>
          <button
            type="button"
            onClick={() => setPublicOnly((value) => !value)}
            className="max-w-[6.25rem] flex-shrink-0 border border-white/15 bg-black/28 px-2 py-1.5 text-[9px] font-black uppercase leading-tight tracking-[0.12em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
          >
            {publicOnly ? 'Show All' : 'Public Only'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {ordered.length === 0 ? (
          <p className="border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/30">No log entries yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {ordered.map((entry) => (
              <li key={entry.id} className="min-w-0 border border-white/10 bg-white/[0.045] p-2 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                <div className="mb-1.5 grid min-w-0 grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/38">
                  <span>#{entry.sequence}</span>
                  <span className="min-w-0 truncate">
                    Turn {entry.turnNumber || '-'} · {entry.phase}
                    {entry.actorPlayerId ? ` · ${nameFor(entry.actorPlayerId, playerNames)}` : ''}
                  </span>
                  <span className="col-span-2 flex min-w-0 flex-wrap gap-1">
                    <CompactLogBadge>{entry.type}</CompactLogBadge>
                    {isSecret(entry) && <CompactLogBadge tone="brand">Secret</CompactLogBadge>}
                  </span>
                </div>
                <p className="min-w-0 break-words text-[11px] font-semibold leading-snug text-white/82">{entry.message}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

function ActionLogContent({ log, playerNames }: { log: GameLogEntry[]; playerNames?: PlayerNameMap }) {
  const [publicOnly, setPublicOnly] = useState(false);
  const visible = publicOnly ? log.filter((e) => !isSecret(e)) : log;
  const ordered = [...visible].reverse();

  return (
      <div className="flex flex-col gap-3 p-4">
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
                      <span>{nameFor(entry.actorPlayerId, playerNames)}</span>
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
  );
}
