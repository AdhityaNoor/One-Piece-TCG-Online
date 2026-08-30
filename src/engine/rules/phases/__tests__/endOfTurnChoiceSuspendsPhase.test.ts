/**
 * An [End of Your Turn] ability that needs a decision must hold the End Phase open until the
 * player answers.
 *
 * It used to emit its prompt and let the turn hand over anyway: `runEndPhaseAndHandoff` read only
 * `.state` / `.log` from `fireEndOfTurn`. By the time the player answered, `activePlayerId` was
 * the OPPONENT and the turn counter had advanced, so the effect resolved against the wrong active
 * player — attached-DON!! power bonuses (6-5-5-2) and every "[Your Turn]" condition read the wrong
 * way round — and "until end of turn" effects had already expired. `fireEndOfTurn` also kept
 * sweeping the rest of the field while the first prompt was unanswered, stacking choices.
 *
 * 37 curated cards have an [End of Your Turn] ability that prompts.
 */
import { describe, expect, it } from 'vitest';
import { executeAction } from '../../../actions/dispatch';
import { runEndPhaseAndHandoff } from '../runEndPhaseAndHandoff';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards, nextTestId } from '../../shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../../cards/effectTemplates/assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'EOT-SRC', cardNumber: 'EOT-SRC', name: 'Eot Source', basePower: 3000 });
const OTHER = makeCharacterDef({ cardDefinitionId: 'EOT-SRC-2', cardNumber: 'EOT-SRC-2', name: 'Eot Source 2', basePower: 3000 });
const FOE = makeCharacterDef({ cardDefinitionId: 'EOT-FOE', cardNumber: 'EOT-FOE', name: 'Foe', basePower: 1000, baseCost: 2 });

const koAtEndOfTurn = (cardNumber: string): CardEffectAssignment => ({
  cardNumber,
  templateId: 'ability',
  params: { timing: 'endOfTurn', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
});

const registry = buildRegistryFromAssignments([koAtEndOfTurn('EOT-SRC'), koAtEndOfTurn('EOT-SRC-2')]);

function rigWith(sources: number) {
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'end', turnNumber: 5 });
  ({ rig } = putCharacterInPlay(rig, 'p1', SRC));
  if (sources > 1) ({ rig } = putCharacterInPlay(rig, 'p1', OTHER));
  let foeId: string;
  ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE));
  rig = putDeckCards(rig, 'p2', FOE, 5).rig;
  rig = putDeckCards(rig, 'p1', SRC, 5).rig;
  return { rig, foeId };
}

describe('[End of Your Turn] choices hold the End Phase open', () => {
  it('does not hand the turn over while the choice is unanswered', () => {
    const { rig } = rigWith(1);

    const result = runEndPhaseAndHandoff(rig.state, rig.defs, registry);

    expect(result.state.pendingChoices).toHaveLength(1);
    expect(result.state.activePlayerId).toBe('p1'); // still the ending player's turn
    expect(result.state.turnNumber).toBe(5);
    expect(result.state.currentPhase).toBe('end');
  });

  it('asks one source at a time instead of sweeping the whole field', () => {
    const { rig } = rigWith(2);

    const result = runEndPhaseAndHandoff(rig.state, rig.defs, registry);

    expect(result.state.pendingChoices).toHaveLength(1);
  });

  it('answering resolves the effect on the ending player\'s turn, then hands over exactly once', () => {
    const { rig, foeId } = rigWith(2);

    const suspended = runEndPhaseAndHandoff(rig.state, rig.defs, registry);
    const firstChoice = suspended.state.pendingChoices[0];

    // Answer through the real dispatcher, which re-enters the phase cascade.
    const answered = executeAction(
      suspended.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('a'), playerId: 'p1', choiceId: firstChoice.id, response: [foeId] },
      rig.defs,
      registry,
    );

    expect(answered.state.players.p2.characterArea.cardIds).not.toContain(foeId);

    let state = answered.state;
    // Answer whatever the second source asks (its only candidate is gone, so it may not ask).
    while (state.pendingChoices.length > 0) {
      const choice = state.pendingChoices[0];
      state = executeAction(
        state,
        { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('a'), playerId: choice.playerId, choiceId: choice.id, response: [] },
        rig.defs,
        registry,
      ).state;
    }

    // Turn handed over exactly once, and the End Phase slate is clean for next time.
    expect(state.activePlayerId).toBe('p2');
    expect(state.turnNumber).toBe(6);
    expect(state.endOfTurnHandledKeys).toBeUndefined();
  });
});
