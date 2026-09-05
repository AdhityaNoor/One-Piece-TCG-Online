import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { CURATED_EFFECT_PROGRAMS } from '../../src/cards/effectTemplates/curatedPrograms';

const PUBLIC = path.resolve(process.cwd(), 'public/cards');
const defs = new Map<string, any>();
for (const file of readdirSync(path.join(PUBLIC, 'sets'))) {
  if (!file.endsWith('.json')) continue;
  const rows = JSON.parse(readFileSync(path.join(PUBLIC, 'sets', file), 'utf-8'));
  if (Array.isArray(rows)) for (const row of rows) if (row?.definition) defs.set(row.definition.cardNumber, row.definition);
}
for (const num of process.argv.slice(2)) {
  const d = defs.get(num);
  if (!d) { console.log(`${num}: NOT IN CATALOG`); continue; }
  const prog = (CURATED_EFFECT_PROGRAMS as any)[num];
  console.log(`\n### ${num} ${d.name} — ${d.category} ${d.colors.join('/')} cost ${d.baseCost ?? '-'} power ${d.basePower ?? '-'} counter ${d.counter ?? 0} types ${(d.types||[]).join(',')}`);
  console.log(`text: ${d.text || '(none)'}`);
  console.log(`curated: ${prog ? JSON.stringify(prog).slice(0, 700) : 'NONE'}`);
}
