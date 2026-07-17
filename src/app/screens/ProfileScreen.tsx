import { useEffect, useMemo, useState } from 'react';
import type { CosmeticType, ProfileSectionId, ProfileVisibility, ReportPlayerRequest, UpdateProfileRequest } from '../../../shared/profile';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { AvatarPicker, BannerPicker, Button, CanvasMenuButton, GameCanvasScreen, Modal, OpSelect, RankBadge } from '../components';
import { avatarCatalogIdToOptionId, avatarOptionIdToCatalogId, resolveAvatarUrl } from '../lib/avatars';
import { resolveBannerGradient } from '../lib/banners';
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
      <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-3 py-2 lg:grid-cols-[24rem_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="min-h-0 border border-gold/30 bg-black/45 p-5 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
          <ProfileHeader />
        </aside>

        <section className="flex min-h-[28rem] min-w-0 flex-col overflow-hidden border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] shadow-[0_14px_0_rgba(1,5,16,0.5)]">
          <ProfileNavigation sections={visibleSections} current={section} onChange={setSection} />
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
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
    </GameCanvasScreen>
  );
}

function ProfileHeader() {
  const header = useProfileStore((state) => state.header);
  const equip = useProfileStore((state) => state.equip);
  const blockUser = useProfileStore((state) => state.blockUser);
  const unblockUser = useProfileStore((state) => state.unblockUser);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (!header) {
    return (
      <div className="border border-cyan-200/20 bg-[#08101f] p-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">No profile loaded</p>
      </div>
    );
  }

  const { profile, ranked, isOwner } = header;
  const avatarOptionId = avatarCatalogIdToOptionId(profile.equippedCosmetics.avatar);
  const avatarUrl = resolveAvatarUrl(avatarOptionId);
  const bannerGradient = resolveBannerGradient(profile.equippedCosmetics.banner);

  return (
    <div className="overflow-hidden border border-cyan-200/20 bg-[#08101f]">
      {/* Banner sits as a full-bleed backdrop BEHIND the avatar + name card
          below (not a separate strip) — the -mt-8 on the card pulls it up
          to overlap the banner, and the avatar itself overlaps both. */}
      <button
        type="button"
        disabled={!isOwner}
        onClick={() => setBannerPickerOpen(true)}
        aria-label={isOwner ? 'Change banner' : undefined}
        className={['group relative block h-28 w-full', isOwner ? 'cursor-pointer' : 'cursor-default'].join(' ')}
        style={{ background: bannerGradient }}
      >
        {isOwner && (
          <span className="absolute inset-0 hidden items-center justify-center bg-black/45 text-[10px] font-black uppercase tracking-[0.16em] text-white group-hover:flex">
            Change Banner
          </span>
        )}
      </button>
      <div className="relative -mt-12 p-5 pt-0 text-center">
        <button
          type="button"
          disabled={!isOwner}
          onClick={() => setAvatarPickerOpen(true)}
          aria-label={isOwner ? 'Change profile photo' : undefined}
          className={[
            'group relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden border-2 border-gold bg-[#050914]',
            isOwner ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
        >
          <img src={avatarUrl} alt="" draggable={false} className="h-full w-full object-contain p-1" />
          {isOwner && (
            <span className="absolute inset-0 hidden items-center justify-center bg-black/55 text-[9px] font-black uppercase tracking-[0.12em] text-white group-hover:flex">
              Change
            </span>
          )}
        </button>
        <h2 className="mt-4 truncate font-display text-2xl font-black uppercase tracking-[0.1em] text-white">{profile.displayName}</h2>
        <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.14em] text-white/50">@{profile.username}</p>
        {profile.statusMessage && <p className="mt-3 text-sm leading-5 text-slate-200/75">{profile.statusMessage}</p>}
        <div className="mt-4 flex items-center gap-3 border border-white/10 bg-black/25 p-3 text-left">
          <RankBadge
            rank={ranked?.rank}
            division={ranked?.division}
            inPlacement={ranked?.inPlacement ?? !ranked}
            size="lg"
          />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-gold">{ranked?.rankName ?? 'Unranked'}</p>
            <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-white/55">
              {ranked ? (ranked.inPlacement ? 'Placement Voyage' : ranked.division ? `Division ${ranked.division} - ${ranked.rankedPoints} BP` : `${ranked.rankedPoints} BP`) : 'No ranked record'}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">Sailing Since {formatDate(profile.createdAt)}</p>

        {!isOwner && (
          <div className="mt-4 flex justify-center gap-2">
            {header.relationship === 'blocked_by_viewer' ? (
              <CanvasMenuButton label="Unblock" size="sm" onClick={() => void unblockUser(profile.username)} />
            ) : (
              <CanvasMenuButton label="Block" size="sm" prominence="danger" onClick={() => void blockUser(profile.username)} />
            )}
            <CanvasMenuButton label="Report" size="sm" onClick={() => setReportOpen(true)} />
          </div>
        )}
      </div>

      {isOwner && (
        <Modal open={avatarPickerOpen} onClose={() => setAvatarPickerOpen(false)} title="Profile Photo" maxWidthClassName="max-w-md">
          <div className="p-4">
            <p className="mb-3 text-xs leading-5 text-slate-200/65">Same portraits as your Settings avatar — pick one to use on your profile.</p>
            <AvatarPicker
              value={avatarOptionId ?? 'luffy'}
              onChange={(optionId) => {
                void equip(avatarOptionIdToCatalogId(optionId), 'avatar');
                setAvatarPickerOpen(false);
              }}
            />
          </div>
        </Modal>
      )}
      {isOwner && (
        <Modal open={bannerPickerOpen} onClose={() => setBannerPickerOpen(false)} title="Profile Banner" maxWidthClassName="max-w-md">
          <div className="p-4">
            <p className="mb-3 text-xs leading-5 text-slate-200/65">Gradient banners — no photo upload yet.</p>
            <BannerPicker
              value={profile.equippedCosmetics.banner}
              onChange={(bannerId) => {
                void equip(bannerId, 'banner');
                setBannerPickerOpen(false);
              }}
            />
          </div>
        </Modal>
      )}
      {!isOwner && <ReportPlayerModal open={reportOpen} onClose={() => setReportOpen(false)} username={profile.username} />}
    </div>
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
    <nav
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 bg-black/30 px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Profile sections"
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
              'relative whitespace-nowrap border-b-2 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition',
              active
                ? 'border-gold text-white'
                : 'border-transparent text-white/50 hover:text-gold',
            ].join(' ')}
          >
            {SECTION_LABELS[id]}
          </button>
        );
      })}
    </nav>
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
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Rank" value={header.ranked?.rankName ?? 'Unranked'} />
        <Metric label="Lifetime Matches" value={String(statistics?.lifetime.combined.matches ?? 0)} />
        <Metric label="Win Rate" value={`${statistics?.lifetime.combined.winRate ?? 0}%`} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
      <div className="mb-4 flex items-center gap-4 border border-white/10 bg-black/25 p-4">
        <RankBadge rank={header.ranked.rank} division={header.ranked.division} inPlacement={header.ranked.inPlacement} size="lg" />
        <div className="min-w-0">
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
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Rank" value={header.ranked.rankName} />
        <Metric label="Division" value={header.ranked.division ?? (header.ranked.inPlacement ? 'Placement' : 'Elite')} />
        <Metric label="Bounty Points" value={String(header.ranked.rankedPoints)} />
        <Metric label="Season" value={header.ranked.seasonId ?? 'None'} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
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
            <div key={match.matchId} className="border border-white/10 bg-black/25 p-3">
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
        <div className="grid gap-3 md:grid-cols-2">
          {header.featuredDecks.map((deck) => (
            <div key={deck.deckId} className="border border-white/10 bg-black/25 p-3">
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
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Matches" value={String(statistics.lifetime.combined.matches)} />
        <Metric label="Wins" value={String(statistics.lifetime.combined.wins)} />
        <Metric label="Losses" value={String(statistics.lifetime.combined.losses)} />
        <Metric label="Win Rate" value={`${statistics.lifetime.combined.winRate}%`} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
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
        <div className="grid gap-3 md:grid-cols-2">
          {achievements.map((entry) => (
            <div key={entry.definition.id} className="border border-white/10 bg-black/25 p-3">
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
            <div className="grid gap-2 md:grid-cols-2">
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
    <div className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-2">
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
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Friends" value={String((social.friends ?? []).length)} />
            <Metric label="Incoming" value={String((social.incomingRequests ?? []).length)} />
            <Metric label="Outgoing" value={String((social.outgoingRequests ?? []).length)} />
            <Metric label="Blocked" value={String(social.blockedCount ?? (social.blocked ?? []).length)} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gold">Blocked Players</p>
            {(social.blocked ?? []).length ? (
              <div className="grid gap-2">
                {(social.blocked ?? []).map((entry) => (
                  <div key={entry.userId} className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-2">
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
      <div className="grid gap-3">
        <input
          value={draft.displayName ?? ''}
          onChange={(event) => setDraft((value) => ({ ...value, displayName: event.target.value }))}
          className="border border-white/10 bg-black/35 px-3 py-2 text-sm text-white"
          placeholder="Display name"
        />
        <textarea
          value={draft.bio ?? ''}
          onChange={(event) => setDraft((value) => ({ ...value, bio: event.target.value }))}
          className="min-h-24 border border-white/10 bg-black/35 px-3 py-2 text-sm text-white"
          placeholder="Biography"
        />
        <input
          value={draft.statusMessage ?? ''}
          onChange={(event) => setDraft((value) => ({ ...value, statusMessage: event.target.value }))}
          className="border border-white/10 bg-black/35 px-3 py-2 text-sm text-white"
          placeholder="Status message"
        />
        <Button onClick={() => void saveProfile(draft)}>Save Profile</Button>
      </div>

      {header.privacy && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
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
      <div className="grid gap-3 md:grid-cols-2">
        <Metric label="Email" value={account.email} />
        <Metric label="Email Verified" value={account.emailVerified ? 'Yes' : 'No'} />
        <Metric label="Linked Providers" value={account.linkedProviders.join(', ') || 'None'} />
        <Metric label="Active Sessions" value={String(account.activeSessionCount)} />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-white/45">Created {formatDate(account.createdAt)}</p>
    </Panel>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const error = useProfileStore((state) => state.error);
  const sectionErrors = useProfileStore((state) => state.sectionErrors);
  const errors = useMemo(() => Object.entries(sectionErrors), [sectionErrors]);
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{title}</p>
      <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[0.1em] text-white">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200/65">{subtitle}</p>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 truncate text-lg font-black uppercase tracking-[0.06em] text-white">{value}</p>
    </div>
  );
}

function MiniList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-gold">{title}</p>
      <div className="mt-3 grid gap-2">{children.length ? children : <p className="text-sm text-white/45">{empty}</p>}</div>
    </div>
  );
}

function ListRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-2">
      <span className="min-w-0 truncate text-sm font-bold text-white">{left}</span>
      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-white/45">{right}</span>
    </div>
  );
}

function PrivacySelect({ label, value, onChange }: { label: string; value: ProfileVisibility; onChange: (value: ProfileVisibility) => void }) {
  return (
    <label className="grid gap-2 border border-white/10 bg-black/20 p-3">
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
    <div className="flex min-h-[16rem] flex-col items-center justify-center text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-200/65">{body}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
}
