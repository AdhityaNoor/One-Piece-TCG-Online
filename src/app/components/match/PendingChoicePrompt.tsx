/**
 * Blocking modal for every PendingChoice / setup decision this milestone
 * actually produces: the 5-2-1-4 going-first choice, the 5-2-1-6 mulligan
 * decision (both player's-own-action types per dispatch.ts's pending-choice
 * gate, NOT RESOLVE_PENDING_CHOICE), and the generic 3-7-6-1 Character Area
 * overflow trash (the one real RESOLVE_PENDING_CHOICE case — see
 * actions/handlers/resolvePendingChoice.ts doc comment).
 *
 * Reuses ChoicePromptPanel (gear-menu glass styling) rather than the heavy
 * Modal shell — blocking decisions get the same compact floating panel look
 * as the global settings menu.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameState } from '../../../engine/state/game';
import type { GameAction } from '../../../engine/actions';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';
import { createActionId, useMatchStore } from '../../store/matchStore';
import { projectPlayerBoard, buildCardView, type CardView } from '../../../board/projection';
import { CardImage } from '../CardImage';
import { ZoneSection } from './ZoneSection';
import { CardChoiceGallery } from './CardChoiceGallery';
import { CardOrderStrip } from './CardOrderStrip';
import { defaultOrder, isOrderingChoice } from './cardOrdering';
import { isDonReturnChoice } from './donChoiceUtils';
import { isFieldCardChoice } from './fieldChoiceUtils';
import {
  ChoicePromptActionList,
  ChoicePromptActionRow,
  ChoicePromptError,
  ChoicePromptInset,
  ChoicePromptMessage,
  ChoicePromptMeta,
  ChoicePromptOption,
  ChoicePromptShell,
} from './ChoicePromptPanel';
import {
  SETTINGS_PANEL_BODY,
  SETTINGS_PANEL_LABEL,
  SETTINGS_PANEL_META,
  SETTINGS_PANEL_SCRIM,
  SETTINGS_PANEL_SHELL,
  SETTINGS_PANEL_TITLE,
} from '../settingsPanelStyles';

export interface PendingChoicePromptProps {
  state: GameState;
  defs: CardDefinitionLookup;
  images: Record<string, string | null>;
}

function OpeningHandPreview({ cards }: { cards: CardView[] }) {
  return (
    <ChoicePromptInset title="Opening Hand">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/68">{cards.length} cards</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {cards.map((card) => (
          <div key={card.instanceId} className="min-w-0">
            <CardImage src={card.imageUrl} alt={card.name} className="rounded-md" eager />
            <p className="mt-1 truncate text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/68">{card.name}</p>
          </div>
        ))}
      </div>
    </ChoicePromptInset>
  );
}

export function PendingChoicePrompt({ state, defs, images }: PendingChoicePromptProps) {
  const dispatch = useMatchStore((s) => s.dispatch);
  const playerNames = useMatchStore((s) => s.playerNames);
  const decidingPlayerLabel = (playerId: string): string => playerNames[playerId] ?? playerId;
  const [error, setError] = useState<string[] | null>(null);
  const [selectedTrashId, setSelectedTrashId] = useState<string | null>(null);
  const [selectedIrIds, setSelectedIrIds] = useState<string[]>([]);

  const setupStage = state.currentPhase === 'setup' ? state.setupState?.stage ?? null : null;
  const setupDecidingPlayerId = state.currentPhase === 'setup' ? state.setupState?.decidingPlayerId ?? null : null;


  function run(action: GameAction): void {
    const result = dispatch(action);
    if (!result.ok) {
      setError(result.reasons);
    } else {
      setError(null);
      setSelectedTrashId(null);
      setSelectedIrIds([]);
    }
  }


  const errorBanner = error && error.length > 0 ? <ChoicePromptError messages={error} /> : null;

  if (state.currentPhase === 'setup' && state.setupState) {
    const { setupState } = state;

    if (setupState.stage === 'awaitingGoingFirstChoice') {
      // Who is standing here was already settled out of band — Rock-Paper-
      // Scissors in VS AI and Casual/Ranked, a direct pick in Hot Seat (which
      // answers this prompt automatically, so it is never seen there). All
      // that remains is the 5-2-1-4 choice itself.
      return (
        <ChoicePromptShell title="Going First">
          <ChoicePromptMessage>
            <span className={SETTINGS_PANEL_LABEL}>{decidingPlayerLabel(setupState.decidingPlayerId)}</span> won the
            throw and chooses whether to go first or second (5-2-1-4).
          </ChoicePromptMessage>
          {errorBanner}
          <ChoicePromptActionList>
            <ChoicePromptOption
              onClick={() => run({ type: 'CHOOSE_GOING_FIRST', actionId: createActionId(), playerId: setupState.decidingPlayerId, goingFirst: true })}
            >
              Go First
            </ChoicePromptOption>
            <ChoicePromptOption
              onClick={() => run({ type: 'CHOOSE_GOING_FIRST', actionId: createActionId(), playerId: setupState.decidingPlayerId, goingFirst: false })}
            >
              Go Second
            </ChoicePromptOption>
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }

    if (setupState.stage === 'awaitingMulliganDecision' && setupState.goingFirstPlayerId && setupState.goingSecondPlayerId) {
      const firstPlayer = state.players[setupState.goingFirstPlayerId];
      const decidingPlayerId = firstPlayer.hasMulliganed ? setupState.goingSecondPlayerId : setupState.goingFirstPlayerId;
      const handCards = state.players[decidingPlayerId].hand.cardIds.map((instanceId) => buildCardView(defs, state, images, instanceId));
      return (
        <ChoicePromptShell title="Mulligan" maxWidthClassName="max-w-3xl">
          <ChoicePromptMessage>
            <span className="text-white/68">{decidingPlayerId}</span>, redraw your opening hand of 5 once? (5-2-1-6)
          </ChoicePromptMessage>
          <OpeningHandPreview cards={handCards} />
          {errorBanner}
          <ChoicePromptActionList>
            <ChoicePromptOption onClick={() => run({ type: 'MULLIGAN_DECISION', actionId: createActionId(), playerId: decidingPlayerId, redraw: true })}>
              Redraw
            </ChoicePromptOption>
            <ChoicePromptOption onClick={() => run({ type: 'MULLIGAN_DECISION', actionId: createActionId(), playerId: decidingPlayerId, redraw: false })}>
              Keep Hand
            </ChoicePromptOption>
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }
  }

  const choice = state.pendingChoices[0];
  if (!choice) return null;

  // Field-card SELECT_CARDS choices (K.O. replacement's "rest 2 of your
  // cards", 3-7-6-1 Character Area overflow, curated chooseTargets against
  // in-play Leader/Character/Stage cards, etc.) are resolved by tapping the
  // actual card on the mat — see useBoardSelection.ts's 'resolvingFieldChoice'
  // mode and MatchScreen.tsx's FieldChoiceBanner — instead of this modal.
  if (isFieldCardChoice(state, choice)) return null;

  if (choice.sourceEffectId === 'rule:characterAreaOverflow') {
    const board = projectPlayerBoard(state, defs, images, choice.playerId);
    return (
      <ChoicePromptShell title="Character Area Limit" maxWidthClassName="max-w-2xl">
        <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
        {errorBanner}
        <ChoicePromptInset>
          <ZoneSection
            label="Character Area"
            cards={board.characterArea}
            selectedIds={selectedTrashId ? new Set([selectedTrashId]) : undefined}
            selectableIds={new Set(board.characterArea.map((c) => c.instanceId))}
            onCardSelect={(card) => setSelectedTrashId(card.instanceId)}
          />
        </ChoicePromptInset>
        <ChoicePromptOption
          disabled={!selectedTrashId}
          onClick={() => selectedTrashId && run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: [selectedTrashId] })}
        >
          Trash Selected Character
        </ChoicePromptOption>
      </ChoicePromptShell>
    );
  }

  // Life [Trigger] (10-1-5-2): a revealed Life card offers to activate its
  // [Trigger] (then it's trashed) or be kept in hand.
  if (choice.sourceEffectId === 'rule:lifeTrigger') {
    const card = choice.sourceInstanceId ? buildCardView(defs, state, images, choice.sourceInstanceId) : null;
    const triggerText = card?.triggerText ?? card?.text ?? '';
    return (
      <ChoicePromptShell title="Life Trigger" maxWidthClassName="max-w-2xl">
        <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
        {card && (
          <ChoicePromptInset>
            <div className="flex gap-4">
              <div className="w-40 shrink-0">
                <CardImage src={card.imageUrl} alt={card.name} className="rounded-none ring-1 ring-white/15" eager />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className={SETTINGS_PANEL_LABEL}>{card.name}</p>
                <div className="border border-white/10 bg-white/[0.04] p-3">
                  <p className={`mb-1 ${SETTINGS_PANEL_META}`}>Trigger</p>
                  <p className={`whitespace-pre-wrap ${SETTINGS_PANEL_BODY}`}>{triggerText || 'No trigger text.'}</p>
                </div>
              </div>
            </div>
          </ChoicePromptInset>
        )}
        {errorBanner}
        <ChoicePromptActionList>
          <ChoicePromptOption
            onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: choice.sourceInstanceId ? [choice.sourceInstanceId] : [] })}
          >
            Activate Trigger
          </ChoicePromptOption>
          <ChoicePromptOption onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: [] })}>
            Keep in Hand
          </ChoicePromptOption>
        </ChoicePromptActionList>
      </ChoicePromptShell>
    );
  }

  // Battle K.O. replacement pauses the Damage Step. The engine exposes it as
  // YES_NO, SELECT_CARDS, or SELECT_OPTION, all resolved through the generic
  // RESOLVE_PENDING_CHOICE action.
  if (choice.sourceEffectId === 'rule:battleKoReplacement') {
    if (choice.kind === 'YES_NO') {
      return (
        <ChoicePromptShell title="K.O. Replacement">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          {errorBanner}
          <ChoicePromptActionList>
            <ChoicePromptOption onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: true })}>
              Use Effect
            </ChoicePromptOption>
            <ChoicePromptOption onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: false })}>
              Decline
            </ChoicePromptOption>
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }

    if (choice.kind === 'SELECT_OPTION') {
      const options = choice.constraints.options ?? [];
      return (
        <ChoicePromptShell title="K.O. Replacement">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          {errorBanner}
          <ChoicePromptActionList>
            {options.map((option, index) => (
              <ChoicePromptOption
                key={`${option.label}-${index}`}
                onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: index })}
              >
                {option.label}
              </ChoicePromptOption>
            ))}
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }

    if (choice.kind === 'SELECT_CARDS') {
      const candidateIds = choice.constraints.candidateInstanceIds ?? [];
      const candidates = candidateIds.map((id) => buildCardView(defs, state, images, id));
      const { min, max } = choice.constraints;
      const count = selectedIrIds.length;
      const canConfirm = count >= min && count <= max;

      const toggle = (instanceId: string): void => {
        setSelectedIrIds((prev) => {
          if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
          if (max === 1) return [instanceId];
          if (prev.length >= max) return prev;
          return [...prev, instanceId];
        });
      };

      return (
        <ChoicePromptShell title="K.O. Replacement" maxWidthClassName="max-w-5xl">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          <div className="flex items-center justify-between gap-3">
            <ChoicePromptMeta>{min === max ? `Select ${max}` : `Select ${min}-${max}`}</ChoicePromptMeta>
            <ChoicePromptMeta>{count}/{max} selected</ChoicePromptMeta>
          </div>
          {errorBanner}
          <ChoicePromptInset>
            <CardChoiceGallery
              cards={candidates}
              selectableIds={new Set(candidateIds)}
              selectedOrder={selectedIrIds}
              max={max}
              onToggle={toggle}
            />
          </ChoicePromptInset>
          <ChoicePromptOption
            disabled={!canConfirm}
            onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: selectedIrIds })}
          >
            Confirm ({count}/{max})
          </ChoicePromptOption>
        </ChoicePromptShell>
      );
    }
  }

  if (choice.sourceEffectId?.startsWith('v2:')) {
    if (choice.kind === 'SELECT_OPTION') {
      const options = choice.constraints.options ?? [];
      return (
        <ChoicePromptShell title="Choose V2 Option">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          {errorBanner}
          <ChoicePromptActionList>
            {options.map((option, index) => (
              <ChoicePromptOption
                key={`${option.label}-${index}`}
                onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: index })}
              >
                {option.label}
              </ChoicePromptOption>
            ))}
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }

    if (choice.kind === 'SELECT_CARDS') {
      const candidateIds = choice.constraints.candidateInstanceIds ?? [];
      // uiShowOnlyCandidates: opaque whole-deck search ops (playFromDeck /
    // playStageFromDeck / searchDeck) keep the full deck in
    // visibleInstanceIds for the engine's log/AI contract, but the picker
    // should only ever render the actually-eligible subset — nobody wants to
    // browse 40+ mostly-irrelevant deck cards to find the 1-2 that matter.
    const visibleIds = choice.constraints.uiShowOnlyCandidates ? candidateIds : choice.constraints.visibleInstanceIds ?? candidateIds;
      const candidates = visibleIds.map((id) => buildCardView(defs, state, images, id));
      const { min, max } = choice.constraints;
      const count = selectedIrIds.length;
      const canConfirm = count >= min && count <= max;
      const selectLabel = min === max ? `Select ${max}` : `Select ${min}-${max}`;

      const toggle = (instanceId: string): void => {
        setSelectedIrIds((prev) => {
          if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
          if (max === 1) return [instanceId];
          if (prev.length >= max) return prev;
          return [...prev, instanceId];
        });
      };

      return (
        <ChoicePromptShell title="Choose V2 Cards" maxWidthClassName="max-w-5xl">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          <div className="flex items-center justify-between gap-3">
            <ChoicePromptMeta>{selectLabel}</ChoicePromptMeta>
            <ChoicePromptMeta>{count}/{max} selected</ChoicePromptMeta>
          </div>
          {errorBanner}
          {candidates.length > 0 ? (
            <ChoicePromptInset>
              <CardChoiceGallery
                cards={candidates}
                selectableIds={new Set(candidateIds)}
                selectedOrder={selectedIrIds}
                max={max}
                onToggle={toggle}
              />
            </ChoicePromptInset>
          ) : (
            <ChoicePromptMessage>No eligible cards - confirm to continue.</ChoicePromptMessage>
          )}
          <ChoicePromptOption
            disabled={!canConfirm}
            onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: selectedIrIds })}
          >
            {min === 0 && count === 0 ? 'Decline' : `Confirm (${count}/${max})`}
          </ChoicePromptOption>
        </ChoicePromptShell>
      );
    }
  }

  // Generic interpreter-suspended choice (chooseTargets / searchTopDeck). The
  // candidates are explicit instance ids; the choosing player may see them all
  // (their own search look, or visible target Characters), so we build a
  // CardView for each regardless of zone. Selection is bounded by [min, max].
  if (choice.sourceEffectId === 'ir') {
    // donMinus ability-cost choice (every candidate is a DON!! card): handled
    // entirely by the board (useBoardSelection's 'resolvingDonChoice' mode —
    // hover a Leader/Character to reveal its attached DON!! stack, or tap a
    // Cost Area chip directly) instead of this generic gallery. DON!! tokens
    // have no distinguishing art, so a grid of identical chips here wouldn't
    // tell the player WHICH field DON!! they're picking.
    if (isDonReturnChoice(state, defs, choice)) return null;

    if (choice.kind === 'YES_NO') {
      return (
        <ChoicePromptShell title="Activate Effect?">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          {errorBanner}
          <ChoicePromptActionList>
            <ChoicePromptOption onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: true })}>
              Activate
            </ChoicePromptOption>
            <ChoicePromptOption onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: false })}>
              Decline
            </ChoicePromptOption>
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }

    if (choice.kind === 'SELECT_OPTION') {
      const options = choice.constraints.options ?? [];
      return (
        <ChoicePromptShell title="Choose Option">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          {errorBanner}
          <ChoicePromptActionList>
            {options.map((option, index) => (
              <ChoicePromptOption
                key={`${option.label}-${index}`}
                onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: index })}
              >
                {option.label}
              </ChoicePromptOption>
            ))}
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }

    if (choice.kind === 'SELECT_NUMBER') {
      const min = choice.constraints.numberMin ?? 0;
      const max = choice.constraints.numberMax ?? 10;
      const numbers = Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
      return (
        <ChoicePromptShell title="Choose Number">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          {errorBanner}
          <ChoicePromptActionList>
            {numbers.map((value) => (
              <ChoicePromptOption
                key={value}
                onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: value })}
              >
                {value}
              </ChoicePromptOption>
            ))}
          </ChoicePromptActionList>
        </ChoicePromptShell>
      );
    }

    const candidateIds = choice.constraints.candidateInstanceIds ?? [];
    // uiShowOnlyCandidates: opaque whole-deck search ops (playFromDeck /
    // playStageFromDeck / searchDeck) keep the full deck in
    // visibleInstanceIds for the engine's log/AI contract, but the picker
    // should only ever render the actually-eligible subset — nobody wants to
    // browse 40+ mostly-irrelevant deck cards to find the 1-2 that matter.
    const visibleIds = choice.constraints.uiShowOnlyCandidates ? candidateIds : choice.constraints.visibleInstanceIds ?? candidateIds;
    const candidates = visibleIds.map((id) => buildCardView(defs, state, images, id));
    const { min, max } = choice.constraints;
    const distinctNames = choice.constraints.distinctNames ?? false;
    const nameById = new Map(candidates.map((card) => [card.instanceId, card.name]));
    const count = selectedIrIds.length;
    const canConfirm = count >= min && count <= max;
    const selectLabel = `${min === max ? `Select ${max}` : `Select ${min}–${max}`}${distinctNames ? ' · different names' : ''}`;

    // When the effect requires different card names (e.g. OP13-082 "… with
    // different card names"), a candidate whose printed name already appears in
    // the selection becomes non-selectable — mirrors the engine's distinctNames
    // validation (resolvePendingChoice.ts) so the player can't build an invalid
    // set and only find out on Confirm.
    const selectableIrIds = distinctNames
      ? new Set(
          candidateIds.filter((id) => {
            if (selectedIrIds.includes(id)) return true;
            const name = nameById.get(id);
            return name === undefined || !selectedIrIds.some((sid) => nameById.get(sid) === name);
          }),
        )
      : new Set(candidateIds);

    const toggle = (instanceId: string): void => {
      setSelectedIrIds((prev) => {
        if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
        if (max === 1) return [instanceId]; // single-select replaces
        if (prev.length >= max) return prev; // at cap — ignore
        if (distinctNames) {
          const name = nameById.get(instanceId);
          if (name !== undefined && prev.some((id) => nameById.get(id) === name)) return prev; // same name already chosen
        }
        return [...prev, instanceId];
      });
    };

    // Ordering prompt ("...in any order"): the player must return every
    // candidate, so the only decision left is the sequence. Rather than making
    // them click all N cards to express an order, seed the engine's own
    // candidate order (deck order, top-most first) and let them drag to change
    // it — confirming untouched puts the cards back exactly as they were.
    // Order is submitted as the same string[] response the click flow sent.
    if (isOrderingChoice(choice)) {
      const fallbackOrder = defaultOrder(choice);
      const orderIds = selectedIrIds.length === fallbackOrder.length ? selectedIrIds : fallbackOrder;

      return (
        <ChoicePromptShell title="Arrange Order" maxWidthClassName="max-w-5xl">
          <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
          <div className="flex items-center justify-between gap-3">
            <ChoicePromptMeta>Drag to reorder</ChoicePromptMeta>
            <ChoicePromptMeta>{orderIds.length} card{orderIds.length === 1 ? '' : 's'}</ChoicePromptMeta>
          </div>
          {errorBanner}
          <ChoicePromptInset>
            <CardOrderStrip
              cards={candidates}
              order={orderIds}
              onReorder={setSelectedIrIds}
              hint="Position 1 is placed closest to the top of the deck"
            />
          </ChoicePromptInset>
          <ChoicePromptOption
            onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: orderIds })}
          >
            Confirm Order
          </ChoicePromptOption>
        </ChoicePromptShell>
      );
    }

    return (
      <ChoicePromptShell title="Choose" maxWidthClassName="max-w-5xl">
        <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
        <div className="flex items-center justify-between gap-3">
          <ChoicePromptMeta>{selectLabel}</ChoicePromptMeta>
          <ChoicePromptMeta>{count}/{max} selected</ChoicePromptMeta>
        </div>
        {errorBanner}
        {candidates.length > 0 ? (
          <ChoicePromptInset>
            <CardChoiceGallery
              cards={candidates}
              selectableIds={selectableIrIds}
              selectedOrder={selectedIrIds}
              max={max}
              onToggle={toggle}
            />
          </ChoicePromptInset>
        ) : (
          <ChoicePromptMessage>No eligible cards — confirm to continue.</ChoicePromptMessage>
        )}
        <ChoicePromptOption
          disabled={!canConfirm}
          onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: selectedIrIds })}
        >
          {min === 0 && count === 0 ? 'Decline' : `Confirm (${count}/${max})`}
        </ChoicePromptOption>
      </ChoicePromptShell>
    );
  }

  return (
    <ChoicePromptShell title="Pending Choice">
      <ChoicePromptMessage>{choice.prompt}</ChoicePromptMessage>
      <ChoicePromptMessage>No UI implemented yet for sourceEffectId &apos;{choice.sourceEffectId}&apos;.</ChoicePromptMessage>
    </ChoicePromptShell>
  );
}
