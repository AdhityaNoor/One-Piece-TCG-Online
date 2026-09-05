import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { CURATED_EFFECT_PROGRAMS } from '../../src/cards/effectTemplates/curatedPrograms';

const PUBLIC = path.resolve(process.cwd(), 'public/cards');
interface Def {
  cardNumber: string; name: string; colors: string[]; category: string;
  baseCost?: number; basePower?: number; counter?: number; text?: string;
  hasTrigger?: boolean; hasRush?: boolean; hasBlocker?: boolean; hasDoubleAttack?: boolean; hasBanish?: boolean;
}
const defs: Def[] = [];
for (const file of readdirSync(path.join(PUBLIC, 'sets'))) {
  if (!file.endsWith('.json')) continue;
  const rows = JSON.parse(readFileSync(path.join(PUBLIC, 'sets', file), 'utf-8'));
  if (Array.isArray(rows)) for (const row of rows) if (row?.definition) defs.push(row.definition as Def);
}
const curated = new Set(Object.keys(CURATED_EFFECT_PROGRAMS));
const COLORS = (process.argv[2] ?? 'purple,yellow').split(',');

const TESTS: Array<[string, (d: Def) => boolean]> = [
  ['On Play', (d) => !!d.text?.includes('[On Play]')],
  ['Rush', (d) => !!d.hasRush],
  ['Activate: Main', (d) => !!d.text?.includes('[Activate: Main]')],
  ['DON!! x1', (d) => !!d.text?.match(/\[DON!!\s*[x×]1\]/)],
  ['Once Per Turn', (d) => !!d.text?.includes('[Once Per Turn]')],
  ['End of Your Turn', (d) => !!d.text?.includes('[End of Your Turn]')],
  ['Blocker', (d) => !!d.hasBlocker],
  ['Trigger', (d) => !!d.hasTrigger],
  ['Double Attack', (d) => !!d.hasDoubleAttack],
  ['Banish', (d) => !!d.hasBanish],
  ['When Attacking', (d) => !!d.text?.includes('[When Attacking]')],
  ['Counter Event', (d) => d.category === 'event' && !!d.text?.includes('[Counter]')],
  ['Stage', (d) => d.category === 'stage'],
];

for (const color of COLORS) {
  console.log(`\n########## ${color.toUpperCase()} ##########`);
  for (const [label, test] of TESTS) {
    const list = defs.filter((d) => curated.has(d.cardNumber) && d.colors?.length === 1 && d.colors[0] === color && test(d));
    list.sort((a, b) => (a.baseCost ?? 0) - (b.baseCost ?? 0));
    console.log(`[${label}] ${list.length}: ${list.slice(0, 6).map((d) => `${d.cardNumber} ${d.name} (${d.category[0]}, c${d.baseCost ?? '-'}, p${d.basePower ?? '-'}, ctr${d.counter ?? 0})`).join(' | ')}`);
  }
}
