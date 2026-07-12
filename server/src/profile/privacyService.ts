/**
 * Central, server-side privacy filter. EVERY response that can be seen by
 * someone other than the profile owner must pass through here — this is
 * the one place that decides "can THIS viewer see THAT field", so a route
 * handler can never accidentally leak private data by forgetting a check
 * (project rule: "do not fetch private data and merely hide it with
 * frontend CSS").
 *
 * Pure functions only — no I/O — so relationship state (are they friends,
 * is one blocking the other) is resolved by the caller (socialService) and
 * passed in, keeping this module trivially unit-testable.
 */
import type { ProfilePrivacySettings, ProfileVisibility, SocialRelationship } from '../../../shared/profile';

export interface ViewerContext {
  /** True when the viewer IS the profile owner — bypasses every visibility check. */
  isOwner: boolean;
  relationship: SocialRelationship;
}

export function canView(setting: ProfileVisibility, viewer: ViewerContext): boolean {
  if (viewer.isOwner) return true;
  switch (setting) {
    case 'public':
      return true;
    case 'friends':
      return viewer.relationship === 'friends';
    case 'private':
      return false;
    default:
      return false;
  }
}

export interface SectionVisibility {
  overview: boolean;
  ranked: boolean;
  matchHistory: boolean;
  deckShowcase: boolean;
  statistics: boolean;
  achievements: boolean;
  cosmetics: boolean;
  social: boolean;
  onlineStatus: boolean;
  region: boolean;
  friendsList: boolean;
  recentOpponents: boolean;
}

/**
 * A blocked/blocking relationship always wins over every other visibility
 * setting — you cannot use a public profile setting to route around a
 * block. Applied first, before any of the granular per-section checks.
 */
export function isProfileBlockedForViewer(viewer: ViewerContext): boolean {
  return viewer.relationship === 'blocked_by_viewer' || viewer.relationship === 'blocking_viewer';
}

export function resolveSectionVisibility(privacy: ProfilePrivacySettings, viewer: ViewerContext): SectionVisibility {
  // The whole-profile switch gates everything else — a private profile
  // shows nothing to a non-owner regardless of granular per-section values.
  const profileVisible = viewer.isOwner || canView(privacy.profileVisibility, viewer);

  const gate = (setting: ProfileVisibility): boolean => profileVisible && canView(setting, viewer);

  return {
    overview: profileVisible,
    ranked: gate(privacy.rankedStatsVisibility),
    matchHistory: gate(privacy.matchHistoryVisibility),
    deckShowcase: gate(privacy.deckVisibility),
    statistics: gate(privacy.rankedStatsVisibility) || gate(privacy.casualStatsVisibility),
    achievements: gate(privacy.achievementVisibility),
    cosmetics: profileVisible, // equipped cosmetics are always part of the header/overview once the profile itself is visible
    social: profileVisible,
    onlineStatus: gate(privacy.onlineStatusVisibility),
    region: gate(privacy.regionVisibility),
    friendsList: gate(privacy.friendsListVisibility),
    recentOpponents: gate(privacy.recentOpponentsVisibility),
  };
}

export function isProfileVisibleAtAll(privacy: ProfilePrivacySettings, viewer: ViewerContext): boolean {
  if (isProfileBlockedForViewer(viewer)) return false;
  return viewer.isOwner || canView(privacy.profileVisibility, viewer);
}
