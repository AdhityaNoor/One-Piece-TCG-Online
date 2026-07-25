/**
 * Slide DATA for the tutorial's pure-introduction chapters (card
 * introduction and basic-rules introduction) — rendered by
 * TutorialIntroPanel.tsx. Same architecture rule as tutorialSteps.ts:
 * teaching content is plain, JSON-serializable configuration, never JSX or
 * logic, so it can be reviewed/extended without touching a component.
 *
 * Every factual claim below carries its Comprehensive Rules section
 * reference (project rule: "Reference the rule section from the PDF when
 * possible") and was cross-checked against the engine modules that
 * implement it (cited inline). Nothing here is executable — it is display
 * text only, exactly like CardDefinition.text.
 */
import type { CardCategory } from '../../engine/state/card';
import type { TutorialIntroPanelKind } from './types';

/**
 * One labeled part of a card's printed layout. `field` names the actual
 * CardDefinition property the callout describes, so TutorialIntroPanel can
 * show the REAL value from the showcased catalog card next to each label
 * (and so a test can prove every callout maps to a field that exists).
 */
export interface CardAnatomyCallout {
  field: 'name' | 'baseCost' | 'basePower' | 'counter' | 'attributes' | 'colors' | 'types' | 'text' | 'life';
  label: string;
  description: string;
  /** Comprehensive Rules section for this piece of card information (Section 2, "Card Information"). */
  ruleRef: string;
}

export interface CardCategorySummary {
  category: CardCategory;
  label: string;
  description: string;
  ruleRef: string;
}

/** One short teaching point with its rule citation. */
export interface RulePoint {
  heading: string;
  body: string;
  ruleRef: string;
}

/** One entry in the turn-structure flow strip. */
export interface PhaseSummary {
  name: string;
  summary: string;
  ruleRef: string;
}

export type TutorialIntroSlideContent =
  | { kind: 'cardAnatomy'; callouts: CardAnatomyCallout[] }
  | { kind: 'cardCategories'; categories: CardCategorySummary[] }
  | { kind: 'rulePoints'; points: RulePoint[] }
  | { kind: 'phaseFlow'; phases: PhaseSummary[] };

export interface TutorialIntroSlide {
  id: string;
  heading: string;
  /** Optional one-line framing sentence shown under the heading. */
  intro?: string;
  content: TutorialIntroSlideContent;
}

/**
 * Card-introduction slides. Slide 0 walks the printed layout of a real card
 * (TutorialIntroPanel picks a Character from the live scenario's catalog
 * defs so each callout can show the actual printed value); slide 1 surveys
 * the five card categories (2-2-2, mirrored by engine/state/card.ts's
 * CardCategory union).
 */
const CARD_ANATOMY_SLIDES: TutorialIntroSlide[] = [
  {
    id: 'readingACard',
    heading: 'Reading a Card',
    intro: 'Every card shares the same printed layout. Here it is on a real Character card:',
    content: {
      kind: 'cardAnatomy',
      callouts: [
        { field: 'baseCost', label: 'Cost', description: 'DON!! you must rest to play this card from your hand.', ruleRef: '2-7' },
        { field: 'basePower', label: 'Power', description: 'Battle strength. An attack succeeds when the attacker’s power is equal to or higher than the target’s.', ruleRef: '2-6' },
        { field: 'counter', label: 'Counter', description: 'Defensive value — discard this card from hand while being attacked to add it to the defender’s power.', ruleRef: '2-10' },
        { field: 'attributes', label: 'Attribute', description: 'Combat style icon (Slash, Strike, Ranged, Special, Wisdom). Some effects check it.', ruleRef: '2-5' },
        { field: 'types', label: 'Type', description: 'Crew or affiliation tags (e.g. "Straw Hat Crew") that card effects can reference.', ruleRef: '2-4' },
        { field: 'text', label: 'Effect Text', description: 'The card’s abilities, written out. Timing tags like [On Play] or [Counter] say when each one applies.', ruleRef: '2-8' },
      ],
    },
  },
  {
    id: 'cardCategories',
    heading: 'The Five Card Types',
    intro: 'Every card belongs to exactly one category:',
    content: {
      kind: 'cardCategories',
      categories: [
        { category: 'leader', label: 'Leader', description: 'Your captain — it starts in play, sets your Life total, and can attack every turn. You have exactly one.', ruleRef: '2-2-2 / 2-9' },
        { category: 'character', label: 'Character', description: 'Crew you play from hand by paying their DON!! cost. They attack and defend alongside your Leader.', ruleRef: '2-2-2' },
        { category: 'event', label: 'Event', description: 'A one-time effect. Resolve it, then the card goes to the trash.', ruleRef: '2-2-2' },
        { category: 'stage', label: 'Stage', description: 'A location that stays in play and provides an ongoing effect.', ruleRef: '2-2-2' },
        { category: 'don', label: 'DON!!', description: 'Your resource cards. Rest them to pay costs, or give them to a Leader/Character for +1000 power that turn.', ruleRef: '2-2-2 / 6-5-5' },
      ],
    },
  },
];

