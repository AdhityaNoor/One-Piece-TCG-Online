/**
 * Decides, BEFORE the GameState exists, which player gets the 5-2-1-4
 * going-first choice — the out-of-band step rule 5-2-1-4-1 puts outside the
 * engine entirely.
 *
 * It runs before `createPreGameState` on purpose. `setupState.decidingPlayerId`
 * is an INPUT to that call, so resolving the toss first means the result is
 * simply passed in, with no engine action, no log entry, and no mutation of a
 * state that has already been built. That is also how the server does it
 * (GameRoom runs its rounds, then calls GameSession.start with the winner).
 *
 * Two shapes, by mode:
 *  - Hot Seat: one person is playing both sides, so a toss decides nothing.
 *    They pick the first player outright and the game starts.
 *  - VS AI: a real RPS round against a uniformly random CPU throw, replayed on
 *    a draw. The winner then chooses first or second as normal — including the
 *    CPU, which already scores CHOOSE_GOING_FIRST like any other action
 *    (src/ai/utilities/legalActions.ts).
 *
 * Casual/Ranked do NOT come through here: the server owns that toss, and the
 * client renders it from the room's broadcasts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyRpsPick,
  createRpsToss,
  lockedRpsIds,
  nextRpsRound,
  randomRpsChoice,
  type RpsChoice,
  type RpsTossState,
} from '../../../../shared/rps';
import { RpsToss, RPS_REVEAL_MS, type RpsVerdict } from './RpsToss';
import { ChoicePromptActionRow, ChoicePromptOption } from './ChoicePromptPanel';
import { SETTINGS_PANEL_SCRIM } from '../settingsPanelStyles';

export interface PreGameDecision {
  /** Who gets to choose going first or second. */
  decidingPlayerId: string;
  /**
   * Hot Seat only. The player already said who goes first, so the
   * going-first prompt is answered for them rather than asked twice.
   */
  autoGoingFirst: boolean;
}

export interface PreGameDeciderProps {
  mode: 'hotseat' | 'cpu';
  /** Engine ids of the two seats. */
  playerIds: readonly [string, string];
  /** Display names, keyed by engine id. */
  playerNames: Record<string, string>;
  /** The human's seat. For hotseat this is only used to label the RPS-free panel. */
  localPlayerId: string;
  onDecided: (decision: PreGameDecision) => void;
}

function HotSeatFirstPlayerChoice({
  playerIds,
  playerNames,
  onDecided,
}: Pick<PreGameDeciderProps, 'playerIds' | 'playerNames' | 'onDecided'>) {
  return (
    <div className={`fixed inset-0 z-50 overflow-hidden text-white ${SETTINGS_PANEL_SCRIM}`}>
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <section className="pointer-events-auto relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <p className={`mb-4 text-[13px] font-black uppercase tracking-[0.24em] text-white/72`}>Hot Seat</p>
        {/* A shade smaller than the toss panel's verdict: that one is a single
            word ("Throw", "Win"), this is three, and at the same size it runs
            the full width of the screen. */}
        <h2 className="font-display text-[clamp(2.4rem,6.5vw,5rem)] font-black uppercase leading-[0.92] tracking-[0.04em] text-white/72">
          Who Goes First?
        </h2>
        <div className="mt-12 w-full max-w-3xl">
          <ChoicePromptActionRow>
            {playerIds.map((id) => (
              <ChoicePromptOption
                key={id}
                size="lg"
                className="min-w-[16rem] flex-1 rounded-xl"
                onClick={() => onDecided({ decidingPlayerId: id, autoGoingFirst: true })}
              >
                {playerNames[id] ?? id} Goes First
              </ChoicePromptOption>
            ))}
          </ChoicePromptActionRow>
        </div>
        <div className="mt-10 h-px w-[min(42rem,78vw)] bg-white/10" />
      </section>
    </div>
  );
}

function CpuRpsToss({
  playerIds,
  playerNames,
  localPlayerId,
  onDecided,
}: Pick<PreGameDeciderProps, 'playerIds' | 'playerNames' | 'localPlayerId' | 'onDecided'>) {
  const cpuPlayerId = playerIds.find((id) => id !== localPlayerId) ?? playerIds[1];
  const sides: readonly [string, string] = playerIds;

  const [toss, setToss] = useState<RpsTossState>(() => createRpsToss());
  const [reveal, setReveal] = useState<{ yours: RpsChoice; theirs: RpsChoice; verdict: RpsVerdict; winnerId: string | null } | null>(null);
  const revealTimer = useRef<number | null>(null);

  useEffect(() => () => { if (revealTimer.current !== null) window.clearTimeout(revealTimer.current); }, []);

  const pick = useCallback((choice: RpsChoice) => {
    if (reveal) return;
    // The CPU throws at the same moment the human commits, and neither side
    // has seen the other — the human's choice is locked into `toss` before
    // randomRpsChoice is called, so the CPU cannot be accused of answering it.
    const afterHuman = applyRpsPick(toss, sides, localPlayerId, toss.round, choice);
    if (afterHuman.kind === 'ignored') return;
    const outcome = applyRpsPick(afterHuman.state, sides, cpuPlayerId, toss.round, randomRpsChoice());
    if (outcome.kind !== 'resolved') return;

    setToss(outcome.state);
    const verdict: RpsVerdict = outcome.winnerId === null ? 'draw' : outcome.winnerId === localPlayerId ? 'win' : 'lose';
    setReveal({
      yours: outcome.picks[localPlayerId],
      theirs: outcome.picks[cpuPlayerId],
      verdict,
      winnerId: outcome.winnerId,
    });

    revealTimer.current = window.setTimeout(() => {
      revealTimer.current = null;
      if (outcome.winnerId === null) {
        // Draw: straight into another round, no extra click.
        setToss((current) => nextRpsRound(current));
        setReveal(null);
        return;
      }
      onDecided({ decidingPlayerId: outcome.winnerId, autoGoingFirst: false });
    }, RPS_REVEAL_MS);
  }, [cpuPlayerId, localPlayerId, onDecided, reveal, sides, toss]);

  const yourChoice = toss.picks[localPlayerId] ?? null;
  const deciderLabel = reveal?.winnerId ? (playerNames[reveal.winnerId] ?? reveal.winnerId) : null;

  return (
    <RpsToss
      round={toss.round}
      youLabel={playerNames[localPlayerId] ?? 'You'}
      themLabel={playerNames[cpuPlayerId] ?? 'CPU'}
      yourChoice={reveal ? reveal.yours : yourChoice}
      themLocked={lockedRpsIds(toss, sides).includes(cpuPlayerId) && !!reveal}
      reveal={reveal}
      deciderLabel={deciderLabel}
      onPick={pick}
    />
  );
}

export function PreGameDecider({ mode, playerIds, playerNames, localPlayerId, onDecided }: PreGameDeciderProps) {
  if (mode === 'hotseat') {
    return <HotSeatFirstPlayerChoice playerIds={playerIds} playerNames={playerNames} onDecided={onDecided} />;
  }
  return (
    <CpuRpsToss
      playerIds={playerIds}
      playerNames={playerNames}
      localPlayerId={localPlayerId}
      onDecided={onDecided}
    />
  );
}
