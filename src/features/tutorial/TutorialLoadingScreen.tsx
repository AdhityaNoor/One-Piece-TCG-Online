/**
 * Cinematic fade shown while the scripted scenario builds (catalog fetch +
 * createPreGameState) — matches the project spec's mockup copy exactly.
 */
import { useEffect, useState } from 'react';

export interface TutorialLoadingScreenProps {
  error?: string | null;
}

export function TutorialLoadingScreen({ error }: TutorialLoadingScreenProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Inline background on purpose: this screen is the LAST thing a player sees
  // when something has gone wrong, and `bg-[#050a18]` is an arbitrary Tailwind
  // value used nowhere else — when this folder was missing from the Tailwind
  // content globs it was never generated, and the failure card rendered as
  // near-white text on a white page.
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050a18' }}
    >
      <div
        className="text-center transition-opacity duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <p className="font-display text-3xl font-black uppercase tracking-[0.3em]" style={{ color: '#e0b352' }}>Tutorial</p>
        <p className="mt-4 text-sm uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Learn the basics of
          <br />
          <span className="text-base font-black" style={{ color: '#ffffff' }}>ONE PIECE CARD GAME</span>
        </p>
        {error ? (
          <p className="mt-8 max-w-sm text-xs" style={{ color: '#fca5a5' }}>{error}</p>
        ) : (
          <p className="mt-8 animate-pulse text-xs font-bold uppercase tracking-[0.3em] text-white/40">Loading...</p>
        )}
      </div>
    </div>
  );
}
