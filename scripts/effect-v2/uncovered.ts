import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCoverageReportFromAssignments_V2,
  getEffectAssignmentsForSets_V2,
  parseCardEffect_V2,
  type EffectAssignment_V2,
  type ParsedEffect_V2,
} from '../../src/cards/effectCompiler_V2/index_V2';

interface CatalogCardForV2 {
  cardNumber: string;
  setCode: string;
  category?: string;
  definition?: {
    name?: string;
    text?: string;
  };
  en?: {
    name?: string | null;
    effectText?: string;
  };
}

interface Args {
  sets: string[] | null;
  outPrefix: string;
}

interface UncoveredRow {
  setCode: string;
  cardNumber: string;
  name: string;
  category: string;
  effectIndex: number;
  atomIndex: number;
  atomicEffectId: string;
  parserStatus: string;
  assignmentStatus: string;
  coverageStatus: string;
  semanticStatus: string;
  semanticIssues: string;
  actionType: string;
  markerTags: string;
  rawText: string;
  effectText: string;
  unrecognizedKind: string;
  uncoveredReason: string;
  trackingRemark: string;
  canonicalCoverage: string;
  canonicalAtoms: string;
  canonicalRemark: string;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETS_DIR = resolve(ROOT, 'public', 'cards', 'sets');
const DEFAULT_OUT_PREFIX = resolve(ROOT, 'effect-v2-uncovered');

function parseArgs(argv: string[]): Args {
  let sets: string[] | null = null;
  let outPrefix = DEFAULT_OUT_PREFIX;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sets' || arg === '--set') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a comma-separated set list, e.g. --sets EB02,OP01`);
      sets = parseSetList(value);
      continue;
    }
    if (arg.startsWith('--sets=')) {
      sets = parseSetList(arg.slice('--sets='.length));
      continue;
    }
    if (arg === '--out-prefix') {
      const value = argv[++i];
      if (!value) throw new Error('--out-prefix requires a file prefix');
      outPrefix = resolve(ROOT, value);
      continue;
    }
    if (arg.startsWith('--out-prefix=')) {
      outPrefix = resolve(ROOT, arg.slice('--out-prefix='.length));
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { sets, outPrefix };
}

function parseSetList(value: string): string[] {
  return value
    .split(',')
    .map((set) => set.trim().toUpperCase())
    .filter(Boolean);
}

function printHelp(): void {
  console.log(`Generate a complete V2 uncovered-effect report.

Usage:
  npm run effects:v2:uncovered
  npm run effects:v2:uncovered -- --sets EB02
  npm run effects:v2:uncovered -- --sets EB02,OP01 --out-prefix reports/v2-uncovered

Outputs:
  <out-prefix>.csv
  <out-prefix>.md
  <out-prefix>.json`);
}

function availableSetCodes(): string[] {
  if (!existsSync(SETS_DIR)) throw new Error(`No card catalog found at ${SETS_DIR}. Run npm run build:assets first.`);
  return readdirSync(SETS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/i, '').toUpperCase())
    .sort();
}

function readSet(setCode: string): CatalogCardForV2[] {
  const file = resolve(SETS_DIR, `${setCode}.json`);
  if (!existsSync(file)) throw new Error(`Unknown set ${setCode}; expected ${file}`);
  return JSON.parse(readFileSync(file, 'utf8')) as CatalogCardForV2[];
}

function effectTextFor(card: CatalogCardForV2): string {
  return card.definition?.text ?? card.en?.effectText ?? '';
}

function nameFor(card: CatalogCardForV2): string {
  return card.definition?.name ?? card.en?.name ?? '';
}

