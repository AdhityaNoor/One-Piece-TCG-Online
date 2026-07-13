/**
 * CreditsScreen - attributions, version info, and legal disclaimer.
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
    lines: [
      'Croix Shadow',
      'Ninja Dev / Digital Pirates / Full-Time Employee',
      'Activate: Main - drink 1 can of coffee.',
      'When Developing - +10 productivity, -10 social battery, then keep shipping.',
    ],
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
      'React / Zustand / Tailwind CSS',
      'Vite / Vitest / Framer Motion',
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
    <GameCanvasScreen onBack={goBack}>
      <div className="flex h-full min-h-0 flex-col items-center justify-start gap-4 overflow-y-auto px-4 py-3 sm:justify-center sm:gap-6">
        <section
          className="op-credits-panel grid w-full max-w-5xl items-stretch gap-3 border border-gold/25 bg-black/45 p-3 text-center shadow-[0_14px_0_rgba(1,5,16,0.5),_0_24px_38px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:gap-5 sm:p-5 lg:p-6"
        >
          <figure className="flex min-h-0 self-stretch flex-col gap-2 sm:gap-3">
            <div className="h-[32dvh] min-h-[10rem] flex-none overflow-hidden border border-white/10 bg-black/22 sm:h-auto sm:min-h-0 sm:flex-1">
              <img
                src="/ui/leader-croix-shadow.png"
                alt="Croix Shadow leader card"
                className="h-full w-full object-contain object-top sm:object-cover"
                draggable={false}
              />
            </div>
            <figcaption className="text-center text-[9px] font-semibold leading-4 text-white/55 sm:text-xs sm:leading-5">
              Want to custom card like this? visit{' '}
              <a
                href="https://optcgcustom.app"
                target="_blank"
                rel="noreferrer"
                className="text-gold underline decoration-gold/45 underline-offset-4 transition hover:text-white"
              >
                https://optcgcustom.app
              </a>{' '}
              (my other app)
            </figcaption>
          </figure>

          <div className="min-w-0">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-gold/80">Dev Leader</p>
                <h1 className="mt-1 font-heading text-xl font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.65)] sm:text-3xl lg:text-4xl">
                  Croix Shadow
                </h1>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-heading text-xl font-black tracking-[0.16em] text-gold sm:text-2xl">6969</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45 sm:text-[10px]">Wisdom / Coffee</p>
              </div>
            </div>

            <div className="mt-3 border-y border-white/10 py-3 sm:mt-4 sm:py-4">
              <p className="text-xs font-semibold leading-5 text-white/72 sm:text-sm sm:leading-6">
                The sleepiest commander on the digital seas. Calm face, full backlog, suspiciously powered by canned coffee.
              </p>
              <p className="mt-2 text-xs leading-5 text-white/55 sm:mt-3 sm:text-sm sm:leading-6">
                <span className="font-bold text-cyan-200">Activate: Main</span> - drink 1 can of coffee.
              </p>
              <p className="text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
                <span className="font-bold text-cyan-200">When Developing</span> - if there are 2 or more coffee cans in trash, this project gains +10 productivity.
              </p>
              <p className="text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
                If there are 10 or more, K.O. this card, then ship the feature anyway.
              </p>
            </div>

            <div className="mt-4 grid gap-3 text-center sm:mt-5 sm:grid-cols-2 sm:gap-4">
              {SECTIONS.map((section) => (
                <div key={section.heading} className="flex flex-col gap-1.5">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.24em] text-gold/80">
                    {section.heading}
                  </h2>
                  {section.lines.map((line) => (
                    <p key={line} className="text-[10px] leading-relaxed text-white/55 sm:text-xs lg:text-sm">
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">
          (C) {new Date().getFullYear()} - Fan Project - v{__APP_VERSION__} Alpha Build
        </p>
      </div>
    </GameCanvasScreen>
  );
}
