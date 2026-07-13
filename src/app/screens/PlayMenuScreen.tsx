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
  deckHint,
  items,
}: {
  title: string;
  deckHint: string;
  items: PlayModeItem[];
}) {
  return (
    <section className="relative flex min-h-[18rem] min-w-0 flex-col px-1 py-2 lg:min-h-0 lg:px-0 lg:[&:not(:first-child)]:before:absolute lg:[&:not(:first-child)]:before:-left-4 lg:[&:not(:first-child)]:before:top-14 lg:[&:not(:first-child)]:before:h-[calc(100%-4.5rem)] lg:[&:not(:first-child)]:before:w-px lg:[&:not(:first-child)]:before:bg-gradient-to-b lg:[&:not(:first-child)]:before:from-transparent lg:[&:not(:first-child)]:before:via-gold/28 lg:[&:not(:first-child)]:before:to-transparent">
      <div className="pb-3 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-gold">{title}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">{deckHint}</p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        {items.map((item) => (
          <ModeCard key={`${title}-${item.label}-${item.eyebrow}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function ModeCard({ item }: { item: PlayModeItem }) {
  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={item.onClick}
      className={[
        'group flex min-h-[9.5rem] w-full flex-col gap-2 border border-white/10 bg-[#08101f] p-3 text-left transition sm:gap-3 sm:border-2 sm:border-cyan-200/20 sm:bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] sm:p-5 sm:shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]',
        item.disabled
          ? 'cursor-not-allowed opacity-45'
          : 'cursor-pointer hover:-translate-y-0.5 hover:border-gold/60 hover:bg-[linear-gradient(180deg,_rgba(18,45,94,0.86),_rgba(5,14,34,0.94))] hover:shadow-[0_18px_0_rgba(1,5,16,0.6),_0_30px_48px_rgba(0,0,0,0.36)]',
      ].join(' ')}
    >
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold sm:text-[10px] sm:tracking-[0.24em]">{item.eyebrow}</p>
        <h2 className="font-display text-base font-black uppercase tracking-[0.12em] text-white sm:text-lg">{item.label}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-200/72 sm:text-sm sm:leading-6">{item.description}</p>
      </div>

      {item.disabled && item.disabledReason && (
        <p className="mt-auto text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">{item.disabledReason}</p>
      )}
    </button>
  );
}
