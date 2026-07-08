import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function parseCsvLine(line) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

const csv = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'effect-triage.csv'), 'utf8');
const opTally = {};
const comboTally = {};
for (const line of csv.trim().split('\n').slice(1)) {
  const [, , , , bucket, , unmapped] = parseCsvLine(line);
  if (bucket !== 'needsPrimitive' || !unmapped) continue;
  for (const op of unmapped.split('+').filter(Boolean)) {
    opTally[op] = (opTally[op] || 0) + 1;
  }
  comboTally[unmapped] = (comboTally[unmapped] || 0) + 1;
}
console.log('unmapped op tally (needsPrimitive only):');
for (const [k, v] of Object.entries(opTally).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log('\ntop combos:');
for (const [k, v] of Object.entries(comboTally).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${v}x ${k}`);
