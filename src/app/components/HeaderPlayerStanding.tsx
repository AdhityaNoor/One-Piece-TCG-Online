/**
 * Header standing block: rank badge + rank name/division, and player level.
 *
 * LEVEL AND RANK ARE SEPARATE PROGRESSIONS and are shown as two distinct
 * chips on purpose (see shared/progression.ts):
 *   - Level  = lifetime XP from any mode, monotonic, never resets.
 *   - Rank   = seasonal competitive standing, can demote, resets each season.
 * Neither is derived from the other; a level 40 player can sit in the lowest
 * rank and vice versa.
 *
 * Data comes from the profile header response, which already carries both the
 * ranked standing and experiencePoints — so this adds no extra request. It
 * renders nothing at all when signed out or before that response arrives,
 * rather than inventing a placeholder rank.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import { levelForXp } from '../../../shared/progression';
import { RankBadge } from './RankBadge';

/** The slice of the profile header this block renders. */
interface Standing {
  ranked: NonNullable<ReturnType<typeof useProfileStore.getState>['header']>['ranked'];
  experiencePoints: number;
}

export function HeaderPlayerStanding() {
  const token = useAuthStore((state) => state.token);
  const header = useProfileStore((state) => state.header);
  const status = useProfileStore((state) => state.status);
  const loadOwn = useProfileStore((state) => state.loadOwn);

  // The store is shared with ProfileScreen, which calls profile.clear() when it
  // unmounts — so `header` is wiped every time you leave that screen, and a
  // block reading the store directly would blink out and only reappear on
  // Profile/Social. This keeps its own copy of the two values it needs, so the
  // standing survives someone else clearing the store.
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
  // at 'ready'/'error', so an idle-only guard meant this never fetched and the
  // block silently stayed empty. The ref also stops a persistent backend error
  // from retrying in a loop.
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

  if (!token || !standing) return null;

  const ranked = standing.ranked;
  const { level } = levelForXp(standing.experiencePoints);

  return (
    <div className="hidden items-center gap-2 md:flex">
      {ranked && (
        <span
          className="flex items-center gap-2 border border-white/10 bg-black/25 px-2 py-1"
          title={`${ranked.rankName}${ranked.division ? ` ${ranked.division}` : ''} — ${ranked.rankedPoints} RP`}
        >
          <RankBadge rank={ranked.rank} division={ranked.division} inPlacement={ranked.inPlacement} size="sm" />
          <span className="flex flex-col leading-none">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/85">
              {ranked.inPlacement ? 'Placement' : ranked.rankName}
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
              {ranked.inPlacement ? 'Unranked' : `${ranked.division ?? ''} · ${ranked.rankedPoints} RP`}
            </span>
          </span>
        </span>
      )}

      <span
        className="flex items-center gap-1.5 border border-[rgb(var(--op-gold-rgb)/0.35)] bg-black/25 px-2 py-1"
        title={`Player level ${level} — earned from matches played in any mode`}
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">Lv</span>
        <span className="font-display text-sm font-black leading-none text-[rgb(var(--op-gold-rgb))]">{level}</span>
      </span>
    </div>
  );
}
