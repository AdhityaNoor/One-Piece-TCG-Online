import { execSync } from 'child_process';
import fs from 'fs';

const files = ['OP09', 'OP10', 'OP11', 'OP12', 'OP13', 'OP14', 'OP15', 'OP16', 'PRB', 'P'];
const dir = 'src/cards/effectTemplates/assignments';

function cardNumbers(txt) {
  return new Set([...txt.matchAll(/cardNumber:\s*'([^']+)'/g)].map((m) => m[1]));
}

function noteBlocks(txt) {
  const blocks = [];
  const re = /\n  \/\/ ([A-Z0-9-]+)[^\n]*\n((?:  \/\/[^\n]*\n)*)  \/\/ NOTE: not yet implemented[^\n]*\n/g;
  let m;
  while ((m = re.exec(txt))) {
    blocks.push({ id: m[1], text: m[0] });
  }
  return blocks;
}

let totalAdded = 0;
let totalNoteRemoved = 0;
let badRemovals = [];

for (const f of files) {
  const path = `${dir}/${f}.ts`;
  const head = execSync(`git show HEAD:${path}`, { encoding: 'utf8' });
  const now = fs.readFileSync(path, 'utf8');
  const headCards = cardNumbers(head);
  const nowCards = cardNumbers(now);
  const added = [...nowCards].filter((c) => !headCards.has(c));
  const headNotes = noteBlocks(head);
  const nowNotes = noteBlocks(now);
  const headNoteIds = new Set(headNotes.map((b) => b.id));
  const nowNoteIds = new Set(nowNotes.map((b) => b.id));
  const removedNotes = headNotes.filter((b) => !nowNoteIds.has(b.id));

  for (const b of removedNotes) {
    totalNoteRemoved++;
    const hadAssignmentBefore = headCards.has(b.id);
    const hasAssignmentNow = nowCards.has(b.id);
    const addedThisPass = added.includes(b.id);
    if (!hasAssignmentNow) {
      badRemovals.push({ file: f, id: b.id, hadAssignmentBefore });
    } else if (addedThisPass) {
      // ok: note removed because assignment added
    } else if (hadAssignmentBefore) {
      // duplicate note cleanup only
    } else {
      badRemovals.push({ file: f, id: b.id, hadAssignmentBefore, weird: true });
    }
  }
  totalAdded += added.length;
  console.log(`${f}: +${added.length} cards, -${removedNotes.length} NOTE blocks, now assigned=${nowCards.size}, defer notes=${nowNotes.length}`);
  if (added.length) console.log(`  added: ${added.join(', ')}`);
}

console.log('\nTOTAL added cardNumbers:', totalAdded);
console.log('TOTAL NOTE blocks removed:', totalNoteRemoved);
console.log('BAD removals (no assignment now):', badRemovals.length);
for (const b of badRemovals) {
  console.log(`  ${b.file} ${b.id} (hadAssignmentBefore=${b.hadAssignmentBefore})`);
}
