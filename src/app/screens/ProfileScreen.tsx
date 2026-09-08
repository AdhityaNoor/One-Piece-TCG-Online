/**
 * Player profile screen.
 *
 * Layout contract, in the order it is applied:
 *  - The identity hero spans the FULL width at every breakpoint. It owns a
 *    banner, and a banner squeezed into a 24rem sidebar (which is where it
 *    used to live) is a letterbox strip, not a banner.
 *  - Below `lg` everything is one column: hero, a horizontally scrollable
 *    section rail, then the section body. No grid, no sidebar, nothing that
 *    can produce a horizontal scrollbar on a 320px phone.
 *  - From `lg` up the section rail becomes a vertical list beside the body.
 *    Ten uppercase tab labels never fit on one line at any width worth
 *    designing for, so the desktop layout gives them a column instead of
 *    hiding them behind a scroll gesture nobody discovers.
 *
 * `min-w-0` on every grid/flex child is load-bearing throughout — see
 * Metric's comment for the specific failure it prevents.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CosmeticType, ProfileSectionId, ProfileVisibility, ReportPlayerRequest, UpdateProfileRequest } from '../../../shared/profile';
import type { ProfileImageKind } from '../../../shared/profileImage';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { Button, CanvasMenuButton, GameCanvasScreen, Modal, OpSelect, PlayerAvatar, ProfileImageChooser, RankBadge } from '../components';
import { avatarOptionIdToCatalogId } from '../lib/avatars';
import { resolveProfileAvatar, resolveProfileBanner } from '../lib/profileImages';
import { useNavigationStore, useCurrentScreen } from '../store/navigationStore';
import { useProfileStore } from '../store/profileStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

const SECTION_LABELS: Record<ProfileSectionId, string> = {
  overview: 'Overview',
  ranked: 'Grand Line Record',
  match_history: 'Voyage Log',
  deck_showcase: 'Fleet',
  statistics: 'Battle Records',
  achievements: 'Milestones',
  cosmetics: 'Identity',
  social: 'Social',
  settings: 'Settings',
  account: 'Account',
};

const DEFAULT_SECTIONS: ProfileSectionId[] = [
  'overview',
  'ranked',
  'match_history',
  'deck_showcase',
  'statistics',
  'achievements',
  'cosmetics',
  'social',
  'settings',
  'account',
];

export function ProfileScreen() {
  const current = useCurrentScreen();
  const goBack = useNavigationStore((state) => state.goBack);
  const entries = useSavedDecksStore((state) => state.entries);
  const profile = useProfileStore();
  const [section, setSection] = useState<ProfileSectionId>('overview');
  const backendConfigured = isBackendConfigured();
  const username = current.screen === 'profile' ? current.username : undefined;

  useEffect(() => {
    if (!backendConfigured) return;
    if (username) void profile.loadPublic(username);
    else void profile.loadOwn(entries.length);
    return () => profile.clear();
  }, [backendConfigured, username, entries.length]);

  const visibleSections = profile.header?.visibleSections ?? DEFAULT_SECTIONS;
  useEffect(() => {
    if (!visibleSections.includes(section)) setSection(visibleSections[0] ?? 'overview');
  }, [section, visibleSections]);

  return (
    <GameCanvasScreen onBack={goBack} dense>
      <div className="flex h-full min-h-0 w-full max-w-full flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-2 sm:gap-4 sm:px-3 lg:overflow-hidden">
        <ProfileHero />

        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-4">
          <ProfileNavigation sections={visibleSections} current={section} onChange={setSection} />

          <section className="min-h-[22rem] w-full min-w-0 max-w-full overflow-x-hidden rounded-sm border border-white/10 bg-[linear-gradient(180deg,_rgba(4,10,26,0.72),_rgba(1,4,14,0.86))] shadow-[0_14px_0_rgba(1,5,16,0.5)] lg:min-h-0 lg:overflow-y-auto">
            <div className="p-4 sm:p-5">
              {!backendConfigured ? (
                <EmptyState title="Backend Missing" body="Set VITE_API_BASE_URL to use player profiles." />
              ) : profile.status === 'loading' ? (
                <EmptyState title="Loading Profile" body="Fetching profile sections." />
              ) : profile.status === 'error' ? (
                <EmptyState title="Profile Unavailable" body={profile.error ?? 'Could not load this profile.'} />
              ) : (
                <ProfileSection section={section} />
              )}
            </div>
          </section>
        </div>
      </div>
    </GameCanvasScreen>
  );
}

/**
 * Identity hero: banner, photo, name, rank and owner actions.
 *
 * Structurally a banner with ONE overlapping row beneath it, rather than the
 * previous centred stack. The overlap is a fixed pixel pull (`-mt-`) on the
 * row, not on the photo alone, so the photo, the name block and the rank
 * card share a single baseline and can flow left-to-right on a wide screen
 * and stack centred on a narrow one — the old version could only ever
 * centre-stack, which is why it looked like a placeholder at desktop width.
 *
 * The photo and banner are BUTTONS only for the owner; for a visitor they
 * render as plain elements with no hover affordance, so nothing suggests an
 * interaction that would 403.
 */
