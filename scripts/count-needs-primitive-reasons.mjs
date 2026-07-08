import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const csv = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'effect-triage.csv'), 'utf8');
const lines = csv.trim().split('\n').slice(1);
const tally = {};
const cards = [];
for (const line of lines) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  const [set, num, , , bucket, , unmapped, reasons] = parts;
  if (bucket !== 'needsPrimitive') continue;
  const rs = (reasons || '').split('+').filter(Boolean);
  for (const r of rs) tally[r] = (tally[r] || 0) + 1;
  if (unmapped) tally['__unmapped__'] = (tally['__unmapped__'] || 0) + 1;
  cards.push({ set, num, reasons: rs, unmapped });
}
console.log('needsPrimitive reason tally:');
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
