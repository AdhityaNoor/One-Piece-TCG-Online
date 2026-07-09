import fs from 'fs';

const lines = fs.readFileSync('effect-partial-curation.csv', 'utf8').split('\n').slice(1).filter(Boolean);
const rows = lines.map((line) => {
  const m = line.match(/^("([^"]*(?:""[^"]*)*)"|[^,]*),/);
  // simple parse - cardNumber is first field
  const parts = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; cur += ch; continue; }
    if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  const unq = (s) => s.replace(/^"|"$/g, '').replace(/""/g, '"');
  return {
    cardNumber: unq(parts[0]),
    setCode: unq(parts[1]),
    kind: unq(parts[3]),
    hasAssignment: unq(parts[4]) === 'true',
    isStale: unq(parts[5]) === 'true',
    note: unq(parts[8]),
  };
});

const assigned = rows.filter((r) => r.hasAssignment && r.kind !== 'batchNote');
const cards = new Set(assigned.map((r) => r.cardNumber).filter(Boolean));
console.log('unique assigned partial cards', cards.size);
const byKind = {};
for (const r of assigned) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log('by kind', byKind);

const patterns = {};
for (const r of assigned) {
  let key = r.note
    .replace(/OP\d{2}-\d{3}/g, 'CARD')
    .replace(/ST\d{2}-\d{3}/g, 'CARD')
    .replace(/EB\d{2}-\d{3}/g, 'CARD')
    .replace(/P-\d{3}/g, 'CARD')
  if (r.kind === 'notImplemented') key = 'NOTE: not yet implemented';
  else if (/PARTIAL:/i.test(r.note)) key = r.note.split('PARTIAL:')[1]?.trim().slice(0, 70) ?? r.note.slice(0, 70);
  patterns[key] = (patterns[key] || 0) + 1;
}
console.log('\nTop patterns:');
for (const [k, n] of Object.entries(patterns).sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(`${String(n).padStart(4)} | ${k}`);
}
