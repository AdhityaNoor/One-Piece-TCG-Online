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
import { fieldChoiceDimmed, leaderCharacterSelectable } from '../PlayerBoardPanel';
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
