/**
 * Board statuses (cardStatus.ts) are driven end-to-end here: a real curated ability resolves
 * through executeAction, and the projection is asked what the board should now say about the
 * affected card. Asserting on a hand-built ContinuousEffectRecord would pass even if the engine
 * stopped producing that record shape, which is exactly the regression these labels exist to
 * catch (see project memory: "engine-only constraints are invisible to the board").
 */
import { describe, expect, it } from 'vitest';
import { executeAction } from '../../../engine/actions';
import { buildRegistryFromAssignments } from '../../../cards/effectTemplates/assembler';
import type { CardEffectAssignment, TemplateBinding } from '../../../cards/effectTemplates/assembler';
import {
  buildBaseRig,
  makeCharacterDef,
  nextTestId,
  putCharacterInPlay,
} from '../../../engine/rules/shared/__tests__/testRig';
import type { CardDefinition } from '../../../engine/state/card';
import { computeCardStatuses, type CardStatusKey } from '../cardStatus';
import { buildCardView } from '../cardView';

/**
 * Resolves one [Activate: Main] ability on a p1 source at a single p2 target, and returns the
 * post-resolution state plus the target's id. `functions` is the curated template payload, so
 * each test states the card text it is standing in for and nothing else.
 */
type AbilityFunctions = Extract<TemplateBinding, { templateId: 'ability' }>['params']['functions'];

function resolveAtOpponentCharacter(functions: AbilityFunctions, affectedOverrides: Partial<CardDefinition> = {}) {
  const source = makeCharacterDef({ cardDefinitionId: 'TEST-STATUS-SOURCE', cardNumber: 'TEST-STATUS-SOURCE', name: 'Status Source' });
  const affected = makeCharacterDef({
    cardDefinitionId: 'TEST-STATUS-TARGET',
    cardNumber: 'TEST-STATUS-TARGET',
    name: 'Status Target',
    ...affectedOverrides,
  });

  let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
  let sourceId: string;
  let affectedId: string;
  ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source));
  ({ rig, instanceId: affectedId } = putCharacterInPlay(rig, 'p2', affected));

  const assignments: CardEffectAssignment[] = [
    { cardNumber: source.cardDefinitionId, templateId: 'ability', params: { timing: 'activateMain', functions } },
  ];
  const registry = buildRegistryFromAssignments(assignments);

  const activated = executeAction(
    rig.state,
    { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceId, effectId: 'activateMain', donInstanceIds: [] },
    rig.defs,
    registry,
  );
  const choice = activated.state.pendingChoices[0];
  expect(choice, 'the ability should have asked which Character to hit').toBeTruthy();

  const resolved = executeAction(
    activated.state,
    { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [affectedId] },
    rig.defs,
    registry,
  );

  return { rig, state: resolved.state, affectedId, sourceId };
}

const keysOf = (statuses: readonly { key: CardStatusKey }[]) => statuses.map((status) => status.key);

describe('computeCardStatuses', () => {
  it('reports no status for a card on an untouched board', () => {
    const rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    const { rig: withCharacter, instanceId } = putCharacterInPlay(rig, 'p1', makeCharacterDef());
    expect(computeCardStatuses(withCharacter.defs, withCharacter.state, instanceId)).toEqual([]);
  });

  // 7-1-1-1: "your opponent cannot attack with that Character" (preventAttack).
  it("labels a Character an effect has locked out of attacking, and names the source and duration", () => {
    const { rig, state, affectedId } = resolveAtOpponentCharacter([
      { fn: 'preventAttack', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
    ]);

    const statuses = computeCardStatuses(rig.defs, state, affectedId);
    expect(keysOf(statuses)).toEqual(['cannotAttack']);
    expect(statuses[0].label).toBe("Can't attack");
    expect(statuses[0].detail).toContain('Status Source');
    expect(statuses[0].detail).toContain('during this turn');
  });

  // 7-1-2-1: "that Character cannot activate [Blocker]" (suppressBlockerOnTarget).
  it('labels a Blocker that can no longer block', () => {
    const { rig, state, affectedId } = resolveAtOpponentCharacter(
      [{ fn: 'suppressBlockerOnTarget', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }],
      { hasBlocker: true, text: '[Blocker]' },
    );

    expect(keysOf(computeCardStatuses(rig.defs, state, affectedId))).toContain('cannotBlock');
  });

  it('stays silent about a blocker restriction on a Character that has no [Blocker] to lose', () => {
    const { rig, state, affectedId } = resolveAtOpponentCharacter([
      { fn: 'suppressBlockerOnTarget', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
    ]);

    expect(keysOf(computeCardStatuses(rig.defs, state, affectedId))).not.toContain('cannotBlock');
  });

  // Effect negation: "negate the effect of that Character".
  it('labels a Character whose abilities have been negated', () => {
    const { rig, state, affectedId } = resolveAtOpponentCharacter(
      [{ fn: 'negateEffect', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }],
      { text: '[On Play] Draw 1 card.' },
    );

    const statuses = computeCardStatuses(rig.defs, state, affectedId);
    expect(keysOf(statuses)).toEqual(['nullified']);
    expect(statuses[0].label).toBe('Nullified');
  });

  it('does not label a vanilla Character as nullified', () => {
    const { rig, state, affectedId } = resolveAtOpponentCharacter([
      { fn: 'negateEffect', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
    ]);

    expect(keysOf(computeCardStatuses(rig.defs, state, affectedId))).toEqual([]);
  });

  it('carries the statuses onto the CardView the board renders', () => {
    const { rig, state, affectedId } = resolveAtOpponentCharacter([
      { fn: 'preventAttack', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
    ]);

    expect(keysOf(buildCardView(rig.defs, state, {}, affectedId).statuses)).toEqual(['cannotAttack']);
  });
});
