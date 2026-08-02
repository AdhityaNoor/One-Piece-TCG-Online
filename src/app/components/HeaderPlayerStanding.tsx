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
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { levelForXp } from '../../../shared/progression';
import { RankBadge } from './RankBadge';

export function HeaderPlayerStanding() {
  const token = useAuthStore((state) => state.token);
  const header = useProfileStore((state) => state.header);
  const status = useProfileStore((state) => state.status);
  const loadOwn = useProfileStore((state) => state.loadOwn);

  // Fetch once per token. Keyed on a ref rather than `status === 'idle'`: any
  // other screen that had already loaded (or failed) a profile leaves status
  // at 'ready'/'error', so an idle-only guard meant this never fetched and the
  // block silently stayed empty forever. The ref also stops a persistent
  // backend error from retrying in a loop.
  const attemptedForToken = useRef<string | null>(null);
  useEffect(() => {
    if (!token) {
      attemptedForToken.current = null;
      return;
    }
    if (attemptedForToken.current === token) return;
    if (header || status === 'loading') return;
    attemptedForToken.current = token;
    void loadOwn();
  }, [token, header, status, loadOwn]);

  if (!token || !header) return null;

  const ranked = header.ranked;
  const { level } = levelForXp(header.profile.experiencePoints ?? 0);

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
