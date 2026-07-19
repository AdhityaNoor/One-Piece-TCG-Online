import { useDeckEligibility } from '../hooks/useDeckEligibility';
import { GameCanvasScreen } from '../components';
import { useNavigationStore } from '../store/navigationStore';

type PlayModeItem = {
  label: string;
  eyebrow: string;
  description: string;
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
};

/**
 * Each of the three play modes (Local / Casual / Ranked) gets its own accent
 * color so the columns read as distinct destinations at a glance instead of
 * three identical translucent-black blocks. Colors are additive on top of
 * the flat translucent card body — only the left rail, dot, and eyebrow
 * text shift per section (no borders or drop shadows on the cards).
 */
type AccentKey = 'gold' | 'cyan' | 'violet';

const ACCENT_STYLES: Record<AccentKey, { title: string; dot: string; bar: string }> = {
  gold: {
    title: 'text-gold',
    dot: 'bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]',
    bar: 'bg-gradient-to-b from-gold/90 via-gold/35 to-transparent',
  },
  cyan: {
    title: 'text-cyan-300',
    dot: 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.6)]',
    bar: 'bg-gradient-to-b from-cyan-300/90 via-cyan-300/35 to-transparent',
  },
  violet: {
    title: 'text-violet-300',
    dot: 'bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.6)]',
    bar: 'bg-gradient-to-b from-violet-300/90 via-violet-300/35 to-transparent',
  },
};

/**
 * Play tab content, embedded under the universal header (see HubScreen) —
 * no back button of its own since it isn't a pushed screen anymore.
 */
export function PlayMenuScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCounts = useDeckEligibility();

  const hasLocalDecks = deckCounts.local > 0;
  const hasStandardDecks = deckCounts.standard > 0;
  const hasExtraDecks = deckCounts.extra > 0;
  const hasRankedDecks = deckCounts.ranked > 0;

  return (
    <GameCanvasScreen dense>
      <div className="grid h-full min-h-0 gap-5 overflow-y-auto px-2 py-2 sm:px-3 lg:grid-cols-3 lg:gap-8 lg:overflow-hidden">
        <PlaySection
          title="Local"
          accent="gold"
          deckHint={`${deckCounts.local} decks available`}
          items={[
            {
              label: 'VS Self',
              eyebrow: 'Local Hotseat',
              description: 'Control both seats locally. Best for testing decks, effects, and board states.',
              disabled: !hasLocalDecks,
              disabledReason: 'Save at least one deck first.',
              onClick: () => navigateTo({ screen: 'deck-select' }),
            },
            {
              label: 'VS CPU',
              eyebrow: 'Single Player',
              description: 'Play against the local CPU using any saved deck for either side.',
              disabled: !hasLocalDecks,
              disabledReason: 'Save at least one deck first.',
              onClick: () => navigateTo({ screen: 'cpu-deck-select' }),
            },
          ]}
        />

        <PlaySection
          title="Casual"
          accent="cyan"
          deckHint={`${deckCounts.extra} eligible decks`}
          items={[
            {
              label: 'Standard',
              eyebrow: 'Online Casual',
              description: 'Bring a Legal deck into the live casual lobby.',
              disabled: !hasStandardDecks,
              disabledReason: 'No Legal decks found.',
              onClick: () => navigateTo({ screen: 'casual-lobby', regulation: 'casualStandard' }),
            },
            {
              label: 'Extra Legal',
              eyebrow: 'Online Casual',
              description: 'Bring a Legal or Extra Legal deck into the live casual lobby.',
              disabled: !hasExtraDecks,
              disabledReason: 'No Legal or Extra Legal decks found.',
              onClick: () => navigateTo({ screen: 'casual-lobby', regulation: 'casualExtra' }),
            },
          ]}
        />

        <PlaySection
          title="Ranked"
          accent="violet"
          deckHint={`${deckCounts.ranked} legal decks`}
          items={[
            {
              label: 'Standard',
              eyebrow: 'Ranked Queue',
              description: 'Competitive seasonal ladder for Legal decks only.',
              disabled: !hasRankedDecks,
              disabledReason: 'No Standard-legal decks found.',
              onClick: () => navigateTo({ screen: 'ranked' }),
            },
          ]}
        />
      </div>
    </GameCanvasScreen>
  );
}

function PlaySection({
  title,
  accent,
  deckHint,
  items,
}: {
  title: string;
  accent: AccentKey;
  deckHint: string;
  items: PlayModeItem[];
}) {
  const styles = ACCENT_STYLES[accent];
  return (
    <section className="relative flex min-h-[18rem] min-w-0 flex-col px-1 py-2 lg:min-h-0 lg:px-0 lg:[&:not(:first-child)]:before:absolute lg:[&:not(:first-child)]:before:-left-4 lg:[&:not(:first-child)]:before:top-14 lg:[&:not(:first-child)]:before:h-[calc(100%-4.5rem)] lg:[&:not(:first-child)]:before:w-px lg:[&:not(:first-child)]:before:bg-gradient-to-b lg:[&:not(:first-child)]:before:from-transparent lg:[&:not(:first-child)]:before:via-gold/28 lg:[&:not(:first-child)]:before:to-transparent">
      <div className="pb-4 text-center">
        <div className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={['h-2 w-2 flex-shrink-0 rounded-full', styles.dot].join(' ')} />
          <p className={['font-display text-xl font-black uppercase tracking-[0.22em] sm:text-2xl', styles.title].join(' ')}>{title}</p>
        </div>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/42 sm:text-sm">{deckHint}</p>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3.5">
        {items.map((item) => (
          <ModeCard key={`${title}-${item.label}-${item.eyebrow}`} item={item} accent={accent} />
        ))}
      </div>
    </section>
  );
}

function ModeCard({ item, accent }: { item: PlayModeItem; accent: AccentKey }) {
  const styles = ACCENT_STYLES[accent];
  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={item.onClick}
      className={[
        'group relative flex min-h-[10rem] w-full items-stretch gap-3 overflow-hidden bg-black/60 p-3 text-left transition sm:gap-4 sm:p-5',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061024]',
        item.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:-translate-y-0.5 hover:bg-black/75',
      ].join(' ')}
    >
      <span aria-hidden="true" className={['w-1 flex-shrink-0 rounded-full', styles.bar].join(' ')} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className={['text-[10px] font-black uppercase tracking-[0.22em] sm:text-[11px] sm:tracking-[0.26em]', styles.title].join(' ')}>{item.eyebrow}</p>
        <h2 className="mt-0.5 font-display text-lg font-black uppercase tracking-[0.1em] text-white sm:text-xl">{item.label}</h2>
        <p className="mt-1.5 text-xs leading-5 text-slate-200/75 sm:text-sm sm:leading-6">{item.description}</p>

        {item.disabled && item.disabledReason && (
          <p className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{item.disabledReason}</p>
        )}
      </div>
    </button>
  );
}
