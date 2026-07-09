/**
 * Compute effect coverage, triage, and curation-audit metrics from a card catalog.
 * Pure data — safe to run in the browser or CLI scripts.
 */
import { parseEffect } from '../effectParser';
import { isStaticEngineKeywordOnly } from '../effectParser/staticKeywordOnly';
import { CURATED_EFFECT_PROGRAMS } from '../effectTemplates';
import { classifyTriage } from '../effectTemplates/catalog/capability/triage';
import { auditCuratedCard, emptyAuditByCategory } from './curationAudit';
import { classifyCoverage } from './coverage';
import {
  emptyPartialByKind,
  enrichPartialFindings,
  partialCardNumberSet,
  scanPartialCurations,
  type AssignmentSourceFile,
} from './partialCurationScan';
import type { AuditCategory, CatalogCard, EffectMetrics, PartialCurationFinding, SetMetrics, TriageRow } from './types';

export interface ComputeEffectMetricsOptions {
  assignmentSources?: AssignmentSourceFile[];
}

function emptySetMetrics(setCode: string): SetMetrics {
  return {
    setCode,
    curated: 0,
    partialCurated: 0,
    needsTemplate: 0,
    vanilla: 0,
    triageExpressible: 0,
    triageNeedsPrimitive: 0,
    triageDefer: 0,
    auditFindings: 0,
    partialFindings: 0,
    stalePartialNotes: 0,
  };
}

