/**
 * Debug screen — live effect coverage, triage, and curation-audit metrics.
 * Recomputes from the local card catalog + curated registry at runtime.
 */
import { useMemo, useState } from 'react';
import { CanvasMenuButton, GameCanvasScreen } from '../components';
import { useEffectCoverageMetrics } from '../hooks/useEffectCoverageMetrics';
import { useNavigationStore } from '../store/navigationStore';
import type { AuditFinding, CoverageRow, PartialCurationFinding, SetMetrics, TriageRow } from '../../cards/devMetrics';

type Tab = 'overview' | 'coverage' | 'partials' | 'triage' | 'audit';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  coverage: 'Coverage',
  partials: 'Partials',
  triage: 'Triage',
  audit: 'Audit',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="op-card-well p-3">
      <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{label}</p>
      <p className="mt-1 font-display text-2xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.55)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-200/60">{sub}</p>}
    </div>
  );
}

function pct(n: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((n / total) * 1000) / 10}%`;
}

function tabButtonClass(active: boolean): string {
  return [
    'border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all',
    active ? 'border-gold/60 bg-gold/12 text-gold' : 'border-white/8 bg-white/4 text-white/70 hover:border-white/18 hover:bg-white/8',
  ].join(' ');
}

export function CoverageMonitorScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const { status, error, metrics, refresh } = useEffectCoverageMetrics();
  const [tab, setTab] = useState<Tab>('overview');
  const [setFilter, setSetFilter] = useState('');
  const [query, setQuery] = useState('');

  const sets = useMemo(() => {
    if (!metrics) return [];
    return [...new Set(metrics.bySet.map((s) => s.setCode))].sort();
  }, [metrics]);

  const normalizedQuery = query.trim().toUpperCase();

  function matchesFilters(row: { setCode: string; cardNumber: string; name: string }): boolean {
    if (setFilter && row.setCode !== setFilter) return false;
    if (!normalizedQuery) return true;
    return (
      row.cardNumber.toUpperCase().includes(normalizedQuery) ||
      row.name.toUpperCase().includes(normalizedQuery)
    );
  }

  const filteredSetMetrics = useMemo(() => {
    if (!metrics) return [];
    return metrics.bySet.filter((s) => !setFilter || s.setCode === setFilter);
  }, [metrics, setFilter]);

  const filteredCoverage = useMemo(() => {
    if (!metrics) return [];
    return metrics.coverageRows.filter(matchesFilters);
  }, [metrics, setFilter, normalizedQuery]);

  const filteredTriage = useMemo(() => {
    if (!metrics) return [];
    return metrics.triageRows.filter(matchesFilters);
  }, [metrics, setFilter, normalizedQuery]);

  const filteredAudit = useMemo(() => {
    if (!metrics) return [];
    return metrics.auditFindings.filter(matchesFilters);
  }, [metrics, setFilter, normalizedQuery]);

  const filteredPartial = useMemo(() => {
    if (!metrics) return [];
    return metrics.partialFindings.filter((f) => {
      if (setFilter && f.setCode !== setFilter) return false;
      if (!normalizedQuery) return true;
      return (
        (f.cardNumber?.toUpperCase().includes(normalizedQuery) ?? false) ||
        (f.name?.toUpperCase().includes(normalizedQuery) ?? false) ||
        f.note.toUpperCase().includes(normalizedQuery)
      );
    });
  }, [metrics, setFilter, normalizedQuery]);

  const statusLine = metrics
    ? `${metrics.coverage.curatedPct}% curated · ${metrics.partial.partialCuratedCards} partial · ${metrics.coverage.needsTemplate} need templates`
    : status === 'loading'
      ? 'Computing…'
      : 'Awaiting catalog';

  return (
    <GameCanvasScreen
      kicker="Debug"
      status={statusLine}
      title="Coverage"
      onBack={goBack}
      topRight={
        <CanvasMenuButton
          label="Refresh"
          size="sm"
          onClick={refresh}
          disabled={status === 'loading'}
          className="max-w-[8rem]"
        />
      }
    >
      <div className="grid h-full min-h-0 gap-3 overflow-hidden xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-hidden">
          <section className="op-panel flex h-full min-h-0 flex-col overflow-hidden p-3">
            <p className="op-section-title">Controls</p>
            <p className="mt-2 text-xs leading-5 text-slate-200/65">
              Live metrics from the curated registry. Mirrors{' '}
              <code className="rounded bg-black/35 px-1 py-0.5 text-[10px] text-gold/80">npm run coverage</code>,{' '}
              <code className="rounded bg-black/35 px-1 py-0.5 text-[10px] text-gold/80">triage</code>, and{' '}
              <code className="rounded bg-black/35 px-1 py-0.5 text-[10px] text-gold/80">audit:curation</code>,{' '}
              <code className="rounded bg-black/35 px-1 py-0.5 text-[10px] text-gold/80">scan:partials</code>.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {(['overview', 'coverage', 'partials', 'triage', 'audit'] as Tab[]).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={tabButtonClass(tab === t)}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Set</label>
                <select
                  value={setFilter}
                  onChange={(e) => setSetFilter(e.target.value)}
                  className="op-input mt-1.5 w-full px-3 py-2 text-sm"
                >
                  <option value="">All sets</option>
                  {sets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Search</label>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Card ID or name…"
                  className="op-input mt-1.5 w-full px-3 py-2 text-sm placeholder:text-slate-300/35"
                />
              </div>
            </div>

            {metrics && (
              <p className="mt-auto pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                Updated {new Date(metrics.computedAt).toLocaleString()}
              </p>
            )}
          </section>
        </aside>

        <section className="op-panel flex min-h-0 flex-col overflow-hidden p-3">
          <p className="op-section-title">{TAB_LABELS[tab]}</p>

          {status === 'loading' && (
            <p className="mt-3 text-sm text-slate-200/70">Computing metrics from catalog…</p>
          )}
          {status === 'error' && (
            <p className="mt-3 rounded border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">
              {error ?? 'Failed to load metrics.'}
            </p>
          )}

          {metrics && (
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {tab === 'overview' && <OverviewTab metrics={metrics} setRows={filteredSetMetrics} />}
              {tab === 'coverage' && <CoverageTab rows={filteredCoverage} />}
              {tab === 'partials' && <PartialsTab rows={filteredPartial} partialCards={metrics.partial.partialCuratedCards} />}
              {tab === 'triage' && <TriageTab rows={filteredTriage} topReasons={metrics.topReasons} />}
              {tab === 'audit' && <AuditTab rows={filteredAudit} flagged={metrics.audit.flaggedCards} />}
            </div>
          )}
        </section>
      </div>
    </GameCanvasScreen>
  );
}

function OverviewTab({ metrics, setRows }: { metrics: NonNullable<ReturnType<typeof useEffectCoverageMetrics>['metrics']>; setRows: SetMetrics[] }) {
  const { coverage, triage, audit, partial, withEffectText } = metrics;
  const fullyCurated = coverage.curated - partial.partialCuratedCards;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Curated" value={coverage.curated} sub={`${coverage.curatedPct}% of ${withEffectText} with text`} />
        <StatCard label="Partial curated" value={partial.partialCuratedCards} sub={`${fullyCurated} fully done`} />
        <StatCard label="Needs template" value={coverage.needsTemplate} sub={pct(coverage.needsTemplate, withEffectText)} />
        <StatCard
          label="Audit flags"
          value={audit.flaggedCards}
          sub={audit.findings === 0 ? 'clean' : `${audit.findings} findings`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard label="Triage backlog" value={triage.analyzed} sub={`${triage.expressible} expressible`} />
        <StatCard label="Partial markers" value={partial.findingCount} sub={`${partial.staleNotes} stale notes`} />
        <StatCard label="Unassigned defer" value={partial.unassignedDeferNotes} sub="NOTE without assignment" />
      </div>

      <div className="op-card-well p-3">
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Triage buckets (uncurated)</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded border border-emerald-400/25 bg-emerald-950/35 p-2 text-emerald-100">
            <span className="block text-lg font-black">{triage.expressible}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200/70">expressible</span>
          </div>
          <div className="rounded border border-amber-400/25 bg-amber-950/35 p-2 text-amber-100">
            <span className="block text-lg font-black">{triage.needsPrimitive}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-200/70">needs primitive</span>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-2 text-slate-200">
            <span className="block text-lg font-black">{triage.defer}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">defer</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-white/40">{triage.skippedCurated} cards skipped (already curated or static keyword).</p>
      </div>

      {metrics.topReasons.length > 0 && (
        <div className="op-card-well p-3">
          <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Top triage blockers</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {metrics.topReasons.slice(0, 8).map((r) => (
              <li key={r.reason} className="flex justify-between gap-2 border-b border-white/6 pb-1.5 text-slate-200/85 last:border-0">
                <span>{r.reason}</span>
                <span className="font-mono text-gold/70">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SetBreakdownTable rows={setRows} />
    </div>
  );
}

function SetBreakdownTable({ rows }: { rows: SetMetrics[] }) {
  return (
    <div className="op-card-well overflow-hidden">
      <div className="border-b border-white/8 px-3 py-2">
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">By set</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead className="bg-black/30 text-white/45">
            <tr>
              <th className="px-3 py-2 font-bold uppercase tracking-wider">Set</th>
              <th className="px-2 py-2 text-right">Curated</th>
              <th className="px-2 py-2 text-right">Partial</th>
              <th className="px-2 py-2 text-right">Needs</th>
              <th className="px-2 py-2 text-right">Expr.</th>
              <th className="px-2 py-2 text-right">Prim.</th>
              <th className="px-2 py-2 text-right">Defer</th>
              <th className="px-2 py-2 text-right">Audit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.setCode} className="border-t border-white/6 text-white/85">
                <td className="px-3 py-2 font-mono text-gold/80">{s.setCode}</td>
                <td className="px-2 py-2 text-right tabular-nums">{s.curated}</td>
                <td className="px-2 py-2 text-right tabular-nums text-orange-200/90">{s.partialCurated || '—'}</td>
                <td className="px-2 py-2 text-right tabular-nums text-amber-200/90">{s.needsTemplate}</td>
                <td className="px-2 py-2 text-right tabular-nums text-emerald-200/80">{s.triageExpressible}</td>
                <td className="px-2 py-2 text-right tabular-nums">{s.triageNeedsPrimitive}</td>
                <td className="px-2 py-2 text-right tabular-nums text-white/50">{s.triageDefer}</td>
                <td className="px-2 py-2 text-right tabular-nums text-red-200/80">{s.auditFindings || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PartialsTab({ rows, partialCards }: { rows: PartialCurationFinding[]; partialCards: number }) {
  const assigned = rows.filter((f) => f.cardNumber && f.hasAssignment && f.kind !== 'batchNote');
  return (
    <CardTable
      title={`Partial / deferred markers (${assigned.length} on assigned cards; ${partialCards} unique cards)`}
      empty="No PARTIAL/deferred markers for this filter."
      headers={['Card', 'Set', 'Kind', 'Stale', 'Note']}
      rows={assigned.slice(0, 300).map((f) => [
        f.cardNumber ?? '—',
        f.setCode,
        f.kind,
        f.isStale ? 'yes' : '—',
        truncate(f.note, 140),
      ])}
      footnote={assigned.length > 300 ? `Showing first 300 of ${assigned.length} rows.` : undefined}
    />
  );
}

function CoverageTab({ rows }: { rows: CoverageRow[] }) {
  const backlog = rows.filter((r) => r.status === 'needsTemplate');
  return (
    <CardTable
      title={`Coverage backlog (${backlog.length}${rows.length !== backlog.length ? ` of ${rows.length} shown` : ''})`}
      empty="No cards need templates for this filter."
      headers={['Card', 'Set', 'Abilities', 'Triggers', 'Effect']}
      rows={backlog.slice(0, 200).map((r) => [
        r.cardNumber,
        r.setCode,
        `${r.curatedAbilities}/${r.effectAbilities}`,
        r.runtimeTriggers || '—',
        truncate(r.effectText, 120),
      ])}
      footnote={backlog.length > 200 ? `Showing first 200 of ${backlog.length} rows.` : undefined}
    />
  );
}

function TriageTab({
  rows,
  topReasons,
}: {
  rows: TriageRow[];
  topReasons: Array<{ reason: string; count: number }>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {topReasons.length > 0 && (
        <p className="text-xs text-slate-200/60">
          Top blockers: {topReasons.slice(0, 5).map((r) => `${r.reason} (${r.count})`).join(' · ')}
        </p>
      )}
      <CardTable
        title={`Triage worklist (${rows.length})`}
        empty="No uncurated cards for this filter."
        headers={['Card', 'Set', 'Bucket', 'Capabilities', 'Reasons', 'Effect']}
        rows={rows.slice(0, 200).map((r) => [
          r.cardNumber,
          r.setCode,
          r.bucket,
          r.capabilities.join(', ') || '—',
          r.reasons.join(', ') || r.unmappedOps.join(', ') || '—',
          truncate(r.effectText, 100),
        ])}
        footnote={rows.length > 200 ? `Showing first 200 of ${rows.length} rows.` : undefined}
      />
    </div>
  );
}

function AuditTab({ rows, flagged }: { rows: AuditFinding[]; flagged: number }) {
  return (
    <CardTable
      title={flagged === 0 ? 'Curation audit — clean' : `Curation audit (${flagged} cards, ${rows.length} findings)`}
      empty="No audit mismatches for this filter."
      headers={['Card', 'Set', 'Category', 'Missing', 'Effect']}
      rows={rows.slice(0, 200).map((r) => [
        r.cardNumber,
        r.setCode,
        r.category,
        r.detail,
        truncate(r.effectText, 100),
      ])}
      footnote={rows.length > 200 ? `Showing first 200 of ${rows.length} findings.` : undefined}
    />
  );
}

function CardTable({
  title,
  empty,
  headers,
  rows,
  footnote,
}: {
  title: string;
  empty: string;
  headers: string[];
  rows: string[][];
  footnote?: string;
}) {
  return (
    <div className="op-card-well overflow-hidden">
      <div className="border-b border-white/8 px-3 py-2">
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{title}</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-white/40">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="bg-black/30 text-white/45">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-2 font-bold uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, i) => (
                <tr key={i} className="border-t border-white/6 align-top text-white/80">
                  {cells.map((cell, j) => (
                    <td key={j} className={`px-2 py-2 ${j === 0 ? 'whitespace-nowrap font-mono text-gold/75' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footnote && <p className="border-t border-white/8 px-3 py-2 text-[11px] text-white/35">{footnote}</p>}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
