/**
 * Global background music player. It mounts once at the app root so playback
 * can continue across screens while remaining purely UI/presentation state.
 */
import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

const BACKSOUND_SRC = '/audio/main-menu-backsound.mp3';

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

export function BacksoundControl() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  const backsoundEnabled = useSettingsStore((state) => state.backsoundEnabled);
  const backsoundVolume = useSettingsStore((state) => state.backsoundVolume);
  const setBacksoundEnabled = useSettingsStore((state) => state.setBacksoundEnabled);
  const setBacksoundVolume = useSettingsStore((state) => state.setBacksoundVolume);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = backsoundVolume;
  }, [backsoundVolume]);

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

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-body text-white">
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

      {panelOpen && (
        <div className="w-64 border-2 border-gold/45 bg-[linear-gradient(180deg,_rgba(10,28,66,0.94),_rgba(3,9,24,0.98))] p-3 shadow-[0_12px_0_rgba(1,5,16,0.72),_0_22px_42px_rgba(0,0,0,0.36)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Backsound</p>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-9 w-9 items-center justify-center border border-gold/40 bg-black/30 text-gold transition-all hover:bg-gold hover:text-black"
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
              className="h-1 flex-1 accent-gold"
              aria-label="Backsound volume"
            />
          </label>
          {playbackBlocked && <p className="mt-3 text-[11px] leading-4 text-white/58">Tap the speaker once to start music.</p>}
        </div>
      )}

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        className="flex h-12 w-12 items-center justify-center border-2 border-gold/55 bg-[linear-gradient(180deg,_rgba(32,68,126,0.98),_rgba(3,10,29,0.98))] text-gold shadow-[0_8px_0_rgba(1,5,16,0.72),_0_16px_28px_rgba(0,0,0,0.34)] transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold hover:text-black active:translate-y-0.5"
        aria-label="Backsound settings"
        title="Backsound settings"
      >
        <GearIcon />
      </button>
    </div>
  );
}
