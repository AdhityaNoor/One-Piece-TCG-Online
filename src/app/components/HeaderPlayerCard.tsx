/**
 * The player's identity cluster at the right edge of the app header:
 * level, photo, name and rank, on one angled plate.
 *
 * This replaces what used to be three separate things sitting side by side —
 * a rank pill, a level pill, and a bare avatar button. Read left to right
 * they were three unrelated boxes competing for the same corner; the rank
 * pill in particular was the widest element in the header and said
 * "PLACEMENT / UNRANKED" in two lines of small caps. As one plate they read
 * as a single object (this is you), and the rank becomes a supporting line
 * under the name instead of a competing box.
 *
 * LEVEL AND RANK ARE STILL SEPARATE PROGRESSIONS (see shared/progression.ts)
 * and are deliberately kept visually distinct within the plate — level in
 * the angled leading edge, rank beneath the name:
 *   - Level = lifetime XP from any mode, monotonic, never resets.
 *   - Rank  = seasonal competitive standing, can demote, resets each season.
 * Neither is derived from the other; a level 40 player can sit in the lowest
 * rank and vice versa.
 *
 * The whole plate is one button to the player's profile. Data comes from the
 * profile header response, which already carries the ranked standing and
 * experiencePoints, so this adds no extra request; the photo comes from
 * settingsStore, which profileStore mirrors (profileStore itself is cleared
 * whenever ProfileScreen unmounts, so it cannot be read from here).
 */
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useSettingsStore } from '../store/settingsStore';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { levelForXp } from '../../../shared/progression';
import { PlayerAvatar } from './PlayerAvatar';
import { RankBadge } from './RankBadge';

/**
 * The chamfered leading edge.
 *
 * DIRECTION MATTERS and is easy to get backwards: the TOP-left corner is the
 * plate's leftmost point and the BOTTOM-left is inset, so the diagonal falls
 * away to the right as it descends. Inverting it (top inset, bottom flush)
 * makes the plate lean the other way, points the wedge at the nav instead of
 * away from it, and leaves no room at the top for the level to sit in.
 *
 * The run is proportional to the plate's height — a chamfer that keeps a
 * fixed pixel run at two different header heights changes angle between
 * breakpoints. 0.57 : 1 matches the reference.
 */
const CHAMFER_RUN = '2.6rem';
const PLATE_CLIP = `polygon(0 0, 100% 0, 100% 100%, ${CHAMFER_RUN} 100%)`;

/** The slice of the profile header this block renders. */
interface Standing {
  ranked: NonNullable<ReturnType<typeof useProfileStore.getState>['header']>['ranked'];
  experiencePoints: number;
}

export interface HeaderPlayerCardProps {
  isActive: boolean;
  onOpen: () => void;
}

