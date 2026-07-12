/**
 * The cosmetics catalog — source of truth for what a CosmeticDefinition.id
 * even means, mirroring shared/ranked.ts's RANKED_RANKS constant pattern
 * (a small hand-authored table, not a database collection, since these are
 * game-content definitions that ship with the client/server build, not
 * player data).
 *
 * Ownership (which ids a given player HAS) lives in Mongo
 * (CosmeticInventoryDocument.ownedItemIds); this file only defines what
 * exists and how it can be unlocked. Equip validation
 * (cosmeticService.equip) always checks a requested id against BOTH this
 * catalog (does the item exist / is its slot correct) AND the player's
 * inventory (do they actually own it) — never trusts the client.
 */
import type { CosmeticDefinition } from '../../../shared/profile';

export const COSMETIC_CATALOG: CosmeticDefinition[] = [
  // Avatars — default set, unlocked for everyone at profile creation.
  { id: 'avatar_straw_hat', type: 'avatar', name: 'Straw Hat', description: 'The mark of a rookie setting sail.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'straw-hat' },
  { id: 'avatar_den_den_mushi', type: 'avatar', name: 'Den Den Mushi', description: 'Stay connected across the Grand Line.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'den-den-mushi' },
  { id: 'avatar_jolly_roger', type: 'avatar', name: 'Jolly Roger', description: 'Fly your own flag.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'jolly-roger' },
  { id: 'avatar_log_pose', type: 'avatar', name: 'Log Pose', description: 'Awarded for completing your first ranked season.', rarity: 'uncommon', unlockSource: 'season_reward', unlockRequirement: 'Complete a ranked season', icon: 'log-pose' },
  { id: 'avatar_supernova', type: 'avatar', name: 'Supernova', description: 'Reach Supernova rank in a season.', rarity: 'rare', unlockSource: 'season_reward', unlockRequirement: 'Reach Supernova this season', icon: 'supernova' },

  // Banners
  { id: 'banner_east_blue', type: 'banner', name: 'East Blue Waters', description: 'Where every voyage begins.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'east-blue' },
  { id: 'banner_grand_line', type: 'banner', name: 'Grand Line Storm', description: 'Earned by entering the Grand Line ranks.', rarity: 'uncommon', unlockSource: 'season_reward', unlockRequirement: 'Reach Grand Line Adventurer this season', icon: 'grand-line' },
  { id: 'banner_new_world', type: 'banner', name: 'New World Horizon', description: "Reserved for the Grand Line's finest.", rarity: 'epic', unlockSource: 'season_reward', unlockRequirement: 'Reach Emperor Commander this season', icon: 'new-world' },

  // Frames
  { id: 'frame_bronze', type: 'frame', name: 'Bronze Frame', description: 'Complete 10 matches.', rarity: 'common', unlockSource: 'achievement', unlockRequirement: 'Milestone: 10 lifetime matches', icon: 'frame-bronze' },
  { id: 'frame_silver', type: 'frame', name: 'Silver Frame', description: 'Complete 50 matches.', rarity: 'uncommon', unlockSource: 'achievement', unlockRequirement: 'Milestone: 50 lifetime matches', icon: 'frame-silver' },
  { id: 'frame_gold', type: 'frame', name: 'Gold Frame', description: 'Complete 200 matches.', rarity: 'rare', unlockSource: 'achievement', unlockRequirement: 'Milestone: 200 lifetime matches', icon: 'frame-gold' },

  // Titles
  { id: 'title_rookie_pirate', type: 'title', name: 'Rookie Pirate', description: 'Everyone starts somewhere.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'title-rookie' },
  { id: 'title_deck_architect', type: 'title', name: 'Deck Architect', description: 'Save 5 decks.', rarity: 'uncommon', unlockSource: 'achievement', unlockRequirement: 'Milestone: 5 saved decks', icon: 'title-architect' },
  { id: 'title_duelist', type: 'title', name: 'Duelist', description: 'Win 25 matches.', rarity: 'uncommon', unlockSource: 'achievement', unlockRequirement: 'Milestone: 25 wins', icon: 'title-duelist' },
  { id: 'title_pirate_king', type: 'title', name: 'Pirate King', description: 'Reach Pirate King rank.', rarity: 'legendary', unlockSource: 'season_reward', unlockRequirement: 'Reach Pirate King this season', icon: 'title-pirate-king' },

  // Badges
  { id: 'badge_first_win', type: 'badge', name: 'First Blood', description: 'Win your first match.', rarity: 'common', unlockSource: 'achievement', unlockRequirement: 'Milestone: first win', icon: 'badge-first-win' },
  { id: 'badge_win_streak', type: 'badge', name: 'On a Roll', description: 'Win 5 matches in a row.', rarity: 'uncommon', unlockSource: 'achievement', unlockRequirement: 'Milestone: 5-match win streak', icon: 'badge-streak' },

  // Card backs
  { id: 'cardback_default', type: 'card_back', name: 'Standard Back', description: 'The classic card back.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'cardback-default' },
  { id: 'cardback_east_blue', type: 'card_back', name: 'East Blue Sleeve', description: 'Ranked reward — East Blue Rookie.', rarity: 'common', unlockSource: 'season_reward', unlockRequirement: 'Reach East Blue Rookie this season', icon: 'cardback-east-blue' },
  { id: 'cardback_warlord', type: 'card_back', name: 'Warlord Sleeve', description: 'Ranked reward — Warlord.', rarity: 'rare', unlockSource: 'season_reward', unlockRequirement: 'Reach Warlord this season', icon: 'cardback-warlord' },

  // Board skins
  { id: 'boardskin_default', type: 'board_skin', name: 'Standard Table', description: 'The default playmat.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'board-default' },

  // Match intro / victory effects / emotes — catalog entries exist so the
  // Cosmetics section has real (if currently locked) items to show; nothing
  // grants these yet (project rule: no fake completed/owned items).
  { id: 'intro_default', type: 'match_intro_effect', name: 'Standard Entrance', description: 'The default match intro.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'intro-default' },
  { id: 'victory_default', type: 'victory_effect', name: 'Standard Victory', description: 'The default victory flourish.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'victory-default' },
  { id: 'emotes_default', type: 'emote_set', name: 'Starter Emotes', description: 'A basic emote set.', rarity: 'common', unlockSource: 'default', unlockRequirement: null, icon: 'emotes-default' },
];

export const DEFAULT_OWNED_COSMETIC_IDS: string[] = COSMETIC_CATALOG.filter((item) => item.unlockSource === 'default').map((item) => item.id);

export function findCosmeticDefinition(id: string): CosmeticDefinition | null {
  return COSMETIC_CATALOG.find((item) => item.id === id) ?? null;
}
