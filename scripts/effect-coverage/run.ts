/**
 * Effect IMPLEMENTATION-STATUS tracker.
 *
 *   npm run coverage
 *
 * Complements `npm run worklist` (which reports what the inert PARSER sees).
 * This tool runs every card's English effect text through the actual effect
 * COMPILER (src/cards/effectTemplates) — the source of truth for what the game
 * engine can really execute — and classifies each card:
 *
 *   complete       every effect-bearing ability lowered to executable IR
 *   partial        some abilities lowered, some did not
 *   unimplemented  has effect logic, but nothing lowered yet
 *   keyword        only keyword abilities ([Blocker]/[Rush]/…); handled by
 *                  engine flags, nothing for the effect compiler to do
 *   vanilla        no effect text at all
 *
 * Keyword-only abilities are NOT counted as "needing compilation": [Blocker],
 * [Rush], [Double Attack] and [Banish] are mechanically handled by
 * CardDefinition flags in the rules engine, not by the effect interpreter.
 *
 * Outputs (repo root):
 *   effect-coverage.csv  one row per card with effect text (the tracking table)
 *   effect-coverage.md   human-readable summary + the partial/unimplemented backlog
 *
 * Nothing here executes game logic; compileEffect only produces data (IR).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEffect } from '../../src/cards/effectParser';
import { compileEffect } from '../../src/cards/effectTemplates';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETS_DIR = resolve(ROOT, 'public', 'cards', 'sets');
const OUT_CSV = resolve(ROOT, 'effect-coverage.csv');
const OUT_MD = resolve(ROOT, 'effect-coverage.md');

interface LocalCard {
  cardNumber: string;
  setCode: string;
  category: string;
  en: { name: string | null; effectText: string };
}

type Status = 'complete' | 'partial' | 'unimplemented' | 'keyword' | 'vanilla';

interface Row {
  set: string;
  cardNumber: string;
  name: string;
  category: string;
  status: Status;
  compiledAbilities: number;
  effectAbilities: number;
  triggers: string;
  parserReview: boolean;
  effectText: string;
}

function csv(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Actions other than keyword grants — i.e. behavior the effect compiler must lower. */
function effectActionCount(ability: { actions: { op: string }[] }): number {
  return ability.actions.filter((a) => a.op !== 'grantKeyword').length;
}

function classify(card: LocalCard): Row {
  const text = card.en?.effectText ?? '';
  const base = {
    set: card.setCode,
    cardNumber: card.cardNumber,
    name: card.en?.name ?? '',
    category: card.category,
    effectText: text,
  };

  if (!text.trim()) {
    return { ...base, status: 'vanilla', compiledAbilities: 0, effectAbilities: 0, triggers: '', parserReview: false };
  }

  const parsed = parseEffect(card.cardNumber, text);
  const effectAbilities = parsed.abilities.filter((a) => effectActionCount(a) > 0).length;
  const program = compileEffect(card.cardNumber, text);
  const compiledAbilities = program ? program.abilities.length : 0;
  const triggers = program ? [...new Set(program.abilities.map((a) => a.trigger))].sort().join('|') : '';

  let status: Status;
  if (effectAbilities === 0) status = 'keyword';
  else if (compiledAbilities === 0) status = 'unimplemented';
  else if (compiledAbilities >= effectAbilities) status = 'complete';
  else status = 'partial';

  return { ...base, status, compiledAbilities, effectAbilities, triggers, parserReview: parsed.needsReview };
}

