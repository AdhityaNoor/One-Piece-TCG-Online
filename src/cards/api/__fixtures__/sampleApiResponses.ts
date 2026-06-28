/**
 * Real OPTCG API responses captured live on 2026-06-28, trimmed to the
 * fields/rows needed to exercise the quirks documented in api/types.ts.
 * Used by normalization tests so regressions against the ACTUAL API shape
 * (not an idealized one) get caught — these are not hand-invented fixtures.
 */
import type { CardPrintingDto, DonCardDto } from '../types';

/** GET /api/sets/card/OP01-001/ — Leader, 2 printings (base + Parallel). */
export const sampleLeaderPrintings: CardPrintingDto[] = [
  {
    inventory_price: 4.0,
    market_price: 7.1,
    card_name: 'Roronoa Zoro (001)',
    set_name: 'Romance Dawn',
    card_text: '[DON!! x1] [Your Turn] All of your Characters gain +1000 power.',
    set_id: 'OP-01',
    rarity: 'L',
    card_set_id: 'OP01-001',
    card_color: 'Red',
    card_type: 'Leader',
    life: '5',
    card_cost: null,
    card_power: '5000',
    sub_types: 'Straw Hat Crew Supernovas',
    counter_amount: null,
    attribute: 'Slash',
    date_scraped: '2026-06-28',
    card_image_id: 'OP01-001',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-001.jpg',
  },
  {
    inventory_price: 169.0,
    market_price: 568.01,
    card_name: 'Roronoa Zoro (001) (Parallel)',
    set_name: 'Romance Dawn',
    card_text: '[DON!! x1] [Your Turn] All of your Characters gain +1000 power.',
    set_id: 'OP-01',
    rarity: 'L',
    card_set_id: 'OP01-001',
    card_color: 'Red',
    card_type: 'Leader',
    life: '5',
    card_cost: null,
    card_power: '5000',
    sub_types: 'Straw Hat Crew Supernovas',
    counter_amount: null,
    attribute: 'Slash',
    date_scraped: '2026-06-09',
    card_image_id: 'OP01-001_p1',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-001_p1.jpg',
  },
];

/**
 * GET /api/sets/card/OP01-016/ — Character, 4 printings. Note the SP
 * printing's card_text differs cosmetically from the base printing
 * ("Straw Hat Crew" type Character card" vs [Straw Hat Crew] type card") —
 * real API behavior, not a typo introduced here.
 */
export const sampleCharacterPrintings: CardPrintingDto[] = [
  {
    inventory_price: 2.0,
    market_price: 3.6,
    card_name: 'Nami',
    set_name: 'Romance Dawn',
    card_text:
      '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 "Straw Hat Crew" type Character card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.  This card has been officially errata\'d.',
    set_id: 'OP-01',
    rarity: 'R',
    card_set_id: 'OP01-016',
    card_color: 'Red',
    card_type: 'Character',
    life: null,
    card_cost: '1',
    card_power: '2000',
    sub_types: 'Straw Hat Crew',
    counter_amount: 2000,
    attribute: 'Special',
    date_scraped: '2026-06-25',
    card_image_id: 'OP01-016',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-016.jpg',
  },
  {
    inventory_price: 154.95,
    market_price: 377.4,
    card_name: 'Nami (Parallel)',
    set_name: 'Romance Dawn',
    card_text:
      '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 "Straw Hat Crew" type Character card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.  This card has been officially errata\'d.',
    set_id: 'OP-01',
    rarity: 'R',
    card_set_id: 'OP01-016',
    card_color: 'Red',
    card_type: 'Character',
    life: null,
    card_cost: '1',
    card_power: '2000',
    sub_types: 'Straw Hat Crew',
    counter_amount: 2000,
    attribute: 'Special',
    date_scraped: '2026-06-25',
    card_image_id: 'OP01-016_p1',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-016_p1.jpg',
  },
  {
    inventory_price: 214.99,
    market_price: 641.72,
    card_name: 'Nami (SP)',
    set_name: 'Awakening of the New Era',
    card_text:
      '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 [Straw Hat Crew] type card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.',
    set_id: 'OP-05',
    rarity: 'R',
    card_set_id: 'OP01-016',
    card_color: 'Red',
    card_type: 'Character',
    life: null,
    card_cost: '1',
    card_power: '2000',
    sub_types: 'Straw Hat Crew',
    counter_amount: 1000,
    attribute: 'Special',
    date_scraped: '2026-05-04',
    card_image_id: 'OP01-016_p2',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-016_p2.jpg',
  },
  {
    inventory_price: 1850.0,
    market_price: 2242.64,
    card_name: 'Nami (OP01-016) (Manga)',
    set_name: 'Premium Booster -The Best-',
    card_text:
      '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 "Straw Hat Crew" type Character card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.',
    set_id: 'PRB-01',
    rarity: 'R',
    card_set_id: 'OP01-016',
    card_color: 'Red',
    card_type: 'Character',
    life: null,
    card_cost: '1',
    card_power: '2000',
    sub_types: 'Straw Hat Crew',
    counter_amount: 2000,
    attribute: 'Special',
    date_scraped: '2026-06-25',
    card_image_id: 'OP01-016_p8',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-016_p8.jpg',
  },
];

