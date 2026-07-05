/**
 * Layer 3 board leaf: one card rendered as real card art on the field.
 *
 * Rules stay out of this component. It only exposes selection and compact
 * card-local action buttons; every click still routes through the engine
 * action dispatcher via the parent selection hook.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { CardImage } from '../CardImage';
import { cqh } from './boardScale';
import type { CardView } from '../../../board/projection';

export type BoardCardTileSize = 'leader' | 'board' | 'field';

const SIZE_PX: Record<BoardCardTileSize, { width: string; box: string }> = {
  leader: { width: cqh(116), box: cqh(162) },
  board: { width: cqh(116), box: cqh(162) },
  field: { width: cqh(150), box: cqh(210) },
};

export interface BoardCardTileProps {
  card: CardView;
  size?: BoardCardTileSize;
  selectable?: boolean;
  selected?: boolean;
  /** Marks a card that has a usable [Activate: Main] effect right now. */
  activatable?: boolean;
  attackable?: boolean;
  showBattlePower?: boolean;
  attachedDonSelectable?: boolean;
  attachedDonSelectedCount?: number;
  onSelect?: () => void;
  onActivate?: () => void;
  onAttack?: () => void;
  onAttachedDonSelect?: () => void;
  onZoom?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

function CardActionButton({
  iconSrc,
  label,
  ariaLabel,
  title,
  onClick,
}: {
  iconSrc: string;
  label: string;
  ariaLabel: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      aria-label={ariaLabel}
      title={title}
      className="flex h-8 min-w-[7.5rem] items-center gap-1.5 rounded-md border border-rose-200/75 bg-rose-100/95 px-2 text-[0.58rem] font-black uppercase leading-none tracking-[0.04em] text-slate-950 shadow-[0_8px_20px_rgba(0,0,0,0.42)] transition hover:bg-white"
    >
      <img src={iconSrc} alt="" className="h-4 w-4 shrink-0 object-contain" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Card art aspect ratio (width/height) — the tile root is square, the art is narrower. */
const CARD_ASPECT = 63 / 88;

/** Long hexagon, pointy on the left and right (points at the vertical mid-edges). */
const KEYWORD_HEX_CLIP = 'polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%)';

type KeywordKey = 'rush' | 'blocker' | 'doubleAttack' | 'banish' | 'unblockable';

/**
 * Keyword icon image files live in public/ui-icons/. They're loaded as-is and
 * forced white via a CSS filter (brightness(0) invert(1) turns any opaque
 * black/colored icon pure white while preserving transparency), so dropping a
 * differently-colored source file in still renders white. `srcs` has two
 * entries for Double Attack: the same sword file shown twice, side by side.
 */
const WHITE_FILTER = 'brightness(0) invert(1)';

const KEYWORD_ICON: Record<KeywordKey, { name: string; srcs: string[] }> = {
  rush: { name: 'Rush', srcs: ['/ui-icons/keyword-rush.png'] },
  blocker: { name: 'Blocker', srcs: ['/ui-icons/keyword-blocker.png'] },
  doubleAttack: { name: 'Double Attack', srcs: ['/ui-icons/keyword-sword.png', '/ui-icons/keyword-sword.png'] },
  banish: { name: 'Banish', srcs: ['/ui-icons/keyword-banish.png'] },
  unblockable: { name: 'Unblockable', srcs: ['/ui-icons/keyword-unblockable.png'] },
};

/**
 * A single on-field keyword tag (e.g. Rush, Banish), shown as a white icon on
 * an orange, white-outlined hexagon sized to match the other on-card labels
 * (power delta / DON!! x N — text-2xl). The outline is a slightly larger white
 * hexagon behind the orange one (both share the same clip-path), which gives a
 * crisp border that follows the pointy shape — a plain CSS border can't, since
 * clip-path also clips the border. The keyword name is kept as an accessible
 * label/tooltip since the text is now an icon.
 */
function KeywordLabel({ keyword }: { keyword: KeywordKey }) {
  const { name, srcs } = KEYWORD_ICON[keyword];
  return (
    <span
      className="pointer-events-none inline-block"
      style={{ clipPath: KEYWORD_HEX_CLIP, backgroundColor: '#ffffff', padding: '2px' }}
    >
      <span
        role="img"
        aria-label={name}
        title={name}
        className="flex items-center justify-center gap-[0.12em] px-3 py-1 text-2xl leading-none"
        style={{ clipPath: KEYWORD_HEX_CLIP, backgroundColor: '#f97316' }}
      >
        {srcs.map((src, index) => (
          <img key={index} src={src} alt="" draggable={false} className="block h-[1.4em] w-auto object-contain" style={{ filter: WHITE_FILTER }} />
        ))}
      </span>
    </span>
  );
}

/**
 * Keyword labels stacked into one row at the full "other label" font size,
 * then uniformly scaled DOWN (never up) so the whole row fits the card width.
 * scrollWidth reports the un-transformed layout width, so re-measuring after a
 * scale is stable. Runs on label changes and whenever the card resizes.
 */
function KeywordRow({ labels, maxWidth }: { labels: KeywordKey[]; maxWidth: number }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const natural = el.scrollWidth;
    setScale(natural > 0 && maxWidth > 0 ? Math.min(1, maxWidth / natural) : 1);
  }, [labels, maxWidth]);

  return (
    <div className="flex justify-center overflow-hidden" style={{ width: maxWidth > 0 ? maxWidth : undefined }}>
      <div
        ref={rowRef}
        className="flex flex-nowrap items-center gap-1"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        {labels.map((label) => (
          <KeywordLabel key={label} keyword={label} />
        ))}
      </div>
    </div>
  );
}