function main(): void {
  if (!existsSync(SETS_DIR)) {
    console.error(`[coverage] no catalog at ${SETS_DIR} — run \`npm run build:assets\` first.`);
    process.exitCode = 1;
    return;
  }

  const cards: LocalCard[] = [];
  for (const f of readdirSync(SETS_DIR)) {
    if (f.endsWith('.json')) cards.push(...(JSON.parse(readFileSync(join(SETS_DIR, f), 'utf8')) as LocalCard[]));
  }
  cards.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));

  const rows = cards.map(classify);

  // --- CSV (every card with effect text; vanilla cards omitted to keep it the effect backlog) ---
  const header = 'set,cardNumber,name,category,status,compiledAbilities,effectAbilities,triggers,parserReview,effectText';
  const csvLines = [header];
  for (const r of rows) {
    if (r.status === 'vanilla') continue;
    csvLines.push(
      [r.set, r.cardNumber, r.name, r.category, r.status, r.compiledAbilities, r.effectAbilities, r.triggers, r.parserReview ? 'yes' : '', r.effectText]
        .map(csv)
        .join(','),
    );
  }
  writeFileSync(OUT_CSV, csvLines.join('\n') + '\n', 'utf8');

  // --- Tallies ---
  const byStatus = new Map<Status, number>();
  const byTrigger = new Map<string, number>();
  for (const r of rows) {
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    if (r.status === 'complete' || r.status === 'partial') {
      for (const t of r.triggers.split('|').filter(Boolean)) byTrigger.set(t, (byTrigger.get(t) ?? 0) + 1);
    }
  }
  const order: Status[] = ['complete', 'partial', 'unimplemented', 'keyword', 'vanilla'];
  const withEffect = rows.filter((r) => r.status !== 'vanilla' && r.status !== 'keyword').length;
  const complete = byStatus.get('complete') ?? 0;

  // --- Markdown summary + backlog ---
  const md: string[] = [];
  md.push('# Effect implementation status', '');
  md.push(`_Generated by \`npm run coverage\`. ${cards.length} cards total._`, '');
  md.push('## Summary', '');
  md.push('| Status | Cards | Meaning |');
  md.push('| --- | ---: | --- |');
  const meaning: Record<Status, string> = {
    complete: 'every effect-bearing ability is executable',
    partial: 'some abilities executable, some not',
    unimplemented: 'has effect logic; nothing lowered yet',
    keyword: 'only keyword abilities; handled by engine flags',
    vanilla: 'no effect text',
  };
  for (const s of order) md.push(`| ${s} | ${byStatus.get(s) ?? 0} | ${meaning[s]} |`);
  md.push('');
  md.push(`**Effect-bearing cards: ${withEffect}. Fully implemented: ${complete} (${withEffect ? Math.round((complete / withEffect) * 100) : 0}%).**`, '');

  md.push('## Implemented abilities by trigger', '');
  md.push('| Trigger | Cards |');
  md.push('| --- | ---: |');
  for (const [t, n] of [...byTrigger.entries()].sort((a, b) => b[1] - a[1])) md.push(`| ${t} | ${n} |`);
  md.push('');

  const partials = rows.filter((r) => r.status === 'partial');
  md.push(`## Partially implemented (${partials.length}) — highest-value backlog`, '');
  if (partials.length === 0) md.push('_None._', '');
  else {
    md.push('| Card | Name | Compiled/Effect | Text |');
    md.push('| --- | --- | :-: | --- |');
    for (const r of partials.slice(0, 120)) {
      md.push(`| ${r.cardNumber} | ${r.name} | ${r.compiledAbilities}/${r.effectAbilities} | ${r.effectText.replace(/\|/g, '\\|').slice(0, 120)} |`);
    }
    if (partials.length > 120) md.push('', `…and ${partials.length - 120} more (see effect-coverage.csv).`);
  }
  md.push('');
  writeFileSync(OUT_MD, md.join('\n'), 'utf8');

  // --- Console ---
  console.log('[coverage] effect implementation status:');
  for (const s of order) console.log(`  ${s.padEnd(14)} ${byStatus.get(s) ?? 0}`);
  console.log(`  ${'-'.repeat(20)}`);
  console.log(`  effect-bearing ${withEffect}, complete ${complete} (${withEffect ? Math.round((complete / withEffect) * 100) : 0}%)`);
  console.log(`[coverage] wrote ${OUT_CSV}`);
  console.log(`[coverage] wrote ${OUT_MD}`);
}

main();