/**
 * Basic-rules slides. Rule citations cross-checked against the engine:
 * win/loss reasons mirror GameOverReason in engine/state/game.ts (1-2-1-1,
 * 9-2-1, 1-2-3); the phase list mirrors engine/rules/phases/* (6-2..6-6);
 * the battle outline mirrors the battle steps referenced throughout
 * engine (7-1-1..7-1-5).
 */
const BASIC_RULES_SLIDES: TutorialIntroSlide[] = [
  {
    id: 'winningAndLosing',
    heading: 'How You Win (and Lose)',
    content: {
      kind: 'rulePoints',
      points: [
        { heading: 'Life shields your Leader', body: 'Your Leader’s Life value deals out that many face-down Life cards. Each successful hit on your Leader sends one to your hand.', ruleRef: '2-9 / 7-1-4' },
        { heading: 'Defeat at zero Life', body: 'A player who takes Leader damage while they have no Life cards left loses the game.', ruleRef: '1-2-1-1' },
        { heading: 'Defeat by deck-out', body: 'A player who must draw from an empty deck also loses.', ruleRef: '9-2-1' },
      ],
    },
  },
  {
    id: 'turnStructure',
    heading: 'Turn Structure',
    intro: 'Each turn runs through five phases, always in this order:',
    content: {
      kind: 'phaseFlow',
      phases: [
        { name: 'Refresh', summary: 'Your rested cards and given DON!! return to active.', ruleRef: '6-2' },
        { name: 'Draw', summary: 'Draw 1 card (the player going first skips this on turn 1).', ruleRef: '6-3' },
        { name: 'DON!!', summary: 'Add 2 DON!! from your DON!! deck to your cost area (1 on the first turn).', ruleRef: '6-4' },
        { name: 'Main', summary: 'Play cards, give DON!!, and attack — the only phase where you make choices.', ruleRef: '6-5' },
        { name: 'End', summary: '"Until end of turn" effects expire and the turn passes over.', ruleRef: '6-6' },
      ],
    },
  },
  {
    id: 'battleBasics',
    heading: 'Battles in Brief',
    intro: 'An attack during your Main Phase runs through fixed steps:',
    content: {
      kind: 'rulePoints',
      points: [
        { heading: 'Declare', body: 'Rest your active Leader or Character and choose a target: the opponent’s Leader, or one of their RESTED Characters.', ruleRef: '7-1-1' },
        { heading: 'Block & Counter', body: 'The defender may redirect the attack with a [Blocker], then boost power with Counter cards from hand.', ruleRef: '7-1-2 / 7-1-3' },
        { heading: 'Damage', body: 'Attacker power ≥ defender power means the hit lands: Leaders lose a Life card, Characters are K.O.’d.', ruleRef: '7-1-4' },
      ],
    },
  },
];

export const INTRO_SLIDES: Record<TutorialIntroPanelKind, TutorialIntroSlide[]> = {
  cardAnatomy: CARD_ANATOMY_SLIDES,
  basicRules: BASIC_RULES_SLIDES,
};

/** Clamped lookup used by TutorialIntroPanel + TutorialManager — mirrors the dialogueHighlights fallback convention. */
export function introSlideAt(kind: TutorialIntroPanelKind, slideIndex: number): TutorialIntroSlide {
  const slides = INTRO_SLIDES[kind];
  return slides[Math.max(0, Math.min(slides.length - 1, slideIndex))];
}
