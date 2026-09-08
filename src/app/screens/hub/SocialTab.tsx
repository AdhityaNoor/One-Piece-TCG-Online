/**
 * Social tab (see HubScreen) — find players, manage friend requests, the
 * friend list and the blocked list, backed by socialStore.ts. No back
 * button of its own since it isn't a pushed screen (it sits under the
 * universal header).
 *
 * Layout contract:
 *  - Search is a full-width bar at the top, not a column. It is the one
 *    thing a player comes here to do that has no other entry point, and it
 *    used to be squeezed into a 20rem rail beside the friend list where its
 *    result rows (avatar + name + two actions) could not fit on one line.
 *  - Everything below it is a SEGMENTED list: Friends / Requests / Blocked,
 *    one at a time with counts on the segments. Stacking all three as
 *    always-open sections meant the friend list — the thing people actually
 *    come back for — started below however many pending requests happened
 *    to exist that day.
 *  - The Discord widget is a sibling column only from `xl`, and the last
 *    block in the stack below that. It is context, not a control.
 *  - Every row is `flex-wrap` with a `min-w-0` name and a `shrink-0` action
 *    group, so a long username pushes the actions onto a second line
 *    instead of widening the row past the viewport. This is what was
 *    breaking the layout on small screens.
 *
 * Avatars go through PlayerAvatarThumb, which prefers a player's UPLOADED
 * photo (hex-framed) and falls back to their equipped catalog portrait —
 * see components/PlayerAvatar.tsx. Both fields are joined server-side in
 * server/src/profile/avatarJoin.ts.
 */
import { useEffect, useMemo, useState } from 'react';
import type { ReportPlayerRequest } from '../../../../shared/profile';
import { Button, DiscordServerWidget, GameCanvasScreen, Modal, PlayerAvatarThumb } from '../../components';
import { isBackendConfigured } from '../../../multiplayer/net/backendConfig';
import { useAuthStore } from '../../store/authStore';
import { useNavigationStore } from '../../store/navigationStore';
import { useSocialStore } from '../../store/socialStore';

type ListTab = 'friends' | 'requests' | 'blocked';

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
        <div className="flex h-full min-h-0 w-full max-w-full flex-col gap-3 overflow-y-auto overflow-x-hidden px-1 py-1 xl:overflow-hidden">
          <PlayerSearch />
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-4">
            <CrewPanel />
            {/* Below xl the widget needs an explicit height: a flex-1 child
                of an auto-height stacked column collapses to nothing. */}
            <DiscordServerWidget className="h-[20rem] w-full min-w-0 shrink-0 xl:h-full xl:min-h-0 xl:shrink" />
          </div>
        </div>
      )}
    </GameCanvasScreen>
  );
}

/** Shared shell so search, the crew panel and their loading states are visually one family. */
function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={[
        'min-w-0 rounded-sm border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] shadow-[0_14px_0_rgba(1,5,16,0.5)]',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-3.5 w-1 shrink-0 bg-gold" aria-hidden="true" />
      <p className="min-w-0 truncate text-[11px] font-black uppercase tracking-[0.2em] text-gold">{children}</p>
    </div>
  );
}

/**
 * One row shape for every list on this screen. The wrapping rule described
 * in the module doc lives here rather than at five call sites: `flex-wrap`
 * plus a `min-w-0 flex-1` identity block and a `shrink-0` action block is
 * what keeps a 20-character username from forcing a horizontal scrollbar.
 */
