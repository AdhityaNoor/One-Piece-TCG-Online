/** Emit two SavedDeck objects (as a localStorage payload) for browser-side testing. */
import { writeFileSync } from 'node:fs';
import { buildDeckFor, loadCatalog } from './harness';
import type { CardDefinition } from '../../src/engine/state/card';

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));

function snapshot(def: CardDefinition, quantity: number) {
  return {
    cardNumber: def.cardNumber,
    variant: null,
    printingImageId: def.cardNumber,
    imageUrl: null,
    cachedImagePath: null,
    definition: def,
    rawPrinting: { card_image_id: def.cardNumber, card_image: null },
    quantity,
    warnings: [],
    sourceImportLines: null,
  };
}

function makeDeck(deckId: string, name: string, leaderNumber: string) {
  const leader = byNum.get(leaderNumber);
  if (!leader) throw new Error(`no leader ${leaderNumber}`);
  const list = buildDeckFor(leader, catalog);
  const counts = new Map<string, number>();
  for (const d of list) counts.set(d.cardNumber, (counts.get(d.cardNumber) ?? 0) + 1);
  const cards = [...counts.entries()].map(([num, qty]) => snapshot(byNum.get(num)!, qty));
  const now = new Date().toISOString();
  return {
    schemaVersion: 3,
    deckId,
    name,
    leader: snapshot({ ...leader, category: 'leader' }, 1),
    cards,
    donDeckSize: 10,
    accessories: { mainSleeveId: null, donSleeveId: null, donArtId: null },
    createdAt: now,
    updatedAt: now,
  };
}

const decks = [
  makeDeck('sim-deck-a', 'AI Test Red Zoro', 'OP01-001'),
  makeDeck('sim-deck-b', 'AI Test Law', 'OP01-002'),
];

const payload: Record<string, string> = {
  'optcg.deckIndex': JSON.stringify(decks.map((d) => ({ deckId: d.deckId, name: d.name, updatedAt: d.updatedAt }))),
};
for (const d of decks) payload[`optcg.deck.${d.deckId}`] = JSON.stringify(d);

writeFileSync('scripts/ai-sim/decks.localstorage.json', JSON.stringify(payload));
console.log('wrote', Object.keys(payload).join(', '), 'bytes:', JSON.stringify(payload).length);
