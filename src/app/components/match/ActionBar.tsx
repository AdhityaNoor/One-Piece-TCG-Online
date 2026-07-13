import { useState } from 'react';
import type { GameState } from '../../../engine/state/game';
import type { CardView, PlayerBoardView } from '../../../board/projection';
import { countAvailableDon } from '../../../board/projection';
import { resolveAssetUrl } from '../../lib/assetUrl';
import { Button } from '../Button';
import { Modal } from '../Modal';
import type { useBoardSelection } from './useBoardSelection';

export interface ActionBarProps {
  phase: GameState['currentPhase'];
  turnNumber: number;
  battle: GameState['currentBattle'];
  actingBoard: PlayerBoardView;
  selection: ReturnType<typeof useBoardSelection>;
}

interface EndPhaseWarning {
  id: string;
  kind: 'don' | 'attackers' | 'effects';
  title: string;
  detail: string;
  cards?: CardView[];
}

const INSTRUCTIONS: Record<string, string> = {
  confirmPlayCost: 'Confirm the play cost. The game will rest active DON!! automatically.',
  selectAttacker: 'Tap your own active Leader or Character to attack with.',
  selectAttackTarget: "Tap the opponent's Leader, or a RESTED Character, to attack.",
  selectBlocker: 'Tap your own active [Blocker] Character.',
  selectActivateSource: 'Tap your own Leader, Character, or Stage that has an [Activate: Main] effect.',
  payingActivateEffectCost: 'Tap DON!! in your Cost Area to return for the activation cost, then Confirm.',
  payingEventMainCost: 'Tap DON!! on your field to return for the Event cost, then Confirm.',
  payingCounterEventCost: 'Tap DON!! on your field to return for the Counter Event cost, then Confirm.',
  selectOnOppAttackSource: "Tap your own Leader, Character, or Stage with an [On Your Opponent's Attack] ability.",
  payingOnOppAttackCost: 'Tap DON!! in your Cost Area to return for the ability cost, then Confirm.',
};

function formatCardNames(cards: { name: string }[]): string {
  const names = cards.slice(0, 3).map((card) => card.name);
  const rest = cards.length - names.length;
  return rest > 0 ? `${names.join(', ')} +${rest} more` : names.join(', ');
}

function isCardView(card: CardView | null): card is CardView {
  return card !== null;
}

function formatCardRole(card: CardView): string {
  return card.category === 'leader' ? 'Leader' : card.category === 'character' ? 'Character' : card.category === 'stage' ? 'Stage' : card.category;
}

function formatPower(card: CardView): string | null {
  if (card.power === null) return null;
  return card.power.toLocaleString();
}

