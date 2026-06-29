/**
 * Effect-template review worklist generator.
 *
 *   npm run worklist
 *
 * Reads the local card catalog (public/cards/sets/*.json), runs each card's
 * English effect text through the inert effect parser, and writes a triage CSV
 * of every card that still needs a hand-authored effect template — tagged with
 * the recognized verb "ops" (KO / search / rest / trash / …), timings, and
 * optional/conditional flags so the backlog can be worked pattern-by-pattern.
 *
 * Output: effect-review-worklist.csv (repo root). Nothing here is executed as
 * game logic; the parser only describes the text.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEffect } from '../../src/cards/effectParser';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETS_DIR = resolve(ROOT, 'public', 'cards', 'sets');
const OUT_CSV = resolve(ROOT, 'effect-review-worklist.csv');

interface LocalCard {
  cardNumber: string;
  setCode: string;
  category: string;
  en: { name: string | null; effectText: string };
}

function csv(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main(): void {
  if (!existsSync(SETS_DIR)) {
    console.error(`[worklist] no catalog at ${SETS_DIR} — run \`npm run build:assets\` first.`);
    process.exitCode = 1;
    return;
  }

  const cards: LocalCard[] = [];
  for (const f of readdirSync(SETS_DIR)) {
    if (f.endsWith('.json')) cards.push(...(JSON.parse(readFileSync(join(SETS_DIR, f), 'utf8')) as LocalCard[]));
  }
  cards.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));

  const rows: string[] = ['set,cardNumber,name,category,timings,detectedOps,optional,conditional,effectText'];
  const opTally = new Map<string, number>();
  let total = 0;
  let review = 0;

  for (const c of cards) {
    const text = c.en?.effectText ?? '';
    if (!text.trim()) continue;
    total++;
    const parsed = parseEffect(c.cardNumber, text);
    if (!parsed.needsReview) continue;
    review++;

    const timings = [...new Set(parsed.abilities.map((a) => a.timing))].join('|');
    const ops = new Set<string>();
    let optional = false;
    let conditional = false;
    for (const ability of parsed.abilities) {
      for (const a of ability.actions) {
        if (a.op !== 'unrecognized') {
          ops.add(a.op);
          opTally.set(a.op, (opTally.get(a.op) ?? 0) + 1);
        }
        if ('optional' in a && a.optional) optional = true;
        if ('conditional' in a && a.conditional) conditional = true;
      }
    }
    rows.push(
      [c.setCode, c.cardNumber, c.en.name, c.category, timings, [...ops].join('+') || '(none)', optional ? 'yes' : '', conditional ? 'yes' : '', text]
        .map(csv)
        .join(','),
    );
  }

  writeFileSync(OUT_CSV, rows.join('\n'), 'utf8');
  console.log(`[worklist] ${review}/${total} cards need a template -> effect-review-worklist.csv`);
  console.log('[worklist] detected-op coverage (build templates in this rough priority):');
  for (const [op, n] of [...opTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${op}`);
  }
}

main();
