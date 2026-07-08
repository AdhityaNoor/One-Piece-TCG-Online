import fs from 'fs';
import path from 'path';

const csv = fs.readFileSync('effect-triage.csv', 'utf8').split(/\r?\n/).slice(1).filter(Boolean);
const express = csv
  .filter((l) => l.includes(',expressible,'))
  .map((l) => {
    const parts = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) {
        parts.push(cur);
        cur = '';
      } else cur += ch;
    }
    parts.push(cur);
    return { set: parts[0], card: parts[1], caps: parts[5], text: parts[8] ?? '' };
  });

const dir = 'src/cards/effectTemplates/assignments';
const assigned = new Set();
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.ts')) continue;
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of t.matchAll(/cardNumber:\s*'([^']+)'/g)) assigned.add(m[1]);
}

const missing = express.filter((c) => !assigned.has(c.card));
const bySet = {};
for (const c of missing) bySet[c.set] = (bySet[c.set] ?? 0) + 1;
console.log('missing', missing.length, 'of', express.length);
console.log(JSON.stringify(bySet, null, 2));
for (const c of missing) {
  console.log(`${c.card} | ${c.caps} | ${c.text.slice(0, 120)}`);
}
