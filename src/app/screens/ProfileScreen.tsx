import { useEffect, useMemo, useState } from 'react';
import type { ProfileSectionId, ProfileVisibility, UpdateProfileRequest } from '../../../shared/profile';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { Button, CanvasMenuButton, GameCanvasScreen, OpSelect } from '../components';
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
    <GameCanvasScreen kicker="Pirate Profile" status={profile.header?.profile.username ?? 'Identity Hub'} headerTitle="Player Profile" onBack={goBack} dense>
      <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-3 py-2 lg:grid-cols-[17rem_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="min-h-0 border border-gold/30 bg-black/45 p-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
          <ProfileHeader />
          <ProfileNavigation sections={visibleSections} current={section} onChange={setSection} />
        </aside>

        <section className="min-h-[28rem] overflow-y-auto border border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.84),_rgba(3,9,24,0.94))] p-4 shadow-[0_14px_0_rgba(1,5,16,0.5)] sm:p-5">
          {!backendConfigured ? (
            <EmptyState title="Backend Missing" body="Set VITE_API_BASE_URL to use player profiles." />
          ) : profile.status === 'loading' ? (
            <EmptyState title="Loading Profile" body="Fetching profile sections." />
          ) : profile.status === 'error' ? (
            <EmptyState title="Profile Unavailable" body={profile.error ?? 'Could not load this profile.'} />
          ) : (
            <ProfileSection section={section} />
          )}
        </section>
      </div>
    </GameCanvasScreen>
  );
}

function ProfileHeader() {
  const header = useProfileStore((state) => state.header);
  if (!header) {
    return (
      <div className="border border-cyan-200/20 bg-[#08101f] p-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">No profile loaded</p>
      </div>
    );
  }

  const { profile, ranked } = header;
  return (
    <div className="overflow-hidden border border-cyan-200/20 bg-[#08101f]">
      <div className="h-20 bg-[linear-gradient(135deg,_rgba(217,164,65,0.45),_rgba(16,76,132,0.72))]" />
      <div className="-mt-8 p-4 pt-0 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-gold bg-[#050914] font-display text-2xl font-black uppercase text-white">
          {profile.displayName.slice(0, 1) || '?'}
        </div>
        <h2 className="mt-3 truncate font-display text-xl font-black uppercase tracking-[0.1em] text-white">{profile.displayName}</h2>
        <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.14em] text-white/50">@{profile.username}</p>
        {profile.statusMessage && <p className="mt-3 text-sm leading-5 text-slate-200/75">{profile.statusMessage}</p>}
        <div className="mt-4 border border-white/10 bg-black/25 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">{ranked?.rankName ?? 'Unranked'}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/55">
            {ranked ? (ranked.inPlacement ? 'Placement Voyage' : ranked.division ? `Division ${ranked.division} - ${ranked.rankedPoints} BP` : `${ranked.rankedPoints} BP`) : 'No ranked record'}
          </p>
        </div>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">Sailing Since {formatDate(profile.createdAt)}</p>
      </div>
    </div>
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
    <nav className="mt-4 grid gap-2" aria-label="Profile sections">
      <div className="lg:hidden">
        <OpSelect
          value={current}
          options={sections.map((id) => ({ value: id, label: SECTION_LABELS[id] }))}
          onChange={(value) => onChange(value as ProfileSectionId)}
          buttonClassName="min-h-11"
        />
      </div>
      <div className="hidden gap-2 lg:grid">
        {sections.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              'border px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.14em] transition',
              current === id ? 'border-gold bg-gold/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-gold/45 hover:text-gold',
            ].join(' ')}
          >
            {SECTION_LABELS[id]}
          </button>
        ))}
      </div>
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

function CosmeticsSection() {
  const cosmetics = useProfileStore((state) => state.cosmetics);
  return (
    <Panel title="Identity" subtitle="Owned cosmetics can be equipped after server-side ownership validation.">
      {cosmetics.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {cosmetics.map((entry) => (
            <ListRow key={entry.item.id} left={entry.item.name} right={entry.equipped ? 'Equipped' : entry.owned ? 'Owned' : 'Locked'} />
          ))}
        </div>
      ) : (
        <EmptyState title="Cosmetics Unavailable" body="Cosmetic inventory is owner-only or unavailable." />
      )}
    </Panel>
  );
}

function SocialSection() {
  const social = useProfileStore((state) => state.social);
  return (
    <Panel title="Social" subtitle="Prepared for friends, requests, and blocks.">
      {social ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Friends" value={String(social.friends.length)} />
          <Metric label="Incoming" value={String(social.incomingRequests.length)} />
          <Metric label="Outgoing" value={String(social.outgoingRequests.length)} />
          <Metric label="Blocked" value={String(social.blockedCount)} />
        </div>
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

