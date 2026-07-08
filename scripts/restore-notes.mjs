import { execSync } from 'child_process';
import fs from 'fs';

const restore = JSON.parse(fs.readFileSync('scripts/restore-notes.json', 'utf8'));
const byFile = new Map();
for (const r of restore) {
  if (!byFile.has(r.f)) byFile.set(r.f, []);
  byFile.get(r.f).push(r);
}

for (const [f, items] of byFile) {
  const path = `src/cards/effectTemplates/assignments/${f}.ts`;
  let txt = fs.readFileSync(path, 'utf8');
  // Insert restored blocks before closing `];`
  const blocks = items.map((i) => i.block).join('');
  if (!txt.includes('];')) {
    console.error('No closing bracket in', f);
    continue;
  }
  txt = txt.replace(/\r?\n\];\r?\n?$/, `${blocks}\n];\n`);
  fs.writeFileSync(path, txt);
  console.log(`${f}: restored ${items.length} NOTE blocks`);
}

console.log('Done restoring', restore.length, 'blocks');
