/**
 * Where the online Rock-Paper-Scissors toss is allowed to mount.
 *
 * Rule being protected (server/src/rooms/GameRoom.ts, `maybeStartMatch`):
 * the room opens the pre-game toss the moment both seats are ready, and only
 * starts the match once a seat has WON it. That window sits entirely before
 * `MatchStarted`, which is the message that navigates a client to
 * `online-match`. So while the toss is open, a casual client is still on
 * `casual-lobby` and a ranked client still on `ranked`.
 *
 * That is how the match got stuck with both players showing "ready": the only
 * mount point for `OnlineRpsToss` was MatchScreen, i.e. a screen no client had
 * reached yet, so neither player could throw and the room sat waiting on a
 * pick forever. The component itself was fine — it was mounted somewhere it
 * could never be seen.
 *
 * It draws its own full-screen scrim and returns null when no round is open,
 * so the root of App is a safe place for it and every screen is covered,
 * including a rematch toss that opens while both players are still on the
 * finished board.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_DIR = path.resolve(__dirname, '..');
const APP_TSX = readFileSync(path.join(APP_DIR, 'App.tsx'), 'utf8');

/** Everything App renders inside the `screen` switch — i.e. per-screen only. */
function screenSwitchBody(source: string): string {
  const start = source.indexOf('const screen = (() => {');
  expect(start, 'App.tsx no longer has the `const screen = (() => {` switch this test reads').toBeGreaterThan(-1);
  const end = source.indexOf('})();', start);
  expect(end, 'App.tsx screen switch is not closed the way this test expects').toBeGreaterThan(start);
  return source.slice(start, end);
}

function tsxFilesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : tsxFilesUnder(full);
    return full.endsWith('.tsx') ? [full] : [];
  });
}

describe('OnlineRpsToss mount point', () => {
  it('is rendered by App', () => {
    expect(APP_TSX).toMatch(/<OnlineRpsToss\s*\/>/);
    expect(APP_TSX).toMatch(/import \{ OnlineRpsToss \} from '\.\/components\/match\/OnlineRpsToss';/);
  });

  it('is rendered OUTSIDE the per-screen switch, so every screen shows it', () => {
    // Inside the switch it would only render for whichever screens listed it —
    // which is exactly the bug: the toss opens before the client leaves the
    // lobby, so a screen-scoped mount is unreachable.
    expect(screenSwitchBody(APP_TSX)).not.toContain('OnlineRpsToss');
  });

  it('is not mounted by any screen component', () => {
    const offenders = tsxFilesUnder(path.join(APP_DIR, 'screens'))
      .filter((file) => /<OnlineRpsToss\s*\/>/.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(APP_DIR, file));
    // A second mount would double-render the scrim wherever both apply (a
    // rematch toss on `online-match`), and re-tempts the original mistake of
    // treating the toss as a gameplay-screen concern.
    expect(offenders).toEqual([]);
  });
});
