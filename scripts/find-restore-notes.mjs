import { execSync } from 'child_process';
import fs from 'fs';

const files = ['OP09', 'OP10', 'OP11', 'OP12', 'OP13', 'OP14', 'OP15', 'OP16', 'PRB', 'P'];
const dir = 'src/cards/effectTemplates/assignments';

function noteBlocks(txt) {
  const blocks = new Map();
  const re = /\n  \/\/ ([A-Z0-9-]+)[^\n]*\n((?:  \/\/[^\n]*\n)*)  \/\/ NOTE: not yet implemented[^\n]*\n/g;
  let m;
  while ((m = re.exec(txt))) blocks.set(m[1], m[0]);
  return blocks;
}

function hasAssignment(txt, id) {
  return txt.includes(`cardNumber: '${id}'`);
}

const toRestore = [];

for (const f of files) {
  const path = `${dir}/${f}.ts`;
  const head = execSync(`git show HEAD:${path}`, { encoding: 'utf8' });
  let now = fs.readFileSync(path, 'utf8');
  const headNotes = noteBlocks(head);
  const nowNotes = noteBlocks(now);

  for (const [id, block] of headNotes) {
    if (nowNotes.has(id)) continue;
    if (hasAssignment(now, id)) continue; // assigned: user may not want note back
    toRestore.push({ f, id, block });
  }
}

console.log('Blocks to restore:', toRestore.length);
for (const r of toRestore) {
  console.log(`  ${r.f} ${r.id}`);
}

// Write restore data for next step
fs.writeFileSync('scripts/restore-notes.json', JSON.stringify(toRestore, null, 2));
