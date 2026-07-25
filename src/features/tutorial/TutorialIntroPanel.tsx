/**
 * Centered teaching panel for the pure-introduction chapters (card
 * introduction / basic-rules introduction). Renders the slide DATA from
 * tutorialIntroContent.ts — this component owns presentation only, never
 * content (same split as TutorialTooltip vs tutorialSteps).
 *
 * For the card-anatomy slide it showcases a REAL card from the live
 * scenario: it reads matchStore's already-loaded defs/images (the tutorial
 * scenario has put the whole catalog subset there — see TutorialManager's
 * setState) and deterministically picks a Character that actually has every
 * printed part the callouts describe (cost, power, counter, attribute,
 * type, effect text), so each label can show the card's actual printed
 * value. Falls back to a schematic placeholder if no image is available —
 * the callout values still render from the definition either way.
 *
 * Layering: zIndex 9994 — above the dim overlay (9990/9991), below the
 * instructor tooltip (9995) and controls (9996), so the dialogue bubble and
 * Next/Skip buttons always stay reachable on short viewports.
 */
import { useMemo } from 'react';
import { useMatchStore } from '../../app/store/matchStore';
import type { CardDefinition } from '../../engine/state/card';
import { introSlideAt } from './tutorialIntroContent';
import type { CardAnatomyCallout, TutorialIntroSlide } from './tutorialIntroContent';
import type { TutorialIntroPanelKind } from './types';

export interface TutorialIntroPanelProps {
  kind: TutorialIntroPanelKind;
  slideIndex: number;
}

/** Deterministic showcase pick: lowest card number Character carrying every anatomy part (falls back progressively so the panel never renders empty). */
export function pickShowcaseCharacter(defs: Record<string, CardDefinition>): CardDefinition | null {
  const characters = Object.values(defs)
    .filter((def) => def.category === 'character')
    .sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
  return (
    characters.find((def) => def.baseCost !== undefined && def.basePower !== undefined && def.counter !== undefined && (def.attributes?.length ?? 0) > 0 && def.text.trim().length > 0) ??
    characters.find((def) => def.baseCost !== undefined && def.basePower !== undefined && def.counter !== undefined) ??
    characters[0] ??
    null
  );
}

function calloutValue(def: CardDefinition | null, field: CardAnatomyCallout['field']): string {
  if (!def) return '—';
  switch (field) {
    case 'name':
      return def.name;
    case 'baseCost':
      return def.baseCost !== undefined ? String(def.baseCost) : '—';
    case 'basePower':
      return def.basePower !== undefined ? String(def.basePower) : '—';
    case 'counter':
      return def.counter !== undefined ? `+${def.counter}` : 'none';
    case 'attributes':
      return def.attributes?.length ? def.attributes.join(', ') : '—';
    case 'colors':
      return def.colors.length ? def.colors.join(', ') : '—';
    case 'types':
      return def.types.length ? def.types.join(' / ') : '—';
    case 'life':
      return def.life !== undefined ? String(def.life) : '—';
    case 'text': {
      const text = def.text.trim();
      if (!text) return '(no effect text)';
      return text.length > 90 ? `${text.slice(0, 90)}…` : text;
    }
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

function RuleRefChip({ ruleRef }: { ruleRef: string }) {
  return (
    <span className="ml-2 shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white/40">
      Rule {ruleRef}
    </span>
  );
}

function SlideBody({ slide }: { slide: TutorialIntroSlide }) {
  const defs = useMatchStore((state) => state.defs);
  const images = useMatchStore((state) => state.cardImagesByDefinitionId);
  const showcase = useMemo(() => pickShowcaseCharacter(defs), [defs]);
  const showcaseImage = showcase ? images[showcase.cardDefinitionId] ?? null : null;

  switch (slide.content.kind) {
    case 'cardAnatomy':
      return (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="mx-auto w-40 shrink-0 sm:mx-0">
            {showcaseImage ? (
              <img src={showcaseImage} alt={showcase?.name ?? 'Sample card'} className="w-full rounded-lg border border-white/20 shadow-lg" />
            ) : (
              <div className="flex aspect-[5/7] w-full items-center justify-center rounded-lg border border-dashed border-white/25 bg-white/5 p-3 text-center text-[11px] font-semibold text-white/50">
                {showcase ? showcase.name : 'Sample card'}
              </div>
            )}
            {showcase && <p className="mt-1.5 text-center text-[10px] font-semibold text-white/50">{showcase.name} · {showcase.cardNumber}</p>}
          </div>
          <ul className="min-w-0 flex-1 space-y-2">
            {slide.content.callouts.map((callout) => (
              <li key={callout.field} className="rounded-lg border border-white/10 bg-white/5 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-gold">
                    {callout.label}
                    <span className="ml-2 normal-case tracking-normal text-white/80">{calloutValue(showcase, callout.field)}</span>
                  </p>
                  <RuleRefChip ruleRef={callout.ruleRef} />
                </div>
                <p className="mt-1 text-[11px] leading-4 text-white/70">{callout.description}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'cardCategories':
      return (
        <ul className="space-y-2">
          {slide.content.categories.map((entry) => (
            <li key={entry.category} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-gold">{entry.label}</p>
                <RuleRefChip ruleRef={entry.ruleRef} />
              </div>
              <p className="mt-1 text-[11px] leading-4 text-white/70">{entry.description}</p>
            </li>
          ))}
        </ul>
      );
    case 'rulePoints':
      return (
        <ul className="space-y-2.5">
          {slide.content.points.map((point) => (
            <li key={point.heading} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-gold">{point.heading}</p>
                <RuleRefChip ruleRef={point.ruleRef} />
              </div>
              <p className="mt-1 text-xs leading-5 text-white/75">{point.body}</p>
            </li>
          ))}
        </ul>
      );
    case 'phaseFlow':
      return (
        <ol className="space-y-2">
          {slide.content.phases.map((phase, index) => (
            <li key={phase.name} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--op-gold-rgb)/0.55)] text-[10px] font-black text-gold">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/90">{phase.name} Phase</p>
                  <RuleRefChip ruleRef={phase.ruleRef} />
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-white/70">{phase.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    default: {
      const exhaustive: never = slide.content;
      return exhaustive;
    }
  }
}

export function TutorialIntroPanel({ kind, slideIndex }: TutorialIntroPanelProps) {
  const slide = introSlideAt(kind, slideIndex);

  return (
    <div
      style={{
        // Centered at the viewport (both axes) — the panel is the chapter's
        // main subject, so it owns the middle of the screen; maxHeight keeps
        // the bottom-docked instructor tooltip (9995) and controls (9996)
        // clear of it on short viewports.
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9994,
        width: 'min(660px, calc(100vw - 32px))',
        maxHeight: 'min(72vh, calc(100vh - 260px))',
        overflowY: 'auto',
      }}
      className="rounded-xl border border-[rgb(var(--op-gold-rgb)/0.55)] bg-[#0b1c3e]/95 p-4 shadow-2xl backdrop-blur"
    >
      <p className="font-display text-sm font-black uppercase tracking-[0.16em] text-gold">{slide.heading}</p>
      {slide.intro && <p className="mt-1 text-xs leading-5 text-white/70">{slide.intro}</p>}
      <div className="mt-3">
        <SlideBody slide={slide} />
      </div>
    </div>
  );
}
