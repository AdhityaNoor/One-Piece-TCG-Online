/**
 * Removes stale "NOTE: not yet implemented" comment blocks when the card is
 * already assigned in the same file.
 *
 *   node scripts/partial-curation-scan/remove-stale-notes.mjs
 *   node scripts/partial-curation-scan/remove-stale-notes.mjs --write
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ASSIGNMENTS_DIR = path.join(ROOT, 'src', 'cards', 'effectTemplates', 'assignments');
const WRITE = process.argv.includes('--write');

const CARD_NUMBER_RE = /\b((?:(?:OP|ST|EB)\d{2}|PRB\d{2}|P)-\d{3})\b/g;
const ASSIGNMENT_RE = /cardNumber:\s*'([^']+)'/g;

function assignedCards(content) {
  const set = new Set();
  let m;
  ASSIGNMENT_RE.lastIndex = 0;
  while ((m = ASSIGNMENT_RE.exec(content)) !== null) set.add(m[1]);
  return set;
}

function cardIdsInComment(text) {
  CARD_NUMBER_RE.lastIndex = 0;
  const out = [];
  let m;
  while ((m = CARD_NUMBER_RE.exec(text)) !== null) out.push(m[1]);
  return out;
}

function removeStaleNotes(content) {
  const assigned = assignedCards(content);
  const lines = content.split(/\r?\n/);
  const remove = new Set();
  let removed = 0;

  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\/\/ NOTE: not yet implemented/i.test(lines[i])) continue;

    let cardId = null;
    for (let j = i - 1; j >= Math.max(0, i - 25); j -= 1) {
      const cm = lines[j].match(/^\s*\/\/\s?(.*)$/);
      if (!cm) {
        if (lines[j].trim() === '') continue;
        break;
      }
      const ids = cardIdsInComment(cm[1]);
      if (ids.length > 0) {
        cardId = ids[0];
        break;
      }
    }
    if (!cardId || !assigned.has(cardId)) continue;

    let start = i;
    for (let j = i - 1; j >= 0; j -= 1) {
      if (/^\s*\/\/ /.test(lines[j]) || lines[j].trim() === '') start = j;
      else break;
    }
    for (let j = start; j <= i; j += 1) remove.add(j);
    removed += 1;
  }

  if (remove.size === 0) return { content, removed: 0 };
  const out = lines.filter((_, idx) => !remove.has(idx)).join('\n');
  return { content: out, removed };
}

let totalBlocks = 0;
const files = fs.readdirSync(ASSIGNMENTS_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts').sort();

for (const file of files) {
  const filePath = path.join(ASSIGNMENTS_DIR, file);
  const original = fs.readFileSync(filePath, 'utf8');
  const { content, removed } = removeStaleNotes(original);
  if (removed > 0) {
    totalBlocks += removed;
    console.log(`${file}: removed ${removed} stale NOTE block(s)`);
    if (WRITE && content !== original) fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log(`[stale-notes] ${totalBlocks} block(s) ${WRITE ? 'removed' : 'would remove'} (pass --write to apply)`);
