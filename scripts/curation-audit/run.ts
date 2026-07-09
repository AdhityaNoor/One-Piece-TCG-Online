/**
 * Curation audit — cross-checks every curated EffectProgram against its card's
 * printed effect text and flags LIKELY mis-mappings.
 *
 *   npm run audit:curation            # audit every set
 *   npm run audit:curation OP13       # only OP13
 *   npm run audit:curation OP13 EB03  # multiple sets
 *
 * WHY THIS EXISTS
 *   `npm run triage` only knows whether a card HAS a mapping, not whether the
 *   mapping is CORRECT. So a bogus assignment (e.g. Imu OP13-079 mapped to a
 *   "return {Roger Pirates} from trash" effect it never had) looks "curated"
 *   and silently drops out of every worklist. This tool re-reads the compiled
 *   IR and the source text side by side and surfaces those.
 *
 * HEURISTIC CHECKS (advisory — a human confirms each finding):
 *   - type literals   (typeIncludes / targetTypeIncludes / anyOfTypes / gate `type`)
 *                     must appear somewhere in the card text.
 *   - name literals   (name / targetName / anyOfNames / gate name fields)
 *                     must appear somewhere in the card text.
 *   - bracket keywords (blocker / rush / doubleAttack / banish) must appear.
 *   - safe timings    (onPlay / onKO / whenAttacking / activateMain / onBlock /
 *                     counter / onOpponentsAttack / trigger / lifeTrigger) must
 *                     have a matching [tag] in the text.
 *
 * These checks are deliberately conservative to keep false positives low. Some
 * flags are legitimate (e.g. a card that says "{Roger Pirates}" in Japanese-only
 * flavor) — this is a review aid, not a gate. Nothing here executes card logic.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED_EFFECT_PROGRAMS } from '../../src/cards/effectTemplates';
import type { Ability, EffectProgram, IrTiming } from '../../src/engine/effects/effectIr';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SETS_DIR = resolve(ROOT, 'public', 'cards', 'sets');
const OUT_CSV = resolve(ROOT, 'curation-audit.csv');
const OUT_MD = resolve(ROOT, 'curation-audit.md');

interface LocalCard {
  cardNumber: string;
  setCode: string;
  category: string;
  en: { name: string | null; effectText: string };
}

type Category = 'type' | 'name' | 'keyword' | 'timing';

interface Finding {
  cardNumber: string;
  setCode: string;
  name: string;
  category: Category;
  detail: string; // the literal / timing that is missing
  effectText: string;
}

/** Collapse to lowercase alphanumerics + single spaces so "{Roger Pirates}" == "Roger Pirates". */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Literals {
  types: Set<string>;
  names: Set<string>;
  keywords: Set<string>;
}