export function HeaderPlayerCard({ isActive, onOpen }: HeaderPlayerCardProps) {
  const token = useAuthStore((state) => state.token);
  const header = useProfileStore((state) => state.header);
  const status = useProfileStore((state) => state.status);
  const loadOwn = useProfileStore((state) => state.loadOwn);
  const username = useSettingsStore((state) => state.username);
  const avatarId = useSettingsStore((state) => state.avatarId);
  const avatarImageUrl = useSettingsStore((state) => state.avatarImageUrl);
  const avatarFrameId = useSettingsStore((state) => state.avatarFrameId);

  // The store is shared with ProfileScreen, which calls profile.clear() when
  // it unmounts — so `header` is wiped every time you leave that screen, and
  // a block reading the store directly would blink out and only reappear on
  // Profile/Social. This keeps its own copy of the two values it needs, so
  // the standing survives someone else clearing the store.
  const [standing, setStanding] = useState<Standing | null>(null);
  useEffect(() => {
    if (!header) return;
    setStanding({ ranked: header.ranked, experiencePoints: header.profile.experiencePoints ?? 0 });
  }, [header]);

  // Drop the cached standing on sign-out so the next account never briefly
  // shows the previous player's rank.
  useEffect(() => {
    if (!token) setStanding(null);
  }, [token]);

  // Fetch once per token. Keyed on a ref rather than `status === 'idle'`: any
  // other screen that had already loaded (or failed) a profile leaves status
  // at 'ready'/'error', so an idle-only guard meant this never fetched and
  // the block silently stayed empty. The ref also stops a persistent backend
  // error from retrying in a loop.
  const attemptedForToken = useRef<string | null>(null);
  useEffect(() => {
    if (!token || !isBackendConfigured()) {
      attemptedForToken.current = null;
      return;
    }
    if (attemptedForToken.current === token) return;
    if (header || status === 'loading') return;
    attemptedForToken.current = token;
    void loadOwn();
  }, [token, header, status, loadOwn]);

  const ranked = standing?.ranked ?? null;
  const level = standing ? levelForXp(standing.experiencePoints).level : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Your profile"
      aria-current={isActive ? 'page' : undefined}
      className="group relative z-10 ml-auto flex h-full flex-shrink-0 items-center"
    >
      {/* Two stacked clipped layers make the 1px outline follow the chamfer:
          the outer one is the border colour, the inner is inset by a pixel
          and carries the fill. A real CSS border cannot do this — a border
          is drawn on the element's rectangle and then clipped away with it,
          so the diagonal edge would come out unstroked.

          Rendered only from `md`: below that the header has no room for the
          plate and the avatar stands alone, which is also where the leading
          edge would collide with the mobile nav trigger. */}
      <span
        aria-hidden="true"
        className={[
          'absolute inset-y-1 left-0 right-0 hidden transition-colors duration-200 md:block',
          isActive ? 'bg-[rgb(var(--op-gold-rgb)/0.55)]' : 'bg-white/15 group-hover:bg-white/30',
        ].join(' ')}
        style={{ clipPath: PLATE_CLIP }}
      />
      <span
        aria-hidden="true"
        className={[
          'absolute inset-y-[5px] left-px right-px hidden transition-colors duration-200 md:block',
          isActive
            ? 'bg-[linear-gradient(100deg,_rgba(217,164,65,0.22)_0%,_rgba(3,9,24,0.85)_60%)]'
            : 'bg-[linear-gradient(100deg,_rgba(10,28,66,0.9)_0%,_rgba(3,9,24,0.85)_60%)] group-hover:bg-[linear-gradient(100deg,_rgba(16,40,90,0.95)_0%,_rgba(3,9,24,0.9)_60%)]',
        ].join(' ')}
        style={{ clipPath: PLATE_CLIP }}
      />

      <span className="relative flex h-full items-center gap-2 py-1 pl-1 pr-1 md:gap-3.5 md:pl-3 md:pr-5">
        {/* Level lives INSIDE the chamfered wedge, top-aligned — that wedge
            is the widest part of the plate at the top, and it is the only
            place a two-line block fits without stealing width from the
            name. `self-start` rather than centred for the same reason. */}
        {level !== null && (
          <span
            className="hidden shrink-0 flex-col items-center self-start pt-1.5 leading-none md:flex"
            title={`Player level ${level} — earned from matches played in any mode`}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">Lv</span>
            <span className="mt-0.5 font-display text-lg font-black leading-none text-[rgb(var(--op-gold-rgb))]">{level}</span>
          </span>
        )}

        <span
          className={[
            'shrink-0 transition-all duration-200',
            isActive ? 'drop-shadow-[0_0_10px_rgba(217,164,65,0.8)]' : 'opacity-95 group-hover:opacity-100',
          ].join(' ')}
        >
          <span className="md:hidden">
            <PlayerAvatar imageUrl={avatarImageUrl} catalogAvatarId={avatarId} frameId={avatarFrameId} size={50} />
          </span>
          <span className="hidden md:block">
            <PlayerAvatar imageUrl={avatarImageUrl} catalogAvatarId={avatarId} frameId={avatarFrameId} size={70} />
          </span>
        </span>

        <span className="hidden min-w-0 flex-col items-start justify-center text-left md:flex">
          <span
            className={[
              'max-w-[10rem] truncate font-display text-base font-black uppercase tracking-[0.08em] transition-colors lg:max-w-[14rem] lg:text-lg',
              isActive ? 'text-[rgb(var(--op-gold-rgb))]' : 'text-white',
            ].join(' ')}
          >
            {username}
          </span>
          {/* Rank is a caption under the name, per the reference: the badge
              is the icon, the rank name is the label. Placement is spelled
              out rather than shown as a rank name, because there isn't one
              yet. */}
          <span className="mt-1 flex min-w-0 items-center gap-1.5">
            <RankBadge
              rank={ranked?.rank}
              division={ranked?.division}
              inPlacement={ranked?.inPlacement ?? !ranked}
              size="sm"
            />
            <span
              className="min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-white/55"
              title={
                ranked
                  ? `${ranked.rankName}${ranked.division ? ` ${ranked.division}` : ''} — ${ranked.rankedPoints} RP`
                  : undefined
              }
            >
              {ranked ? (ranked.inPlacement ? 'Placement' : ranked.rankName) : 'Unranked'}
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
