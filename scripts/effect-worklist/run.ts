/**
 * Effect-template review worklist generator.
 *
 *   npm run worklist
 *
 * Reads the local card catalog, skips cards that already have curated runtime
 * EffectProgram IR, then runs remaining raw English effect text through the
 * inert parser. The parser only describes text for triage; it is not runtime
 * behavior.
 *
 * Output: effect-review-worklist.csv (repo root).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEffect } from '../../src/cards/effectParser';
import { CURATED_EFFECT_PROGRAMS } from '../../src/cards/effectTemplates';

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

function effectActionCount(ability: { actions: { op: string }[] }): number {
  return ability.actions.filter((a) => a.op !== 'grantKeyword').length;
}

function main(): void {
  if (!existsSync(SETS_DIR)) {
    console.error(`[worklist] no catalog at ${SETS_DIR} - run \`npm run build:assets\` first.`);
    process.exitCode = 1;
    return;
  }

  const cards: LocalCard[] = [];
  for (const f of readdirSync(SETS_DIR)) {
    if (f.endsWith('.json')) cards.push(...(JSON.parse(readFileSync(join(SETS_DIR, f), 'utf8')) as LocalCard[]));
  }
  cards.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));

  const rows: string[] = ['set,cardNumber,name,category,timings,detectedOps,optional,conditional,parserReview,effectText'];
  const opTally = new Map<string, number>();
  let totalWithText = 0;
  let curated = 0;
  let keywordOnly = 0;
  let review = 0;

  for (const c of cards) {
    const text = c.en?.effectText ?? '';
    if (!text.trim()) continue;
    totalWithText++;

    if (CURATED_EFFECT_PROGRAMS[c.cardNumber]) {
      curated++;
      continue;
    }

    const parsed = parseEffect(c.cardNumber, text);
    const effectAbilities = parsed.abilities.filter((a) => effectActionCount(a) > 0);
    if (effectAbilities.length === 0) {
      keywordOnly++;
      continue;
    }

    review++;
    const timings = [...new Set(effectAbilities.map((a) => a.timing))].join('|');
    const ops = new Set<string>();
    let optional = false;
    let conditional = false;
    for (const ability of effectAbilities) {
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
      [c.setCode, c.cardNumber, c.en.name, c.category, timings, [...ops].join('+') || '(none)', optional ? 'yes' : '', conditional ? 'yes' : '', parsed.needsReview ? 'yes' : '', text]
        .map(csv)
        .join(','),
    );
  }

  writeFileSync(OUT_CSV, rows.join('\n') + '\n', 'utf8');
  console.log(`[worklist] ${review} cards need reviewed templates -> effect-review-worklist.csv`);
  console.log(`[worklist] skipped ${curated} curated cards and ${keywordOnly} keyword-only cards (${totalWithText} cards with text total).`);
  console.log('[worklist] detected parser hints (rough prioritization only):');
  for (const [op, n] of [...opTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${op}`);
  }
}

main();
