/**
 * [Rush: Character] — "This card can attack Characters on the turn in which it is
 * played." It is NOT [Rush]: it never unlocks an attack on the Leader.
 *
 * Both scrapers folded it into the printed `hasRush` flag
 * (`text.includes('[Rush]') || text.includes('[Rush: Character]')`), which granted
 * UNRESTRICTED Rush — strictly more permissive than the card, and it also caught cards
 * that merely mention GRANTING [Rush: Character] to something else (EB04-007, OP15-093).
 * The engine models the real thing as the continuous keyword
 * `canAttackCharactersWhileSummoningSick`, granted by a curated onEnterPlay ability.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { runTimings } from '../../../engine/effects/interpreter';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  nextTestId,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { ALL_ASSIGNMENTS } from '../assignments';

const registry = buildRegistryFromAssignments(ALL_ASSIGNMENTS as never);

const SETS_DIR = resolve(__dirname, '../../../../public/cards/sets');
type CatalogCard = { cardNumber: string; en?: { effectText?: string }; definition?: { hasRush?: boolean } };
const catalog: CatalogCard[] = readdirSync(SETS_DIR)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(resolve(SETS_DIR, f), 'utf8')) as CatalogCard[]);

const rushCharacterCards = catalog.filter((c) => (c.en?.effectText ?? '').includes('[Rush: Character]'));

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId, attackerInstanceId, targetInstanceId };
}

describe('[Rush: Character] is never the printed [Rush] flag', () => {
  it('finds the affected cards at all (guards against the sweep silently going empty)', () => {
    expect(rushCharacterCards.length).toBeGreaterThanOrEqual(11);
  });

  it.each(rushCharacterCards.map((c) => [c.cardNumber, c] as const))(
    '%s does not carry hasRush',
    (_cardNumber, card) => {
      // hasRush means full [Rush]: may attack the Leader on the turn it is played.
      expect(card.definition?.hasRush ?? false).toBe(false);
    },
  );

  it.each(
    rushCharacterCards
      // EB04-007 / OP15-093 GRANT [Rush: Character] to another card; they do not have it.
      .filter((c) => (c.en?.effectText ?? '').trimStart().startsWith('[Rush: Character]'))
      .map((c) => [c.cardNumber] as const),
  )('%s grants canAttackCharactersWhileSummoningSick instead', (cardNumber) => {
    const program = registry[cardNumber];
    expect(program, `${cardNumber} has no curated program`).toBeDefined();
    expect(JSON.stringify(program)).toContain('canAttackCharactersWhileSummoningSick');
  });
});

describe('the keyword grants exactly what the reminder text says', () => {
  /** OP17-048 Shiki, freshly played (summoning sick), with its onEnterPlay keyword applied. */
  function freshShiki() {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let shikiId: string;
    ({ rig, instanceId: shikiId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardDefinitionId: 'OP17-048', cardNumber: 'OP17-048', name: 'Shiki', basePower: 9000, hasRush: false,
    }), { summoningSick: true }));
    let victimId: string;
    // Rested: 7-1-1-2 only ever allows attacking the Leader or a RESTED Character.
    // That restriction is independent of [Rush: Character] — lifting it is what the
    // SEPARATE `canAttackActive` keyword does (which is why EB04-011 carrying
    // canAttackActive in place of this keyword was a real miscuration, not a synonym).
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'VIC', cardNumber: 'VIC' }), { orientation: 'rested' }));
    const fired = runTimings(registry['OP17-048'], ['onEnterPlay'], rig.state, shikiId, rig.defs, null, registry);
    return { rig, state: fired.state, shikiId, victimId };
  }

  it('CAN attack an opponent Character on the turn it is played', () => {
    const { rig, state, shikiId, victimId } = freshShiki();
    const result = validateDeclareAttack(state, declareAttack('p1', shikiId, victimId), rig.defs);
    expect(result.legal, result.reasons.join(' | ')).toBe(true);
  });

  it('CANNOT attack the Leader on that turn — the bug the hasRush flag caused', () => {
    const { rig, state, shikiId } = freshShiki();
    const opponentLeaderId = state.players.p2.leaderInstanceId!;
    const result = validateDeclareAttack(state, declareAttack('p1', shikiId, opponentLeaderId), rig.defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/cannot attack the turn it was played/);
  });

  it('CANNOT attack one of your OWN Characters', () => {
    let { rig, state, shikiId } = freshShiki();
    let allyId: string;
    ({ rig, instanceId: allyId } = putCharacterInPlay({ state, defs: rig.defs }, 'p1', makeCharacterDef({ cardDefinitionId: 'ALLY', cardNumber: 'ALLY' }), { orientation: 'rested' }));
    const result = validateDeclareAttack(rig.state, declareAttack('p1', shikiId, allyId), rig.defs);
    expect(result.legal).toBe(false);
  });

  it('once it is no longer summoning sick, it attacks the Leader like any Character', () => {
    const { rig, state, shikiId } = freshShiki();
    const settled = { ...state, cardsById: { ...state.cardsById, [shikiId]: { ...state.cardsById[shikiId], summoningSick: false } } };
    const opponentLeaderId = settled.players.p2.leaderInstanceId!;
    const result = validateDeclareAttack(settled, declareAttack('p1', shikiId, opponentLeaderId), rig.defs);
    expect(result.legal, result.reasons.join(' | ')).toBe(true);
  });
});
