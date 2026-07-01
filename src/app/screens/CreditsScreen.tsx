/**
 * CreditsScreen — attributions, version info, and legal disclaimer.
 *
 * Version is stamped at build time from package.json via __APP_VERSION__
 * (see vite.config.ts). No runtime fetch needed.
 */
import { GameCanvasScreen } from '../components';
import { useNavigationStore } from '../store/navigationStore';

interface CreditSection {
  heading: string;
  lines: string[];
}

const SECTIONS: CreditSection[] = [
  {
    heading: 'Development',
    lines: ['Adhitya Noor Muslim', 'Built with React, TypeScript & Vite'],
  },
  {
    heading: 'Card Data',
    lines: [
      'Card catalog compiled from public One Piece TCG data.',
      'All card names, artwork, and game content are property of',
      'Bandai Co., Ltd. and Eiichiro Oda / Shueisha.',
    ],
  },
  {
    heading: 'Open-Source Libraries',
    lines: [
      'React · Zustand · Tailwind CSS',
      'Vite · Vitest · Framer Motion',
    ],
  },
  {
    heading: 'Disclaimer',
    lines: [
      'This is an unofficial fan-made simulator.',
      'Not affiliated with or endorsed by Bandai.',
      'For personal, non-commercial use only.',
    ],
  },
];

export function CreditsScreen() {
  const goBack = useNavigationStore((s) => s.goBack);

  return (
    <GameCanvasScreen kicker="One Piece TCG Online" status="Credits" onBack={goBack}>
      <div className="flex h-full flex-col items-center justify-center gap-8 px-4">
        {/* Version badge */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-heading text-[2rem] font-black uppercase tracking-[0.4em] text-gold drop-shadow-[0_4px_0_rgba(0,0,0,0.7)]">
            v{__APP_VERSION__}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Alpha Build
          </span>
        </div>

        {/* Divider */}
        <div className="w-40 border-t border-gold/30" />

        {/* Credit sections */}
        <div className="grid w-full max-w-lg gap-6 text-center">
          {SECTIONS.map((section) => (
            <div key={section.heading} className="flex flex-col gap-1.5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-gold/80">
                {section.heading}
              </h2>
              {section.lines.map((line) => (
                <p key={line} className="text-sm leading-relaxed text-white/55">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="w-40 border-t border-gold/30" />

        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">
          © {new Date().getFullYear()} · Fan Project
        </p>
      </div>
    </GameCanvasScreen>
  );
}
