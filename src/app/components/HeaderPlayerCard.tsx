/**
 * The player's identity cluster at the right edge of the app header:
 * photo, name, rank and level, on one angled plate.
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
 * and are deliberately kept visually distinct within the plate — the rank
 * as an icon plus label under the name, the level as a hexagonal badge on
 * the photo:
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
import { HEX_CLIP_PATH } from '../lib/avatarFrames';
import { PlayerAvatar } from './PlayerAvatar';
import { RankBadge } from './RankBadge';

/**
 * The chamfered leading edge.
 *
 * DIRECTION MATTERS and is easy to get backwards: the TOP-left corner is the
 * plate's leftmost point and the BOTTOM-left is inset, so the diagonal falls
 * away to the right as it descends. Inverting it (top inset, bottom flush)
 * makes the plate lean the other way and points the wedge at the nav
 * instead of away from it.
 *
 * Geometry is DERIVED, not eyeballed. Three constraints fix every number
 * below, so none of them may be nudged independently:
 *
 *  1. The chamfer's angle equals the hexagon's side edge. A regular hexagon's
 *     edge is exactly 30 degrees from vertical (its run is a quarter of the
 *     width over half the height, and 0.25 / (sqrt(3)/4) = tan 30), so
 *     run = plateH * tan(30). Any other run makes the plate's edge and the
 *     avatar's edge visibly non-parallel.
 *  2. The plate fills the header: no vertical inset, flush to the right edge
 *     (the card cancels the header row's horizontal padding with -mr).
 *  3. The hexagon's clearance is ONE gap — identical above, below, and
 *     PERPENDICULAR to the diagonal. Solving for that gives
 *     hexLeft = gap * hypot(run, plateH) / plateH + run / 2.
 *
 * Measured at 1280x80: gapTop 12.0, gapBottom 12.0, gapDiagonal 11.8.
 */
const PLATE_H = 79; // header h-20 (80px, border-box) less its 1px bottom border
const CHAMFER_RUN_PX = PLATE_H / Math.sqrt(3); // 45.61px — 30deg, matching the hex edge
const PLATE_CLIP = `polygon(0 0, 100% 0, 100% 100%, ${CHAMFER_RUN_PX.toFixed(2)}px 100%)`;

/** Avatar WIDTH; its height is width * sqrt(3)/2, i.e. 55.4px. */
const AVATAR_PX = 64;

/**
 * The hexagon's left offset — constraint 3's solution, 36.42px — is applied
 * below as the LITERAL class `md:ml-[2.276rem]`, never interpolated from a
 * constant. Tailwind scans source text for complete class names, so a
 * template-built `md:ml-[${x}]` is never generated and the hexagon would end
 * up flush against the diagonal with no offset at all.
 */

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
      className="group relative z-10 -mr-3 ml-auto flex h-full flex-shrink-0 items-center sm:-mr-6"
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
          'absolute inset-y-0 left-0 right-0 hidden transition-colors duration-200 md:block',
          isActive ? 'bg-[rgb(var(--op-gold-rgb)/0.6)]' : 'bg-white/30 group-hover:bg-white/45',
        ].join(' ')}
        style={{ clipPath: PLATE_CLIP }}
      />
      <span
        aria-hidden="true"
        className={[
          // Only the diagonal keeps a hairline. Insetting the top, bottom or
          // right would read as padding — the plate is meant to BE the
          // header's right end, not a chip floating inside it.
          'absolute inset-y-0 left-px right-0 hidden transition-colors duration-200 md:block',
          isActive
            ? 'bg-[linear-gradient(100deg,_rgba(60,42,10,0.92)_0%,_rgba(1,4,14,0.9)_70%)]'
            : 'bg-[linear-gradient(100deg,_rgba(4,10,26,0.92)_0%,_rgba(1,4,14,0.9)_70%)] group-hover:bg-[linear-gradient(100deg,_rgba(10,22,52,0.94)_0%,_rgba(1,4,14,0.9)_70%)]',
        ].join(' ')}
        style={{ clipPath: PLATE_CLIP }}
      />

      {/* The wedge is left EMPTY on purpose. The level used to sit in it,
          but the triangle is narrow where the number lands and it read as
          crowding the avatar's leading vertex no matter where inside the
          wedge it was placed — the space simply is not wide enough for a
          glyph at a legible size. The level moved under the name (below);
          the chamfer stays as pure shape. */}
      <span className="relative flex h-full items-center gap-3 pl-2 pr-4 md:gap-4 md:pl-0 md:pr-7">
        <span
          className={[
            'relative flex shrink-0 transition-all duration-200 md:ml-[2.276rem]',
            isActive ? 'drop-shadow-[0_0_10px_rgba(217,164,65,0.8)]' : 'opacity-95 group-hover:opacity-100',
          ].join(' ')}
        >
          <span className="md:hidden">
            <PlayerAvatar imageUrl={avatarImageUrl} catalogAvatarId={avatarId} frameId={avatarFrameId} size={50} />
          </span>
          <span className="hidden md:flex">
            <PlayerAvatar imageUrl={avatarImageUrl} catalogAvatarId={avatarId} frameId={avatarFrameId} size={AVATAR_PX} />
          </span>

          {/* Level as a badge hovering on the photo's lower edge.

              A HEXAGON, not a circle: the frame is a hexagon, and a disc
              stuck on one reads as a foreign object. Repeating the shape
              makes the badge look like part of the avatar. It reuses
              HEX_CLIP_PATH, so if the frame's silhouette ever changes the
              badge follows it automatically.

              `min-w` plus horizontal padding rather than a fixed size, so a
              2- or 3-digit level widens the hexagon instead of clipping.
              Solid gold with a dark numeral, because a gold OUTLINE would
              sit directly on the frame's own gold ring and the two would
              read as one smudged edge.

              It deliberately sits OUTSIDE the plate's clipped layers, so it
              can overhang the ring without being cut. Anchored bottom-centre
              because the hexagon's bottom edge is flat there; at the
              lower-LEFT it would cross the plate's diagonal and be clipped
              by it. */}
          {level !== null && (
            <span
              className="pointer-events-none absolute bottom-[-7px] left-1/2 flex h-[19px] min-w-[23px] -translate-x-1/2 items-center justify-center px-1 font-display text-[11px] font-black leading-none text-[#050d1e]"
              style={{ clipPath: HEX_CLIP_PATH, background: 'rgb(var(--op-gold-rgb))' }}
              title={`Player level ${level} — earned from matches played in any mode`}
            >
              {level}
            </span>
          )}
        </span>

        <span className="hidden min-w-0 flex-col items-start justify-center text-left md:flex">
          <span
            className={[
              'max-w-[10rem] truncate font-display text-base font-black uppercase leading-none tracking-[0.08em] transition-colors lg:max-w-[14rem] lg:text-lg',
              isActive ? 'text-[rgb(var(--op-gold-rgb))]' : 'text-white',
            ].join(' ')}
          >
            {username}
          </span>

          {/* Rank is a caption under the name: the badge is the icon, the
              rank name is the label. Placement is spelled out rather than
              shown as a rank name, because there isn't one yet. */}
          <span className="mt-1.5 flex min-w-0 items-center gap-2">
            <RankBadge
              rank={ranked?.rank}
              division={ranked?.division}
              inPlacement={ranked?.inPlacement ?? !ranked}
              size="sm"
            />
            <span
              className="min-w-0 truncate text-[12px] font-bold uppercase leading-none tracking-[0.1em] text-white/60"
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
