/**
 * Global background music player. It mounts once at the app root so playback
 * can continue across screens while remaining purely UI/presentation state.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../store/settingsStore';
import {
  SETTINGS_PANEL_ICON_BUTTON,
  SETTINGS_PANEL_LABEL,
  SETTINGS_PANEL_OPTION,
  SETTINGS_PANEL_SHELL,
  SETTINGS_PANEL_TITLE,
} from './settingsPanelStyles';

const BACKSOUND_SRC = '/audio/main-menu-backsound.mp3';
const UI_CLICK_SRC = '/audio/ui-click.wav';

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {muted ? (
        <>
          <path d="m18 9-4 4" />
          <path d="m14 9 4 4" />
        </>
      ) : (
        <>
          <path d="M16 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
          <path d="M18.5 7c1.4 1.3 2.1 3 2.1 5s-.7 3.7-2.1 5" />
        </>
      )}
    </svg>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
      <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
    </svg>
  );
}

function SettingSwitch({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={[
        SETTINGS_PANEL_OPTION,
        'justify-between gap-3',
      ].join(' ')}
    >
      <span className={SETTINGS_PANEL_LABEL}>{label}</span>
      <span
        className={[
          'inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border border-white/15 p-0.5 transition-colors',
          checked ? 'bg-gold/85' : 'bg-white/12',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'block h-4 w-4 flex-shrink-0 rounded-full bg-white shadow transition-transform duration-200 ease-out',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
    </button>
  );
}

export function BacksoundControl({ className }: { className?: string } = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sfxRef = useRef<HTMLAudioElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileActionHost, setMobileActionHost] = useState<HTMLElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);

  const backsoundEnabled = useSettingsStore((state) => state.backsoundEnabled);
  const backsoundVolume = useSettingsStore((state) => state.backsoundVolume);
  const sfxEnabled = useSettingsStore((state) => state.sfxEnabled);
  const sfxVolume = useSettingsStore((state) => state.sfxVolume);
  const matchNavyBackgroundEnabled = useSettingsStore((state) => state.matchNavyBackgroundEnabled);
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
  const setBacksoundEnabled = useSettingsStore((state) => state.setBacksoundEnabled);
  const setBacksoundVolume = useSettingsStore((state) => state.setBacksoundVolume);
  const setSfxEnabled = useSettingsStore((state) => state.setSfxEnabled);
  const setSfxVolume = useSettingsStore((state) => state.setSfxVolume);
  const setMatchNavyBackgroundEnabled = useSettingsStore((state) => state.setMatchNavyBackgroundEnabled);
  const setAnimationsEnabled = useSettingsStore((state) => state.setAnimationsEnabled);

  useEffect(() => {
    const syncHost = () => setMobileActionHost(document.getElementById('mobile-action-settings-slot'));
    syncHost();

    const observer = new MutationObserver(syncHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(!!document.fullscreenElement || document.documentElement.classList.contains('op-pseudo-fullscreen'));
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('op-pseudo-fullscreen', pseudoFullscreen);
    setIsFullscreen(!!document.fullscreenElement || pseudoFullscreen);
    if (pseudoFullscreen) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return () => {
      document.documentElement.classList.remove('op-pseudo-fullscreen');
    };
  }, [pseudoFullscreen]);

  useEffect(() => {
    if (!panelOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) return;
      if (!root.contains(event.target)) setPanelOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [panelOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = backsoundVolume;
  }, [backsoundVolume]);

  useEffect(() => {
    const sfx = sfxRef.current;
    if (!sfx) return;
    sfx.volume = sfxVolume;
  }, [sfxVolume]);

  async function toggleFullscreen(): Promise<void> {
    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setPseudoFullscreen(true);
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!backsoundEnabled) {
      audio.pause();
      setIsPlaying(false);
      setPlaybackBlocked(false);
      return;
    }

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setPlaybackBlocked(false);
      })
      .catch(() => {
        setIsPlaying(false);
        setPlaybackBlocked(true);
      });
  }, [backsoundEnabled]);

  useEffect(() => {
    if (!backsoundEnabled || isPlaying) return;

    const unlockAudio = () => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.volume = backsoundVolume;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setPlaybackBlocked(false);
        })
        .catch(() => setPlaybackBlocked(true));
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [backsoundEnabled, backsoundVolume, isPlaying]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setBacksoundEnabled(false);
      return;
    }

    setBacksoundEnabled(true);
    audio.volume = backsoundVolume;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setPlaybackBlocked(false);
      })
      .catch(() => setPlaybackBlocked(true));
  };

  useEffect(() => {
    const playClickSfx = (event: MouseEvent) => {
      if (!sfxEnabled) return;

      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest('button, a, [role="button"]');
      if (!control || control.getAttribute('aria-disabled') === 'true') return;
      if (control instanceof HTMLButtonElement && control.disabled) return;

      const sfx = sfxRef.current;
      if (!sfx) return;

      sfx.pause();
      sfx.currentTime = 0;
      sfx.volume = sfxVolume;
      sfx.play().catch(() => {
        // Browsers may block audio until the first user gesture; clicks will retry naturally.
      });
    };

    document.addEventListener('click', playClickSfx);
    return () => document.removeEventListener('click', playClickSfx);
  }, [sfxEnabled, sfxVolume]);

  const inlineInMobileActions = mobileActionHost !== null;
  const control = (
    <div
      ref={rootRef}
      className={[
        inlineInMobileActions
          ? 'op-backsound-inline relative flex flex-col items-end gap-2 font-body text-white'
          : 'op-backsound-floating fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-body text-white',
        className ?? '',
      ].join(' ')}
    >
      <audio
        ref={audioRef}
        src={BACKSOUND_SRC}
        loop
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          setPlaybackBlocked(false);
        }}
        onPause={() => setIsPlaying(false)}
      />
      <audio ref={sfxRef} src={UI_CLICK_SRC} preload="auto" />

      {panelOpen && (
        <div className={`w-64 p-3 ${SETTINGS_PANEL_SHELL}`}>
          <div className="flex items-center justify-between gap-3">
            <p className={SETTINGS_PANEL_TITLE}>Backsound</p>
            <button
              type="button"
              onClick={togglePlayback}
              className={SETTINGS_PANEL_ICON_BUTTON}
              aria-label={isPlaying ? 'Pause backsound' : 'Play backsound'}
              title={isPlaying ? 'Pause backsound' : 'Play backsound'}
            >
              <SpeakerIcon muted={!isPlaying} />
            </button>
          </div>
          <label className="mt-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/68">
            Vol
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={backsoundVolume}
              onChange={(event) => setBacksoundVolume(Number(event.target.value))}
              className="h-1 flex-1 accent-white"
              aria-label="Backsound volume"
            />
          </label>
          {playbackBlocked && <p className="mt-3 text-[11px] leading-4 text-white/58">Tap the speaker once to start music.</p>}
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className={SETTINGS_PANEL_TITLE}>SFX</p>
              <button
                type="button"
                onClick={() => setSfxEnabled(!sfxEnabled)}
                className={SETTINGS_PANEL_ICON_BUTTON}
                aria-label={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
                title={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              >
                <SpeakerIcon muted={!sfxEnabled} />
              </button>
            </div>
            <label className="mt-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/68">
              Vol
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={(event) => setSfxVolume(Number(event.target.value))}
                className="h-1 flex-1 accent-white"
                aria-label="Sound effects volume"
              />
            </label>
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className={`mb-2 ${SETTINGS_PANEL_TITLE}`}>Visuals</p>
            <div className="flex flex-col gap-2">
              <SettingSwitch
                label="Animations"
                checked={animationsEnabled}
                onToggle={() => setAnimationsEnabled(!animationsEnabled)}
              />
              <SettingSwitch
                label="Navy BG"
                checked={matchNavyBackgroundEnabled}
                onToggle={() => setMatchNavyBackgroundEnabled(!matchNavyBackgroundEnabled)}
              />
              <button
                type="button"
                className={[SETTINGS_PANEL_OPTION, 'justify-between gap-3'].join(' ')}
                onClick={() => void toggleFullscreen()}
              >
                <span className={SETTINGS_PANEL_LABEL}>Fullscreen</span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                  {isFullscreen ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        className="flex h-12 w-12 items-center justify-center border border-transparent bg-transparent text-white/70 shadow-none transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white active:translate-y-0"
        aria-label="Settings"
        title="Settings"
      >
        <GearIcon />
      </button>
    </div>
  );

  return inlineInMobileActions ? createPortal(control, mobileActionHost) : control;
}
