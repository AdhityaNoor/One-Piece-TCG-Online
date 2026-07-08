/**
 * Duplicate NOTE cleanup — ONLY removes NOTE blocks when card already has assignment.
 * Does NOT touch unassigned defer cards.
 * Run: node scripts/curate-batch.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';

const dryRun = process.argv.includes('--dry-run');
const dir = 'src/cards/effectTemplates/assignments';
const files = ['OP09', 'OP10', 'OP11', 'OP12', 'OP13', 'OP14', 'OP15', 'OP16', 'PRB', 'P'];

for (const f of files) {
  const fp = path.join(dir, `${f}.ts`);
  let txt = fs.readFileSync(fp, 'utf8');
  const assigned = new Set([...txt.matchAll(/cardNumber:\s*'([^']+)'/g)].map((m) => m[1]));

  const noteBlockRe =
    /(\r?\n  \/\/ ([A-Z0-9-]+)[^\r\n]*\r?\n(?:  \/\/[^\r\n]*\r?\n)*  \/\/ NOTE: not yet implemented[^\r\n]*\r?\n)/g;
  let removed = 0;
  txt = txt.replace(noteBlockRe, (block, _full, cardId) => {
    if (assigned.has(cardId)) {
      removed++;
      return '\n';
    }
    return block;
  });

  if (removed > 0 && !dryRun) fs.writeFileSync(fp, txt);
  if (removed > 0) console.log(`${f}: removed ${removed} duplicate NOTE blocks (assigned cards only)`);
}
