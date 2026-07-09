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
  curatedAbilities: number;
  effectAbilities: number;
  runtimeTriggers: string;
  parserReview: boolean;
  effectText: string;
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
  needsTemplate: number;
  vanilla: number;
  triageExpressible: number;
  triageNeedsPrimitive: number;
  triageDefer: number;
  auditFindings: number;
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
  bySet: SetMetrics[];
  topReasons: Array<{ reason: string; count: number }>;
  coverageRows: CoverageRow[];
  triageRows: TriageRow[];
  auditFindings: AuditFinding[];
}
