/**
 * Shared types for effect coverage, triage, and curation-audit metrics.
 * Browser-safe — used by CLI scripts and the debug Coverage Monitor screen.
 */

export interface CatalogCard {
  cardNumber: string;
  setCode: string;
  category: string;
  en: { name: string | null; effectText: string };
}

export type CoverageStatus = 'curated' | 'needsTemplate' | 'vanilla';

export interface CoverageRow {
  setCode: string;
  cardNumber: string;
  name: string;
  category: string;
  status: CoverageStatus;
  /** Assigned in registry but assignment file still has PARTIAL/deferred markers. */
  partialCurated: boolean;
  partialNoteCount: number;
  curatedAbilities: number;
  effectAbilities: number;
  runtimeTriggers: string;
  parserReview: boolean;
  effectText: string;
}

export type PartialCurationKind = 'partial' | 'deferred' | 'dropped' | 'notImplemented' | 'batchNote';

export interface PartialCurationFinding {
  cardNumber: string | null;
  setCode: string;
  name?: string;
  sourceFile: string;
  line: number;
  kind: PartialCurationKind;
  note: string;
  hasAssignment: boolean;
  isStale: boolean;
  effectText?: string;
}

export type AuditCategory = 'type' | 'name' | 'keyword' | 'timing';

export interface AuditFinding {
  cardNumber: string;
  setCode: string;
  name: string;
  category: AuditCategory;
  detail: string;
  effectText: string;
}

export type TriageBucket = 'expressible' | 'needsPrimitive' | 'defer';

export interface TriageRow {
  setCode: string;
  cardNumber: string;
  name: string;
  category: string;
  bucket: TriageBucket;
  capabilities: string[];
  unmappedOps: string[];
  reasons: string[];
  effectText: string;
}

export interface SetMetrics {
  setCode: string;
  curated: number;
  partialCurated: number;
  needsTemplate: number;
  vanilla: number;
  triageExpressible: number;
  triageNeedsPrimitive: number;
  triageDefer: number;
  auditFindings: number;
  partialFindings: number;
  stalePartialNotes: number;
}

export interface EffectMetrics {
  computedAt: string;
  totalCards: number;
  withEffectText: number;
  coverage: {
    curated: number;
    needsTemplate: number;
    vanilla: number;
    curatedPct: number;
  };
  triage: {
    skippedCurated: number;
    analyzed: number;
    expressible: number;
    needsPrimitive: number;
    defer: number;
  };
  audit: {
    scanned: number;
    flaggedCards: number;
    findings: number;
    byCategory: Record<AuditCategory, number>;
  };
  partial: {
    findingCount: number;
    partialCuratedCards: number;
    staleNotes: number;
    unassignedDeferNotes: number;
    byKind: Record<PartialCurationKind, number>;
  };
  bySet: SetMetrics[];
  topReasons: Array<{ reason: string; count: number }>;
  coverageRows: CoverageRow[];
  triageRows: TriageRow[];
  auditFindings: AuditFinding[];
  partialFindings: PartialCurationFinding[];
}
