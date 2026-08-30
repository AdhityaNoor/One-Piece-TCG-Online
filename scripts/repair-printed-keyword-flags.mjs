/**
 * One-off data repair: re-derive the printed static-keyword flags on every stored
 * CardDefinition from the card's own text.
 *
 * Until 2026-08-27 the scraper set these flags with a bare substring test, so a card that only
 * MENTIONS a keyword — a conditional grant ("If you have 1 or less Life cards, this Character
 * gains [Blocker]"), a grant to another card ("Your [Blugori] gains [Blocker]"), a negation
 * ("your opponent cannot activate [Blocker]"), or the different keyword [Rush: Character] —
 * carried the keyword unconditionally. The engine checks the printed flag BEFORE any curated
 * conditional grant, so those cards blocked / rushed / banished with no condition at all.
 *
 * Rewrites scrape/cards/<set>/<card>.json and public/cards/sets/<SET>.json in place, using the
 * same derivation the app and the scraper now share (src/cards/normalization/printedKeywords.ts,
 * mirrored here because this script runs as plain ESM without the TS pipeline).
 *
 * Idempotent: running it again reports 0 changes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

function leadingBracketTags(text) {
  const tags = [];
  let rest = text.trimStart();
  while (rest.startsWith('[')) {
    const end = rest.indexOf(']');
    if (end < 0) break;
    tags.push(rest.slice(0, end + 1));
    rest = rest.slice(end + 1).trimStart();
    if (rest.startsWith('(')) {
      const close = rest.indexOf(')');
      if (close < 0) break;
      rest = rest.slice(close + 1).trimStart();
    }
  }
  return tags;
}

function hasPrintedKeyword(text, keyword) {
  if (leadingBracketTags(text).includes(`[${keyword}]`)) return true;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(String.raw`(?:^|[.!?])\s*\[${escaped}\](?:\s*(?:\(|\[|$))`, 'm').test(text);
}

const FLAGS = [
  ['hasRush', 'Rush'],
  ['hasBlocker', 'Blocker'],
  ['hasDoubleAttack', 'Double Attack'],
  ['hasBanish', 'Banish'],
  ['isUnblockable', 'Unblockable'],
];

/** Returns the list of changed flag names, mutating `definition` in place. */
function repair(definition, text) {
  const changed = [];
  for (const [flag, keyword] of FLAGS) {
    if (!(flag in definition)) continue;
    const derived = hasPrintedKeyword(text ?? '', keyword);
    if (definition[flag] !== derived) {
      definition[flag] = derived;
      changed.push(flag);
    }
  }
  return changed;
}

const changes = [];

// 1. public/cards/sets/*.json — what the app ships and loads.
const setsDir = 'public/cards/sets';
for (const file of (await readdir(setsDir)).filter((f) => f.endsWith('.json'))) {
  const path = join(setsDir, file);
  const cards = JSON.parse(await readFile(path, 'utf8'));
  let touched = false;
  for (const card of cards) {
    const text = card?.en?.effectText ?? card?.definition?.text ?? '';
    if (!card.definition) continue;
    const changed = repair(card.definition, text);
    if (changed.length > 0) {
      touched = true;
      changes.push(`${card.cardNumber} ${changed.join(',')}`);
    }
  }
  // 1-space indent + trailing newline-free shape, matching the scraper's own writer.
  if (touched) await writeFile(path, JSON.stringify(cards, null, 1), 'utf8');
}

// 2. scrape/cards/<set>/<card>.json — the raw store a regeneration reads back.
const rawRoot = 'scrape/cards';
for (const set of await readdir(rawRoot)) {
  let files;
  try {
    files = (await readdir(join(rawRoot, set))).filter((f) => f.endsWith('.json'));
  } catch {
    continue;
  }
  for (const file of files) {
    const path = join(rawRoot, set, file);
    const card = JSON.parse(await readFile(path, 'utf8'));
    if (!card?.definition) continue;
    const text = card?.en?.effectText ?? card?.definition?.text ?? '';
    const changed = repair(card.definition, text);
    if (changed.length > 0) {
      await writeFile(path, JSON.stringify(card), 'utf8');
      changes.push(`raw ${card.cardNumber} ${changed.join(',')}`);
    }
  }
}

console.log(`repaired ${changes.length} flag sets`);
for (const c of changes) console.log('  ' + c);
