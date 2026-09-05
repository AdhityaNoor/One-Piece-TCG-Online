import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = async (url: unknown) => {
  const pathname = String(url).replace(/^https?:\/\/[^/]+/, '');
  const data = readFileSync(path.join(process.cwd(), 'public', pathname.replace(/^\//, '')), 'utf-8');
  return { ok: true, status: 200, json: async () => JSON.parse(data) } as Response;
};
void readdirSync;
const { buildTutorialScenario } = await import('../../src/features/tutorial/tutorialScenario');
const { CARD_EFFECTS_2 } = await import('../../src/features/tutorial/scenarios/cardEffects2');
const s = await buildTutorialScenario(CARD_EFFECTS_2);
for (const pid of ['p1', 'p2']) {
  const life = s.state.players[pid].lifeArea.cardIds;
  console.log(pid, 'life (index 0 first):', life.map((id) => s.defs[s.state.cardsById[id].cardDefinitionId]?.cardNumber).join(', '));
  const hand = s.state.players[pid].hand.cardIds;
  console.log(pid, 'hand:', hand.map((id) => s.defs[s.state.cardsById[id].cardDefinitionId]?.cardNumber).join(', '));
}