function ProfileHero() {
  const header = useProfileStore((state) => state.header);
  const equip = useProfileStore((state) => state.equip);
  const blockUser = useProfileStore((state) => state.blockUser);
  const unblockUser = useProfileStore((state) => state.unblockUser);
  const uploadsEnabled = useProfileStore((state) => state.imageUploadsEnabled);
  const uploadPending = useProfileStore((state) => state.imageUploadPending);
  const imageError = useProfileStore((state) => state.imageError);
  const setImageError = useProfileStore((state) => state.setImageError);
  const uploadImage = useProfileStore((state) => state.uploadImage);
  const removeImage = useProfileStore((state) => state.removeImage);
  const [chooser, setChooser] = useState<ProfileImageKind | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  if (!header) {
    return (
      <div className="rounded-sm border border-white/10 bg-black/40 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">No profile loaded</p>
      </div>
    );
  }

  const { profile, ranked, isOwner } = header;
  const avatar = resolveProfileAvatar(profile);
  const banner = resolveProfileBanner(profile);
  const canUpload = isOwner && uploadsEnabled === true;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-sm border border-gold/25 bg-black/45 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
      {/* Banner. Height steps up with the viewport instead of sitting at a
          fixed 7rem: a 4:1 image at 7rem tall on a 1440px screen reads as a
          rule, not a banner. */}
      <div className="relative h-24 w-full sm:h-32 lg:h-40">
        <div className="absolute inset-0" style={{ background: banner.background }} aria-hidden="true" />
        {/* Scrim, so white name text stays legible over an arbitrary uploaded photo. */}
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.05)_0%,_rgba(0,0,0,0.35)_65%,_rgba(2,6,18,0.9)_100%)]"
          aria-hidden="true"
        />
        {isOwner && (
          <button
            type="button"
            onClick={() => setChooser('banner')}
            className="group absolute inset-0 flex items-start justify-end p-2 sm:p-3"
            aria-label="Change banner"
          >
            <span className="border border-white/25 bg-black/55 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm transition group-hover:border-gold group-hover:text-gold sm:text-[10px]">
              Edit Banner
            </span>
          </button>
        )}
      </div>

      <div className="-mt-10 flex flex-col items-center gap-4 px-4 pb-4 text-center sm:-mt-12 sm:px-5 sm:pb-5 lg:flex-row lg:items-end lg:gap-5 lg:text-left">
        <div className="relative shrink-0">
          {isOwner ? (
            <button
              type="button"
              onClick={() => setChooser('avatar')}
              aria-label="Change profile photo"
              className="group relative block"
            >
              <HeroAvatar avatar={avatar} />
              <span className="pointer-events-none absolute inset-x-0 -bottom-1 flex justify-center">
                <span className="border border-white/20 bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/70 transition group-hover:border-gold group-hover:text-gold">
                  Edit
                </span>
              </span>
            </button>
          ) : (
            <HeroAvatar avatar={avatar} />
          )}
        </div>

        <div className="min-w-0 flex-1 lg:pb-1">
          <h2 className="truncate font-display text-xl font-black uppercase tracking-[0.08em] text-white sm:text-2xl lg:text-3xl">
            {profile.displayName}
          </h2>
          <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">@{profile.username}</p>
          {profile.statusMessage && (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-200/70">{profile.statusMessage}</p>
          )}
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
            Sailing Since {formatDate(profile.createdAt)}
          </p>
        </div>

        {/* Rank card. `lg:w-72` rather than a flex ratio: it holds three
            fixed-length lines, so letting it grow with the name column just
            spreads them apart. */}
        <div className="flex w-full min-w-0 items-center gap-3 rounded-sm border border-white/10 bg-black/35 p-3 text-left lg:w-72 lg:shrink-0">
          <RankBadge rank={ranked?.rank} division={ranked?.division} inPlacement={ranked?.inPlacement ?? !ranked} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-gold/70">Current Rank</p>
            <p className="mt-1 truncate text-sm font-black uppercase tracking-[0.1em] text-white">{ranked?.rankName ?? 'Unranked'}</p>
            <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
              {ranked
                ? ranked.inPlacement
                  ? 'Placement in progress'
                  : ranked.division
                    ? `Division ${ranked.division} - ${ranked.rankedPoints} BP`
                    : `${ranked.rankedPoints} BP`
                : 'No ranked record'}
            </p>
          </div>
        </div>

        {!isOwner && (
          <div className="flex shrink-0 flex-wrap justify-center gap-2 lg:flex-col lg:pb-1">
            {header.relationship === 'blocked_by_viewer' ? (
              <CanvasMenuButton label="Unblock" size="sm" onClick={() => void unblockUser(profile.username)} />
            ) : (
              <CanvasMenuButton label="Block" size="sm" prominence="danger" onClick={() => void blockUser(profile.username)} />
            )}
            <CanvasMenuButton label="Report" size="sm" onClick={() => setReportOpen(true)} />
          </div>
        )}
      </div>

      {isOwner && imageError && !chooser && (
        <p className="border-t border-red-300/20 bg-red-500/10 px-4 py-2 text-xs text-red-100 sm:px-5">{imageError}</p>
      )}

      {isOwner && (
        <>
          <ProfileImageChooser
            open={chooser === 'avatar'}
            onClose={() => setChooser(null)}
            kind="avatar"
            presetValue={avatar.optionId}
            onPresetChange={(optionId) => {
              void equip(avatarOptionIdToCatalogId(optionId), 'avatar');
              setChooser(null);
            }}
            current={profile.customImages?.avatar ?? null}
            frameId={profile.equippedCosmetics.frame}
            uploadsEnabled={canUpload}
            busy={uploadPending === 'avatar'}
            error={imageError}
            onErrorChange={setImageError}
            onUpload={(blob) => uploadImage('avatar', blob)}
            onRemove={() => removeImage('avatar')}
          />
          <ProfileImageChooser
            open={chooser === 'banner'}
            onClose={() => setChooser(null)}
            kind="banner"
            presetValue={profile.equippedCosmetics.banner}
            onPresetChange={(bannerId) => {
              void equip(bannerId, 'banner');
              setChooser(null);
            }}
            current={profile.customImages?.banner ?? null}
            uploadsEnabled={canUpload}
            busy={uploadPending === 'banner'}
            error={imageError}
            onErrorChange={setImageError}
            onUpload={(blob) => uploadImage('banner', blob)}
            onRemove={() => removeImage('banner')}
          />
        </>
      )}
      {!isOwner && <ReportPlayerModal open={reportOpen} onClose={() => setReportOpen(false)} username={profile.username} />}
    </div>
  );
}

