/**
 * In-match chat for online play (Casual + Ranked — both hydrate through
 * matchStore.onlineMode/hydrateOnlineMatch, see onlineStore.ts). Lives inside
 * MatchScreen's left Actions aside as an always-visible dock below the
 * action content (not a tab — an earlier tabbed version was reworked per
 * feedback since chat should always be visible, not behind a click).
 *
 * Deliberately NOT part of the engine/action-dispatch system: chat is table
 * talk, not a GameAction, so it never touches GameState, validateAction, or
 * matchStore.dispatch (project rule: "the UI must never directly mutate game
 * state" is about *game* state — this panel only calls onlineStore.sendChat,
 * which rides the same authoritative Colyseus room but stays on its own
 * ClientMessage.Chat/ServerMessage.Chat wire messages; see
 * shared/multiplayer.ts). Local hotseat / VS CPU never mount this component
 * at all (no `onlineMode`, nobody to talk to).
 *
 * Message ordering/attribution is server-authoritative (ChatBroadcastPayload
 * carries seatId + server sentAt) — this component is a pure projection of
 * onlineStore.chatMessages, same as ActionLogDock is a pure projection of
 * state.log.
 */
import { useEffect, useRef, useState } from 'react';
import type { ChatMessageView } from '../../store/onlineStore';

const CHAT_MAX_LENGTH = 240;

export interface MatchChatPanelProps {
  messages: ChatMessageView[];
  /** matchStore.localPlayerId — used to align own bubbles right, like ActionLogDock. */
  localPlayerId: string | null;
  nameFor: (playerId: string) => string;
  onSend: (message: string) => void;
  /** True once the room connection is gone (e.g. opponent left / left the room) — disables the input but keeps history visible. */
  disabled?: boolean;
  className?: string;
}

export function MatchChatPanel({ messages, localPlayerId, nameFor, onSend, disabled = false, className }: MatchChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  // Pin to the newest message whenever the log grows — mirrors how a real
  // chat client behaves; there is no "load older history" here since the
  // in-memory log is capped and this is table talk, not a record to page through.
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  function submit(): void {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    // Lighter wash than the surrounding navy aside (bg-white/[0.035]), and
    // font-sans (plain system sans, NOT the game's Poppins font-display/
    // font-heading used everywhere else) — chat content should read as
    // casual table talk, not another piece of game chrome. Chrome elements
    // (the Send button) stay on the game's normal button styling.
    <div className={['flex min-h-0 flex-col bg-white/[0.035] font-sans', className ?? ''].join(' ')}>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="border border-dashed border-white/15 px-3 py-6 text-center text-xs text-white/40">
            No messages yet. Say hi!
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {messages.map((entry) => (
              <ChatBubble key={entry.id} entry={entry} own={localPlayerId !== null && entry.seatId === localPlayerId} nameFor={nameFor} />
            ))}
          </ol>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-gold/25 bg-white/[0.04] p-2">
        <div className="flex items-end gap-2">
          <input
            type="text"
            value={draft}
            maxLength={CHAT_MAX_LENGTH}
            disabled={disabled}
            placeholder={disabled ? 'Not connected' : 'Message your opponent...'}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            className="h-10 min-w-0 flex-1 border border-white/25 bg-white/[0.07] px-3 text-sm font-normal text-white outline-none placeholder:text-white/40 focus:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || draft.trim().length === 0}
            onClick={submit}
            className="h-10 flex-shrink-0 border border-white/15 bg-black/28 px-3 font-heading text-[10px] font-black uppercase tracking-[0.14em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:text-white/65"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(sentAt: number): string {
  return new Date(sentAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function ChatBubble({ entry, own, nameFor }: { entry: ChatMessageView; own: boolean; nameFor: (playerId: string) => string }) {
  return (
    <li className={`flex w-full ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'min-w-0 max-w-[88%] rounded-lg p-2.5',
          own
            ? 'border border-gold/35 bg-gold/[0.16] text-right shadow-[0_8px_20px_rgba(0,0,0,0.18)]'
            : 'border border-white/20 bg-white/[0.11] text-left',
        ].join(' ')}
      >
        <p className={`mb-1 text-[10px] font-medium normal-case tracking-normal text-white/55 ${own ? 'text-right' : 'text-left'}`}>
          {nameFor(entry.seatId)} · {formatTime(entry.sentAt)}
        </p>
        <p className="min-w-0 whitespace-pre-wrap break-words text-[13px] font-normal leading-snug text-white/95">{entry.message}</p>
      </div>
    </li>
  );
}
