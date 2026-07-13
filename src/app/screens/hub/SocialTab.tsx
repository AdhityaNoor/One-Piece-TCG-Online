/**
 * Social tab content (see HubScreen) — friend list + player search, backed
 * by socialStore.ts. No back button of its own since it isn't a pushed
 * screen anymore (embedded under the universal header).
 */
import { useEffect, useState } from 'react';
import { GameCanvasScreen } from '../../components';
import { isBackendConfigured } from '../../../multiplayer/net/backendConfig';
import { useAuthStore } from '../../store/authStore';
import { useNavigationStore } from '../../store/navigationStore';
import { useSocialStore } from '../../store/socialStore';

export function SocialTab() {
  const backendConfigured = isBackendConfigured();
  const authStatus = useAuthStore((state) => state.status);
  const load = useSocialStore((state) => state.load);

  useEffect(() => {
    if (backendConfigured && authStatus === 'authenticated') void load();
  }, [backendConfigured, authStatus, load]);

  return (
    <GameCanvasScreen dense>
      {!backendConfigured ? (
        <EmptyState title="Backend Missing" body="Set VITE_API_BASE_URL to use social features." />
      ) : authStatus !== 'authenticated' ? (
        <EmptyState title="Sign In Required" body="Social features need a signed-in account, not offline mode." />
      ) : (
        <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-1 py-1 lg:grid-cols-[20rem_minmax(0,1fr)] lg:overflow-hidden">
          <PlayerSearch />
          <FriendsPanel />
        </div>
      )}
    </GameCanvasScreen>
  );
}

function PlayerSearch() {
  const [draft, setDraft] = useState('');
  const search = useSocialStore((state) => state.search);
  const clearSearch = useSocialStore((state) => state.clearSearch);
  const searchStatus = useSocialStore((state) => state.searchStatus);
  const searchResults = useSocialStore((state) => state.searchResults);
  const searchError = useSocialStore((state) => state.searchError);
  const addFriend = useSocialStore((state) => state.addFriend);
  const pendingActions = useSocialStore((state) => state.pendingActions);
  const friends = useSocialStore((state) => state.friends);
  const outgoingRequests = useSocialStore((state) => state.outgoingRequests);
  const ownUsername = useAuthStore((state) => state.user?.username);

  useEffect(() => {
    const handle = window.setTimeout(() => void search(draft), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const friendUsernames = new Set(friends.map((entry) => entry.username));
  const outgoingUsernames = new Set(outgoingRequests.map((entry) => entry.username));

  return (
    <section className="min-h-0 border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] p-4 shadow-[0_14px_0_rgba(1,5,16,0.5)]">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Find Players</p>
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search by username"
        className="mt-3 h-10 w-full border border-white/15 bg-black/30 px-3 text-sm font-bold tracking-[0.04em] text-white outline-none transition-all focus:border-gold/55"
      />

      <div className="mt-3 grid gap-2">
        {searchStatus === 'searching' && <p className="text-xs text-white/45">Searching...</p>}
        {searchStatus === 'error' && <p className="text-xs text-red-200">{searchError}</p>}
        {searchStatus === 'ready' && searchResults.length === 0 && draft.trim() && (
          <p className="text-xs text-white/45">No players found.</p>
        )}
        {searchResults
          .filter((entry) => entry.username !== ownUsername)
          .map((entry) => {
            const isFriend = friendUsernames.has(entry.username);
            const isPending = outgoingUsernames.has(entry.username) || pendingActions[entry.username];
            return (
              <div key={entry.userId} className="flex items-center justify-between gap-2 border border-white/10 bg-black/25 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-bold text-white">{entry.username}</span>
                {isFriend ? (
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Friends</span>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void addFriend(entry.username)}
                    className="shrink-0 border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gold transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isPending ? 'Sending...' : outgoingUsernames.has(entry.username) ? 'Sent' : 'Add'}
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {draft.trim() && (
        <button type="button" onClick={() => { setDraft(''); clearSearch(); }} className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/45 hover:text-gold">
          Clear search
        </button>
      )}
    </section>
  );
}

function FriendsPanel() {
  const status = useSocialStore((state) => state.status);
  const error = useSocialStore((state) => state.error);
  const friends = useSocialStore((state) => state.friends);
  const incomingRequests = useSocialStore((state) => state.incomingRequests);
  const outgoingRequests = useSocialStore((state) => state.outgoingRequests);
  const accept = useSocialStore((state) => state.accept);
  const decline = useSocialStore((state) => state.decline);
  const remove = useSocialStore((state) => state.remove);
  const pendingActions = useSocialStore((state) => state.pendingActions);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  if (status === 'loading' || status === 'idle') {
    return (
      <section className="min-h-0 overflow-y-auto border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] p-4 shadow-[0_14px_0_rgba(1,5,16,0.5)]">
        <p className="text-sm text-white/45">Loading your crew...</p>
      </section>
    );
  }

  if (status === 'error') {
    return <EmptyState title="Social Unavailable" body={error ?? 'Could not load your friends.'} />;
  }

  return (
    <section className="grid min-h-0 gap-4 overflow-y-auto border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] p-4 shadow-[0_14px_0_rgba(1,5,16,0.5)]">
      {incomingRequests.length > 0 && (
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Incoming Requests</p>
          <div className="mt-2 grid gap-2">
            {incomingRequests.map((entry) => (
              <div key={entry.userId} className="flex items-center justify-between gap-2 border border-white/10 bg-black/25 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-bold text-white">{entry.username}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={pendingActions[entry.username]}
                    onClick={() => void accept(entry.username)}
                    className="border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gold hover:border-gold disabled:opacity-45"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={pendingActions[entry.username]}
                    onClick={() => void decline(entry.username)}
                    className="border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55 hover:border-red-300/40 hover:text-red-100 disabled:opacity-45"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Sent Requests</p>
          <div className="mt-2 grid gap-2">
            {outgoingRequests.map((entry) => (
              <div key={entry.userId} className="flex items-center justify-between gap-2 border border-white/10 bg-black/20 px-3 py-2">
                <span className="min-w-0 truncate text-sm text-white/70">{entry.username}</span>
                <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-white/35">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Friends ({friends.length})</p>
        {friends.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">No friends yet — search for a player to send a request.</p>
        ) : (
          <div className="mt-2 grid gap-2">
            {friends.map((entry) => (
              <div key={entry.userId} className="flex items-center justify-between gap-2 border border-white/10 bg-black/25 px-3 py-2">
                <button
                  type="button"
                  onClick={() => navigateTo({ screen: 'profile', username: entry.username })}
                  className="min-w-0 truncate text-left text-sm font-bold text-white hover:text-gold"
                >
                  {entry.username}
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={[
                      'text-[10px] font-black uppercase tracking-[0.12em]',
                      entry.onlineStatus === 'online' ? 'text-emerald-300' : 'text-white/35',
                    ].join(' ')}
                  >
                    {entry.onlineStatus}
                  </span>
                  <button
                    type="button"
                    disabled={pendingActions[entry.username]}
                    onClick={() => void remove(entry.username)}
                    className="border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/45 hover:border-red-300/40 hover:text-red-100 disabled:opacity-45"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-200/65">{body}</p>
    </div>
  );
}
