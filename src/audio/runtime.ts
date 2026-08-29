/**
 * The browser-side singleton and its wiring. Everything platform-specific
 * lives here so soundManager.ts stays a pure, injectable factory.
 *
 * Layering: /src/audio must not import from /src/app. The app supplies its
 * settings via configureAudioSettings() at boot (see app/hooks/useAppInit.ts)
 * rather than this module reaching into a zustand store, so the audio layer
 * can be dropped into a test, a storybook or the render harness untouched.
 */
import { createSoundManager, type AudioContextLike, type AudioSettingsSnapshot, type SoundManager } from './soundManager';

/** Full volume until the app says otherwise — a harness that never configures anything still makes sound. */
const DEFAULT_SETTINGS: AudioSettingsSnapshot = {
  sfxEnabled: true,
  sfxVolume: 0.65,
  musicEnabled: true,
  musicVolume: 0.45,
};

let settingsSource: () => AudioSettingsSnapshot = () => DEFAULT_SETTINGS;

/**
 * Point the audio layer at the app's real settings. Call once at boot, and
 * again (or subscribe) whenever they change — syncSettings() re-reads them.
 */
export function configureAudioSettings(source: () => AudioSettingsSnapshot): void {
  settingsSource = source;
  soundManager.syncSettings();
}

function createBrowserContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor() as unknown as AudioContextLike;
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

export const soundManager: SoundManager = createSoundManager({
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  createContext: createBrowserContext,
  fetchArrayBuffer,
  getSettings: () => settingsSource(),
  onWarning: (message, error) => {
    // Audio is never load-bearing — surface it, never throw on it.
    if (import.meta.env?.DEV) console.warn(message, error);
  },
});

let unlockInstalled = false;

/**
 * Browsers keep an AudioContext suspended until the page has seen a real user
 * gesture. One listener, removed as soon as it fires, is all that is needed —
 * everything after that plays normally.
 */
export function installAudioUnlock(): () => void {
  if (typeof window === 'undefined' || unlockInstalled) return () => undefined;
  unlockInstalled = true;
  const handler = () => {
    soundManager.unlock();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('touchstart', handler);
  };
  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
  window.addEventListener('touchstart', handler);
  return handler;
}
