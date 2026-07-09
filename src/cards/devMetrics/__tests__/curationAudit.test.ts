import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../../../engine/effects/effectIr';
import { auditCuratedCard } from '../curationAudit';
import type { CatalogCard } from '../types';

function card(effectText: string): CatalogCard {
  return {
    cardNumber: 'TEST-001',
    setCode: 'TEST',
    category: 'leader',
    en: { name: 'Test Card', effectText },
  };
}

function program(timing: EffectProgram['abilities'][number]['timing']): EffectProgram {
  return {
    abilities: [{ timing, functions: [{ op: 'draw', amount: 1, player: 'controller' }] }],
  };
}

describe('auditCuratedCard timing markers', () => {
  it('accepts natural-language leader attack phrasing (OP12-081)', () => {
    const findings = auditCuratedCard(
      card(
        "When this Leader attacks your opponent's Leader, if you have 2 or more Characters with a cost of 8 or more, draw 1 card.",
      ),
      program('whenAttacking'),
    );
    expect(findings.filter((f) => f.category === 'timing')).toEqual([]);
  });

  it('accepts attacks-or-is-attacked phrasing (OP03-001)', () => {
    const findings = auditCuratedCard(
      card(
        'When this Leader attacks or is attacked, you may trash any number of Event or Stage cards from your hand. This Leader gains +1000 power during this battle for each card trashed by this effect.',
      ),
      program('whenAttacking'),
    );
    expect(findings.filter((f) => f.category === 'timing')).toEqual([]);
  });

  it("accepts opponent's character attack phrasing (OP11-088)", () => {
    const findings = auditCuratedCard(
      card(
        "[Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Once Per Turn] This effect can be activated when your opponent's Character attacks. If that Character has the <Slash> attribute, this Character gains +5000 power during this battle.",
      ),
      program('onOpponentsAttack'),
    );
    expect(findings.filter((f) => f.category === 'timing')).toEqual([]);
  });

  it('still flags bracket timings absent from text', () => {
    const findings = auditCuratedCard(card('[On Play] Draw 1 card.'), program('whenAttacking'));
    expect(findings.some((f) => f.category === 'timing' && f.detail === 'whenAttacking')).toBe(true);
  });
});
