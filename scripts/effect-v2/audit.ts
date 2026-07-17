import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Args {
  sets: string[] | null;
  outPrefix: string;
}

interface AuditRow {
  severity: 'high' | 'medium' | 'low';
  rule: string;
  setCode: string;
  cardNumber: string;
  assignmentId: string;
  effectIndex: number;
  printedText: string;
  actionTypes: string;
  remark: string;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = resolve(ROOT, 'effect-v2-output');
const DEFAULT_OUT_PREFIX = resolve(ROOT, 'effect-v2-semantic-audit');

function parseArgs(argv: string[]): Args {
  let sets: string[] | null = null;
  let outPrefix = DEFAULT_OUT_PREFIX;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--sets' || arg === '--set') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a comma-separated set list.`);
      sets = parseSetList(value);
      continue;
    }
    if (arg.startsWith('--sets=')) {
      sets = parseSetList(arg.slice('--sets='.length));
      continue;
    }
    if (arg === '--out-prefix') {
      const value = argv[++i];
      if (!value) throw new Error('--out-prefix requires a file prefix.');
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
  return value.split(',').map((entry) => entry.trim().toUpperCase()).filter(Boolean);
}

function printHelp(): void {
  console.log(`Audit generated V2 assignments for covered-but-suspicious semantic mismatches.

Usage:
  npm run effects:v2:audit
  npm run effects:v2:audit -- --sets OP15
  npm run effects:v2:audit -- --sets OP15,EB03 --out-prefix reports/v2-audit

Outputs:
  <out-prefix>.json
  <out-prefix>.csv
  <out-prefix>.md`);
}

function availableSetCodes(): string[] {
  if (!existsSync(OUTPUT_DIR)) throw new Error(`No effect-v2-output found at ${OUTPUT_DIR}. Run npm run effects:v2 first.`);
  return readdirSync(OUTPUT_DIR)
    .filter((name) => existsSync(resolve(OUTPUT_DIR, name, 'mongo-assignments.json')))
    .map((name) => name.toUpperCase())
    .sort();
}

function readAssignments(setCode: string): unknown[] {
  const file = resolve(OUTPUT_DIR, setCode, 'mongo-assignments.json');
  if (!existsSync(file)) throw new Error(`No generated assignments for ${setCode}; expected ${file}`);
  return JSON.parse(readFileSync(file, 'utf8')) as unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function walk(value: unknown, visit: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!isRecord(value)) return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}

function actionTypesOf(assignment: Record<string, unknown>): string[] {
  const types: string[] = [];
  walk(assignment.effect, (record) => {
    if (typeof record.type === 'string') types.push(record.type);
  });
  return [...new Set(types)];
}

function selectorsOf(assignment: Record<string, unknown>): Record<string, unknown>[] {
  const selectors: Record<string, unknown>[] = [];
  walk(assignment.effect, (record) => {
    if (typeof record.subject === 'string') selectors.push(record);
  });
  return selectors;
}

function actionsOf(assignment: Record<string, unknown>, type: string): Record<string, unknown>[] {
  const actions: Record<string, unknown>[] = [];
  walk(assignment.effect, (record) => {
    if (record.type === type) actions.push(record);
  });
  return actions;
}

function hasAction(assignment: Record<string, unknown>, type: string): boolean {
  return actionsOf(assignment, type).length > 0;
}

function hasSelectorCategory(assignment: Record<string, unknown>, categories: string[]): boolean {
  return selectorsOf(assignment).some((selector) => {
    const actual = selector.cardCategories;
    return Array.isArray(actual) && categories.every((category) => actual.includes(category));
  });
}

function hasBaseEffectSelector(assignment: Record<string, unknown>): boolean {
  return selectorsOf(assignment).some((selector) => selector.baseEffectStatus === 'NO_BASE_EFFECT');
}

function hasCostLayer(assignment: Record<string, unknown>, layer: string): boolean {
  return selectorsOf(assignment).some((selector) => isRecord(selector.cost) && selector.cost.propertyLayer === layer);
}

function hasPowerLayer(assignment: Record<string, unknown>, layer: string): boolean {
  return selectorsOf(assignment).some((selector) => isRecord(selector.power) && selector.power.propertyLayer === layer);
}

function hasModifyPowerLayer(assignment: Record<string, unknown>, layer: string): boolean {
  return actionsOf(assignment, 'MODIFY_POWER').some((action) => action.propertyLayer === layer);
}

function hasPreventAttack(assignment: Record<string, unknown>): boolean {
  return actionsOf(assignment, 'PREVENT_ACTION').some((action) => action.action === 'ATTACK' || action.action === 'DECLARE_ATTACK');
}

function hasAttackTargetModifier(assignment: Record<string, unknown>): boolean {
  return actionsOf(assignment, 'MODIFY_VALID_TARGETS').some((action) => action.action === 'ATTACK' || action.action === 'DECLARE_ATTACK');
}

function restPhraseTargetsCharacterOrCard(text: string): boolean {
  return /\brest\b[^.。]*\bcharacters?\b/.test(text) || /\brest\b[^.。]*\b(?:leader|stage) cards?\b/.test(text);
}

function restPhraseTargetsOnlyDon(text: string): boolean {
  return /\brest\b[^.。]*\bdon!!\b/.test(text) && !restPhraseTargetsCharacterOrCard(text);
}

function hasBasePowerModifierText(text: string): boolean {
  return /\b(?:base power becomes|base power.*?becomes|set the base power)\b/.test(text);
}

function hasBasePowerSelectorText(text: string): boolean {
  return /\bwith (?:a )?(?:base power of )?\d+\s+base power\b|\bwith (?:a )?base power of \d+\b|\b\d+\s+base power (?:or less|or more)\b/.test(text);
}

function allCostSelectorsUseBaseLayer(assignment: Record<string, unknown>): boolean {
  const costSelectors = selectorsOf(assignment).filter((selector) => isRecord(selector.cost));
  return costSelectors.length > 0 && costSelectors.every((selector) => isRecord(selector.cost) && selector.cost.propertyLayer === 'BASE');
}

function hasCostInSet34(assignment: Record<string, unknown>): boolean {
  return selectorsOf(assignment).some((selector) => {
    if (!isRecord(selector.cost)) return false;
    const cost = selector.cost;
    if (cost.comparison !== 'IN_SET' || !Array.isArray(cost.values)) return false;
    const values = cost.values
      .filter(isRecord)
      .map((value) => value.value)
      .sort();
    return values.length === 2 && values[0] === 3 && values[1] === 4;
  });
}

function maybeAdd(rows: AuditRow[], row: AuditRow, condition: boolean): void {
  if (condition) rows.push(row);
}

function auditAssignment(setCode: string, raw: unknown): AuditRow[] {
  if (!isRecord(raw)) return [];
  const printedText = String(raw.printedText ?? '');
  const lower = printedText.toLowerCase();
  const cardNumber = String(raw.cardNumber ?? '');
  const assignmentId = String(raw._id ?? raw.assignmentId ?? '');
  const effectIndex = Number(raw.effectIndex ?? 0);
  const actionTypes = actionTypesOf(raw).join(' -> ');
  const baseRow = { setCode, cardNumber, assignmentId, effectIndex, printedText, actionTypes };
  const rows: AuditRow[] = [];

  maybeAdd(rows, {
    ...baseRow,
    severity: 'high',
    rule: 'rest-character-not-don',
    remark: 'Text rests Character/card targets, but the generated action rests DON.',
  }, restPhraseTargetsCharacterOrCard(lower) && hasAction(raw, 'REST_DON') && !hasAction(raw, 'REST_CARD'));

  maybeAdd(rows, {
    ...baseRow,
    severity: 'high',
    rule: 'rest-don-not-card',
    remark: 'Text rests DON!! targets, but the generated action rests cards.',
  }, restPhraseTargetsOnlyDon(lower) && hasAction(raw, 'REST_CARD') && !hasAction(raw, 'REST_DON'));

  maybeAdd(rows, {
    ...baseRow,
    severity: 'high',
    rule: 'cannot-attack-missing-prevention',
    remark: 'Text says cannot attack, but no PREVENT_ACTION ATTACK record was generated.',
  }, /\bcannot attack\b|\bcan't attack\b/.test(lower) && !hasPreventAttack(raw) && !hasAttackTargetModifier(raw));

  maybeAdd(rows, {
    ...baseRow,
    severity: 'medium',
    rule: 'event-stage-filter-missing',
    remark: 'Text says Event or Stage cards, but no selector carries both EVENT and STAGE categories.',
  }, /\bevent or stage cards?\b/.test(lower) && !hasSelectorCategory(raw, ['EVENT', 'STAGE']));

  maybeAdd(rows, {
    ...baseRow,
    severity: 'medium',
    rule: 'no-base-effect-filter-missing',
    remark: 'Text says no base effect, but no selector carries baseEffectStatus NO_BASE_EFFECT.',
  }, /\bno base effects?\b|\bwithout (?:a )?base effects?\b/.test(lower) && !hasBaseEffectSelector(raw));

  maybeAdd(rows, {
    ...baseRow,
    severity: 'medium',
    rule: 'base-cost-current-layer',
    remark: 'Text says base cost, but a selector uses CURRENT cost.',
  }, (/\bbase cost\b|\bwith a base cost\b/.test(lower)) && hasCostLayer(raw, 'CURRENT') && !hasCostLayer(raw, 'BASE'));

  maybeAdd(rows, {
    ...baseRow,
    severity: 'medium',
    rule: 'base-power-current-layer',
    remark: 'Text says base power, but a selector/modifier uses CURRENT power.',
  }, (hasBasePowerSelectorText(lower) && hasPowerLayer(raw, 'CURRENT') && !hasPowerLayer(raw, 'BASE')) || (hasBasePowerModifierText(lower) && hasModifyPowerLayer(raw, 'CURRENT_VALUE') && !hasModifyPowerLayer(raw, 'BASE_VALUE')));

  maybeAdd(rows, {
    ...baseRow,
    severity: 'medium',
    rule: 'cost-3-or-4-not-in-set',
    remark: 'Text says cost of 3 or 4. This should be an IN_SET selector, not a continuous range.',
  }, /\bcost of 3 or 4\b/.test(lower) && !hasCostInSet34(raw));

  return rows;
}

function csv(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeText(file: string, value: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, value, 'utf8');
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function writeCsv(file: string, rows: readonly AuditRow[]): void {
  const headers: (keyof AuditRow)[] = ['severity', 'rule', 'setCode', 'cardNumber', 'assignmentId', 'effectIndex', 'actionTypes', 'printedText', 'remark'];
  writeText(file, [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csv(row[header])).join(',')),
  ].join('\n') + '\n');
}

function escapeMd(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function writeMarkdown(file: string, selectedSets: readonly string[], rows: readonly AuditRow[]): void {
  const bySeverity = new Map<string, number>();
  const byRule = new Map<string, number>();
  for (const row of rows) {
    bySeverity.set(row.severity, (bySeverity.get(row.severity) ?? 0) + 1);
    byRule.set(row.rule, (byRule.get(row.rule) ?? 0) + 1);
  }
  const md: string[] = [];
  md.push('# V2 Semantic Audit', '');
  md.push('_Generated by `npm run effects:v2:audit`. These are covered generated assignments that match suspicious text/IR heuristics._', '');
  md.push('| Metric | Count |', '| --- | ---: |');
  md.push(`| selected sets | ${selectedSets.length} |`);
  md.push(`| audit rows | ${rows.length} |`);
  md.push(`| high | ${bySeverity.get('high') ?? 0} |`);
  md.push(`| medium | ${bySeverity.get('medium') ?? 0} |`);
  md.push(`| low | ${bySeverity.get('low') ?? 0} |`);
  md.push('');
  md.push('## By Rule', '');
  md.push('| Rule | Count |', '| --- | ---: |');
  for (const [rule, count] of [...byRule.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    md.push(`| ${rule} | ${count} |`);
  }
  md.push('');
  md.push('## Rows', '');
  md.push('| Severity | Rule | Set | Card | Effect | Actions | Text | Remark |', '| --- | --- | --- | --- | ---: | --- | --- | --- |');
  for (const row of rows) {
    md.push(`| ${row.severity} | ${row.rule} | ${row.setCode} | ${row.cardNumber} | ${row.effectIndex} | ${escapeMd(row.actionTypes)} | ${escapeMd(row.printedText.slice(0, 180))} | ${escapeMd(row.remark)} |`);
  }
  md.push('');
  writeText(file, md.join('\n'));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const setCodes = args.sets ?? availableSetCodes();
  const rows = setCodes
    .flatMap((setCode) => readAssignments(setCode).flatMap((assignment) => auditAssignment(setCode, assignment)))
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity]
        || a.rule.localeCompare(b.rule)
        || a.cardNumber.localeCompare(b.cardNumber)
        || a.effectIndex - b.effectIndex;
    });
  const summary = {
    generatedBy: 'scripts/effect-v2/audit.ts',
    selectedSets: setCodes,
    auditRows: rows.length,
    high: rows.filter((row) => row.severity === 'high').length,
    medium: rows.filter((row) => row.severity === 'medium').length,
    low: rows.filter((row) => row.severity === 'low').length,
  };
  writeJson(`${args.outPrefix}.json`, { summary, rows });
  writeCsv(`${args.outPrefix}.csv`, rows);
  writeMarkdown(`${args.outPrefix}.md`, setCodes, rows);
  console.log(`[effects:v2:audit] wrote ${args.outPrefix}.json, ${args.outPrefix}.csv, and ${args.outPrefix}.md`);
  console.log(`[effects:v2:audit] ${rows.length} suspicious rows across ${setCodes.length} sets (${summary.high} high, ${summary.medium} medium, ${summary.low} low)`);
}

try {
  main();
} catch (error) {
  console.error(`[effects:v2:audit] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
