/**
 * Layer 4 (interaction layer): the contextual row of action buttons below
 * the board. Every button just calls into useBoardSelection.ts's API —
 * this component holds no state and makes no legality decisions of its own.
 *
 * Phases 'refresh' | 'draw' | 'don' | 'end' are intentionally not handled
 * here: dispatch.ts runs advanceAutomaticPhases() synchronously after every
 * executed action (see rules/phases), so those phases never have a player
 * decision pending in them and the UI should never actually observe one as
 * "current" between two player actions. Same for currentBattle.step ===
 * 'damage' | 'endOfBattle' — passStep.ts resolves those synchronously too.
 */
import type { GameState } from '../../../engine/state/game';
import type { PlayerBoardView } from '../../../board/projection';
import { countAvailableDon } from '../../../board/projection';
import { Button } from '../Button';
import type { useBoardSelection } from './useBoardSelection';

export interface ActionBarProps {
  phase: GameState['currentPhase'];
  turnNumber: number;
  battle: GameState['currentBattle'];
  actingBoard: PlayerBoardView;
  selection: ReturnType<typeof useBoardSelection>;
}

const INSTRUCTIONS: Record<string, string> = {
  payingCost: 'Tap active DON!! cards in your Cost Area to pay the cost, then Confirm.',
  selectDonToGive: 'Tap an active DON!! card in your Cost Area to give.',
  selectGiveDonTarget: 'Tap your own Leader or Character to receive the DON!!.',
  selectAttacker: 'Tap your own active Leader or Character to attack with.',
  selectAttackTarget: "Tap the opponent's Leader, or a RESTED Character, to attack.",
  selectBlocker: 'Tap your own active [Blocker] Character.',
  selectCounterCard: 'Tap a hand Character with a Counter value to trash.',
  selectCounterBoostTarget: 'Tap your own Leader or Character to receive the power boost.',
};

export function ActionBar({ phase, turnNumber, battle, actingBoard, selection }: ActionBarProps) {
  const { mode, lastError, cancel, beginGiveDon, beginDeclareAttack, beginActivateBlocker, beginActivateCounter, confirmPlayCard, passStep, endMainPhase } = selection;

  const errorBanner = lastError && lastError.length > 0 && (
    <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
      {lastError.join(' ')}
    </div>
  );

  if (mode.kind !== 'idle') {
    return (
      <div className="flex flex-col gap-2">
        {errorBanner}
        <p className="text-xs text-white/60">{INSTRUCTIONS[mode.kind]}</p>
        <div className="flex flex-wrap gap-2">
          {mode.kind === 'payingCost' && (
            <Button variant="primary" size="sm" disabled={mode.selectedDonIds.length !== mode.cost} onClick={confirmPlayCard}>
              Confirm ({mode.selectedDonIds.length}/{mode.cost} DON!!)
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (battle && battle.step === 'block') {
    const hasEligibleBlocker = actingBoard.characterArea.some((c) => c.orientation === 'active' && c.hasBlocker);
    return (
      <div className="flex flex-col gap-2">
        {errorBanner}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!hasEligibleBlocker} onClick={beginActivateBlocker}>Activate Blocker</Button>
          <Button variant="ghost" size="sm" onClick={passStep}>Pass (skip Block)</Button>
        </div>
      </div>
    );
  }

  if (battle && battle.step === 'counter') {
    const hasEligibleCounter = actingBoard.hand.some((c) => c.category === 'character' && !!c.counter && c.counter > 0);
    return (
      <div className="flex flex-col gap-2">
        {errorBanner}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!hasEligibleCounter} onClick={beginActivateCounter}>Activate Counter</Button>
          <Button variant="ghost" size="sm" onClick={passStep}>Pass (end Counter Step)</Button>
        </div>
      </div>
    );
  }

  if (phase !== 'main') {
    return <p className="text-xs text-white/40">Resolving {phase} phase…</p>;
  }

  const availableDon = countAvailableDon(actingBoard);

  return (
    <div className="flex flex-col gap-2">
      {errorBanner}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={availableDon === 0} onClick={beginGiveDon}>Give DON!! ({availableDon} available)</Button>
        <Button variant="secondary" size="sm" disabled={turnNumber <= 2} onClick={beginDeclareAttack} title={turnNumber <= 2 ? 'Neither player may battle on their first turn (6-5-6-1).' : undefined}>
          Declare Attack
        </Button>
        <Button variant="primary" size="sm" onClick={endMainPhase}>End Main Phase</Button>
      </div>
    </div>
  );
}
