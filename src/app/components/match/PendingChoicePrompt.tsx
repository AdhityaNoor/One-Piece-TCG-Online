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
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GameState } from '../../../engine/state/game';
import type { GameAction } from '../../../engine/actions';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';
import { createActionId, useMatchStore } from '../../store/matchStore';
import { projectPlayerBoard, buildCardView, type CardView } from '../../../board/projection';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { CardImage } from '../CardImage';
import { ZoneSection } from './ZoneSection';
import { StlCoinCanvas } from './StlCoinCanvas';

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
      color: index % 3 === 0 ? '#ffd34a' : index % 3 === 1 ? '#ef4444' : '#7dd3fc',
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
      vignette.addColorStop(0, 'rgba(255,211,74,0.13)');
      vignette.addColorStop(0.42, 'rgba(7,17,38,0.18)');
      vignette.addColorStop(1, 'rgba(3,7,19,0.72)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.16;
      context.strokeStyle = '#d9a441';
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
        gradient.addColorStop(0, 'rgba(255,211,74,0)');
        gradient.addColorStop(0.48, `rgba(255,211,74,${streak.alpha})`);
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
      loadModel={!!pick}
      className="h-[min(42vh,24rem)] w-[min(42vh,24rem)]"
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/44 text-white backdrop-blur-md">
      <TossCanvas />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,_rgba(255,211,74,0.16),_transparent_28%),linear-gradient(180deg,_rgba(3,7,19,0.18),_rgba(3,7,19,0.82))]" />
      <section className="pointer-events-auto relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-gold drop-shadow-[0_2px_0_rgba(0,0,0,0.7)]">Starting Toss</p>
        <h2 className="font-display text-[clamp(2.6rem,8vw,7rem)] font-black uppercase leading-[0.88] tracking-[0.02em] text-white drop-shadow-[0_8px_0_rgba(0,0,0,0.62)]">
          Call It
        </h2>
        <p className="mt-4 max-w-2xl text-sm font-semibold uppercase tracking-[0.1em] text-white/66 sm:text-base">
          P1 calls Jolly Roger or Sunny Go. If correct, P1 chooses first or second. If wrong, P2 chooses.
        </p>

        <div className="my-8 flex h-[min(34vh,18rem)] min-h-[12rem] items-center justify-center">
          <MatchSetupCoin pick={pick} result={result} resolved={resolved} />
        </div>

        {!pick ? (
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" className="min-w-[13rem]" onClick={() => onPick('jollyRoger')}>
              Jolly Roger
            </Button>
            <Button variant="secondary" size="lg" className="min-w-[13rem]" onClick={() => onPick('sunnyGo')}>
              Sunny Go
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl rounded-2xl border border-gold/25 bg-black/28 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">P1 called {coinSideLabel(pick)}</p>
            <p className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
              {resolved ? (
                <>
                  Result: <span className="text-gold">{coinSideLabel(result)}</span>
                </>
              ) : (
                'Flipping...'
              )}
            </p>
            {resolved && (
              <p className="mt-2 text-sm font-semibold text-white/70">
                <span className="font-black text-gold">{decidingPlayerId}</span> won the toss and chooses who goes first.
              </p>
            )}
            {errorBanner}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button variant="primary" size="lg" disabled={!canChoose} onClick={() => onChoose(true)}>
                Go First
              </Button>
              <Button variant="secondary" size="lg" disabled={!canChoose} onClick={() => onChoose(false)}>
                Go Second
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 h-1 w-[min(34rem,72vw)] bg-[linear-gradient(90deg,_transparent,_rgba(255,211,74,0.95),_transparent)] shadow-[0_0_24px_rgba(255,211,74,0.55)]" />
      </section>
    </div>
  );
}

function OpeningHandPreview({ cards }: { cards: CardView[] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/18 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gold">Opening Hand</h3>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{cards.length} cards</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {cards.map((card) => (
          <div key={card.instanceId} className="min-w-0">
            <CardImage src={card.imageUrl} alt={card.name} className="rounded-md" eager />
            <p className="mt-1 truncate text-center text-[10px] font-semibold text-white/70">{card.name}</p>
          </div>
        ))}
      </div>
    </section>
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
    window.setTimeout(() => setTossResolved(true), 1650);
  }

  const errorBanner = error && error.length > 0 && (
    <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error.join(' ')}</p>
  );

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
        <Modal open onClose={() => {}} title="Mulligan" maxWidthClassName="max-w-3xl">
          <div className="flex flex-col gap-3 p-5">
            <p className="text-sm text-white/70">
              <span className="font-bold text-white">{decidingPlayerId}</span>, redraw your opening hand of 5 once? (5-2-1-6)
            </p>
            <OpeningHandPreview cards={handCards} />
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

  // Generic interpreter-suspended choice (chooseTargets / searchTopDeck). The
  // candidates are explicit instance ids; the choosing player may see them all
  // (their own search look, or visible target Characters), so we build a
  // CardView for each regardless of zone. Selection is bounded by [min, max].
  if (choice.sourceEffectId === 'ir') {
    const candidateIds = choice.constraints.candidateInstanceIds ?? [];
    const candidates = candidateIds.map((id) => buildCardView(defs, state, images, id));
    const { min, max } = choice.constraints;
    const count = selectedIrIds.length;
    const canConfirm = count >= min && count <= max;

    const toggle = (instanceId: string): void => {
      setSelectedIrIds((prev) => {
        if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
        if (max === 1) return [instanceId]; // single-select replaces
        if (prev.length >= max) return prev; // at cap — ignore
        return [...prev, instanceId];
      });
    };

    return (
      <Modal open onClose={() => {}} title="Choose">
        <div className="flex flex-col gap-3 p-5">
          <p className="text-sm text-white/70">{choice.prompt}</p>
          {errorBanner}
          {candidates.length > 0 ? (
            <ZoneSection
              label={`Select ${min === max ? max : `${min}–${max}`}`}
              cards={candidates}
              selectedIds={new Set(selectedIrIds)}
              selectableIds={new Set(candidateIds)}
              onCardSelect={(card) => toggle(card.instanceId)}
            />
          ) : (
            <p className="text-xs text-white/50">No eligible cards — confirm to continue.</p>
          )}
          <Button
            variant="primary"
            disabled={!canConfirm}
            onClick={() => run({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: choice.playerId, choiceId: choice.id, response: selectedIrIds })}
          >
            {min === 0 && count === 0 ? 'Decline' : `Confirm (${count}/${max})`}
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
