/**
 * Launches `npm run scrape` in a SEPARATE, external terminal window so the
 * scrape can be monitored on its own, outside the IDE's integrated terminal.
 *
 *   npm run scrape:window
 *
 * - Windows: opens Windows Terminal FULLSCREEN (`wt -F`). If Windows Terminal
 *   isn't installed, falls back to a normal pop-out console window (classic
 *   conhost can't be forced fullscreen from a flag — press Alt+Enter, or
 *   install Windows Terminal for true fullscreen).
 * - macOS: opens a new Terminal.app window running the scrape.
 * - Linux: tries the common terminal emulators.
 *
 * The launcher itself just spawns the window and exits; the actual work runs
 * in that new window via `npm run scrape`.
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');

/** Spawn fully detached so the new window outlives this launcher process. */
function detached(command, args, options = {}) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore', ...options });
  child.unref();
  return child;
}

function launchWindows() {
  // Preferred: Windows Terminal, fullscreen, starting in the repo, keeping the
  // window open after the scrape finishes (cmd /k).
  const wt = detached('wt.exe', ['-F', '-d', REPO_ROOT, 'cmd', '/k', 'npm', 'run', 'scrape']);

  wt.on('error', () => {
    // Windows Terminal not found -> fall back to a normal new console window.
    console.warn('[scrape:window] Windows Terminal (wt) not found — opening a standard console window instead.');
    console.warn('[scrape:window] For true fullscreen, install Windows Terminal, or press Alt+Enter in the new window.');
    detached(
      'cmd.exe',
      ['/c', 'start', '', 'cmd', '/k', `cd /d "${REPO_ROOT}" && npm run scrape`],
      { windowsHide: false },
    );
  });
}

function launchMac() {
  // AppleScript: open a new Terminal window running the scrape, then activate it.
  const script = `tell application "Terminal"
  do script "cd ${JSON.stringify(REPO_ROOT)} && npm run scrape"
  activate
end tell`;
  detached('osascript', ['-e', script]);
  console.log('[scrape:window] Opened Terminal.app. Use ⌃⌘F in that window for fullscreen.');
}

function launchLinux() {
  const cmd = `cd '${REPO_ROOT}' && npm run scrape; exec bash`;
  const candidates = [
    ['x-terminal-emulator', ['-e', `bash -lc "${cmd}"`]],
    ['gnome-terminal', ['--full-screen', '--', 'bash', '-lc', cmd]],
    ['konsole', ['--fullscreen', '-e', `bash -lc "${cmd}"`]],
    ['xterm', ['-fullscreen', '-e', `bash -lc "${cmd}"`]],
  ];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) {
      console.error('[scrape:window] No supported terminal emulator found. Run `npm run scrape` manually.');
      return;
    }
    const [bin, args] = candidates[i++];
    const child = detached(bin, args);
    child.on('error', tryNext);
  };
  tryNext();
}

switch (process.platform) {
  case 'win32':
    launchWindows();
    break;
  case 'darwin':
    launchMac();
    break;
  default:
    launchLinux();
    break;
}

console.log('[scrape:window] Launched the scrape in a separate window. You can close this one.');