/**
 * The hero photo at its three breakpoint sizes. Split out only because the
 * owner and visitor branches above would otherwise repeat it, and a size
 * that drifted between the two would misalign the overlap.
 */
function HeroAvatar({ avatar }: { avatar: ReturnType<typeof resolveProfileAvatar> }) {
  return (
    <>
      <span className="sm:hidden">
        <PlayerAvatar imageUrl={avatar.imageUrl} catalogAvatarId={avatar.optionId} frameId={avatar.frameId} size={88} />
      </span>
      <span className="hidden sm:inline lg:hidden">
        <PlayerAvatar imageUrl={avatar.imageUrl} catalogAvatarId={avatar.optionId} frameId={avatar.frameId} size={104} />
      </span>
      <span className="hidden lg:inline">
        <PlayerAvatar imageUrl={avatar.imageUrl} catalogAvatarId={avatar.optionId} frameId={avatar.frameId} size={124} />
      </span>
    </>
  );
}

function ReportPlayerModal({ open, onClose, username }: { open: boolean; onClose: () => void; username: string }) {
  const reportUser = useProfileStore((state) => state.reportUser);
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

/**
 * Section switcher. One component, two presentations:
 *  - below `lg` a horizontally scrollable rail, with the scrollbar hidden
 *    and a right-edge fade so it is visibly scrollable rather than looking
 *    like a list that has been cut off;
 *  - from `lg` a vertical list in its own column, where all ten labels are
 *    readable at once.
 *
 * Both are the same buttons in the same order — only the container's flex
 * direction and the active marker change — so keyboard order and screen
 * reader output do not depend on the viewport.
 */
function ProfileNavigation({
  sections,
  current,
  onChange,
}: {
  sections: ProfileSectionId[];
  current: ProfileSectionId;
  onChange: (section: ProfileSectionId) => void;
}) {
  return (
    <div className="relative w-full min-w-0 max-w-full lg:h-full lg:min-h-0">
      <nav
        className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-sm border border-white/10 bg-black/35 p-1 [scrollbar-width:none] lg:h-full lg:flex-col lg:gap-0.5 lg:overflow-x-hidden lg:overflow-y-auto lg:p-2 [&::-webkit-scrollbar]:hidden"
        aria-label="Profile sections"
        role="tablist"
      >
        {sections.map((id) => {
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={[
                'relative shrink-0 whitespace-nowrap px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.14em] transition sm:text-[11px] lg:w-full lg:shrink lg:px-3',
                active
                  ? 'bg-gold/15 text-gold shadow-[inset_2px_0_0_#d9a441] lg:shadow-[inset_3px_0_0_#d9a441]'
                  : 'text-white/45 hover:bg-white/[0.05] hover:text-white',
              ].join(' ')}
            >
              {SECTION_LABELS[id]}
            </button>
          );
        })}
      </nav>
      {/* Scroll hint, mobile only — the rail is inside a rounded border, so
          the fade is inset by 1px to sit on top of the content and not the
          border itself. */}
      <div
        className="pointer-events-none absolute inset-y-px right-px w-10 bg-[linear-gradient(90deg,_rgba(0,0,0,0)_0%,_rgba(2,6,18,0.85)_100%)] lg:hidden"
        aria-hidden="true"
      />
    </div>
  );
}