/** Tracks an element's rendered pixel width via ResizeObserver (for fit-to-width scaling). */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    // ResizeObserver is absent in jsdom/SSR — measure once and skip observing.
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** On-field combat keywords to surface as icon labels, in a stable display order. */
function activeKeywords(card: CardView): KeywordKey[] {
  const labels: KeywordKey[] = [];
  if (card.hasRush) labels.push('rush');
  if (card.hasBlocker) labels.push('blocker');
  if (card.hasDoubleAttack) labels.push('doubleAttack');
  if (card.hasBanish) labels.push('banish');
  if (card.isUnblockable) labels.push('unblockable');
  return labels;
}

export function BoardCardTile({
  card,
  size = 'board',
  selectable,
  selected,
  activatable,
  attackable,
  showBattlePower,
  attachedDonSelectable,
  attachedDonSelectedCount = 0,
  onSelect,
  onActivate,
  onAttack,
  onAttachedDonSelect,
  onZoom,
  onHoverStart,
  onHoverEnd,
}: BoardCardTileProps) {
  const dims = SIZE_PX[size];
  const isField = size === 'field';
  const rested = card.orientation === 'rested';
  const visiblePowerDelta = !showBattlePower && card.powerDelta !== null && card.powerDelta !== 0 ? card.powerDelta : null;
  const visibleCostDelta = !showBattlePower && card.costDelta !== null && card.costDelta !== 0 ? card.costDelta : null;
  const hasCardActions = !!onActivate || !!onAttack || !!onZoom;
  const hasAttachedDon = card.donAttachedCount > 0 && !showBattlePower;
  // Keyword labels are hidden while the battle-power overlay is up so they
  // don't fight the big centered number during a battle.
  const keywordLabels = showBattlePower ? [] : activeKeywords(card);
  // Card's rendered width, so the keyword row can scale down to fit it.
  const [rootRef, tileWidth] = useElementWidth<HTMLDivElement>();
  const attachedDonSelected = attachedDonSelectedCount > 0;

  return (
    <div
      ref={rootRef}
      data-card-instance-id={card.instanceId}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
      className={['group relative flex-shrink-0', isField ? 'aspect-square h-full max-h-full max-w-full' : ''].join(' ')}
      style={isField ? undefined : { width: dims.box, height: dims.box }}
    >
      <div
        role={selectable ? 'button' : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={selectable ? onSelect : undefined}
        onKeyDown={selectable ? (event) => { if (event.key === 'Enter' || event.key === ' ') onSelect?.(); } : undefined}
        className={[
          'absolute inset-0 flex items-center justify-center transition-transform duration-200',
          rested ? 'rotate-90' : '',
          selectable ? 'cursor-pointer' : '',
        ].join(' ')}
      >
        <div className="relative" style={isField ? { height: '100%', aspectRatio: '63 / 88' } : { width: dims.width }}>
          <CardImage
            src={card.imageUrl}
            alt={card.name}
            className={[
              isField ? 'h-full w-full' : '',
              selected ? 'ring-2 ring-amber-300' : activatable ? 'ring-2 ring-emerald-400' : attackable ? 'ring-2 ring-rose-400' : '',
            ].filter(Boolean).join(' ')}
          />
          {onZoom && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100 group-focus-within:bg-black/45 group-focus-within:opacity-100" />
          )}
        </div>
      </div>

      {(visiblePowerDelta !== null || visibleCostDelta !== null || hasAttachedDon || keywordLabels.length > 0) && (
        <div className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
          {visiblePowerDelta !== null && (
            <div
              className={[
                'pointer-events-none rounded-lg border px-3 py-1.5 text-2xl font-black leading-none shadow-[0_12px_30px_rgba(0,0,0,0.55)]',
                visiblePowerDelta > 0
                  ? 'border-[#00ff47] bg-[#003d16]/80 text-[#00ff47] shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_24px_rgba(0,255,71,0.42)]'
                  : 'border-[#ff1f1f] bg-[#4a0000]/80 text-[#ff1f1f] shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_24px_rgba(255,31,31,0.42)]',
              ].join(' ')}
            >
              {visiblePowerDelta > 0 ? '+' : ''}{visiblePowerDelta.toLocaleString()}
            </div>
          )}

          {visibleCostDelta !== null && (
            <div
              className={[
                'pointer-events-none rounded-lg border px-3 py-1.5 text-2xl font-black leading-none shadow-[0_12px_30px_rgba(0,0,0,0.55)]',
                visibleCostDelta > 0
                  ? 'border-[#ffffff] bg-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_22px_rgba(255,255,255,0.24)]'
                  : 'border-[#00d5ff] bg-[#001f33]/90 text-[#00d5ff] shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_24px_rgba(0,213,255,0.36)]',
              ].join(' ')}
            >
              {visibleCostDelta > 0 ? '+' : ''}{visibleCostDelta}
            </div>
          )}

          {hasAttachedDon && (
            <button
              type="button"
              disabled={!attachedDonSelectable}
              onClick={(event) => { event.stopPropagation(); onAttachedDonSelect?.(); }}
              className={[
                'rounded-lg border px-3 py-1.5 text-[1.2rem] font-black uppercase leading-none text-white shadow-[0_12px_30px_rgba(0,0,0,0.55)] transition',
                attachedDonSelectable ? 'cursor-pointer hover:border-white hover:bg-black' : 'cursor-default',
                attachedDonSelected
                  ? 'border-white bg-black ring-2 ring-white/70'
                  : 'border-white/45 bg-black',
              ].join(' ')}
              aria-label={`${card.donAttachedCount} attached DON on ${card.name}`}
              title={attachedDonSelectable ? 'Select attached DON!!' : `${card.donAttachedCount} attached DON!!`}
            >
              DON <span className="align-[0.08em] text-[0.7rem]">x</span> {card.donAttachedCount}
            </button>
          )}

          {keywordLabels.length > 0 && <KeywordRow labels={keywordLabels} maxWidth={Math.max(0, tileWidth * CARD_ASPECT - 6)} />}
        </div>
      )}

      {showBattlePower && card.power !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-[#ff1f1f] bg-[#5a0000]/68 px-3.5 py-2 text-2xl font-black leading-none text-[#ff1f1f] shadow-[0_12px_30px_rgba(0,0,0,0.58),0_0_30px_rgba(255,31,31,0.5)] backdrop-blur-md">
          {card.power.toLocaleString()}
        </div>
      )}

      {hasCardActions && (
        <div className="absolute right-1 top-1/2 z-40 flex -translate-y-1/2 flex-col items-stretch gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {onAttack && (
            <CardActionButton
              iconSrc="/ui-icons/action-attack.png"
              label="Attack"
              ariaLabel={`Declare attack with ${card.name}`}
              title="Declare attack"
              onClick={onAttack}
            />
          )}
          {onActivate && (
            <CardActionButton
              iconSrc="/ui-icons/action-activate-main.png"
              label="Activate: Main"
              ariaLabel={`Activate effect of ${card.name}`}
              title="Activate: Main"
              onClick={onActivate}
            />
          )}
          {onZoom && (
            <CardActionButton
              iconSrc="/ui-icons/action-view-detail.png"
              label="View Detail"
              ariaLabel={`View details for ${card.name}`}
              title="View detail"
              onClick={onZoom}
            />
          )}
        </div>
      )}
    </div>
  );
}