function csv(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeText(file: string, value: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, value, 'utf8');
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildAutoAssignments(
  parsed: readonly ParsedEffect_V2[],
  manualAssignments: readonly EffectAssignment_V2[],
): EffectAssignment_V2[] {
  const manualEffectKeys = new Set(manualAssignments.map((assignment) => `${assignment.cardNumber}#${assignment.effectIndex}`));
  const out: EffectAssignment_V2[] = [];

  for (const cardParse of parsed) {
    for (const effect of cardParse.effects) {
      const key = `${cardParse.cardNumber}#${effect.metadata.effectIndex}`;
      if (manualEffectKeys.has(key)) continue;
      const atoms = cardParse.atomicEffects.filter((atom) => atom.effectIndex === effect.metadata.effectIndex);
      if (atoms.length === 0) continue;
      const recognizedAtoms = atoms.filter((atom) => atom.coverage === 'coveredByParser');
      if (recognizedAtoms.length === 0) continue;
      if (effect.resolution.kind === 'NO_OP' && !effect.activationCost) continue;
      const isFullyRecognized = recognizedAtoms.length === atoms.length;

      const { id: _id, source: _source, metadata: _metadata, ...effectAssignment } = effect;
      out.push({
        assignmentId: `v2:auto:${cardParse.cardNumber}:${effect.metadata.effectIndex}`,
        cardNumber: cardParse.cardNumber,
        effectIndex: effect.metadata.effectIndex,
        status: isFullyRecognized ? 'ASSIGNED' : 'PARTIAL',
        printedText: effect.metadata.printedText,
        effect: effectAssignment,
        coveredAtomicEffectIds: recognizedAtoms.map((atom) => atom.id),
        ...(!isFullyRecognized
          ? {
              uncoveredNotes: atoms
                .filter((atom) => atom.coverage !== 'coveredByParser')
                .map((atom) => `${atom.id}: ${atom.rawText}`),
            }
          : {}),
      });
    }
  }

  return out;
}

function buildUncoveredRows(setCode: string, cards: CatalogCardForV2[]): UncoveredRow[] {
  const manualAssignments = getEffectAssignmentsForSets_V2([setCode]);
  const parsed = cards.map((card) => parseCardEffect_V2(card.cardNumber, effectTextFor(card)));
  const assignments = [...manualAssignments, ...buildAutoAssignments(parsed, manualAssignments)];
  const parsedByCard = new Map(parsed.map((cardParse) => [cardParse.cardNumber, cardParse]));
  const cardByNumber = new Map(cards.map((card) => [card.cardNumber, card]));
  const rows: UncoveredRow[] = [];

  for (const cardParse of parsed) {
    const coverage = buildCoverageReportFromAssignments_V2(cardParse, assignments);
    for (const status of coverage.statuses) {
      if (status.status === 'covered') continue;
      const card = cardByNumber.get(status.cardNumber);
      const parsedCard = parsedByCard.get(status.cardNumber);
      const parsedAtom = parsedCard?.atomicEffects.find((atom) => atom.id === status.atomicEffectId);
      const effect = parsedCard?.effects.find((candidate) => candidate.metadata.effectIndex === status.effectIndex);

      rows.push({
        setCode,
        cardNumber: status.cardNumber,
        name: card ? nameFor(card) : '',
        category: card?.category ?? '',
        effectIndex: status.effectIndex,
        atomIndex: status.atomIndex,
        atomicEffectId: status.atomicEffectId,
        parserStatus: status.parserStatus,
        assignmentStatus: status.assignmentStatus,
        coverageStatus: status.status,
        semanticStatus: status.semanticStatus ?? '',
        semanticIssues: status.semanticIssues?.join(' ') ?? '',
        actionType: parsedAtom?.parsedAction?.type ?? parsedAtom?.parsedCost?.type ?? '',
        markerTags: parsedAtom?.markerTags.join(' ') ?? '',
        rawText: status.rawText,
        effectText: effect?.metadata.printedText ?? effectTextFor(card ?? ({ cardNumber: status.cardNumber, setCode } satisfies CatalogCardForV2)),
        unrecognizedKind: status.unrecognizedKind ?? '',
        uncoveredReason: status.uncoveredReason ?? '',
        trackingRemark: status.trackingRemark ?? '',
        canonicalCoverage: status.canonicalCoverage ?? '',
        canonicalAtoms: status.canonicalAtoms?.join('+') ?? '',
        canonicalRemark: status.canonicalRemark ?? '',
      });
    }
  }

  return rows.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber) || a.effectIndex - b.effectIndex || a.atomIndex - b.atomIndex);
}

function writeCsv(file: string, rows: readonly UncoveredRow[]): void {
  const headers: (keyof UncoveredRow)[] = [
    'setCode',
    'cardNumber',
    'name',
    'category',
    'effectIndex',
    'atomIndex',
    'atomicEffectId',
    'parserStatus',
    'assignmentStatus',
    'coverageStatus',
    'semanticStatus',
    'semanticIssues',
    'actionType',
    'markerTags',
    'rawText',
    'effectText',
    'unrecognizedKind',
    'uncoveredReason',
    'trackingRemark',
    'canonicalCoverage',
    'canonicalAtoms',
    'canonicalRemark',
  ];

  writeText(file, [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csv(row[header])).join(',')),
  ].join('\n') + '\n');
}