function ProfileSection({ section }: { section: ProfileSectionId }) {
  switch (section) {
    case 'overview':
      return <OverviewSection />;
    case 'ranked':
      return <RankedSection />;
    case 'match_history':
      return <MatchHistorySection />;
    case 'deck_showcase':
      return <DeckShowcaseSection />;
    case 'statistics':
      return <StatisticsSection />;
    case 'achievements':
      return <AchievementsSection />;
    case 'cosmetics':
      return <CosmeticsSection />;
    case 'social':
      return <SocialSection />;
    case 'settings':
      return <SettingsSection />;
    case 'account':
      return <AccountSection />;
  }
}

function OverviewSection() {
  const header = useProfileStore((state) => state.header);
  const statistics = useProfileStore((state) => state.statistics);
  const history = useProfileStore((state) => state.history);
  const achievements = useProfileStore((state) => state.achievements);
  if (!header) return <EmptyState title="No Profile" body="Profile data is unavailable." />;

  return (
    <Panel title="Overview" subtitle="A compact snapshot of this player's current voyage.">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Rank" value={header.ranked?.rankName ?? 'Unranked'} />
        <Metric label="Lifetime Matches" value={String(statistics?.lifetime.combined.matches ?? 0)} />
        <Metric label="Win Rate" value={`${statistics?.lifetime.combined.winRate ?? 0}%`} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MiniList title="Recent Matches" empty="No visible matches yet.">
          {(history?.entries ?? []).slice(0, 4).map((match) => (
            <ListRow key={match.matchId} left={match.result.toUpperCase()} right={match.opponentName ? `vs ${match.opponentName}` : match.matchType} />
          ))}
        </MiniList>
        <MiniList title="Featured Milestones" empty="No featured milestones yet.">
          {achievements.filter((entry) => entry.featured).slice(0, 4).map((entry) => (
            <ListRow key={entry.definition.id} left={entry.definition.name} right={entry.progress.completed ? 'Complete' : `${entry.progress.progress}/${entry.progress.targetValue}`} />
          ))}
        </MiniList>
      </div>
    </Panel>
  );
}

