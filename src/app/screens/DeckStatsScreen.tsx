/**
 * Deck Stats — a read-only analytics screen for a saved deck, reached from the
 * Deck Stats button on the deck-detail panel (Decks tab). It renders the seven
 * gumgum.gg-style metrics: On Curve Plays, Counter Stats, Searcher hit chance,
 * Cost & Power curves, Types, Attributes, and Keyword Stats.
 *
 * ARCHITECTURE: this component is Layer 3 (UI) only. It does ZERO analysis
 * itself — every number comes from the pure, offline `computeDeckStats` engine
 * (src/cards/deckStats), which reads only the deck's card SNAPSHOTS. So the
 * screen works with no API and no running match, and the stat logic stays unit
 * tested independently of React.
 */
import { useMemo, type ReactNode } from 'react';
import { CanvasMenuButton } from '../components';
import { useHexDriftDelay } from '../hooks/useHexDriftDelay';
import { useCurrentScreen, useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { computeDeckStats, type CountBucket, type DeckStats } from '../../cards/deckStats';

// ─── formatting helpers ─────────────────────────────────────────────────────

const pct = (value: number): string => `${Math.round(value * 100)}%`;
const oneDp = (value: number): string => value.toFixed(1);
const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

// ─── shared primitives ──────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="op-panel op-panel-plain flex flex-col gap-2 p-4">
      <div>
        <p className="op-section-title">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs leading-5 text-slate-200/55">{subtitle}</p>}
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-none bg-black/30 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[rgb(var(--op-gold-rgb)/0.8)]">{label}</p>
      <p className="mt-0.5 text-lg font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

/** A horizontal bar row scaled against the largest count in its group. */
function BarRow({ label, count, max, suffix }: { label: string; count: number; max: number; suffix?: string }) {
  const width = max > 0 ? Math.max(2, (count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 flex-shrink-0 truncate text-right text-[11px] font-semibold text-slate-100/80" title={label}>
        {label}
      </span>
      <div className="relative h-4 flex-1 overflow-hidden rounded-none bg-black/30">
        <div
          className="h-full bg-[rgb(var(--op-gold-rgb)/0.7)]"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-12 flex-shrink-0 text-right text-[11px] font-black tabular-nums text-white">
        {count}
        {suffix}
      </span>
    </div>
  );
}

function BarList({ buckets, labelFn }: { buckets: CountBucket[]; labelFn?: (key: string) => string }) {
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0);
  if (buckets.length === 0) return <p className="text-xs text-slate-200/45">No data.</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {buckets.map((b) => (
        <BarRow key={b.key} label={labelFn ? labelFn(b.key) : b.key} count={b.count} max={max} />
      ))}
    </div>
  );
}

// ─── metric sections ────────────────────────────────────────────────────────

function CurveSection({ title, stat, unit }: { title: string; stat: DeckStats['costCurve']; unit: string }) {
  return (
    <Section title={title} subtitle={`Average ${unit} ${oneDp(stat.average)} across ${stat.contributingCards} cards.`}>
      <BarList buckets={stat.buckets} />
    </Section>
  );
}

function OnCurveSection({ stat }: { stat: DeckStats['onCurve'] }) {
  const maxAtCost = stat.rows.reduce((m, r) => Math.max(m, r.cardsAtCost), 0);
  return (
    <Section
      title="On Curve Plays"
      subtitle={stat.assumptions}
    >
      <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem] items-center gap-x-2 gap-y-1.5">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-200/45">DON</span>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-200/45">Cards at cost</span>
        <span className="text-right text-[9px] font-black uppercase tracking-wider text-slate-200/45">≤ cost</span>
        <span className="text-right text-[9px] font-black uppercase tracking-wider text-slate-200/45">Chance</span>
        {stat.rows.map((row) => {
          const width = maxAtCost > 0 ? Math.max(2, (row.cardsAtCost / maxAtCost) * 100) : 0;
          return (
            <FragmentRow
              key={row.cost}
              cost={row.cost}
              width={width}
              cardsAtCost={row.cardsAtCost}
              atOrBelow={row.cardsAtOrBelow}
              chance={pct(row.onCurveChance)}
            />
          );
        })}
      </div>
    </Section>
  );
}

function FragmentRow({
  cost,
  width,
  cardsAtCost,
  atOrBelow,
  chance,
}: {
  cost: number;
  width: number;
  cardsAtCost: number;
  atOrBelow: number;
  chance: string;
}) {
  return (
    <>
      <span className="text-xs font-black tabular-nums text-[rgb(var(--op-gold-rgb))]">{cost}</span>
      <div className="relative flex h-4 items-center overflow-hidden rounded-none bg-black/30">
        <div className="h-full bg-[rgb(var(--op-gold-rgb)/0.7)]" style={{ width: `${width}%` }} />
        <span className="absolute left-1.5 text-[10px] font-black tabular-nums text-white/90">{cardsAtCost}</span>
      </div>
      <span className="text-right text-[11px] font-bold tabular-nums text-slate-100/75">{atOrBelow}</span>
      <span className="text-right text-[11px] font-black tabular-nums text-white">{chance}</span>
    </>
  );
}

