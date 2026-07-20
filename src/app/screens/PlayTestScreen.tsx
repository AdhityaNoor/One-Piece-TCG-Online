import { useEffect, useMemo, useState } from 'react';
import type { CardDefinition } from '../../engine/state/card';
import { Button } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { MatchScreen } from './MatchScreen';
import {
  PLAYER_A_ID,
  PLAYER_B_ID,
  type PlayTestCatalogEntry,
  type PlayTestErrorLogEntry,
  useMatchStore,
} from '../store/matchStore';

interface CatalogIndex {
  sets?: Array<{ code: string; name?: string; count?: number }>;
}

interface CatalogRow {
  cardNumber?: string;
  setCode?: string;
  en?: { image?: string | null };
  definition?: CardDefinition;
}

function isCatalogRow(row: unknown): row is CatalogRow {
  return typeof row === 'object' && row !== null && typeof (row as CatalogRow).definition === 'object';
}

async function loadPlayTestCatalog(): Promise<PlayTestCatalogEntry[]> {
  const indexResponse = await fetch('/cards/index.json');
  if (!indexResponse.ok) throw new Error(`Could not load catalog index (${indexResponse.status}).`);
  const index = (await indexResponse.json()) as CatalogIndex;
  const sets = index.sets ?? [];
  const entries: PlayTestCatalogEntry[] = [];

  for (const set of sets) {
    const response = await fetch(`/cards/sets/${encodeURIComponent(set.code)}.json`);
    if (!response.ok) continue;
    const rows = await response.json();
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!isCatalogRow(row) || !row.definition) continue;
      entries.push({
        definition: row.definition,
        imageUrl: row.en?.image ?? null,
        setCode: row.setCode ?? set.code,
      });
    }
  }

  if (entries.length === 0) throw new Error('Local card catalog is empty.');
  return entries;
}

