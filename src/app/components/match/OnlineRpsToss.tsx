/**
 * Casual/Ranked view of the pre-game Rock-Paper-Scissors.
 *
 * Renders the SERVER's toss — it never resolves a round. The room decides,
 * because a toss both clients computed for themselves would be a toss either
 * client could lie about; this only forwards a pick and draws what comes back.
 * That is also why the opponent's throw is not shown until the server sends a
 * resolved round: until then the client genuinely does not know it (see
 * RpsUpdatePayload's note on why that separation is load-bearing).
 */
import { useOnlineStore } from '../../store/onlineStore';
import { RpsToss, type RpsVerdict } from './RpsToss';
import { SETTINGS_PANEL_BODY } from '../settingsPanelStyles';

export function OnlineRpsToss() {
  const rps = useOnlineStore((s) => s.rps);
  const localChoice = useOnlineStore((s) => s.rpsLocalChoice);
  const localSeatId = useOnlineStore((s) => s.localSeatId);
  const seats = useOnlineStore((s) => s.seats);
  const sendRpsPick = useOnlineStore((s) => s.sendRpsPick);
  const status = useOnlineStore((s) => s.status);

  if (!rps || !localSeatId) return null;

  const opponentSeatId = seats.find((seat) => seat.seatId !== localSeatId)?.seatId ?? null;
  const nameFor = (seatId: string | null): string =>
    seats.find((seat) => seat.seatId === seatId)?.username ?? (seatId ?? 'Opponent');

  const resolved = rps.resolved;
  const yours = resolved?.picks[localSeatId] ?? null;
  const theirs = opponentSeatId ? (resolved?.picks[opponentSeatId] ?? null) : null;
  const verdict: RpsVerdict | null = resolved
    ? resolved.winnerSeatId === null
      ? 'draw'
      : resolved.winnerSeatId === localSeatId
        ? 'win'
        : 'lose'
    : null;

  return (
    <RpsToss
      round={rps.round}
      youLabel={nameFor(localSeatId)}
      themLabel={nameFor(opponentSeatId)}
      yourChoice={localChoice}
      // The server's roster is the truth about who has thrown; the local echo
      // only exists so the row locks before the round-trip lands, and it is
      // gone after a reconnect while the seat is still locked.
      youLocked={!!localChoice || rps.lockedSeatIds.includes(localSeatId)}
      themLocked={!!opponentSeatId && rps.lockedSeatIds.includes(opponentSeatId)}
      reveal={resolved && yours && theirs && verdict ? { yours, theirs, verdict } : null}
      deciderLabel={resolved?.winnerSeatId ? nameFor(resolved.winnerSeatId) : null}
      onPick={sendRpsPick}
      footer={
        status !== 'connected' ? (
          <p className={`mt-4 ${SETTINGS_PANEL_BODY}`}>Reconnecting to the match server…</p>
        ) : null
      }
    />
  );
}
