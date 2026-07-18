/**
 * Curation status — MOVED here from the player-facing debug menu (was
 * src/app/screens/CoverageMonitorScreen.tsx, reached via DebugToolsScreen's
 * "Effect Curation" section). Same underlying hook (useEffectCoverageMetrics,
 * fully client-side, recomputes from the local card catalog + curated
 * registry at runtime — no backend involved), just re-chromed for the
 * Admin CMS instead of the game's GameCanvasScreen shell.
 */
import { useMemo, useState } from 'react';
import { useEffectCoverageMetrics } from '../../../app/hooks/useEffectCoverageMetrics';
import type { AuditFinding, CoverageRow, PartialCurationFinding, SetMetrics, TriageRow } from '../../../cards/devMetrics';
import { AdminButton, AdminInput, AdminSelect } from '../../components/ui';

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
    <div className="rounded border border-[rgb(var(--op-gold-rgb)/0.18)] bg-[rgb(var(--op-gold-rgb)/0.06)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--op-gold-rgb))]">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/55">{sub}</p>}
    </div>
  );
}

function pct(n: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((n / total) * 1000) / 10}%`;
}

function tabButtonClass(active: boolean): string {
  return [
    'rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
    active ? 'border-[rgb(var(--op-gold-rgb)/0.7)] bg-[rgb(var(--op-gold-rgb)/0.15)] text-[rgb(var(--op-gold-rgb))]' : 'border-[rgb(var(--op-gold-rgb)/0.3)] bg-[rgb(var(--op-gold-rgb)/0.08)] text-white/55 hover:border-[rgb(var(--op-gold-rgb)/0.5)]',
  ].join(' ');
}

export function CurationStatusTab() {
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
    return row.cardNumber.toUpperCase().includes(normalizedQuery) || row.name.toUpperCase().includes(normalizedQuery);
  }

  const filteredSetMetrics = useMemo(() => (metrics ? metrics.bySet.filter((s) => !setFilter || s.setCode === setFilter) : []), [metrics, setFilter]);
  const filteredCoverage = useMemo(() => (metrics ? metrics.coverageRows.filter(matchesFilters) : []), [metrics, setFilter, normalizedQuery]);
  const filteredTriage = useMemo(() => (metrics ? metrics.triageRows.filter(matchesFilters) : []), [metrics, setFilter, normalizedQuery]);
  const filteredAudit = useMemo(() => (metrics ? metrics.auditFindings.filter(matchesFilters) : []), [metrics, setFilter, normalizedQuery]);
  const filteredPartial = useMemo(
    () =>
      metrics
        ? metrics.partialFindings.filter((f) => {
            if (setFilter && f.setCode !== setFilter) return false;
            if (!normalizedQuery) return true;
            return (f.cardNumber?.toUpperCase().includes(normalizedQuery) ?? false) || (f.name?.toUpperCase().includes(normalizedQuery) ?? false) || f.note.toUpperCase().includes(normalizedQuery);
          })
        : [],
    [metrics, setFilter, normalizedQuery],
  );

  const statusLine = metrics
    ? `${metrics.coverage.curatedPct}% curated · ${metrics.partial.partialCuratedCards} partial · ${metrics.coverage.needsTemplate} need templates`
    : status === 'loading'
      ? 'Computing…'
      : 'Awaiting catalog';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/55">{statusLine}</p>
        <AdminButton variant="secondary" onClick={refresh} disabled={status === 'loading'}>
          Refresh
        </AdminButton>
      </div>

      <div className="grid gap-3 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded border border-[rgb(var(--op-gold-rgb)/0.18)] bg-[rgb(var(--op-gold-rgb)/0.06)] p-3">
          <div className="flex flex-wrap gap-1.5">
            {(['overview', 'coverage', 'partials', 'triage', 'audit'] as Tab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={tabButtonClass(tab === t)}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Set</label>
              <AdminSelect value={setFilter} onChange={(e) => setSetFilter(e.target.value)} className="w-full">
                <option value="">All sets</option>
                {sets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Search</label>
              <AdminInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Card ID or name…" className="w-full" />
            </div>
          </div>

          {metrics && <p className="mt-4 text-[10px] text-white/40">Updated {new Date(metrics.computedAt).toLocaleString()}</p>}
        </aside>

        <section className="rounded border border-[rgb(var(--op-gold-rgb)/0.18)] bg-[rgb(var(--op-gold-rgb)/0.06)] p-3">
          {status === 'loading' && <p className="text-sm text-white/55">Computing metrics from catalog…</p>}
          {status === 'error' && <p className="rounded border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error ?? 'Failed to load metrics.'}</p>}

          {metrics && (
            <div className="max-h-[70vh] overflow-y-auto">
              {tab === 'overview' && <OverviewTab metrics={metrics} setRows={filteredSetMetrics} />}
              {tab === 'coverage' && <CoverageTab rows={filteredCoverage} />}
              {tab === 'partials' && <PartialsTab rows={filteredPartial} partialCards={metrics.partial.partialCuratedCards} />}
              {tab === 'triage' && <TriageTab rows={filteredTriage} topReasons={metrics.topReasons} />}
              {tab === 'audit' && <AuditTab rows={filteredAudit} flagged={metrics.audit.flaggedCards} />}
            </div>
          )}
        </section>
      </div>
    </div>
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
        <StatCard label="Audit flags" value={audit.flaggedCards} sub={audit.findings === 0 ? 'clean' : `${audit.findings} findings`} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard label="Triage backlog" value={triage.analyzed} sub={`${triage.expressible} expressible`} />
        <StatCard label="Partial markers" value={partial.findingCount} sub={`${partial.staleNotes} stale notes`} />
        <StatCard label="Unassigned defer" value={partial.unassignedDeferNotes} sub="NOTE without assignment" />
      </div>

      {metrics.topReasons.length > 0 && (
        <div className="rounded border border-[rgb(var(--op-gold-rgb)/0.18)] bg-black/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--op-gold-rgb))]">Top triage blockers</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {metrics.topReasons.slice(0, 8).map((r) => (
              <li key={r.reason} className="flex justify-between gap-2 border-b border-[rgb(var(--op-gold-rgb)/0.18)] pb-1.5 text-white/75 last:border-0">
                <span>{r.reason}</span>
                <span className="font-mono text-[rgb(var(--op-gold-rgb))]">{r.count}</span>
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
    <div className="overflow-hidden rounded border border-[rgb(var(--op-gold-rgb)/0.18)]">
      <div className="border-b border-[rgb(var(--op-gold-rgb)/0.18)] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--op-gold-rgb))]">By set</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead className="bg-black/40 text-white/40">
            <tr>
              <th className="px-3 py-2 font-semibold uppercase tracking-wide">Set</th>
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
              <tr key={s.setCode} className="border-t border-[rgb(var(--op-gold-rgb)/0.18)] text-white/90">
                <td className="px-3 py-2 font-mono text-[rgb(var(--op-gold-rgb))]">{s.setCode}</td>
                <td className="px-2 py-2 text-right tabular-nums">{s.curated}</td>
                <td className="px-2 py-2 text-right tabular-nums text-orange-300">{s.partialCurated || '—'}</td>
                <td className="px-2 py-2 text-right tabular-nums text-amber-300">{s.needsTemplate}</td>
                <td className="px-2 py-2 text-right tabular-nums text-emerald-300">{s.triageExpressible}</td>
                <td className="px-2 py-2 text-right tabular-nums">{s.triageNeedsPrimitive}</td>
                <td className="px-2 py-2 text-right tabular-nums text-white/40">{s.triageDefer}</td>
                <td className="px-2 py-2 text-right tabular-nums text-red-300">{s.auditFindings || '—'}</td>
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
      rows={assigned.slice(0, 300).map((f) => [f.cardNumber ?? '—', f.setCode, f.kind, f.isStale ? 'yes' : '—', truncate(f.note, 140)])}
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
      rows={backlog.slice(0, 200).map((r) => [r.cardNumber, r.setCode, `${r.curatedAbilities}/${r.effectAbilities}`, r.runtimeTriggers || '—', truncate(r.effectText, 120)])}
      footnote={backlog.length > 200 ? `Showing first 200 of ${backlog.length} rows.` : undefined}
    />
  );
}

function TriageTab({ rows, topReasons }: { rows: TriageRow[]; topReasons: Array<{ reason: string; count: number }> }) {
  return (
    <div className="flex flex-col gap-3">
      {topReasons.length > 0 && <p className="text-xs text-white/55">Top blockers: {topReasons.slice(0, 5).map((r) => `${r.reason} (${r.count})`).join(' · ')}</p>}
      <CardTable
        title={`Triage worklist (${rows.length})`}
        empty="No uncurated cards for this filter."
        headers={['Card', 'Set', 'Bucket', 'Capabilities', 'Reasons', 'Effect']}
        rows={rows.slice(0, 200).map((r) => [r.cardNumber, r.setCode, r.bucket, r.capabilities.join(', ') || '—', r.reasons.join(', ') || r.unmappedOps.join(', ') || '—', truncate(r.effectText, 100)])}
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
      rows={rows.slice(0, 200).map((r) => [r.cardNumber, r.setCode, r.category, r.detail, truncate(r.effectText, 100)])}
      footnote={rows.length > 200 ? `Showing first 200 of ${rows.length} findings.` : undefined}
    />
  );
}

function CardTable({ title, empty, headers, rows, footnote }: { title: string; empty: string; headers: string[]; rows: string[][]; footnote?: string }) {
  return (
    <div className="overflow-hidden rounded border border-[rgb(var(--op-gold-rgb)/0.18)]">
      <div className="border-b border-[rgb(var(--op-gold-rgb)/0.18)] px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--op-gold-rgb))]">{title}</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-white/40">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="bg-black/40 text-white/40">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-2 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, i) => (
                <tr key={i} className="border-t border-[rgb(var(--op-gold-rgb)/0.18)] align-top text-white/75">
                  {cells.map((cell, j) => (
                    <td key={j} className={`px-2 py-2 ${j === 0 ? 'whitespace-nowrap font-mono text-[rgb(var(--op-gold-rgb))]' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footnote && <p className="border-t border-[rgb(var(--op-gold-rgb)/0.18)] px-3 py-2 text-[11px] text-white/40">{footnote}</p>}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
