/**
 * Board presentation for the [On Your Opponent's Attack] window.
 *
 * The window used to be a button ("[On Opponent's Attack]") sitting beside "Activate Blocker",
 * which put a rules-automatic step (blueprint section 5: Attack Step, 7-1-1-3) behind a control
 * the player had to know to press, AFTER the Block Step had begun. It is now a prompt the client
 * opens by itself, and these are the two presentation rules that make it readable: the cards you
 * can pick are ringed, everything else on the mat recedes.
 *
 * All three signals — tappable, ringed, dimmed — are driven by the SAME `selectable` value here
 * rather than three separate re-derivations, which is why `fieldChoiceDimmed` takes it as an
 * argument instead of recomputing eligibility itself.
 */
import { describe, expect, it } from 'vitest';
import { fieldChoiceDimmed, leaderCharacterSelectable, promptHighlighted, replaceTargetSelected } from '../PlayerBoardPanel';
import type { BoardSelectionMode } from '../useBoardSelection';
import type { CardView } from '../../../../board/projection';

const card = (instanceId: string) => ({ instanceId }) as unknown as CardView;

const windowMode = (candidateInstanceIds: string[] = ['reactor']): BoardSelectionMode => ({
  kind: 'selectOnOppAttackSource',
  candidateInstanceIds,
});

describe("[On Your Opponent's Attack] window presentation", () => {
  it('dims every card the defender cannot activate, and leaves the eligible ones lit', () => {
    expect(fieldChoiceDimmed(windowMode(), card('reactor'), true)).toBe(false);
    expect(fieldChoiceDimmed(windowMode(), card('bystander'), false)).toBe(true);
  });

  it('leaves the rest of the mat alone once the window is closed', () => {
    const idle: BoardSelectionMode = { kind: 'idle' };
    expect(fieldChoiceDimmed(idle, card('bystander'), false)).toBe(false);
  });

  it('offers only the defender’s own eligible Leader/Character/Stage cards', () => {
    const eligible = (isOwn: boolean, zone: 'leaderArea' | 'characterArea' | 'stageArea', canOnOppAttack: boolean) =>
      leaderCharacterSelectable(windowMode(), isOwn, !isOwn, zone, card('reactor'), false, canOnOppAttack);

    expect(eligible(true, 'characterArea', true)).toBe(true);
    expect(eligible(true, 'leaderArea', true)).toBe(true);
    // A Stage can carry the ability too — unlike the Blocker window, which is Characters only.
    expect(eligible(true, 'stageArea', true)).toBe(true);
    // Not eligible right now (already used this battle, unaffordable cost, gate unmet, ...).
    expect(eligible(true, 'characterArea', false)).toBe(false);
    // Never the attacker's own board.
    expect(eligible(false, 'characterArea', true)).toBe(false);
  });
});

/**
 * The [Blocker] window (7-1-2-1) is the same shape, one step later. "Activate Blocker" used to be
 * a button that appeared to do nothing: it only switched modes, and the player still had to guess
 * which Character to tap. Both windows now share one dim/ring/tap contract, which is what these
 * assertions pin down.
 */
describe('[Blocker] window presentation', () => {
  const blockerMode = (candidateInstanceIds: string[] = ['blocker']): BoardSelectionMode => ({
    kind: 'selectBlocker',
    candidateInstanceIds,
  });

  it('offers exactly the engine-validated candidates, not every Character with the keyword', () => {
    const selectable = (instanceId: string) =>
      leaderCharacterSelectable(blockerMode(), true, false, 'characterArea', card(instanceId), false, false);

    expect(selectable('blocker')).toBe(true);
    // Has [Blocker] printed on it but is not in the candidate list — rested, already used this
    // battle, or under a "cannot activate [Blocker]" restriction. The old check offered it anyway.
    expect(selectable('restricted-blocker')).toBe(false);
  });

  it('never offers the Leader or Stage, which cannot block', () => {
    expect(leaderCharacterSelectable(blockerMode(), true, false, 'leaderArea', card('blocker'), false, false)).toBe(false);
    expect(leaderCharacterSelectable(blockerMode(), true, false, 'stageArea', card('blocker'), false, false)).toBe(false);
  });

  it('dims and rings on the same rule as the [On Your Opponent\'s Attack] window', () => {
    expect(fieldChoiceDimmed(blockerMode(), card('blocker'), true)).toBe(false);
    expect(fieldChoiceDimmed(blockerMode(), card('bystander'), false)).toBe(true);
    expect(promptHighlighted(blockerMode(), true)).toBe(true);
    expect(promptHighlighted(blockerMode(), false)).toBe(false);
    expect(promptHighlighted({ kind: 'idle' }, true)).toBe(false);
  });
});

/**
 * 3-7-6-1 replacement, picked BEFORE the DON!! is committed.
 *
 * The old flow played the card, then sprang a modal card gallery asking which Character to trash.
 * Now the confirm itself carries the question: the mat rings your own Characters, the picked one
 * takes the "selected" ring, and the confirm button states the consequence.
 */
describe('character-replacement pick during the play confirm', () => {
  const confirmMode = (over: Partial<Extract<BoardSelectionMode, { kind: 'confirmPlayCost' }>> = {}): BoardSelectionMode => ({
    kind: 'confirmPlayCost',
    handCardInstanceId: 'hand-1',
    cardCategory: 'character',
    cardName: 'Newcomer',
    cost: 3,
    donInstanceIds: ['d1', 'd2', 'd3'],
    replaceCandidateIds: ['field-a', 'field-b'],
    replaceInstanceId: null,
    replaceCardName: null,
    ...over,
  });

  it('offers only your own Characters as the replacement', () => {
    const pickable = (isOwn: boolean, zone: 'leaderArea' | 'characterArea' | 'stageArea', instanceId: string) =>
      leaderCharacterSelectable(confirmMode(), isOwn, !isOwn, zone, card(instanceId), false, false);

    expect(pickable(true, 'characterArea', 'field-a')).toBe(true);
    expect(pickable(true, 'characterArea', 'not-a-candidate')).toBe(false);
    // Neither the Leader nor a Stage occupies a Character Area slot, so neither can be replaced.
    expect(pickable(true, 'leaderArea', 'field-a')).toBe(false);
    expect(pickable(true, 'stageArea', 'field-a')).toBe(false);
    expect(pickable(false, 'characterArea', 'field-a')).toBe(false);
  });

  it('rings the candidates and dims the rest while the pick is outstanding', () => {
    expect(promptHighlighted(confirmMode(), true)).toBe(true);
    expect(fieldChoiceDimmed(confirmMode(), card('bystander'), false)).toBe(true);
  });

  it('leaves the mat alone for a play that fits on the field', () => {
    const plainConfirm = confirmMode({ replaceCandidateIds: [] });
    expect(promptHighlighted(plainConfirm, true)).toBe(false);
    expect(fieldChoiceDimmed(plainConfirm, card('bystander'), false)).toBe(false);
  });

  it('marks the chosen Character as picked', () => {
    const chosen = confirmMode({ replaceInstanceId: 'field-a', replaceCardName: 'Nami' });
    expect(replaceTargetSelected(chosen, card('field-a'))).toBe(true);
    expect(replaceTargetSelected(chosen, card('field-b'))).toBe(false);
  });

  it('rings the Character a drag is hovering, before any pick has been made', () => {
    // No mode at all yet — the drag is still in flight over the mat.
    expect(promptHighlighted({ kind: 'idle' }, false, card('field-b'), 'field-b')).toBe(true);
    expect(promptHighlighted({ kind: 'idle' }, false, card('field-a'), 'field-b')).toBe(false);
  });
});
