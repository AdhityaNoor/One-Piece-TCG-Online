/**
 * Reviewed effect template assignments - Premium Booster (PRB) sets.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const PRB_ASSIGNMENTS: CardEffectAssignment[] = [

  // PRB02-003 — [Blocker] [On Play] trash 1 Character with 6000+ power from hand: draw 2.
  { cardNumber: 'PRB02-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', minPower: 6000 }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }] } },

  // PRB01-001 (leader) Sanji —
  //   [Activate: Main] [Once Per Turn] Up to 1 of your Characters without an [On Play] effect and with a
  //   cost of 8 or less gains [Rush] during this turn. (This card can attack on the turn in which it is
  //   played.)
  // NOTE: not yet implemented (needs template).

  // PRB02-001 (character) Koby —
  //   [Opponent's Turn] If your Leader has the {Navy} type, this Character gains +1000 power.[When
  //   Attacking] K.O. up to 1 of your opponent's Characters with 3000 base power or less. Then, if you have
  //   6 or less cards in your hand, draw 1 card.
  // NOTE: not yet implemented (needs template).

  // PRB02-002 (character) Trafalgar Law —
  //   [Once Per Turn] If this Character would be removed from the field by your opponent's effect, you may
  //   give this Character −2000 power during this turn instead.[When Attacking] Give up to 1 of your
  //   opponent's Characters −2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // PRB02-003 (character) Lucky.Roux —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] You may trash 1 Character card with 6000 power or more from your hand: Draw
  //   2 cards.
  // NOTE: not yet implemented (needs template).

  // PRB02-004 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] Set up to 1 of your DON!! cards as active.
  { cardNumber: 'PRB02-004', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // PRB02-005 (character) Monkey.D.Luffy —
  //   [Your Turn] [On Play] If your Leader is multicolored and your opponent has 7 or less DON!! cards on
  //   their field, your opponent rests 1 of their active DON!! cards at the start of their next Main Phase.
  // NOTE: not yet implemented (needs template).

  // PRB02-006 (character) Roronoa Zoro —
  //   [Opponent's Turn] If this Character would be rested by your opponent's Character's effect, you may
  //   rest 1 of your other Characters instead.[Blocker]
  // NOTE: not yet implemented (needs template).

  // PRB02-007 (character) Jinbe —
  //   [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {The Seven Warlords of the Sea}
  //   type card other than [Jinbe] and add it to your hand. Then, place the rest at the bottom of your deck
  //   in any order.[When Attacking] Place up to 1 Character with a cost of 1 or less at the bottom of the
  //   owner's deck.
  // NOTE: not yet implemented (needs template).

  // PRB02-009 (character) Mr.3(Galdino) —
  //   This effect can be activated when this Character is rested by your opponent's effect. You may trash
  //   this Character and draw 2 cards.[Blocker]
  // NOTE: not yet implemented (needs template).

  // PRB02-010 (character) Charlotte Pudding —
  //   [On Play] DON!! −2: If your Leader has the {Big Mom Pirates} type and your opponent has 6 or more
  //   DON!! cards on their field, draw 2 cards. Then, play up to 1 {Big Mom Pirates} type Character card
  //   with 6000 to 8000 power from your hand.
  // NOTE: not yet implemented (needs template).

  // PRB02-012 (character) Nami —
  //   [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card other
  //   than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.
  //   [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // PRB02-013 (character) Gecko Moria —
  //   [On Play] If your Leader has the {Thriller Bark Pirates} type, play up to 1 Character card with a
  //   cost of 4 or less from your trash rested. Then, give up to 1 rested DON!! card to your Leader or 1 of
  //   your Characters.
  // NOTE: not yet implemented (needs template).

  // PRB02-014 (character) Sabo —
  //   If you have 15 or more cards in your trash, give this card in your hand −3 cost.[Blocker] (After your
  //   opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // PRB02-015 (character) Shiryu —
  //   If your Leader has the {Blackbeard Pirates} type, this Character gains [Blocker] and +4 cost.[On
  //   K.O.] If your Leader has the {Blackbeard Pirates} type, K.O. up to 1 of your opponent's Characters
  //   with a base cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // PRB02-016 (character) Otama —
  //   [Activate: Main] You may rest this Character and add 1 card from the top or bottom of your Life cards
  //   to your hand: Up to 1 of your Leader or Character cards gains +3000 power during this turn. [Trigger]
  //   Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // PRB02-017 (character) Boa Hancock —
  //   [On Play] You may trash 1 card with a [Trigger] from your hand: Your opponent's rested Leader or up
  //   to 1 of your opponent's Characters other than [Monkey.D.Luffy] cannot attack until the end of your
  //   opponent's next End Phase. [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or
  //   less.
  // NOTE: not yet implemented (needs template).

  // PRB02-018 (character) Portgas.D.Ace —
  //   [On Play] If you have a face-up Life card, play up to 1 [Sabo], [Portgas.D.Ace], or [Monkey.D.Luffy]
  //   with a cost of 2 from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // --- codegen batch ---
  { cardNumber: 'PRB02-008', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 2 }] } },

  { cardNumber: 'PRB02-011', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

];