/** Build full metrics snapshot from deduplicated catalog cards. */
export function computeEffectMetrics(cards: CatalogCard[], options: ComputeEffectMetricsOptions = {}): EffectMetrics {
  const sorted = [...cards].sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
  const byNumber = new Map(sorted.map((c) => [c.cardNumber, c]));

  const rawPartialFindings = options.assignmentSources?.length
    ? scanPartialCurations(options.assignmentSources)
    : [];
  const partialFindings: PartialCurationFinding[] = enrichPartialFindings(rawPartialFindings, byNumber);
  const partialCards = partialCardNumberSet(partialFindings);
  const partialNoteCounts = new Map<string, number>();
  for (const f of partialFindings) {
    if (!f.cardNumber || !f.hasAssignment || f.kind === 'batchNote' || f.kind === 'notImplemented') continue;
    partialNoteCounts.set(f.cardNumber, (partialNoteCounts.get(f.cardNumber) ?? 0) + 1);
  }

  const coverageRows = sorted.map((c) => classifyCoverage(c, partialCards, partialNoteCounts));
  const triageRows: TriageRow[] = [];
  const auditFindings = [];
  const bySet = new Map<string, SetMetrics>();
  const reasonTally = new Map<string, number>();

  let withEffectText = 0;
  let coverageCurated = 0;
  let coverageNeedsTemplate = 0;
  let coverageVanilla = 0;
  let triageSkippedCurated = 0;
  let triageExpressible = 0;
  let triageNeedsPrimitive = 0;
  let triageDefer = 0;
  let auditScanned = 0;
  const auditByCategory = emptyAuditByCategory();
  const flaggedCards = new Set<string>();
  const partialByKind = emptyPartialByKind();
  let partialCuratedCards = 0;
  let stalePartialNotes = 0;
  let unassignedDeferNotes = 0;

  for (const f of partialFindings) {
    partialByKind[f.kind]++;
    const setRow = bySet.get(f.setCode) ?? emptySetMetrics(f.setCode);
    setRow.partialFindings++;
    if (f.isStale) {
      stalePartialNotes++;
      setRow.stalePartialNotes++;
    }
    if (f.kind === 'notImplemented' && !f.hasAssignment) unassignedDeferNotes++;
    bySet.set(f.setCode, setRow);
  }
  partialCuratedCards = partialCards.size;

  for (const row of coverageRows) {
    const setRow = bySet.get(row.setCode) ?? emptySetMetrics(row.setCode);
    if (row.status === 'curated') {
      coverageCurated++;
      setRow.curated++;
      if (row.partialCurated) setRow.partialCurated++;
    } else if (row.status === 'needsTemplate') {
      coverageNeedsTemplate++;
      setRow.needsTemplate++;
    } else {
      coverageVanilla++;
      setRow.vanilla++;
    }
    bySet.set(row.setCode, setRow);

    const text = row.effectText;
    if (!text.trim()) continue;
    withEffectText++;

    if (CURATED_EFFECT_PROGRAMS[row.cardNumber] || isStaticEngineKeywordOnly(text)) {
      triageSkippedCurated++;
    } else {
      const card = byNumber.get(row.cardNumber)!;
      const parsed = parseEffect(card.cardNumber, text);
      const verdict = classifyTriage(parsed, text);
      triageRows.push({
        setCode: card.setCode,
        cardNumber: card.cardNumber,
        name: card.en?.name ?? '',
        category: card.category,
        bucket: verdict.bucket,
        capabilities: verdict.capabilities,
        unmappedOps: verdict.unmappedOps,
        reasons: verdict.reasons,
        effectText: text,
      });

      if (verdict.bucket === 'expressible') triageExpressible++;
      else if (verdict.bucket === 'needsPrimitive') triageNeedsPrimitive++;
      else triageDefer++;

      const setTriage = bySet.get(card.setCode) ?? emptySetMetrics(card.setCode);
      if (verdict.bucket === 'expressible') setTriage.triageExpressible++;
      else if (verdict.bucket === 'needsPrimitive') setTriage.triageNeedsPrimitive++;
      else setTriage.triageDefer++;
      bySet.set(card.setCode, setTriage);

      for (const r of verdict.reasons) reasonTally.set(r, (reasonTally.get(r) ?? 0) + 1);
    }
  }

  for (const [cardNumber, program] of Object.entries(CURATED_EFFECT_PROGRAMS)) {
    const card = byNumber.get(cardNumber);
    if (!card?.en?.effectText?.trim()) continue;
    auditScanned++;
    const findings = auditCuratedCard(card, program);
    for (const f of findings) {
      auditFindings.push(f);
      auditByCategory[f.category as AuditCategory]++;
      flaggedCards.add(f.cardNumber);
      const setRow = bySet.get(card.setCode) ?? emptySetMetrics(card.setCode);
      setRow.auditFindings++;
      bySet.set(card.setCode, setRow);
    }
  }

  auditFindings.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber) || a.category.localeCompare(b.category));
  triageRows.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));

  const topReasons = [...reasonTally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([reason, count]) => ({ reason, count }));

  const curatedPct = withEffectText > 0 ? Math.round((coverageCurated / withEffectText) * 1000) / 10 : 0;

  return {
    computedAt: new Date().toISOString(),
    totalCards: sorted.length,
    withEffectText,
    coverage: {
      curated: coverageCurated,
      needsTemplate: coverageNeedsTemplate,
      vanilla: coverageVanilla,
      curatedPct,
    },
    triage: {
      skippedCurated: triageSkippedCurated,
      analyzed: triageExpressible + triageNeedsPrimitive + triageDefer,
      expressible: triageExpressible,
      needsPrimitive: triageNeedsPrimitive,
      defer: triageDefer,
    },
    audit: {
      scanned: auditScanned,
      flaggedCards: flaggedCards.size,
      findings: auditFindings.length,
      byCategory: auditByCategory,
    },
    partial: {
      findingCount: partialFindings.length,
      partialCuratedCards,
      staleNotes: stalePartialNotes,
      unassignedDeferNotes,
      byKind: partialByKind,
    },
    bySet: [...bySet.values()].sort((a, b) => a.setCode.localeCompare(b.setCode)),
    topReasons,
    coverageRows,
    triageRows,
    auditFindings,
    partialFindings,
  };
}
