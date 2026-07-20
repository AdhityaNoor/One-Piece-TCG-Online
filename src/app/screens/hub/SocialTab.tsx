/**
 * Social tab content (see HubScreen) — friend list, player search, blocked
 * list, and per-player report, backed by socialStore.ts. No back button of
 * its own since it isn't a pushed screen anymore (embedded under the
 * universal header).
 *
 * Avatar thumbnails resolve equippedCosmetics.avatar (a server catalog id
 * like 'avatar_luffy', joined server-side in profileService/routes.ts) back
 * to the Settings picker's local asset via avatarCatalogIdToOptionId — same
 * bridge ProfileScreen.tsx uses, so a friend's photo here matches what they
 * picked in Settings/Profile.
 */
import { useEffect, useState } from 'react';
import type { ReportPlayerRequest } from '../../../../shared/profile';
import { Button, GameCanvasScreen, Modal } from '../../components';
import { avatarCatalogIdToOptionId, resolveAvatarUrl } from '../../lib/avatars';
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
        <div className="h-full min-h-0 space-y-4 overflow-y-auto px-1 py-1 lg:grid lg:gap-4 lg:space-y-0 lg:grid-cols-[20rem_minmax(0,1fr)] lg:overflow-hidden">
          <PlayerSearch />
          <FriendsPanel />
        </div>
      )}
    </GameCanvasScreen>
  );
}

function AvatarThumb({ avatarCatalogId, size = 32 }: { avatarCatalogId: string | null | undefined; size?: number }) {
  return (
    <img
      src={resolveAvatarUrl(avatarCatalogIdToOptionId(avatarCatalogId))}
      alt=""
      className="shrink-0 rounded-full border border-white/15 bg-black/30 object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function PlayerSearch() {
  const [draft, setDraft] = useState('');
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const search = useSocialStore((state) => state.search);
  const clearSearch = useSocialStore((state) => state.clearSearch);
  const searchStatus = useSocialStore((state) => state.searchStatus);
  const searchResults = useSocialStore((state) => state.searchResults);
  const searchError = useSocialStore((state) => state.searchError);
  const addFriend = useSocialStore((state) => state.addFriend);
  const blockUser = useSocialStore((state) => state.blockUser);
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
                <div className="flex min-w-0 items-center gap-2">
                  <AvatarThumb avatarCatalogId={entry.avatarCatalogId} />
                  <span className="min-w-0 truncate text-sm font-bold text-white">{entry.username}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isFriend ? (
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Friends</span>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void addFriend(entry.username)}
                      className="border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-gold transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isPending ? 'Sending...' : outgoingUsernames.has(entry.username) ? 'Sent' : 'Add'}
                    </button>
                  )}
                  <RowMenu
                    username={entry.username}
                    disabled={pendingActions[entry.username]}
                    onBlock={() => void blockUser(entry.username)}
                    onReport={() => setReportTarget(entry.username)}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {draft.trim() && (
        <button type="button" onClick={() => { setDraft(''); clearSearch(); }} className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/45 hover:text-gold">
          Clear search
        </button>
      )}

      <ReportPlayerModal open={reportTarget !== null} onClose={() => setReportTarget(null)} username={reportTarget ?? ''} />
    </section>
  );
}

