import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSIGNMENTS_BY_SET_V2,
  buildCoverageReportFromAssignments_V2,
  buildGuideCoverageReport_V2,
  CANONICAL_ATOMS_V2,
  compileCardEffects_V2,
  getEffectAssignmentsForSets_V2,
  parseCardEffect_V2,
  toMongoCompiledCardEffectDocument_V2,
  toMongoEffectAssignmentDocuments_V2,
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
  outDir: string;
  debug: boolean;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETS_DIR = resolve(ROOT, 'public', 'cards', 'sets');
const DEFAULT_OUT_DIR = resolve(ROOT, 'effect-v2-output');
const ROOT_CURATION_CSV = resolve(ROOT, 'effect-v2-curation.csv');
const ROOT_CURATION_MD = resolve(ROOT, 'effect-v2-curation.md');
const ROOT_GUIDE_COVERAGE_JSON = resolve(ROOT, 'effect-v2-guide-coverage.json');
const ROOT_CANONICAL_REGISTRY_JSON = resolve(ROOT, 'effect-v2-canonical-registry.json');

interface CurationRow {
  setCode: string;
  cardNumber: string;
  name: string;
  category: string;
  effectIndex: number;
  atomIndex: number;
  atomicEffectId: string;
  parserStatus: string;
  assignmentStatus: string;
  actionType: string;
  markerTags: string;
  rawText: string;
  unrecognizedKind: string;
  uncoveredReason: string;
  trackingRemark: string;
  canonicalCoverage: string;
  canonicalAtoms: string;
  canonicalRemark: string;
}

interface EffectCurationGroup {
  setCode: string;
  cardNumber: string;
  name: string;
  category: string;
  effectIndex: number;
  effectId: string;
  assignmentId: string;
  markerTags: string;
  atomIds: string[];
  parserRecognized: number;
  parserUnrecognized: number;
  permutationKey: string;
  rawText: string;
}

interface CuratedCoverageSummary {
  fullyCuratedCards: number;
  partiallyCuratedCards: number;
  uncuratedCards: number;
  noEffectCards: number;
  fullyCuratedEffects: number;
  partiallyCuratedEffects: number;
  uncuratedEffects: number;
}

function parseArgs(argv: string[]): Args {
  let sets: string[] | null = null;
  let outDir = DEFAULT_OUT_DIR;
  let debug = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sets' || arg === '--set') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a comma-separated set list, e.g. --sets OP01,ST01`);
      sets = value
        .split(',')
        .map((set) => set.trim().toUpperCase())
        .filter(Boolean);
      continue;
    }
    if (arg.startsWith('--sets=')) {
      sets = arg
        .slice('--sets='.length)
        .split(',')
        .map((set) => set.trim().toUpperCase())
        .filter(Boolean);
      continue;
    }
    if (arg === '--out-dir') {
      const value = argv[++i];
      if (!value) throw new Error('--out-dir requires a path');
      outDir = resolve(ROOT, value);
      continue;
    }
    if (arg.startsWith('--out-dir=')) {
      outDir = resolve(ROOT, arg.slice('--out-dir='.length));
      continue;
    }
    if (arg === '--debug') {
      debug = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { sets, outDir, debug };
}

function printHelp(): void {
  console.log(`Generate V2 effect parser/compiler artifacts.

Usage:
  npm run effects:v2
  npm run effects:v2 -- --sets OP01
  npm run effects:v2 -- --sets OP01,ST01 --out-dir effect-v2-output
  npm run effects:v2 -- --debug

Outputs:
  <out-dir>/<SET>/coverage.json
  <out-dir>/<SET>/auto-assignments.json
  <out-dir>/<SET>/auto-assignments.ts
  <out-dir>/<SET>/mongo-assignments.json
  <out-dir>/<SET>/mongo-cards.json
  <out-dir>/summary.json
  effect-v2-curation.csv
  effect-v2-curation.md

Debug-only outputs with --debug:
  <out-dir>/<SET>/parsed.json
  <out-dir>/<SET>/compiled.json
  <out-dir>/<SET>/curation.csv
  <out-dir>/<SET>/curation-effects.csv
  <out-dir>/<SET>/curation.md
  <out-dir>/<SET>/assignment-draft.ts
  <out-dir>/canonical-registry.json
  <out-dir>/guide-coverage.json`);
}

