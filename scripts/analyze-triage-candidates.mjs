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
let withCaps = 0;
let capsOnly = 0;
const capTally = {};
for (const line of csv.trim().split('\n').slice(1)) {
  const [, num, , , bucket, caps, unmapped, reasons] = parseCsvLine(line);
  if (bucket !== 'needsPrimitive') continue;
  if (caps) {
    withCaps++;
    if (!unmapped || unmapped === '') capsOnly++;
    for (const c of caps.split('+').filter(Boolean)) capTally[c] = (capTally[c] || 0) + 1;
  }
}
console.log(`needsPrimitive with capabilities: ${withCaps}, without unmapped: ${capsOnly}`);
console.log('capability tally:');
for (const [k, v] of Object.entries(capTally).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${k}: ${v}`);

// cards with caps but no unmapped = easy curates
console.log('\npartial-parse curate candidates (caps, no unmapped):');
for (const line of csv.trim().split('\n').slice(1)) {
  const [set, num, name, , bucket, caps, unmapped, reasons] = parseCsvLine(line);
  if (bucket !== 'needsPrimitive' || !caps || unmapped) continue;
  console.log(`${num} | ${caps} | ${reasons || '-'}`);
}
