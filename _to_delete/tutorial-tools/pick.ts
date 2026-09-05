import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { CURATED_EFFECT_PROGRAMS } from '../../src/cards/effectTemplates/curatedPrograms';
const PUBLIC = path.resolve(process.cwd(), 'public/cards');
const defs: any[] = [];
for (const f of readdirSync(path.join(PUBLIC, 'sets'))) {
  if (!f.endsWith('.json')) continue;
  const rows = JSON.parse(readFileSync(path.join(PUBLIC, 'sets', f), 'utf-8'));
  if (Array.isArray(rows)) for (const r of rows) if (r?.definition) defs.push(r.definition);
}
const [color, needle, maxCost] = [process.argv[2], process.argv[3], Number(process.argv[4] ?? 99)];
const out = defs.filter((d) =>
  (CURATED_EFFECT_PROGRAMS as any)[d.cardNumber] &&
  d.colors?.length === 1 && d.colors[0] === color &&
  (d.baseCost ?? 0) <= maxCost &&
  (d.text ?? '').includes(needle) &&
  !(d.text ?? '').includes('8 or more DON') &&
  !(d.text ?? '').includes('10 DON'));
out.sort((a, b) => (a.baseCost ?? 0) - (b.baseCost ?? 0));
for (const d of out.slice(0, 400)) console.log(`${d.cardNumber} ${d.name} (${d.category} c${d.baseCost ?? '-'} p${d.basePower ?? '-'} ctr${d.counter ?? 0}) :: ${d.text}`);
console.log(`(${out.length} matches)`);
