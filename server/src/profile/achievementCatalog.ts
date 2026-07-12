/**
 * Achievement definitions. Same "hand-authored catalog, not a DB
 * collection" pattern as cosmeticCatalog.ts / shared/ranked.ts's
 * RANKED_RANKS. Every achievement here is evaluated in achievementService
 * against REAL data (matchHistory, rankedProfiles, saved-deck counts
 * reported by the client) — there is no seed/demo data that marks these
 * complete for a fresh account (project rule: never fake completed
 * achievements).
 */
import type { AchievementDefinition } from '../../../shared/profile';

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  { id: 'first_win', name: 'First Blood', description: 'Win your first match.', icon: 'sword', category: 'match_milestones', targetValue: 1, rarity: 'common', hidden: false, seasonal: false, reward: 'badge_first_win' },
  { id: 'ten_wins', name: 'Getting Started', description: 'Win 10 matches.', icon: 'sword', category: 'match_milestones', targetValue: 10, rarity: 'common', hidden: false, seasonal: false, reward: null },
  { id: 'twentyfive_wins', name: 'Duelist', description: 'Win 25 matches.', icon: 'sword', category: 'match_milestones', targetValue: 25, rarity: 'uncommon', hidden: false, seasonal: false, reward: 'title_duelist' },
  { id: 'hundred_wins', name: 'Veteran Pirate', description: 'Win 100 matches.', icon: 'sword', category: 'match_milestones', targetValue: 100, rarity: 'rare', hidden: false, seasonal: false, reward: null },

  { id: 'ten_matches', name: 'Setting Sail', description: 'Play 10 matches, lifetime.', icon: 'ship', category: 'match_milestones', targetValue: 10, rarity: 'common', hidden: false, seasonal: false, reward: 'frame_bronze' },
  { id: 'fifty_matches', name: 'Seasoned Sailor', description: 'Play 50 matches, lifetime.', icon: 'ship', category: 'match_milestones', targetValue: 50, rarity: 'uncommon', hidden: false, seasonal: false, reward: 'frame_silver' },
  { id: 'two_hundred_matches', name: 'Grand Line Veteran', description: 'Play 200 matches, lifetime.', icon: 'ship', category: 'match_milestones', targetValue: 200, rarity: 'rare', hidden: false, seasonal: false, reward: 'frame_gold' },

  { id: 'win_streak_5', name: 'On a Roll', description: 'Win 5 matches in a row.', icon: 'flame', category: 'match_milestones', targetValue: 5, rarity: 'uncommon', hidden: false, seasonal: false, reward: 'badge_win_streak' },
  { id: 'win_streak_10', name: 'Unstoppable', description: 'Win 10 matches in a row.', icon: 'flame', category: 'match_milestones', targetValue: 10, rarity: 'rare', hidden: false, seasonal: false, reward: null },

  { id: 'placement_complete', name: 'Placement Voyage', description: 'Complete your ranked placement matches.', icon: 'compass', category: 'ranked', targetValue: 1, rarity: 'common', hidden: false, seasonal: true, reward: 'avatar_log_pose' },
  { id: 'reach_supernova', name: 'Supernova', description: 'Reach Supernova rank in a season.', icon: 'star', category: 'ranked', targetValue: 1, rarity: 'rare', hidden: false, seasonal: true, reward: 'avatar_supernova' },
  { id: 'reach_yonko', name: 'Yonko', description: 'Reach Yonko rank in a season.', icon: 'crown', category: 'ranked', targetValue: 1, rarity: 'epic', hidden: false, seasonal: true, reward: null },
  { id: 'reach_pirate_king', name: 'Pirate King', description: 'Reach Pirate King rank in a season.', icon: 'treasure', category: 'ranked', targetValue: 1, rarity: 'legendary', hidden: false, seasonal: true, reward: 'title_pirate_king' },

  { id: 'save_5_decks', name: 'Deck Architect', description: 'Have 5 saved decks at once.', icon: 'cards', category: 'deck_building', targetValue: 5, rarity: 'uncommon', hidden: false, seasonal: false, reward: 'title_deck_architect' },

  { id: 'add_first_friend', name: 'Crew Mate', description: 'Add your first friend.', icon: 'handshake', category: 'social', targetValue: 1, rarity: 'common', hidden: false, seasonal: false, reward: null },
];

export function findAchievementDefinition(id: string): AchievementDefinition | null {
  return ACHIEVEMENT_CATALOG.find((entry) => entry.id === id) ?? null;
}