function RankedSection() {
  const header = useProfileStore((state) => state.header);
  const statistics = useProfileStore((state) => state.statistics);
  if (!header?.ranked) return <EmptyState title="Ranked Private" body="Ranked information is unavailable or private." />;
  return (
    <Panel title="Grand Line Record" subtitle="Ranked data is loaded from the ranked system, not recalculated here.">
      <div className="mb-4 flex min-w-0 items-center gap-4 overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] p-4">
        <RankBadge rank={header.ranked.rank} division={header.ranked.division} inPlacement={header.ranked.inPlacement} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-black uppercase tracking-[0.08em] text-white">{header.ranked.rankName}</p>
          <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-white/55">
            {header.ranked.inPlacement
              ? 'Placement Voyage'
              : header.ranked.division
                ? `Division ${header.ranked.division} - ${header.ranked.rankedPoints} BP`
                : `${header.ranked.rankedPoints} BP`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Rank" value={header.ranked.rankName} />
        <Metric label="Division" value={header.ranked.division ?? (header.ranked.inPlacement ? 'Placement' : 'Elite')} />
        <Metric label="Bounty Points" value={String(header.ranked.rankedPoints)} />
        <Metric label="Season" value={header.ranked.seasonId ?? 'None'} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Wins" value={String(statistics?.currentSeason.ranked.wins ?? 0)} />
        <Metric label="Losses" value={String(statistics?.currentSeason.ranked.losses ?? 0)} />
        <Metric label="Win Rate" value={`${statistics?.currentSeason.ranked.winRate ?? 0}%`} />
        <Metric label="Best Streak" value={String(statistics?.currentSeason.ranked.highestStreak ?? 0)} />
      </div>
    </Panel>
  );
}

function MatchHistorySection() {
  const history = useProfileStore((state) => state.history);
  return (
    <Panel title="Voyage Log" subtitle="Recent visible ranked and casual records.">
      {history?.entries.length ? (
        <div className="space-y-2">
          {history.entries.map((match) => (
            <div key={match.matchId} className="min-w-0 rounded-sm border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black uppercase tracking-[0.1em] text-white">{match.result}</p>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">{formatDate(match.endedAt ?? match.startedAt)}</p>
              </div>
              <p className="mt-1 text-sm text-slate-200/70">{match.opponentName ? `Opponent: ${match.opponentName}` : 'Opponent unavailable'}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                {match.matchType} {match.rankedPointDelta !== null ? `- ${match.rankedPointDelta >= 0 ? '+' : ''}${match.rankedPointDelta} BP` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No Matches" body="No visible match records are available yet." />
      )}
    </Panel>
  );
}

function DeckShowcaseSection() {
  const header = useProfileStore((state) => state.header);
  return (
    <Panel title="Fleet" subtitle="Featured deck summaries only. Full private decklists are not sent through profile APIs.">
      {header?.featuredDecks.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {header.featuredDecks.map((deck) => (
            <div key={deck.deckId} className="min-w-0 rounded-sm border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20">
              <p className="font-black uppercase tracking-[0.1em] text-white">{deck.name}</p>
              <p className="mt-1 text-sm text-slate-200/70">{deck.leaderName}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-white/45">
                {deck.cardCount}/50 - {deck.formatStatus} - {deck.visibility}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No Featured Decks" body="The profile owner has not featured any decks." />
      )}
    </Panel>
  );
}

function StatisticsSection() {
  const statistics = useProfileStore((state) => state.statistics);
  if (!statistics) return <EmptyState title="Statistics Unavailable" body="Battle records are private or still being computed." />;
  return (
    <Panel title="Battle Records" subtitle={statistics.complete ? `Computed ${formatDate(statistics.computedAt)}` : 'Partial statistics'}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Metric label="Matches" value={String(statistics.lifetime.combined.matches)} />
        <Metric label="Wins" value={String(statistics.lifetime.combined.wins)} />
        <Metric label="Losses" value={String(statistics.lifetime.combined.losses)} />
        <Metric label="Win Rate" value={`${statistics.lifetime.combined.winRate}%`} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Metric label="Most Played Leader" value={statistics.mostPlayedLeader?.leaderName ?? 'Unknown'} />
        <Metric label="Highest Rank" value={statistics.highestLifetimeRank} />
      </div>
    </Panel>
  );
}

function AchievementsSection() {
  const achievements = useProfileStore((state) => state.achievements);
  return (
    <Panel title="Milestones" subtitle="Achievement integration surface. Progress is real when the service has source data.">
      {achievements.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {achievements.map((entry) => (
            <div key={entry.definition.id} className="min-w-0 rounded-sm border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20">
              <p className="font-black uppercase tracking-[0.1em] text-white">{entry.definition.name}</p>
              <p className="mt-1 text-sm text-slate-200/65">{entry.definition.description}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-white/45">
                {entry.progress.completed ? 'Complete' : `${entry.progress.progress}/${entry.progress.targetValue}`} - {entry.definition.rarity}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No Milestones" body="No visible achievements are available." />
      )}
    </Panel>
  );
}

const COSMETIC_TYPE_ORDER: CosmeticType[] = [
  'avatar',
  'banner',
  'frame',
  'title',
  'badge',
  'card_back',
  'board_skin',
  'match_intro_effect',
  'victory_effect',
  'emote_set',
];

const COSMETIC_TYPE_LABELS: Record<CosmeticType, string> = {
  avatar: 'Profile Photo',
  banner: 'Banner',
  frame: 'Frame',
  title: 'Title',
  badge: 'Badge',
  card_back: 'Card Back',
  board_skin: 'Board Skin',
  match_intro_effect: 'Match Intro',
  victory_effect: 'Victory Effect',
  emote_set: 'Emotes',
};

function CosmeticsSection() {
  const header = useProfileStore((state) => state.header);
  const cosmetics = useProfileStore((state) => state.cosmetics);
  const equip = useProfileStore((state) => state.equip);
  const unequip = useProfileStore((state) => state.unequip);

  if (!header?.isOwner) return <EmptyState title="Owner Only" body="Cosmetic inventory is owner-only." />;
  if (cosmetics.length === 0) return <EmptyState title="Cosmetics Unavailable" body="Cosmetic inventory is unavailable." />;

  const groups: Partial<Record<CosmeticType, typeof cosmetics>> = {};
  for (const entry of cosmetics) {
    (groups[entry.item.type] ??= []).push(entry);
  }

  return (
    <Panel title="Identity" subtitle="Equip owned cosmetics. Profile Photo and Banner can also be changed directly from your profile card above.">
      <div className="flex flex-col gap-6">
        {COSMETIC_TYPE_ORDER.filter((type) => (groups[type]?.length ?? 0) > 0).map((type) => (
          <div key={type}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gold">{COSMETIC_TYPE_LABELS[type]}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {(groups[type] ?? []).map((entry) => (
                <CosmeticRow
                  key={entry.item.id}
                  entry={entry}
                  onEquip={() => void equip(entry.item.id, entry.item.type)}
                  onUnequip={() => void unequip(entry.item.type)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CosmeticRow({
  entry,
  onEquip,
  onUnequip,
}: {
  entry: { item: { id: string; name: string; description: string }; owned: boolean; equipped: boolean };
  onEquip: () => void;
  onUnequip: () => void;
}) {
  const { item, owned, equipped } = entry;
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{item.name}</p>
        <p className="truncate text-xs text-white/45">{item.description}</p>
      </div>
      {equipped ? (
        <CanvasMenuButton label="Unequip" size="sm" prominence="danger" onClick={onUnequip} />
      ) : owned ? (
        <CanvasMenuButton label="Equip" size="sm" prominence="primary" onClick={onEquip} />
      ) : (
        <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-white/35">Locked</span>
      )}
    </div>
  );
}

function SocialSection() {
  const social = useProfileStore((state) => state.social);
  const unblockUser = useProfileStore((state) => state.unblockUser);
  return (
    <Panel title="Social" subtitle="Friend requests live on the Social tab (Hub menu). Blocked players are managed here.">
      {social ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Metric label="Friends" value={String((social.friends ?? []).length)} />
            <Metric label="Incoming" value={String((social.incomingRequests ?? []).length)} />
            <Metric label="Outgoing" value={String((social.outgoingRequests ?? []).length)} />
            <Metric label="Blocked" value={String(social.blockedCount ?? (social.blocked ?? []).length)} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gold">Blocked Players</p>
            {(social.blocked ?? []).length ? (
              <div className="space-y-2">
                {(social.blocked ?? []).map((entry) => (
                  <div key={entry.userId} className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="min-w-0 truncate text-sm font-bold text-white">{entry.username}</span>
                    <CanvasMenuButton label="Unblock" size="sm" onClick={() => void unblockUser(entry.username)} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/45">No blocked players.</p>
            )}
          </div>
        </>
      ) : (
        <EmptyState title="Social Unavailable" body="Social data is owner-only until public social views are enabled." />
      )}
    </Panel>
  );
}

function SettingsSection() {
  const header = useProfileStore((state) => state.header);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const savePrivacy = useProfileStore((state) => state.savePrivacy);
  const [draft, setDraft] = useState<UpdateProfileRequest>({});

  useEffect(() => {
    if (!header) return;
    setDraft({
      displayName: header.profile.displayName,
      bio: header.profile.bio,
      statusMessage: header.profile.statusMessage,
      region: header.profile.region,
    });
  }, [header?.profile.profileVersion]);

  if (!header?.isOwner) return <EmptyState title="Owner Only" body="Profile settings are private." />;

  return (
    <Panel title="Settings" subtitle="Edit public profile fields and privacy. Validation is enforced by the server.">
      {/* `w-full` on each field: an <input> is inline-block with a UA
          default size, so inside this plain block container they were
          rendering at their intrinsic ~20-character width regardless of how
          much room the panel had. */}
      <div className="flex flex-col gap-3">
        <Field label="Display Name">
          <input
            value={draft.displayName ?? ''}
            onChange={(event) => setDraft((value) => ({ ...value, displayName: event.target.value }))}
            className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-gold/55"
            placeholder="Display name"
          />
        </Field>
        <Field label="Biography">
          <textarea
            value={draft.bio ?? ''}
            onChange={(event) => setDraft((value) => ({ ...value, bio: event.target.value }))}
            className="min-h-24 w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-gold/55"
            placeholder="A short introduction"
          />
        </Field>
        <Field label="Status Message">
          <input
            value={draft.statusMessage ?? ''}
            onChange={(event) => setDraft((value) => ({ ...value, statusMessage: event.target.value }))}
            className="w-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-gold/55"
            placeholder="What you're up to"
          />
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => void saveProfile(draft)}>Save Profile</Button>
        </div>
      </div>

      {header.privacy && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <PrivacySelect label="Profile Visibility" value={header.privacy.profileVisibility} onChange={(value) => void savePrivacy({ profileVisibility: value })} />
          <PrivacySelect label="Match History" value={header.privacy.matchHistoryVisibility} onChange={(value) => void savePrivacy({ matchHistoryVisibility: value })} />
          <PrivacySelect label="Ranked Stats" value={header.privacy.rankedStatsVisibility} onChange={(value) => void savePrivacy({ rankedStatsVisibility: value })} />
          <PrivacySelect label="Deck Showcase" value={header.privacy.deckVisibility} onChange={(value) => void savePrivacy({ deckVisibility: value })} />
        </div>
      )}
    </Panel>
  );
}

function AccountSection() {
  const account = useProfileStore((state) => state.account);
  if (!account) return <EmptyState title="Account Unavailable" body="Account details are owner-only." />;
  return (
    <Panel title="Account" subtitle="Security-sensitive account details are kept out of public profile APIs.">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Metric label="Email" value={account.email} />
        <Metric label="Email Verified" value={account.emailVerified ? 'Yes' : 'No'} />
        <Metric label="Linked Providers" value={account.linkedProviders.join(', ') || 'None'} />
        <Metric label="Active Sessions" value={String(account.activeSessionCount)} />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-white/45">Created {formatDate(account.createdAt)}</p>
    </Panel>
  );
}

/**
 * Section wrapper. The heading is rendered ONCE — the previous version
 * printed `title` twice, as a gold eyebrow and again as an h2 directly
 * beneath it, which is most of why every section read as unfinished.
 */
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const error = useProfileStore((state) => state.error);
  const sectionErrors = useProfileStore((state) => state.sectionErrors);
  const errors = useMemo(() => Object.entries(sectionErrors), [sectionErrors]);
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-4 w-1 shrink-0 bg-gold" aria-hidden="true" />
        <h2 className="min-w-0 truncate font-display text-lg font-black uppercase tracking-[0.1em] text-white sm:text-xl">{title}</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200/60">{subtitle}</p>
      {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      {errors.length > 0 && (
        <div className="mt-3 border border-red-300/20 bg-red-500/10 p-3 text-xs text-red-100">
          {errors.map(([key, value]) => (
            <p key={key}>{SECTION_LABELS[key as ProfileSectionId] ?? key}: {value}</p>
          ))}
        </div>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  // `min-w-0` is load-bearing here, not decoration: as a bare grid item (see
  // every `grid grid-cols-1 ... md:grid-cols-N` caller) this div's default
  // `min-width: auto` would otherwise let the truncating value paragraph
  // force the whole grid track wide enough to fit its untruncated text —
  // exactly what was pushing the Profile screen wider than the viewport.
  return (
    <div className="min-w-0 overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 truncate font-display text-lg font-black uppercase tracking-[0.04em] text-white">{value}</p>
    </div>
  );
}

function MiniList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="min-w-0 rounded-sm border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gold">{title}</p>
      <div className="mt-3 space-y-2">{children.length ? children : <p className="text-sm text-white/40">{empty}</p>}</div>
    </div>
  );
}

function ListRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="min-w-0 truncate text-sm font-bold text-white">{left}</span>
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">{right}</span>
    </div>
  );
}

function PrivacySelect({ label, value, onChange }: { label: string; value: ProfileVisibility; onChange: (value: ProfileVisibility) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-2 rounded-sm border border-white/10 bg-black/20 p-3">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">{label}</span>
      <OpSelect
        value={value}
        options={[
          { value: 'public', label: 'Public' },
          { value: 'friends', label: 'Friends only' },
          { value: 'private', label: 'Private' },
        ]}
        onChange={(next) => onChange(next as ProfileVisibility)}
        buttonClassName="min-h-10"
      />
    </label>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[14rem] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-sm font-black uppercase tracking-[0.18em] text-gold">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-200/55">{body}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
}