function WarningCardRow({ card, tone = 'gold' }: { card: CardView; tone?: 'gold' | 'cyan' }) {
  const stat = formatPower(card) ?? (card.cost !== null ? `${card.cost} cost` : null);
  const toneClass = tone === 'gold' ? 'border-gold/35 bg-gold/10 text-gold' : 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100';

  return (
    <li className="group/card relative overflow-hidden border border-white/12 bg-black/26 px-3 py-2 shadow-[inset_0_0_22px_rgba(255,255,255,0.025)] backdrop-blur-[2px]">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-gold to-transparent opacity-70" />
      <div className="flex min-w-0 items-center gap-3 pl-1">
        <div className="flex h-11 w-8 shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-black/30 shadow-[0_0_16px_rgba(245,178,49,0.12)]">
          {card.imageUrl ? (
            <img src={resolveAssetUrl(card.imageUrl) ?? undefined} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="text-[0.55rem] font-black uppercase tracking-[0.16em] text-white/35">Card</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black uppercase tracking-[0.08em] text-white">{card.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.14em]">
            <span className={`border px-1.5 py-0.5 ${toneClass}`}>{formatCardRole(card)}</span>
            <span className="border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/55">{card.orientation}</span>
            {card.donAttachedCount > 0 && <span className="border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-gold">+{card.donAttachedCount} DON</span>}
            {stat && <span className="border border-white/10 bg-black/30 px-1.5 py-0.5 text-white/65">{stat}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

export function ActionBar({ phase, turnNumber, battle, actingBoard, selection }: ActionBarProps) {
  const {
    mode,
    lastError,
    cancel,
    beginActivateBlocker,
    beginActivateOnOppAttack,
    hasActivateMain,
    hasUnusedActivateMain,
    hasOnOpponentsAttack,
    counterProgress,
    donChoiceProgress,
    confirmDonChoice,
    confirmEventMainCost,
    confirmCounterEventCost,
    confirmActivateMainCost,
    confirmOnOppAttackCost,
    confirmPlayCard,
    passStep,
    endMainPhase,
  } = selection;
  const [endPhaseWarnings, setEndPhaseWarnings] = useState<EndPhaseWarning[] | null>(null);

  const errorBanner = lastError && lastError.length > 0 && (
    <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
      {lastError.join(' ')}
    </div>
  );

  // A donMinus pending choice takes priority over EVERYTHING below,
  // including the battle-step branches — it can suspend mid-Block-Step (an
  // onBlock-triggered ability with a DON!! -N cost, say), and the dispatch
  // layer's pending-choice gate already blocks every other action until it
  // resolves, so nothing else in this component is actionable while it's up
  // anyway (see useBoardSelection.ts's 'resolvingDonChoice' doc comment).
  if (donChoiceProgress) {
    const { selected, min, max, prompt } = donChoiceProgress;
    const met = selected >= min;
    return (
      <div className="flex flex-col gap-2">
        {errorBanner}
        <p className="text-xs text-white/60">{prompt}</p>
        <div className="flex items-center gap-2">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/50">DON!! Selected</span>
          <span className={`text-base font-black tabular-nums tracking-[0.04em] ${met ? 'text-emerald-300' : 'text-white'}`}>
            {selected}/{min === max ? max : `${min}-${max}`}
          </span>
        </div>
        <p className="text-xs text-white/60">Tap a DON!! on the field — a Cost Area chip, or hover a Leader/Character to reveal its attached DON!!.</p>
        {min < max && (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={!met} onClick={confirmDonChoice}>
              Confirm ({selected}/{max})
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Battle-step branches are checked ahead of the generic `mode.kind !==
  // 'idle'` block below: the Counter Step auto-enters BoardSelectionMode's
  // 'selectCounterCard' (see useBoardSelection.ts) the instant it starts, so
  // if the generic block ran first it would intercept that mode and hide the
  // real Pass button behind a stale instruction line.
  if (battle && battle.step === 'block') {
    const hasEligibleBlocker = actingBoard.characterArea.some((card) => card.orientation === 'active' && card.hasBlocker);
    const hasEligibleOnOppAttack = [actingBoard.leader, ...actingBoard.characterArea, ...actingBoard.stageArea].filter(isCardView).some((card) => hasOnOpponentsAttack(card));
    return (
      <div className="flex flex-col gap-2">
        {errorBanner}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!hasEligibleBlocker} onClick={beginActivateBlocker}>Activate Blocker</Button>
          <Button variant="secondary" size="sm" disabled={!hasEligibleOnOppAttack} onClick={beginActivateOnOppAttack}>[On Opponent's Attack]</Button>
          <Button variant="ghost" size="sm" onClick={passStep}>Pass (skip Block)</Button>
        </div>
      </div>
    );
  }

  if (battle && battle.step === 'counter') {
    // No "Activate Counter" button to click through first — every eligible
    // hand card is directly tappable (see DockHand's dimmed/selectable
    // props), any number of times in a row, so the progress readout below
    // is the only thing this branch needs to render besides Pass.
    const progressTone = !counterProgress || counterProgress.selected === 0
      ? 'text-white'
      : counterProgress.selected >= counterProgress.needed
        ? 'text-emerald-300'
        : 'text-red-300';
    return (
      <div className="flex flex-col gap-2">
        {errorBanner}
        {counterProgress && (
          <div className="flex items-center gap-2">
            <span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/50">Counter Power</span>
            <span className={`text-base font-black tabular-nums tracking-[0.04em] ${progressTone}`}>
              {counterProgress.selected.toLocaleString()}/{counterProgress.needed.toLocaleString()}
            </span>
          </div>
        )}
        <p className="text-xs text-white/60">Tap a hand Character with a Counter value, or a [Counter] Event, to add power. Tap as many as you like, then Pass.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={passStep}>Pass (end Counter Step)</Button>
        </div>
      </div>
    );
  }

  if (mode.kind !== 'idle') {
    return (
      <div className="flex flex-col gap-2">
        {errorBanner}
        <p className="text-xs text-white/60">{INSTRUCTIONS[mode.kind]}</p>
        <div className="flex flex-wrap gap-2">
          {mode.kind === 'confirmPlayCost' && (
            <Button variant="primary" size="sm" onClick={confirmPlayCard}>
              Play {mode.cardName} ({mode.cost} DON!!)
            </Button>
          )}
          {mode.kind === 'payingActivateEffectCost' && (
            <Button variant="primary" size="sm" disabled={mode.selectedDonIds.length !== mode.cost} onClick={confirmActivateMainCost}>
              Activate ({mode.selectedDonIds.length}/{mode.cost} DON!!)
            </Button>
          )}
          {mode.kind === 'payingEventMainCost' && (
            <Button variant="primary" size="sm" disabled={mode.selectedDonIds.length !== mode.abilityCost} onClick={confirmEventMainCost}>
              Play {mode.cardName} ({mode.selectedDonIds.length}/{mode.abilityCost} DON!! returned)
            </Button>
          )}
          {mode.kind === 'payingCounterEventCost' && (
            <Button variant="primary" size="sm" disabled={mode.selectedDonIds.length !== mode.abilityCost} onClick={confirmCounterEventCost}>
              Counter {mode.cardName} ({mode.selectedDonIds.length}/{mode.abilityCost} DON!! returned)
            </Button>
          )}
          {mode.kind === 'payingOnOppAttackCost' && (
            <Button variant="primary" size="sm" disabled={mode.selectedDonIds.length !== mode.cost} onClick={confirmOnOppAttackCost}>
              Activate ({mode.selectedDonIds.length}/{mode.cost} DON!!)
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (phase !== 'main') {
    return <p className="text-xs text-white/40">Resolving {phase} phase...</p>;
  }

  const availableDon = countAvailableDon(actingBoard);
  const attackableCards =
    turnNumber > 2
      ? [actingBoard.leader, ...actingBoard.characterArea].filter(isCardView).filter((card) => card.orientation === 'active' && !card.summoningSick)
      : [];
  const activatableEffectCards = [actingBoard.leader, ...actingBoard.characterArea, ...actingBoard.stageArea].filter(isCardView).filter(hasActivateMain);
  const unusedEffectCards = [actingBoard.leader, ...actingBoard.characterArea, ...actingBoard.stageArea].filter(isCardView).filter(hasUnusedActivateMain);

  const buildWarnings = (): EndPhaseWarning[] => {
    const warnings: EndPhaseWarning[] = [];
    if (availableDon > 0) {
      warnings.push({
        id: 'active-don',
        kind: 'don',
        title: 'Unused active DON!!',
        detail: `${availableDon} active DON!! still available in your cost area.`,
      });
    }
    if (attackableCards.length > 0) {
      warnings.push({
        id: 'active-attackers',
        kind: 'attackers',
        title: 'Cards can still attack',
        detail: `${formatCardNames(attackableCards)} ${attackableCards.length === 1 ? 'is' : 'are'} still active and eligible to attack.`,
        cards: attackableCards,
      });
    }
    if (activatableEffectCards.length > 0) {
      const namedCards = unusedEffectCards.length > 0 ? unusedEffectCards : activatableEffectCards;
      warnings.push({
        id: 'unused-effects',
        kind: 'effects',
        title: 'Activatable effects remain',
        detail: `${formatCardNames(namedCards)} still ${namedCards.length === 1 ? 'has' : 'have'} an [Activate: Main] effect available.`,
        cards: namedCards,
      });
    }
    return warnings;
  };

  const requestEndMainPhase = (): void => {
    const warnings = buildWarnings();
    if (warnings.length === 0) {
      endMainPhase();
      return;
    }
    setEndPhaseWarnings(warnings);
  };

  const confirmEndMainPhase = (): void => {
    setEndPhaseWarnings(null);
    endMainPhase();
  };

  return (
    <div className="flex flex-col gap-2">
      {errorBanner}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={requestEndMainPhase}>End Main Phase</Button>
      </div>

      <Modal
        open={!!endPhaseWarnings}
        onClose={() => setEndPhaseWarnings(null)}
        maxWidthClassName="max-w-2xl"
        bodyClassName="max-h-[82vh] overflow-y-auto"
        panelStyle={{ background: 'transparent', borderColor: 'transparent', borderRadius: 0, boxShadow: 'none', overflow: 'visible' }}
      >
        <div className="relative bg-[radial-gradient(circle_at_18%_0%,rgba(255,211,74,0.16),transparent_30%),linear-gradient(135deg,rgba(6,18,45,0.42),rgba(2,7,20,0.24)_48%,rgba(75,12,18,0.34))] shadow-[0_18px_70px_rgba(0,0,0,0.46),0_0_48px_rgba(217,164,65,0.12)] backdrop-blur-md">
          <div className="pointer-events-none absolute inset-0 border-2 border-gold/35 shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]" />
          <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
          <div className="pointer-events-none absolute -left-8 top-6 h-20 w-28 skew-x-[-20deg] bg-gold/10 blur-xl" />
          <div className="pointer-events-none absolute -right-10 bottom-3 h-24 w-32 skew-x-[-20deg] bg-red-500/10 blur-xl" />
          <div className="relative flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-gold/25 bg-black/10 px-1 pb-4">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.32em] text-gold drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]">Phase Check</p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.65)]">End Main Phase?</h2>
              </div>
              <div className="border border-red-300/35 bg-red-500/12 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-red-100 shadow-[0_0_22px_rgba(239,68,68,0.16)] backdrop-blur-sm">
                Warning
              </div>
            </div>

            <p className="border-l-4 border-gold/60 bg-black/18 py-2 pl-3 pr-2 text-sm font-semibold leading-relaxed text-white/78 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
              You still have legal-looking actions on board. Review them before passing priority out of Main Phase.
            </p>

            <ul className="flex flex-col gap-3">
            {(endPhaseWarnings ?? []).map((warning) => (
              <li key={warning.id} className="relative overflow-hidden border border-white/14 bg-black/18 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-[3px]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">{warning.title}</p>
                  {warning.cards && (
                    <span className="border border-white/12 bg-black/18 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.16em] text-white/60">
                      {warning.cards.length} listed
                    </span>
                  )}
                </div>
                <div className="px-3 py-3">
                  {warning.kind === 'attackers' && warning.cards ? (
                    <ul className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {warning.cards.map((card) => (
                        <WarningCardRow key={card.instanceId} card={card} />
                      ))}
                    </ul>
                  ) : warning.kind === 'effects' && warning.cards ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-white/70">{warning.detail}</p>
                      <ul className="grid max-h-44 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {warning.cards.map((card) => (
                          <WarningCardRow key={card.instanceId} card={card} tone="cyan" />
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-white/72">{warning.detail}</p>
                  )}
                </div>
              </li>
            ))}
            </ul>

            <div className="flex flex-wrap justify-end gap-2 border-t border-gold/25 bg-black/10 px-1 pt-4">
              <Button variant="ghost" onClick={() => setEndPhaseWarnings(null)}>Keep Playing</Button>
              <Button variant="primary" onClick={confirmEndMainPhase}>End Anyway</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