function downloadPlayTestLog(errors: PlayTestErrorLogEntry[]): void {
  const body = JSON.stringify(errors, null, 2);
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `play-test-errors-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PlayTestScreen() {
  const resetTo = useNavigationStore((state) => state.resetTo);
  const state = useMatchStore((s) => s.state);
  const startPlayTest = useMatchStore((s) => s.startPlayTest);
  const addCardToHand = useMatchStore((s) => s.playTestAddCardToHand);
  const addCardToDeckTop = useMatchStore((s) => s.playTestAddCardToDeckTop);
  const setLeader = useMatchStore((s) => s.playTestSetLeader);
  const adjustDon = useMatchStore((s) => s.playTestAdjustDon);
  const forceTurn = useMatchStore((s) => s.playTestForceTurn);
  const recordError = useMatchStore((s) => s.recordPlayTestError);
  const clearErrors = useMatchStore((s) => s.clearPlayTestErrors);
  const errors = useMatchStore((s) => s.playTestErrors);

  const [catalog, setCatalog] = useState<PlayTestCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadPlayTestCatalog()
      .then((entries) => {
        if (cancelled) return;
        setCatalog(entries);
        setLoading(false);
        const result = startPlayTest(entries);
        if (!result.ok) setLoadError(result.reasons.join(' '));
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setLoadError(message);
        setLoading(false);
        recordError('Play Test catalog load failed.', { reasons: [message] });
      });
    return () => {
      cancelled = true;
    };
  }, [recordError, startPlayTest]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const unique = new Map<string, PlayTestCatalogEntry>();
    for (const entry of catalog) {
      if (!unique.has(entry.definition.cardDefinitionId)) unique.set(entry.definition.cardDefinitionId, entry);
    }
    const rows = [...unique.values()];
    const matches = needle
      ? rows.filter((entry) => {
          const def = entry.definition;
          return (
            def.cardNumber.toLowerCase().includes(needle) ||
            def.name.toLowerCase().includes(needle) ||
            def.types.some((type) => type.toLowerCase().includes(needle))
          );
        })
      : rows;
    return matches.slice(0, 40);
  }, [catalog, query]);

  const activePlayerId = state?.activePlayerId ?? PLAYER_A_ID;

  function restart(): void {
    if (catalog.length === 0) return;
    const result = startPlayTest(catalog);
    if (!result.ok) setLoadError(result.reasons.join(' '));
  }

  function run(label: string, action: () => { ok: true } | { ok: false; reasons: string[] }): void {
    const result = action();
    if (!result.ok) recordError(`Play Test control failed: ${label}.`, { reasons: result.reasons });
  }

  return (
    <MatchScreen
      leftPanelOverride={(
        <aside className="flex min-h-0 flex-col overflow-hidden border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
        <div className="border-b border-gold/25 bg-black/28 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Developer</p>
              <h2 className="font-display text-lg font-black uppercase tracking-[0.12em]">Play Test</h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                {loading ? 'Loading catalog' : `${catalog.length} catalog cards`} | Active {activePlayerId}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => resetTo({ screen: 'debug-tools' })}>
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loadError && <p className="mb-3 border border-red-400/30 bg-red-500/12 p-3 text-xs text-red-100">{loadError}</p>}

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={restart} disabled={catalog.length === 0}>
              Restart
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('force p1 turn', () => forceTurn(PLAYER_A_ID))}>
              P1 Turn
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('force p2 turn', () => forceTurn(PLAYER_B_ID))}>
              P2 Turn
            </Button>
            <Button size="sm" variant="secondary" onClick={() => run('switch turn', () => forceTurn(activePlayerId === PLAYER_A_ID ? PLAYER_B_ID : PLAYER_A_ID))}>
              Switch
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[PLAYER_A_ID, PLAYER_B_ID].map((playerId) => (
              <div key={playerId} className="border border-white/10 bg-black/20 p-2">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{playerId} DON!!</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => run(`${playerId} +1 DON`, () => adjustDon(playerId, 1))}>
                    +1
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => run(`${playerId} -1 DON`, () => adjustDon(playerId, -1))}>
                    -1
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.18em] text-gold/80" htmlFor="play-test-search">
            Card Library
          </label>
          <input
            id="play-test-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search card number, name, type"
            className="mt-2 h-10 w-full border border-white/15 bg-black/35 px-3 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-gold/60"
          />

          <div className="mt-3 flex flex-col gap-2">
            {filtered.map((entry) => {
              const def = entry.definition;
              const playable = def.category === 'character' || def.category === 'event' || def.category === 'stage';
              const leader = def.category === 'leader';
              return (
                <div key={def.cardDefinitionId} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 border border-white/10 bg-black/24 p-2">
                  <div className="h-16 overflow-hidden bg-white/5">
                    {entry.imageUrl ? <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-white">{def.cardNumber} | {def.name}</p>
                    <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{entry.setCode} | {def.category}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {leader ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => run(`set ${def.cardNumber} as p1 leader`, () => setLeader(PLAYER_A_ID, def.cardDefinitionId))}>
                            P1 Leader
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => run(`set ${def.cardNumber} as p2 leader`, () => setLeader(PLAYER_B_ID, def.cardDefinitionId))}>
                            P2 Leader
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" disabled={!playable} onClick={() => run(`add ${def.cardNumber} to p1 hand`, () => addCardToHand(PLAYER_A_ID, def.cardDefinitionId))}>
                            P1 Hand
                          </Button>
                          <Button size="sm" variant="secondary" disabled={!playable} onClick={() => run(`add ${def.cardNumber} to p2 hand`, () => addCardToHand(PLAYER_B_ID, def.cardDefinitionId))}>
                            P2 Hand
                          </Button>
                          <Button size="sm" variant="secondary" disabled={!playable} onClick={() => run(`put ${def.cardNumber} on p1 deck top`, () => addCardToDeckTop(PLAYER_A_ID, def.cardDefinitionId))}>
                            P1 Top
                          </Button>
                          <Button size="sm" variant="secondary" disabled={!playable} onClick={() => run(`put ${def.cardNumber} on p2 deck top`, () => addCardToDeckTop(PLAYER_B_ID, def.cardDefinitionId))}>
                            P2 Top
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gold/25 bg-black/28 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Errors: {errors.length}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={errors.length === 0} onClick={() => downloadPlayTestLog(errors)}>
                Export
              </Button>
              <Button size="sm" variant="ghost" disabled={errors.length === 0} onClick={clearErrors}>
                Clear
              </Button>
            </div>
          </div>
        </div>
        </aside>
      )}
    />
  );
}
