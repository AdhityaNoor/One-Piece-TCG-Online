/**
 * 3-7-6-1 with the replacement named UP FRONT.
 *
 * Playing a 6th Character is legal and forces a trash back down to 5. The board now lets the
 * player pick WHICH Character before committing the DON!!, so the play and its consequence are
 * one decision; `replaceInstanceId` is how that pick reaches the engine. Omitting it must leave
 * the old PendingChoice path untouched, because a Character entering play by card effect still
 * goes through it.
 */
import { describe, expect, it } from 'vitest';
import { executePlayCharacter, validatePlayCharacter } from '../playCharacter';
import { executeResolvePendingChoice, validateResolvePendingChoice } from '../resolvePendingChoice';
import {
  buildBaseRig,
  makeCharacterDef,
  nextTestId,
  putCharacterInPlay,
  putDon,
  putInHand,
  type Rig,
} from '../../../rules/shared/__tests__/testRig';

const PLAYED = makeCharacterDef({ cardDefinitionId: 'TEST-PLAYED', cardNumber: 'TEST-PLAYED', name: 'Newcomer', baseCost: 1 });

/** p1 with a FULL Character Area (5) plus `Newcomer` in hand and one active DON!! to pay for it. */
function fullBoardRig() {
  let rig: Rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
  const fieldIds: string[] = [];
  for (let index = 0; index < 5; index += 1) {
    const def = makeCharacterDef({ cardDefinitionId: `TEST-FIELD-${index}`, cardNumber: `TEST-FIELD-${index}`, name: `Field ${index}` });
    const placed = putCharacterInPlay(rig, 'p1', def);
    rig = placed.rig;
    fieldIds.push(placed.instanceId);
  }
  const hand = putInHand(rig, 'p1', PLAYED);
  rig = hand.rig;
  const don = putDon(rig, 'p1', 1);
  rig = don.rig;
  return { rig, fieldIds, handCardInstanceId: hand.instanceId, donInstanceIds: don.donIds };
}

const playAction = (handCardInstanceId: string, donInstanceIds: string[], replaceInstanceId?: string) => ({
  type: 'PLAY_CHARACTER' as const,
  actionId: nextTestId('action'),
  playerId: 'p1',
  handCardInstanceId,
  donInstanceIds,
  ...(replaceInstanceId ? { replaceInstanceId } : {}),
});

describe('PLAY_CHARACTER with a pre-named replacement', () => {
  it('trashes the named Character and asks nothing', () => {
    const { rig, fieldIds, handCardInstanceId, donInstanceIds } = fullBoardRig();
    const [replaced] = fieldIds;
    const action = playAction(handCardInstanceId, donInstanceIds, replaced);

    expect(validatePlayCharacter(rig.state, action, rig.defs).legal).toBe(true);

    const result = executePlayCharacter(rig.state, action, rig.defs);
    const player = result.state.players.p1;

    expect(result.pendingChoices).toHaveLength(0);
    expect(player.characterArea.cardIds).toHaveLength(5);
    expect(player.characterArea.cardIds).not.toContain(replaced);
    expect(player.trash.cardIds).toContain(replaced);
    expect(result.state.cardsById[replaced].currentZone).toBe('trash');
  });

  it('still raises the choice when no replacement was named — and now names its candidates', () => {
    const { rig, fieldIds, handCardInstanceId, donInstanceIds } = fullBoardRig();
    const result = executePlayCharacter(rig.state, playAction(handCardInstanceId, donInstanceIds), rig.defs);

    expect(result.pendingChoices).toHaveLength(1);
    const choice = result.pendingChoices[0];
    expect(choice.sourceEffectId).toBe('rule:characterAreaOverflow');
    // The board's field picker only engages on a non-empty candidate list; without one this
    // choice fell through to a modal gallery of cards already visible on the mat.
    expect(choice.constraints.candidateInstanceIds).toHaveLength(6);
    expect(choice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining(fieldIds));
  });

  it('lands the same board either way', () => {
    const viaChoice = fullBoardRig();
    const [replaced] = viaChoice.fieldIds;
    const played = executePlayCharacter(
      viaChoice.rig.state,
      playAction(viaChoice.handCardInstanceId, viaChoice.donInstanceIds),
      viaChoice.rig.defs,
    );
    const resolveAction = {
      type: 'RESOLVE_PENDING_CHOICE' as const,
      actionId: nextTestId('action'),
      playerId: 'p1',
      choiceId: played.pendingChoices[0].id,
      response: [replaced],
    };
    expect(validateResolvePendingChoice(played.state, resolveAction, viaChoice.rig.defs).legal).toBe(true);
    const resolved = executeResolvePendingChoice(played.state, resolveAction, viaChoice.rig.defs);

    const direct = fullBoardRig();
    const upFront = executePlayCharacter(
      direct.rig.state,
      playAction(direct.handCardInstanceId, direct.donInstanceIds, direct.fieldIds[0]),
      direct.rig.defs,
    );

    const shape = (player: { characterArea: { cardIds: string[] }; trash: { cardIds: string[] } }) => ({
      field: player.characterArea.cardIds.length,
      trashed: player.trash.cardIds.length,
    });
    expect(shape(upFront.state.players.p1)).toEqual(shape(resolved.state.players.p1));
    expect(upFront.state.players.p1.trash.cardIds).toContain(direct.fieldIds[0]);
    expect(resolved.state.players.p1.trash.cardIds).toContain(replaced);
  });

  it('refuses a replacement when the area is not actually full', () => {
    let rig: Rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    const placed = putCharacterInPlay(rig, 'p1', makeCharacterDef());
    rig = placed.rig;
    const hand = putInHand(rig, 'p1', PLAYED);
    rig = hand.rig;
    const don = putDon(rig, 'p1', 1);
    rig = don.rig;

    const result = validatePlayCharacter(rig.state, playAction(hand.instanceId, don.donIds, placed.instanceId), rig.defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('not full');
  });

  it("refuses a replacement that is not one of the player's own Characters", () => {
    const { rig, handCardInstanceId, donInstanceIds } = fullBoardRig();
    const foe = putCharacterInPlay(rig, 'p2', makeCharacterDef());

    const result = validatePlayCharacter(
      foe.rig.state,
      playAction(handCardInstanceId, donInstanceIds, foe.instanceId),
      foe.rig.defs,
    );
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('not one of');
  });
});
