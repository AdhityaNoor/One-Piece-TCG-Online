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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050a18]">
      <div
        className="text-center transition-opacity duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <p className="font-display text-3xl font-black uppercase tracking-[0.3em] text-gold">Tutorial</p>
        <p className="mt-4 text-sm uppercase tracking-[0.14em] text-white/70">
          Learn the basics of
          <br />
          <span className="text-base font-black text-white">ONE PIECE CARD GAME</span>
        </p>
        {error ? (
          <p className="mt-8 max-w-sm text-xs text-red-300">{error}</p>
        ) : (
          <p className="mt-8 animate-pulse text-xs font-bold uppercase tracking-[0.3em] text-white/40">Loading...</p>
        )}
      </div>
    </div>
  );
}
