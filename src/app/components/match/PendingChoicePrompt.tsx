/**
 * Blocking modal for every PendingChoice / setup decision this milestone
 * actually produces: the 5-2-1-4 going-first choice, the 5-2-1-6 mulligan
 * decision (both player's-own-action types per dispatch.ts's pending-choice
 * gate, NOT RESOLVE_PENDING_CHOICE), and the generic 3-7-6-1 Character Area
 * overflow trash (the one real RESOLVE_PENDING_CHOICE case — see
 * actions/handlers/resolvePendingChoice.ts doc comment).
 *
 * Reuses the existing Modal shell rather than inventing a new one — this is
 * exactly the kind of "blocking decision" Modal.tsx already exists for.
 */
import { useState } from 'react';
import type { GameState } from '../../../engine/state/game';
import type { GameAction } from '../../../engine/actions';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';
import { createActionId, useMatchStore } from '../../store/matchStore';
import { projectPlayerBoard } from '../../../board/projection';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ZoneSection } from './ZoneSection';

export interface PendingChoicePromptProps {
  state: GameState;
  defs: CardDefinitionLookup;
  images: Record<string, string | null>;
}

export function PendingChoicePrompt({ state, defs, images }: PendingChoicePromptProps) {
  const dispatch = useMatchStore((s) => s.dispatch);
  const [error, setError] = useState<string[] | null>(null);
  const [selectedTrashId, setSelectedTrashId] = useState<string | null>(null);

  function run(action: GameAction): void {
    const result = dispatch(action);
    if (!result.ok) {
      setError(result.reasons);
    } else {
      setError(null);
      setSelectedTrashId(null);
    }
  }

  const errorBanner = error && error.length > 0 && (
    <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error.join(' ')}</p>
  );

  if (state.currentPhase === 'setup' && state.setupState) {
    const { setupState } = state;

    if (setupState.stage === 'awaitingGoingFirstChoice') {
      return (
        <Modal open onClose={() => {}} title="Going First">
          <div className="flex flex-col gap-3 p-5">
            <p className="text-sm text-white/70">
              <span className="font-bold text-white">{setupState.decidingPlayerId}</span> won the toss — going first or second? (5-2-1-4)
            </p>
            {errorBanner}
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => run({ type: 'CHOOSE_GOING_FIRST', actionId: createActionId(), playerId: setupState.decidingPlayerId, goingFirst: true })}>
                Go First
              </Button>
              <Button variant="secondary" onClick={() => run({ type: 'CHOOSE_GOING_FIRST', actionId: createActionId(), playerId: setupState.decidingPlayerId, goingFirst: false })}>
                Go Second
              </Button>
            </div>
          </div>
        </Modal>
      );
    }

    if (setupState.stage === 'awaitingMulliganDecision' && setupState.goingFirstPlayerId && setupState.goingSecondPlayerId) {
      const firstPlayer = state.players[setupState.goingFirstPlayerId];
      const decidingPlayerId = firstPlayer.hasMulliganed ? setupState.goingSecondPlayerId : setupState.goingFirstPlayerId;
      return (
        <Modal open onClose={() => {}} title="Mulligan">
          <div className="flex flex-col gap-3 p-5">
            <p className="text-sm text-white/70">
              <span className="font-bold text-white">{decidingPlayerId}</span>, redraw your opening hand of 5 once? (5-2-1-6)
            </p>
            {errorBanner}
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => run({ type: 'MULLIGAN_DECISION', actionId: createActionId(), playerId: decidingPlayerId, redraw: true })}>
                Redraw
              </Button>
              <Button variant="secondary" onClick={() => run({ type: 'MULLIGAN_DECISION', actionId: createActionId(), playerId: decidingPlayerId, redraw: false })}>
                Keep Hand
              </Button>
            </div>
          </div>
        </Modal>
      );
    }
  }

  const choice = state.pendingChoices[0];
  if (!choice) return null;

  if (choice.sourceEffectId === 'rule:characterAreaOverflow') {
    const board = projectPlayerBoard(state, defs, images, choice.playerId);
    return (
      <Modal open onClose={() => {}} title="Character Area Limit">
        <div className="flex flex-col gap-3 p-5">
          <p className="text-sm text-white/70">{choice.prompt}</p>
          {errorBanner}
          <ZoneSection
            label="Character Area"
            cards={board.characterArea}
            selectedIds={selectedTrashId ? new Set([selectedTrashId]) : undefined}
            selectableIds={new Set(board.characterArea.map((c) => c.instanceId))}
            onCardSelect={(card) => setSelectedTrashId(card.instanceId)}
          />
          <Button
            variant="danger"
            disabled={!selectedTrashId}
            onClick={() => selectedTrashId && run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: [selectedTrashId] })}
          >
            Trash Selected Character
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={() => {}} title="Pending Choice">
      <div className="flex flex-col gap-2 p-5">
        <p className="text-sm text-white/70">{choice.prompt}</p>
        <p className="text-xs text-red-300">No UI implemented yet for sourceEffectId '{choice.sourceEffectId}' (TODO — only the Character Area overflow choice is implemented this milestone).</p>
      </div>
    </Modal>
  );
}
