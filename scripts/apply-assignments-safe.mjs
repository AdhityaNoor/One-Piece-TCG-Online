/**
 * Safe curation helper — NEVER removes NOTE blocks unless assignment insert succeeded.
 * Usage: node scripts/apply-assignments-safe.mjs
 */
import fs from 'fs';
import path from 'path';

const dir = 'src/cards/effectTemplates/assignments';

/** @type {Record<string, Record<string, string>>} */
export const ASSIGNMENTS = {
  // Populated by apply-expressible batch — import from separate data file
};

function removeNoteBlock(txt, cardNumber) {
  const esc = cardNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `\\r?\\n  \\/\\/ ${esc}[^\\r\\n]*\\r?\\n(?:  \\/\\/[^\\r\\n]*\\r?\\n)*  \\/\\/ NOTE: not yet implemented[^\\r\\n]*\\r?\\n`,
    'g',
  );
  return txt.replace(re, '\n');
}

function insertAssignment(txt, snippet) {
  const block = `\n  ${snippet},\n`;
  if (txt.includes('// --- codegen batch ---')) {
    return txt.replace('  // --- codegen batch ---', `${block}\n  // --- codegen batch ---`);
  }
  return txt.replace(/\r?\n\];\r?\n?$/, `${block}\r\n];\r\n`);
}

export function applyAssignments(setName, assignments, { removeNote = false } = {}) {
  const fp = path.join(dir, `${setName}.ts`);
  let txt = fs.readFileSync(fp, 'utf8');
  let added = 0;
  let skipped = 0;

  for (const [cardNumber, snippet] of Object.entries(assignments)) {
    if (txt.includes(`cardNumber: '${cardNumber}'`)) {
      skipped++;
      continue;
    }
    const before = txt;
    txt = insertAssignment(txt, snippet);
    if (txt === before) {
      console.error(`${setName} ${cardNumber}: INSERT FAILED — NOTE kept`);
      continue;
    }
    if (removeNote) txt = removeNoteBlock(txt, cardNumber);
    added++;
  }

  fs.writeFileSync(fp, txt);
  return { added, skipped };
}