/** GET /api/sets/card/OP01-119/ — Event with the multi-word sub_types ambiguity ("Animal Kingdom Pirates" + "The Four Emperors", no delimiter). */
export const sampleEventPrinting: CardPrintingDto = {
  inventory_price: 0.35,
  market_price: 0.57,
  card_name: 'Thunder Bagua',
  set_name: 'Romance Dawn',
  card_text:
    "[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 2 or less Life cards, add up to 1 DON!! card from your DON!! deck and rest it. [Trigger] Add up to 1 DON!! card from your DON!! deck and set it as active.  This card has been officially errata'd.",
  set_id: 'OP-01',
  rarity: 'R',
  card_set_id: 'OP01-119',
  card_color: 'Purple',
  card_type: 'Event',
  life: null,
  card_cost: '2',
  card_power: null,
  sub_types: 'Animal Kingdom Pirates The Four Emperors',
  counter_amount: null,
  attribute: null,
  date_scraped: '2026-06-28',
  card_image_id: 'OP01-119',
  card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-119.jpg',
};

/** One row from GET /api/promos/card/P-001/ with card_image: null — a real, non-error "missing asset" case the asset layer must handle. */
export const samplePromoPrintingWithMissingImage: CardPrintingDto = {
  inventory_price: 45.0,
  market_price: 93.78,
  card_name: 'Monkey.D.Luffy (Super Pre-Release) [Participant]',
  set_name: 'One Piece Promotion Cards',
  card_text: '[DON!! x2] This Character gains [Rush](This card can attack on the turn in which it is played.)',
  set_id: 'P',
  rarity: 'PR',
  card_set_id: 'P-001',
  card_color: 'Red',
  card_type: 'Character',
  life: null,
  card_cost: '6',
  card_power: '7000',
  sub_types: 'Straw Hat Crew Supernovas',
  counter_amount: 0,
  attribute: 'Strike',
  date_scraped: '2026-06-15',
  card_image_id: 'P-001_pr7',
  card_image: null,
};

/** One row from GET /api/allDonCards/. */
export const sampleDonCard: DonCardDto = {
  inventory_price: 0.25,
  market_price: 0.49,
  card_name: 'DON!! Card (Egghead)',
  card_text: 'Your Turn +1000',
  rarity: 'DON!!',
  card_type: 'DON!!',
  don_id: null,
  date_scraped: '2026-06-15',
  card_image_id: 'don_166',
  card_image: 'https://optcgapi.com/media/static/Card_Images/DON_Card_Egghead.jpg',
  optcg_don_name: 'DON!! Card (Egghead)',
};