function availableSetCodes(): string[] {
  if (!existsSync(SETS_DIR)) throw new Error(`No card catalog found at ${SETS_DIR}. Run npm run build:assets first.`);
  return readdirSync(SETS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/i, '').toUpperCase())
    .sort();
}

function readSet(setCode: string): CatalogCardForV2[] {
  const file = join(SETS_DIR, `${setCode}.json`);
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

function writeText(file: string, value: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, value, 'utf8');
}

function buildCurationRows(
  setCode: string,
  cards: CatalogCardForV2[],
  coverage: ReturnType<typeof buildCoverageReportFromAssignments_V2>[],
  parsed: ReturnType<typeof parseCardEffect_V2>[],
): CurationRow[] {
  const cardByNumber = new Map(cards.map((card) => [card.cardNumber, card]));
  const parsedAtomById = new Map(parsed.flatMap((cardParse) => cardParse.atomicEffects.map((atom) => [atom.id, atom] as const)));
  const rows: CurationRow[] = [];

  for (const report of coverage) {
    for (const status of report.statuses) {
      if (status.assignmentStatus !== 'unassigned') continue;
      const card = cardByNumber.get(status.cardNumber);
      const parsedAtom = parsedAtomById.get(status.atomicEffectId);
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
        actionType: parsedAtom?.parsedAction?.type ?? parsedAtom?.parsedCost?.type ?? '',
        markerTags: parsedAtom?.markerTags.join(' ') ?? '',
        rawText: status.rawText,
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

function writeCurationCsv(file: string, rows: readonly CurationRow[]): void {
  const out = [
    'set,cardNumber,name,category,effectIndex,atomIndex,atomicEffectId,parserStatus,assignmentStatus,actionType,markerTags,rawText,unrecognizedKind,uncoveredReason,trackingRemark,canonicalCoverage,canonicalAtoms,canonicalRemark',
    ...rows.map((row) =>
      [
        row.setCode,
        row.cardNumber,
        row.name,
        row.category,
        row.effectIndex,
        row.atomIndex,
        row.atomicEffectId,
        row.parserStatus,
        row.assignmentStatus,
        row.actionType,
        row.markerTags,
        row.rawText,
        row.unrecognizedKind,
        row.uncoveredReason,
        row.trackingRemark,
        row.canonicalCoverage,
        row.canonicalAtoms,
        row.canonicalRemark,
      ]
        .map(csv)
        .join(','),
    ),
  ];
  writeText(file, out.join('\n') + '\n');
}

function writeCurationMd(file: string, setCode: string | null, rows: readonly CurationRow[]): void {
  const title = setCode ? `# V2 effect curation - ${setCode}` : '# V2 effect curation';
  const recognized = rows.filter((row) => row.parserStatus === 'recognized').length;
  const unrecognized = rows.length - recognized;
  const definitionGaps = rows.filter((row) => row.canonicalCoverage === 'definitionGap').length;
  const parserGaps = rows.filter((row) => row.canonicalCoverage === 'parserGap').length;
  const effectGroups = buildEffectGroups(rows);
  const md: string[] = [];
  md.push(title, '');
  md.push('_Generated by `npm run effects:v2`. These rows are unassigned V2 atomic effects, not executable logic._', '');
  md.push('| Metric | Count |', '| --- | ---: |');
  md.push(`| unassigned atomic effects | ${rows.length} |`);
  md.push(`| unassigned card effects | ${effectGroups.length} |`);
  md.push(`| parser-recognized atoms needing assignment | ${recognized} |`);
  md.push(`| parser-unrecognized atoms needing parser/template work | ${unrecognized} |`);
  md.push(`| guide-covered parser gaps | ${parserGaps} |`);
  md.push(`| possible definition gaps | ${definitionGaps} |`);
  md.push('');
  md.push('## Effect-Level Assignment Queue', '');
  md.push('| Card | Set | Effect | Atoms | Recognized | Permutation | Text | First remark |', '| --- | --- | ---: | ---: | ---: | --- | --- | --- |');
  for (const group of effectGroups.slice(0, 500)) {
    const text = group.rawText.length > 120 ? `${group.rawText.slice(0, 117)}...` : group.rawText;
    const firstRemark = rows.find((row) => row.cardNumber === group.cardNumber && row.effectIndex === group.effectIndex && row.trackingRemark)?.trackingRemark ?? '';
    md.push(`| ${group.cardNumber} ${group.name ? `(${group.name})` : ''} | ${group.setCode} | ${group.effectIndex} | ${group.atomIds.length} | ${group.parserRecognized}/${group.atomIds.length} | \`${group.permutationKey.replace(/`/g, '')}\` | ${text.replace(/\|/g, '\\|')} | ${firstRemark.replace(/\|/g, '\\|')} |`);
  }
  if (effectGroups.length > 500) md.push('', `_Showing first 500 effects. See CSV for all ${rows.length} atomic rows._`);
  md.push('');
  writeText(file, md.join('\n'));
}

function buildEffectGroups(rows: readonly CurationRow[]): EffectCurationGroup[] {
  const grouped = new Map<string, CurationRow[]>();
  for (const row of rows) {
    const key = `${row.cardNumber}#${row.effectIndex}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return [...grouped.entries()].map(([key, groupRows]) => {
    const sorted = [...groupRows].sort((a, b) => a.atomIndex - b.atomIndex);
    const head = sorted[0];
    const actionKinds = sorted.map((row) => row.actionType || 'UNMAPPED').join(' -> ');
    const markerTags = head.markerTags;
    return {
      setCode: head.setCode,
      cardNumber: head.cardNumber,
      name: head.name,
      category: head.category,
      effectIndex: head.effectIndex,
      effectId: key,
      assignmentId: `v2:${head.cardNumber}:${head.effectIndex}`,
      markerTags,
      atomIds: sorted.map((row) => row.atomicEffectId),
      parserRecognized: sorted.filter((row) => row.parserStatus === 'recognized').length,
      parserUnrecognized: sorted.filter((row) => row.parserStatus !== 'recognized').length,
      permutationKey: `${markerTags || 'NO_MARKER'} :: ${actionKinds}`,
      rawText: sorted.map((row) => row.rawText).join(' '),
    };
  }).sort((a, b) => a.cardNumber.localeCompare(b.cardNumber) || a.effectIndex - b.effectIndex);
}

function summarizeCuratedCoverage(
  coverage: ReturnType<typeof buildCoverageReportFromAssignments_V2>[],
): CuratedCoverageSummary {
  const summary: CuratedCoverageSummary = {
    fullyCuratedCards: 0,
    partiallyCuratedCards: 0,
    uncuratedCards: 0,
    noEffectCards: 0,
    fullyCuratedEffects: 0,
    partiallyCuratedEffects: 0,
    uncuratedEffects: 0,
  };

  for (const report of coverage) {
    if (report.totalAtomicEffects === 0) {
      summary.noEffectCards += 1;
      continue;
    }

    const cardCuratedAtoms = report.assignmentCoveredAtomicEffects + report.assignmentPartialAtomicEffects;
    if (report.assignmentCoveredAtomicEffects === report.totalAtomicEffects && report.assignmentPartialAtomicEffects === 0) {
      summary.fullyCuratedCards += 1;
    } else if (cardCuratedAtoms > 0) {
      summary.partiallyCuratedCards += 1;
    } else {
      summary.uncuratedCards += 1;
    }

    const statusesByEffect = new Map<number, typeof report.statuses>();
    for (const status of report.statuses) {
      const list = statusesByEffect.get(status.effectIndex) ?? [];
      list.push(status);
      statusesByEffect.set(status.effectIndex, list);
    }

    for (const statuses of statusesByEffect.values()) {
      const assigned = statuses.filter((status) => status.assignmentStatus === 'assigned').length;
      const partial = statuses.filter((status) => status.assignmentStatus === 'partial').length;
      const curated = assigned + partial;
      if (assigned === statuses.length && partial === 0) {
        summary.fullyCuratedEffects += 1;
      } else if (curated > 0) {
        summary.partiallyCuratedEffects += 1;
      } else {
        summary.uncuratedEffects += 1;
      }
    }
  }

  return summary;
}

function writeEffectCurationCsv(file: string, rows: readonly CurationRow[]): void {
  const groups = buildEffectGroups(rows);
  const out = [
    'set,cardNumber,name,category,effectIndex,assignmentId,atomCount,parserRecognizedAtoms,parserUnrecognizedAtoms,markerTags,permutationKey,atomicEffectIds,rawText',
    ...groups.map((group) =>
      [
        group.setCode,
        group.cardNumber,
        group.name,
        group.category,
        group.effectIndex,
        group.assignmentId,
        group.atomIds.length,
        group.parserRecognized,
        group.parserUnrecognized,
        group.markerTags,
        group.permutationKey,
        group.atomIds.join('+'),
        group.rawText,
      ]
        .map(csv)
        .join(','),
    ),
  ];
  writeText(file, out.join('\n') + '\n');
}

function draftValue(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n');
}

function writeAssignmentDraft(file: string, setCode: string, rows: readonly CurationRow[], parsed: ReturnType<typeof parseCardEffect_V2>[]): void {
  const parsedByCard = new Map(parsed.map((cardParse) => [cardParse.cardNumber, cardParse]));
  const groups = buildEffectGroups(rows);

  const lines: string[] = [];
  lines.push(`// Draft V2 assignments for ${setCode}.`);
  lines.push('// Generated by npm run effects:v2. Copy reviewed entries into src/cards/effectCompiler_V2/assignments/<SET>_V2.ts.');
  lines.push('// One draft entry is emitted per card effect, not per atom. Review the whole atomic sequence as one reusable permutation.');
  lines.push('// Parser-recognized atoms include suggested canonical actions; review selectors, gates, costs, durations, and result dependencies before using.');
  lines.push("import type { EffectAssignment_V2 } from '../../src/cards/effectCompiler_V2/types_V2';");
  lines.push('');
  lines.push(`export const ${setCode}_ASSIGNMENT_DRAFTS_V2: readonly Partial<EffectAssignment_V2>[] = [`);
  for (const group of groups) {
    const cardParse = parsedByCard.get(group.cardNumber);
    const effect = cardParse?.effects[group.effectIndex];
    const atoms = group.atomIds.map((atomId) => cardParse?.atomicEffects.find((a) => a.id === atomId)).filter(Boolean);
    lines.push(`  // ${group.cardNumber} effect ${group.effectIndex}`);
    lines.push(`  // Permutation: ${group.permutationKey}`);
    lines.push(`  // Printed: ${effect?.metadata.printedText ?? group.rawText}`);
    for (const atom of atoms) {
      if (!atom) continue;
      lines.push(`  // - ${atom.id}: ${atom.rawText}`);
      if (atom.parsedAction || atom.parsedCost) {
        lines.push(`  //   suggested: ${JSON.stringify(atom.parsedAction ?? atom.parsedCost)}`);
      } else {
        lines.push(`  //   parser gap (${atom.unrecognizedKind ?? 'unclassified'}): ${atom.uncoveredReason}`);
        if (atom.trackingRemark) lines.push(`  //   remark: ${atom.trackingRemark}`);
      }
    }
    lines.push('  {');
    lines.push(`    assignmentId: '${group.assignmentId}',`);
    lines.push(`    cardNumber: '${group.cardNumber}',`);
    lines.push(`    effectIndex: ${group.effectIndex},`);
    lines.push("    status: 'UNCOVERED',");
    lines.push(`    printedText: ${JSON.stringify(effect?.metadata.printedText ?? group.rawText)},`);
    lines.push(`    coveredAtomicEffectIds: ${draftValue(group.atomIds)},`);
    lines.push('    // effect: TODO_reviewed_canonical_effect,');
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  writeText(file, lines.join('\n'));
}

function writeAutoAssignmentsTs(file: string, setCode: string, assignments: readonly EffectAssignment_V2[]): void {
  const lines: string[] = [];
  lines.push(`// Auto-curated V2 assignments for ${setCode}.`);
  lines.push('// Generated by npm run effects:v2 from fully parser-recognized canonical atoms.');
  lines.push('// Review before copying into src/cards/effectCompiler_V2/assignments/<SET>_V2.ts.');
  lines.push("import type { EffectAssignment_V2 } from '../../src/cards/effectCompiler_V2/types_V2';");
  lines.push('');
  lines.push(`export const ${setCode}_AUTO_ASSIGNMENTS_V2 = ${JSON.stringify(assignments, null, 2)} satisfies readonly EffectAssignment_V2[];`);
  lines.push('');
  writeText(file, lines.join('\n'));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const setCodes = args.sets ?? availableSetCodes();
  const unknownAssignmentSets = Object.keys(ASSIGNMENTS_BY_SET_V2).filter((setCode) => !setCodes.includes(setCode));
  void unknownAssignmentSets;

  const allSummary: unknown[] = [];
  const allCurationRows: CurationRow[] = [];
  for (const setCode of setCodes) {
    const cards = readSet(setCode);
    const manualAssignments = getEffectAssignmentsForSets_V2([setCode]);
    const parsed = cards.map((card) => parseCardEffect_V2(card.cardNumber, effectTextFor(card)));
    const autoAssignments = buildAutoAssignments(parsed, manualAssignments);
    const assignments = [...manualAssignments, ...autoAssignments];
    const compiled = parsed.map((cardParse) => compileCardEffects_V2(cardParse, assignments));
    const coverage = parsed.map((cardParse) => buildCoverageReportFromAssignments_V2(cardParse, assignments));
    const mongoAssignmentDocs = compiled.flatMap(toMongoEffectAssignmentDocuments_V2);
    const mongoCardDocs = compiled.map((cardCompiled, index) => toMongoCompiledCardEffectDocument_V2(cardCompiled, coverage[index]));
    const curationRows = buildCurationRows(setCode, cards, coverage, parsed);
    allCurationRows.push(...curationRows);

    const setOut = join(args.outDir, setCode);
    writeJson(join(setOut, 'coverage.json'), coverage);
    writeJson(join(setOut, 'auto-assignments.json'), autoAssignments);
    writeAutoAssignmentsTs(join(setOut, 'auto-assignments.ts'), setCode, autoAssignments);
    writeJson(join(setOut, 'mongo-assignments.json'), mongoAssignmentDocs);
    writeJson(join(setOut, 'mongo-cards.json'), mongoCardDocs);
    if (args.debug) {
      writeJson(join(setOut, 'parsed.json'), parsed);
      writeJson(join(setOut, 'compiled.json'), compiled);
      writeCurationCsv(join(setOut, 'curation.csv'), curationRows);
      writeEffectCurationCsv(join(setOut, 'curation-effects.csv'), curationRows);
      writeCurationMd(join(setOut, 'curation.md'), setCode, curationRows);
      writeAssignmentDraft(join(setOut, 'assignment-draft.ts'), setCode, curationRows, parsed);
    }

    const totalAtomic = coverage.reduce((sum, report) => sum + report.totalAtomicEffects, 0);
    const parserRecognizedAtomic = coverage.reduce((sum, report) => sum + report.parserRecognizedAtomicEffects, 0);
    const parserUnrecognizedAtomic = coverage.reduce((sum, report) => sum + report.parserUnrecognizedAtomicEffects, 0);
    const coveredAtomic = coverage.reduce((sum, report) => sum + report.assignmentCoveredAtomicEffects, 0);
    const partialAtomic = coverage.reduce((sum, report) => sum + report.assignmentPartialAtomicEffects, 0);
    const uncoveredAtomic = coverage.reduce((sum, report) => sum + report.assignmentUncoveredAtomicEffects, 0);
    const curatedSummary = summarizeCuratedCoverage(coverage);
    const summary = {
      setCode,
      cards: cards.length,
      manualAssignments: manualAssignments.length,
      autoAssignments: autoAssignments.length,
      assignments: assignments.length,
      totalAtomicEffects: totalAtomic,
      parserRecognizedAtomicEffects: parserRecognizedAtomic,
      parserUnrecognizedAtomicEffects: parserUnrecognizedAtomic,
      assignmentCoveredAtomicEffects: coveredAtomic,
      assignmentPartialAtomicEffects: partialAtomic,
      assignmentUncoveredAtomicEffects: uncoveredAtomic,
      ...curatedSummary,
    };
    allSummary.push(summary);
    console.log(
      `[effects:v2] ${setCode}: ${cards.length} cards, ${manualAssignments.length} manual + ${autoAssignments.length} auto assignments, assignments ${coveredAtomic}/${totalAtomic} atomic effects covered (${partialAtomic} partial, ${uncoveredAtomic} unassigned), parser recognized ${parserRecognizedAtomic}/${totalAtomic} (${parserUnrecognizedAtomic} unrecognized)`,
    );
    console.log(
      `[effects:v2] ${setCode}: curated effects full ${curatedSummary.fullyCuratedEffects}, partial ${curatedSummary.partiallyCuratedEffects}, uncurated ${curatedSummary.uncuratedEffects}; cards full ${curatedSummary.fullyCuratedCards}, partial ${curatedSummary.partiallyCuratedCards}, uncurated ${curatedSummary.uncuratedCards}, no-effect ${curatedSummary.noEffectCards}`,
    );
  }

  const aggregateSummary = allSummary.reduce<{
    cards: number;
    manualAssignments: number;
    autoAssignments: number;
    assignments: number;
    totalAtomicEffects: number;
    parserRecognizedAtomicEffects: number;
    parserUnrecognizedAtomicEffects: number;
    assignmentCoveredAtomicEffects: number;
    assignmentPartialAtomicEffects: number;
    assignmentUncoveredAtomicEffects: number;
    fullyCuratedCards: number;
    partiallyCuratedCards: number;
    uncuratedCards: number;
    noEffectCards: number;
    fullyCuratedEffects: number;
    partiallyCuratedEffects: number;
    uncuratedEffects: number;
  }>(
    (total, rawSummary) => {
      const summary = rawSummary as CuratedCoverageSummary & {
        cards: number;
        manualAssignments: number;
        autoAssignments: number;
        assignments: number;
        totalAtomicEffects: number;
        parserRecognizedAtomicEffects: number;
        parserUnrecognizedAtomicEffects: number;
        assignmentCoveredAtomicEffects: number;
        assignmentPartialAtomicEffects: number;
        assignmentUncoveredAtomicEffects: number;
      };
      total.cards += summary.cards;
      total.manualAssignments += summary.manualAssignments;
      total.autoAssignments += summary.autoAssignments;
      total.assignments += summary.assignments;
      total.totalAtomicEffects += summary.totalAtomicEffects;
      total.parserRecognizedAtomicEffects += summary.parserRecognizedAtomicEffects;
      total.parserUnrecognizedAtomicEffects += summary.parserUnrecognizedAtomicEffects;
      total.assignmentCoveredAtomicEffects += summary.assignmentCoveredAtomicEffects;
      total.assignmentPartialAtomicEffects += summary.assignmentPartialAtomicEffects;
      total.assignmentUncoveredAtomicEffects += summary.assignmentUncoveredAtomicEffects;
      total.fullyCuratedCards += summary.fullyCuratedCards;
      total.partiallyCuratedCards += summary.partiallyCuratedCards;
      total.uncuratedCards += summary.uncuratedCards;
      total.noEffectCards += summary.noEffectCards;
      total.fullyCuratedEffects += summary.fullyCuratedEffects;
      total.partiallyCuratedEffects += summary.partiallyCuratedEffects;
      total.uncuratedEffects += summary.uncuratedEffects;
      return total;
    },
    {
      cards: 0,
      manualAssignments: 0,
      autoAssignments: 0,
      assignments: 0,
      totalAtomicEffects: 0,
      parserRecognizedAtomicEffects: 0,
      parserUnrecognizedAtomicEffects: 0,
      assignmentCoveredAtomicEffects: 0,
      assignmentPartialAtomicEffects: 0,
      assignmentUncoveredAtomicEffects: 0,
      fullyCuratedCards: 0,
      partiallyCuratedCards: 0,
      uncuratedCards: 0,
      noEffectCards: 0,
      fullyCuratedEffects: 0,
      partiallyCuratedEffects: 0,
      uncuratedEffects: 0,
    },
  );

  writeJson(join(args.outDir, 'summary.json'), {
    generatedBy: 'scripts/effect-v2/run.ts',
    outputMode: args.debug ? 'debug' : 'standard',
    selectedSets: setCodes,
    assignmentSetsAvailable: Object.keys(ASSIGNMENTS_BY_SET_V2).sort(),
    aggregate: aggregateSummary,
    sets: allSummary,
  });
  writeJson(ROOT_CANONICAL_REGISTRY_JSON, CANONICAL_ATOMS_V2);
  writeJson(ROOT_GUIDE_COVERAGE_JSON, buildGuideCoverageReport_V2());
  if (args.debug) {
    writeJson(join(args.outDir, 'canonical-registry.json'), CANONICAL_ATOMS_V2);
    writeJson(join(args.outDir, 'guide-coverage.json'), buildGuideCoverageReport_V2());
  }
  writeCurationCsv(ROOT_CURATION_CSV, allCurationRows);
  writeEffectCurationCsv(resolve(ROOT, 'effect-v2-curation-effects.csv'), allCurationRows);
  writeCurationMd(ROOT_CURATION_MD, null, allCurationRows);
  console.log(`[effects:v2] wrote ${args.outDir}`);
  console.log(`[effects:v2] wrote ${ROOT_CURATION_CSV}, ${ROOT_CURATION_MD}, ${ROOT_GUIDE_COVERAGE_JSON}, and ${ROOT_CANONICAL_REGISTRY_JSON}`);
}

try {
  main();
} catch (error) {
  console.error(`[effects:v2] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