function PlayerRow({
  onOpenProfile,
  avatar,
  name,
  meta,
  muted,
  actions,
}: {
  onOpenProfile?: () => void;
  avatar: React.ReactNode;
  name: string;
  meta?: React.ReactNode;
  muted?: boolean;
  actions: React.ReactNode;
}) {
  const identity = (
    <>
      {avatar}
      <span className="min-w-0 flex-1">
        <span className={['block truncate text-sm font-bold', muted ? 'text-white/55' : 'text-white'].join(' ')}>{name}</span>
        {meta && <span className="mt-0.5 block truncate text-[10px] font-black uppercase tracking-[0.12em]">{meta}</span>}
      </span>
    </>
  );

  return (
    <div className="flex min-h-[3.25rem] w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors hover:border-white/20">
      {onOpenProfile ? (
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex min-w-[9rem] flex-1 items-center gap-2.5 text-left transition-colors hover:text-gold"
        >
          {identity}
        </button>
      ) : (
        <div className="flex min-w-[9rem] flex-1 items-center gap-2.5">{identity}</div>
      )}
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}

function RowAction({
  label,
  onClick,
  disabled,
  tone = 'neutral',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'neutral' | 'danger';
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-gold/40 bg-gold/10 text-gold hover:border-gold'
      : tone === 'danger'
        ? 'border-white/15 bg-white/[0.04] text-white/50 hover:border-red-300/45 hover:text-red-100'
        : 'border-white/15 bg-white/[0.04] text-white/55 hover:border-white/35 hover:text-white';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'min-h-8 whitespace-nowrap border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-45',
        toneClass,
      ].join(' ')}
    >
      {label}
    </button>
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
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  useEffect(() => {
    const handle = window.setTimeout(() => void search(draft), 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const friendUsernames = useMemo(() => new Set(friends.map((entry) => entry.username)), [friends]);
  const outgoingUsernames = useMemo(() => new Set(outgoingRequests.map((entry) => entry.username)), [outgoingRequests]);
  const visibleResults = searchResults.filter((entry) => entry.username !== ownUsername);
  const searching = draft.trim().length > 0;

  return (
    <Panel className="shrink-0 p-3 sm:p-4">
      <SectionLabel>Find Players</SectionLabel>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search by username"
          className="h-11 min-w-[12rem] flex-1 border border-white/15 bg-black/30 px-3 text-sm font-bold tracking-[0.04em] text-white outline-none transition-colors placeholder:text-white/30 focus:border-gold/55"
        />
        {searching && (
          <RowAction
            label="Clear"
            onClick={() => {
              setDraft('');
              clearSearch();
            }}
          />
        )}
      </div>

      {searching && (
        <div className="mt-3 space-y-2">
          {searchStatus === 'searching' && <p className="text-xs text-white/45">Searching...</p>}
          {searchStatus === 'error' && <p className="text-xs text-red-200">{searchError}</p>}
          {searchStatus === 'ready' && visibleResults.length === 0 && <p className="text-xs text-white/45">No players found.</p>}
          {visibleResults.map((entry) => {
            const isFriend = friendUsernames.has(entry.username);
            const sent = outgoingUsernames.has(entry.username);
            const isPending = pendingActions[entry.username];
            return (
              <PlayerRow
                key={entry.userId}
                onOpenProfile={() => navigateTo({ screen: 'profile', username: entry.username })}
                avatar={
                  <PlayerAvatarThumb
                    avatarImageUrl={entry.avatarImageUrl}
                    avatarCatalogId={entry.avatarCatalogId}
                    avatarFrameId={entry.avatarFrameId}
                  />
                }
                name={entry.username}
                actions={
                  <>
                    {isFriend ? (
                      <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300/70">Friends</span>
                    ) : (
                      <RowAction
                        label={isPending ? 'Sending...' : sent ? 'Sent' : 'Add'}
                        tone="primary"
                        disabled={isPending || sent}
                        onClick={() => void addFriend(entry.username)}
                      />
                    )}
                    <RowMenu
                      username={entry.username}
                      disabled={isPending}
                      onBlock={() => void blockUser(entry.username)}
                      onReport={() => setReportTarget(entry.username)}
                    />
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <ReportPlayerModal open={reportTarget !== null} onClose={() => setReportTarget(null)} username={reportTarget ?? ''} />
    </Panel>
  );
}

/** Friends / Requests / Blocked, one at a time. */
function CrewPanel() {
  const status = useSocialStore((state) => state.status);
  const error = useSocialStore((state) => state.error);
  const friends = useSocialStore((state) => state.friends);
  const incomingRequests = useSocialStore((state) => state.incomingRequests);
  const outgoingRequests = useSocialStore((state) => state.outgoingRequests);
  const blocked = useSocialStore((state) => state.blocked);
  const [tab, setTab] = useState<ListTab>('friends');
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  const requestCount = incomingRequests.length + outgoingRequests.length;

  if (status === 'loading' || status === 'idle') {
    return (
      <Panel className="p-4">
        <p className="text-sm text-white/45">Loading your crew...</p>
      </Panel>
    );
  }

  if (status === 'error') {
    return (
      <Panel className="p-4">
        <EmptyState title="Social Unavailable" body={error ?? 'Could not load your friends.'} />
      </Panel>
    );
  }

  return (
    <Panel className="flex min-h-0 flex-col xl:overflow-hidden">
      <div className="flex shrink-0 gap-1 border-b border-white/10 p-2">
        <SegmentButton active={tab === 'friends'} label="Friends" count={friends.length} onClick={() => setTab('friends')} />
        <SegmentButton
          active={tab === 'requests'}
          label="Requests"
          count={requestCount}
          highlight={incomingRequests.length > 0}
          onClick={() => setTab('requests')}
        />
        <SegmentButton active={tab === 'blocked'} label="Blocked" count={blocked.length} onClick={() => setTab('blocked')} />
      </div>

      <div className="min-h-0 flex-1 p-3 sm:p-4 xl:overflow-y-auto">
        {tab === 'friends' && <FriendsList onReport={setReportTarget} />}
        {tab === 'requests' && <RequestsList />}
        {tab === 'blocked' && <BlockedList />}
      </div>

      <ReportPlayerModal open={reportTarget !== null} onClose={() => setReportTarget(null)} username={reportTarget ?? ''} />
    </Panel>
  );
}

function SegmentButton({
  active,
  label,
  count,
  highlight,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex min-h-9 flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition sm:text-[11px] sm:tracking-[0.16em]',
        active ? 'bg-gold/15 text-gold' : 'text-white/45 hover:bg-white/[0.05] hover:text-white',
      ].join(' ')}
    >
      <span className="truncate">{label}</span>
      <span
        className={[
          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] leading-none',
          // An unanswered incoming request is the only thing on this screen
          // that needs the player to act, so it is the only count that is
          // ever coloured.
          highlight && !active ? 'bg-brand text-white' : active ? 'bg-gold/25 text-gold' : 'bg-white/10 text-white/50',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

function FriendsList({ onReport }: { onReport: (username: string) => void }) {
  const friends = useSocialStore((state) => state.friends);
  const remove = useSocialStore((state) => state.remove);
  const blockUser = useSocialStore((state) => state.blockUser);
  const pendingActions = useSocialStore((state) => state.pendingActions);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  if (friends.length === 0) {
    return <EmptyState title="No Crew Yet" body="Search for a player above to send your first friend request." />;
  }

  // Online first, then alphabetical — a friend list exists to answer "who
  // can I play right now", and that ordering answers it without a filter.
  const ordered = [...friends].sort((a, b) => {
    const onlineDelta = Number(b.onlineStatus === 'online') - Number(a.onlineStatus === 'online');
    return onlineDelta !== 0 ? onlineDelta : a.username.localeCompare(b.username);
  });

  return (
    <div className="space-y-2">
      {ordered.map((entry) => {
        const online = entry.onlineStatus === 'online';
        return (
          <PlayerRow
            key={entry.userId}
            onOpenProfile={() => navigateTo({ screen: 'profile', username: entry.username })}
            avatar={
              <span className="relative shrink-0">
                <PlayerAvatarThumb
                  avatarImageUrl={entry.avatarImageUrl}
                  avatarCatalogId={entry.avatarCatalogId}
                  avatarFrameId={entry.avatarFrameId}
                />
                <span
                  className={[
                    'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#050d1e]',
                    online ? 'bg-emerald-400' : 'bg-white/25',
                  ].join(' ')}
                  aria-hidden="true"
                />
              </span>
            }
            name={entry.username}
            meta={<span className={online ? 'text-emerald-300' : 'text-white/30'}>{entry.onlineStatus}</span>}
            actions={
              <>
                <RowAction
                  label="Remove"
                  tone="danger"
                  disabled={pendingActions[entry.username]}
                  onClick={() => void remove(entry.username)}
                />
                <RowMenu
                  username={entry.username}
                  disabled={pendingActions[entry.username]}
                  onBlock={() => void blockUser(entry.username)}
                  onReport={() => onReport(entry.username)}
                />
              </>
            }
          />
        );
      })}
    </div>
  );
}

function RequestsList() {
  const incomingRequests = useSocialStore((state) => state.incomingRequests);
  const outgoingRequests = useSocialStore((state) => state.outgoingRequests);
  const accept = useSocialStore((state) => state.accept);
  const decline = useSocialStore((state) => state.decline);
  const pendingActions = useSocialStore((state) => state.pendingActions);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  if (incomingRequests.length === 0 && outgoingRequests.length === 0) {
    return <EmptyState title="Nothing Pending" body="Friend requests you send or receive show up here." />;
  }

  return (
    <div className="space-y-5">
      {incomingRequests.length > 0 && (
        <div>
          <SectionLabel>Incoming ({incomingRequests.length})</SectionLabel>
          <div className="mt-2 space-y-2">
            {incomingRequests.map((entry) => (
              <PlayerRow
                key={entry.userId}
                onOpenProfile={() => navigateTo({ screen: 'profile', username: entry.username })}
                avatar={
                  <PlayerAvatarThumb
                    avatarImageUrl={entry.avatarImageUrl}
                    avatarCatalogId={entry.avatarCatalogId}
                    avatarFrameId={entry.avatarFrameId}
                  />
                }
                name={entry.username}
                actions={
                  <>
                    <RowAction label="Accept" tone="primary" disabled={pendingActions[entry.username]} onClick={() => void accept(entry.username)} />
                    <RowAction label="Decline" tone="danger" disabled={pendingActions[entry.username]} onClick={() => void decline(entry.username)} />
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div>
          <SectionLabel>Sent ({outgoingRequests.length})</SectionLabel>
          <div className="mt-2 space-y-2">
            {outgoingRequests.map((entry) => (
              <PlayerRow
                key={entry.userId}
                avatar={
                  <PlayerAvatarThumb
                    avatarImageUrl={entry.avatarImageUrl}
                    avatarCatalogId={entry.avatarCatalogId}
                    avatarFrameId={entry.avatarFrameId}
                  />
                }
                name={entry.username}
                muted
                actions={<span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-white/35">Pending</span>}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BlockedList() {
  const blocked = useSocialStore((state) => state.blocked);
  const unblockUser = useSocialStore((state) => state.unblockUser);
  const pendingActions = useSocialStore((state) => state.pendingActions);

  if (blocked.length === 0) {
    return <EmptyState title="Nobody Blocked" body="Players you block stop appearing in search, requests and matchmaking chat." />;
  }

  return (
    <div className="space-y-2">
      {blocked.map((entry) => (
        <PlayerRow
          key={entry.userId}
          // No avatar join exists for blocked players (the server returns
          // username only), and fetching one just to draw a face you asked
          // not to see would be the wrong trade.
          avatar={<span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-black text-white/35">{entry.username.slice(0, 1).toUpperCase()}</span>}
          name={entry.username}
          muted
          actions={<RowAction label="Unblock" disabled={pendingActions[entry.username]} onClick={() => void unblockUser(entry.username)} />}
        />
      ))}
    </div>
  );
}

/** Compact ... menu for the less-common Block/Report actions, kept off the main row so Accept/Remove stay the primary affordances. */
function RowMenu({ username, disabled, onBlock, onReport }: { username: string; disabled?: boolean; onBlock: () => void; onReport: () => void }) {
  const [open, setOpen] = useState(false);

  // Any click outside closes it. Without this the menu stayed open behind
  // the next row you interacted with, since nothing else ever cleared it.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="relative" onPointerDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-label={`More actions for ${username}`}
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center border border-white/15 bg-white/[0.04] text-white/50 transition hover:border-white/35 hover:text-white disabled:opacity-45"
      >
        <span className="text-xs leading-none">...</span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-[8rem] border border-white/15 bg-[#050d1e] py-1 shadow-[0_10px_24px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReport();
            }}
            className="block w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.1em] text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            Report
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onBlock();
            }}
            className="block w-full px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.1em] text-red-200/70 hover:bg-red-500/10 hover:text-red-100"
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {reasons.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value)}
                  className={[
                    'border px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.1em] transition',
                    reason === option.value
                      ? 'border-gold bg-gold/15 text-white'
                      : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-gold/45 hover:text-gold',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="mt-3 min-h-24 w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-gold/55"
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
    <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-sm font-black uppercase tracking-[0.18em] text-gold">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-200/55">{body}</p>
    </div>
  );
}