/** Recursively harvest the string literals a curated program asserts about a card. */
function collectLiterals(node: unknown, acc: Literals): void {
  if (Array.isArray(node)) {
    for (const v of node) collectLiterals(v, acc);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const isGate = typeof obj.kind === 'string';
  const isVarSelector = obj.sel === 'var'; // { sel: 'var', name: 't2' } — a binding, not a card name
  for (const [key, value] of Object.entries(obj)) {
    if ((key === 'typeIncludes' || key === 'targetTypeIncludes') && typeof value === 'string') {
      acc.types.add(value);
    } else if (key === 'anyOfTypes' && Array.isArray(value)) {
      for (const v of value) if (typeof v === 'string') acc.types.add(v);
    } else if (key === 'type' && isGate && typeof value === 'string') {
      acc.types.add(value);
    } else if ((key === 'name' || key === 'targetName') && typeof value === 'string' && !isVarSelector) {
      acc.names.add(value);
    } else if (key === 'anyOfNames' && Array.isArray(value)) {
      for (const v of value) if (typeof v === 'string') acc.names.add(v);
    } else if (key === 'keyword' && typeof value === 'string') {
      acc.keywords.add(value);
    }
    collectLiterals(value, acc);
  }
}

/** Keywords whose printed form is stable enough to check. */
const KEYWORD_TEXT: Record<string, string> = {
  blocker: 'blocker',
  rush: 'rush',
  doubleAttack: 'double attack',
  banish: 'banish',
};

/**
 * Timings with a recognizable printed form. Each regex also accepts the common
 * prose phrasing the card DB uses instead of a bracket tag (e.g. "When this
 * Character is K.O.'d" for onKO), so those don't read as false mismatches.
 * Ambiguous / engine-internal timings are intentionally omitted (never checked).
 */
const TIMING_MARKERS: Partial<Record<IrTiming, RegExp>> = {
  onPlay: /\[On Play\]/i,
  onKO: /\[On K\.?O\.?\]|K\.?O\.?['’ʼ]?d/i, // tag, or "…K.O.'d" past-tense trigger phrasing
  whenAttacking: /\[When Attacking\]/i,
  activateMain: /\[Activate:\s*Main\]|\[Main\]/i,
  onBlock: /\[On Block\]/i,
  counter: /\[Counter\]/i,
  onOpponentsAttack: /\[On (Your )?Opponent's Attack\]|when your opponent attacks/i,
  lifeTrigger: /\[Trigger\]/i,
};

function auditCard(card: LocalCard, program: EffectProgram): Finding[] {
  const text = card.en?.effectText ?? '';
  const findings: Finding[] = [];
  const base = { cardNumber: card.cardNumber, setCode: card.setCode, name: card.en?.name ?? '', effectText: text };
  const normText = norm(text);

  const lits: Literals = { types: new Set(), names: new Set(), keywords: new Set() };
  for (const ability of program.abilities) collectLiterals(ability as Ability, lits);

  for (const t of lits.types) {
    if (!normText.includes(norm(t))) findings.push({ ...base, category: 'type', detail: t });
  }
  const selfName = norm(card.en?.name ?? '');
  for (const n of lits.names) {
    // A card referencing its OWN name ("play this [Marco]") doesn't repeat it in effect text.
    if (selfName && norm(n) === selfName) continue;
    if (!normText.includes(norm(n))) findings.push({ ...base, category: 'name', detail: n });
  }
  for (const k of lits.keywords) {
    const marker = KEYWORD_TEXT[k];
    if (marker && !normText.includes(marker)) findings.push({ ...base, category: 'keyword', detail: k });
  }

  const seenTimings = new Set<IrTiming>();
  for (const ability of program.abilities) seenTimings.add(ability.timing);
  for (const timing of seenTimings) {
    const marker = TIMING_MARKERS[timing];
    if (marker && !marker.test(text)) findings.push({ ...base, category: 'timing', detail: timing });
  }

  return findings;
}

function csv(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main(): void {
  if (!existsSync(SETS_DIR)) {
    console.error(`[audit] no catalog at ${SETS_DIR} — run \`npm run build:assets\` first.`);
    process.exitCode = 1;
    return;
  }

  const setFilter = new Set(process.argv.slice(2).map((s) => s.toUpperCase()));

  const byNumber = new Map<string, LocalCard>();
  for (const f of readdirSync(SETS_DIR)) {
    if (!f.endsWith('.json')) continue;
    for (const c of JSON.parse(readFileSync(join(SETS_DIR, f), 'utf8')) as LocalCard[]) {
      byNumber.set(c.cardNumber, c);
    }
  }

  const findings: Finding[] = [];
  let scanned = 0;
  let missingCard = 0;

  for (const [cardNumber, program] of Object.entries(CURATED_EFFECT_PROGRAMS)) {
    const card = byNumber.get(cardNumber);
    if (!card) {
      missingCard++;
      continue;
    }
    if (setFilter.size > 0 && !setFilter.has(card.setCode.toUpperCase())) continue;
    if (!card.en?.effectText?.trim()) continue;
    scanned++;
    findings.push(...auditCard(card, program));
  }

  findings.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber) || a.category.localeCompare(b.category));

  const rows = ['cardNumber,set,name,category,detail,effectText'];
  for (const f of findings) {
    rows.push([f.cardNumber, f.setCode, f.name, f.category, f.detail, f.effectText].map(csv).join(','));
  }
  writeFileSync(OUT_CSV, rows.join('\n') + '\n', 'utf8');

  const byCategory = new Map<Category, number>();
  const bySet = new Map<string, number>();
  const flaggedCards = new Set<string>();
  for (const f of findings) {
    byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1);
    bySet.set(f.setCode, (bySet.get(f.setCode) ?? 0) + 1);
    flaggedCards.add(f.cardNumber);
  }

  const md: string[] = [];
  md.push('# Curation audit', '');
  md.push(
    `_Generated by \`npm run audit:curation${setFilter.size ? ' ' + [...setFilter].join(' ') : ''}\`. Scanned ${scanned} curated cards; ${flaggedCards.size} flagged (${findings.length} findings)._`,
    '',
  );
  md.push('Each finding = a literal or timing asserted by the curated IR that does NOT appear in the printed effect text. Flags are advisory; confirm before editing.', '');

  md.push('| Category | Findings | Meaning |', '| --- | ---: | --- |');
  md.push(`| type | ${byCategory.get('type') ?? 0} | a \`typeIncludes\`/gate type not found in text (likely wrong card) |`);
  md.push(`| name | ${byCategory.get('name') ?? 0} | a card-name literal not found in text |`);
  md.push(`| keyword | ${byCategory.get('keyword') ?? 0} | a granted keyword (Blocker/Rush/…) not found in text |`);
  md.push(`| timing | ${byCategory.get('timing') ?? 0} | a curated timing whose [tag] is absent from text |`);
  md.push('');

  if (bySet.size > 0) {
    md.push('## By set', '', '| Set | Findings |', '| --- | ---: |');
    for (const [set, n] of [...bySet.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      md.push(`| ${set} | ${n} |`);
    }
    md.push('');
  }

  md.push('## Findings', '');
  if (findings.length === 0) {
    md.push('_No mismatches found._', '');
  } else {
    md.push('| Card | Set | Category | Missing from text | Effect text |', '| --- | --- | --- | --- | --- |');
    for (const f of findings) {
      const shortText = f.effectText.length > 160 ? f.effectText.slice(0, 157) + '…' : f.effectText;
      md.push(
        `| ${f.cardNumber} | ${f.setCode} | ${f.category} | \`${f.detail}\` | ${shortText.replace(/\|/g, '\\|')} |`,
      );
    }
    md.push('');
  }

  if (!existsSync(dirname(OUT_MD))) mkdirSync(dirname(OUT_MD), { recursive: true });
  writeFileSync(OUT_MD, md.join('\n'), 'utf8');

  console.log(`[audit] scanned ${scanned} curated cards${setFilter.size ? ` (sets: ${[...setFilter].join(', ')})` : ''}.`);
  console.log(`  flagged cards  ${flaggedCards.size}`);
  for (const c of ['type', 'name', 'keyword', 'timing'] as Category[]) {
    console.log(`  ${c.padEnd(14)} ${byCategory.get(c) ?? 0}`);
  }
  if (missingCard > 0) console.log(`  (skipped ${missingCard} curated programs with no matching set card)`);
  console.log(`[audit] wrote ${OUT_CSV} and ${OUT_MD}`);
}

main();
