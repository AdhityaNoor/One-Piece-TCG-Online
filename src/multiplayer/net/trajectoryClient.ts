/**
 * Uploads a finished VS CPU recording.
 *
 * Deliberately best-effort and silent: a recording is a nice-to-have research
 * artifact, never something the player is waiting on. Every failure path — no
 * backend configured, not signed in, offline, server down, payload too big —
 * resolves to `false` rather than throwing, so a match can never be disrupted
 * by the fact that we were also watching it.
 */
import type { MatchTrajectory } from '../../../shared/replay';
import { apiBaseUrl, isBackendConfigured } from './backendConfig';

/**
 * Hard client-side cap. A normal match is ~25KB of JSON; anything an order of
 * magnitude past that is a runaway loop, not a game, and is dropped locally
 * rather than posted. The server enforces its own limit regardless — this is
 * politeness, not security.
 */
export const MAX_TRAJECTORY_BYTES = 512 * 1024;

export async function submitTrajectory(
  trajectory: MatchTrajectory,
  token: string | null,
): Promise<boolean> {
  if (!isBackendConfigured() || !token) return false;

  let body: string;
  try {
    body = JSON.stringify({ trajectory });
  } catch {
    return false;
  }
  if (body.length > MAX_TRAJECTORY_BYTES) return false;

  try {
    const response = await fetch(`${apiBaseUrl()}/trajectories`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body,
    });
    return response.ok;
  } catch {
    return false;
  }
}