function writeMarkdown(file: string, selectedSets: readonly string[], rows: readonly UncoveredRow[]): void {
  const parserUnrecognized = rows.filter((row) => row.parserStatus === 'unrecognized').length;
  const parserRecognized = rows.length - parserUnrecognized;
  const semanticAudit = rows.filter((row) => row.semanticStatus === 'needsAudit').length;
  const unassigned = rows.filter((row) => row.assignmentStatus === 'unassigned').length;
  const parserGaps = rows.filter((row) => row.canonicalCoverage === 'parserGap').length;
  const definitionGaps = rows.filter((row) => row.canonicalCoverage === 'definitionGap').length;
  const bySet = [...groupCounts(rows, (row) => row.setCode).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const byRemark = [...groupCounts(rows, (row) => row.trackingRemark || row.canonicalRemark || row.uncoveredReason || 'No remark').entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 25);

  const md: string[] = [];
  md.push('# V2 Effect Review', '');
  md.push('_Single review file generated by `npm run effects:v2:uncovered`. Includes unassigned atoms and parser-recognized atoms marked for semantic audit._', '');
  md.push('| Metric | Count |', '| --- | ---: |');
  md.push(`| selected sets | ${selectedSets.length} |`);
  md.push(`| review rows | ${rows.length} |`);
  md.push(`| semantic-audit rows | ${semanticAudit} |`);
  md.push(`| unassigned rows | ${unassigned} |`);
  md.push(`| parser-recognized review rows | ${parserRecognized} |`);
  md.push(`| parser-unrecognized atoms | ${parserUnrecognized} |`);
  md.push(`| guide-covered parser gaps | ${parserGaps} |`);
  md.push(`| possible definition gaps | ${definitionGaps} |`);
  md.push('');

  md.push('## By Set', '');
  md.push('| Set | Review Rows |', '| --- | ---: |');
  for (const [setCode, count] of bySet) md.push(`| ${setCode} | ${count} |`);
  md.push('');

  md.push('## Top Remarks', '');
  md.push('| Count | Remark |', '| ---: | --- |');
  for (const [remark, count] of byRemark) md.push(`| ${count} | ${escapeMd(remark)} |`);
  md.push('');

  md.push('## Complete Review List', '');
  md.push('| Set | Card | Effect | Atom | Parser | Status | Semantic | Action | Text | Remark |', '| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    const remark = row.trackingRemark || row.canonicalRemark || row.uncoveredReason;
    md.push(`| ${row.setCode} | ${row.cardNumber} ${row.name ? `(${escapeMd(row.name)})` : ''} | ${row.effectIndex} | ${row.atomIndex} | ${row.parserStatus} | ${row.coverageStatus} | ${row.semanticStatus} | ${row.actionType || 'UNMAPPED'} | ${escapeMd(truncate(row.rawText, 140))} | ${escapeMd(truncate(remark, 180))} |`);
  }
  md.push('');

  writeText(file, md.join('\n'));
}

function groupCounts<T>(rows: readonly T[], keyFn: (row: T) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

function escapeMd(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const setCodes = args.sets ?? availableSetCodes();
  const rows = setCodes.flatMap((setCode) => buildUncoveredRows(setCode, readSet(setCode)));

  const summary = {
    generatedBy: 'scripts/effect-v2/uncovered.ts',
    selectedSets: setCodes,
    totalReviewRows: rows.length,
    semanticAuditRows: rows.filter((row) => row.semanticStatus === 'needsAudit').length,
    unassignedRows: rows.filter((row) => row.assignmentStatus === 'unassigned').length,
    parserRecognizedReviewRows: rows.filter((row) => row.parserStatus === 'recognized').length,
    parserUnrecognizedAtomicEffects: rows.filter((row) => row.parserStatus === 'unrecognized').length,
    guideCoveredParserGaps: rows.filter((row) => row.canonicalCoverage === 'parserGap').length,
    possibleDefinitionGaps: rows.filter((row) => row.canonicalCoverage === 'definitionGap').length,
  };

  writeJson(`${args.outPrefix}.json`, { summary, rows });
  writeCsv(`${args.outPrefix}.csv`, rows);
  writeMarkdown(`${args.outPrefix}.md`, setCodes, rows);
  writeMarkdown(resolve(ROOT, 'effect-v2-review.md'), setCodes, rows);

  console.log(
    `[effects:v2:uncovered] wrote ${args.outPrefix}.json, ${args.outPrefix}.csv, and ${args.outPrefix}.md`,
  );
  console.log(
    `[effects:v2:uncovered] ${rows.length} review rows across ${setCodes.length} sets (${summary.semanticAuditRows} semantic-audit, ${summary.unassignedRows} unassigned, ${summary.parserUnrecognizedAtomicEffects} parser-unrecognized)`,
  );
}

try {
  main();
} catch (error) {
  console.error(`[effects:v2:uncovered] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
