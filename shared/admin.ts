/**
 * Admin CMS wire contracts, shared by the /admin frontend (src/admin) and
 * the backend admin surface (server/src/adminAuth, server/src/admin).
 * Mirrors shared/auth.ts's shape but is a fully separate identity system —
 * an AdminJwtClaims token is never interchangeable with a player JwtClaims
 * token (different secret, different collection, different claims shape).
 */
import type { BugReportCardSnapshot } from './support';

// ---- admin auth -------------------------------------------------------

export interface PublicAdmin {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  token: string;
  admin: PublicAdmin;
}

export interface AdminJwtClaims {
  sub: string;
  email: string;
  displayName: string;
}

export type AdminErrorCode = 'VALIDATION' | 'INVALID_CREDENTIALS' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

export interface AdminApiErrorBody {
  error: string;
  code: AdminErrorCode;
  details?: unknown;
}

// ---- player data --------------------------------------------------------

export interface AdminPlayerSummary {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  moderationStatus: 'active' | 'warned' | 'suspended' | 'deleted';
  lastActiveAt: string | null;
}

export interface AdminPlayerListPage {
  players: AdminPlayerSummary[];
  nextCursor: string | null;
}

export interface AdminPlayerDetail extends AdminPlayerSummary {
  displayName: string;
  region: string | null;
  favoriteLeaderCardNumber: string | null;
}

export interface AdminPlayerDeckSummary {
  deckId: string;
  name: string;
  leaderName: string | null;
  colors: string[];
  /** Where this snapshot came from — casual/local-hotseat decks are never seen by the server at all (see playerAdminService.ts doc comment). */
  source: 'featured' | 'ranked-match-snapshot';
  capturedAt: string;
}

export interface BanPlayerRequest {
  reason: string;
}

// ---- feature flags --------------------------------------------------------

export interface AdminFeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateFeatureFlagRequest {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface UpdateFeatureFlagRequest {
  label?: string;
  description?: string;
  enabled?: boolean;
}

// ---- home banners -----------------------------------------------------

export interface AdminHomeBanner {
  id: string;
  title: string;
  caption: string;
  imageUrl: string | null;
  linkUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveHomeBannerRequest {
  title: string;
  caption: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  active: boolean;
  sortOrder: number;
}

/** Public, unauthenticated shape served at GET /banners for the home screen — never includes updatedBy/createdAt admin metadata. */
export interface PublicHomeBanner {
  id: string;
  title: string;
  caption: string;
  imageUrl: string | null;
  linkUrl: string | null;
}

// ---- card legality overrides -------------------------------------------

export type CardLegalityStatus = 'legal' | 'extraLegal' | 'banned';

export interface AdminCardLegalityOverride {
  cardNumber: string;
  status: CardLegalityStatus;
  note: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface SetCardLegalityOverrideRequest {
  status: CardLegalityStatus;
  note?: string | null;
}

// ---- bug report admin view ---------------------------------------------

export type BugReportStatus = 'open' | 'triaged' | 'resolved' | 'wont_fix';
export type BugReportValidity = 'unreviewed' | 'valid' | 'invalid';

/** Row shape for the admin list table — deliberately excludes the full log (fetched separately per-report; a match's log can be a few hundred entries). */
export interface AdminBugReportSummary {
  id: string;
  reporterUserId: string;
  reporterUsername: string | null;
  description: string;
  matchMode: string;
  createdAt: string;
  clientVersion: string | null;
  validity: BugReportValidity;
  status: BugReportStatus;
  logEntryCount: number;
  /** From the reporter's selected-card snapshot (BugReportCardSnapshot), if any — both null when no card was selected. */
  selectedCardNumber: string | null;
  selectedCardName: string | null;
}

export interface AdminBugReportListPage {
  reports: AdminBugReportSummary[];
  nextCursor: string | null;
}

export interface AdminBugReportDetail extends AdminBugReportSummary {
  matchId: string | null;
  turnNumber: number;
  phase: string;
  /** Was a hand-duplicated inline type; now reuses BugReportCardSnapshot directly (shared/support.ts) so a new field there (e.g. selectedEffectText) can't silently drift out of sync here. */
  selectedCard: BugReportCardSnapshot | null;
  log: unknown[]; // GameLogEntry[] — kept opaque here (admin/net client doesn't need the engine's log type, just to render it generically)
}

export interface UpdateBugReportRequest {
  status?: BugReportStatus;
  validity?: BugReportValidity;
}
