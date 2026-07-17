/**
 * Rank icon + category-color resolution for the ranked ladder.
 *
 * Source art lives in /public/ui-icons/Ranks/ as 16 monochrome SVGs
 * ("Rank 1ldpi.svg" ... "Rank 16ldpi.svg"). They ship as ordinary static
 * assets (same as /public/avatars/ and the keyword icons in BoardCardTile),
 * so we reference them with plain root-relative paths — NOT through
 * resolveAssetUrl, which would rewrite them to the Vercel Blob store they were
 * never uploaded to.
 *
 * The 16 icons are grouped into 4 color CATEGORIES, four icons each:
 *   Iron   -> Rank 1..4
 *   Copper -> Rank 5..8
 *   Silver -> Rank 9..12
 *   Gold   -> Rank 13..16
 *
 * The ranked system (shared/ranked.ts) has 7 named ranks. We fold them onto
 * the 4 categories ("4 tiers = 4 categories"): the category gives the color,
 * and the division (IV/III/II/I) picks which of that category's four icons to
 * show. Division-less elite ranks (Yonko / Pirate King) get fixed top icons.
 *
 * This is display-only. It never feeds the engine or authoritative ranking.
 */

import type { RankedDivision, RankedRankId } from '../../../shared/ranked';

export type RankCategory = 'iron' | 'copper' | 'silver' | 'gold';

export interface RankCategoryStyle {
  /** Human label for the color tier. */
  label: string;
  /** Solid fill applied to the (monochrome) icon silhouette via CSS mask. */
  color: string;
  /**
   * Metallic sheen for the icon: a diagonal gradient with highlight + shadow
   * bands so the masked silhouette reads like brushed/polished metal rather
   * than a flat fill.
   */
  gradient: string;
  /** Softer accent used for the container ring/border. */
  ring: string;
  /** Glow color for the container backdrop. */
  glow: string;
}

export const RANK_CATEGORY_STYLES: Record<RankCategory, RankCategoryStyle> = {
  iron: {
    label: 'Iron',
    color: '#b8c2cf',
    gradient: 'linear-gradient(150deg, #f4f7fa 0%, #c3ccd8 32%, #868f9d 55%, #cfd6df 74%, #6f7885 100%)',
    ring: 'rgba(184,194,207,0.55)',
    glow: 'rgba(184,194,207,0.18)',
  },
  copper: {
    label: 'Copper',
    color: '#d08a4f',
    gradient: 'linear-gradient(150deg, #f7cba3 0%, #d98f54 32%, #9c5a2c 55%, #e2a56d 74%, #7f4620 100%)',
    ring: 'rgba(208,138,79,0.6)',
    glow: 'rgba(208,138,79,0.2)',
  },
  silver: {
    label: 'Silver',
    color: '#dfe7f0',
    gradient: 'linear-gradient(150deg, #ffffff 0%, #dde5ee 32%, #a7b2c1 55%, #eff3f8 74%, #8d99a8 100%)',
    ring: 'rgba(223,231,240,0.6)',
    glow: 'rgba(223,231,240,0.22)',
  },
  gold: {
    label: 'Gold',
    color: '#f4c542',
    gradient: 'linear-gradient(150deg, #fff4c6 0%, #f4cf5a 32%, #c99a24 55%, #ffe793 74%, #a97a1a 100%)',
    ring: 'rgba(244,197,66,0.65)',
    glow: 'rgba(244,197,66,0.25)',
  },
};

/** First (1-indexed) icon number owned by each category. Four icons per tier. */
const CATEGORY_ICON_BASE: Record<RankCategory, number> = {
  iron: 1,
  copper: 5,
  silver: 9,
  gold: 13,
};

/** Which color category each named rank belongs to. */
const RANK_CATEGORY: Record<RankedRankId, RankCategory> = {
  east_blue_rookie: 'iron',
  grand_line_adventurer: 'copper',
  supernova: 'copper',
  warlord: 'silver',
  emperor_commander: 'silver',
  yonko: 'gold',
  pirate_king: 'gold',
};

/**
 * Offset (0..3) within a category's four icons for division-less elite ranks.
 * Yonko sits just below Pirate King (the very top icon).
 */
const ELITE_ICON_OFFSET: Partial<Record<RankedRankId, number>> = {
  yonko: 2,
  pirate_king: 3,
};

function divisionOffset(division: RankedDivision | null | undefined): number {
  switch (division) {
    case 'IV':
      return 0;
    case 'III':
      return 1;
    case 'II':
      return 2;
    case 'I':
      return 3;
    default:
      // Unknown / null division (placement, unranked). Division-less ELITE
      // ranks never reach here — they're routed through ELITE_ICON_OFFSET
      // before divisionOffset is consulted. So this is the lowest icon.
      return 0;
  }
}

export interface ResolvedRankIcon {
  /** 1-based icon number (1..16). */
  iconNumber: number;
  /** Root-relative, URL-encoded path to the SVG. */
  path: string;
  category: RankCategory;
  style: RankCategoryStyle;
}

/**
 * Resolve the icon + category style for a rank/division. Accepts loosely-typed
 * inputs (the profile header sends `rank`/`division` as plain strings, which
 * may be 'placement' or unknown) and always falls back to the lowest icon.
 */
export function resolveRankIcon(
  rank: string | null | undefined,
  division: string | null | undefined,
): ResolvedRankIcon {
  const category = RANK_CATEGORY[rank as RankedRankId] ?? 'iron';
  const base = CATEGORY_ICON_BASE[category];
  const offset =
    ELITE_ICON_OFFSET[rank as RankedRankId] ?? divisionOffset(division as RankedDivision | null);
  const iconNumber = base + Math.max(0, Math.min(3, offset));
  return {
    iconNumber,
    path: rankIconPath(iconNumber),
    category,
    style: RANK_CATEGORY_STYLES[category],
  };
}

/** Build the encoded static path for a given 1-based icon number. */
export function rankIconPath(iconNumber: number): string {
  const clamped = Math.max(1, Math.min(16, Math.round(iconNumber)));
  return encodeURI(`/ui-icons/Ranks/Rank ${clamped}ldpi.svg`);
}
