/**
 * Reviewed effect template assignments — Starter Deck ST13 (Sabo/Ace/Luffy, red/yellow).
 *
 * A Life-matters deck. Most cards manipulate the Life area in ways that are still being built out
 * (reorder-all-Life, reveal-top-Life-then-play, add-hand/deck-to-Life-face-up). This file covers the
 * subset expressible with existing abstractions; the Life-reorder / reveal-and-play-from-Life family
 * is DEFERRED (ST13-001..007, 009, 010, 012, 014, 016 and the Life riders on the events).
 *
 * PARTIAL: ST13-017 / ST13-018 [Counter] — the power boost is implemented; the "Then, reorder all your
 *   Life" / "if 0 Life draw 1" rider and the Life-swap [Trigger] are deferred.
 */
import type { CardEffectAssignment } from '../assembler';

const SEARCH_BROTHERS = {
  fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand',
  filter: { anyOf: [{ name: 'Sabo' }, { name: 'Portgas.D.Ace' }, { name: 'Monkey.D.Luffy' }], maxCost: 5 },
} as const;

export const ST13_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST13-008 Sabo — [On Play] You may trash 1 from the top/bottom of your Life: K.O. up to 1 opponent Character cost <=5.
  {
    cardNumber: 'ST13-008',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'trash', player: 'owner' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, ifPrevious: 'previousMovedAny', optional: true }] },
  },

  // ST13-011 Ace — [On Play] If you have 2 or less Life cards, this Character gains [Rush].
  {
    cardNumber: 'ST13-011',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] },
  },

  // ST13-013 — [On Play] Look at 5; add [Sabo]/[Ace]/[Luffy] with cost 5 or less to hand.
  { cardNumber: 'ST13-013', templateId: 'ability', params: { timing: 'onPlay', functions: [SEARCH_BROTHERS] } },

  // ST13-017 (event) Flame Dragon King — [Counter] Up to 1 of your Leader/Character +4000 this battle. (Life reorder + Trigger deferred.)
  {
    cardNumber: 'ST13-017',
    templateId: 'ability',
    params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] },
  },

  // ST13-018 (event) Gum-Gum Jet Spear — [Counter] Up to 1 of your Leader/Character +2000 this battle. (0-Life draw + Trigger deferred.)
  {
    cardNumber: 'ST13-018',
    templateId: 'ability',
    params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] },
  },

  // ST13-019 (event) The Three Brothers' Bond — [Main] Look at 5; add [Sabo]/[Ace]/[Luffy] cost <=5 to hand.
  //   [Trigger] Activate this card's [Main] effect.
  {
    cardNumber: 'ST13-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [SEARCH_BROTHERS] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [SEARCH_BROTHERS] } },
    ],
  },
];