function CounterSection({ stat }: { stat: DeckStats['counter'] }) {
  const buckets = stat.distribution.filter((b) => b.key !== '0');
  return (
    <Section title="Counter Stats" subtitle="Defensive Counter available from the deck.">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip label="Counter cards" value={String(stat.counterCards)} />
        <StatChip label="Total counter" value={stat.totalCounterPower.toLocaleString()} />
        <StatChip label="Counter events" value={String(stat.counterEventCards)} />
        <StatChip label="Est. event pwr*" value={`+${stat.estimatedEventCounterPower.toLocaleString()}`} />
      </div>
      <BarList buckets={buckets} labelFn={(k) => `+${Number(k).toLocaleString()}`} />
      <p className="mt-2 text-[10px] leading-4 text-slate-200/40">
        *Event/ability counter power is a text-parsed estimate, not a rules calculation.
      </p>
    </Section>
  );
}

function SearcherSection({ stat }: { stat: DeckStats['searcher'] }) {
  return (
    <Section title="Searcher Hit Chance" subtitle="Odds each searcher finds a valid target (heuristic).">
      {stat.entries.length === 0 && stat.unparsed.length === 0 && (
        <p className="text-xs text-slate-200/45">No searchers detected in this deck.</p>
      )}
      {stat.entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {stat.entries.map((e) => (
            <div key={e.cardNumber} className="rounded-none bg-black/30 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[12px] font-bold text-white" title={e.name}>
                  {e.name} <span className="text-white/40">×{e.quantity}</span>
                </span>
                <span className="flex-shrink-0 text-sm font-black tabular-nums text-[rgb(var(--op-gold-rgb))]">
                  {pct(e.hitChance)}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-200/55">
                Looks at {e.lookCount} · target {e.targetDescription} · {e.targetPool} in deck
              </p>
            </div>
          ))}
        </div>
      )}
      {stat.unparsed.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-300/70">Needs ruling / parse confirmation</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {stat.unparsed.map((u) => (
              <li key={u.cardNumber} className="text-[10px] text-slate-200/50">
                {u.name} ({u.cardNumber}) — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// ─── screen ─────────────────────────────────────────────────────────────────

function DeckStatsShell({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const hexDriftDelay = useHexDriftDelay();
  return (
    <main className="op-theme-blue relative flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#13329a] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('/ui/bg.png')] bg-cover bg-center op-bg-tint opacity-80" />
      <div aria-hidden="true" style={hexDriftDelay} className="op-hex-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-3 px-3 py-3">
        <CanvasMenuButton label="Back" onClick={onBack} size="sm" className="max-w-[7rem]" />
      </div>
      <section className="relative z-10 flex min-h-0 flex-1 flex-col px-3 pb-6 pt-2">{children}</section>
    </main>
  );
}

export function DeckStatsScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const current = useCurrentScreen();
  const deckId = current.screen === 'deck-stats' ? current.deckId : undefined;
  const load = useSavedDecksStore((state) => state.load);

  const result = useMemo(() => (deckId ? load(deckId) : null), [deckId, load]);
  const deck = result?.ok ? result.deck : null;
  const stats = useMemo(() => (deck ? computeDeckStats(deck) : null), [deck]);

  if (!deck || !stats) {
    return (
      <DeckStatsShell onBack={goBack}>
        <div className="op-panel op-panel-plain p-6">
          <p className="text-sm font-bold text-red-100">
            Couldn't load this deck for analysis — it may have been deleted or its data is corrupted.
          </p>
        </div>
      </DeckStatsShell>
    );
  }

  return (
    <DeckStatsShell onBack={goBack}>
      <div className="op-panel op-panel-plain mb-3 flex flex-shrink-0 flex-wrap items-baseline justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="op-section-title">Deck Stats</p>
          <p className="mt-0.5 truncate text-sm text-slate-200/70">
            {deck.name} · {deck.leader.definition.name} · {stats.deckSize} cards
          </p>
        </div>
        <span className="rounded-none bg-black/40 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/55">
          {deck.leader.definition.colors.map(titleCase).join(' / ') || 'Colorless'}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pb-2 xl:grid-cols-2">
        <OnCurveSection stat={stats.onCurve} />
        <CounterSection stat={stats.counter} />
        <CurveSection title="Cost Curve" stat={stats.costCurve} unit="cost" />
        <CurveSection title="Power Curve" stat={stats.powerCurve} unit="power" />
        <SearcherSection stat={stats.searcher} />
        <Section title="Types" subtitle="Tribal types across the main deck.">
          <BarList buckets={stats.types} />
        </Section>
        <Section title="Attributes" subtitle="Battle attributes across the main deck.">
          <BarList buckets={stats.attributes} labelFn={titleCase} />
        </Section>
        <Section title="Keyword Stats" subtitle="Keyword abilities present in the deck.">
          <BarList buckets={stats.keywords} />
        </Section>
      </div>
    </DeckStatsShell>
  );
}
