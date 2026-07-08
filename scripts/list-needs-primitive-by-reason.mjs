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
const reason = process.argv[2] ?? 'negate-effect';
for (const line of csv.trim().split('\n').slice(1)) {
  const [set, num, name, , bucket, caps, unmapped, reasons, text] = parseCsvLine(line);
  if (bucket !== 'needsPrimitive') continue;
  if (!(reasons || '').split('+').includes(reason)) continue;
  console.log(`${num} | ${caps || '-'} | ${unmapped || '-'} | ${text.slice(0, 120)}`);
}
