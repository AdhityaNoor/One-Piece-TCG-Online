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
import type { AuditCategory, CatalogCard, EffectMetrics, SetMetrics, TriageRow } from './types';

function emptySetMetrics(setCode: string): SetMetrics {
  return {
    setCode,
    curated: 0,
    needsTemplate: 0,
    vanilla: 0,
    triageExpressible: 0,
    triageNeedsPrimitive: 0,
    triageDefer: 0,
    auditFindings: 0,
  };
}

/** Build full metrics snapshot from deduplicated catalog cards. */
export function computeEffectMetrics(cards: CatalogCard[]): EffectMetrics {
  const sorted = [...cards].sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
  const byNumber = new Map(sorted.map((c) => [c.cardNumber, c]));

  const coverageRows = sorted.map(classifyCoverage);
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

  for (const row of coverageRows) {
    const setRow = bySet.get(row.setCode) ?? emptySetMetrics(row.setCode);
    if (row.status === 'curated') {
      coverageCurated++;
      setRow.curated++;
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
    bySet: [...bySet.values()].sort((a, b) => a.setCode.localeCompare(b.setCode)),
    topReasons,
    coverageRows,
    triageRows,
    auditFindings,
  };
}