function FriendsPanel() {
  const status = useSocialStore((state) => state.status);
  const error = useSocialStore((state) => state.error);
  const friends = useSocialStore((state) => state.friends);
  const incomingRequests = useSocialStore((state) => state.incomingRequests);
  const outgoingRequests = useSocialStore((state) => state.outgoingRequests);
  const blocked = useSocialStore((state) => state.blocked);
  const accept = useSocialStore((state) => state.accept);
  const decline = useSocialStore((state) => state.decline);
  const remove = useSocialStore((state) => state.remove);
  const blockUser = useSocialStore((state) => state.blockUser);
  const unblockUser = useSocialStore((state) => state.unblockUser);
  const pendingActions = useSocialStore((state) => state.pendingActions);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const [reportTarget, setReportTarget] = useState<string | null>(null);

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
                <div className="flex min-w-0 items-center gap-2">
                  <AvatarThumb avatarCatalogId={entry.avatarCatalogId} />
                  <span className="min-w-0 truncate text-sm font-bold text-white">{entry.username}</span>
                </div>
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
                <div className="flex min-w-0 items-center gap-2">
                  <AvatarThumb avatarCatalogId={entry.avatarCatalogId} />
                  <span className="min-w-0 truncate text-sm text-white/70">{entry.username}</span>
                </div>
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
                  className="flex min-w-0 items-center gap-2 text-left hover:text-gold"
                >
                  <AvatarThumb avatarCatalogId={entry.avatarCatalogId} />
                  <span className="min-w-0 truncate text-sm font-bold text-white">{entry.username}</span>
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
                  <RowMenu
                    username={entry.username}
                    disabled={pendingActions[entry.username]}
                    onBlock={() => void blockUser(entry.username)}
                    onReport={() => setReportTarget(entry.username)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {blocked.length > 0 && (
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Blocked Players ({blocked.length})</p>
          <div className="mt-2 grid gap-2">
            {blocked.map((entry) => (
              <div key={entry.userId} className="flex items-center justify-between gap-2 border border-white/10 bg-black/20 px-3 py-2">
                <span className="min-w-0 truncate text-sm text-white/60">{entry.username}</span>
                <button
                  type="button"
                  disabled={pendingActions[entry.username]}
                  onClick={() => void unblockUser(entry.username)}
                  className="shrink-0 border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55 hover:border-gold/45 hover:text-gold disabled:opacity-45"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReportPlayerModal open={reportTarget !== null} onClose={() => setReportTarget(null)} username={reportTarget ?? ''} />
    </section>
  );
}

/** Compact ⋯ menu shared by search/friend rows for the less-common Block/Report actions, kept off the main row so Accept/Remove stay the primary affordances. */
function RowMenu({ username, disabled, onBlock, onReport }: { username: string; disabled?: boolean; onBlock: () => void; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-label={`More actions for ${username}`}
        className="grid h-6 w-6 place-items-center border border-white/15 bg-white/[0.04] text-white/50 hover:border-white/30 hover:text-white disabled:opacity-45"
      >
        <span className="text-xs leading-none">⋯</span>
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-10 min-w-[8rem] border border-white/15 bg-[#050d1e] py-1 shadow-[0_10px_24px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={() => { setOpen(false); onReport(); }}
            className="block w-full px-3 py-1.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            Report
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onBlock(); }}
            className="block w-full px-3 py-1.5 text-left text-[10px] font-black uppercase tracking-[0.1em] text-red-200/70 hover:bg-red-500/10 hover:text-red-100"
          >
            Block
          </button>
        </div>
      )}
    </div>
  );
}

function ReportPlayerModal({ open, onClose, username }: { open: boolean; onClose: () => void; username: string }) {
  const reportUser = useSocialStore((state) => state.reportUser);
  const [reason, setReason] = useState<ReportPlayerRequest['reason']>('harassment');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const reasons: { value: ReportPlayerRequest['reason']; label: string }[] = [
    { value: 'harassment', label: 'Harassment' },
    { value: 'cheating', label: 'Cheating' },
    { value: 'inappropriate_name', label: 'Inappropriate Name' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'other', label: 'Other' },
  ];

  function handleClose(): void {
    setSubmitted(false);
    setDetails('');
    setReason('harassment');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Report @${username}`} maxWidthClassName="max-w-md">
      <div className="p-4">
        {submitted ? (
          <p className="text-sm leading-6 text-emerald-200">Report submitted. Thanks for helping keep the crew honest.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value)}
                  className={[
                    'border px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.1em] transition',
                    reason === option.value ? 'border-gold bg-gold/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-gold/45 hover:text-gold',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="mt-3 min-h-24 w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white"
              placeholder="Additional details (optional)"
            />
            <div className="mt-3 flex justify-end">
              <Button
                onClick={async () => {
                  await reportUser(username, { reason, details });
                  setSubmitted(true);
                }}
              >
                Submit Report
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
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
