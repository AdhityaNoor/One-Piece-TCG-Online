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
import { StlCoinCanvas, COIN_FLIP_DURATION_MS } from './StlCoinCanvas';
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

type CoinSide = 'jollyRoger' | 'sunnyGo';

function oppositeSide(side: CoinSide): CoinSide {
  return side === 'jollyRoger' ? 'sunnyGo' : 'jollyRoger';
}

function coinSideLabel(side: CoinSide | null): string {
  if (side === 'jollyRoger') return 'Jolly Roger';
  if (side === 'sunnyGo') return 'Sunny Go';
  return '';
}

function TossCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let animationFrame = 0;

    const streaks = Array.from({ length: 34 }, (_, index) => ({
      x: (index * 157) % 1800,
      y: (index * 91) % 900,
      length: 90 + ((index * 43) % 280),
      speed: 0.28 + ((index * 13) % 18) / 28,
      alpha: 0.1 + ((index * 7) % 12) / 52,
    }));

    const sparks = Array.from({ length: 120 }, (_, index) => ({
      x: (index * 83) % 1800,
      y: (index * 127) % 900,
      size: 1 + ((index * 5) % 4),
      speed: 0.18 + ((index * 19) % 18) / 40,
      color: index % 3 === 0 ? 'rgba(255,255,255,0.55)' : index % 3 === 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.25)',
    }));

    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (): void => {
      context.clearRect(0, 0, width, height);

      const vignette = context.createRadialGradient(width * 0.5, height * 0.46, 0, width * 0.5, height * 0.46, Math.max(width, height) * 0.72);
      vignette.addColorStop(0, 'rgba(255,255,255,0.06)');
      vignette.addColorStop(0.42, 'rgba(7,17,38,0.18)');
      vignette.addColorStop(1, 'rgba(3,7,19,0.72)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.16;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1;
      for (let x = -height; x < width + height; x += 108) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + height, height);
        context.stroke();
      }
      context.restore();

      for (const streak of streaks) {
        const x = ((streak.x + frame * streak.speed) % (width + streak.length + 160)) - streak.length;
        const y = streak.y % Math.max(height, 1);
        const gradient = context.createLinearGradient(x, y, x + streak.length, y - 38);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.48, `rgba(255,255,255,${streak.alpha * 0.45})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.strokeStyle = gradient;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + streak.length, y - 38);
        context.stroke();
      }

      for (const spark of sparks) {
        const x = ((spark.x + frame * spark.speed) % (width + 30)) - 15;
        const y = (spark.y + Math.sin((frame + spark.x) / 34) * 14) % Math.max(height, 1);
        context.globalAlpha = 0.34;
        context.fillStyle = spark.color;
        context.fillRect(x, y, spark.size, spark.size);
      }

      context.globalAlpha = 1;
      frame += 1;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function MatchSetupCoin({ pick, result, resolved }: { pick: CoinSide | null; result: CoinSide | null; resolved: boolean }) {
  return (
    <StlCoinCanvas
      result={result}
      flipping={!!pick && !resolved}
    />
  );
}

function SetupTossOverlay({
  decidingPlayerId,
  pick,
  resolved,
  onPick,
  onChoose,
  errorBanner,
}: {
  decidingPlayerId: string;
  pick: CoinSide | null;
  resolved: boolean;
  onPick: (side: CoinSide) => void;
  onChoose: (goingFirst: boolean) => void;
  errorBanner: ReactNode;
}) {
  const p1Won = decidingPlayerId === 'p1';
  const result = pick ? (p1Won ? pick : oppositeSide(pick)) : null;
  const canChoose = !!pick && resolved;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden text-white ${SETTINGS_PANEL_SCRIM}`}>
      <TossCanvas />
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <section className="pointer-events-auto relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <p className={`mb-3 ${SETTINGS_PANEL_TITLE}`}>Starting Toss</p>
        <h2 className="font-display text-[clamp(2rem,6vw,4.5rem)] font-black uppercase leading-[0.92] tracking-[0.04em] text-white/72">
          Call It
        </h2>
        <p className={`mt-4 max-w-2xl ${SETTINGS_PANEL_BODY} sm:text-[12px]`}>
          P1 calls Jolly Roger or Sunny Go. If correct, P1 chooses first or second. If wrong, P2 chooses.
        </p>

        <div className="my-8 flex min-h-[min(17vh,9rem)] items-center justify-center">
          <MatchSetupCoin pick={pick} result={result} resolved={resolved} />
        </div>

        {!pick ? (
          <ChoicePromptActionRow>
            <ChoicePromptOption className="min-w-[13rem] flex-1" onClick={() => onPick('jollyRoger')}>
              Jolly Roger
            </ChoicePromptOption>
            <ChoicePromptOption className="min-w-[13rem] flex-1" onClick={() => onPick('sunnyGo')}>
              Sunny Go
            </ChoicePromptOption>
          </ChoicePromptActionRow>
        ) : (
          <div className={`w-full max-w-2xl p-3 ${SETTINGS_PANEL_SHELL}`}>
            <p className={SETTINGS_PANEL_TITLE}>Toss Result</p>
            <p className={`mt-2 ${SETTINGS_PANEL_LABEL}`}>P1 called {coinSideLabel(pick)}</p>
            <p className={`mt-2 ${SETTINGS_PANEL_LABEL}`}>
              {resolved ? (
                <>Result: {coinSideLabel(result)}</>
              ) : (
                'Flipping...'
              )}
            </p>
            {resolved && (
              <p className={`mt-2 ${SETTINGS_PANEL_BODY}`}>
                <span className={SETTINGS_PANEL_LABEL}>{decidingPlayerId}</span> won the toss and chooses who goes first.
              </p>
            )}
            {errorBanner}
            <div className="mt-3">
              <ChoicePromptActionList>
              <ChoicePromptOption disabled={!canChoose} onClick={() => onChoose(true)}>
                Go First
              </ChoicePromptOption>
              <ChoicePromptOption disabled={!canChoose} onClick={() => onChoose(false)}>
                Go Second
              </ChoicePromptOption>
              </ChoicePromptActionList>
            </div>
          </div>
        )}

        <div className="mt-8 h-px w-[min(34rem,72vw)] bg-white/10" />
      </section>
    </div>
  );
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
  const [error, setError] = useState<string[] | null>(null);
  const [selectedTrashId, setSelectedTrashId] = useState<string | null>(null);
  const [selectedIrIds, setSelectedIrIds] = useState<string[]>([]);
  const [tossPick, setTossPick] = useState<CoinSide | null>(null);
  const [tossResolved, setTossResolved] = useState(false);

  const setupStage = state.currentPhase === 'setup' ? state.setupState?.stage ?? null : null;
  const setupDecidingPlayerId = state.currentPhase === 'setup' ? state.setupState?.decidingPlayerId ?? null : null;

  useEffect(() => {
    setTossPick(null);
    setTossResolved(false);
  }, [setupStage, setupDecidingPlayerId]);

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

  function callToss(side: CoinSide): void {
    setTossPick(side);
    setTossResolved(false);
    window.setTimeout(() => setTossResolved(true), COIN_FLIP_DURATION_MS);
  }

  const errorBanner = error && error.length > 0 ? <ChoicePromptError messages={error} /> : null;

  if (state.currentPhase === 'setup' && state.setupState) {
    const { setupState } = state;

    if (setupState.stage === 'awaitingGoingFirstChoice') {
      return (
        <SetupTossOverlay
          decidingPlayerId={setupState.decidingPlayerId}
          pick={tossPick}
          resolved={tossResolved}
          onPick={callToss}
          onChoose={(goingFirst) => run({ type: 'CHOOSE_GOING_FIRST', actionId: createActionId(), playerId: setupState.decidingPlayerId, goingFirst })}
          errorBanner={errorBanner}
        />
      );

      /*
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
      */
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

  // Generic interpreter-suspended choice (chooseTargets / searchTopDeck). The
  // candidates are explicit instance ids; the choosing player may see them all
  // (their own search look, or visible target Characters), so we build a
  // CardView for each regardless of zone. Selection is bounded by [min, max].
  if (choice.sourceEffectId === 'ir') {
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
    const visibleIds = choice.constraints.visibleInstanceIds ?? candidateIds;
    const candidates = visibleIds.map((id) => buildCardView(defs, state, images, id));
    const { min, max } = choice.constraints;
    const count = selectedIrIds.length;
    const canConfirm = count >= min && count <= max;
    const selectLabel = min === max ? `Select ${max}` : `Select ${min}–${max}`;

    const toggle = (instanceId: string): void => {
      setSelectedIrIds((prev) => {
        if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
        if (max === 1) return [instanceId]; // single-select replaces
        if (prev.length >= max) return prev; // at cap — ignore
        return [...prev, instanceId];
      });
    };

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
              selectableIds={new Set(candidateIds)}
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
