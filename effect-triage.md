# Effect triage worklist

Sets: EB01, EB02, EB03, EB04, OP01, OP02, OP03, OP04, OP05, OP06, OP07, OP08, OP09, OP10, OP11, OP12, OP13, OP14, OP15, OP16, P, PRB01, PRB02, ST01, ST02, ST03, ST04, ST05, ST06, ST07, ST08, ST09, ST10, ST11, ST12, ST13, ST14, ST15, ST16, ST17, ST18, ST19, ST20, ST21, ST22, ST23, ST24, ST25, ST26, ST27, ST28, ST29, ST30 · needsTemplate cards analyzed: 1650

| Bucket | Cards | Meaning |
| --- | ---: | --- |
| expressible | 1165 | maps to existing primitives - curate now |
| needsPrimitive | 255 | one small addition unlocks it |
| defer | 230 | needs real new engine capability |

## By set

| Set | expressible | needsPrimitive | defer |
| --- | ---: | ---: | ---: |
| EB01 | 29 | 8 | 3 |
| EB02 | 40 | 4 | 5 |
| EB03 | 44 | 4 | 8 |
| EB04 | 37 | 9 | 12 |
| OP01 | 21 | 8 | 9 |
| OP02 | 23 | 10 | 7 |
| OP03 | 55 | 15 | 4 |
| OP04 | 71 | 13 | 14 |
| OP05 | 67 | 12 | 9 |
| OP06 | 23 | 22 | 22 |
| OP07 | 52 | 9 | 6 |
| OP08 | 44 | 12 | 13 |
| OP09 | 47 | 15 | 11 |
| OP10 | 67 | 7 | 5 |
| OP11 | 53 | 5 | 17 |
| OP12 | 67 | 9 | 12 |
| OP13 | 78 | 12 | 9 |
| OP14 | 77 | 15 | 16 |
| OP15 | 77 | 15 | 15 |
| OP16 | 77 | 14 | 11 |
| P | 13 | 6 | 4 |
| PRB01 | 1 | 0 | 0 |
| PRB02 | 12 | 5 | 1 |
| ST01 | 0 | 0 | 0 |
| ST02 | 0 | 0 | 0 |
| ST03 | 0 | 0 | 0 |
| ST04 | 0 | 0 | 0 |
| ST05 | 0 | 0 | 0 |
| ST06 | 0 | 0 | 0 |
| ST07 | 0 | 0 | 0 |
| ST08 | 0 | 0 | 0 |
| ST09 | 0 | 2 | 0 |
| ST10 | 1 | 1 | 4 |
| ST11 | 1 | 0 | 0 |
| ST12 | 1 | 0 | 0 |
| ST13 | 5 | 5 | 3 |
| ST14 | 1 | 0 | 0 |
| ST15 | 4 | 1 | 0 |
| ST16 | 2 | 2 | 1 |
| ST17 | 5 | 0 | 0 |
| ST18 | 4 | 0 | 0 |
| ST19 | 3 | 1 | 1 |
| ST20 | 5 | 0 | 0 |
| ST21 | 10 | 2 | 0 |
| ST22 | 9 | 0 | 2 |
| ST23 | 2 | 1 | 1 |
| ST24 | 3 | 0 | 2 |
| ST25 | 5 | 0 | 0 |
| ST26 | 3 | 1 | 1 |
| ST27 | 3 | 1 | 1 |
| ST28 | 4 | 1 | 0 |
| ST29 | 10 | 3 | 1 |
| ST30 | 9 | 5 | 0 |

## Top blocking reasons

- `unmatched-clause` — 190
- `delayed-effect` — 88
- `attack-restriction` — 49
- `dynamic-scaling` — 28
- `custom-trigger` — 23
- `opp-deck-manip` — 20
- `static-conditional-no-timing` — 18
- `play-from-hand-or-trash` — 14
- `negate-effect` — 14
- `cost-eq-life` — 12
- `variable-count` — 11
- `look-and-play` — 9
- `top-or-bottom-life` — 7
- `power-based-gate` — 6
- `ko-own-as-cost` — 5
- `hand-reset` — 4
- `attribute-target` — 4
- `same-power-as` — 4
- `rest-named-cost` — 3
- `mixed-char-or-don` — 3
- `place-stage-cost` — 3
- `direct-damage` — 2
- `place-self-bottom-cost` — 2
- `rest-all` — 1

## Expressible now (curate these) (1165)

| Card | Name | Cat | Reasons | Text |
| --- | --- | --- | --- | --- |
| EB01-001 | Kouzuki Oden | leader | power-buff | All of your {Land of Wano} type Character cards without a Counter have a +1000 Counter, according to the rules.[DON!! x1] [When Attacking] If you have a {Land o |
| EB01-002 | Izo | character | power-buff,trash-hand,give-don | [On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.[On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: |
| EB01-004 | Koza | character | power-buff | [When Attacking] You may give your 1 active Leader −5000 power during this turn: Give up to 1 of your opponent's Characters −3000 power during this turn. |
| EB01-010 | There's No Way You Could Defeat Me!! | event | ko | [Counter] K.O. up to 1 of your opponent's Characters with 6000 base power or less. [Trigger] K.O. up to 1 of your opponent's Characters with 5000 base power or  |
| EB01-011 | Mini-Merry | stage | draw,move-bottom-deck | [Activate: Main] You may rest this card and place 1 of your Characters with 1000 base power at the bottom of your deck: Draw 1 card. |
| EB01-012 | Cavendish | character | set-active | [On Play]/[When Attacking] If your Leader has the {Supernovas} type and you have no other [Cavendish] Characters, set up to 2 of your DON!! cards as active. |
| EB01-013 | Kouzuki Hiyori | character | draw,play-from | [Activate: Main] You may trash this Character: Play up to 1 {Land of Wano} type Character card with a cost of 5 or less other than [Kouzuki Hiyori] from your ha |
| EB01-020 | Chambres | event | play-from,return-hand | [Main] If your Leader has the {Supernovas} type, return 1 of your Characters to the owner's hand, and play up to 1 Character card with a cost of 2 or less from  |
| EB01-021 | Hannyabal | leader | return-hand | [End of Your Turn] You may return 1 of your {Impel Down} type Characters with a cost of 2 or more to the owner's hand: Add up to 1 DON!! card from your DON!! de |
| EB01-022 | Inazuma | character | draw | [End of Your Turn] If you have 2 or less cards in your hand, draw 2 cards. |
| EB01-029 | Sorry. I'm a Goner. | event | move-bottom-deck,return-hand | [Counter] Reveal 1 card from the top of your deck. If the revealed card has a cost of 4 or more, return up to 1 of your Characters to the owner's hand. Then, pl |
| EB01-030 | Loguetown | stage | draw,move-bottom-deck | [Activate: Main] You may place this card and 1 card from your hand at the bottom of your deck in any order: Draw 2 cards. [Trigger] Play this card. |
| EB01-031 | Kalifa | character | don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {Water Seven} type, add up t |
| EB01-034 | Ms. Wednesday | character | don-minus | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Your Opponent's Attack] [Once Per Turn] D |
| EB01-035 | Ms. Monday | character | power-buff,don-minus | [On Play] If your Leader's type includes "Baroque Works", up to 1 of your Leader or Character cards gains +1000 power during this turn. [Trigger] DON!! −1 (You  |
| EB01-037 | Mr. 9 | character | ko,don-minus | [On Your Opponent's Attack] [Once Per Turn] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): K.O. up to 1 of y |
| EB01-038 | Oh Come My Way | event | draw,don-minus | [Counter] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader's type includes "Baroque Works", sel |
| EB01-040 | Kyros | leader | ko | [Activate: Main] [Once Per Turn] You may turn 1 card from the top of your Life cards face-up: K.O. up to 1 of your opponent's Characters with a cost of 0. |
| EB01-042 | Scarlet | character | play-from | [Activate: Main] You may trash this Character: Play up to 1 {Dressrosa} type Character card with a cost of 3 or less other than [Scarlet] from your hand rested. |
| EB01-043 | Spandine | character | play-from,move-bottom-deck | [On Play] You may place 3 cards with a type including "CP" from your trash at the bottom of your deck in any order: Play up to 1 Character card with a type incl |
| EB01-044 | Funkfreed | character | power-buff | [Activate: Main] You may rest this Character: Up to 1 of your [Spandam] Characters gains +3000 power during this turn. |
| EB01-045 | Brook | character | keyword | [On Play] If your opponent has a Character with a cost of 0, this Character gains [Rush] during this turn.(This card can attack on the turn in which it is playe |
| EB01-047 | Laboon | character | draw,trash-hand | [Once Per Turn] When a Character is K.O.'d, draw 1 card and trash 1 card from your hand. |
| EB01-051 | Finger Pistol | event | ko,trash-top | [Main] You may trash 2 cards from the top of your deck: K.O. up to 1 of your opponent's Characters with a cost of 5 or less. [Trigger] Activate this card's [Mai |
| EB01-052 | Viola | character | choose-one | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Choose one:• Look at all of your op |
| EB01-053 | Gastino | character | power-buff | [On Play] Place up to 1 of your opponent's Characters with a cost of 3 or less at the top or bottom of your opponent's Life cards face-up. [Trigger] Give up to  |
| EB01-056 | Charlotte Flampe | character | draw | [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Draw 1 card. |
| EB01-058 | Mont Blanc Cricket | character | power-buff | [DON!! x1] [Your Turn] If you have 2 or less Life cards, this Character gains +2000 power. |
| EB01-059 | Kingdom Come | event | ko | [Main] K.O. up to 1 of your opponent's Characters. Then, trash cards from the top of your Life cards until you have 1 Life card. [Trigger] K.O. up to 1 of your  |
| EB02-002 | Sabo | character | power-buff | [Activate: Main] You may rest this Character: Up to 1 of your {Revolutionary Army} type Characters other than [Sabo] gains +2000 power during this turn. |
| EB02-003 | Tony Tony.Chopper | character | power-buff,give-don | [DON!! x2] [Opponent's Turn] This Character gains +2000 power.[On Play] If your Leader has the {Straw Hat Crew} type, give up to 1 rested DON!! card to your Lea |
| EB02-005 | Fake Straw Hat Crew | character | power-buff | [Your Turn] This Character gains +2000 power.[Opponent's Turn] Give this Character −2000 power. |
| EB02-006 | Yamato | character | keyword,give-don | [Activate: Main] [Once Per Turn] If your Leader has the {Land of Wano} type or is [Portgas.D.Ace], give up to 1 rested DON!! card to 1 of your Leader. Then, thi |
| EB02-008 | The Peak | event | search,move-bottom-deck | [Main] Look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 4 or more and add it to your hand. Then, place the rest at the bottom of yo |
| EB02-012 | Gaimon | character | keyword | If you have a [Sarfunkel], this Character gains [Blocker]. |
| EB02-013 | Carrot | character | search,play-from,move-bottom-deck | [On Play] If you have 3 or more DON!! cards on your field, look at 7 cards from the top of your deck; reveal up to 1 [Zou] and add it to your hand. Then, place  |
| EB02-016 | Chopperman | character | play-from | Also treat this card's name as [Tony Tony.Chopper] according to the rules.[On Play] Play up to 1 {Animal} type Character card with a cost of 3 or less from your |
| EB02-018 | Buggy | character | rest,keyword | [On Play] If you have no other [Buggy] Characters, up to 1 of your Leader gains [Double Attack] during this turn. [Trigger] Rest up to 1 of your opponent's Char |
| EB02-019 | Roronoa Zoro | character | rest | If your opponent has 2 or more Characters, this Character can attack Characters on the turn in which it is played.[On Play] If your Leader has the {Straw Hat Cr |
| EB02-020 | We Are! | event | search,move-bottom-deck | [Main] Look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 4 or more and add it to your hand. Then, place the rest at the bottom of yo |
| EB02-021 | Gum-Gum Giant Pistol | event | rest,power-buff | [Main] Up to 1 of your {Straw Hat Crew} type Characters gains +6000 power during this turn. Then, the selected Character will not become active in your next Ref |
| EB02-022 | Usopp | character | play-from | [On Play] If you have 2 or less Characters with 5000 power or more, play up to 1 Character card with 6000 power or less and no base effect from your hand. |
| EB02-023 | Crocodile | character | search | [Your Turn] [Once Per Turn] When your opponent's Character is returned to the owner's hand by your effect, look at 3 cards from the top of your deck and place t |
| EB02-024 | Sogeking | character | draw,move-bottom-deck,return-hand | Also treat this card's name as [Usopp] according to the rules.[On Play] Draw 2 cards and place 2 cards from your hand at the bottom of your deck in any order. T |
| EB02-025 | Donquixote Rosinante | character | search,play-from,move-bottom-deck | [Activate: Main] You may rest 1 of your DON!! cards and this Character: If your Leader is [Donquixote Rosinante], look at 5 cards from the top of your deck; pla |
| EB02-027 | Vista | character | move-bottom-deck | [On Play] Place up to 1 of your opponent's Characters with 1000 power or less at the bottom of the owner's deck. |
| EB02-028 | Portgas.D.Ace | character | search,play-from,move-bottom-deck | [On Play] If your Leader's type includes "Whitebeard Pirates", look at 5 cards from the top of your deck; reveal up to 1 Character card with a cost of 2 and add |
| EB02-030 | And That's When Somebody Makes Fun of Their Friend's Dream!!!! | event | draw,trash-hand | [Counter] If any of your Characters would be K.O.'d in battle during this turn, you may trash 1 card from your hand instead. [Trigger] Draw 1 card. |
| EB02-031 | Hope | event | search,move-bottom-deck | [Main] Look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 4 or more and add it to your hand. Then, place the rest at the bottom of yo |
| EB02-032 | Iceburg | character | search,play-from,move-bottom-deck | [On Play] If you have 3 or more DON!! cards on your field, look at 7 cards from the top of your deck; reveal up to 1 [Galley-La Company] and add it to your hand |
| EB02-033 | Klabautermann | character | keyword | If you have [Merry Go] on your field, this Character gains [Blocker]. |
| EB02-035 | Sanji & Pudding | character | draw | [Your Turn] [Once Per Turn] When 2 or more DON!! cards on your field are returned to your DON!! deck, add up to 1 DON!! card from your DON!! deck and set it as  |
| EB02-036 | Nico Robin | character | search,move-bottom-deck,don-minus | [Blocker][On K.O.] DON!! −1: Look at 3 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add it to your hand. Then, place the rest  |
| EB02-038 | Magellan | character | play-from | [On Play] Play up to 1 {Impel Down} type Character card with a cost of 2 or less from your hand. |
| EB02-039 | GERMA 66 | event | play-from | [Main] You may trash 1 {GERMA 66} type Character card with 4000 power or less from your hand: If the number of DON!! cards on your field is equal to or less tha |
| EB02-040 | BRAND NEW WORLD | event | search,move-bottom-deck | [Main] Look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 4 or more and add it to your hand. Then, place the rest at the bottom of yo |
| EB02-044 | Sengoku | character | play-from | [Blocker][On Play] Play up to 1 black {Navy} type Character card with a cost of 4 or less from your trash rested. |
| EB02-045 | Trafalgar Law | character | draw,move-bottom-deck,choose-one | [Blocker][On Play] You may place 2 cards from your trash at the bottom of your deck in any order: Choose one:• Draw 1 card.• If your opponent has 5 or more card |
| EB02-047 | Blueno | character | play-from,trash-hand | [Activate: Main] You may trash 1 card from your hand and trash this Character: Play up to 1 Character card with a type including "CP" and a cost of 5 or less ot |
| EB02-048 | Brook | character | play-from | [On Play] Add up to 1 [Laboon] from your trash to your hand.[On K.O.] Play up to 1 [Laboon] with a cost of 4 or less from your hand. |
| EB02-049 | Monkey.D.Garp | character | ko,give-don | [On Play] Give up to 2 rested DON!! cards to 1 of your Leader.[Activate: Main] You may rest this Character: If your Leader is [Monkey.D.Garp], K.O. up to 1 of y |
| EB02-050 | Kokoro no Chizu | event | search,move-bottom-deck | [Main] Look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 4 or more and add it to your hand. Then, place the rest at the bottom of yo |
| EB02-051 | Three-Pace Hum Soul Notch Slash | event | ko,choose-one | [Main] Choose one:• K.O. up to 1 of your opponent's Characters with a cost of 2 or less.• Give up to 1 of your opponent's Characters −4 cost during this turn. |
| EB02-052 | Enel | character | power-buff,keyword,trash-hand | If your Leader has the {Sky Island} type, this Character gains [Rush].[When Attacking] You may trash 1 card from your hand: If you have 1 or less Life cards, ad |
| EB02-053 | Myskina Olga | character | peek-life | [On Play]/[On K.O.] Look at up to 1 card from the top of your or your opponent's Life cards and place it at the top or bottom of the Life cards. |
| EB02-056 | Vegapunk | character | draw,search,play-from,move-bottom-deck,trash-hand | [Blocker][On Play] Look at 5 cards from the top of your deck; play up to 1 {Scientist} type Character card with a cost of 5 or less other than [Vegapunk]. Then, |
| EB02-058 | UUUUUS! | event | search,move-bottom-deck | [Main] Look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 4 or more and add it to your hand. Then, place the rest at the bottom of yo |
| EB02-059 | Without Your Help I Can't Become the King of the Pirates!!!! | event | power-buff,play-from | [Counter] Up to 1 of your Leader or Character cards gains +1000 power during this battle. Then, if you have 1 or less Life cards, play up to 1 of your yellow {S |
| EB02-061 | Monkey.D.Luffy | character | keyword,add-life-to-hand,set-active | If your Leader is multicolored and your opponent has 5 or more DON!! cards on their field, this Character gains [Rush].[When Attacking] [Once Per Turn] You may  |
| EB03-001 | Nefeltari Vivi | leader | power-buff,keyword,trash-hand | [Once Per Turn] If your Character with a base cost of 4 or more would be K.O.'d, you may trash 1 card from your hand instead.[Activate: Main] You may rest this  |
| EB03-003 | Uta | character | draw,play-from | [On Play] If your Leader is [Uta], draw 2 cards. Then, play up to 1 Character card with 6000 power or less and no base effect from your hand. |
| EB03-004 | Carina | character | power-buff | [Blocker][Opponent's Turn] If your Leader is multicolored and you have no Characters with 6000 base power or more, this Character gains +4000 power. |
| EB03-005 | Sugar | character | play-from | [On Play] If your Leader is [Sugar], play up to 1 {Donquixote Pirates} type Character card with 6000 power or less from your hand rested. |
| EB03-006 | Nami | character | draw,power-buff | [On Play] You may give your active Leader −5000 power during this turn: Draw 1 card.[Activate: Main] [Once Per Turn] If your Leader has the {Alabasta} type, giv |
| EB03-007 | Baccarat | character | play-from | [Blocker][On K.O.] Play up to 1 Character card with 6000 power or less and no base effect from your hand. |
| EB03-009 | Makino | character | power-buff | [Activate: Main] You may rest this Character: Up to 1 of your Characters with no base effect gains +2000 power during this turn. |
| EB03-011 | But If We Ever See Each Other Again... Will You Call Me Your Shipmate?!! | event | power-buff | [Counter] If your Leader is [Nefeltari Vivi], up to 1 of your Leader or Character cards gains +4000 power during this battle. [Trigger] Give up to 1 of your opp |
| EB03-012 | Otama | character | rest | [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's DON!! cards or {Animal} or {SMILE} type Characters with a cost of 3 or less. |
| EB03-013 | Carrot | character | ko,play-from | [Activate: Main] [Once Per Turn] If this Character was played on this turn, K.O. up to 1 of your opponent's rested Characters with a cost of 5 or less. Then, pl |
| EB03-014 | Kuina | character | give-don | [Activate: Main] You may rest this Character: Give up to 2 rested DON!! cards to your <Slash> attribute Leader. |
| EB03-015 | Camie | character | rest,give-don | [Activate: Main] You may rest this Character: Give up to 1 rested DON!! card to 1 of your {Fish-Man} or {Merfolk} type Leader or Character cards. Then, rest up  |
| EB03-016 | Kouzuki Hiyori | character | draw,give-don | [On Play] If your Leader is [Kouzuki Oden], draw 1 card.[Activate: Main] You may trash this Character: Give up to 1 rested DON!! card to your {Land of Wano} typ |
| EB03-018 | Tashigi | character | keyword,trash-hand,set-active,ko-immunity | [Opponent's Turn] This Character cannot be K.O.'d by your opponent's effects and gains [Blocker].[End of Your Turn] You may rest 1 of your DON!! cards and trash |
| EB03-021 | Alvida | character | move-bottom-deck,trash-hand | [On Play] You may trash 1 card from your hand: Place up to 1 of your opponent's Characters with 4000 base power or less and up to 1 Character with a base cost o |
| EB03-022 | Isuka | character | move-bottom-deck | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Place up to 1 Character with a cost |
| EB03-023 | Kaya | character | search | [On Play] Look at 5 cards from the top of your deck and place them at the top or bottom of the deck in any order. |
| EB03-024 | Nefeltari Vivi | character | play-from | [Blocker][On Play] Play up to 1 {Alabasta} or {Straw Hat Crew} type Character card with a cost of 5 or less from your hand. Then, you cannot play any Character  |
| EB03-025 | Hina | character | trash-hand,return-hand | [On Play] You may trash 1 card from your hand: Return up to 1 Character with 6000 base power to the owner's hand. |
| EB03-027 | Marguerite | character | return-hand | [On Play] Return up to 1 Character with 7000 base power to the owner's hand. |
| EB03-028 | Yu | character | draw,trash-hand | [On Play] Trash 1 card from your hand.[Activate: Main] You may trash this Character: If you have 4 or less cards in your hand, draw 2 cards. |
| EB03-029 | Insolent Fool!! Stand Down!! | event | power-buff,play-from | [Main] You may rest 4 of your DON!! cards: If your Leader is [Boa Hancock], play up to 1 {Amazon Lily} or {Kuja Pirates} type Character card with a cost of 6 or |
| EB03-031 | Vinsmoke Reiju | character | don-minus | [Your Turn] [On Play] DON!! −1: If your Leader is [Sanji], activate the [Main] effect of up to 1 Event card with a cost of 7 or less in your trash. |
| EB03-032 | Charlotte Flampe | character | power-buff | [Your Turn] [On Play] Up to 1 of your [Charlotte Katakuri] cards gains +2000 power during this turn. |
| EB03-034 | Charlotte Linlin | character | draw,don-minus | [On Play] Draw 1 card and place 1 card from your hand at the top of your deck. Then, add up to 1 DON!! card from your DON!! deck and set it as active.[On K.O.]  |
| EB03-036 | Baby 5 | character | ko,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): K.O. up to 2 of your opponent's Characters with a b |
| EB03-038 | Thanks for the Treat. ♡ | event | power-buff | [Main] You may rest 1 of your DON!! cards: If the number of DON!! cards on your field is equal to or less than the number on your opponent's field and you only  |
| EB03-039 | Ulti | character | draw,play-from,trash-hand | [On Play] If your Leader has the {Animal Kingdom Pirates} type, draw 1 card and trash 1 card from your hand. Then, play up to 1 Character card with 6000 power o |
| EB03-041 | Kujyaku | character | draw | [Opponent's Turn] All of your {SWORD} type Characters with a cost of 6 or less gain +2000 power.[On Play] You may trash 1 {Navy} type card from your hand: Draw  |
| EB03-043 | Stussy | character | ko,move-bottom-deck | [Blocker][On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of your deck in any order: K.O. up to 1 of your opponent's Cha |
| EB03-044 | Black Maria | character | keyword,search,play-from,move-bottom-deck | If your Leader is multicolored, this Character gains [Blocker].[On Play] Look at 5 cards from the top of your deck; reveal up to 1 [Onigashima Island] and add i |
| EB03-045 | Perona | character | play-from,give-don | [Blocker][On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters. Then, if you have 10 or more cards in your trash, play up to 1 {Thrill |
| EB03-046 | Miss Doublefinger(Zala) | character | draw,trash-top | [On Play] If there is a Character with a cost of 0 or with a cost of 8 or more, draw 1 card.[On K.O.] Trash 2 cards from the top of your deck. |
| EB03-048 | Rebecca | character | search,play-from,move-bottom-deck | [Blocker][On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Dressrosa} type Stage card and add it to your hand. Then, place the rest at the bo |
| EB03-050 | Conis | character | keyword | [On Play] Up to 1 of your {Sky Island} type Characters gains [Double Attack] during this turn.(This card deals 2 damage.) |
| EB03-051 | Charlotte Smoothie | character | ko | [On Play] If you have a face-up Life card, K.O. up to 1 of your opponent's Characters with a cost of 2 or less. Then, turn all of your Life cards face-down. |
| EB03-053 | Nami | character | play-from,give-don | [On Play] Give up to 1 rested DON!! card to your Leader. Then, if your opponent has 3 or more Life cards, add up to 1 card from the top of your opponent's Life  |
| EB03-054 | Nico Robin | character | trash-hand | [On Play] You may trash 1 card from the top of your Life cards: Add up to 1 card from the top of your deck to the top of your Life cards. [Trigger] You may tras |
| EB03-056 | Belo Betty | character | ko | [On Play] You may turn 1 card from the top of your Life cards face-up: K.O. up to 1 of your opponent's Characters with a base cost of 3 or less. |
| EB03-057 | Yamato | character | give-don | [On Play] Give up to 3 rested DON!! cards to your {Land of Wano} type Leader.[On K.O.] Trash up to 1 card from the top of your opponent's Life cards. |
| EB03-058 | Lilith | character | draw | [Your Turn] [On Play] If you have 2 or less Life cards, draw 1 card. [Trigger] If your Leader is [Vegapunk], play this card. |
| EB03-060 | Will You Be My Servant? | event | search,move-bottom-deck | [Main] If your Leader is [Nami], look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 2 to 8 and add it to your hand. Then, place the r |
| EB03-061 | Uta | character | rest,set-active | [Activate: Main] [Once Per Turn] Set up to 1 of your DON!! cards as active. Then, rest up to 1 of your opponent's DON!! cards or Characters with a cost of 4 or  |
| EB03-062 | Trafalgar Law | character | play-from,trash-hand | [Rush][Activate: Main] You may trash 1 card from your hand and trash this Character: Add up to 1 card from the top of your deck to the top of your Life cards. T |
| EB04-001 | Jewelry Bonney | leader | power-buff,add-life-to-hand | [Opponent's Turn] If you have 1 or less Life cards, this Leader gains +2000 power.[Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters −1 |
| EB04-008 | Distorted Future | event | power-buff | [Main] If you have 2 or less Life cards, give up to 1 of your opponent's Characters −3000 power during this turn.[Counter] Your Leader gains +3000 power during  |
| EB04-009 | It's My Student's Farewell. I Want It to Be Proper. | event | power-buff | [Main] You may give 1 active DON!! card to 1 of your [Silvers Rayleigh]: Give up to 1 of your opponent's Characters −2000 power during this turn.[Counter] Up to |
| EB04-013 | Carrot | character | set-active | [On Play] If your Leader has the {Minks} type, set up to 2 of your {Minks} type Characters and your Leader as active. |
| EB04-014 | Kozuki Sukiyaki | character | give-don | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Activate: Main] [Once Per Turn] Give up to 1 |
| EB04-015 | Jinbe | character | play-from | [Blocker][On K.O.] You may rest 1 of your cards: If your Leader has the {Fish-Man} or {Merfolk} type, play up to 1 green Character card with a cost of 6 or less |
| EB04-016 | Bird Neptunian | character | rest,set-active | [Activate: Main] Set up to 1 of your DON!! cards as active. Then, you cannot set DON!! cards as active using Character effects during this turn.[When Attacking] |
| EB04-017 | Mystoms | character | play-from | [Your Turn] If you have 3 or more {Minks} type Characters, give all of your opponent's Characters −1 cost.[On Play] If your Leader has the {Minks} type, play up |
| EB04-018 | Megalo | character | ko | [On Play] You may rest this Character: K.O. up to 1 of your opponent's rested Characters with 8000 power or less. |
| EB04-019 | Eleclaw | event | power-buff | [Main] You may rest 1 of your cards: If your Leader has the {Minks} type, give up to 1 of your opponent's Characters −3 cost during this turn.[Counter] Up to 1  |
| EB04-020 | Shark Brick Fist | event | rest,power-buff,set-active | [Counter] Up to 1 of your {Fish-Man} type Leader or Character cards gains +3000 power during this battle. Then, set up to 1 of your {Fish-Man} type Characters a |
| EB04-021 | Igaram | character | draw,trash-hand,give-don | [On Play] If your Leader is [Nefeltari Vivi], draw 2 cards and trash 1 card from your hand.[Activate: Main] [Once Per Turn] You may trash 1 card from your hand: |
| EB04-023 | Chaka & Pell | character | draw,power-buff | [Double Attack] (This card deals 2 damage.)[On Play] You may give your active Leader −5000 power during this turn: Draw 2 cards. |
| EB04-024 | Terracotta | character | keyword,trash-hand | [Activate: Main] You may rest this Character and trash 1 card from your hand: Up to 1 of your {Alabasta} type Characters gains [Unblockable] during this turn.(T |
| EB04-026 | Bluegrass | character | draw,move-bottom-deck,trash-hand | [On Play] Place up to 1 of your opponent's Characters with a cost of 1 or less at the bottom of the owner's deck.[When Attacking] Draw 1 card and trash 1 card f |
| EB04-027 | Boa Hancock | character | draw,play-from,trash-hand | [On Play] Draw 2 cards and trash 1 card from your hand. [Trigger] Play up to 1 Character card with 5000 power or less and a [Trigger] from your hand. |
| EB04-029 | I Heard the Sound...of a Lady's Teardrops Falling | event | power-buff,search,trash-hand | [Main] If your Leader is [Sanji], look at 3 cards from the top of your deck; reveal up to 1 [Sanji] or Event card and add it to your hand. Then, trash the rest. |
| EB04-030 | Kaido | character | rest,keyword | If this Character would be K.O.'d, you may return 1 DON!! card from your field to your DON!! deck instead.[On Play] DON!! −2: If your Leader has the {Animal Kin |
| EB04-032 | Queen | character | draw | [On Play] You may trash 1 {Animal Kingdom Pirates} type card from your hand: Draw 2 cards.[Activate: Main] [Once Per Turn] You may rest 2 of your DON!! cards: I |
| EB04-033 | Groggy Monsters | character | ko,don-minus | [On Play] DON!! −1: If you have 3 or more {Foxy Pirates} type Characters, K.O. up to 1 of your opponent's Characters with 6000 base power or less. |
| EB04-034 | Charlotte Pudding | character | power-buff,trash-hand | [Blocker][On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: If you have 4 or more Events in your trash, up to 1 of your Leader or  |
| EB04-036 | Foxy | character | draw,rest,trash-hand,don-minus | [On Play] DON!! −1: If your Leader has the {Foxy Pirates} type, draw 2 cards and trash 1 card from your hand. Then, rest up to 1 of your opponent's Characters w |
| EB04-038 | Rosinante & Law | character | draw | Under the rules of this game, also treat this card's name as [Trafalgar Law] and [Donquixote Rosinante].[Blocker][On Play] If the number of DON!! cards on your  |
| EB04-039 | Eustass"Captain"Kid | character | play-from | [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.[Activate: Main] You may trash this Character: Play up to 1 {Kid Pirates} type Charac |
| EB04-040 | Flame Dragon Torch | event | rest,power-buff,don-minus | [Main] You may rest 6 of your DON!! cards: Up to 1 of your [Kaido] cards gains +3000 power during this turn. Then, rest up to 1 of your opponent's Characters.[C |
| EB04-042 | Alpha | character | trash-top | [On Play] You may trash 3 cards from the top of your deck: Give up to 1 of your opponent's Characters −1 cost during this turn. |
| EB04-043 | Kaku | character | move-bottom-deck,trash-top | [Once Per Turn] If your black Character with a base cost of 5 or less would be K.O.'d by your opponent's effect, you may place 3 cards from your trash at the bo |
| EB04-044 | Koby | character | draw,trash-hand | [Once Per Turn] If your Leader's type includes "Navy" and this Character would be removed from the field, you may trash 1 card from your hand instead.[Your Turn |
| EB04-045 | Ginny | character | power-buff | [Activate: Main] You may rest this Character: If there are 2 or more Characters with a cost of 8 or more, up to 1 of your {Revolutionary Army} type Leader or Ch |
| EB04-049 | Finger Pistol Yellow Lotus | event | ko,trash-top | [Main] You may trash 2 cards from the top of your deck: K.O. up to 1 of your opponent's Characters with a base cost of 5 or less. [Trigger] Activate this card's |
| EB04-052 | Sanji | character | play-from | [When Attacking] This Character's base power becomes the same as your opponent's Leader during this turn.[On K.O.] If you have 2 or less Life cards, play up to  |
| EB04-053 | Sentomaru | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Block] If you have 2 or less Life cards,  |
| EB04-055 | Bartholomew Kuma | character | play-from | [On K.O.] Play up to 1 {Revolutionary Army} type Character card with a cost of 4 or less from your hand. [Trigger] If your Leader has the {Revolutionary Army} t |
| EB04-056 | Pacifista | character | keyword | If you have [Jewelry Bonney] and you have 0 Life cards, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make i |
| EB04-057 | Vegapunk | character | keyword | If you have 2 or less Life cards, all of your yellow {Scientist} type Characters cannot be removed from the field by your opponent's effects.[DON!! x1] This Cha |
| EB04-059 | Black Rope Dragon Twister | event | draw,ko,trash-hand | [Main] You may turn 1 card from the top of your Life cards face-up: If you have less Characters than your opponent, K.O. up to 1 of your opponent's Characters w |
| EB04-060 | Gum-Gum Hawk Gatling | event | draw,power-buff,trash-hand | [Main] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 {Egghead} type Character card from your hand to the top of your Li |
| OP01-002 | Trafalgar Law | leader | play-from,return-hand | [Activate: Main] [Once Per Turn] ➁ (You may rest the specified number of DON!! cards in your cost area.): If you have 5 Characters, return 1 of your Characters  |
| OP01-003 | Monkey.D.Luffy | leader | power-buff,set-active | [Activate: Main] [Once Per Turn] ➃ (You may rest the specified number of DON!! cards in your cost area.): Set up to 1 of your {Supernovas} or {Straw Hat Crew} t |
| OP01-013 | Sanji | character | power-buff | [Activate: Main] [Once Per Turn] You may add 1 card from your Life area to your hand: This Character gains +2000 power during this turn. Then, give this Charact |
| OP01-019 | Bartolomeo | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [DON!! x2] [Opponent's Turn] This Character  |
| OP01-024 | Monkey.D.Luffy | character | ko-immunity | [DON!! x2] This Character cannot be K.O.'d in battle by ＜Strike＞ attribute Characters. [Activate: Main] [Once Per Turn] Give this Character up to 2 rested DON!! |
| OP01-032 | Ashura Doji | character | power-buff | [DON!! x1] If your opponent has 2 or more rested Characters, this Character gains +2000 power. |
| OP01-038 | Kanjuro | character | ko | [DON!! x1] [When Attacking] K.O. up to 1 of your opponent's rested Characters with a cost of 2 or less. [On K.O.] Your opponent chooses 1 card from your hand; t |
| OP01-044 | Shachi | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [On Play] If you don't have [Penguin], play  |
| OP01-047 | Trafalgar Law | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [On Play] You may return 1 Character to your |
| OP01-050 | Penguin | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [On Play] If you don't have [Shachi], play u |
| OP01-055 | You Can Be My Samurai!! | event | draw | [Main] You may rest 2 of your Characters: Draw 2 cards. |
| OP01-062 | Crocodile | leader | draw | [DON!! x1] When you activate an Event, you may draw 1 card if you have 4 or less cards in your hand and haven't drawn a card using this Leader's effect during t |
| OP01-063 | Arlong | character | move-bottom-deck | [DON!! x1] [Activate: Main] You may rest this Character: Choose 1 card from your opponent's hand; your opponent reveals that card. If the revealed card is an Ev |
| OP01-068 | Gecko Moria | character | keyword | [Your Turn] This Character gains [Double Attack] if you have 5 or more cards in your hand. (This card deals 2 damage.) |
| OP01-073 | Donquixote Doflamingo | character | search | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [On Play] Look at 5 cards from the top of yo |
| OP01-077 | Perona | character | search | [On Play] Look at 5 cards from the top of your deck and place them at the top or bottom of the deck in any order. |
| OP01-088 | Desert Spada | event | draw,power-buff,search,trash-hand | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, look at 3 cards from the top of your deck and place them at the  |
| OP01-091 | King | leader | power-buff | [Your Turn] If you have 10 DON!! cards on your field, give all of your opponent's Characters −1000 power. |
| OP01-099 | Kurozumi Semimaru | character | ko-immunity | {Kurozumi Clan} type Characters other than your [Kurozumi Semimaru] cannot be K.O.'d in battle. |
| OP01-109 | Who's.Who | character | power-buff | [DON!! x1] [Your Turn] If you have 8 or more DON!! cards on your field, this Character gains +1000 power. |
| OP01-116 | Artificial Devil Fruit SMILE | event | search,play-from,move-bottom-deck | [Main] Look at 5 cards from the top of your deck; play up to 1 {SMILE} type Character card with a cost of 3 or less. Then, place the rest at the bottom of your  |
| OP02-004 | Edward.Newgate | character | ko,power-buff | [On Play] Up to 1 of your Leader gains +2000 power until the start of your next turn. Then, you cannot add Life cards to your hand using your own effects during |
| OP02-008 | Jozu | character | keyword | [DON!! x1] If you have 2 or less Life cards and your Leader's type includes "Whitebeard Pirates", this Character gains [Rush]. (This card can attack on the turn |
| OP02-023 | You May Be a Fool...but I Still Love You | event | power-buff | [Main] If you have 3 or less Life cards, you cannot add Life cards to your hand using your own effects during this turn. [Trigger] Up to 1 of your Leader gains  |
| OP02-026 | Sanji | leader | set-active | [Once Per Turn] When you play a Character with no base effect from your hand, if you have 3 or less Characters, set up to 2 of your DON!! cards as active. |
| OP02-031 | Kouzuki Toki | character | keyword | If you have a [Kouzuki Oden] Character, this Character gains [Blocker]. (After your opponent declares an attack, you may rest this card to make it the new targe |
| OP02-035 | Trafalgar Law | character | play-from,return-hand | [Activate: Main] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may return this Character to the owner's hand: Play up to 1 Charact |
| OP02-045 | Three Sword Style Oni Giri | event | rest,power-buff,play-from | [Counter] Up to 1 of your Leader or Character cards gains +6000 power during this battle. Then, play up to 1 Character card with a cost of 3 or less and no base |
| OP02-046 | Diable Jambe Venaison Shoot | event | ko,play-from | [Main] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less. [Trigger] Play up to 1 Character card with a cost of 4 or less and no base ef |
| OP02-050 | Inazuma | character | power-buff | If you have 1 or less cards in your hand, this Character gains +2000 power. [Blocker] (After your opponent declares an attack, you may rest this card to make it |
| OP02-051 | Emporio.Ivankov | character | play-from | [On Play] Draw card(s) so that you have 3 cards in your hand and then play up to 1 blue {Impel Down} type Character card with a cost of 6 or less from your hand |
| OP02-052 | Cabaji | character | draw,trash-hand | [On Play] If you have [Mohji], draw 2 cards and trash 1 card from your hand. |
| OP02-056 | Donquixote Doflamingo | character | search,move-bottom-deck,trash-hand | [On Play] Look at 3 cards from the top of your deck and place them at the top or bottom of the deck in any order. [DON!! x1] [When Attacking] You may trash 1 ca |
| OP02-057 | Bartholomew Kuma | character | search | [On Play] Look at 2 cards from the top of your deck; reveal up to 1 {The Seven Warlords of the Sea} type card and add it to your hand. Then, place the rest at t |
| OP02-064 | Mr.2.Bon.Kurei(Bentham) | character | move-bottom-deck,trash-hand | [DON!! x1] [When Attacking] You may trash 1 card from your hand: Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck. Then, at th |
| OP02-069 | DEATH WINK | event | power-buff,return-hand | [Counter] Up to 1 of your Leader or Character cards gains +6000 power during this battle. Then, draw cards so that you have 2 cards in your hand. [Trigger] Retu |
| OP02-074 | Saldeath | character | keyword | Your [Blugori] gains [Blocker]. (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) |
| OP02-075 | Shiki | character | don-minus | [Trigger] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Play this card. |
| OP02-094 | Isuka | character | set-active | [DON!! x1] [Once Per Turn] When this Character battles and K.O.'s your opponent's Character, set this Character as active. |
| OP02-102 | Smoker | character | power-buff,ko-immunity | This Character cannot be K.O.'d by effects. [When Attacking] If there is a Character with a cost of 0, this Character gains +2000 power during this battle. |
| OP02-111 | Fullbody | character | power-buff | [When Attacking] If you have [Jango], this card gains +3000 power during this battle. |
| OP02-114 | Borsalino | character | power-buff,ko-immunity | [Opponent's Turn] This Character gains +1000 power and cannot be K.O.'d by effects. [Blocker] (After your opponent declares an attack, you may rest this card to |
| OP02-118 | Yasakani Sacred Jewel | event | ko,trash-hand,ko-immunity | [Counter] You may trash 1 card from your hand: Select up to 1 of your Characters. The selected Character cannot be K.O.'d during this battle. [Trigger] K.O. up  |
| OP02-121 | Kuzan | character | ko | [Your Turn] Give all of your opponent's Characters −5 cost. [On Play] K.O. up to 1 of your opponent's Characters with a cost of 0. |
| OP03-008 | Buggy | character | search,move-bottom-deck,ko-immunity | This Character cannot be K.O.'d in battle by <Slash> attribute cards.[On Play] Look at 5 cards from the top of your deck; reveal up to 1 red Event and add it to |
| OP03-012 | Marshall.D.Teach | character | draw,power-buff | [When Attacking] You may trash 1 of your red Characters with 4000 power or more: Draw 1 card. Then, this Character gains +1000 power during this battle. |
| OP03-013 | Marco | character | ko | [Your Turn] [On Play] K.O. up to 1 of your opponent's Characters with 3000 power or less.[On K.O.] You may trash 1 Event from your hand: You may play this Chara |
| OP03-014 | Monkey.D.Garp | character | play-from | [When Attacking] Play up to 1 red Character card with a cost of 1 from your hand. |
| OP03-015 | Lim | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] When this Character is K.O. |
| OP03-016 | Flame Emperor | event | ko,keyword | [Main] If your Leader is [Portgas.D.Ace], K.O. up to 1 of your opponent's Characters with 8000 power or less, and your Leader gains [Double Attack] and +3000 po |
| OP03-018 | Fire Fist | event | ko | [Main] You may trash 1 Event from your hand: K.O. up to 1 of your opponent's Characters with 5000 power or less and up to 1 of your opponent's Characters with 4 |
| OP03-020 | Striker | stage | search,move-bottom-deck | [Activate: Main] ② (You may rest the specified number of DON!! cards in your cost area.) You may rest this Stage: If your Leader is [Portgas.D.Ace], look at 5 c |
| OP03-021 | Kuro | leader | rest | [Activate: Main] ③ (You may rest the specified number of DON!! cards in your cost area.) You may rest 2 of your {East Blue} type Characters: Set this Leader as  |
| OP03-022 | Arlong | leader | play-from | [DON!! x2] [When Attacking] ① (You may rest the specified number of DON!! cards in your cost area.): Play up to 1 Character card with a cost of 4 or less and a  |
| OP03-025 | Krieg | character | ko,keyword,trash-hand | [On Play] You may trash 1 card from your hand: K.O. up to 2 of your opponent's rested Characters with a cost of 4 or less.[DON!! x1] This Character gains [Doubl |
| OP03-027 | Sham | character | rest,play-from | [On Play] If your Leader has the {East Blue} type, rest up to 1 of your opponent's Characters with a cost of 2 or less and, if you don't have [Buchi], play up t |
| OP03-028 | Jango | character | set-active,choose-one | [On Play] Choose one:- Set up to 1 of your {East Blue} type Leader or Character cards with a cost of 6 or less as active.- Rest this Character and up to 1 of yo |
| OP03-036 | Out-of-the-Bag | event | ko,set-active | [Main] You may rest 1 of your {East Blue} type Characters: Set up to 1 of your [Kuro] cards as active. [Trigger] K.O. up to 1 of your opponent's rested Characte |
| OP03-037 | Tooth Attack | event | ko,play-from | [Main] You may rest 1 of your {East Blue} type Characters: K.O. up to 1 of your opponent's rested Characters with a cost of 3 or less. [Trigger] Play up to 1 Ch |
| OP03-040 | Nami | leader | trash-top | When your deck is reduced to 0, you win the game instead of losing, according to the rules.[DON!! x1] When this Leader's attack deals damage to your opponent's  |
| OP03-041 | Usopp | character | trash-top | [Rush] (This card can attack on the turn in which it is played.)[DON!! x1] When this Character's attack deals damage to your opponent's Life, you may trash 7 ca |
| OP03-043 | Gaimon | character | trash-top | When you deal damage to your opponent's Life, you may trash 3 cards from the top of your deck. If you do, trash this Character. |
| OP03-045 | Carne | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] If you have 20 or less card |
| OP03-047 | Zeff | character | trash-top,return-hand | [DON!! x1] When this Character's attack deals damage to your opponent's Life, you may trash 7 cards from the top of your deck. [On Play] You may return up to 1  |
| OP03-049 | Patty | character | return-hand | [On Play] If you have 20 or less cards in your deck, return up to 1 Character with a cost of 3 or less to the owner's hand. |
| OP03-050 | Boodle | character | trash-top | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] You may trash 1 card from the top o |
| OP03-051 | Bell-mère | character | trash-top | [DON!! x1] When this Character's attack deals damage to your opponent's Life, you may trash 7 cards from the top of your deck.[On K.O.] You may trash 3 cards fr |
| OP03-053 | Yosaku & Johnny | character | power-buff | [DON!! x1] If you have 20 or less cards in your deck, this Character gains +2000 power. |
| OP03-054 | Usopp's Rubber Band of Doom!!! | event | draw,power-buff,trash-top | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, you may trash 1 card from the top of your deck. [Trigger] Draw 1 |
| OP03-055 | Gum-Gum Giant Gavel | event | power-buff,trash-hand,trash-top,return-hand | [Counter] You may trash 1 card from your hand: Up to 1 of your Leader gains +4000 power during this battle. Then, you may trash 2 cards from the top of your dec |
| OP03-057 | Three Thousand Worlds | event | move-bottom-deck | [Main] Place up to 1 Character with a cost of 5 or less at the bottom of the owner's deck. [Trigger] Place up to 1 Character with a cost of 3 or less at the bot |
| OP03-059 | Kaku | character | keyword,don-minus | [When Attacking] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): This Character gains [Banish] during this ba |
| OP03-066 | Paulie | character | ko | [On Play] ➁ (You may rest the specified number of DON!! cards in your cost area.): Add up to 1 DON!! card from your DON!! deck and set it as active. Then, if yo |
| OP03-070 | Monkey.D.Luffy | character | keyword,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may trash 1 Character card with a cost of 5 from |
| OP03-072 | Gum-Gum Jet Gatling | event | power-buff,trash-hand | [Counter] You may trash 1 card from your hand: Up to 1 of your Leader or Character cards gains +3000 power during this battle. [Trigger] Add up to 1 DON!! card  |
| OP03-074 | Top Knot | event | move-bottom-deck | [Main] DON!! -2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Place up to 1 of your opponent's Characters with a cos |
| OP03-076 | Rob Lucci | leader | trash-hand | [Your Turn] [Once Per Turn] You may trash 2 cards from your hand: When your opponent's Character is K.O.'d, set this Leader as active. |
| OP03-077 | Charlotte Linlin | leader | trash-hand | [DON!! x2] [When Attacking] ② (You may rest the specified number of DON!! cards in your cost area.) You may trash 1 card from your hand: If you have 1 or less L |
| OP03-079 | Vergo | character | ko-immunity | [DON!! x1] This Character cannot be K.O.'d in battle. |
| OP03-080 | Kaku | character | ko,move-bottom-deck | [On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of your deck in any order: K.O. up to 1 of your opponent's Characters w |
| OP03-083 | Corgy | character | search,move-bottom-deck | [On Play] Look at 5 cards from the top of your deck and trash up to 2 cards. Then, place the rest at the bottom of your deck in any order. |
| OP03-088 | Fukurou | character | ko-immunity | This Character cannot be K.O.'d by effects.[Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) |
| OP03-090 | Blueno | character | keyword,play-from | [DON!! x1] This Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] Pla |
| OP03-092 | Rob Lucci | character | keyword,move-bottom-deck | [On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of your deck in any order: This Character gains [Rush] during this turn |
| OP03-093 | Wanze | character | ko,trash-hand | [On Play] You may trash 1 card from your hand: If your Leader's type includes "CP", K.O. up to 1 of your opponent's Characters with a cost of 1 or less. |
| OP03-094 | Air Door | event | search,play-from | [Main] If your Leader's type includes "CP", look at 5 cards from the top of your deck; play up to 1 Character card with a type including "CP" and a cost of 5 or |
| OP03-096 | Tempest Kick Sky Slicer | event | draw,ko | [Main] K.O. up to 1 of your opponent's Characters with a cost of 0 or your opponent's Stages with a cost of 3 or less. [Trigger] Draw 2 cards. |
| OP03-097 | Six King Pistol | event | draw,ko,power-buff,trash-hand | [Counter] You may trash 1 card from your hand: Up to 1 of your Leader or Character cards gains +3000 power during this battle. [Trigger] Draw 1 card. Then, K.O. |
| OP03-099 | Charlotte Katakuri | leader | power-buff,peek-life | [DON!! x1] [When Attacking] Look at up to 1 card from the top of your or your opponent's Life cards, and place it at the top or bottom of the Life cards. Then,  |
| OP03-104 | Shirley | character | peek-life | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Look at up to 1 card from the top o |
| OP03-105 | Charlotte Oven | character | power-buff | [DON!! x1] [When Attacking] You may trash 1 card with a [Trigger] from your hand: This Character gains +3000 power during this battle. |
| OP03-108 | Charlotte Cracker | character | keyword,trash-hand | [DON!! x1] If you have less Life cards than your opponent, this Character gains [Double Attack] and +1000 power.(This card deals 2 damage.) [Trigger] You may tr |
| OP03-110 | Charlotte Smoothie | character | power-buff,trash-hand | [When Attacking] You may add 1 card from the top or bottom of your Life cards to your hand: This Character gains +2000 power during this battle. [Trigger] You m |
| OP03-113 | Charlotte Perospero | character | search,move-bottom-deck,trash-hand | [On K.O.] Look at 3 cards from the top of your deck; reveal up to 1 {Big Mom Pirates} type card and add it to your hand. Then, place the rest at the bottom of y |
| OP03-115 | Streusen | character | ko | [On Play] You may trash 1 card with a [Trigger] from your hand: K.O. up to 1 of your opponent's Characters with a cost of 1 or less. |
| OP03-118 | Ikoku Sovereignty | event | power-buff,trash-hand | [Counter] Up to 1 of your Leader or Character cards gains +5000 power during this battle. [Trigger] You may trash 2 cards from your hand: Add up to 1 card from  |
| OP03-119 | Buzz Cut Mochi | event | ko,play-from | [Main] If you have less Life cards than your opponent, K.O. up to 1 of your opponent's Characters with a cost of 4 or less. [Trigger] Play up to 1 Character car |
| OP03-121 | Thunder Bolt | event | ko | [Main] You may trash 1 card from the top of your Life cards: K.O. up to 1 of your opponent's Characters with a cost of 5 or less. [Trigger] K.O. up to 1 of your |
| OP03-122 | Sogeking | character | draw,trash-hand,return-hand | Also treat this card's name as [Usopp] according to the rules.[On Play] Return up to 1 Character with a cost of 6 or less to the owner's hand. Then, draw 2 card |
| OP04-002 | Igaram | character | power-buff,search,move-bottom-deck | [Activate: Main] You may rest this Character and give your 1 active Leader −5000 power during this turn: Look at 5 cards from the top of your deck; reveal up to |
| OP04-004 | Karoo | character | give-don | [Activate: Main] You may rest this Character: Give up to 1 rested DON!! card to each of your {Alabasta} type Characters. |
| OP04-005 | Kung Fu Jugon | character | keyword | If you have a [Kung Fu Jugon] other than this Character, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make  |
| OP04-006 | Koza | character | power-buff | [When Attacking] You may give your 1 active Leader −5000 power during this turn: This Character gains +2000 power until the start of your next turn. |
| OP04-008 | Chaka | character | ko,power-buff | [DON!! x1] [When Attacking] If your Leader is [Nefeltari Vivi], give up to 1 of your opponent's Characters −3000 power during this turn. Then, K.O. up to 1 of y |
| OP04-010 | Tony Tony.Chopper | character | play-from | [On Play] Play up to 1 {Animal} type Character card with 3000 power or less from your hand. |
| OP04-011 | Nami | character | power-buff,move-bottom-deck | [When Attacking] Reveal 1 card from the top of your deck. If the revealed card is a Character card with 6000 power or more, this Character gains +3000 power dur |
| OP04-013 | Pell | character | ko | [DON!! x1] [When Attacking] K.O. up to 1 of your opponent's Characters with 4000 power or less. |
| OP04-015 | Roronoa Zoro | character | power-buff | [On Play] Give up to 1 of your opponent's Characters −2000 power during this turn. |
| OP04-016 | Bad Manners Kick Course | event | power-buff,trash-hand | [Counter] You may trash 1 card from your hand: Up to 1 of your Leader or Character cards gains +3000 power during this battle. [Trigger] Give up to 1 of your op |
| OP04-017 | Happiness Punch | event | power-buff | [Counter] Give up to 1 of your opponent's Leader or Character cards −2000 power during this turn. Then, if your Leader is active, give up to 1 of your opponent' |
| OP04-018 | Enchanting Vertigo Dance | event | power-buff | [Main] If your Leader has the {Alabasta} type, give up to 2 of your opponent's Characters −2000 power during this turn. [Trigger] Activate this card's [Main] ef |
| OP04-019 | Donquixote Doflamingo | leader | set-active | [End of Your Turn] Set up to 2 of your DON!! cards as active. |
| OP04-020 | Issho | leader | set-active | [DON!! x1] [Your Turn] Give all of your opponent's Characters −1 cost.[End of Your Turn] ➀ (You may rest the specified number of DON!! cards in your cost area.) |
| OP04-021 | Viola | character | rest | [On Your Opponent's Attack] ➁ (You may rest the specified number of DON!! cards in your cost area.): Rest up to 1 of your opponent's DON!! cards. |
| OP04-024 | Sugar | character | rest | [Opponent's Turn] [Once Per Turn] When your opponent plays a Character, if your Leader has the {Donquixote Pirates} type, rest up to 1 of your opponent's Charac |
| OP04-025 | Giolla | character | rest | [On Your Opponent's Attack] ➁ (You may rest the specified number of DON!! cards in your cost area.): Rest up to 1 of your opponent's Characters with a cost of 4 |
| OP04-027 | Daddy Masterson | character | set-active | [DON!! x1] [End of Your Turn] Set this Character as active. |
| OP04-028 | Diamante | character | set-active | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[DON!! x1] [End of Your Turn] If you have 2 o |
| OP04-029 | Dellinger | character | set-active | [End of Your Turn] Set up to 1 of your DON!! cards as active. |
| OP04-030 | Trebol | character | ko,rest | [On Play] K.O. up to 1 of your opponent's rested Characters with a cost of 5 or less.[On Your Opponent's Attack] ➁ (You may rest the specified number of DON!! c |
| OP04-032 | Baby 5 | character | set-active | [End of Your Turn] You may trash this Character: Set up to 2 of your DON!! cards as active. |
| OP04-034 | Lao.G | character | ko | [End of Your Turn] If you have 3 or more active DON!! cards, K.O. up to 1 of your opponent's rested Characters with a cost of 3 or less. |
| OP04-035 | Spiderweb | event | power-buff,set-active | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, set up to 1 of your Characters as active. [Trigger] Up to 1 of y |
| OP04-036 | Donquixote Family | event | search,move-bottom-deck | [Counter] Look at 5 cards from the top of your deck; reveal up to 1 {Donquixote Pirates} type card and add it to your hand. Then, place the rest at the bottom o |
| OP04-037 | Flapping Thread | event | ko,power-buff | [Counter] If your Leader has the {Donquixote Pirates} type, up to 1 of your Leader or Character cards gains +2000 power during this turn. [Trigger] K.O. up to 1 |
| OP04-038 | The Weak Do Not Have the Right to Choose How They Die!!! | event | ko,rest,set-active | [Main]/[Counter] Rest up to 1 of your opponent's Leader or Character cards. Then, K.O. up to 1 of your opponent's rested Characters with a cost of 6 or less. [T |
| OP04-040 | Queen | leader | draw | [DON!! x1] [When Attacking] If you have a total of 4 or less cards in your Life area and hand, draw 1 card. If you have a Character with a cost of 8 or more, yo |
| OP04-041 | Apis | character | search,move-bottom-deck,trash-hand | [On Play] You may trash 2 cards from your hand: Look at 5 cards from the top of your deck; reveal up to 1 {East Blue} type card and add it to your hand. Then, p |
| OP04-043 | Ulti | character | return-hand | [DON!! x1] [When Attacking] Return up to 1 Character with a cost of 2 or less to the owner's hand or the bottom of their deck. |
| OP04-044 | Kaido | character | return-hand | [On Play] Return up to 1 Character with a cost of 8 or less and up to 1 Character with a cost of 3 or less to the owner's hand. |
| OP04-046 | Queen | character | search,move-bottom-deck | [On Play] If your Leader has the {Animal Kingdom Pirates} type, look at 7 cards from the top of your deck; reveal a total of up to 2 [Plague Rounds] or [Ice Oni |
| OP04-047 | Ice Oni | character | move-bottom-deck | [Your Turn] At the end of a battle in which this Character battles your opponent's Character with a cost of 5 or less, place the opponent's Character you battle |
| OP04-050 | Hanger | character | draw,trash-hand | [Activate: Main] You may trash 1 card from your hand and rest this Character: Draw 1 card. |
| OP04-053 | Page One | character | draw,move-bottom-deck | [DON!! x1] [Once Per Turn] When you activate an Event, draw 1 card. Then, place 1 card from your hand at the bottom of your deck. |
| OP04-055 | Plague Rounds | event | move-bottom-deck | [Main] You may trash 1 [Ice Oni] from your hand and place 1 Character with a cost of 4 or less at the bottom of the owner's deck: Play 1 [Ice Oni] from your tra |
| OP04-056 | Gum-Gum Red Roc | event | move-bottom-deck | [Main] Place up to 1 Character at the bottom of the owner's deck. [Trigger] Place up to 1 Character with a cost of 4 or less at the bottom of the owner's deck. |
| OP04-057 | Dragon Twister Demolition Breath | event | power-buff,move-bottom-deck,return-hand | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, place up to 1 Character with a cost of 1 or less at the bottom o |
| OP04-059 | Iceburg | character | keyword,don-minus | [On Your Opponent's Attack] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {Water Sev |
| OP04-060 | Crocodile | character | draw,trash-hand,don-minus | [On Play] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader's type includes "Baroque Works", add |
| OP04-063 | Franky | character | power-buff,don-minus | [On Your Opponent's Attack] [Once Per Turn] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader ha |
| OP04-064 | Ms. All Sunday | character | draw | [On Play] Add up to 1 DON!! card from your DON!! deck and rest it. Then, if you have 6 or more DON!! cards on your field, draw 1 card. [Trigger] DON!! −2 (You m |
| OP04-066 | Miss.Valentine(Mikita) | character | search,move-bottom-deck,don-minus | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 card with a type including "Baroque Works" and add it to your hand. Then, place the rest at  |
| OP04-067 | Miss.MerryChristmas(Drophy) | character | don-minus | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] DON!! −1 (You may return the speci |
| OP04-068 | Yokozuna | character | don-minus,return-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Your Opponent's Attack] DON!! −1 (You may |
| OP04-069 | Mr.2.Bon.Kurei(Bentham) | character | don-minus | [On Your Opponent's Attack] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): This Character's base power becom |
| OP04-070 | Mr.3(Galdino) | character | power-buff,don-minus | [On Your Opponent's Attack] [Once Per Turn] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Give up to 1 of y |
| OP04-071 | Mr.4(Babe) | character | keyword,don-minus | [On Your Opponent's Attack] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): This Character gains [Blocker] an |
| OP04-072 | Mr.5(Gem) | character | ko | [On Your Opponent's Attack] [Once Per Turn] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may rest this  |
| OP04-074 | Colors Trap | event | rest,power-buff,don-minus | [Counter] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Up to 1 of your Leader or Character cards gains +10 |
| OP04-075 | Nez-Palm Cannon | event | power-buff | [Counter] Up to 1 of your Leader or Character cards gains +6000 power during this battle. Then, if you have 2 or less Life cards, add up to 1 DON!! card from yo |
| OP04-076 | Weakness...Is an Unforgivable Sin. | event | power-buff,don-minus | [Counter] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Up to 1 of your Leader or Character cards gains +10 |
| OP04-079 | Orlumbus | character | trash-top | [Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters −4 cost during this turn and trash 2 cards from the top of your deck. Then, K.O. 1 o |
| OP04-082 | Kyros | character | ko,trash-top | If this Character would be K.O.'d, you may rest your Leader or 1 [Corrida Coliseum] instead.[On Play] If your Leader is [Rebecca], K.O. up to 1 of your opponent |
| OP04-083 | Sabo | character | draw,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] None of your Characters can be K.O. |
| OP04-085 | Suleiman | character | trash-top | [On Play]/[When Attacking] If your Leader has the {Dressrosa} type, give up to 1 of your opponent's Characters −2 cost during this turn. Then, trash 1 card from |
| OP04-086 | Chinjao | character | draw,trash-hand | [DON!! x1] When this Character battles and K.O.'s your opponent's Character, draw 2 cards and trash 2 cards from your hand. |
| OP04-091 | Leo | character | ko,trash-top | [On Play] You may rest your 1 Leader: If your Leader has the {Dressrosa} type, K.O. up to 1 of your opponent's Characters with a cost of 1 or less. Then, trash  |
| OP04-093 | Gum-Gum King Kong Gun | event | draw,power-buff,keyword,trash-hand | [Main] Up to 1 of your {Dressrosa} type Characters gains +6000 power during this turn. Then, if you have 15 or more cards in your trash, that card gains [Double |
| OP04-094 | Trueno Bastardo | event | ko | [Main] Choose up to 1 of your opponent's Characters with a cost of 4 or less and K.O. it. If you have 15 or more cards in your trash, choose up to 1 of your opp |
| OP04-102 | Kin'emon | character | set-active | [Activate: Main] [Once Per Turn] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may add 1 card from the top or bottom of your Life  |
| OP04-104 | Sanji | character | trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] You may trash 1 card from your han |
| OP04-105 | Charlotte Amande | character | rest | [Activate: Main] [Once Per Turn] You may trash 1 card with a [Trigger] from your hand: Rest up to 1 of your opponent's Characters with a cost of 2 or less. |
| OP04-106 | Charlotte Bavarois | character | power-buff,trash-hand | [DON!! x1] If you have less Life cards than your opponent, this Character gains +1000 power. [Trigger] You may trash 1 card from your hand: Play this card. |
| OP04-108 | Charlotte Moscato | character | keyword,trash-hand | [DON!! x1] This Character gains [Banish].(When this card deals damage, the target card is trashed without activating its Trigger.) [Trigger] You may trash 1 car |
| OP04-109 | Tonoyasu | character | power-buff | [Activate: Main] You may trash this Character: Up to 1 of your {Land of Wano} type Leader or Character cards gains +3000 power during this turn. |
| OP04-111 | Hera | character | set-active | [Activate: Main] You may trash 1 of your {Homies} type Characters other than this Character and rest this Character: Set up to 1 of your [Charlotte Linlin] Char |
| OP04-112 | Yamato | character | ko | [On Play] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the total of your and your opponent's Life cards. Then, if you have 1 or  |
| OP04-115 | Gun Modoki | event | power-buff,keyword | [Main] You may add 1 card from the top or bottom of your Life cards to your hand: Up to 1 of your {Land of Wano} type Characters gains [Double Attack] during th |
| OP04-116 | Diable Jambe Joue Shot | event | draw,ko,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +6000 power during this battle. Then, if you and your opponent have a total of 4 or less Life cards, K |
| OP04-119 | Donquixote Rosinante | character | play-from,ko-immunity | [Opponent's Turn] If this Character is rested, your active Characters with a base cost of 5 cannot be K.O.'d by effects.[On Play] You may rest this Character: P |
| OP05-001 | Sabo | leader | power-buff | [DON!! x1] [Opponent's Turn] [Once Per Turn] If your Character with 5000 power or more would be K.O.'d, you may give that Character −1000 power during this turn |
| OP05-003 | Inazuma | character | keyword | If you have a Character with 7000 power or more other than this Character, this Character gains [Rush].(This card can attack on the turn in which it is played.) |
| OP05-004 | Emporio.Ivankov | character | play-from | [Activate: Main] [Once Per Turn] If this Character has 7000 power or more, play up to 1 {Revolutionary Army} type Character card with 5000 power or less other t |
| OP05-005 | Karasu | character | power-buff | [On Play] If your Leader has the {Revolutionary Army} type, give up to 1 of your opponent's Leader or Character cards −1000 power during this turn.[When Attacki |
| OP05-006 | Koala | character | power-buff | [On Play] If your Leader has the {Revolutionary Army} type, give up to 1 of your opponent's Characters −3000 power during this turn. |
| OP05-007 | Sabo | character | ko | [On Play] K.O. up to 2 of your opponent's Characters with a total power of 4000 or less. |
| OP05-008 | Chaka | character | give-don | [DON!! x1] [Activate: Main] [Once Per Turn] Give up to 2 rested DON!! cards to your Leader or 1 of your Characters. |
| OP05-009 | Toh-Toh | character | draw | [On Play] Draw 1 card if your Leader has 0 power or less. |
| OP05-011 | Bartholomew Kuma | character | ko | [On Play] K.O. up to 1 of your opponent's Characters with 2000 power or less. [Trigger] If your Leader is multicolored, play this card. |
| OP05-016 | Morley | character | trash-hand | [When Attacking] If this Character has 7000 power or more, your opponent cannot activate [Blocker] during this battle. [Trigger] You may trash 1 card from your  |
| OP05-017 | Lindbergh | character | ko,trash-hand | [When Attacking] If this Character has 7000 power or more, K.O. up to 1 of your opponent's Characters with 3000 power or less. [Trigger] You may trash 1 card fr |
| OP05-019 | Fire Fist | event | ko,power-buff | [Main] Give up to 1 of your opponent's Characters −4000 power during this turn. Then, if you have 2 or less Life cards, K.O. up to 1 of your opponent's Characte |
| OP05-021 | Revolutionary Army HQ | stage | search,move-bottom-deck,trash-hand | [Activate: Main] You may trash 1 card from your hand and rest this Stage: Look at 3 cards from the top of your deck; reveal up to 1 {Revolutionary Army} type ca |
| OP05-023 | Vergo | character | ko | [DON!! x1] [When Attacking] K.O. up to 1 of your opponent's rested Characters with a cost of 3 or less. |
| OP05-026 | Sarquiss | character | set-active | [DON!! x1] [When Attacking] [Once Per Turn] You may rest 1 of your Characters with a cost of 3 or more: Set this Character as active. |
| OP05-027 | Trafalgar Law | character | rest | [Activate: Main] You may trash this Character: Rest up to 1 of your opponent's Characters with a cost of 3 or less. |
| OP05-028 | Donquixote Doflamingo | character | ko | [Activate: Main] You may trash this Character: K.O. up to 1 of your opponent's rested Characters with a cost of 2 or less. |
| OP05-029 | Donquixote Doflamingo | character | rest | [On Your Opponent's Attack] [Once Per Turn] ➀ (You may rest the specified number of DON!! cards in your cost area.): Rest up to 1 of your opponent's Characters  |
| OP05-031 | Buffalo | character | set-active | [When Attacking] [Once Per Turn] If you have 2 or more rested Characters, set up to 1 of your rested Characters with a cost of 1 as active. |
| OP05-032 | Pica | character | set-active | [End of Your Turn] ①: Set this Character as active.[Once Per Turn] If this Character would be K.O.'d, you may rest 1 of your Characters with a cost of 3 or more |
| OP05-033 | Baby 5 | character | play-from | [Activate: Main] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may rest this Character: Play up to 1 {Donquixote Pirates} type Cha |
| OP05-034 | Baby 5 | character | search,move-bottom-deck | [Activate: Main] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may rest this Character: Look at 5 cards from the top of your deck; |
| OP05-036 | Monet | character | rest | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Block] Rest up to 1 of your opponent's Ch |
| OP05-037 | Because the Side of Justice Will Be Whichever Side Wins!! | event | rest,power-buff,trash-hand | [Counter] You may trash 1 card from your hand: Up to 1 of your Leader or Character cards gains +3000 power during this battle. [Trigger] Rest up to 1 of your op |
| OP05-038 | Charlestone | event | rest,power-buff,trash-hand,set-active | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, you may trash 1 card from your hand. If you do, set up to 3 of y |
| OP05-039 | Stick-Stickem Meteora | event | ko,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, K.O. up to 1 of your opponent's rested Characters with a cost of |
| OP05-041 | Sakazuki | leader | draw,trash-hand | [Activate: Main] [Once Per Turn] You may trash 1 card from your hand: Draw 1 card.[When Attacking] Give up to 1 of your opponent's Characters −1 cost during thi |
| OP05-043 | Ulti | character | search | [On Play] If your Leader is multicolored, look at 3 cards from the top of your deck and add up to 1 card to your hand. Then, place the rest at the top or bottom |
| OP05-045 | Stainless | character | move-bottom-deck,trash-hand | [Activate: Main] You may trash 1 card from your hand and rest this Character: Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck |
| OP05-046 | Dalmatian | character | draw,move-bottom-deck | [On K.O.] Draw 1 card and place 1 card from your hand at the bottom of your deck. |
| OP05-047 | Basil Hawkins | character | draw,power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Block] Draw 1 card if you have 3 or less  |
| OP05-053 | Mozambia | character | power-buff | [Your Turn] [Once Per Turn] When you draw a card outside of your Draw Phase, this Character gains +2000 power during this turn. |
| OP05-054 | Monkey.D.Garp | character | draw,move-bottom-deck | [On Play] Draw 2 cards and place 2 cards from your hand at the bottom of your deck in any order. |
| OP05-055 | X.Drake | character | search | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Look at 5 cards from the top of you |
| OP05-056 | X.Barrels | character | draw,move-bottom-deck | [On Play] You may place 1 of your Characters other than this Character at the bottom of your deck: Draw 1 card. |
| OP05-058 | It's a Waste of Human Life!! | event | move-bottom-deck | [Main] Place all Characters with a cost of 3 or less at the bottom of the owner's deck. Then, you and your opponent trash cards from your hands until you each h |
| OP05-060 | Monkey.D.Luffy | leader | add-life-to-hand | [Activate: Main] [Once Per Turn] You may add 1 card from the top of your Life cards to your hand: If you have 0 or 3 or more DON!! cards on your field, add up t |
| OP05-061 | Uso-Hachi | character | rest | [DON!! x1] [When Attacking] If you have 8 or more DON!! cards on your field, rest up to 1 of your opponent's Characters with a cost of 4 or less. |
| OP05-062 | O-Nami | character | keyword | If you have 10 DON!! cards on your field, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new targ |
| OP05-063 | O-Robi | character | ko | [On Play] If you have 8 or more DON!! cards on your field, K.O. up to 1 of your opponent's Characters with a cost of 3 or less. |
| OP05-066 | Jinbe | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] If you have 10 DON!! cards  |
| OP05-068 | Chopa-Emon | character | set-active | [On Play] If you have 8 or more DON!! cards on your field, set up to 1 of your purple {Straw Hat Crew} type Characters with 6000 power or less as active. |
| OP05-069 | Trafalgar Law | character | search,move-bottom-deck | [When Attacking] If your opponent has more DON!! cards on their field than you, look at 5 cards from the top of your deck; reveal up to 1 {Heart Pirates} type c |
| OP05-070 | Fra-Nosuke | character | keyword | [DON!! x1] If you have 8 or more DON!! cards on your field, this Character gains [Rush].(This card can attack on the turn in which it is played.) |
| OP05-071 | Bepo | character | power-buff | [When Attacking] If your opponent has more DON!! cards on their field than you, give up to 1 of your opponent's Characters −2000 power during this turn. |
| OP05-072 | Hone-Kichi | character | power-buff | [On Play] If you have 8 or more DON!! cards on your field, give up to 2 of your opponent's Characters −2000 power during this turn. |
| OP05-073 | Miss Doublefinger(Zala) | character | trash-hand,don-minus | [On Play] You may trash 1 card from your hand: Add up to 1 DON!! card from your DON!! deck and rest it. [Trigger] DON!! −1 (You may return the specified number  |
| OP05-075 | Mr.1(Daz.Bonez) | character | play-from,don-minus | [On Your Opponent's Attack] [Once Per Turn] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Play up to 1 {Bar |
| OP05-082 | Shirahoshi | character | move-bottom-deck | [Activate: Main] You may rest this Character and place 2 cards from your trash at the bottom of your deck in any order: If your opponent has 6 or more cards in  |
| OP05-085 | Nefeltari Cobra | character | trash-top | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Trash 1 card from the top of your d |
| OP05-086 | Nefeltari Vivi | character | keyword | If you have 10 or more cards in your trash, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new ta |
| OP05-088 | Mansherry | character | move-bottom-deck | [Activate: Main] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may rest this Character and place 2 cards from your trash at the bo |
| OP05-090 | Riku Doldo III | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play]/[On K.O.] Up to 1 of your {Dressros |
| OP05-091 | Rebecca | character | play-from | [Blocker][On Play] Add up to 1 black Character card with a cost of 3 to 7 other than [Rebecca] from your trash to your hand. Then, play up to 1 black Character  |
| OP05-093 | Rob Lucci | character | ko,move-bottom-deck | [On Play] You may place 3 cards from your trash at the bottom of your deck in any order: K.O. up to 1 of your opponent's Characters with a cost of 2 or less and |
| OP05-094 | Haute Couture Patch★Work | event | draw,trash-hand | [Main] Give up to 1 of your opponent's Characters −3 cost during this turn. Then, up to 1 of your opponent's Characters with a cost of 0 will not become active  |
| OP05-095 | Dragon Claw | event | ko,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 15 or more cards in your trash, K.O. up to 1 of your |
| OP05-096 | I Bid 500 Million!! | event | draw,ko,choose-one,return-hand | [Main] Choose one:• K.O. up to 1 of your opponent's Characters with a cost of 1 or less.• Return up to 1 of your opponent's Characters with a cost of 1 or less  |
| OP05-098 | Enel | leader | trash-hand | [Opponent's Turn] [Once Per Turn] When your number of Life cards becomes 0, add 1 card from the top of your deck to the top of your Life cards. Then, trash 1 ca |
| OP05-099 | Amazon | character | power-buff | [On Your Opponent's Attack] You may rest this Character: Your opponent may trash 1 card from the top of their Life cards. If they do not, give up to 1 of your o |
| OP05-101 | Ohm | character | power-buff,search,play-from,move-bottom-deck | If you have 2 or less Life cards, this Character gains +1000 power.[On Play] Look at 5 cards from the top of your deck; reveal up to 1 [Holly] and add it to you |
| OP05-104 | Conis | character | draw,move-bottom-deck,trash-hand | [On Play] You may place 1 of your Stages at the bottom of your deck: Draw 1 card and trash 1 card from your hand. |
| OP05-105 | Satori | character | trash-hand | [Trigger] You may trash 1 card from your hand: Play this card. |
| OP05-106 | Shura | character | search,move-bottom-deck | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Sky Island} type card other than [Shura] and add it to your hand. Then, place the rest at t |
| OP05-107 | Lieutenant Spacey | character | power-buff | [Your Turn] [Once Per Turn] When a card is added to your hand from your Life, this Character gains +2000 power during this turn. |
| OP05-109 | Pagaya | character | draw,trash-hand | [Once Per Turn] When a [Trigger] activates, draw 2 cards and trash 2 cards from your hand. |
| OP05-119 | Monkey.D.Luffy | character | move-bottom-deck,don-minus | [On Play] DON!! −10: Place all of your Characters except this Character at the bottom of your deck in any order. Then, take an extra turn after this one.[Activa |
| OP06-001 | Uta | leader | power-buff | [When Attacking] You may trash 1 {FILM} type card from your hand: Give up to 1 of your opponent's Characters −2000 power during this turn. Then, add up to 1 DON |
| OP06-010 | Douglas Bullet | character | keyword | If your Leader has the {FILM} type, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new target of  |
| OP06-017 | Meteor-Strike of Love | event | power-buff,add-life-to-hand | [Main]/[Counter] You may add 1 card from the top of your Life cards to your hand: Up to 1 of your Leader or Character cards gains +3000 power during this turn. |
| OP06-020 | Hody Jones | leader | rest | [Activate: Main] You may rest this Leader: Rest up to 1 of your opponent's DON!! cards or Characters with a cost of 3 or less. Then, you cannot add Life cards t |
| OP06-021 | Perona | leader | rest,choose-one | [Activate: Main] [Once Per Turn] Choose one:• Rest up to 1 of your opponent's Characters with a cost of 4 or less.• Give up to 1 of your opponent's Characters − |
| OP06-033 | Vander Decken IX | character | ko | [On Play] You may trash 1 {Fish-Man} type card from your hand or 1 [The Ark Noah] from your hand or field: K.O. up to 1 of your opponent's rested Characters. |
| OP06-039 | You Ain't Even Worth Killing Time!! | event | ko,rest,choose-one | [Main] Choose one:• Rest up to 1 of your opponent's Characters with a cost of 6 or less.• K.O. up to 1 of your opponent's rested Characters with a cost of 6 or  |
| OP06-043 | Aramaki | character | power-buff,move-bottom-deck,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Activate: Main] [Once Per Turn] You may tras |
| OP06-052 | Tokikake | character | ko-immunity | [DON!! x1] If you have 4 or less cards in your hand, this Character cannot be K.O.'d in battle. |
| OP06-054 | Borsalino | character | keyword | If you have 5 or less cards in your hand, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new targ |
| OP06-057 | But I Will Never Doubt a Woman's Tears!!!! | event | power-buff,play-from | [Main] Up to 1 of your Leader or Character cards gains +1000 power during this turn. Then, reveal 1 card from the top of your deck, play up to 1 Character card  |
| OP06-059 | White Snake | event | draw,power-buff,search | [Counter] Up to 1 of your Leader or Character cards gains +1000 power during this turn, and draw 1 card. [Trigger] Look at 5 cards from the top of your deck and |
| OP06-062 | Vinsmoke Judge | character | rest,play-from,trash-hand,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may trash 2 cards from your hand: Play up to 4 { |
| OP06-065 | Vinsmoke Niji | character | ko,choose-one,return-hand | [On Play] If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, choose one:• K.O. up to 1 of your opponent's  |
| OP06-067 | Vinsmoke Yonji | character | power-buff | If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, this Character gains +1000 power.[Blocker] (After your  |
| OP06-072 | Cosette | character | keyword | If your Leader has the {GERMA 66} type and the number of DON!! cards on your field is at least 2 less than the number on your opponent's field, this Character g |
| OP06-081 | Absalom | character | ko | [On Play] You may return 2 cards from your trash to the bottom of your deck in any order: K.O. up to 1 Character with a cost of 2 or less. |
| OP06-093 | Perona | character | choose-one | [On Play] If your opponent has 5 or more cards in their hand, choose one:• Your opponent trashes 1 card from their hand.• Give up to 1 of your opponent's Charac |
| OP06-096 | ...Nothing...at All!!! | event | add-life-to-hand,ko-immunity | [Counter] You may add 1 card from the top of your Life cards to your hand: Your Characters with a cost of 7 or less cannot be K.O.'d in battle during this turn. |
| OP06-109 | Denjiro | character | ko-immunity | [DON!! x2] If your opponent has 3 or less Life cards, this Character cannot be K.O.'d by effects. [Trigger] If your opponent has 3 or less Life cards, play this |
| OP06-113 | Raki | character | keyword | If you have a {Shandian Warrior} type Character other than [Raki], this Character gains [Blocker].(After your opponent declares an attack, you may rest this car |
| OP06-115 | You're the One Who Should Disappear. | event | power-buff,trash-hand | [Counter] You may trash 1 card from your hand: Up to 1 of your Leader or Character cards gains +3000 power during this battle. [Trigger] If you have 0 Life card |
| OP06-117 | The Ark Maxim | stage | ko | [Activate: Main] [Once Per Turn] You may rest this card and 1 of your [Enel] cards: K.O. all of your opponent's Characters with a cost of 2 or less. |
| OP07-006 | Sterry | character | draw,power-buff,trash-hand | [On Play] You may give your 1 active Leader −5000 power during this turn: Draw 1 card and trash 1 card from your hand. |
| OP07-010 | Baccarat | character | power-buff,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Your Opponent's Attack] [Once Per Turn] Y |
| OP07-017 | Dragon Breath | event | ko | [Main] K.O. up to 1 of your opponent's Characters with 3000 power or less and up to 1 of your opponent's Stages with a cost of 1 or less. [Trigger] Activate thi |
| OP07-018 | KEEP OUT | event | power-buff | [Counter] Up to 1 of your {Revolutionary Army} type Characters gains +2000 power until the end of your next turn. [Trigger] Activate this card's [Counter] effec |
| OP07-019 | Jewelry Bonney | leader | rest | [On Your Opponent's Attack] [Once Per Turn] ➀ (You may rest the specified number of DON!! cards in your cost area.): Rest up to 1 of your opponent's Leader or C |
| OP07-020 | Aladine | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] If your Leader has the {Fish-Man} t |
| OP07-023 | Caribou | character | power-buff | If you have 6 or more rested DON!! cards, this Character gains +1000 power.[Blocker] (After your opponent declares an attack, you may rest this card to make it  |
| OP07-024 | Koala | character | keyword | [On Your Opponent's Attack] You may rest this Character: Up to 1 of your {Fish-Man} type Characters with a cost of 5 or less gains [Blocker] during this turn.(A |
| OP07-025 | Coribou | character | play-from | [On Play] Play up to 1 [Caribou] with a cost of 4 or less from your hand rested. |
| OP07-029 | Basil Hawkins | character | keyword | If your Leader has the {Supernovas} type, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new targ |
| OP07-030 | Pappag | character | keyword | If you have a [Camie] Character, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new target of the |
| OP07-031 | Bartolomeo | character | draw,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Your Turn] [Once Per Turn] If a Character is |
| OP07-032 | Fisher Tiger | character | rest | This Character can attack Characters on the turn in which it is played.[On Play] If your Leader has the {Fish-Man} or {Merfolk} type, rest up to 1 of your oppon |
| OP07-033 | Monkey.D.Luffy | character | ko-immunity | If you have 3 or more Characters, your Characters with a cost of 3 or less other than [Monkey.D.Luffy] cannot be K.O.'d by your opponent's effects. |
| OP07-036 | Demonic Aura Nine-Sword Style Asura Demon Nine Flash | event | rest,power-buff | [Main] Up to 1 of your Leader or Character cards gains +3000 power during this turn. Then, you may rest 1 of your Characters with a cost of 3 or more. If you do |
| OP07-038 | Boa Hancock | leader | draw | [Your Turn] [Once Per Turn] This effect can be activated when a Character is removed from the field by your effect. If you have 5 or less cards in your hand, dr |
| OP07-042 | Gecko Moria | character | move-bottom-deck | [Once Per Turn] If your Leader has the {The Seven Warlords of the Sea} type and this Character would be removed from the field by your opponent's effect, you ma |
| OP07-048 | Donquixote Doflamingo | character | move-bottom-deck | [Activate: Main] [Once Per Turn] ➁ (You may rest the specified number of DON!! cards in your cost area.): Reveal 1 card from the top of your deck. If that card  |
| OP07-049 | Buckin | character | play-from | [On Play] Play up to 1 [Edward Weevil] with a cost of 4 or less from your hand rested. |
| OP07-050 | Boa Sandersonia | character | return-hand | [On Play] If you have 2 or more {Amazon Lily} or {Kuja Pirates} type Characters on your field, return up to 1 of your opponent's Characters with a cost of 3 or  |
| OP07-052 | Boa Marigold | character | move-bottom-deck | [On Play] If you have 2 or more {Amazon Lily} or {Kuja Pirates} type Characters on your field, place up to 1 Character with a cost of 2 or less at the bottom of |
| OP07-053 | Portgas.D.Ace | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Draw 2 cards and place 2 cards from |
| OP07-055 | Snake Dance | event | power-buff,return-hand | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, return up to 1 of your Characters to the owner's hand. [Trigger] |
| OP07-056 | Slave Arrow | event | draw,power-buff,move-bottom-deck,return-hand | [Counter] You may return 1 of your Characters with a cost of 2 or more to the owner's hand: Up to 1 of your Leader or Character cards gains +4000 power during t |
| OP07-057 | Perfume Femur | event | draw,power-buff | [Main] Select up to 1 of your {The Seven Warlords of the Sea} type Leader or Character cards and that card gains +2000 power during this turn. Then, if the sele |
| OP07-058 | Island of Women | stage | trash-hand,return-hand | [Activate: Main] You may trash 1 card from your hand and rest this Stage: If your Leader has the {Kuja Pirates} type, return up to 1 of your {Amazon Lily} or {K |
| OP07-061 | Vinsmoke Sanji | character | draw,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {The Vinsmoke Family} type,  |
| OP07-069 | Pickles | character | ko-immunity | If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, your {Foxy Pirates} type Characters other than [Pickles |
| OP07-071 | Foxy | character | power-buff | [Opponent's Turn] If your Leader has the {Foxy Pirates} type, give all of your opponent's Characters −1000 power.[Activate: Main] [Once Per Turn] Add up to 1 DO |
| OP07-072 | Porche | character | search,play-from,move-bottom-deck,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Look at 5 cards from the top of your deck; reveal u |
| OP07-073 | Monkey.D.Luffy | character | set-active | [Activate: Main] [Once Per Turn] DON!! −3 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your opponent has 3 or mo |
| OP07-075 | Slow-Slow Beam | event | power-buff,don-minus | [Counter] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Give up to 1 each of your opponent's Leader and Cha |
| OP07-076 | Slow-Slow Beam Sword | event | rest,power-buff,don-minus | [Counter] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Up to 1 of your Leader or Character cards gains +20 |
| OP07-077 | We're Going to Claim the One Piece!!! | event | search,move-bottom-deck | [Main] If your Leader has the {Animal Kingdom Pirates} or {Big Mom Pirates} type, look at 5 cards from the top of your deck; reveal up to 1 {Animal Kingdom Pira |
| OP07-078 | Megaton Nine-Tails Rush | event | set-active | [Main] If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, set up to 1 of your [Foxy] cards as active. [Tri |
| OP07-079 | Rob Lucci | leader | trash-top | [When Attacking] You may trash 2 cards from the top of your deck: Give up to 1 of your opponent's Characters −1 cost during this turn. |
| OP07-080 | Kaku | character | move-bottom-deck | [On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of your deck in any order: Give up to 1 of your opponent's Characters − |
| OP07-083 | Gecko Moria | character | keyword,move-bottom-deck | [Activate: Main] You may place 4 {Thriller Bark Pirates} type cards from your trash at the bottom of your deck in any order: This Character gains [Banish] and + |
| OP07-085 | Stussy | character | ko | [On Play] You may trash 1 of your Characters: K.O. up to 1 of your opponent's Characters. |
| OP07-087 | Baskerville | character | power-buff | [Your Turn] If your opponent has a Character with a cost of 0, this Character gains +3000 power. |
| OP07-092 | Joseph | character | ko,move-bottom-deck | [On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of your deck in any order: K.O. up to 1 of your opponent's Characters w |
| OP07-093 | Rob Lucci | character | move-bottom-deck | [On Play] You may place 3 cards from your trash at the bottom of your deck in any order: Your opponent trashes 1 card from their hand. Then, you may place up to |
| OP07-094 | Shave | event | power-buff,return-hand | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have 10 or more cards in your trash, return up to 1 of yo |
| OP07-096 | Tempest Kick | event | draw,ko | [Main] Draw 1 card. Then, if you have 10 or more cards in your trash, give up to 1 of your opponent's Characters −3 cost during this turn. [Trigger] K.O. up to  |
| OP07-098 | Atlas | character | ko-immunity | If you have less Life cards than your opponent, this Character cannot be K.O.'d in battle. [Trigger] If your Leader is [Vegapunk], play this card. |
| OP07-099 | Usopp | character | power-buff | [Trigger] Up to 1 of your {Egghead} type Leader or Character cards gains +2000 power until the end of your next turn. |
| OP07-102 | Jinbe | character | return-hand | [Trigger] Return up to 1 of your opponent's Characters with a cost of 4 or less to the owner's hand and add this card to your hand. |
| OP07-103 | Tony Tony.Chopper | character | keyword | [Trigger] Up to 1 of your {Egghead} type Characters gains [Blocker] during this turn. Then, add this card to your hand. |
| OP07-106 | Fuza | character | ko | [DON!! x1] [When Attacking] If you have 1 or less Life cards, K.O. up to 1 of your opponent's Characters with a cost of 3 or less. |
| OP07-110 | York | character | ko | [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: K.O. up to 1 of your opponent's Characters with a cost of 2 or less. [Trigg |
| OP07-112 | Lucy | character | rest | [When Attacking] [Once Per Turn] You may add 1 card from the top or bottom of your Life cards to your hand: You may rest up to 1 of your opponent's Characters w |
| OP07-117 | Egghead | stage | set-active | [End of Your Turn] If you have 3 or less Life cards, set up to 1 {Egghead} type Character with a cost of 5 or less as active. [Trigger] Play this card. |
| OP08-002 | Marco | leader | draw,power-buff | [DON!! x1] [Activate: Main] [Once Per Turn] Draw 1 card and place 1 card from your hand at the top or bottom of your deck. Then, give up to 1 of your opponent's |
| OP08-004 | Kuromarimo | character | ko | [On Play] If you have [Chess], K.O. up to 1 of your opponent's Characters with 3000 power or less. |
| OP08-005 | Chess | character | power-buff,play-from | [On Play] Give up to 1 of your opponent's Characters −2000 power during this turn. Then, if you don't have [Kuromarimo], play up to 1 [Kuromarimo] from your han |
| OP08-006 | Chessmarimo | character | power-buff | [Your Turn] If you have [Kuromarimo] and [Chess] in your trash, this Character gains +2000 power. |
| OP08-008 | Dalton | character | power-buff,keyword,add-life-to-hand | [On Play] Give up to 1 of your opponent's Characters −1000 power during this turn.[DON!! x1] [Activate: Main] [Once Per Turn] You may add 1 card from the top of |
| OP08-010 | Hiking Bear | character | power-buff | [DON!! x1] [Activate: Main] [Once Per Turn] Up to 1 of your {Animal} type Characters other than this Character gains +1000 power during this turn. |
| OP08-013 | Robson | character | keyword | [DON!! x2] This Character gains [Rush].(This card can attack on the turn in which it is played.) |
| OP08-021 | Carrot | leader | rest | [Activate: Main] [Once Per Turn] If you have a {Minks} type Character, rest up to 1 of your opponent's Characters with a cost of 5 or less. |
| OP08-028 | Nekomamushi | character | keyword | [On Play] If your opponent has 7 or more rested cards, this Character gains [Rush] during this turn.(This card can attack on the turn in which it is played.) |
| OP08-029 | Pekoms | character | ko-immunity | If this Character is active, your {Minks} type Characters with a cost of 3 or less other than [Pekoms] cannot be K.O.'d by effects. |
| OP08-030 | Pedro | character | ko,rest,choose-one | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] Choose one:• Rest up to 1 of your o |
| OP08-033 | Roddy | character | ko | [On Play] If your Leader has the {Minks} type and your opponent has 7 or more rested cards, K.O. up to 1 of your opponent's rested Characters with a cost of 2 o |
| OP08-036 | Electrical Luna | event | rest | [Main] All of your opponent's rested Characters with a cost of 7 or less will not become active in your opponent's next Refresh Phase. [Trigger] Rest up to 1 of |
| OP08-037 | Garchu | event | draw,rest | [Main] You may rest 1 of your {Minks} type Characters: Rest up to 1 of your opponent's Characters. [Trigger] Draw 1 card. |
| OP08-040 | Atmos | character | return-hand | [On Play] You may reveal 2 cards with a type including "Whitebeard Pirates" from your hand: If your Leader's type includes "Whitebeard Pirates", return up to 1  |
| OP08-041 | Aphelandra | character | move-bottom-deck,return-hand | [Activate: Main] You may return this Character to the owner's hand: If your Leader has the {Kuja Pirates} type, place up to 1 of your opponent's Characters with |
| OP08-044 | Kingdew | character | power-buff | [Activate: Main] [Once Per Turn] You may reveal 2 cards with a type including "Whitebeard Pirates" from your hand: This Character gains +2000 power during this  |
| OP08-045 | Thatch | character | draw | If this Character would be removed from the field by your opponent's effect or K.O.'d, trash this Character and draw 1 card instead. |
| OP08-047 | Jozu | character | return-hand | [On Play] You may return 1 of your Characters other than this Character to the owner's hand: Return up to 1 Character with a cost of 6 or less to the owner's ha |
| OP08-049 | Speed Jil | character | keyword | [On Play] Reveal 1 card from the top of your deck and place it at the top or bottom of your deck. If the revealed card's type includes "Whitebeard Pirates", thi |
| OP08-050 | Namule | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Draw 2 cards and place 2 cards from |
| OP08-053 | Thank You...for Loving Me!! | event | draw,search | [Main] If your Leader's type includes "Whitebeard Pirates", look at 3 cards from the top of your deck; reveal up to 1 card with a type including "Whitebeard Pir |
| OP08-055 | Phoenix Brand | event | move-bottom-deck | [Main] You may reveal 2 cards with a type including "Whitebeard Pirates" from your hand: Place up to 1 Character with a cost of 6 or less at the bottom of the o |
| OP08-056 | Moby Dick | stage | draw | [Your Turn] [Once Per Turn] When your Character with a type including "Whitebeard Pirates" is removed from the field by an effect, draw 1 card. Then, place 1 ca |
| OP08-057 | King | leader | draw,choose-one | [Activate: Main] [Once Per Turn] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Choose one:• If you have 5 o |
| OP08-060 | King | character | keyword,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your opponent has 5 or more DON!! cards on their |
| OP08-062 | Charlotte Katakuri | character | play-from | [Activate: Main] You may trash this Character: If your Leader has the {Big Mom Pirates} type, play up to 1 [Charlotte Katakuri] from your hand with a cost of 3  |
| OP08-069 | Charlotte Linlin | character | trash-hand,don-minus | [On Play] DON!! −1, You may trash 1 card from your hand: Add up to 1 card from the top of your deck to the top of your Life cards. Then, add up to 1 of your opp |
| OP08-075 | Candy Maiden | event | rest,don-minus | [Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Rest up to 1 of your opponent's Characters with a cost |
| OP08-077 | Conquest of the Sea | event | ko | [Main] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {Animal Kingdom Pirates} or {Bi |
| OP08-079 | Kaido | character | trash-hand | [Activate: Main] [Once Per Turn] You may trash 1 card from your hand: If this Character was played on this turn, trash up to 1 of your opponent's Characters wit |
| OP08-081 | Guernica | character | ko,move-bottom-deck | [When Attacking] You may place 3 cards with a type including "CP" from your trash at the bottom of your deck in any order: K.O. up to 1 of your opponent's Chara |
| OP08-084 | Jack | character | draw,ko,trash-hand | This Character gains +4 cost.[Activate: Main] You may rest this Character: Draw 1 card and trash 1 card from your hand. Then, K.O. up to 1 of your opponent's Ch |
| OP08-086 | Ginrummy | character | draw,trash-hand | [On Play] If your opponent has a Character with a cost of 0, draw 2 cards and trash 2 cards from your hand. |
| OP08-094 | Imperial Flame | event | ko,move-bottom-deck | [Main]/[Counter] You may place 3 cards from your trash at the bottom of your deck in any order: K.O. up to 1 of your opponent's Characters with a cost of 2 or l |
| OP08-096 | People's Dreams Don't Ever End!! | event | power-buff,play-from,trash-top | [Counter] Trash 1 card from the top of your deck. If the trashed card has a cost of 6 or more, up to 1 of your Leader or Character cards gains +5000 power durin |
| OP08-102 | Charlotte Opera | character | ko,trash-hand | [On Play] You may trash 1 card from your hand: K.O. up to 1 of your opponent's Characters with a cost equal to or less than your number of Life cards. |
| OP08-105 | Jewelry Bonney | character | draw,trash-hand | [DON!! x1] [Your Turn] [Once Per Turn] When a card is removed from your opponent's Life cards, draw 2 cards and trash 1 card from your hand. [Trigger] Draw 2 ca |
| OP08-106 | Nami | character | draw,ko | [On Play] You may trash 1 card with a [Trigger] from your hand: K.O. up to 1 of your opponent's Characters with a cost of 5 or less. Then, if you have 3 or less |
| OP08-114 | S-Hawk | character | power-buff,trash-hand,ko-immunity | [DON!! x1] If you have less Life cards than your opponent, this Character cannot be K.O.'d in battle by <Slash> attribute cards and gains +2000 power. [Trigger] |
| OP08-115 | The Earth Will Not Lose! | event | draw,power-buff,play-from,trash-hand | [Counter] If your Leader has the {Shandian Warrior} type, up to 1 of your Leader or Character cards gains +3000 power during this battle. Then, play up to 1 [Up |
| OP08-116 | Burn Bazooka | event | power-buff | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, you may add 1 card from the top or bottom of your Life cards to  |
| OP08-117 | Burn Blade | event | ko,add-life-to-hand | [Main] You may trash 1 card from the top of your Life cards: K.O. up to 1 of your opponent's Characters with a cost of 7 or less. [Trigger] You may add 1 card f |
| OP08-119 | Kaido & Linlin | character | don-minus | [When Attacking] DON!! −10: K.O. all Characters other than this Character. Then, add up to 1 card from the top of your deck to the top of your Life cards and tr |
| OP09-001 | Shanks | leader | power-buff | [Once Per Turn] This effect can be activated when your opponent attacks. Give up to 1 of your opponent's Leader or Character cards −1000 power during this turn. |
| OP09-004 | Shanks | character | power-buff | Give all of your opponent's Characters −1000 power.[Rush] (This card can attack on the turn in which it is played.) |
| OP09-005 | Silvers Rayleigh | character | draw,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If your opponent has 2 or more Char |
| OP09-007 | Heat | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Up to 1 of your Leader with 4000 po |
| OP09-010 | Bonk Punch | character | power-buff,play-from | [On Play] Play up to 1 [Monster] from your hand.[DON!! x1] [When Attacking] This Character gains +2000 power during this turn. |
| OP09-011 | Hongo | character | power-buff | [Activate: Main] You may rest this Character: If your Leader has the {Red-Haired Pirates} type, give up to 1 of your opponent's Characters −2000 power during th |
| OP09-015 | Lucky.Roux | character | ko | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] If your Leader has the {Red-Haired  |
| OP09-017 | Wire | character | keyword | [DON!! x1] If your Leader has 7000 power or more and the {Kid Pirates} type, this Character gains [Rush]. |
| OP09-019 | Nobody Hurts a Friend of Mine!!!! | event | draw,power-buff | [Main] If your Leader has the {Red-Haired Pirates} type, give up to 1 of your opponent's Characters −3000 power during this turn. Then, if your opponent has a C |
| OP09-021 | Red Force | stage | power-buff | [Activate: Main] You may rest this Stage: If your Leader has the {Red-Haired Pirates} type, give up to 1 of your opponent's Characters −1000 power during this t |
| OP09-022 | Lim | leader | play-from | Your Character cards are played rested.[Activate: Main] [Once Per Turn] You may rest 3 of your DON!! cards: Add up to 1 DON!! card from your DON!! deck and rest |
| OP09-023 | Adio | character | power-buff,set-active | [On Play] If your Leader has the {ODYSSEY} type, set up to 3 of your DON!! cards as active.[On Your Opponent's Attack] [Once Per Turn] You may rest 1 of your DO |
| OP09-030 | Trafalgar Law | character | play-from,return-hand | [On Play] You may return 1 of your Characters to the owner's hand: Play up to 1 {ODYSSEY} type Character card with a cost of 3 or less other than [Trafalgar Law |
| OP09-031 | Donquixote Doflamingo | character | set-active | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[End of Your Turn] If you have 2 or more rest |
| OP09-032 | Donquixote Rosinante | character | set-active | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Your Opponent's Attack] [Once Per Turn] S |
| OP09-036 | Monkey.D.Luffy | character | rest | [On Play] If you have 2 or more rested Characters, rest up to 1 of your opponent's DON!! cards or Characters with a cost of 6 or less. |
| OP09-039 | Gum-Gum Cuatro Jet Cross Shock Bazooka | event | ko,power-buff | [Counter] If your Leader has the {ODYSSEY} type and you have 2 or more rested Characters, up to 1 of your Leader or Character cards gains +2000 power during thi |
| OP09-042 | Buggy | leader | play-from,trash-hand | [Activate: Main] You may rest 5 of your DON!! cards and trash 1 card from your hand: Play up to 1 {Cross Guild} type Character card from your hand. |
| OP09-051 | Buggy | character | move-bottom-deck | [On Play] Place up to 1 of your opponent's Characters at the bottom of the owner's deck. Then, if you do not have 5 Characters with a cost of 5 or more, place t |
| OP09-052 | Marco | character | trash-hand | [Opponent's Turn] You may trash 1 card from your hand: When this Character is K.O.'d by your opponent's effect, play this Character card from your trash rested. |
| OP09-058 | Special Muggy Ball | event | return-hand | [Main] Your opponent chooses 1 of their Character with a cost of 6 or less and return to the owner's hand. [Trigger] Return up to 1 Character with a cost of 3 o |
| OP09-059 | Murder at the Steam Bath | event | draw,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +3000 power during this battle. Then, trash up to 2 cards from your hand. Trash the same number of car |
| OP09-060 | Emptee Bluffs Island | stage | draw,move-bottom-deck | [Activate: Main] You may place 2 cards from your hand at the bottom of your deck in any order and rest this Stage: If your Leader has the {Cross Guild} type, dr |
| OP09-064 | Killer | character | don-minus,set-active | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Set up to 1 of your {Kid Pirates} type Leader as ac |
| OP09-065 | Sanji | character | rest,keyword | [On Play] You may return 1 or more DON!! cards from your field to your DON!! deck: This Character gains [Rush] during this turn. Then, rest up to 1 of your oppo |
| OP09-070 | Nami | character | give-don | [On Play] You may return 1 or more DON!! cards from your field to your DON!! deck: Give up to 2 rested DON!! cards to your Leader or 1 of your Characters. |
| OP09-073 | Brook | character | power-buff | [When Attacking] You may return 1 or more DON!! cards from your field to your DON!! deck: Give up to 2 of your opponent's Characters −2000 power during this tur |
| OP09-075 | Eustass"Captain"Kid | character | add-life-to-hand | [On Play] You may add 1 card from the top of your Life cards to your hand: If your Leader has the {Kid Pirates} type, add up to 1 DON!! card from your DON!! dec |
| OP09-083 | Van Augur | character | draw | [Activate: Main] You may rest this Character: If your Leader has the {Blackbeard Pirates} type, give up to 1 of your opponent's Characters −3 cost during this t |
| OP09-088 | Shiryu | character | draw,trash-hand | [DON!! x1] [When Attacking] You may trash 2 cards from your hand: Draw 2 cards. |
| OP09-089 | Stronger | character | draw,trash-hand | [Activate: Main] You may trash 1 card from your hand and trash this Character: If your Leader has the {Blackbeard Pirates} type, draw 1 card. Then, give up to 1 |
| OP09-090 | Doc Q | character | draw,ko | [Activate: Main] You may rest this Character: If your Leader has the {Blackbeard Pirates} type, K.O. up to 1 of your opponent's Characters with a cost of 1 or l |
| OP09-092 | Marshall.D.Teach | character | draw,trash-hand | [Activate: Main] You may rest this Character: If the number of cards in your hand is at least 3 less than the number in your opponent's hand, draw 2 cards and t |
| OP09-095 | Laffitte | character | search,move-bottom-deck | [Activate: Main] You may rest 1 of your DON!! cards and this Character: Look at 5 cards from the top of your deck; reveal up to 1 {Blackbeard Pirates} type card |
| OP09-099 | Fullalead | stage | search,move-bottom-deck,trash-hand | [Activate: Main] You may trash 1 card from your hand and rest this Stage: Look at 3 cards from the top of your deck; reveal up to 1 {Blackbeard Pirates} type ca |
| OP09-102 | Professor Clover | character | search,move-bottom-deck | [On Play] If your Leader is [Nico Robin], look at 3 cards from the top of your deck; reveal up to 1 card with a [Trigger] and add it to your hand. Then, place t |
| OP09-103 | Koala | character | draw,play-from | [Blocker][On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Play up to 1 {Revolutionary Army} type Character card with a cost  |
| OP09-104 | Sabo | character | draw | [On Play] Add up to 1 {Revolutionary Army} type Character card from your hand to the top of your Life cards face-up. Then, if you have 2 or more Life cards, add |
| OP09-105 | Sanji | character | trash-hand | [Trigger] If your Leader has the {Egghead} type, add up to 1 card from the top of your deck to the top of your Life cards. Then, trash 2 cards from your hand. |
| OP09-106 | Nico Olvia | character | draw,power-buff,trash-hand | [On Play] Up to 1 of your [Nico Robin] Leader gains +3000 power during this turn. [Trigger] If your Leader is [Nico Robin], draw 3 cards and trash 2 cards from  |
| OP09-107 | Nico Robin | character | play-from | [On Play] If your opponent has 3 or more Life cards, trash up to 1 card from the top of your opponent's Life cards. [Trigger] Play up to 1 yellow Character card |
| OP09-112 | Belo Betty | character | draw | [On Play] If you have 2 or less Life cards, draw 1 card. [Trigger] If your Leader has the {Revolutionary Army} type and you and your opponent have a total of 5  |
| OP09-114 | Lindbergh | character | ko | [On Play] If you and your opponent have a total of 5 or less Life cards, K.O. up to 1 of your opponent's Characters with 2000 power or less. [Trigger] If you an |
| OP09-115 | Ice Block Partisan | event | draw,ko | [Main] K.O. up to 1 of your opponent's Characters with a cost of 3 or less and a [Trigger]. [Trigger] Draw 1 card. |
| OP09-116 | Never Underestimate the Power of Miracles!! | event | power-buff,play-from | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. [Trigger] Play up to 1 {Revolutionary Army} type Character card with a |
| OP09-117 | Dereshi! | event | draw,search,move-bottom-deck | [Main] Look at 5 cards from the top of your deck; reveal up to 2 cards with a [Trigger] other than [Dereshi!] and add them to your hand. Then, place the rest at |
| OP09-119 | Monkey.D.Luffy | character | draw,keyword | [On Play] You may return 1 or more DON!! cards from your field to your DON!! deck: Draw 1 card and this Character gains [Rush] during this turn. |
| OP10-001 | Smoker | leader | set-active | [Opponent's Turn] All of your {Navy} or {Punk Hazard} type Characters gain +1000 power.[Activate: Main] [Once Per Turn] If you have a Character with 7000 power  |
| OP10-002 | Caesar Clown | leader | ko,return-hand | [DON!! x2] [When Attacking] You may return 1 of your {Punk Hazard} type Characters with a cost of 2 or more to the owner's hand: K.O. up to 1 of your opponent's |
| OP10-003 | Sugar | leader | set-active | [End of Your Turn] If you have a {Donquixote Pirates} type Character with 6000 power or more, set up to 1 of your DON!! cards as active.[Opponent's Turn] [Once  |
| OP10-005 | Sanji | character | draw,power-buff | [Your Turn] This Character gains +3000 power.[On K.O.] Draw 1 card. |
| OP10-008 | Scotch | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If you don't have [Rock], play up t |
| OP10-010 | Chadros.Higelyges (Brownbeard) | character | power-buff | [When Attacking] If you have 1 or less Characters with 6000 power or more, this Character gains +1000 power during this turn. |
| OP10-011 | Tony Tony.Chopper | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] This Character gains +2000  |
| OP10-016 | Monet | character | power-buff,give-don | [Activate: Main] You may rest this Character: Give up to 2 rested DON!! cards to your Leader or 1 of your Characters. Then, give up to 1 of your opponent's Char |
| OP10-017 | Rock | character | play-from | [On Play] If you don't have [Scotch], play up to 1 [Scotch] from your hand. |
| OP10-018 | Ten-Layer Igloo | event | power-buff | [Counter] Up to 1 of your Leader or Character cards gains +3000 power during this battle. Then, give up to 1 of your opponent's Leader or Character cards −2000  |
| OP10-019 | Divine Departure | event | ko,power-buff | [Main] You may rest 5 of your DON!! cards: K.O. up to 1 of your opponent's Characters with 8000 power or less.[Counter] Up to 1 of your Leader gains +3000 power |
| OP10-021 | Punk Hazard | stage | give-don | [Activate: Main] You may rest this Stage: If your Leader is [Caesar Clown], give up to 1 rested DON!! card to your Leader or 1 of your Characters. |
| OP10-022 | Trafalgar Law | leader | return-hand | [DON!! x1] [Activate: Main] [Once Per Turn] If the total cost of your Characters is 5 or more, you may return 1 of your Characters to the owner's hand: Reveal 1 |
| OP10-026 | Kin'emon | character | play-from,move-bottom-deck | [Activate: Main] You may place this Character and 1 [Kin'emon] with 0 power from your trash at the bottom of your deck in any order: Play up to 1 [Kin'emon] wit |
| OP10-027 | Kin'emon | character | play-from,move-bottom-deck | [Activate: Main] You may place this Character and 1 [Kin'emon] with 1000 power from your trash at the bottom of your deck in any order: Play up to 1 [Kin'emon]  |
| OP10-028 | Kouzuki Momonosuke | character | search,move-bottom-deck | [Activate: Main] You may rest 2 of your DON!! cards and trash this Character: Look at 5 cards from the top of your deck; reveal up to 2 {The Akazaya Nine} type  |
| OP10-030 | Smoker | character | set-active | [Banish] (When this card deals damage, the target card is trashed without activating its Trigger.)[Activate: Main] Set up to 1 of your DON!! cards as active. Th |
| OP10-034 | Franky | character | add-life-to-hand | [Once Per Turn] If this Character would be K.O.'d in battle, you may add 1 card from the top of your Life cards to your hand instead. |
| OP10-035 | Brook | character | rest | [On K.O.] Rest up to 1 of your opponent's Leader or Character cards with a cost of 5 or less. |
| OP10-036 | Perona | character | set-active | [Your Turn] [Once Per Turn] If a Character is rested by your effect, set up to 1 of your DON!! cards as active. |
| OP10-037 | Lim | character | set-active | [Once Per Turn] If this Character would be removed from the field by your opponent's effect, you may rest 1 of your {ODYSSEY} type Characters instead.[End of Yo |
| OP10-038 | Roronoa Zoro | character | power-buff | [Opponent's Turn] If you have 2 or more rested Characters, this Character gains +2000 power. |
| OP10-042 | Usopp | leader | draw | All of your {Dressrosa} type Characters with a cost of 2 or more gain +1 cost.[Opponent's Turn] [Once Per Turn] This effect can be activated when your {Dressros |
| OP10-043 | Moocy | character | keyword | [On Play] You may rest 1 of your {Dressrosa} type Leader or Stage cards: Up to 1 of your [Monkey.D.Luffy] Characters gains [Banish] during this turn. |
| OP10-044 | Cub | character | return-hand | [On Play] You may rest 1 of your {Dressrosa} type Leader or Stage cards: Return up to 1 of your opponent's Characters with a cost of 1 or less to the owner's ha |
| OP10-047 | Koala | character | power-buff,return-hand | [When Attacking] You may return 1 of your {Revolutionary Army} type Characters with a cost of 3 or more to the owner's hand: This Character gains +3000 power du |
| OP10-048 | Sai | character | return-hand | [On Play] You may rest 1 of your {Dressrosa} type Leader or Stage cards: Return up to 1 of your opponent's Characters with a cost of 1 or less to the owner's ha |
| OP10-049 | Sabo | character | return-hand | If your Character with a base cost of 7 or less other than [Sabo] would be removed from the field by your opponent's effect, you may return this Character to th |
| OP10-052 | Bartolomeo | character | move-bottom-deck | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Place up to 1 Character with a cost |
| OP10-053 | Bian | character | keyword | If you have a {The Tontattas} type Character other than [Bian], this Character gains [Blocker]. |
| OP10-055 | Marco | character | return-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] Return up to 1 of your opponent's C |
| OP10-056 | Mansherry | character | return-hand | [On Play] You may rest 1 of your {Dressrosa} type Leader or Stage cards, and return 1 of your {Dressrosa} type Characters with a cost of 4 or more to the owner' |
| OP10-057 | Leo | character | search,move-bottom-deck,trash-hand | [On Play] You may rest your Leader or 1 of your Stage cards: If your Leader is [Usopp], look at 5 cards from the top of your deck; reveal up to 2 {Dressrosa} ty |
| OP10-058 | Rebecca | character | draw,search | [On Play] If there is a Character with a cost of 8 or more, draw 1 card. Then, reveal up to 2 {Dressrosa} type Character cards with a cost of 7 or less other th |
| OP10-062 | Violet | character | don-minus | [Blocker][On K.O.] DON!! −1: If your Leader has the {Donquixote Pirates} type, add up to 1 purple Event from your trash to your hand. |
| OP10-063 | Vinsmoke Sanji | character | search,move-bottom-deck | [On Play] If your Leader's type includes "GERMA", look at 5 cards from the top of your deck; reveal up to 1 card with a type including "GERMA" and add it to you |
| OP10-065 | Sugar | character | search,move-bottom-deck | [Activate: Main] You may rest 1 of your DON!! cards and this Character: Look at 5 cards from the top of your deck; reveal up to 1 {Donquixote Pirates} type card |
| OP10-066 | Giolla | character | rest | [On Your Opponent's Attack] [Once Per Turn] You may rest 2 of your DON!! cards: Rest up to 1 of your opponent's Characters with a cost of 4 or less. |
| OP10-067 | Senor Pink | character | don-minus,set-active | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Add up to 1 purple Event with a cost of 5 or less f |
| OP10-069 | Fighting Fish | character | ko,don-minus | [DON!! x1] [When Attacking] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): K.O. up to 1 of your opponent's C |
| OP10-071 | Donquixote Doflamingo | character | play-from,don-minus | [On Play] DON!! −1: Play up to 1 {Donquixote Pirates} type Character card with a cost of 5 or less from your hand.[On Your Opponent's Attack] [Once Per Turn] Yo |
| OP10-072 | Donquixote Rosinante | character | draw,set-active | [On Play] You may trash 1 Event from your hand: Draw 2 cards.[End of Your Turn] If you have 7 or more DON!! cards on your field, set up to 2 of your DON!! cards |
| OP10-080 | Little Black Bears | event | draw,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 7 or more DON!! cards on your field and 5 or less ca |
| OP10-081 | Usopp | character | ko,trash-top | [On Play] You may rest 1 of your {Dressrosa} type Leader or Stage cards: K.O. up to 1 of your opponent's Characters with a cost of 2 or less. Then, trash 2 card |
| OP10-082 | Kuzan | character | draw,play-from | This Character cannot be removed from the field by your opponent's effects.[Activate: Main] You may trash this Character: Draw 1 card. Then, play up to 1 {Black |
| OP10-085 | Jesus Burgess | character | keyword | [DON!! x1] If you have 8 or more cards in your trash, this Character gains [Rush]. |
| OP10-086 | Shiryu | character | ko,power-buff | [Opponent's Turn] This Character gains +2000 power.[Activate: Main] [Once Per Turn] If your Leader has the {Blackbeard Pirates} type, and this Character was pla |
| OP10-087 | Tony Tony.Chopper | character | trash-top | [Activate: Main] You may rest this Character and 1 of your {Dressrosa} type Leader or Stage cards: If your opponent has 5 or more cards in their hand, your oppo |
| OP10-088 | Nami | character | draw,trash-top | [Activate: Main] You may rest this Character and 1 of your {Dressrosa} type Leader or Stage cards: Draw 1 card. Then, trash 2 cards from the top of your deck. |
| OP10-091 | Brook | character | ko,trash-top | [Activate: Main] You may rest this Character and 1 of your {Dressrosa} type Leader or Stage cards: K.O. up to 1 of your opponent's Characters with a cost of 1 o |
| OP10-092 | Perona | character | power-buff,move-bottom-deck | [Activate: Main] [Once Per Turn] You may place 2 {Thriller Bark Pirates} type cards from your trash at the bottom of your deck in any order: Up to 1 of your Cha |
| OP10-094 | Ryuma | character | keyword | [DON!! x1] This Character gains [Double Attack]. |
| OP10-095 | Roronoa Zoro | character | ko,trash-top | [On Play] You may rest 1 of your {Dressrosa} type Leader or Stage cards: K.O. up to 1 of your opponent's Characters with a cost of 4 or less. Then, trash 2 card |
| OP10-096 | There’s No Longer Any Need for the Seven Warlords of the Sea!!! | event | ko | [Main] K.O. up to 1 of your opponent's {The Seven Warlords of the Sea} type Characters with a cost of 8 or less. [Trigger] K.O. up to 1 of your opponent's {The  |
| OP10-097 | Gum-Gum Rhino Schneider | event | draw,power-buff,keyword,trash-hand | [Main] Up to 1 of your {Dressrosa} type Characters gains +2000 power during this turn. Then, if you have 10 or more cards in your trash, that card gains [Banish |
| OP10-100 | Inazuma | character | rest | [DON!! x1] [When Attacking] Rest up to 1 of your opponent's Characters with a cost equal to or less than the total of your and your opponent's Life cards. [Trig |
| OP10-104 | Caribou | character | ko-immunity | [DON!! x1] If your Leader has the {Supernovas} type and your opponent has 3 or more Life cards, this Character cannot be K.O.'d in battle. |
| OP10-106 | Killer | character | search,move-bottom-deck | [On K.O.] If your Leader has the {Supernovas} type, look at 3 cards from the top of your deck; reveal up to 1 {Supernovas} or {Kid Pirates} type card and add it |
| OP10-108 | Scratchmen Apoo | character | keyword | If you have a yellow {Supernovas} type Character other than [Scratchmen Apoo], this Character gains [Blocker]. |
| OP10-109 | Basil Hawkins | character | draw,trash-hand | [On K.O.] Trash up to 1 card from the top of your opponent's Life cards. [Trigger] Draw 2 cards and trash 1 card from your hand. |
| OP10-112 | Eustass"Captain"Kid | character | draw,trash-hand | [On Play] You may rest this Character: Trash up to 1 card from the top of your opponent's Life cards.[End of Your Turn] If your opponent has 2 or less Life card |
| OP10-113 | Roronoa Zoro | character | keyword,trash-hand | If you have less Life cards than your opponent, this Character gains [Rush]. [Trigger] You may trash 1 card from your hand: If your Leader has the {Supernovas}  |
| OP10-114 | X.Drake | character | rest | [Activate: Main] You may rest this Character: If the number of your Life cards is equal to or less than the number of your opponent's Life cards, rest up to 1 o |
| OP10-116 | Damned Punk | event | draw,ko,trash-hand,peek-life | [Main] Look at up to 1 card from the top of your or your opponent's Life cards and place it at the top or bottom of the Life cards. Then, K.O. up to 1 of your o |
| OP10-117 | ROOM | event | draw,power-buff,set-active | [Counter] If you have 1 or less Life cards, up to 1 of your Leader or Character cards gains +3000 power during this battle. Then, set up to 1 of your Characters |
| OP10-118 | Monkey.D.Luffy | character | move-bottom-deck,ko-immunity | Once per turn, this Character cannot be K.O.'d by your opponent's effects.[When Attacking] You may place 3 cards from your trash at the bottom of your deck in a |
| OP10-119 | Trafalgar Law | character | search,give-don | [On Play] Reveal up to 1 {Supernovas} type Character card from your hand and add it to the top of your Life cards face-down. Then, give up to 1 rested DON!! car |
| OP11-001 | Koby | leader | move-bottom-deck | Your {SWORD} type Characters can attack Characters on the turn in which they are played.[Once Per Turn] If your {Navy} type Character with 7000 base power or le |
| OP11-005 | Smoker | character | ko-immunity | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[DON!! x1] This Character cannot be K.O.'d by |
| OP11-007 | Tashigi | character | power-buff | [Activate: Main] You may rest this Character: If your Leader has the {Navy} type, up to 1 of your {Navy} type Characters gains +2000 power during this turn. |
| OP11-021 | Jinbe | leader | set-active | [End of Your Turn] If you have 6 or less cards in your hand, set up to 1 of your {Fish-Man} or {Merfolk} type Characters and up to 1 of your DON!! cards as acti |
| OP11-023 | Arlong | character | rest | If your Leader has the {Fish-Man} type, you have 3 or less Life cards and your opponent has 5 or more rested cards, give this card in your hand −3 cost. [Trigge |
| OP11-024 | Aladine | character | play-from,trash-hand | When this Character is K.O.'d by your opponent's effect, you may trash 1 card from your hand and rest 1 of your DON!! cards. If you do, play up to 1 {Fish-Man}  |
| OP11-025 | Ishilly | character | power-buff | [On Your Opponent's Attack] [Once Per Turn] You may rest 1 of your DON!! cards and this Character: Up to 1 of your Leader or Character cards gains +1000 power d |
| OP11-030 | Shirahoshi | character | search,move-bottom-deck | [Activate: Main] You may rest 1 of your DON!! cards and this Character: Look at 5 cards from the top of your deck; reveal up to 1 {Neptunian} or {Fish-Man Islan |
| OP11-031 | Jinbe | character | rest | [On Play] If your Leader has the {Fish-Man} or {Merfolk} type, rest up to 1 of your opponent's Characters with a cost of 5 or less.[Activate: Main] [Once Per Tu |
| OP11-035 | Fisher Tiger | character | rest,play-from | When this Character is K.O.'d by your opponent's effect, you may rest 1 of your DON!! cards. If you do, play up to 1 {Fish-Man} or {Merfolk} type Character card |
| OP11-036 | Spotted Neptunian | character | search,move-bottom-deck | [On Play] If your Leader is [Shirahoshi], look at 5 cards from the top of your deck; reveal up to 1 {Neptunian} type card or [Shirahoshi] and add it to your han |
| OP11-038 | Gum-Gum Elephant Gatling | event | rest,power-buff | [Main] You may rest 1 of your DON!! cards: Rest up to 1 of your opponent's Characters with a cost of 5 or less.[Counter] Up to 1 of your Leader gains +3000 powe |
| OP11-039 | Vagabond Drill | event | rest,power-buff | [Counter] Up to 1 of your {Fish-Man} or {Merfolk} type Leader or Character cards gains +3000 power during this battle. Then, rest up to 1 of your opponent's Cha |
| OP11-040 | Monkey.D.Luffy | leader | search | This effect can be activated at the start of your turn. If you have 8 or more DON!! cards on your field, look at 5 cards from the top of your deck; reveal up to |
| OP11-041 | Nami | leader | draw,power-buff,trash-hand | [Your Turn] [Once Per Turn] This effect can be activated when a card is removed from your or your opponent's Life cards. If you have 7 or less cards in your han |
| OP11-042 | Vito | character | keyword | [On Play] You may trash 1 {Firetank Pirates} type card from your hand: This Character gains [Rush] during this turn.(This card can attack on the turn in which i |
| OP11-043 | Vinsmoke Ichiji | character | power-buff,trash-top | [Blocker][On Your Opponent's Attack] [Once Per Turn] This effect can be activated when you only have Characters with a type including "GERMA". Up to 1 of your L |
| OP11-046 | Vinsmoke Yonji | character | ko-immunity | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)If you only have Characters with a type inclu |
| OP11-049 | Carrot | character | power-buff,search | [On Play] Look at 3 cards from the top of your deck and place them at the top or bottom of the deck in any order.[On Your Opponent's Attack] You may trash this  |
| OP11-050 | Gotti | character | return-hand | [When Attacking] You may trash 1 {Firetank Pirates} type card from your hand: Return up to 1 Character with a cost of 1 or less to the owner's hand or place it  |
| OP11-054 | Nami | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If your Leader is multicolored, dra |
| OP11-056 | Brook | character | move-bottom-deck | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Place up to 1 Character with a base |
| OP11-057 | Pedro | character | keyword | If you have 4 or less cards in your hand, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new targ |
| OP11-062 | Charlotte Katakuri | leader | power-buff,search,don-minus | [When Attacking]/[On Your Opponent's Attack] [Once Per Turn] DON!! −1: Look at 1 card from the top of your opponent's deck. Then, this Leader gains +1000 power  |
| OP11-063 | Little Sadi | character | rest,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {Impel Down} type, rest up t |
| OP11-065 | Charlotte Anana | character | keyword | If you have a purple {Big Mom Pirates} type Character other than [Charlotte Anana], this Character gains [Blocker].(After your opponent declares an attack, you  |
| OP11-066 | Charlotte Oven | character | ko | [Activate: Main] You may rest this Character: Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed card has the chosen cost, K. |
| OP11-067 | Charlotte Katakuri | character | set-active | [Blocker][End of Your Turn] Set up to 2 of your {Big Mom Pirates} type Characters with a cost of 3 or more as active. Then, add up to 1 DON!! card from your DON |
| OP11-069 | Charlotte Brulee | character | add-life-to-hand | [On Play] You may add 1 card from the top of your Life cards to your hand: If your Leader has the {Big Mom Pirates} type, add up to 1 DON!! card from your DON!! |
| OP11-070 | Charlotte Pudding | character | search,move-bottom-deck,don-minus | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Big Mom Pirates} type card with a cost of 2 or more and add it to your hand. Then, place th |
| OP11-071 | Charlotte Perospero | character | draw,trash-hand | [Activate: Main] [Once Per Turn] You may trash 1 card from your hand: Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed card |
| OP11-073 | Charlotte Linlin | character | power-buff,keyword | If your Leader has the {Big Mom Pirates} type, this Character gains [Rush].[On Your Opponent's Attack] [Once Per Turn] DON!! −5: Choose a cost and reveal 1 card |
| OP11-074 | Streusen | character | rest,don-minus | [Activate: Main] [Once Per Turn] DON!! −1, You may rest this Character: Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed ca |
| OP11-076 | Hannyabal | character | play-from | [Blocker][On Play] If your Leader has the {Impel Down} type, play up to 1 {Impel Down} type Character card with a cost of 3 or less from your hand. |
| OP11-079 | When Two Men Are Fighting the Last Thing I Need Is Some Half-Hearted Assistance!!!! | event | draw,power-buff | [Counter] Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed card has the chosen cost, up to 1 of your Leader or Character ca |
| OP11-080 | Gear Two | event | power-buff | [Main] You may rest 2 of your DON!! cards: If your Leader's colors include blue, add up to 1 DON!! card from your DON!! deck and rest it.[Counter] Up to 1 of yo |
| OP11-081 | Cognac Mama-Mash | event | ko | [Main] Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed card has the chosen cost, K.O. up to 1 of your opponent's Character |
| OP11-083 | Caribou | character | trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Trash 2 cards from your hand. |
| OP11-088 | Shu | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Once Per Turn] This effect can be activated  |
| OP11-095 | Monkey.D.Garp | character | ko,move-bottom-deck,give-don | [On Play] You may place 3 {Navy} type cards from your trash at the bottom of your deck in any order: Give up to 1 rested DON!! card to 1 of your Leader. Then, i |
| OP11-096 | Ripper | character | keyword | If you have a black {Navy} type Character other than [Ripper], this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to |
| OP11-097 | After All These Years I'm Losing My Edge!!! | event | power-buff | [Counter] Up to 1 of your Leader or Character cards gains +1000 power during this battle. Then, if you have 10 or more cards in your trash, add up to 1 black Ch |
| OP11-098 | Blue Hole | event | ko,power-buff,trash-top | [Main] You may trash 3 cards from the top of your deck: K.O. up to 1 of your opponent's Characters with a cost of 2 or less. [Trigger] Up to 1 of your Leader or |
| OP11-100 | Otohime | character | draw | [On Play] If your Leader is [Shirahoshi], you may turn 1 card from the top of your Life cards face-down: Draw 1 card. |
| OP11-103 | Long-Jaw Neptunian | character | ko | [Activate: Main] If your Leader is [Shirahoshi], you may rest this Character and turn 1 card from the top of your Life cards face-down: K.O. up to 1 of your opp |
| OP11-104 | Shirley | character | search | [Blocker][On Play] You may turn 1 card from the top of your Life cards face-down: Look at 3 cards from the top of your deck; reveal up to 1 {Fish-Man Island} ty |
| OP11-108 | Neptune | character | draw,trash-hand | [On Play] If your Leader is [Shirahoshi], you may turn 1 card from the top of your Life cards face-down: Draw 2 cards and trash 1 card from your hand. |
| OP11-109 | Pappag | character | draw,trash-hand | [On Play] If you have [Camie], draw 2 cards and trash 2 cards from your hand. |
| OP11-110 | Fukaboshi | character | ko | If this Character would be K.O.'d, you may rest 1 of your [Fish-Man Island] or your [Shirahoshi] Leader instead.[On Play] You may add 1 card from the top or bot |
| OP11-112 | Megalo | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] If your Leader is [Shirahos |
| OP11-114 | Gum-Gum Fire-Fist Pistol Red Hawk | event | ko,power-buff | [Main] You may rest 3 of your DON!! cards: If you and your opponent have a total of 5 or more Life cards, K.O. up to 1 of your opponent's Characters with a base |
| OP11-115 | You're Just Not My Type! | event | ko,power-buff | [Counter] If your Leader is [Shirahoshi], up to 1 of your Leader or Character cards gains +4000 power during this battle. [Trigger] K.O. up to 1 of your opponen |
| OP11-117 | Fish-Man Island | stage | power-buff | [Activate: Main] [Once Per Turn] If your Leader is [Shirahoshi], you may turn 1 card from the top of your Life cards face-up: Up to 1 of your {Neptunian}, {Fish |
| OP12-001 | Silvers Rayleigh | leader | power-buff | Under the rules of this game, you cannot include cards with a cost of 5 or more in your deck.[Activate: Main] [Once Per Turn] You may reveal 2 Events from your  |
| OP12-003 | Crocus | character | play-from | [On K.O.] You may reveal 2 Events from your hand: Play up to 1 red Character card with 3000 power or less from your hand. |
| OP12-004 | Kouzuki Oden | character | power-buff | [Activate: Main] [Once Per Turn] You may reveal 2 Events from your hand: This Character gains +2000 power during this turn. |
| OP12-007 | Shanks | character | keyword | [On Play] Up to 1 of your Characters with a type including "Roger Pirates" other than [Shanks] gains [Rush] during this turn.(This card can attack on the turn i |
| OP12-008 | Shanks | character | power-buff,trash-hand | [Blocker][On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: Give up to 1 of your opponent's Leader or Character cards −2000 power  |
| OP12-013 | Hatchan | character | give-don | [Activate: Main] You may rest this Character and reveal 2 Events from your hand: Give up to 2 rested DON!! cards to your Leader or 1 of your Characters. |
| OP12-014 | Boa Hancock | character | search,move-bottom-deck,give-don | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 [Monkey.D.Luffy] or red Event and add it to your hand. Then, place the rest at the bottom of |
| OP12-015 | Monkey.D.Luffy | character | power-buff,play-from,give-don | If you have a total of 2 or more given DON!! cards, this Character gains +2000 power.[On Play] You may reveal 2 Events from your hand: Play up to 1 red Characte |
| OP12-016 | To Never Doubt--That Is Power! | event | power-buff | [Main] You may give 2 active DON!! cards to 1 of your [Silvers Rayleigh]: Your opponent cannot activate [Blocker] when the card given these DON!! cards attacks  |
| OP12-017 | Color of Observation Haki | event | search,move-bottom-deck | [Main] You may give 1 active DON!! card to 1 of your [Silvers Rayleigh]: Look at 4 cards from the top of your deck; reveal up to 1 red Event or up to 1 Characte |
| OP12-018 | Color of the Supreme King Haki | event | power-buff | [Counter] Up to 1 of your Characters or [Silvers Rayleigh] gains +2000 power during this battle. Then, you may rest 1 of your DON!! cards. If you do, give your  |
| OP12-019 | Color of Arms Haki | event | power-buff | [Main] You may give 1 active DON!! card to 1 of your [Silvers Rayleigh]: Up to 1 of your Leader or Character cards gains +1000 power during this turn.[Counter]  |
| OP12-024 | Gyukimaru | character | rest,ko-immunity | If this Character is active, this Character cannot be K.O.'d by your opponent's effects.[When Attacking] If you have a total of 3 or more given DON!! cards, res |
| OP12-026 | Kuina | character | rest,give-don | [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a base cost of 4 or less. Then, give up to 3 rested DON!! cards to |
| OP12-028 | Kouzuki Hiyori | character | search,move-bottom-deck | [Activate: Main] You may rest 1 of your DON!! cards and this Character: If your Leader is [Roronoa Zoro], look at 5 cards from the top of your deck; reveal up t |
| OP12-029 | Shimotsuki Kouzaburou | character | ko,rest | [On Play] Rest up to 1 of your opponent's Characters with a cost of 2 or less. Then, K.O. up to 1 of your opponent's rested Characters with a base cost of 1 or  |
| OP12-030 | Dracule Mihawk | character | set-active | [Blocker][On Play] Set up to 4 of your DON!! cards as active. Then, you cannot play Character cards with a base cost of 7 or more during this turn. |
| OP12-031 | Tashigi | character | rest,give-don | [On Play] Rest up to 1 of your opponent's Characters with a base cost of 6 or less. Then, give up to 3 rested DON!! cards to your [Roronoa Zoro] Leader. |
| OP12-033 | Helmeppo | character | rest | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Block] Rest up to 1 of your opponent's Ch |
| OP12-034 | Perona | character | search,move-bottom-deck | [On Play] If your Leader has the <Slash> attribute, look at 5 cards from the top of your deck; reveal up to 1 <Slash> attribute card or green Event and add it t |
| OP12-038 | Two-Sword Style Rashomon | event | ko,power-buff | [Main] You may rest 2 of your DON!! cards: K.O. up to 2 of your opponent's rested Characters with a base cost of 4 or less.[Counter] Your Leader gains +3000 pow |
| OP12-039 | Luffy Is the Man Who Will Become the King of Pirates!!! | event | power-buff | [Main] Set your [Roronoa Zoro] Leader as active. [Trigger] Up to 1 of your Leader or Character cards gains +1000 power during this turn. |
| OP12-041 | Sanji | leader | don-minus | [Activate: Main] [Once Per Turn] DON!! −1: Activate up to 1 {Straw Hat Crew} type Event with a base cost of 3 or less from your hand.[When Attacking] If the num |
| OP12-042 | Alvida | character | move-bottom-deck | If you have 2 or more Characters with a base cost of 5 or more, this Character gains +1 cost.[On Play] Place up to 1 of your opponent's Characters with a base c |
| OP12-044 | Sakazuki | character | draw,trash-hand,give-don | [On Play] If your Leader has the {Navy} type, draw 2 cards.[Activate: Main] [Once Per Turn] You may trash 1 card from your hand: Give up to 1 rested DON!! card  |
| OP12-046 | Zephyr(Navy) | character | trash-hand,return-hand | [On Play] Trash 2 cards from your hand.[Activate: Main] You may trash this Character: Return up to 1 Character with a cost of 5 or less to the owner's hand. |
| OP12-047 | Sengoku | character | search,move-bottom-deck,trash-hand | [On Play] You may trash 1 card from your hand: Look at 5 cards from the top of your deck; reveal up to 2 {Navy} type cards other than [Sengoku] and add them to  |
| OP12-048 | Donquixote Rosinante | character | trash-hand | [Opponent's Turn] If your blue {Navy} type Character would be removed from the field by your opponent's effect, you may rest this Character and trash 1 card fro |
| OP12-051 | Hina | character | trash-hand | [Activate: Main] You may rest this Character and trash 1 card from your hand: Up to 1 of your opponent's Characters with a base cost of 4 or less cannot activat |
| OP12-053 | Borsalino | character | keyword,trash-hand | [Once Per Turn] If this Character would be removed from the field by your opponent's effect, you may trash 1 card from your hand instead.[Opponent's Turn] If yo |
| OP12-054 | Marshall.D.Teach | character | return-hand | [On Play] If your Leader has the {The Seven Warlords of the Sea} type, return up to 1 Character with a cost of 1 or less other than this Character to the owner' |
| OP12-056 | Monkey.D.Garp | character | play-from,trash-hand | [On Play] You may trash 1 card from your hand: Play up to 1 blue {Navy} type Character card with 8000 power or less other than [Monkey.D.Garp] from your hand. |
| OP12-057 | Ice Block Pheasant Peck | event | draw,power-buff,trash-hand | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, trash 1 card from your hand. [Trigger] You may trash 1 card from |
| OP12-058 | I Will Make Whitebeard the King of the Pirates | event | draw,keyword | [Main] If your Leader's type includes "Whitebeard Pirates", reveal 1 card from the top of your deck. If that card is a Character card with a type including "Whi |
| OP12-059 | Concasser | event | draw,power-buff | [Main] If your Leader is [Sanji], draw 1 card.[Counter] If you have 4 or more Events in your trash, up to 1 of your Leader gains +4000 power during this battle. |
| OP12-060 | Boeuf Burst | event | draw,choose-one,return-hand | [Main] If your Leader is multicolored, choose one:• Return up to 1 of your opponent's Characters with a cost of 4 or less to the owner's hand.• If you have 6 or |
| OP12-061 | Donquixote Rosinante | leader | add-life-to-hand,don-minus | [Once Per Turn] If your [Trafalgar Law] would be K.O.'d, you may add 1 card from the top of your Life cards to your hand instead.[Activate: Main] [Once Per Turn |
| OP12-062 | Vinsmoke Sora | character | draw | [On Play] If your Leader is [Sanji] and the number of DON!! cards on your field is equal to or less than the number on your opponent's field, add up to 1 DON!!  |
| OP12-063 | Vinsmoke Reiju | character | power-buff | If you have 4 or more Events in your trash, this Character gains +2000 power and +5 cost.[Blocker] (After your opponent declares an attack, you may rest this ca |
| OP12-065 | Emporio.Ivankov | character | keyword | If you have 4 or more Events in your trash, this Character gains [Blocker].[On K.O.] Add up to 1 Event from your trash to your hand. |
| OP12-066 | Carne | character | keyword | If you have 4 or more Events in your trash, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new ta |
| OP12-069 | Crocodile | character | power-buff,don-minus | [On Your Opponent's Attack] [Once Per Turn] DON!! −1: If your Leader's type includes "Baroque Works", up to 1 of your Leader or Character cards gains +2000 powe |
| OP12-075 | Ms. All Sunday | character | ko,don-minus | [On Play] K.O. up to 1 of your opponent's Characters with a cost of 3 or less. Then, your opponent may add 1 DON!! card from their DON!! deck and set it as acti |
| OP12-077 | The "Extinguishes All Sound Created by Your Influence" Technique | event | draw,power-buff | [Main] Select up to 1 of your [Trafalgar Law] cards and that card gains +2000 power during this turn. Then, if the selected card attacks during this turn, your  |
| OP12-078 | Brochette Blow | event | draw,power-buff | [Main] If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, draw 1 card. Then, give up to 1 of your opponent |
| OP12-079 | Luffy Is the Man Who Will Be King of the Pirates!!! | event | search,move-bottom-deck | [Main] If your Leader is [Sanji], look at 3 cards from the top of your deck and add up to 1 card to your hand. Then, place the rest at the bottom of your deck i |
| OP12-080 | Baratie | stage | search,move-bottom-deck | [Activate: Main] You may place this Stage at the bottom of the owner's deck: If your Leader is [Sanji], look at 3 cards from the top of your deck; reveal up to  |
| OP12-081 | Koala | leader | draw | When this Leader attacks your opponent's Leader, if you have 2 or more Characters with a cost of 8 or more, draw 1 card.[Once Per Turn] This effect can be activ |
| OP12-084 | Emporio.Ivankov | character | trash-top | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If your Leader has the {Revolutiona |
| OP12-087 | Nico Robin | character | keyword,trash-hand | If your Leader is [Koala] or [Monkey.D.Luffy], this Character gains [Blocker] and +3 cost.[On Play] You may trash 1 card from your hand: If your opponent has 5  |
| OP12-089 | Hack | character | ko,keyword | If your Leader has the {Revolutionary Army} type, this Character gains [Blocker] and +4 cost.[On K.O.] If your Leader has the {Revolutionary Army} type, K.O. up |
| OP12-090 | Belo Betty | character | trash-top | [When Attacking] You may trash 2 cards from the top of your deck: Give up to 1 of your opponent's Characters −2 cost during this turn. |
| OP12-091 | Poker | character | move-bottom-deck | [Activate: Main] [Once Per Turn] You may place 3 cards from your trash at the bottom of your deck in any order: Up to 2 of your {SMILE} type Characters gain +20 |
| OP12-094 | Monkey.D.Dragon | character | play-from,move-bottom-deck | [On Play] You may place 3 {Revolutionary Army} type cards from your trash at the bottom of your deck in any order: If your Leader has the {Revolutionary Army} t |
| OP12-095 | Lindbergh | character | draw,trash-hand | If your Leader has the {Revolutionary Army} type, this Character gains +4 cost.[On Play] Draw 1 card and trash 1 card from your hand. |
| OP12-096 | Ursa Shock | event | draw,ko,trash-top | [Main] K.O. up to 1 of your opponent's Characters with a cost of 4 or less. If you have a Character with a cost of 8 or more, you may select your opponent's Cha |
| OP12-097 | Captains Assembled | event | search | [Main] Look at 3 cards from the top of your deck; reveal up to 1 {Revolutionary Army} type card other than [Captains Assembled] and add it to your hand. Then, t |
| OP12-099 | Kalgara | character | draw | [Your Turn] When a card is removed from your or your opponent's Life cards, draw 1 card. Then, you cannot draw cards using your own effects during this turn. |
| OP12-100 | Sabo | character | draw,keyword,add-life-to-hand,trash-hand | If you have 3 or less Life cards, this Character gains [Blocker] and +3 cost.[On Play] You may add 1 card from the top of your Life cards to your hand: Draw 2 c |
| OP12-105 | Trafalgar Lammy | character | power-buff | [Your Turn] [On Play] Up to 1 of your [Trafalgar Law] cards gains +2000 power during this turn. |
| OP12-107 | Donquixote Doflamingo | character | keyword | If you have 2 or less Life cards, this Character gains [Rush].(This card can attack on the turn in which it is played.)[Opponent's Turn] [On K.O.] Add up to 1 c |
| OP12-109 | Pacifista | character | ko | [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 1 or less and add this card to your hand. |
| OP12-112 | Baby 5 | character | draw | [Trigger] If your Leader is multicolored, draw 2 cards. |
| OP12-113 | Roronoa Zoro | character | ko,play-from | [On K.O.] If your Leader has the {Supernovas} type, play up to 1 {Supernovas} type Character card with a cost of 4 or less from your hand rested. [Trigger] K.O. |
| OP12-115 | I Love You!! | event | power-buff | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have 2 or less Life cards, add up to 1 [Trafalgar Law] fr |
| OP12-116 | We'll Ring the Bell Waiting for You!! | event | draw,search,move-bottom-deck | [Main] Look at 5 cards from the top of your deck; reveal a total of up to 2 {Shandian Warrior} type Character cards or [Mont Blanc Noland] and add them to your  |
| OP12-118 | Jewelry Bonney | character | draw,trash-hand,set-active | [Blocker][On Play] If you have 8 or more rested cards, draw 2 cards and trash 1 card from your hand. Then, set up to 1 of your DON!! cards as active. |
| OP13-002 | Portgas.D.Ace | leader | draw,power-buff,trash-hand | [On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: Give up to 1 of your opponent's Leader or Character cards −2000 power during th |
| OP13-003 | Gol.D.Roger | leader | power-buff | If you have any DON!! cards on your field, 1 DON!! card placed during your DON!! Phase is given to your Leader.If you have 9 or less DON!! cards on your field,  |
| OP13-004 | Sabo | leader | power-buff | If you have 4 or more Life cards, give this Leader −1000 power.[DON!! x1] If you have a Character with a cost of 8 or more, your Leader and all of your Characte |
| OP13-005 | Inazuma | character | give-don | [On Play] Give up to 1 rested DON!! card to your Leader. |
| OP13-006 | Woop Slap | character | give-don | [On Play] Give up to 2 rested DON!! cards to 1 of your [Monkey.D.Luffy] cards. |
| OP13-007 | Ace & Sabo & Luffy | character | power-buff | [Activate: Main] You may give 1 of your active DON!! cards to 1 of your Leader or Character cards and trash this Character: Give up to 1 of your opponent's Char |
| OP13-009 | Curly.Dadan | character | keyword | If you have a {Mountain Bandits} type Character other than this card, this Character gains [Double Attack]. |
| OP13-014 | Portgas.D.Rouge | character | power-buff | [Trigger] Up to 1 of your [Portgas.D.Ace] cards gains +3000 power during this turn. |
| OP13-015 | Makino | character | power-buff | [Activate: Main] You may rest this Character: Up to 1 of your [Monkey.D.Luffy] cards gains +2000 power during this turn. |
| OP13-016 | Monkey.D.Garp | character | search,move-bottom-deck | [On Play] If your Leader is [Sabo], [Portgas.D.Ace] or [Monkey.D.Luffy], look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 3 or more |
| OP13-017 | Monkey.D.Dragon | character | power-buff | [Once Per Turn] If your {Revolutionary Army} type Character would be removed from the field by your opponent's effect, you may give this Character −2000 power d |
| OP13-019 | But Ace Here Said You Deserved It!! | event | ko,power-buff | [Main] You may rest 4 of your DON!! cards: Give up to 1 of your opponent's Characters −3000 power during this turn. Then, K.O. up to 1 of your opponent's Charac |
| OP13-020 | Meteor Fist | event | power-buff | [Main] Give up to 1 of your opponent's Characters −5000 power during this turn. [Trigger] Activate this card's [Main] effect. |
| OP13-021 | Gum-Gum Gatling Gun | event | power-buff,give-don | [Main] Give up to 1 rested DON!! card to 1 of your [Monkey.D.Luffy] cards. Then, give up to 1 of your opponent's Characters −2000 power during this turn. [Trigg |
| OP13-022 | Windmill Village | stage | power-buff | [Activate: Main] You may rest this Stage: Up to 1 of your Characters with 2000 base power or less gains +1000 power during this turn. |
| OP13-023 | Uta | character | play-from,set-active | [On Play] Set up to 2 of your DON!! cards as active. Then, you cannot play Character cards with a base cost of 5 or more during this turn.[On K.O.] Play up to 1 |
| OP13-025 | Koby | character | set-active | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If your Leader has the {FILM} type  |
| OP13-027 | Sanji | character | set-active | [On Play] Set up to 2 of your DON!! cards as active.[End of Your Turn] If your Leader has the {FILM} or {Straw Hat Crew} type, set up to 1 of your DON!! cards a |
| OP13-030 | Tony Tony.Chopper | character | set-active | [On Play] Set up to 2 of your DON!! cards as active. |
| OP13-031 | Trafalgar Law | character | keyword,play-from,return-hand | If you have 1 or less Life cards, this Character gains [Blocker].[On Play] You may return 1 of your Characters to the owner's hand: Play up to 1 Character card  |
| OP13-033 | Franky | character | rest | [On K.O.] Rest up to 2 of your opponent's cards. |
| OP13-034 | Brook | character | set-active | [On Play] If your Leader has the {FILM} or {Straw Hat Crew} type, set up to 1 of your DON!! cards as active. |
| OP13-035 | Bepo | character | set-active | [End of Your Turn] Set this Character or up to 1 of your DON!! cards as active. |
| OP13-037 | Roronoa Zoro | character | set-active | [On Play] If your Leader has the {FILM} or {Straw Hat Crew} type, set up to 2 of your DON!! cards as active.[End of Your Turn] Set this Character as active. |
| OP13-039 | Gum-Gum Snake Shot | event | ko | [Counter] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less. [Trigger] Activate this card's [Counter] effect. |
| OP13-040 | I Know You're Strong... So I'll Go All Out from the Very Start!!! | event | power-buff | [Main] You may rest 2 of your DON!! cards: Up to 2 of your opponent's rested Characters with a cost of 7 or less will not become active in your opponent's next  |
| OP13-041 | Izo | character | draw | [On Play] Draw 2 cards. |
| OP13-042 | Edward.Newgate | character | draw,trash-hand | [Blocker][On Play] Draw 2 cards and trash 1 card from your hand. Then, give your Leader and 1 Character up to 2 rested DON!! cards each. |
| OP13-043 | Otama | character | draw,trash-hand | [On Play] If you have 3 or less Life cards, draw 2 cards and trash 1 card from your hand. |
| OP13-044 | Curiel | character | draw,give-don | [When Attacking] Give up to 1 rested DON!! card to your Leader with a type including "Whitebeard Pirates" or 1 Character with a type including "Whitebeard Pirat |
| OP13-045 | Haruta | character | draw | [When Attacking] If you have 4 or less cards in your hand, draw 1 card. |
| OP13-050 | Boa Sandersonia | character | play-from | [On Play] If your Leader is [Boa Hancock], play up to 1 [Boa Hancock] with a cost of 3 or less from your hand. |
| OP13-051 | Boa Hancock | character | draw | [On K.O.] If your Leader is [Boa Hancock] or multicolored, draw 2 cards. |
| OP13-052 | Boa Marigold | character | play-from | [Blocker][On Play] If your Leader is [Boa Hancock], play up to 1 [Boa Hancock] with a cost of 6 or less from your hand. |
| OP13-054 | Yamato | character | draw,give-don | [On Play] If you have 3 or less Life cards, draw 2 cards. Then, give up to 1 rested DON!! card to your Leader. |
| OP13-056 | LittleOars Jr. | character | draw | [When Attacking] If your Leader's type includes "Whitebeard Pirates", draw 1 card. |
| OP13-057 | If I Bowed Down to Power, What's the Point in Living? | event | power-buff | [Main] You may rest 1 of your DON!! cards: If you have 1 or less Life cards, your opponent cannot activate [Blocker] whenever your Leader attacks during this tu |
| OP13-058 | Phoenix Pyreapple | event | power-buff,move-bottom-deck | [Main] You may rest 1 of your DON!! cards: Place up to 1 of your opponent's Characters with 3000 power or less at the bottom of the owner's deck.[Counter] Your  |
| OP13-059 | Brilliant Punk | event | draw,return-hand | [Main] You may return 1 of your Characters to the owner's hand: Return up to 1 Character with a cost of 6 or less to the owner's hand. [Trigger] Draw 1 card. |
| OP13-061 | Inuarashi | character | ko | [On Play] If you have any DON!! cards given, add up to 1 DON!! card from your DON!! deck and rest it. Then, K.O. up to 1 of your opponent's Characters with a co |
| OP13-062 | Crocus | character | return-hand | [On Play] If you have any DON!! cards given, add up to 1 DON!! card from your DON!! deck and set it as active.[When Attacking] Return up to 1 of your opponent's |
| OP13-067 | Scopper Gaban | character | draw,trash-hand | [On Play] If your Leader's type includes "Roger Pirates", draw 2 cards and trash 1 card from your hand. Then, add up to 1 DON!! card from your DON!! deck and re |
| OP13-068 | Douglas Bullet | character | power-buff | If you have 8 or more DON!! cards on your field, this Character gains +2000 power.[On Play] If your Leader's type includes "Roger Pirates", add up to 1 DON!! ca |
| OP13-069 | Tom | character | don-minus | [On Play] DON!! −1: Add up to 1 Stage card with a cost of 3 or less from your trash to your hand. |
| OP13-071 | Nekomamushi | character | ko | [On Play] If you have 8 or more DON!! cards on your field, K.O. up to 1 of your opponent's Characters with 3000 base power or less. |
| OP13-074 | Hera | character | play-from | [On Play] Play up to 1 {Homies} type Character card with 3000 power or less from your hand. |
| OP13-075 | Guess We'll Have Another Scrap. You Can Only Risk Death While You're Still Alive!! | event | power-buff | [Main] You may rest 1 of your DON!! cards: If your Leader is [Gol.D.Roger] and you have any DON!! cards given, add up to 1 DON!! card from your DON!! deck and r |
| OP13-076 | Divine Departure | event | power-buff,trash-hand | [Main] You may rest 5 of your DON!! cards: If you have any DON!! cards given, give up to 1 of your opponent's Characters −8000 power during this turn.[Counter]  |
| OP13-077 | Go All the Way to the Top!! | event | ko,power-buff | [Main] You may rest 3 of your DON!! cards: If you have any DON!! cards given, K.O. up to 1 of your opponent's Characters with 4000 base power or less and up to  |
| OP13-079 | Imu | leader | draw,play-from | Under the rules of this game, you cannot include Events with a cost of 2 or more in your deck and at the start of the game, play up to 1 {Mary Geoise} type Stag |
| OP13-080 | St. Ethanbaron V. Nusjuro | character | power-buff,keyword | If you have 7 or more cards in your trash, this Character cannot be removed from the field by your opponent's effects and gains [Rush].[When Attacking] If you h |
| OP13-081 | Koala | character | move-bottom-deck,give-don | If your Leader has the {Revolutionary Army} type, this Character gains +3 cost.[Activate: Main] [Once Per Turn] You may place 1 card from your trash at the bott |
| OP13-082 | Five Elders | character | play-from,trash-hand | [Activate: Main] If your Leader is [Imu], you may rest 1 of your DON!! cards and trash 1 card from your hand: Trash all of your Characters and play up to 5 {Fiv |
| OP13-083 | St. Jaygarcia Saturn | character | search,move-bottom-deck | If you have 7 or more cards in your trash, this Character cannot be removed from the field by your opponent's effects.[On Play] Look at 5 cards from the top of  |
| OP13-087 | Saint Charlos | character | trash-top | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Trash 1 card from the top of your d |
| OP13-089 | St. Topman Warcury | character | draw,keyword | If you have 7 or more cards in your trash, this Character cannot be removed from the field by your opponent's effects and gains [Blocker].[On K.O.] Draw 1 card. |
| OP13-091 | St. Marcus Mars | character | ko,keyword,trash-hand | If you have 7 or more cards in your trash, this Character cannot be removed from the field by your opponent's effects and gains [Blocker].[On Play] You may tras |
| OP13-092 | Saint Mjosgard | character | play-from | [On Play] If you have 3 or less Life cards, play up to 1 {Mary Geoise} type Stage card with a cost of 1 from your trash. |
| OP13-094 | York | character | power-buff | [On Play] Up to 1 of your {Celestial Dragons} type Characters gains +2000 power during this turn. |
| OP13-095 | Saint Rosward | character | ko,trash-hand | [On Play] You may trash 1 card from your hand: If you only have {Celestial Dragons} type Characters, K.O. up to 2 of your opponent's Characters with a base cost |
| OP13-096 | The Five Elders Are at Your Service!!! | event | search | [Main] Look at 3 cards from the top of your deck; reveal up to 1 {Celestial Dragons} type card other than [The Five Elders Are at Your Service!!!] and add it to |
| OP13-097 | The World's Equilibrium Cannot Be Maintained Forever | event | ko,power-buff | [Main] You may rest 5 of your DON!! cards: If the only Characters on your field are {Celestial Dragons} type Characters, K.O. up to 1 of your opponent's Charact |
| OP13-098 | Never Existed... in the First Place... | event | ko,power-buff | [Main] You may rest 1 of your DON!! cards: If your Leader is [Imu], K.O. up to 1 of your opponent's Stages with a cost of 7.[Counter] If your Leader is [Imu], u |
| OP13-100 | Jewelry Bonney | leader | give-don | [Your Turn] [Once Per Turn] This effect can be activated when you play a Character with a [Trigger]. Give up to 2 rested DON!! cards to 1 of your Leader or Char |
| OP13-102 | Edison | character | draw,rest | [Activate: Main] You may trash this Character: If the number of your Life cards is equal to or less than the number of your opponent's Life cards, draw 1 card.  |
| OP13-104 | Kouzuki Hiyori | character | trash-hand | [Blocker][On K.O.] You may trash 1 card from your hand: If your Leader is multicolored, add up to 1 card from the top of your deck to the top of your Life cards |
| OP13-106 | Conney | character | keyword | [Opponent's Turn] When a [Trigger] activates, this Character gains [Blocker] during this turn. [Trigger] Play this card. |
| OP13-108 | Jewelry Bonney | character | rest,keyword | [On Play] If your Leader has the {Egghead} type, this Character gains [Rush] during this turn. Then, your opponent adds 1 card from the top of their Life cards  |
| OP13-109 | Jewelry Bonney | character | draw,trash-hand | If this Character would be removed from the field by your opponent's effect, you may turn 1 card from the top of your Life cards face-up instead. [Trigger] Draw |
| OP13-110 | Stussy | character | play-from | [Blocker][On Play] If your Leader has the {Egghead} type, play up to 1 Character card with a cost of 5 or less and a [Trigger] from your hand. |
| OP13-112 | Vegapunk | character | keyword | If you have a total of 2 or more given DON!! cards, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it th |
| OP13-113 | Lilith | character | search,move-bottom-deck | [On Play] Look at 4 cards from the top of your deck; reveal up to 1 card with a [Trigger] other than [Lilith] and add it to your hand. Then, place the rest at t |
| OP13-114 | S-Snake | character | power-buff,trash-hand | [On Play]/[When Attacking] You may turn 1 card from the top of your Life cards face-up: Give up to 1 of your opponent's Characters −2000 power during this turn. |
| OP13-115 | Paper Art Afterimage | event | draw,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +3000 power during this battle. Then, if your opponent has 2 or less Life cards, up to 1 of your Leade |
| OP13-116 | The One Who Is the Most Free Is the Pirate King!!! | event | search,move-bottom-deck | [Main] Look at 5 cards from the top of your deck; reveal up to 1 {Supernovas} type Character card and add it to your hand. Then, place the rest at the bottom of |
| OP13-117 | Gum-Gum Dawn Stamp | event | draw,ko | [Main] You may turn 1 card from the top of your Life cards face-up: K.O. up to 1 of your opponent's Characters with a base cost of 6 or less. [Trigger] Draw 1 c |
| OP13-118 | Monkey.D.Luffy | character | set-active | [Double Attack][On Play] If your Leader is multicolored, set up to 4 of your DON!! cards as active. Then, you cannot play Character cards with a base cost of 5  |
| OP13-119 | Portgas.D.Ace | character | keyword,give-don,return-hand | If you have 3 or less Life cards, this Character gains [Rush].[On Play] Give up to 1 rested DON!! card to your Leader. Then, you may return up to 1 of your oppo |
| OP14-002 | Urouge | character | draw,ko | [When Attacking] If this Character has 5000 power or more, draw 1 card and K.O. up to 1 of your opponent's Characters with 3000 base power or less. |
| OP14-004 | Cavendish | character | keyword | If this Character has 5000 power or more, this Character gains [Rush].(This card can attack on the turn in which it is played.) |
| OP14-006 | Shachi & Penguin | character | power-buff | [When Attacking] If this Character has 5000 power or more, give up to 1 of your opponent's Characters −2000 power during this turn. |
| OP14-009 | Trafalgar Law | character | trash-hand | [Rush][On Your Opponent's Attack] [Once Per Turn] You may trash 2 cards from your hand: Select your Leader and 1 Character. Swap the base power of the selected  |
| OP14-010 | Basil Hawkins | character | search,play-from,move-bottom-deck | [On K.O.] Look at 5 cards from the top of your deck; play up to 1 {Supernovas} type Character card with 2000 power or less other than [Basil Hawkins]. Then, pla |
| OP14-011 | Bartolomeo | character | keyword | [DON!! x2] This Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new target of the attack.) |
| OP14-012 | Bepo | character | give-don | [When Attacking] If this Character has 5000 power or more, give up to 2 rested DON!! cards to your Leader or 1 of your Characters. |
| OP14-014 | Eustass"Captain"Kid | character | play-from | [Blocker][On Play] If your Leader has the {Supernovas} type, play up to 1 red Character card with 2000 power or less from your hand. |
| OP14-016 | X.Drake | character | power-buff | [Opponent's Turn] [Once Per Turn] If your {Supernovas} type Character would be removed from the field by your opponent's effect, you may give your Leader −2000  |
| OP14-018 | Time for the Counterattack | event | power-buff,play-from | [Counter] If there is a Character with 8000 power or more, up to 1 of your Leader or Character cards gains +4000 power during this battle. [Trigger] Play up to  |
| OP14-019 | I Have a Plan to Take Down One of the Four Emperors!! | event | draw,search,move-bottom-deck | [Main] Look at 4 cards from the top of your deck; reveal up to 1 {Supernovas} or {Straw Hat Crew} type Character card and add it to your hand. Then, place the r |
| OP14-020 | Dracule Mihawk | leader | power-buff,set-active | If your opponent's Leader has the <Slash> attribute, this Leader gains +1000 power.[Activate: Main] [Once Per Turn] You may rest 1 of your cards: If there is a  |
| OP14-021 | Issho | character | add-life-to-hand | [Your Turn] When this Character becomes rested, you may add 1 card from the top of your Life cards to your hand. If you do, up to 1 of your opponent's rested Ch |
| OP14-022 | Usopp | character | set-active | [End of Your Turn] If your Leader has the {FILM} or {Straw Hat Crew} type, set up to 2 of your DON!! cards as active. |
| OP14-023 | Kikunojo | character | set-active | [End of Your Turn] Set this Character as active. |
| OP14-024 | Kin'emon | character | rest,set-active | [On Play] Set up to 3 of your DON!! cards as active. Then, you cannot play Character cards during this turn.[On K.O.] Rest up to 1 of your opponent's cards. |
| OP14-025 | Kuro | character | play-from | [On Play] If your Leader is [Kuro], play up to 1 {East Blue} type Character card with a cost of 6 or less from your hand. |
| OP14-026 | Kouzuki Oden | character | power-buff | [Opponent's Turn] If this Character is rested, this Character gains +2000 power. |
| OP14-027 | Shanks | character | rest,power-buff | [Your Turn] When this Character becomes rested, rest up to 1 of your opponent's Characters with 7000 base power or less.[Opponent's Turn] If this Character is r |
| OP14-028 | Johnny | character | ko | [Your Turn] When this Character becomes rested, K.O. up to 1 of your opponent's rested Characters with a cost of 2 or less. |
| OP14-032 | Humandrill | character | rest | [Your Turn] When this Character becomes rested, rest up to 1 of your opponent's Characters with a cost of 4 or less. |
| OP14-036 | Strive to Surpass me, Roronoa Zoro!!! | event | rest,power-buff | [Counter] You may rest 1 of your cards: Up to 1 of your Leader or Character cards gains +4000 power during this battle. [Trigger] You may rest 1 of your cards:  |
| OP14-037 | For Fun | event | ko,power-buff | [Main] You may rest 3 of your cards: K.O. up to 1 of your opponent's rested Characters with 7000 base power or less.[Counter] Your Leader gains +3000 power duri |
| OP14-038 | I Never Bother to Remember the Faces of Trash | event | draw,rest,power-buff | [Main] You may rest 2 of your cards: Draw 1 card and rest up to 1 of your opponent's Characters with 7000 base power or less.[Counter] Your Leader gains +3000 p |
| OP14-039 | Coffin Boat | stage | draw,set-active | [On Play] If your Leader is [Dracule Mihawk], draw 1 card.[End of Your Turn] If your Leader is [Dracule Mihawk], set up to 1 of your DON!! cards as active. |
| OP14-040 | Jinbe | leader | trash-hand,give-don | [Activate: Main] You may trash 1 card from your hand: Give up to 2 rested DON!! cards to 1 of your {Fish-Man} or {Merfolk} type Leader or Character cards. |
| OP14-041 | Boa Hancock | leader | draw | [Opponent's Turn] When you play a Character, draw 1 card.[DON!! x1] [Once Per Turn] When one of your {Amazon Lily} or {Kuja Pirates} type Characters with 5000 b |
| OP14-042 | Arlong | character | search,move-bottom-deck | [On Play] If your Leader has the {Fish-Man} type, look at 4 cards from the top of your deck; reveal up to 1 card with a cost of 2 or more and add it to your han |
| OP14-043 | Aladine | character | draw,play-from | [On Play] Play up to 1 {Fish-Man} or {Merfolk} type Character card with a cost of 3 or less from your hand.[On K.O.] Draw 1 card. |
| OP14-044 | Edward.Newgate | character | draw,trash-hand | [Blocker][On Play] Reveal 1 card from the top of your deck. If that card's type includes "Whitebeard Pirates", draw 2 cards and trash 1 card from your hand. |
| OP14-045 | Kuroobi | character | draw,keyword | When a card is trashed from your hand by an effect, this Character gains [Rush] during this turn.(This card can attack on the turn in which it is played.)[On K. |
| OP14-046 | Koala | character | power-buff | [Activate: Main] You may trash this Character: Up to 1 of your {Fish-Man} or {Merfolk} type Leader or Character cards gains +2000 power during this turn. |
| OP14-047 | Shirahoshi | character | draw,play-from | [Blocker][On Play] Draw 1 card and play up to 1 {Fish-Man} or {Merfolk} type Character card with a cost of 3 or less from your hand. |
| OP14-048 | Shiryu | character | return-hand | [On Play] Return up to 1 of your opponent's Characters to the owner's hand. Then, trash all cards from your hand. |
| OP14-049 | Jinbe | character | draw,keyword,return-hand | When a card is trashed from your hand by an effect, this Character gains [Rush] during this turn.[On Play] You may rest 2 of your DON!! cards: Draw 2 cards and  |
| OP14-050 | Chew | character | draw | [On Play] If your Leader has the {Fish-Man} type, draw 1 card. |
| OP14-051 | Hatchan | character | draw | [DON!! x2] [On K.O.] Draw 1 card. |
| OP14-052 | Hannyabal | character | play-from,trash-hand | [Blocker][On Play] You may trash 3 cards from your hand: Play up to 1 {Impel Down} type Character card with a cost of 6 or less from your hand. |
| OP14-054 | Fisher Tiger | character | draw | [On Play] If your Leader has the {Fish-Man} type, draw 3 cards.[End of Your Turn] Trash cards from your hand until you have 5 cards in your hand. |
| OP14-057 | Don't Worry!! I'm Here!! | event | draw | [Main] All of your {Fish-Man} or {Merfolk} type Leader and Character cards gain +1000 power during this turn. [Trigger] Draw 2 cards. |
| OP14-058 | Ocean Current Shoulder Throw | event | draw,power-buff,play-from,return-hand | [Main] You may rest 3 of your DON!! cards: Play up to 1 {Fish-Man} type Character card with a cost of 3 or less from your hand. Then, return up to 1 Character w |
| OP14-059 | Please Take Me with You!! I Can Be of Great Help to You!! | event | draw,return-hand | [Main] If your Leader is [Jinbe] and you have 2 or less cards in your hand, draw 2 cards. [Trigger] Return up to 1 Character with a cost of 4 or less to the own |
| OP14-060 | Donquixote Doflamingo | leader | don-minus | [On Your Opponent's Attack] [Once Per Turn] DON!! −1: Select your Leader or 1 of your {Donquixote Pirates} type Characters. Change the attack target to the sele |
| OP14-061 | Vergo | character | power-buff,don-minus | [Once Per Turn] If your {Donquixote Pirates} type Character would be removed from the field by your opponent's effect, you may return 1 DON!! card from your fie |
| OP14-062 | Gladius | character | rest,don-minus | [On K.O.] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): K.O. or rest up to 1 of your opponent's Characters  |
| OP14-063 | Sugar | character | play-from | [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.[On K.O.] If your opponent has 6 or more DON!! cards on their field, play up to 1 {Do |
| OP14-064 | Giolla | character | ko | [On K.O.] Add up to 1 DON!! card from your DON!! deck and rest it. Then, K.O. up to 1 of your opponent's Characters with a base power of 0. |
| OP14-067 | Dellinger | character | search,move-bottom-deck | [On K.O.] Add up to 1 DON!! card from your DON!! deck and rest it, look at 5 cards from the top of your deck; reveal up to 1 {Donquixote Pirates} type card and  |
| OP14-070 | Buffalo | character | set-active | When this Character becomes rested by your opponent's Character's effect, you may return 1 DON!! card from your field to your DON!! deck. If you do, set this Ch |
| OP14-072 | Baby 5 | character | don-minus | [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.[On K.O.] DON!! −1: Add up to 1 card from the top of your deck to the top of your Lif |
| OP14-074 | Monet | character | draw,trash-hand | [On Play] If your Leader has the {Donquixote Pirates} type, add up to 1 DON!! card from your DON!! deck and set it as active.[On K.O.] Draw 2 cards and trash 1  |
| OP14-075 | Lao.G | character | power-buff | [On K.O.] Add up to 1 DON!! card from your DON!! deck and rest it. Then, give up to 1 of your opponent's Characters −2000 power during this turn. |
| OP14-076 | Ever White | event | power-buff | [Main] You may rest 2 of your DON!! cards: If your Leader has the {Donquixote Pirates} type, add up to 1 DON!! card from your DON!! deck and rest it.[Counter] Y |
| OP14-079 | Crocodile | leader | trash-top | All of your opponent's Characters cannot be removed from the field by your effects.[Activate: Main] [Once Per Turn] You may K.O. 1 of your Characters with a typ |
| OP14-081 | Spider Mice | character | ko,trash-top | [On Play] Trash 3 cards from the top of your deck.[On K.O.] K.O. up to 1 of your opponent's Characters with a base cost of 1. |
| OP14-083 | Ms. Wednesday | character | power-buff | [Activate: Main] You may trash this Character: Give up to 1 of your opponent's 0 cost Characters −3000 power during this turn. |
| OP14-084 | Ms. All Sunday | character | play-from | [On Play] If your Leader's type includes "Baroque Works", play up to 1 Character card with a type including "Baroque Works" and a cost of 4 or less and up to 1  |
| OP14-085 | Miss.Goldenweek(Marianne) | character | draw,trash-hand | [On K.O.] Draw 2 cards and trash 2 cards from your hand. |
| OP14-088 | Miss.MerryChristmas(Drophy) | character | draw,ko | [On K.O.] If your Leader's type includes "Baroque Works", draw 1 card and K.O. up to 1 of your opponent's Stages with a cost of 1. |
| OP14-089 | Ryuma | character | draw,play-from,trash-hand | [On K.O.] Draw 2 cards and trash 2 cards from your hand. [Trigger] Play up to 1 {Thriller Bark Pirates} type Character card with a cost of 4 or less from your t |
| OP14-090 | Mr.1(Daz.Bonez) | character | rest | If there is a Character with a cost of 0 or with a cost of 8 or more, this Character can attack Characters on the turn in which it is played.[On Play] Rest up t |
| OP14-092 | Mr.3(Galdino) | character | move-bottom-deck | [Opponent's Turn] [Once Per Turn] If this Character would be K.O.'d, you may place 3 cards from your trash at the bottom of your deck in any order instead. |
| OP14-094 | Mr.5(Gem) | character | draw,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If there is a Character with a cost |
| OP14-097 | Hurry Up and Make Me the Pirate King! | event | search | [Main] Look at 3 cards from the top of your deck; reveal up to 1 {Thriller Bark Pirates} type card other than [Hurry Up and Make Me the Pirate King!] and add it |
| OP14-099 | Disappointed? | event | search | [Main] Look at 3 cards from the top of your deck; reveal up to 1 card with a type including "Baroque Works" other than [Disappointed?] and add it to your hand.  |
| OP14-100 | Absalom | character | search,play-from,move-bottom-deck | [On K.O.] Look at 3 cards from the top of your deck; reveal up to 1 {Thriller Bark Pirates} type card and add it to your hand. Then, place the rest at the botto |
| OP14-102 | Kumacy | character | play-from | [Trigger] Play up to 1 {Thriller Bark Pirates} type Character card with a cost of 4 or less from your trash rested. |
| OP14-104 | Gecko Moria | character | play-from | [On Play] Select up to 1 {Thriller Bark Pirates} type Character with a cost of 4 or less from your trash and play it or add it to the top of your Life cards fac |
| OP14-107 | Shakuyaku | character | draw,trash-hand | [On Play] If your opponent has 3 or less Life cards, draw 2 cards and trash 2 cards from your hand. [Trigger] If your Leader has the {Kuja Pirates} type, play t |
| OP14-108 | Silvers Rayleigh | character | ko | [On Play] If your Leader is multicolored and your opponent has 3 or less Life cards, K.O. up to 1 of your opponent's Characters with 7000 base power or less. [T |
| OP14-109 | Victoria Cindry | character | play-from | [Blocker] [Trigger] Play up to 1 {Thriller Bark Pirates} type Character card with a cost of 4 or less from your trash rested. |
| OP14-110 | Dr. Hogback | character | play-from | [On K.O.] Play up to 1 Character card with a cost of 4 or less and a [Trigger] other than [Dr. Hogback] from your trash. [Trigger] Play up to 1 {Thriller Bark P |
| OP14-112 | Boa Hancock | character | play-from | [On Play] If your Leader has the {The Seven Warlords of the Sea} type, add up to 1 card from the top of your deck to the top of your Life cards. Then, add up to |
| OP14-113 | Marguerite | character | search,move-bottom-deck,trash-hand | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Amazon Lily} or {Kuja Pirates} type card and add it to your hand. Then, place the rest at t |
| OP14-114 | Ran | character | give-don | [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to 1 of your {Kuja Pirates} type Leader or Character cards. [Trigger] If your Leader has the {Ku |
| OP14-116 | Salamander | event | draw,power-buff,play-from | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, play up to 1 {Amazon Lily} or {Kuja Pirates} type Character card |
| OP14-117 | Brick Bat | event | power-buff,play-from | [Counter] Up to 1 of your {Thriller Bark Pirates} type Leader or Character cards gains +3000 power during this battle. [Trigger] Play up to 1 {Thriller Bark Pir |
| OP15-001 | Krieg | leader | rest,power-buff | [DON!! x1] [Opponent's Turn] If the only Characters on your field are {East Blue} type Characters, give all of your opponent's Characters −2000 power.[Activate: |
| OP15-003 | Alvida | character | give-don | If this Character would be K.O.'d, you may trash 1 Character card with a power of 6000 or less from your hand instead.[Activate: Main] [Once Per Turn] You may g |
| OP15-004 | Sea Cat | character | power-buff | [On Play] If your Leader has 0 power or less, give up to 1 of your opponent's Characters −3000 power during this turn. |
| OP15-005 | Cabaji | character | power-buff | [When Attacking] If your opponent has any DON!! cards given, this Character gains +2000 power during this turn. |
| OP15-007 | Gin | character | play-from | [On Play] If your Leader has the {East Blue} type, play up to 1 Character card with a cost of 5 or less from your hand. |
| OP15-009 | Koby | character | power-buff | If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may give your Leader −2000 power during this turn  |
| OP15-010 | Nezumi | character | give-don | [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to its owner's Leader or 1 of their Characters. |
| OP15-011 | Pearl | character | ko,keyword | [Opponent's Turn] If your Leader has the {East Blue} type, this Character gains [Blocker] and +2000 power.[On K.O.] If your Leader has the {East Blue} type, K.O |
| OP15-012 | Buggy | character | draw,give-don | [When Attacking] Give up to 1 rested DON!! card to its owner's Leader or 1 of their Characters.[On K.O.] Draw 1 card. |
| OP15-015 | Higuma | character | power-buff | [On Play] Give up to 1 of your opponent's rested DON!! cards to 1 of your opponent's Characters. Then, give −1000 power during this turn to up to 1 of your oppo |
| OP15-017 | Morgan | character | give-don | [Blocker][Activate: Main] [Once Per Turn] You may give 1 of your opponent's rested DON!! cards to 1 of your opponent's Characters: Give up to 1 rested DON!! car |
| OP15-018 | Mohji | character | ko | [When Attacking] K.O. up to 1 of your opponent's Characters with 3000 power or less with a DON!! card given. |
| OP15-021 | Just Watch Me, Ace!!! | event | power-buff | If you have 4 or more Events in your trash, give this card in your hand −3 cost.[Main]/[Counter] Give up to 1 of your opponent's Characters −3000 power during t |
| OP15-022 | Brook | leader | trash-top,set-active | Under the rules of this game, you do not lose when your deck has 0 cards. You lose at the end of the turn in which your deck becomes 0 cards.[Activate: Main] [O |
| OP15-023 | Arlong | character | give-don | [On K.O.] Up to 2 of your opponent's rested cards will not become active in your opponent's next Refresh Phase.[Activate: Main] [Once Per Turn] You may give 1 o |
| OP15-024 | Usopp | character | rest,keyword | [Opponent's Turn] This Character cannot be rested by your opponent's Leader and Character effects and gains [Blocker].[On K.O.] Rest up to 1 of your opponent's  |
| OP15-026 | Jango | character | search,move-bottom-deck | [On Play] Look at 3 cards from the top of your deck; reveal up to 1 {East Blue} type card and add it to your hand. Then, place the rest at the bottom of your de |
| OP15-027 | Dracule Mihawk | character | rest | [On Play] Rest up to 1 of your opponent's Characters with a DON!! card given. |
| OP15-028 | Meowban Brothers | character | give-don | [On Play] If your Leader has the {East Blue} type, give up to 1 DON!! card from your opponent's cost area to 1 of your opponent's Characters. |
| OP15-032 | Brook | character | rest,set-active | [On Play] Rest up to 1 of your opponent's cards.[Activate: Main] You may trash this Character: If your Leader has the {Straw Hat Crew} type, set up to 1 of your |
| OP15-033 | Hody Jones | character | add-life-to-hand | [On Play] Set your {Fish-Man} type Leader as active. Then, add 1 card from the top of your Life cards to your hand. |
| OP15-034 | Yorki | character | power-buff | [Your Turn] [On Play] Up to 1 of your [Brook] cards gains +2000 power during this turn. |
| OP15-036 | Ryuma | character | ko | [On Play]/[When Attacking] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less. |
| OP15-037 | The Outcome Will Tell Us Who's Strong and Who's Weak | event | draw,search,move-bottom-deck | [Main] Look at 5 cards from the top of your deck; reveal up to 1 {East Blue} type card other than [The Outcome Will Tell Us Who's Strong and Who's Weak] and add |
| OP15-038 | It's an Order! Do Not Defy Me!!! | event | power-buff | [Main] Up to 1 of your opponent's rested Characters with a cost of 8 or less that has 2 or more DON!! cards given will not become active in your opponent's next |
| OP15-041 | Orlumbus | character | draw,keyword,move-bottom-deck | [On K.O.] Draw 1 card.[Activate: Main] [Once Per Turn] You may place 1 of your Characters at the bottom of the owner's deck: This Character gains [Rush] during  |
| OP15-042 | Kyros | character | keyword,trash-hand | [On Play] You may trash 1 card from your hand: If your Leader is [Rebecca], this Character gains [Rush] during this turn.[On K.O.] Add this Character card from  |
| OP15-043 | Kelly Funk | character | play-from | [On Play] Play up to 1 [Bobby Funk] from your hand. |
| OP15-045 | Sai | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] You may trash 1 Event from your han |
| OP15-047 | Sanji | character | keyword | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Up to 1 of your Characters gains [U |
| OP15-051 | Monkey.D.Luffy | character | power-buff | [Opponent's Turn] If your Leader has the {Dressrosa} type, this Character gains +3000 power. |
| OP15-052 | Leo | character | move-bottom-deck | If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may place 1 of your Characters at the bottom of th |
| OP15-053 | Rebecca | character | keyword,search,move-bottom-deck | [DON!! x1] This Character gains [Blocker].[On Play] Look at 3 cards from the top of your deck; reveal up to 1 {Dressrosa} type card and add it to your hand. The |
| OP15-054 | And No One Else Can Have It! It's Our Memento of Him | event | draw,play-from,trash-hand,choose-one,return-hand | [Main] If your Leader is [Lucy], choose one:• Draw 2 cards and trash 1 card from your hand. Then, play up to 1 {Dressrosa} type Character card with a cost of 4  |
| OP15-056 | Would You Let Me Eat the Flame-Flame Fruit? | event | draw,keyword | [Main] Draw 2 cards. Then, your [Lucy] Leader gains [Double Attack] and +3000 power during this turn.(This card deals 2 damage.) [Trigger] Draw 2 cards. |
| OP15-057 | Dressrosa Kingdom | stage | draw,power-buff | [On Play] If your Leader has the {Dressrosa} type, draw 1 card.[On Your Opponent's Attack] You may rest this Stage and trash 1 Event or Stage card from your han |
| OP15-058 | Enel | leader | give-don | Under the rules of this game, your DON!! deck consists of 6 cards.[Activate: Main] [Once Per Turn] If it is your second turn or later, add up to 1 DON!! card fr |
| OP15-059 | Amazon | character | power-buff | [On Your Opponent's Attack] You may rest this Character: Your opponent may return 1 of their active DON!! cards to their DON!! deck. If they do not, give up to  |
| OP15-064 | Kotori | character | rest | [Activate: Main] DON!! −2, You may rest this Character: If you have [Satori] and [Hotori], rest up to 1 of your opponent's Characters with 5000 power or less. |
| OP15-066 | Satori | character | draw,search,don-minus | [On Play] DON!! −1: Draw 1 card.[When Attacking] If you have 6 or less DON!! cards on your field, look at 2 cards from the top of your deck and place them at th |
| OP15-067 | Shura | character | draw,keyword,don-minus | If you have 6 or less DON!! cards on your field, this Character gains [Rush].(This card can attack on the turn in which it is played.)[On Play] DON!! −1: Draw 1 |
| OP15-068 | Heavenly Warriors | character | keyword | If you have 6 or less DON!! cards on your field, this Character gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the n |
| OP15-072 | Hotori | character | power-buff | [Activate: Main] DON!! −2, You may rest this Character: If you have [Kotori] and [Satori], give up to 1 of your opponent's Characters −3000 power during this tu |
| OP15-073 | Yama | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Play up to 1 [Heavenly Warriors] wi |
| OP15-075 | El Thor | event | ko,power-buff,don-minus | [Main] DON!! −1: If your Leader is [Enel], up to 1 of your Leader or Character cards gains +1000 power during this turn. Then, K.O. up to 1 of your opponent's C |
| OP15-076 | Lightning Beast Kiten | event | draw,power-buff,don-minus | [Main] DON!! −1: If your Leader is [Enel], draw 1 card. Then, give up to 1 of your opponent's Characters −1000 power during this turn.[Counter] Up to 1 of your  |
| OP15-077 | Lightning Dragon | event | draw,don-minus | [Main] DON!! −1: Draw 1 card. Then, up to 1 of your opponent's rested Characters with 6000 power or less will not become active in your opponent's next Refresh  |
| OP15-080 | Oars | character | power-buff,move-bottom-deck | If you have [Gecko Moria] with 10000 power or more on your field and there are no other [Oars] cards, this Character gains +7000 power.[On K.O.] You may place 3 |
| OP15-081 | Sanji | character | trash-top | [On Play] If your Leader has the {Straw Hat Crew} type, trash 5 cards from the top of your deck. |
| OP15-082 | Charlotte Lola | character | trash-top | [On Play] Trash 3 cards from the top of your deck.[On K.O.] Add up to 1 of your Character cards with a cost of 8 or less from your trash to your hand. |
| OP15-083 | Spoil | character | trash-top,give-don | [On Play] Trash 3 cards from the top of your deck.[Activate: Main] You may trash this Character: If you have 15 or more cards in your trash, give up to 1 rested |
| OP15-084 | Dr. Hogback | character | draw,trash-top | [On Play] If your Leader has the {Thriller Bark Pirates} type, trash 5 cards from the top of your deck.[On K.O.] If you have 6 or less cards in your hand, draw  |
| OP15-085 | Tony Tony.Chopper | character | trash-top | [On Play] Trash 3 cards from the top of your deck.[Activate: Main] You may trash this Character: If your Leader has the {Straw Hat Crew} type, add up to 1 {Stra |
| OP15-086 | Nami | character | keyword,play-from | [On Play] If your Leader has the {Straw Hat Crew} type, play up to 1 {Straw Hat Crew} type Character with a cost of 7 or less from your trash. The Character pla |
| OP15-087 | Nico Robin | character | draw,keyword,trash-hand | If you have 10 or more cards in your trash, this Character gains [Blocker].[On Play] Draw 2 cards and trash 2 cards from your hand. |
| OP15-088 | Pirates Docking Six | character | play-from,trash-top | This Character gains +6 cost.[On Play] You may trash 3 cards from the top of your deck: Play up to 1 {Straw Hat Crew} type Character card with a cost of 2 or le |
| OP15-090 | Perona | character | trash-hand | If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may trash 1 card from your hand instead. |
| OP15-091 | Margarita | character | move-bottom-deck | [On Play] Place up to 1 card from your opponent's trash at the bottom of the owner's deck. |
| OP15-095 | Gum-Gum Storm | event | power-buff | [Main] You may rest 1 of your DON!! cards: If you have 15 or more cards in your trash, up to 1 of your {Straw Hat Crew} type Leader or Character cards gains +30 |
| OP15-096 | Swallow Bond en Avant | event | power-buff,trash-hand,trash-top | [Main] You may rest 1 of your DON!! cards: If your Leader has the {Straw Hat Crew} type, trash 5 cards from the top of your deck.[Counter] You may trash 1 card  |
| OP15-098 | Monkey.D.Luffy | leader | add-life-to-hand | If your {Sky Island} type Character with 6000 base power or more would be removed from the field by your opponent, you may add 1 card from the top of your Life  |
| OP15-099 | Urouge | character | keyword,give-don | [On Play] You may trash 1 {Supernovas} type card from your hand: This Character gains [Rush] during this turn.[Activate: Main] You may turn 1 card from the top  |
| OP15-100 | Kamakiri | character | ko,add-life-to-hand | [On Play] You may trash this Character and add 1 card from the top of your Life cards to your hand: K.O. up to 1 of your opponent's Characters with a cost of 6  |
| OP15-101 | Kalgara | character | search,move-bottom-deck,trash-hand | [On Play] You may trash 1 card from your hand: Look at 5 cards from the top of your deck; reveal up to a total of 2 [Mont Blanc Noland] or {Shandian Warrior} ty |
| OP15-103 | Genbo | character | draw | [Trigger] Draw 1 card. Then, if you have 2 or less Life cards, play this card. |
| OP15-104 | Conis | character | draw,trash-hand | [On Play] If you have less Life cards than your opponent, draw 2 cards and trash 2 cards from your hand. [Trigger] Draw 2 cards and trash 1 card from your hand. |
| OP15-105 | Jewelry Bonney | character | add-life-to-hand | If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may add 1 card from the top of your Life cards to  |
| OP15-106 | Octoballoon | character | draw,play-from | [Trigger] Draw 1 card. Then, play up to 1 yellow Character or Stage card with a cost of 2 or less from your hand. |
| OP15-109 | Nico Robin | character | play-from,add-life-to-hand | [On Play] You may add 1 card from the top of your Life cards to your hand: If your Leader has the {Straw Hat Crew} type, add up to 1 card from the top of your d |
| OP15-111 | Mont Blanc Noland | character | keyword | [DON!! x1] [When Attacking] Up to 1 of your [Kalgara] cards gains [Rush] during this turn.(This card can attack on the turn in which it is played.) |
| OP15-112 | Raki | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Play up to 1 {Shandian Warrior} typ |
| OP15-113 | Roronoa Zoro | character | trash-hand | [On Play] You may trash 1 card from your hand: Add up to 1 card from the top of your deck to the top of your Life cards. |
| OP15-114 | Wyper | character | ko,power-buff,give-don | [On Play] You may turn 1 card from the top of your Life cards face-up: Give all of your opponent's Characters −2000 power during this turn. Then, K.O. all of yo |
| OP15-115 | Impact Dial | event | ko,add-life-to-hand | [Main] K.O. up to 1 of your opponent's Characters with a cost of 4 or less. Then, add 1 card from the top of your Life cards to your hand. [Trigger] K.O. up to  |
| OP15-116 | Gum-Gum Golden Rifle | event | power-buff,trash-hand | [Main] If your Leader has the {Straw Hat Crew} type, trash 1 card from the top of your Life cards. Then, add up to 1 card from the top of your deck to the top o |
| OP15-117 | Heso!! | event | draw,give-don | [Main] Draw 1 card. Then, give up to 1 rested DON!! card to 1 of your {Sky Island} type Leader or Character cards. [Trigger] If your Leader has the {Sky Island} |
| OP15-118 | Enel | character | power-buff,search,move-bottom-deck,trash-hand,don-minus | If you have 6 or less DON!! cards on your field, this Character cannot be removed from the field by your opponent's effects and gains +2000 power.[On Play] DON! |
| OP16-001 | Portgas.D.Ace | leader | keyword | [Activate: Main] [Once Per Turn] Up to 1 of your [Monkey.D.Luffy] Characters or up to 1 of your Characters with a type including "Whitebeard Pirates", with 8000 |
| OP16-002 | Izo | character | draw | [On Play] You may reveal 1 Character card with 8000 power from your hand: Draw 1 card. |
| OP16-003 | Edward.Newgate | character | power-buff,keyword | [Your Turn] Your Leader gains [Double Attack] and +2000 power.[On Play] You may reveal 2 Character cards with 8000 power from your hand: Give up to 1 of your op |
| OP16-006 | Shanks | character | ko | [On Play] You may rest 2 of your DON!! cards: K.O. up to 1 of your opponent's Characters with 4000 power or less. |
| OP16-007 | Jozu | character | power-buff | [Blocker][On Play] You may reveal 1 Character card with 8000 power from your hand: Give up to 1 of your opponent's Characters −1000 power during this turn. |
| OP16-010 | Namule | character | ko | [On Play] You may reveal 1 Character card with 8000 power from your hand: K.O. up to 1 of your opponent's Characters with 2000 base power or less. |
| OP16-011 | Vista | character | draw,ko | [On Play] You may reveal 1 Character card with 8000 power from your hand: Draw 1 card.[DON!! x1] [When Attacking] K.O. up to 2 of your opponent's Characters wit |
| OP16-012 | Benn.Beckman | character | play-from | [Blocker][On Play] You may rest 1 of your DON!! cards: If your Leader has the {Red-Haired Pirates} type and you have 10 DON!! cards on your field, play up to 1  |
| OP16-013 | McGuy | character | ko | [On K.O.] K.O. up to 1 of your opponent's Characters with 8000 base power or less. |
| OP16-017 | LittleOars Jr. | character | power-buff | If you have no Characters with a type including "Whitebeard Pirates" and a cost of 8 or more, give this Character −4000 power.[Blocker] (After your opponent dec |
| OP16-019 | Let's Show 'Em What We're Made Of!! | event | power-buff,play-from | [Main] Play up to 2 Character cards with a type including "Whitebeard Pirates" and 8000 power from your hand. [Trigger] Your Leader gains +1000 power during thi |
| OP16-020 | If You're Coming with Me... Kiss Your Lives Goodbye!! | event | draw,power-buff,trash-hand | [Main] You may rest 1 of your DON!! cards and reveal 1 Character card with 8000 power from your hand: Draw 1 card.[Counter] You may trash 1 card from your hand: |
| OP16-021 | Moby Dick | stage | search,move-bottom-deck,give-don | [On Play] If your Leader has the {Whitebeard Pirates} type, look at 3 cards from the top of your deck and add up to 1 card to your hand. Then, place the rest at |
| OP16-022 | Monkey.D.Luffy | leader | set-active | [Activate: Main] [Once Per Turn] If the only Characters on your field are {Impel Down} type Characters, set up to 2 of your DON!! cards as active. |
| OP16-024 | Inazuma | character | rest | When this Character is K.O.'d by your opponent's effect, rest up to 1 of your opponent's Characters.[Blocker] (After your opponent declares an attack, you may r |
| OP16-025 | Bunkov | character | play-from | [When Attacking] If you have [Antlerkov], play up to 1 Character card with a cost of 2 or less from your hand. |
| OP16-026 | Emporio.Ivankov | character | search,play-from,move-bottom-deck | [On Play] Look at 3 cards from the top of your deck; reveal up to 1 {Impel Down} type card, add it to your hand and place the rest at the bottom of your deck in |
| OP16-027 | Jinbe | character | power-buff | [DON!! x1] This Character gains +2000 power. |
| OP16-029 | Antlerkov | character | play-from | [When Attacking] If you have [Bunkov], play up to 1 Character card with a cost of 2 or less from your hand. |
| OP16-031 | Buggy | character | play-from | [On K.O.] Play up to 1 [Prisoner of Impel Down] card from your hand. |
| OP16-035 | Roronoa Zoro | character | rest,trash-hand,give-don | [On Play] Rest up to 1 of your opponent's cards. Then, you may trash 1 card from your hand. If you do, give up to 3 rested DON!! cards to your Leader. |
| OP16-036 | Mr.2.Bon.Kurei(Bentham) | character | rest | [On Play] Rest up to 1 of your opponent's Characters with a cost of 4 or less.[When Attacking] This Character's base power becomes the same as your opponent's L |
| OP16-037 | Mr.3(Galdino) | character | rest | [On Play] If your Leader has the {Impel Down} type, rest up to 1 of your opponent's Characters with a cost of 5 or less. |
| OP16-038 | Let's Go!! To the Navy Headquarters!! | event | power-buff | [Main] You may rest 6 of your DON!! cards: If you have 5 {Impel Down} type Characters with different card names, set your Leader and all of your Characters as a |
| OP16-039 | Gum-Gum Twin Jet Pistol | event | rest,keyword | [Main] Up to 1 of your [Monkey.D.Luffy] cards gains [Double Attack] during this turn. Then, if your Leader has the {Impel Down} type, rest up to 2 of your oppon |
| OP16-040 | Gum-Gum Hammer Rifle | event | power-buff | [Main] If you have [Monkey.D.Luffy] and [Mr.3(Galdino)], up to 1 of your opponent's rested Characters with a cost of 6 or less will not become active in your op |
| OP16-041 | Buggy | leader | play-from | [DON!! x1] [Once Per Turn] This effect can be activated when your {Impel Down} type Character card is removed from the field. Play up to 1 [Prisoner of Impel Do |
| OP16-043 | Usopp | character | return-hand | [Blocker][On K.O.] You may rest 1 of your {Dressrosa} type Leader or Stage cards: Return up to 1 of your opponent's Characters with a cost of 5 or less to the o |
| OP16-045 | Crocodile | character | play-from,return-hand | [Blocker][On Play] You may return 1 of your Characters with a cost of 2 or more to the owner's hand: Play up to 1 {Impel Down} type Character card with a cost o |
| OP16-048 | Buggy | character | draw,keyword,play-from | [On Play] If your Leader has the {Impel Down} type, draw 1 card and play up to 1 [Prisoner of Impel Down] card from your hand.[Once Per Turn] This effect can be |
| OP16-049 | Portgas.D.Ace | character | draw | [Activate: Main] You may rest this Character: Draw 1 card. |
| OP16-050 | Miss Olive | character | draw,trash-hand,return-hand | [Blocker][On Play] You may return 1 of your Characters with a cost of 2 or more to the owner's hand: Draw 2 cards and trash 1 card from your hand. |
| OP16-051 | Mohji & Cabaji | character | draw | [On Play] If you have 5 or less cards in your hand, draw 2 cards. |
| OP16-053 | Roronoa Zoro | character | draw | [When Attacking] If you have 6 or less cards in your hand, draw 1 card. |
| OP16-054 | Mr.1(Daz.Bonez) | character | draw,power-buff | [DON!! x1] [Your Turn] If you have 5 or more cards in your hand, this Character gains +3000 power.[On Play] Draw 1 card. |
| OP16-055 | Mr.2.Bon.Kurei(Bentham) | character | draw | [On Play] Draw 1 card.[DON!! x1] [When Attacking] This Character's base power becomes the same as your opponent's Leader's power during this turn. |
| OP16-057 | Captain Buggy's Our Savior!! | event | draw,power-buff,trash-hand | [Counter] If you have 2 or more [Prisoner of Impel Down] cards, up to 1 of your Leader or Character cards gains +4000 power during this battle. [Trigger] Draw 2 |
| OP16-058 | The Prisoners Are Rioting!! | event | power-buff | [Main] If you have 10 DON!! cards on your field, all of your [Prisoner of Impel Down] cards' base power becomes 7000 during this turn.[Counter] Up to 1 of your  |
| OP16-059 | We'll Change This Mission from Sneaky to Flashy! | event | power-buff,search,play-from,move-bottom-deck | [Main] You may rest 7 of your DON!! cards: Look at 5 cards from the top of your deck; play up to 2 {Impel Down} type Character cards with 6000 power or less. Th |
| OP16-060 | Sengoku | leader | play-from | [Activate: Main] You may return 8 of your active DON!! cards to your DON!! deck: Play up to 3 {Admiral} type Character cards with different card names from your |
| OP16-063 | Kuzan | character | don-minus | [On Play] Add up to 2 DON!! cards from your DON!! deck and rest them.[Activate: Main] [Once Per Turn] DON!! −1: Up to 1 of your opponent's Characters cannot act |
| OP16-066 | Sengoku | character | draw,trash-hand | [On Play] If your Leader has the {Navy} type, add up to 2 DON!! cards from your DON!! deck and rest them. Then, draw 2 cards and trash 2 cards from your hand. |
| OP16-068 | Trafalgar Law | character | power-buff | [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.[When Attacking] If your Leader has the {Donquixote Pirates} type, this Character gai |
| OP16-071 | Benevolent King of the Waves | character | trash-hand | [On Play] You may trash 1 card from your hand: Add up to 1 DON!! card from your DON!! deck and rest it.[On K.O.] Add up to 1 DON!! card from your DON!! deck and |
| OP16-076 | The Three Admirals!! | event | power-buff | [Main] You may rest 3 of your DON!! cards: Up to 3 of your {Admiral} type Characters gain +2000 power during this turn.[Counter] If you have an {Admiral} type C |
| OP16-077 | "Buddha" Sengoku | event | search,move-bottom-deck,trash-hand | [Main] Look at 5 cards from the top of your deck; reveal up to 2 {Navy} type cards, add them to your hand and place the rest at the bottom of your deck in any o |
| OP16-079 | Yamato | leader | keyword | When a {Land of Wano} type Character card is played from your trash, that Character gains [Rush] during this turn.(This card can attack on the turn in which it  |
| OP16-081 | Otama | character | power-buff | [Activate: Main] You may rest this Character: If you have a Character with a cost of 8 or more, give up to 1 of your opponent's Characters −2000 power during th |
| OP16-082 | Kin'emon | character | search | This Character gains +3 cost.[On Play] If your Leader has the {Land of Wano} type, look at 5 cards from the top of your deck; reveal up to 1 {Land of Wano} type |
| OP16-083 | Kouzuki Oden | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] You may trash 1 Character card with |
| OP16-084 | Kouzuki Momonosuke | character | play-from | [Activate: Main] You may trash this Character with a cost of 20 or more: If you have 9 or more DON!! cards on your field, play up to 1 [Kouzuki Momonosuke] with |
| OP16-085 | Kouzuki Momonosuke | character | play-from | [Blocker][On Play] Play up to 1 {Land of Wano} type Character card with a cost of 6 or less other than [Kouzuki Momonosuke] from your trash. |
| OP16-087 | Shinobu | character | draw | [On Play] You may trash this Character: If your Leader has the {Land of Wano} type, draw 1 card and up to 1 of your [Kouzuki Momonosuke] gains +20 cost during t |
| OP16-089 | Dracule Mihawk | character | draw,trash-hand | [Rush: Character] (This card can attack Characters on the turn in which it is played.)[On Play] Draw 2 cards and trash 2 cards from your hand. Then, give up to  |
| OP16-090 | Tony Tony.Chopper | character | draw,ko,trash-hand | [On Play] Draw 2 cards and trash 2 cards from your hand. Then, K.O. up to 1 of your opponent's Characters with a cost of 1 or less. |
| OP16-092 | Nico Robin | character | draw | [On Play] You may trash 1 Character card with a cost of 8 or more from your hand: Draw 2 cards. |
| OP16-093 | Bartholomew Kuma | character | draw,trash-hand,give-don | [On Play] Draw 2 cards and trash 2 cards from your hand. Then, give up to 1 rested DON!! card to your Leader or 1 of your Characters. |
| OP16-094 | Portgas.D.Ace | character | give-don | [On K.O.] Your opponent trashes 2 cards from their hand.[Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to 1 of your {Land of Wano} type Leader  |
| OP16-095 | Monkey.D.Luffy | character | keyword | [On Play] Up to 1 of your black {Land of Wano} type Characters gains [Unblockable] during this turn.(This card cannot be blocked.) |
| OP16-096 | Yamato | character | play-from | [Unblockable] (This card cannot be blocked.)[On K.O.] Play up to 1 [Yamato] with a cost of 6 or less from your trash. |
| OP16-097 | Yamato | character | play-from | [On Play] Add up to 1 {Land of Wano} type Character card with a cost of 6 or less from your trash to your hand. Then, play up to 1 Character card with a cost of |
| OP16-098 | Yamato | character | draw,play-from,trash-hand | [On Play] Draw 1 card and trash 1 card from your hand.[Activate: Main] You may trash this Character: Play up to 1 black [Yamato] with a cost of 8 from your tras |
| OP16-099 | I've Come Here... To Cut Those Chains!!! | event | power-buff,play-from,trash-top | [Main] You may rest 6 of your DON!! cards: Trash 5 cards from the top of your deck. Then, play up to 1 {Land of Wano} type Character card with a cost of 6 or le |
| OP16-100 | Hallowed Glacier Slash | event | power-buff | [Main] You may rest 2 of your DON!! cards: If your opponent's Character has been K.O.'d during this turn, set your Leader [Yamato] as active.[Counter] Your Lead |
| OP16-101 | Mahoroba | event | ko,power-buff | [Main] Up to 1 of your Leader or Character cards gains +3000 power during this turn. Then, if you have 10 or more cards in your trash, K.O. up to 1 of your oppo |
| OP16-103 | Van Augur | character | draw,power-buff | [Opponent's Turn] [On K.O.] If your Leader has the {Blackbeard Pirates} type, draw 1 card and give up to 1 of your opponent's Leader or Character cards −3000 po |
| OP16-104 | Catarina Devon | character | draw,play-from | [When Attacking] Select up to 1 of your opponent's Characters. This Character's base power becomes the same as the selected Character's power during this turn.  |
| OP16-105 | Gecko Moria | character | play-from | [Trigger] If you have 1 or less Life cards, play up to 1 [Absalom], up to 1 [Dr. Hogback], and up to 1 [Perona], with a cost of 4 or less from your trash. |
| OP16-106 | Sanjuan.Wolf | character | draw | [On K.O.] If your Leader has the {Blackbeard Pirates} type, draw 1 card, then up to 1 of your Leader or Character cards' base power becomes 7000 during this tur |
| OP16-107 | Jesus Burgess | character | trash-hand | [On K.O.] Add up to 1 card from the top of your opponent's Life cards to the owner's hand. [Trigger] You may trash 1 card from your hand: Play this card. |
| OP16-108 | Shiryu | character | draw,trash-hand | [On Play] You may trash 1 card from your hand: Add up to 1 {Blackbeard Pirates} type card with a cost of 6 or less from your trash to the top of your Life cards |
| OP16-109 | Doc Q | character | draw,ko | [On K.O.] If your Leader has the {Blackbeard Pirates} type, draw 1 card and K.O. up to 2 of your opponent's Characters with a cost of 1 or less. [Trigger] Activ |
| OP16-110 | Vasco Shot | character | draw,rest | [On K.O.] Draw 1 card and rest up to 1 of your opponent's Characters with a cost of 6 or less. [Trigger] Activate this card's [On K.O.] effect. |
| OP16-113 | Boa Marigold | character | keyword | If you have 2 or less Life cards, this Character gains [Blocker]. [Trigger] If your Leader has the {Kuja Pirates} type, play this card. |
| OP16-114 | Laffitte | character | ko | [On K.O.] K.O. up to 1 of your opponent's Characters with a cost of 4 or less. [Trigger] Activate this card's [On K.O.] effect. |
| OP16-116 | Zehahahahaha! | event | draw,play-from,trash-hand | [Main] If you have 10 DON!! cards on your field, play up to 1 [Marshall.D.Teach] from your hand. Then, add up to 1 card from the top of your opponent's Life car |
| OP16-118 | Portgas.D.Ace | character | search,move-bottom-deck | The counter of all of your Character cards with 8000 power in your hand becomes +2000.[On Play]/[On K.O.] Look at 5 cards from the top of your deck; reveal up t |
| P-029 | Bartolomeo | character | set-active | [End of Your Turn] You may rest this Character: Set up to 1 of your {FILM} type Characters other than [Bartolomeo] as active. |
| P-030 | Jinbe | character | move-bottom-deck | [On K.O.] Place up to 1 Character with a cost of 3 or less at the bottom of the owner's deck. |
| P-044 | Sabo | character | power-buff | [DON!! x1] If you have 4 or less cards in your hand, this Character gains +2000 power. |
| P-053 | Nami | character | return-hand | [On Play] If you have 3 or less cards in your hand, return up to 1 of your opponent's Characters with a cost of 3 or less to the owner's hand. |
| P-068 | Sanji | character | search | [Activate: Main] You may trash this Character: Look at 5 cards from the top of your deck and place them at the top or bottom of the deck in any order. |
| P-073 | Sabo | character | power-buff | [Activate: Main] [Once Per Turn] You may add 1 card from the top or bottom of your Life cards to your hand: This Character gains +1000 power during this turn. |
| P-074 | Portgas.D.Ace | character | search,return-hand | [Activate: Main] You may return this Character to the owner's hand: Look at 5 cards from the top of your deck and place them at the top or bottom of the deck in |
| P-075 | Monkey.D.Luffy | character | draw,trash-hand,give-don | [On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.[When Attacking] If you have a Character with a cost of 8 or more on your field, |
| P-079 | Lim | character | set-active | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[End of Your Turn] If you have 2 or more rest |
| P-081 | Dracule Mihawk | character | play-from,return-hand | [Activate: Main] You may return this Character to the owner's hand: If you have 3 or more blue {Cross Guild} type Characters, play up to 1 {Cross Guild} type Ch |
| P-082 | Crocodile | character | move-bottom-deck | [Your Turn] [On Play] If your Leader has the {Cross Guild} type or a type including "Baroque Works", place up to 1 of your opponent's Characters with 2000 power |
| P-083 | Shanks | character | draw,power-buff | [DON!! x1] [When Attacking] You may trash 1 Character card from your hand: Give up to 1 of your opponent's Characters −1000 power during this turn. Then, draw 1 |
| P-105 | Sabo | character | keyword,give-don | If your Leader has the {Revolutionary Army} type, this Character gains [Blocker] and +4 cost.[On Play] You may add 1 card from the top or bottom of your Life ca |
| PRB01-001 | Sanji | leader | keyword | [Activate: Main] [Once Per Turn] Up to 1 of your Characters without an [On Play] effect and with a cost of 8 or less gains [Rush] during this turn. (This card c |
| PRB02-001 | Koby | character | draw,ko,power-buff | [Opponent's Turn] If your Leader has the {Navy} type, this Character gains +1000 power.[When Attacking] K.O. up to 1 of your opponent's Characters with 3000 bas |
| PRB02-002 | Trafalgar Law | character | power-buff | [Once Per Turn] If this Character would be removed from the field by your opponent's effect, you may give this Character −2000 power during this turn instead.[W |
| PRB02-003 | Lucky.Roux | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] You may trash 1 Character card with |
| PRB02-004 | Jewelry Bonney | character | set-active | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Your Opponent's Attack] [Once Per Turn] S |
| PRB02-007 | Jinbe | character | search,move-bottom-deck | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {The Seven Warlords of the Sea} type card other than [Jinbe] and add it to your hand. Then,  |
| PRB02-008 | Marco | character | draw | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] Draw 2 cards. |
| PRB02-009 | Mr.3(Galdino) | character | draw | This effect can be activated when this Character is rested by your opponent's effect. You may trash this Character and draw 2 cards.[Blocker] |
| PRB02-010 | Charlotte Pudding | character | draw,play-from | [On Play] DON!! −2: If your Leader has the {Big Mom Pirates} type and your opponent has 6 or more DON!! cards on their field, draw 2 cards. Then, play up to 1 { |
| PRB02-012 | Nami | character | search,move-bottom-deck | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card other than [Nami] and add it to your hand. Then, place the rest a |
| PRB02-013 | Gecko Moria | character | play-from,give-don | [On Play] If your Leader has the {Thriller Bark Pirates} type, play up to 1 Character card with a cost of 4 or less from your trash rested. Then, give up to 1 r |
| PRB02-015 | Shiryu | character | ko,keyword | If your Leader has the {Blackbeard Pirates} type, this Character gains [Blocker] and +4 cost.[On K.O.] If your Leader has the {Blackbeard Pirates} type, K.O. up |
| PRB02-016 | Otama | character | rest,power-buff | [Activate: Main] You may rest this Character and add 1 card from the top or bottom of your Life cards to your hand: Up to 1 of your Leader or Character cards ga |
| ST10-004 | Sanji | character | keyword | [On Play] If your opponent has a Character with 5000 or more power, this Character gains [Rush] during this turn.(This card can attack on the turn in which it i |
| ST11-003 | Backlight | event | ko,rest,choose-one | [Main] If your Leader is [Uta], choose one:• Rest up to 1 of your opponent's Characters with a cost of 5 or less.• K.O. up to 1 of your opponent's rested Charac |
| ST12-006 | Yosaku & Johnny | character | ko,rest,choose-one | [DON!! x1] [When Attacking] Choose one:• Rest up to 1 of your opponent's Characters with a cost of 2 or less.• K.O. up to 1 of your opponent's rested Characters |
| ST13-001 | Sabo | leader | power-buff | [DON!! x1] [Activate: Main] [Once Per Turn] You may add 1 of your Characters with a cost of 3 or more and 7000 power or more to the top of your Life cards face- |
| ST13-002 | Portgas.D.Ace | leader | search,move-bottom-deck | [DON!! x2] [Activate: Main] [Once Per Turn] Look at 5 cards from the top of your deck and add up to 1 Character card with a cost of 5 to the top of your Life ca |
| ST13-005 | Emporio.Ivankov | character | search | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] You may trash 1 card from the top o |
| ST13-006 | Curly.Dadan | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Play up to 1 each of [Sabo], [Portg |
| ST13-015 | Monkey.D.Luffy | character | draw,power-buff | [Activate: Main] [Once Per Turn] This Character gains +2000 power until the start of your next turn. Then, if you have 1 or more Life cards, draw 1 card and tra |
| ST14-001 | Monkey.D.Luffy | leader | power-buff | [DON!! x1] All of your Characters gain +1 cost. If you have a Character with a cost of 8 or more, this Leader gains +1000 power. |
| ST15-002 | Edward.Newgate | character | ko,give-don | [On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.[Activate: Main] You may rest this Character: K.O. up to 1 of your opponent's Ch |
| ST15-003 | Kingdew | character | power-buff | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] When this Character is K.O. |
| ST15-004 | Thatch | character | power-buff,add-life-to-hand | [On Play] If your Leader's type includes "Whitebeard Pirates", give up to 1 of your opponent's Characters −2000 power during this turn. Then, add 1 card from th |
| ST15-005 | Portgas.D.Ace | character | power-buff,keyword | If your Leader's type includes "Whitebeard Pirates", this Character gains [Rush].(This card can attack on the turn in which it is played.)[Once Per Turn] If thi |
| ST16-001 | Uta | character | give-don | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Activate: Main] [Once Per Turn] You may tras |
| ST16-004 | Shanks | character | ko | [On Play] K.O. up to 1 of your opponent's rested Characters. |
| ST17-001 | Crocodile | character | draw | [On Play] Reveal 1 card from the top of your deck. If that card is a {The Seven Warlords of the Sea} type card, draw 2 cards and place 1 card from your hand at  |
| ST17-002 | Trafalgar Law | character | return-hand | [On Play] You may return 1 of your Characters to the owner's hand: If your Leader has the {The Seven Warlords of the Sea} type, return up to 1 Character with a  |
| ST17-003 | Buggy | character | search | [On Play] Look at 3 cards from the top of your deck and place them at the top of your deck in any order. |
| ST17-004 | Boa Hancock | character | search,give-don | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Look at 3 cards from the top of you |
| ST17-005 | Marshall.D.Teach | character | give-don | [Activate: Main] [Once Per Turn] You may place 1 card from your hand at the top of your deck: Give up to 2 rested DON!! cards to your Leader or 1 of your Charac |
| ST18-001 | Uso-Hachi | character | rest | [On Play] If you have 8 or more DON!! cards on your field, rest up to 1 of your opponent's Characters with a cost of 5 or less. |
| ST18-002 | O-Nami | character | draw,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If you have 8 or more DON!! cards o |
| ST18-003 | San-Gorou | character | draw | [When Attacking] [Once Per Turn] If you have 8 or more DON!! cards on your field, draw 1 card. |
| ST18-005 | Luffy-Tarou | character | play-from,don-minus | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Play up to 1 purple {Straw Hat Crew} type Character |
| ST19-002 | Sengoku | character | draw | [On Play] You may trash 2 black {Navy} type cards from your hand: If your Leader has the {Navy} type, draw 3 cards. |
| ST19-004 | Hina | character | move-bottom-deck,give-don | [DON!! x1] [Opponent's Turn] This Character gains +4 cost.[Activate: Main] [Once Per Turn] You may place 1 card from your trash at the bottom of your deck: Give |
| ST19-005 | Monkey.D.Garp | character | move-bottom-deck | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Activate: Main] [Once Per Turn] You may plac |
| ST20-001 | Charlotte Katakuri | character | give-don | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Activate: Main] [Once Per Turn] You may turn |
| ST20-002 | Charlotte Cracker | character | trash-hand | [Once Per Turn] If this Character would be K.O.'d by an effect, you may trash 1 card from the top of your Life cards instead. [Trigger] You may trash 1 card fro |
| ST20-003 | Charlotte Brulee | character | peek-life | [Trigger] Look at up to 1 card from the top of your or your opponent's Life cards, and place it at the top or bottom of the Life cards. Then, add this card to y |
| ST20-004 | Charlotte Pudding | character | rest,add-life-to-hand,set-active | [On Play] You may add 1 card from the top of your Life cards to your hand: Set up to 1 of your {Big Mom Pirates} type Characters with a cost of 3 or less as act |
| ST20-005 | Charlotte Linlin | character | trash-hand | [On Play] You may trash 1 card from your hand: Your opponent chooses one:• Your opponent trashes 2 cards from their hand.• Trash 1 card from the top of your opp |
| ST21-001 | Monkey.D.Luffy | leader | give-don | [DON!! x1] [Activate: Main] [Once Per Turn] Give up to 2 rested DON!! cards to 1 of your Characters. |
| ST21-002 | Usopp | character | power-buff | [DON!! x2] [Opponent's Turn] This Character gains +2000 power. |
| ST21-004 | Jewelry Bonney | character | draw | [DON!! x2] [On K.O.] Draw 1 card. |
| ST21-009 | Nami | character | give-don | [Activate: Main] [Once Per Turn] Give up to 2 rested DON!! cards to 1 of your {Straw Hat Crew} type Leader or Character cards. |
| ST21-010 | Nico Robin | character | ko | [DON!! x2] [When Attacking] K.O. up to 1 of your opponent's Characters with 4000 power or less. |
| ST21-012 | Brook | character | give-don | [When Attacking] Give up to 2 rested DON!! cards to your Leader or 1 of your Characters. |
| ST21-014 | Monkey.D.Luffy | character | give-don | [Rush] (This card can attack on the turn in which it is played.)[When Attacking] Give up to 1 rested DON!! card to your Leader or 1 of your Characters. |
| ST21-015 | Roronoa Zoro | character | keyword,play-from | [DON!! x2] This Character gains [Rush].[On K.O.] Play up to 1 red Character card with 6000 power or less other than [Roronoa Zoro] from your hand. |
| ST21-016 | Gum-Gum Dawn Whip | event | ko,power-buff | [Main] Up to 1 of your Leader or Character cards gains +1000 power during this turn. Then, up to 1 of your opponent's Characters with 4000 power or less cannot  |
| ST21-017 | Gum-Gum Mole Pistol | event | ko,power-buff | [Main] Give up to 1 of your opponent's Characters −5000 power during this turn. Then, if you have a Character with 6000 power or more, K.O. up to 1 of your oppo |
| ST22-001 | Ace & Newgate | leader | draw | [Activate: Main] [Once Per Turn] You may reveal 1 card with a type including "Whitebeard Pirates" from your hand: Draw 1 card and place the revealed card at the |
| ST22-002 | Izo | character | draw,search,move-bottom-deck | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 card with a type including "Whitebeard Pirates" other than [Izo] and add it to your hand. Th |
| ST22-003 | Edward.Newgate | character | draw | [Double Attack] (This card deals 2 damage.)[On Play] Reveal 1 card from the top of your deck. If that card's type includes "Whitebeard Pirates", draw 2 cards. |
| ST22-005 | Kouzuki Oden | character | trash-hand,set-active,return-hand | If this Character would be removed from the field by your opponent's effect, you may trash 2 cards from your hand instead.[Activate: Main] [Once Per Turn] You m |
| ST22-006 | Jozu | character | draw,trash-hand | [On Play] Reveal 1 card from the top of your deck. If that card's type includes "Whitebeard Pirates", draw 2 cards and trash 1 card from your hand. |
| ST22-007 | Squard | character | give-don | [Activate: Main] [Once Per Turn] Reveal 1 card from the top of your deck. If that card's type includes "Whitebeard Pirates", give up to 1 rested DON!! card to y |
| ST22-011 | Whitey Bay | character | power-buff | [Your Turn] [On Play] You may reveal 2 cards with a type including "Whitebeard Pirates" from your hand: Up to 1 of your Leader with a type including "Whitebeard |
| ST22-016 | Take That Back!! Take Back What You Said!! | event | draw,power-buff | [Counter] Reveal 1 card from the top of your deck. If that card's type includes "Whitebeard Pirates", up to 1 of your Leader or Character cards gains +4000 powe |
| ST22-017 | Fire Fist | event | draw,move-bottom-deck,return-hand | [Main] You may reveal 2 cards with a type including "Whitebeard Pirates" from your hand: Draw 1 card. Then, place up to 1 Character with a cost of 5 or less at  |
| ST23-003 | Benn.Beckman | character | ko,trash-hand | [On Play] You may trash 1 card from your hand: If your Leader has the {Red-Haired Pirates} type, K.O. up to 1 of your opponent's Characters with 4000 base power |
| ST23-004 | Monkey.D.Luffy | character | power-buff | [Activate: Main] You may rest 1 of your DON!! cards and this Character: Give up to 1 of your opponent's Characters −1000 power during this turn. |
| ST24-001 | Capone"Gang"Bege | character | draw,trash-hand | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If you have 6 or more rested cards, |
| ST24-002 | Kid & Killer | character | search,move-bottom-deck,set-active | [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Supernovas} type card and add it to your hand. Then, place the rest at the bottom of your d |
| ST24-003 | Basil Hawkins | character | set-active | [End of Your Turn] Set up to 1 of your DON!! cards as active. |
| ST25-001 | Alvida | character | draw,trash-hand | If you have 2 or more Characters with a base cost of 5 or more, this Character gains +1 cost.[On Play] If your Leader is [Buggy], draw 3 cards and trash 2 cards |
| ST25-002 | Cabaji | character | power-buff,keyword | If you have 2 or more Characters with a base cost of 5 or more, this Character gains [Blocker] and +1 cost.(After your opponent declares an attack, you may rest |
| ST25-003 | Crocodile & Mihawk | character | draw,play-from,trash-hand | [On Play] Draw 2 cards and trash 1 card from your hand. Then, play up to 1 {Cross Guild} type Character card with a cost of 4 or less from your hand.[Once Per T |
| ST25-004 | Buggy | character | play-from,trash-hand | [Activate: Main] You may trash 1 card from your hand and trash this Character: If your Leader is [Buggy], play up to 1 {Cross Guild} type Character card with a  |
| ST25-005 | Mohji | character | draw,keyword | If you have 2 or more Characters with a base cost of 5 or more, this Character gains [Blocker] and +1 cost.(After your opponent declares an attack, you may rest |
| ST26-001 | Soba Mask | character | return-hand | If you have a [San-Gorou] or [Sanji] Character with 7000 base power or more, give this card in your hand −5 cost.[On Play] Return all of your [San-Gorou] and [S |
| ST26-002 | Tony Tony.Chopper | character | rest | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] DON!! −2 (You may return the specif |
| ST26-004 | General Franky | character | power-buff | [On Play] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Give up to 2 of your opponent's Characters −2000 po |
| ST27-002 | Catarina Devon | character | draw | [Activate: Main] You may trash this Character: If your Leader has the {Blackbeard Pirates} type, give up to 1 of your opponent's Characters −1 cost during this  |
| ST27-003 | Kuzan | character | play-from | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] Play up to 1 {Blackbeard Pirates} t |
| ST27-005 | Marshall.D.Teach | character | ko | [Activate: Main] You may rest this Character: K.O. up to 1 Character with a cost of 3 or less.[On K.O.] Add up to 1 black card from your trash to your hand. |
| ST28-001 | Ashura Doji | character | ko | [On Play] If your Leader has the {Land of Wano} type and your opponent has 3 or more Life cards, K.O. up to 1 of your opponent's Characters with a base cost of  |
| ST28-002 | Izo | character | keyword | [DON!! x2] This Character gains [Blocker].[On Play] Your {Land of Wano} type Leader gains [Banish] during this turn. |
| ST28-004 | Kouzuki Momonosuke | character | power-buff,keyword | [Your Turn] If you have 2 or less Life cards, your Leader gains +1000 power.[Activate: Main] [Once Per Turn] You may return 2 total of your currently given DON! |
| ST28-005 | Yamato | character | power-buff,search,move-bottom-deck | [DON!! x2] [Your Turn] This Character gains +3000 power.[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Land of Wano} type card with a cost |
| ST29-001 | Monkey.D.Luffy | leader | draw,trash-hand | [When Attacking] If you have 2 or less Life cards, draw 1 card and trash 1 card from your hand. |
| ST29-003 | Kaku | character | ko,power-buff | If the number of your Life cards is equal to or less than the number of your opponent's Life cards, this Character gains +1000 power. [Trigger] K.O. up to 1 of  |
| ST29-004 | Sanji | character | search,move-bottom-deck,trash-hand | [On Play] Look at 4 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add it to your hand. Then, place the rest at the bottom of yo |
| ST29-007 | Tony Tony.Chopper | character | power-buff | [On K.O.] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card from your hand to the top of your Life cards. [Trigger] Up |
| ST29-012 | Monkey.D.Luffy | character | give-don | [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to 1 of your [Monkey.D.Luffy] cards. [Trigger] Play this card. |
| ST29-013 | Rob Lucci | character | ko | [Trigger] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the total of your and your opponent's Life cards. |
| ST29-014 | Roronoa Zoro | character | draw,give-don | [Rush: Character] (This card can attack Characters on the turn in which it is played.)[Activate: Main] [Once Per Turn] You may trash 1 card with a [Trigger] fro |
| ST29-015 | Raw Heat Strike | event | draw,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have 1 or less Life cards, give up to 1 of your opponent' |
| ST29-016 | Kizaru!! Compared to Two Years Ago We're a Hundred Times Stronger Now!! | event | power-buff,keyword | [Main] Your [Monkey.D.Luffy] Leader gains [Unblockable] during this turn.(This card cannot be blocked.)[Counter] Your Leader gains +3000 power during this battl |
| ST29-017 | Iai Death Lion Song | event | draw,ko,power-buff,trash-hand | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 2 or less Life cards, K.O. up to 1 of your opponent' |
| ST30-001 | Luffy & Ace | leader | power-buff | If you have a Character with 7000 base power or more, give this Leader −2000 power.[Opponent's Turn] All of your [Portgas.D.Ace] and [Monkey.D.Luffy] cards gain |
| ST30-004 | Emporio.Ivankov | character | draw,trash-hand | [On Play] You may reveal 2 Character cards with 6000 power from your hand: Draw 3 cards and trash 2 cards from your hand. |
| ST30-006 | Jinbe | character | draw | [On Play] You may trash 1 Character card with 6000 power from your hand: Draw 2 cards. |
| ST30-007 | Portgas.D.Ace | character | power-buff,keyword | [On Play] You may rest 1 of your DON!! cards: This Character gains [Rush] during this turn.(This card can attack on the turn in which it is played.)[When Attack |
| ST30-009 | LittleOars Jr. | character | draw | If your Character with 6000 base power would be removed from the field by your opponent's effect, you may trash this Character and draw 1 card instead. |
| ST30-012 | Monkey.D.Luffy | character | rest,keyword | [On Play] You may rest 1 of your DON!! cards: This Character gains [Rush] during this turn.(This card can attack on the turn in which it is played.)[When Attack |
| ST30-015 | The Name of This Era Is "Whitebeard"!! | event | ko,power-buff | [Counter] If you have 2 or more Characters with 6000 base power, up to 1 of your Leader or Character cards gains +4000 power during this battle. [Trigger] K.O.  |
| ST30-016 | Can You Still Fight, Luffy?! Of Course!! | event | draw,power-buff | [Counter] Up to 1 of your Leader or Character cards gains +3000 power during this battle. Then, if you have [Portgas.D.Ace] and [Monkey.D.Luffy] Characters with |
| ST30-017 | And You Get Yourself in Big Trouble!! | event | search,move-bottom-deck | [Main] Look at 5 cards from the top of your deck; reveal up to 1 Character card with 6000 power and add it to your hand. Then, place the rest at the bottom of y |

## Needs one small primitive (255)

| Card | Name | Cat | Reasons | Text |
| --- | --- | --- | --- | --- |
| EB01-008 | LittleOars Jr. | character | unmatched-clause | [Once Per Turn] If this Character would be K.O.'d by an effect, you may trash 1 Event or Stage card from your hand instead. |
| EB01-009 | Just Shut Up and Come with Us!!!! | event | look-and-play | [Counter] Look at 5 cards from the top of your deck and play up to 1 {Animal} type Character card with a cost of 3 or less. Then, place the rest at the bottom o |
| EB01-024 | Hamlet | character | unmatched-clause | If you have 4 or less cards in your hand, all of your {SMILE} type Characters gain +1000 power. |
| EB01-033 | Blueno | character | play-from-hand-or-trash | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {Water Seven} type, play up  |
| EB01-050 | ...I Want to Live!! | event | unmatched-clause | [Counter] If you have 30 or more cards in your trash, add up to 1 card from the top of your deck to the top of your Life cards. |
| EB01-057 | Shirahoshi | character | unmatched-clause | When this Character is K.O.'d by your opponent's effect, add up to 1 card from the top of your deck to the top of your Life cards.[Blocker] (After your opponent |
| EB01-060 | Did Someone Say...Kami? | event | play-from-hand-or-trash | [Main] Play up to 1 [Enel] with a cost of 7 or less from your hand or trash. Then, trash cards from the top of your Life cards until you have 1 Life card. [Trig |
| EB01-061 | Mr.2.Bon.Kurei(Bentham) | character | unmatched-clause | [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.[When Attacking] Select up to 1 of your opponent's Characters. This Character's base  |
| EB02-009 | Thousand Sunny | stage | unmatched-clause | [Activate: Main] You may rest this Stage: Give up to 1 of your currently given DON!! cards to 1 of your {Straw Hat Crew} type Characters. |
| EB02-037 | Franky | character | unmatched-clause | [On Play]/[When Attacking] If your Leader has the {Straw Hat Crew} type and the number of DON!! cards on your field is equal to or less than the number on your  |
| EB02-055 | Jinbe | character | unmatched-clause | [Trigger] If your Leader has the {Fish-Man} or {Merfolk} type and you have 2 or less Life cards, play this card. |
| EB02-057 | Mad Treasure | character | unmatched-clause | [When Attacking] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 of your opponent's Characters with a cost of 3 or less t |
| EB03-035 | Charlotte Pudding | character | unmatched-clause | [Blocker][On Play] If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, add up to 1 DON!! card from your DON |
| EB03-042 | Koala | character | play-from-hand-or-trash | If your Leader has the {Revolutionary Army} type, this Character gains +4 cost.[Opponent's Turn] [On K.O.] Play up to 1 {Revolutionary Army} type Character card |
| EB03-049 | I Knew You People Were Behind This. | event | play-from-hand-or-trash | [Main] You may rest 7 of your DON!! cards: If your Leader is [Perona], play up to 1 {Thriller Bark Pirates} type Character card with a cost of 6 or less and up  |
| EB03-052 | Shirahoshi | character | unmatched-clause | [Activate: Main] You may trash this Character: If your Leader is [Shirahoshi], add 1 card from the top of your deck to the top of your Life cards. Then, all of  |
| EB04-003 | Smoker & Tashigi | character | unmatched-clause | [Rush] (This card can attack on the turn in which it is played.)[Opponent's Turn] Your {Navy} type Leader's base power becomes 7000. |
| EB04-010 | Lulucia Kingdom | stage | unmatched-clause | [Opponent's Turn] All of your Characters with a base cost of 1 gain +5000 power.[On Play] Set the power of up to 1 of your opponent's Characters to 0 during thi |
| EB04-012 | Kikunojo | character | unmatched-clause | [Activate: Main] [Once Per Turn] If this Character was played on this turn, set your {Land of Wano} type Leader as active. |
| EB04-031 | King | character | unmatched-clause | If this Character would be K.O.'d, you may return 1 DON!! card from your field to your DON!! deck instead.[Activate: Main] [Once Per Turn] If your Leader has th |
| EB04-041 | Stealth Black | event | play-from-hand-or-trash | [Main] If your Leader is [Sanji] and you have 4 or more DON!! cards on your field, play up to 1 [Sanji] with 6000 power or less from your hand or trash. [Trigge |
| EB04-046 | Doll | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] All of your {Navy} type Cha |
| EB04-047 | Helmeppo | character | play-from-hand-or-trash | [Activate: Main] You may trash this Character: Play up to 1 {SWORD} type Character card with a cost of 3 or less other than [Helmeppo] from your hand or trash. |
| EB04-054 | Bartholomew Kuma | character | unmatched-clause | [On Play] If you have 2 or less Life cards, add up to 1 card from the top of your deck to the top of your Life cards.[On K.O.] Add up to 1 card from the top of  |
| EB04-058 | Borsalino | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If you have 2 or less Life cards, a |
| OP01-001 | Roronoa Zoro | leader | unmatched-clause | [DON!! x1] [Your Turn] All of your Characters gain +1000 power. |
| OP01-060 | Donquixote Doflamingo | leader | unmatched-clause | [DON!! x2] [When Attacking] ➀ (You may rest the specified number of DON!! cards in your cost area.): Reveal 1 card from the top of your deck. If that card is a  |
| OP01-061 | Kaido | leader | unmatched-clause | [DON!! x1] [Your Turn] [Once Per Turn] When your opponent's Character is K.O.'d, add up to 1 DON!! card from your DON!! deck and set it as active. |
| OP01-067 | Crocodile | character | unmatched-clause | [Banish] (When this card deals damage, the target card is trashed without activating its Trigger.) [DON!! x1] Give blue Events in your hand −1 cost. |
| OP01-094 | Kaido | character | unmatched-clause | [On Play] DON!! −6 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {Animal Kingdom Pirates} typ |
| OP01-105 | Bao Huang | character | unmatched-clause | [On Play] Choose 2 cards from your opponent's hand; your opponent reveals those cards. |
| OP01-120 | Shanks | character | unmatched-clause | [Rush] (This card can attack on the turn in which it is played.) [When Attacking] Your opponent cannot activate a [Blocker] Character that has 2000 or less powe |
| OP01-121 | Yamato | character | unmatched-clause | Also treat this card's name as [Kouzuki Oden] according to the rules. [Double Attack] (This card deals 2 damage.) [Banish] (When this card deals damage, the tar |
| OP02-002 | Monkey.D.Garp | leader | unmatched-clause | [Your Turn] When this Leader or any of your Characters is given a DON!! card, give up to 1 of your opponent's Characters with a cost of 7 or less −1 cost during |
| OP02-018 | Marco | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [On K.O.] You may trash 1 card with a type i |
| OP02-019 | Rakuyo | character | unmatched-clause | [DON!! x1] [Your Turn] All of your Characters with a type including "Whitebeard Pirates" gain +1000 power. |
| OP02-024 | Moby Dick | stage | unmatched-clause | [Your Turn] If you have 1 or less Life cards, your [Edward.Newgate] and all your Characters with a type including "Whitebeard Pirates" gain +2000 power. [Trigge |
| OP02-025 | Kin'emon | leader | unmatched-clause | [Activate: Main] [Once Per Turn] If you have 1 or less Characters, the next time you play a {Land of Wano} type Character card with a cost of 3 or more from you |
| OP02-027 | Inuarashi | character | static-conditional-no-timing | If all of your DON!! cards are rested, this Character cannot be removed from the field by your opponent's effects. |
| OP02-061 | Morley | character | unmatched-clause | [When Attacking] If you have 1 or less cards in your hand, your opponent cannot activate the [Blocker] of any Character with a cost of 5 or less during this bat |
| OP02-095 | Onigumo | character | static-conditional-no-timing | If there is a Character with a cost of 0, this Character gains [Banish]. (When this card deals damage, the target card is trashed without activating its Trigger |
| OP02-100 | Jango | character | static-conditional-no-timing | If you have [Fullbody], this Character cannot be K.O.'d in battle. |
| OP02-101 | Strawberry | character | unmatched-clause | [When Attacking] If there is a Character with a cost of 0, your opponent cannot activate the [Blocker] of any Character with a cost of 5 or less during this bat |
| OP03-002 | Adio | character | unmatched-clause | [DON!! x1] [When Attacking] Your opponent cannot activate a [Blocker] Character that has 2000 or less power during this battle. |
| OP03-032 | Buggy | character | static-conditional-no-timing | This Character cannot be K.O.'d in battle by <Slash> attribute cards. |
| OP03-033 | Hatchan | character | unmatched-clause | [Trigger] If your Leader has the {East Blue} type, play this card. |
| OP03-042 | Usopp's Pirate Crew | character | unmatched-clause | [On Play] Add up to 1 blue [Usopp] from your trash to your hand. |
| OP03-068 | Minozebra | character | unmatched-clause | [Banish] (When this card deals damage, the target card is trashed without activating its Trigger.)[On K.O.] If your Leader has the {Impel Down} type, add up to  |
| OP03-078 | Issho | character | unmatched-clause | [DON!! x1] [Your Turn] Give all of your opponent's Characters −3 cost.[On Play] If your opponent has 6 or more cards in their hand, trash 2 cards from your oppo |
| OP03-091 | Helmeppo | character | unmatched-clause | [On Play] Set the cost of up to 1 of your opponent's Characters with no base effect to 0 during this turn. |
| OP03-095 | Soap Sheep | event | unmatched-clause | [Main] Give up to 2 of your opponent's Characters -2 cost during this turn. [Trigger] Your opponent trashes 1 card from their hand. |
| OP03-098 | Enies Lobby | stage | unmatched-clause | [Activate: Main] You may rest this Stage: If your Leader's type includes "CP", give up to 1 of your opponent's Characters -2 cost during this turn. [Trigger] Pl |
| OP03-100 | Kingbaum | character | unmatched-clause | [Trigger] You may trash 1 card from the top or bottom of your Life cards: Play this card. |
| OP03-102 | Sanji | character | unmatched-clause | [DON!! x2] [When Attacking] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card from the top of your deck to the top of  |
| OP03-109 | Charlotte Chiffon | character | unmatched-clause | [On Play] You may trash 1 card from the top or bottom of your Life cards: Add up to 1 card from the top of your deck to the top of your Life cards. |
| OP03-114 | Charlotte Linlin | character | unmatched-clause | [On Play] If your Leader has the {Big Mom Pirates} type, add up to 1 card from the top of your deck to the top of your Life cards. Then, trash up to 1 card from |
| OP03-120 | Tropical Torment | event | unmatched-clause | [Main] If your opponent has 4 or more Life cards, trash up to 1 card from the top of your opponent's Life cards. [Trigger] Activate this card's [Main] effect. |
| OP03-123 | Charlotte Katakuri | character | top-or-bottom-life | [On Play] Add up to 1 Character with a cost of 8 or less to the top or bottom of the owner's Life cards face-up. |
| OP04-012 | Nefeltari Cobra | character | unmatched-clause | [Your Turn] All of your {Alabasta} type Characters other than this Character gain +1000 power. |
| OP04-031 | Donquixote Doflamingo | character | unmatched-clause | [On Play] Up to a total of 3 of your opponent's rested Leader and Character cards will not become active in your opponent's next Refresh Phase. |
| OP04-061 | Tom | character | unmatched-clause | [Activate: Main] You may trash this Character: If your Leader has the {Water Seven} type, add up to 1 DON!! card from your DON!! deck and rest it. |
| OP04-073 | Mr.13 & Ms.Friday | character | unmatched-clause | [Activate: Main] You may trash this Character and 1 of your Characters with a type including "Baroque Works": Add up to 1 DON!! card from your DON!! deck and se |
| OP04-084 | Stussy | character | look-and-play | [On Play] Look at 3 cards from the top of your deck and play up to 1 Character card with a type including "CP" other than [Stussy] and a cost of 2 or less. Then |
| OP04-088 | Hajrudin | character | unmatched-clause | [Activate: Main] You may rest your 1 Leader: Give up to 1 of your opponent's Characters −4 cost during this turn. |
| OP04-096 | Corrida Coliseum | stage | unmatched-clause | If your Leader has the {Dressrosa} type, your {Dressrosa} type Characters can attack Characters on the turn in which they are played. |
| OP04-097 | Otama | character | unmatched-clause | [On Play] Add up to 1 of your opponent's {Animal} or {SMILE} type Characters with a cost of 3 or less to the top of your opponent's Life cards face-up. |
| OP04-098 | Toko | character | unmatched-clause | [On Play] You may trash 2 {Land of Wano} type cards from your hand: If you have 1 or less Life cards, add 1 card from the top of your deck to the top of your Li |
| OP04-099 | Olin | character | unmatched-clause | Also treat this card's name as [Charlotte Linlin] according to the rules. [Trigger] If you have 1 or less Life cards, play this card. |
| OP04-110 | Pound | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] Add up to 1 of your opponent's Char |
| OP04-117 | Heavenly Fire | event | unmatched-clause | [Main] Add up to 1 of your opponent's Characters with a cost of 3 or less to the top or bottom of your opponent's Life cards face-up. [Trigger] You may add 1 ca |
| OP04-118 | Nefeltari Vivi | character | unmatched-clause | All of your red Characters with a cost of 3 or more other than this Character gain [Rush].(This card can attack on the turn in which it is played.) |
| OP05-002 | Belo Betty | leader | unmatched-clause | [Activate: Main] [Once Per Turn] You may trash 1 {Revolutionary Army} type card from your hand: Up to 3 of your {Revolutionary Army} type Characters or Characte |
| OP05-022 | Donquixote Rosinante | leader | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[End of Your Turn] If you have 6 or less card |
| OP05-030 | Donquixote Rosinante | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Opponent's Turn] If your rested Character wo |
| OP05-040 | Birdcage | stage | unmatched-clause | If your Leader is [Donquixote Doflamingo], all Characters with a cost of 5 or less do not become active in your and your opponent's Refresh Phases.[End of Your  |
| OP05-067 | Zoro-Juurou | character | unmatched-clause | [When Attacking] If you have 3 or less Life cards, add up to 1 DON!! card from your DON!! deck and set it as active. |
| OP05-081 | One-Legged Toy Soldier | character | unmatched-clause | [Activate: Main] You may trash this Character: Give up to 1 of your opponent's Characters −3 cost during this turn. |
| OP05-084 | Saint Charlos | character | unmatched-clause | [Your Turn] If the only Characters on your field are {Celestial Dragons} type Characters, give all of your opponent's Characters −4 cost. |
| OP05-087 | Hakuba | character | ko-own-as-cost | [DON!! x1] [When Attacking] You may K.O. 1 of your Characters other than this Character: Give up to 1 of your opponent's Characters −5 cost during this turn. |
| OP05-089 | Saint Mjosgard | character | unmatched-clause | [Activate: Main] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may rest this Character and 1 of your Characters: Add up to 1 black |
| OP05-092 | Saint Rosward | character | unmatched-clause | [Your Turn] If the only Characters on your field are {Celestial Dragons} type Characters, give all of your opponent's Characters −6 cost. |
| OP05-097 | Mary Geoise | stage | unmatched-clause | [Your Turn] The cost of playing {Celestial Dragons} type Character cards with a cost of 2 or more from your hand will be reduced by 1. |
| OP05-111 | Hotori | character | unmatched-clause | [On Play] You may play 1 [Kotori] from your hand: Add up to 1 of your opponent's Characters with a cost of 3 or less to the top or bottom of your opponent's Lif |
| OP06-002 | Inazuma | character | static-conditional-no-timing | If this Character has 7000 power or more, this Character gains [Banish].(When this card deals damage, the target card is trashed without activating its Trigger. |
| OP06-003 | Emporio.Ivankov | character | look-and-play | [On Play] Look at 3 cards from the top of your deck and play up to 1 {Revolutionary Army} type Character card with 5000 power or less. Then, place the rest at t |
| OP06-011 | Tot Musica | character | rest-named-cost | [Activate: Main] [Once Per Turn] You may rest 1 of your [Uta] cards: This Character gains +5000 power during this turn. |
| OP06-015 | Lily Carnation | character | ko-own-as-cost | [Activate: Main] [Once Per Turn] You may trash 1 of your Characters with 6000 power or more: Play up to 1 {FILM} type Character card with 2000 to 5000 power fro |
| OP06-016 | Raise Max | character | place-self-bottom-cost | [Activate: Main] You may place this Character at the bottom of the owner's deck: Give up to 1 of your opponent's Characters −3000 power during this turn. |
| OP06-035 | Hody Jones | character | mixed-char-or-don | [Rush] (This card can attack on the turn in which it is played.)[On Play] Rest up to a total of 2 of your opponent's Characters or DON!! cards. Then, add 1 card |
| OP06-041 | The Ark Noah | stage | rest-all | [On Play] Rest all of your opponent's Characters. [Trigger] Play this card. |
| OP06-055 | Monkey.D.Garp | character | unmatched-clause | [DON!! x2] [When Attacking] If you have 4 or less cards in your hand, your opponent cannot activate [Blocker] during this battle. |
| OP06-060 | Vinsmoke Ichiji | character | play-from-hand-or-trash | [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may trash this Character: If your Leader  |
| OP06-064 | Vinsmoke Niji | character | play-from-hand-or-trash | [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may trash this Character: If your Leader  |
| OP06-066 | Vinsmoke Yonji | character | play-from-hand-or-trash | [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may trash this Character: If your Leader  |
| OP06-068 | Vinsmoke Reiju | character | play-from-hand-or-trash | [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may trash this Character: If your Leader  |
| OP06-086 | Gecko Moria | character | unmatched-clause | [On Play] Choose up to 1 Character card with a cost of 4 or less and up to 1 Character card with a cost of 2 or less from your trash. Play 1 card and play the o |
| OP06-088 | Sai | character | static-conditional-no-timing | If your Leader has the {Dressrosa} type and is active, this Character gains +2000 power. |
| OP06-090 | Dr. Hogback | character | unmatched-clause | [On Play] You may return 2 cards from your trash to the bottom of your deck in any order: Add up to 1 {Thriller Bark Pirates} type card other than [Dr. Hogback] |
| OP06-102 | Kamakiri | character | place-stage-cost | [Activate: Main] [Once Per Turn] You may place 1 Stage with a cost of 1 at the bottom of the owner's deck: K.O. up to 1 of your opponent's Characters with a cos |
| OP06-103 | Kawamatsu | character | top-or-bottom-life | [When Attacking] You may trash 2 cards from your hand: Add up to 1 of your Characters with 0 power to the top or bottom of the owner's Life cards face-up. [Trig |
| OP06-106 | Kouzuki Hiyori | character | unmatched-clause | [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card from your hand to the top of your Life cards. |
| OP06-107 | Kouzuki Momonosuke | character | top-or-bottom-life | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Add up to 1 of your {Land of Wano}  |
| OP06-111 | Braham | character | place-stage-cost | [Activate: Main] [Once Per Turn] You may place 1 Stage with a cost of 1 at the bottom of the owner's deck: Rest up to 1 of your opponent's Characters with a cos |
| OP06-114 | Wyper | character | place-stage-cost | [On Play] You may place 1 Stage with a cost of 1 at the bottom of the owner's deck: Look at 5 cards from the top of your deck; reveal up to 1 [Upper Yard] or {S |
| OP06-119 | Sanji | character | look-and-play | [On Play] Reveal 1 card from the top of your deck and play up to 1 Character with a cost of 9 or less other than [Sanji]. Then, place the rest at the bottom of  |
| OP07-001 | Monkey.D.Dragon | leader | unmatched-clause | [Activate: Main] [Once Per Turn] Give up to 2 total of your currently given DON!! cards to 1 of your Characters. |
| OP07-002 | Ain | character | unmatched-clause | [On Play] Set the power of up to 1 of your opponent's Characters to 0 during this turn. |
| OP07-008 | Mr. Tanaka | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] Play this card. |
| OP07-026 | Jewelry Bonney | character | mixed-char-or-don | [On Play] Up to 1 of your opponent's rested Character or DON!! cards will not become active in your opponent's next Refresh Phase. |
| OP07-059 | Foxy | leader | unmatched-clause | [When Attacking] DON!! −3 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If you have 3 or more {Foxy Pirates} type Ch |
| OP07-060 | Itomimizu | character | unmatched-clause | [Activate: Main] [Once Per Turn] If your Leader has the {Foxy Pirates} type and you have no other [Itomimizu], add up to 1 DON!! card from your DON!! deck and r |
| OP07-064 | Sanji | character | unmatched-clause | If the number of DON!! cards on your field is at least 2 less than the number on your opponent's field, give this card in your hand −3 cost.[Blocker] (After you |
| OP07-081 | Kalifa | character | unmatched-clause | [DON!! x1] [Your Turn] Give all of your opponent's Characters −1 cost. |
| OP07-090 | Morgans | character | unmatched-clause | [On Play] Your opponent trashes 1 card from their hand and reveals their hand. Then, your opponent draws 1 card. |
| OP08-001 | Tony Tony.Chopper | leader | unmatched-clause | [Activate: Main] [Once Per Turn] Give up to 3 of your {Animal} or {Drum Kingdom} type Characters up to 1 rested DON!! card each. |
| OP08-007 | Tony Tony.Chopper | character | look-and-play | [Your Turn] [On Play]/[When Attacking] Look at 5 cards from the top of your deck and play up to 1 {Animal} type Character card with 4000 power or less rested. T |
| OP08-016 | Dr.Hiriluk | character | unmatched-clause | [Activate: Main] You may rest this Character: If your Leader is [Tony Tony.Chopper], all of your [Tony Tony.Chopper] Characters gain +2000 power during this tur |
| OP08-052 | Portgas.D.Ace | character | look-and-play | [On Play] Reveal 1 card from the top of your deck and play up to 1 Character card with a type including "Whitebeard Pirates" and a cost of 4 or less. Then, plac |
| OP08-054 | You Can't Take Our King This Early in the Game. | event | look-and-play | [Counter] Up to 1 of your Leader or Character cards gains +3000 power during this battle. Then, reveal 1 card from the top of your deck and play up to 1 Charact |
| OP08-058 | Charlotte Pudding | leader | unmatched-clause | [When Attacking] You may turn 2 cards from the top of your Life cards face-up: Add up to 1 DON!! card from your DON!! deck and rest it. |
| OP08-063 | Charlotte Katakuri | character | unmatched-clause | [On Play] You may turn 1 card from the top of your Life cards face-down: Add up to 1 DON!! card from your DON!! deck and set it as active. |
| OP08-082 | Sasaki | character | unmatched-clause | [Activate: Main] Rest 1 of your DON!! cards and you may rest this Character: Give up to 1 of your opponent's Characters −2 cost during this turn. |
| OP08-083 | Sheepshead | character | unmatched-clause | [DON!! x1] [Your Turn] Give all of your opponent's Characters −1 cost. |
| OP08-093 | X.Drake | character | unmatched-clause | [DON!! x1] This Character gains +2 cost. |
| OP08-100 | South Bird | character | look-and-play | [On Play] Look at 7 cards from the top of your deck and play up to 1 [Upper Yard]. Then, place the rest at the bottom of your deck in any order. |
| OP08-109 | Mont Blanc Noland | character | unmatched-clause | [On Play] If your Leader has the {Shandian Warrior} type and you have a [Kalgara] Character, add up to 1 card from the top of your deck to the top of your Life  |
| OP09-008 | Building Snake | character | place-self-bottom-cost | [Activate: Main] You may place this Character at the bottom of the owner's deck: Give up to 1 of your opponent's Characters −3000 power during this turn. |
| OP09-009 | Benn.Beckman | character | unmatched-clause | [On Play] Trash up to 1 of your opponent's Characters with 6000 power or less. |
| OP09-012 | Monster | character | unmatched-clause | If your Character [Bonk Punch] would be K.O.'d by an effect, you may trash this Character instead. |
| OP09-014 | Limejuice | character | unmatched-clause | [On Play] Your opponent cannot activate up to 1 [Blocker] Character that has 4000 power or less during this turn. |
| OP09-025 | Crocodile | character | static-conditional-no-timing | If your Leader has the {ODYSSEY} type, this Character cannot be K.O.'d in battle by Leaders. |
| OP09-045 | Cabaji | character | static-conditional-no-timing | If you have a [Buggy] or [Mohji] Character, this Character cannot be K.O.'d in battle. |
| OP09-061 | Monkey.D.Luffy | leader | unmatched-clause | [DON!! x1] All of your Characters gain +1 cost.[Your Turn] [Once Per Turn] When 2 or more DON!! cards on your field are returned to your DON!! deck, add up to 1 |
| OP09-062 | Nico Robin | leader | unmatched-clause | [Banish] (When this card deals damage, the target card is trashed without activating its Trigger.)[When Attacking] You may trash 1 card with a [Trigger] from yo |
| OP09-076 | Roronoa Zoro | character | unmatched-clause | [On Play] You may return 1 or more DON!! cards from your field to your DON!! deck: Add up to 1 DON!! card from your DON!! deck and set it as active. |
| OP09-080 | Thousand Sunny | stage | unmatched-clause | [Opponent's Turn] You may rest this Stage: When your {Straw Hat Crew} type Character is removed from the field by your opponent's effect, add up to 1 DON!! card |
| OP09-100 | Karasu | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] If your Leader has the {Revolution |
| OP09-101 | Kuzan | character | unmatched-clause | [On Play] Place 1 of your opponent's Characters with a cost of 3 or less at the top or bottom of your opponent's Life cards face-up: Your opponent trashes 1 car |
| OP09-108 | Bartholomew Kuma | character | unmatched-clause | [Trigger] If your Leader has the {Revolutionary Army} type and you and your opponent have a total of 5 or less Life cards, play this card. |
| OP09-109 | Jaguar.D.Saul | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] If your Leader is [Nico Robin], pl |
| OP09-111 | Brook | character | unmatched-clause | [Trigger] If your Leader has the {Egghead} type and your opponent has 6 or more cards in their hand, your opponent trashes 2 cards from their hand. |
| OP10-032 | Tashigi | character | unmatched-clause | If you have a green Character other than [Tashigi] that would be removed from the field by your opponent's effect, you may rest this Character instead. |
| OP10-033 | Nami | character | unmatched-clause | [On Play] If you have 2 or more rested {ODYSSEY} type Characters, up to 1 of your opponent's rested DON!! cards will not become active in your opponent's next R |
| OP10-074 | Pica | character | unmatched-clause | [Once Per Turn] If this Character would be K.O.'d by your opponent's effect, you may rest 2 of your active DON!! cards instead. |
| OP10-077 | Bellamy | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Block] You may rest 2 of your DON!! cards |
| OP10-083 | Kouzuki Momonosuke | character | unmatched-clause | [Activate: Main] You may rest this Character and 1 of your {Dressrosa} type Leader or Stage cards: Give up to 1 of your opponent's Characters -2 cost during thi |
| OP10-103 | Capone"Gang"Bege | character | unmatched-clause | [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 {Supernovas} type Character card from your hand to the top of y |
| OP10-107 | Jewelry Bonney | character | unmatched-clause | [Blocker][On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 {Supernovas} type Character card with a cost of 5 from |
| OP11-013 | Prince Grus | character | unmatched-clause | [When Attacking] All of your opponent's Characters with 2000 power or less cannot activate [Blocker] during this turn. |
| OP11-027 | Bulge-Eyed Neptunian | character | unmatched-clause | If your Leader is [Shirahoshi], this Character can attack Characters on the turn in which it is played. |
| OP11-051 | Sanji | character | look-and-play | When this Character is K.O.'d by your opponent's effect, look at 5 cards from the top of your deck and play up to 1 {Straw Hat Crew} type Character card with a  |
| OP11-101 | Capone"Gang"Bege | character | unmatched-clause | [Blocker][Once Per Turn] If your {Supernovas} type Character other than [Capone"Gang"Bege] would be removed from the field by your opponent's effect, you may ad |
| OP11-116 | Merman Combat Ultramarine | event | top-or-bottom-life | [Main] Add up to 1 Character with a cost of 6 or less to the top or bottom of the owner's Life cards face-up. [Trigger] Add up to 1 of your opponent's Character |
| OP12-021 | Ipponmatsu | character | unmatched-clause | If your Leader has the <Slash> attribute and you have 6 or more rested DON!! cards, this Character cannot be rested by your opponent's effects.[Blocker] |
| OP12-022 | Inuarashi | character | unmatched-clause | [Activate: Main] You may rest this Character: Up to 1 of your opponent's rested Characters with a cost of 5 or less will not become active in your opponent's ne |
| OP12-036 | Roronoa Zoro | character | static-conditional-no-timing | This card in your hand cannot be played by effects.If your Leader has the <Slash> attribute, this Character cannot be K.O.'d in battle by <Slash> attribute card |
| OP12-037 | Demon Aura Nine Sword Style Asura Blades Drawn Dead Man's Game | event | mixed-char-or-don | [Main] You may rest 3 of your DON!! cards: Rest up to a total of 2 of your opponent's Characters or DON!! cards.[Counter] Your Leader gains +3000 power during t |
| OP12-074 | Patty | character | unmatched-clause | [On Play] You may trash 1 Event from your hand: If your Leader is [Sanji], add up to 1 DON!! card from your DON!! deck and set it as active. |
| OP12-085 | Karasu | character | unmatched-clause | If your Leader has the {Revolutionary Army} type, this Character gains +3 cost.[When Attacking] If your Leader has the {Revolutionary Army} type and your oppone |
| OP12-093 | Morley | character | static-conditional-no-timing | If your Leader has the {Revolutionary Army} type, this Character gains +4 cost. |
| OP12-102 | Shirahoshi | character | unmatched-clause | If your Character with a base cost of 6 or less would be removed from the field by your opponent's effect, you may turn 1 card from the top of your Life cards f |
| OP12-117 | Slam Gibson | event | top-or-bottom-life | [Main] You may rest 5 of your DON!! cards: If your Leader has the {Supernovas} type, add up to 1 Character with a cost of 9 or less to the top or bottom of the  |
| OP13-008 | Emporio.Ivankov | character | unmatched-clause | If your {Revolutionary Army} type Character would be K.O.'d by your opponent's effect, you may trash this Character instead. |
| OP13-028 | Shanks | character | unmatched-clause | [On Play] Set all of your DON!! cards as active. Then, you cannot play cards from your hand during this turn. |
| OP13-046 | Vista | character | unmatched-clause | [Double Attack][Once Per Turn] If this Character would be K.O.'d or would be removed from the field by your opponent's effect, you may trash 1 card with a type  |
| OP13-047 | Fossa | character | unmatched-clause | If your Character with a type including "Whitebeard Pirates" would be K.O.'d by your opponent's effect, you may trash this Character instead. |
| OP13-053 | Marshall.D.Teach | character | ko-own-as-cost | [When Attacking] You may trash 1 of your Characters with a type including "Whitebeard Pirates": Draw 1 card and this Character gains [Banish] during this turn. |
| OP13-055 | Rakuyo | character | unmatched-clause | [When Attacking] If you have 4 or less cards in your hand, all of your Characters with a type including "Whitebeard Pirates" gain +1000 power during this turn. |
| OP13-060 | Amatsuki Toki | character | unmatched-clause | If your Character with a type including "Roger Pirates" would be K.O.'d by your opponent's effect, you may trash this Character instead. |
| OP13-063 | Kouzuki Oden | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] If you have any DON!! cards given,  |
| OP13-072 | Buggy | character | unmatched-clause | [On Play] If your Leader's type includes "Roger Pirates" and you have any DON!! cards given, add up to 1 DON!! card from your DON!! deck and rest it. |
| OP13-078 | Oro Jackson | stage | unmatched-clause | [Once Per Turn] When your Character with a type including "Roger Pirates" is removed from the field by your opponent's effect, add up to 1 DON!! card from your  |
| OP13-084 | St. Shepherd Ju Peter | character | unmatched-clause | If you have 7 or more cards in your trash, this Character cannot be removed from the field by your opponent's effects.[Your Turn] If you have 10 or more cards i |
| OP13-105 | Kouzuki Momonosuke | character | unmatched-clause | [On Play] Look at all of your Life cards and place them back in your Life area in any order. |
| OP14-001 | Trafalgar Law | leader | unmatched-clause | [Activate: Main] [Once Per Turn] Select 2 of your {Supernovas} or {Heart Pirates} type Characters. Swap the base power of the selected Characters with each othe |
| OP14-003 | Capone"Gang"Bege | character | static-conditional-no-timing | This Character cannot be K.O.'d by effects of your opponent's Characters with 5000 base power or less. |
| OP14-017 | Chambres | event | unmatched-clause | [Main] Select 2 of your opponent's Characters with 9000 base power or less. Swap the base power of the selected Characters with each other during this turn. |
| OP14-034 | Monkey.D.Luffy | character | unmatched-clause | [Your Turn] All of your green {Straw Hat Crew} type Characters with a base cost of 4 or more gain +1000 power.[Once Per Turn] If your {Straw Hat Crew} type Char |
| OP14-035 | Yosaku | character | unmatched-clause | [Your Turn] When this Character becomes rested, up to 1 of your opponent's rested Characters with a cost of 4 or less will not become active in your opponent's  |
| OP14-053 | Vista | character | unmatched-clause | [Blocker][Opponent's Turn] If you have 7 or less cards in your hand, this Character's base power becomes the same as your Leader's base power. |
| OP14-071 | Pica | character | unmatched-clause | [End of Your Turn] If your Leader has the {Donquixote Pirates} type, add up to 1 DON!! card from your DON!! deck and set it as active. |
| OP14-080 | Gecko Moria | leader | ko-own-as-cost | [Activate: Main] [Once Per Turn] You may K.O. 1 of your {Thriller Bark Pirates} type Characters: Your Leader and all of your Characters gain +1000 power during  |
| OP14-086 | Miss Doublefinger(Zala) | character | static-conditional-no-timing | If you have 7 or more cards in your trash, this Character gains +1000 power, and all of your Characters with a type including "Baroque Works" gain +2 cost. |
| OP14-091 | Mr.2.Bon.Kurei(Bentham) | character | play-from-hand-or-trash | [On K.O.] Play up to 1 Character card with a type including "Baroque Works" and a cost of 5 or less other than [Mr.2.Bon.Kurei(Bentham)] from your hand or trash |
| OP14-093 | Mr.4(Babe) | character | unmatched-clause | [Blocker][On K.O.] Add up to 1 Character card with a type including "Baroque Works" and a cost of 8 or less from your trash to your hand. |
| OP14-103 | Gloriosa (Grandma Nyon) | character | unmatched-clause | [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card from your hand to the top of your Life cards. [Trigger] Pl |
| OP14-105 | Gorgon Sisters | character | unmatched-clause | [Activate: Main] [Once Per Turn] You may reveal 3 {Amazon Lily} or {Kuja Pirates} type cards from your hand: Give your Leader and all of your Characters up to 1 |
| OP14-106 | Salome | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] Play this card. |
| OP14-115 | Rindo | character | unmatched-clause | [Opponent's Turn] [On K.O.] Add up to 1 card from the top of your deck to the top of your Life cards. Then, you take 1 damage. [Trigger] If your Leader has the  |
| OP15-006 | Cavendish | character | static-conditional-no-timing | If you have 4 or more Events in your trash, this Character gains +2000 power. |
| OP15-013 | Pincers | character | unmatched-clause | If your Leader has 0 power or less, give this card in your hand −2 cost.[Blocker] (After your opponent declares an attack, you may rest this card to make it the |
| OP15-014 | Bartolomeo | character | unmatched-clause | If this Character would be K.O.'d, you may trash 1 Event from your hand instead.[On Play] Activate up to 1 {Dressrosa} type Event with a base cost of 3 or less  |
| OP15-035 | Laboon | character | unmatched-clause | If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may rest 2 of your cards instead. |
| OP15-046 | Sabo | character | unmatched-clause | [Blocker][On Play] If your Leader has the {Dressrosa} type, activate up to 1 {Dressrosa} type Event from your hand. |
| OP15-050 | Bobby Funk | character | static-conditional-no-timing | If you have [Kelly Funk], this Character gains +3000 power. |
| OP15-065 | Goro | character | unmatched-clause | [On Play] Reveal 1 card from the top of your deck. If the revealed card has a cost of 2 or less, add up to 1 DON!! card from your DON!! deck and rest it. |
| OP15-069 | Nola | character | unmatched-clause | If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may return 1 DON!! card from your field to your DO |
| OP15-070 | Fuza | character | unmatched-clause | All of your [Shura] cards and this Character gain [Unblockable].(This card cannot be blocked.)[Opponent's Turn] All of your [Shura] cards' base power and this C |
| OP15-071 | Holly | character | unmatched-clause | All of your [Ohm] cards and this Character gain [Double Attack].(This card deals 2 damage.)[Opponent's Turn] All of your [Ohm] cards' base power and this Charac |
| OP15-079 | Absalom | character | unmatched-clause | [On K.O.] Add up to 1 {Thriller Bark Pirates} type card from your trash to your hand. [Trigger] Activate this card's [On K.O.] effect. |
| OP15-092 | Monkey.D.Luffy | character | static-conditional-no-timing | Apply each of the following effects based on the number of cards in your trash:• If there are 10 or more cards, this Character's base power becomes 9000 and it  |
| OP15-093 | The Risky Brothers | character | unmatched-clause | [Activate: Main] You may trash this Character: If you have 15 or more cards in your trash, up to 1 of your [Monkey.D.Luffy] Characters gains [Rush: Character] a |
| OP15-094 | Roronoa Zoro | character | unmatched-clause | If your {Straw Hat Crew} type Character other than this Character would be removed from the field by your opponent's effect, you may trash this Character instea |
| OP15-110 | Braham | character | unmatched-clause | [On K.O.] If your Leader has the {Shandian Warrior} type, add up to 1 card from the top of your deck to the top of your Life cards. |
| OP16-005 | Thatch | character | unmatched-clause | If you have a Character with 8000 power or more and a type including "Whitebeard Pirates", give this card in your hand −3 cost.[Blocker] |
| OP16-008 | Squard | character | ko-own-as-cost | [On Play] You may trash 1 of your Characters with 10000 base power: K.O. up to 1 of your opponent's Characters with 8000 power or less. |
| OP16-014 | Marco | character | unmatched-clause | If one of your Characters would be removed from the field by your opponent's effect, you may K.O. this Character instead.[On K.O.] You may trash 1 Character car |
| OP16-015 | Monkey.D.Luffy | character | unmatched-clause | If your Leader's card name includes "Ace" and you have 6 or more DON!! cards on your field, give this card in your hand −2 cost.[On Your Opponent's Attack] You  |
| OP16-018 | Rockstar | character | unmatched-clause | [Once Per Turn] If your {Red-Haired Pirates} type Character would be K.O.'d, you may trash 1 Character card with 6000 power or more from your hand instead. |
| OP16-030 | Trafalgar Law | character | unmatched-clause | [On Play] Up to 1 of your opponent's rested Characters will not become active in your opponent's next Refresh Phase.[End of Your Turn] Set all of your green Cha |
| OP16-033 | Morley | character | unmatched-clause | If this Character would be K.O.'d, you may rest 2 of your cards instead.[Unblockable] (This card cannot be blocked.) |
| OP16-047 | Donquixote Doflamingo | character | unmatched-clause | [Activate: Main] You may rest this Character: If your opponent has 8 or more cards in their hand, they place 2 cards from their hand at the bottom of their deck |
| OP16-069 | Donquixote Doflamingo | character | unmatched-clause | [On Play]/[When Attacking] Add up to 1 DON!! card from your DON!! deck and set it as active. |
| OP16-070 | Donquixote Rosinante | character | unmatched-clause | [Blocker][On Play] You may rest 2 of your DON!! cards: If your Leader has the {Navy} type, add up to 1 DON!! card from your DON!! deck and rest it. |
| OP16-075 | Monkey.D.Garp | character | unmatched-clause | [On Play] If your Leader has the {Navy} type, add up to 1 DON!! card from your DON!! deck and set it as active, and add up to 1 additional DON!! card and rest i |
| OP16-080 | Marshall.D.Teach | leader | unmatched-clause | [Opponent's Turn] All of your Characters gain +1 cost.[On Your Opponent's Attack] [Once Per Turn] You may trash 1 card with a [Trigger] from your hand: Change t |
| OP16-102 | Avalo Pizarro | character | play-from-hand-or-trash | [On K.O.] Draw 1 card, then play up to 1 [Fullalead] from your hand or trash. [Trigger] Activate this card's [On K.O.] effect. |
| OP16-111 | Boa Sandersonia | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] If you have 2 or less Life cards,  |
| P-014 | Koby | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] Play this card. |
| P-057 | Fleeting Lullaby | event | unmatched-clause | [Main] If your Leader is [Uta], up to 2 of your opponent's rested Characters with a cost of 4 or less will not become active in your opponent's next Refresh Pha |
| P-060 | Tot Musica | event | rest-named-cost | [Main] You may rest 1 of your [Uta] cards: Rest up to 2 of your opponent's DON!! cards. |
| P-078 | Adio | character | static-conditional-no-timing | If you have 2 or more rested {ODYSSEY} type Characters, this Character gains +1000 power. |
| P-085 | Jewelry Bonney | character | top-or-bottom-life | [On Play] If your Leader has the {Supernovas} type and the number of your Life cards is equal to or less than the number of your opponent's Life cards, add up t |
| P-088 | Trafalgar Law | character | unmatched-clause | [Trigger] If your Leader has the {Supernovas} type and you and your opponent have a total of 5 or less Life cards, play this card. |
| PRB02-005 | Monkey.D.Luffy | character | unmatched-clause | [Your Turn] [On Play] If your Leader is multicolored and your opponent has 7 or less DON!! cards on their field, your opponent rests 1 of their active DON!! car |
| PRB02-006 | Roronoa Zoro | character | unmatched-clause | [Opponent's Turn] If this Character would be rested by your opponent's Character's effect, you may rest 1 of your other Characters instead.[Blocker] |
| PRB02-011 | Donquixote Doflamingo | character | unmatched-clause | [Blocker][On Play] If your Leader is multicolored, add up to 1 DON!! card from your DON!! deck and rest it. |
| PRB02-014 | Sabo | character | unmatched-clause | If you have 15 or more cards in your trash, give this card in your hand −3 cost.[Blocker] (After your opponent declares an attack, you may rest this card to mak |
| PRB02-018 | Portgas.D.Ace | character | play-from-hand-or-trash | [On Play] If you have a face-up Life card, play up to 1 [Sabo], [Portgas.D.Ace], or [Monkey.D.Luffy] with a cost of 2 from your hand or trash. |
| ST09-010 | Portgas.D.Ace | character | unmatched-clause | [Once Per Turn] If this Character would be K.O.'d, you may trash 1 card from the top or bottom of your Life cards instead. |
| ST09-015 | Thunder Bagua | event | top-or-bottom-life | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 2 or less Life cards, add up to 1 of your opponent's |
| ST10-002 | Monkey.D.Luffy | leader | unmatched-clause | [Activate: Main] [Once Per Turn] If you have 0 DON!! cards on your field or 8 or more DON!! cards on your field, add up to 1 DON!! card from your DON!! deck and |
| ST13-003 | Monkey.D.Luffy | leader | play-from-hand-or-trash | Your face-up Life cards are placed at the bottom of your deck instead of being added to your hand, according to the rules.[DON!! x2] [Activate: Main] [Once Per  |
| ST13-004 | Edward.Newgate | character | unmatched-clause | [On Play] Add 1 card from the top of your deck to the top of your Life cards. Then, look at all your Life cards; place 1 card at the top of your deck and place  |
| ST13-009 | Shanks | character | unmatched-clause | [On Play] You may turn 1 of your face-up Life cards face-down: If your opponent has 7 or more cards in their hand, trash up to 1 card from the top of your oppon |
| ST13-012 | Makino | character | unmatched-clause | [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Look at all of your Life cards and place them back in your Life area in any |
| ST13-016 | Yamato | character | unmatched-clause | [Rush] (This card can attack on the turn in which it is played.)[On Play] Look at all your Life cards; place 1 at the top of your deck and place the rest back i |
| ST15-001 | Atmos | character | unmatched-clause | [When Attacking] If your Leader is [Edward.Newgate], you cannot add Life cards to your hand using your own effects during this turn. |
| ST16-003 | Charlotte Katakuri | character | static-conditional-no-timing | If your Leader has the {FILM} type and you have 6 or more rested cards, this Character gains +2000 power. |
| ST16-005 | Monkey.D.Luffy | character | static-conditional-no-timing | If you have a rested [Uta], this Character gains +1000 power. |
| ST19-003 | Tashigi | character | unmatched-clause | [On Play] If your Leader is [Smoker], give up to 1 of your opponent's Characters −4 cost during this turn.[Activate: Main] [Once Per Turn] If this Character was |
| ST21-003 | Sanji | character | unmatched-clause | [On Play] Select up to 1 of your {Straw Hat Crew} type Characters with 6000 power or more. If the selected Character attacks during this turn, your opponent can |
| ST21-011 | Franky | character | unmatched-clause | [DON!! x2] [Opponent's Turn] All of your {Straw Hat Crew} type Characters with 4000 base power or less gain +1000 power. |
| ST23-001 | Uta | character | unmatched-clause | If you have a Character with 10000 power or more, give this card in your hand −4 cost.[Blocker] (After your opponent declares an attack, you may rest this card  |
| ST26-003 | Nico Robin | character | unmatched-clause | [On Play] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Add up to 1 DON!! card from your DON!! deck and set |
| ST27-001 | Avalo Pizarro | character | rest-named-cost | [Activate: Main] [Once Per Turn] You may rest 1 of your [Fullalead] cards: If your Leader has the {Blackbeard Pirates} type, this Character gains +4000 power du |
| ST28-003 | Kin'emon | character | unmatched-clause | [Trigger] If your Leader has the {Land of Wano} type and your opponent has 3 or less Life cards, play this card. |
| ST29-005 | Jinbe | character | unmatched-clause | [Trigger] If your Leader is [Monkey.D.Luffy], play this card. |
| ST29-008 | Nami | character | unmatched-clause | If your {Egghead} type Character would be K.O.'d by your opponent's effect, you may turn 1 card from the top of your Life cards face-up instead. [Trigger] If yo |
| ST29-009 | Nico Robin | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [Trigger] If your Leader is [Monkey.D.Luffy] |
| ST30-003 | Edward.Newgate | character | unmatched-clause | [Your Turn] All of your Characters with 6000 base power gain +1000 power. |
| ST30-008 | Marco | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On K.O.] You may trash 1 Character card with |
| ST30-010 | Crocodile | character | unmatched-clause | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] Up to 1 of your opponent's rested C |
| ST30-011 | Buggy | character | unmatched-clause | If your Character with 6000 base power would be removed from the field by your opponent's effect, you may rest this Character instead.[Blocker] (After your oppo |
| ST30-014 | Mr.3(Galdino) | character | unmatched-clause | [Activate: Main] You may rest this Character: Give up to 2 of your Characters with 6000 base power up to 2 rested DON!! cards each. |

## Defer (needs new capability) (230)

| Card | Name | Cat | Reasons | Text |
| --- | --- | --- | --- | --- |
| EB01-014 | Sanji | character | dynamic-scaling | [DON!! x1] [Your Turn] This Character gains +1000 power for every 3 of your rested DON!! cards. |
| EB01-027 | Mr.1(Daz.Bonez) | character | dynamic-scaling | If your Leader's type includes "Baroque Works", this Character gains +1000 power for every 2 Events in your trash.[On Play] Draw 2 cards and trash 1 card from y |
| EB01-028 | Gum-Gum Champion Rifle | event | opp-deck-manip | [Counter] If your Leader has the {Impel Down} type, up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, your opponent returns  |
| EB02-010 | Monkey.D.Luffy | leader | delayed-effect | [Activate: Main] [Once Per Turn] DON!! −2: If the only Characters on your field are {Straw Hat Crew} type Characters, set up to 2 of your DON!! cards as active. |
| EB02-011 | Arlong | character | delayed-effect | [On Play] If your Leader has the {Fish-Man} or {East Blue} type, give up to 1 rested DON!! card to 1 of your Leader. Then, up to 1 of your opponent's Characters |
| EB02-015 | Jewelry Bonney | character | delayed-effect | [On Play] Up to 1 of your opponent's rested Characters will not become active in your opponent's next Refresh Phase. Then, set up to 1 of your DON!! cards as ac |
| EB02-041 | Merry Go | stage | delayed-effect | [On Play] If your Leader has the {Straw Hat Crew} type, draw 1 card.[Activate: Main] You may rest this Stage: If the number of DON!! cards on your field is equa |
| EB02-060 | Merry Go | stage | delayed-effect | [Activate: Main] You may rest this Stage and turn 1 card from the top of your Life cards face-up: Up to 1 of your {Straw Hat Crew} type Characters gains +1000 p |
| EB03-008 | Hibari | character | attack-restriction | [On Play]/[When Attacking] Up to 1 of your {SWORD} type Leader or Character cards can also attack active Characters during this turn.[Activate: Main] [Once Per  |
| EB03-017 | Jewelry Bonney | character | delayed-effect | [On Play] If your Leader has the {Supernovas} type, set up to 1 of your DON!! cards as active. Then, up to 1 of your opponent's Characters with a cost of 8 or l |
| EB03-020 | There You Are, Sore Loser! | event | dynamic-scaling | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have 2 or more {FILM} type Characters, that card gains an |
| EB03-026 | Boa Hancock | character | opp-deck-manip | [On Play] If your opponent has 5 or more cards in their hand, your opponent places 1 card from their hand at the bottom of their deck.[Activate: Main] [Once Per |
| EB03-033 | Charlotte Brulee | character | custom-trigger | [Opponent's Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck by your effect, if your Leader has the {Big Mom Pirates} type,  |
| EB03-037 | Lim | character | delayed-effect | [On Play] If you have 7 or more DON!! cards on your field, all of your {ODYSSEY} type Leader and Character cards gain +1000 power until the end of your opponent |
| EB03-055 | Nico Robin | character | direct-damage | [On Play] You may trash 1 card from the top of your Life cards: If your Leader has the {Straw Hat Crew} type, add up to 2 cards from the top of your deck to the |
| EB03-059 | S-Snake | character | attack-restriction | [On Play] If your Leader has the {Egghead} type and you have 2 or more Life cards, add up to 1 Character card with a [Trigger] from your hand to the top of your |
| EB04-004 | Zeff | character | delayed-effect | [When Attacking] Your Leader's base power becomes 7000 until the end of your opponent's next End Phase. |
| EB04-005 | Trafalgar Law | character | attack-restriction | This Character cannot attack unless your opponent has 2 or more Characters with a base power of 5000 or more. |
| EB04-007 | Roronoa Zoro | character | delayed-effect,power-based-gate | [On Play] Your Leader gains +2000 power until the end of your opponent's next End Phase.[Activate: Main] [Once Per Turn] If your opponent has a Character with 8 |
| EB04-011 | Scaled Neptunian | character | dynamic-scaling | [Rush: Character] (This card can attack Characters on the turn in which it is played.)[On Play] Draw a card for each of your {Neptunian} type Characters. Then,  |
| EB04-022 | Issho | character | opp-deck-manip | [On Play] You may trash 2 cards from your hand: If your opponent has 6 or more cards in their hand, your opponent places 2 cards from their hand at the bottom o |
| EB04-025 | Nefeltari Vivi | character | opp-deck-manip | [On Play] Play up to 1 {Alabasta} type Character card with a cost of 8 or less other than [Nefeltari Vivi] from your hand. Then, your opponent places 1 card fro |
| EB04-028 | Ice Time | event | attack-restriction,delayed-effect | [Main] You may trash 1 card from your hand: If your Leader has the {Navy} type, up to 2 of your opponent's Characters with 10000 power or less cannot attack unt |
| EB04-035 | Hitokiri Kamazo | character | custom-trigger | [Blocker][Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, if your Leader has the {Kid Pirates} type, add up to 1 DON! |
| EB04-048 | Rob Lucci | character | dynamic-scaling | If your Leader's type includes "CP", this Character gains +1000 power and +2 cost for every 5 cards in your trash.[On Play] You may trash 1 of your Characters:  |
| EB04-050 | I'll Whip You Into Shape. ♡ | event | attack-restriction | [Main] Up to 1 of your {SWORD} type Leader or Character cards can also attack active Characters during this turn.[Counter] Your Leader gains +3000 power during  |
| EB04-051 | Emet | character | attack-restriction | This Character cannot attack unless there is a Character with 12000 base power or more. [Trigger] Give all of your opponent's Characters −3000 power during this |
| EB04-061 | Monkey.D.Luffy | character | delayed-effect | If you have 1 or less Life cards, give this card in your hand −1 cost.[On Play] You may trash 1 card from your hand: Your Leader gains +2000 power until the end |
| OP01-004 | Usopp | character | custom-trigger | [DON!! x1] [Your Turn] [Once Per Turn] Draw 1 card when your opponent activates an Event. |
| OP01-021 | Franky | character | attack-restriction | [DON!! x1] This Character can also attack your opponent's active Characters. |
| OP01-051 | Eustass"Captain"Kid | character | attack-restriction | [DON!! x1] [Opponent's Turn] If this Character is rested, your opponent cannot attack any card other than the Character [Eustass"Captain"Kid]. [Activate: Main]  |
| OP01-072 | Smiley | character | dynamic-scaling | [DON!! x1] [Your Turn] This Character gains +1000 power for every card in your hand. |
| OP01-075 | Pacifista | character | variable-count | Under the rules of this game, you may have any number of this card in your deck. [Blocker] (After your opponent declares an attack, you may rest this card to ma |
| OP01-083 | Mr.1(Daz.Bonez) | character | dynamic-scaling | [DON!! x1] [Your Turn] If your Leader has the {Baroque Works} type, this Character gains +1000 power for every 2 Events in your trash. |
| OP01-085 | Mr.3(Galdino) | character | attack-restriction,delayed-effect | [On Play] If your Leader has the {Baroque Works} type, select up to 1 of your opponent's Characters with a cost of 4 or less. The selected Character cannot atta |
| OP01-098 | Kurozumi Orochi | character | hand-reset | [On Play] Reveal up to 1 [Artificial Devil Fruit SMILE] from your deck and add it to your hand. Then, shuffle your deck. |
| OP01-112 | Page One | character | attack-restriction | [Activate: Main] [Once Per Turn] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): This Character can also atta |
| OP02-014 | Whitey Bay | character | attack-restriction | [DON!! x1] This Character can also attack your opponent's active Characters. |
| OP02-071 | Magellan | leader | custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on the field is returned to your DON!! deck, this Leader gains +1000 power during this turn. |
| OP02-085 | Magellan | character | opp-deck-manip | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Your opponent returns 1 DON!! card from their field |
| OP02-089 | Judgment of Hell | event | opp-deck-manip | [Counter] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Give up to a total of 2 of your opponent's Leader o |
| OP02-090 | Hydra | event | opp-deck-manip | [Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Give up to 1 of your opponent's Characters −3000 power |
| OP02-091 | Venom Road | event | opp-deck-manip | [Main] Add up to 1 DON!! card from your DON!! deck and set it as active. [Trigger] If your opponent has 6 or more DON!! cards on their field, your opponent retu |
| OP02-110 | Hina | character | attack-restriction | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.) [On Block] Select up to 1 of your opponent's |
| OP03-001 | Portgas.D.Ace | leader | dynamic-scaling,variable-count | When this Leader attacks or is attacked, you may trash any number of Event or Stage cards from your hand. This Leader gains +1000 power during this battle for e |
| OP03-004 | Curiel | character | attack-restriction | This Character cannot attack a Leader on the turn in which it is played.[DON!! x1] This Character gains [Rush].(This card can attack on the turn in which it is  |
| OP03-005 | Thatch | character | delayed-effect | [Activate: Main] [Once Per Turn] This Character gains +2000 power during this turn. Then, trash this Character at the end of this turn. |
| OP03-058 | Iceburg | leader | attack-restriction | This Leader cannot attack.[Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.) You may rest this L |
| OP04-001 | Nefeltari Vivi | leader | attack-restriction | This Leader cannot attack.[Activate: Main] [Once Per Turn] ➁ (You may rest the specified number of DON!! cards in your cost area.): Draw 1 card and up to 1 of y |
| OP04-009 | Super Spot-Billed Duck Troops | character | delayed-effect | [When Attacking] You may give your 1 active Leader −5000 power during this turn: Return this Character to the owner's hand at the end of this turn. |
| OP04-026 | Senor Pink | character | delayed-effect | [When Attacking] ➀ (You may rest the specified number of DON!! cards in your cost area.): If your Leader has the {Donquixote Pirates} type, rest up to 1 of your |
| OP04-033 | Machvise | character | delayed-effect | [On Play] If your Leader has the {Donquixote Pirates} type, rest up to 1 of your opponent's Characters with a cost of 5 or less. Then, set up to 1 of your DON!! |
| OP04-039 | Rebecca | leader | attack-restriction | This Leader cannot attack.[Activate: Main] [Once Per Turn] ➀ (You may rest the specified number of DON!! cards in your cost area.): If you have 6 or less cards  |
| OP04-042 | Ipponmatsu | character | attribute-target | [On Play] Up to 1 of your <Slash> attribute Characters gains +3000 power during this turn. Then, trash 1 card from the top of your deck. |
| OP04-048 | Sasaki | character | same-power-as,hand-reset | [On Play] Return all cards in your hand to your deck and shuffle your deck. Then, draw cards equal to the number you returned to your deck. |
| OP04-058 | Crocodile | leader | custom-trigger | [Opponent's Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck by your effect, add up to 1 DON!! card from your DON!! deck and |
| OP04-065 | Miss.Goldenweek(Marianne) | character | attack-restriction | [On Play] If your Leader's type includes "Baroque Works", up to 1 of your opponent's Characters with a cost of 5 or less cannot attack until the start of your n |
| OP04-080 | Gyats | character | attack-restriction | [On Play] Up to 1 of your {Dressrosa} type Characters can also attack active Characters during this turn. |
| OP04-081 | Cavendish | character | attack-restriction | [DON!! x1] This Character can also attack active Characters.[When Attacking] You may rest your Leader: K.O. up to 1 of your opponent's Characters with a cost of |
| OP04-090 | Monkey.D.Luffy | character | attack-restriction | This Character can also attack active Characters.[Activate: Main] [Once Per Turn] You may return 7 cards from your trash to the bottom of your deck in any order |
| OP04-095 | Barrier!! | event | dynamic-scaling | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have 15 or more cards in your trash, that card gains an a |
| OP04-100 | Capone"Gang"Bege | character | attack-restriction | [Trigger] Up to 1 of your opponent's Leader or Character cards cannot attack during this turn. |
| OP05-042 | Issho | character | attack-restriction | [On Play] Up to 1 of your opponent's Characters with a cost of 7 or less cannot attack until the start of your next turn. |
| OP05-074 | Eustass"Captain"Kid | character | custom-trigger | [Blocker][Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, add up to 1 DON!! card from your DON!! deck and set it as a |
| OP05-079 | Viola | character | opp-deck-manip | [On Play] Your opponent places 3 cards from their trash at the bottom of their deck in any order. |
| OP05-080 | Elizabello II | character | hand-reset | [When Attacking] [Once Per Turn] You may return 20 cards from your trash to your deck and shuffle it: This Character gains [Double Attack] and +10000 power duri |
| OP05-100 | Enel | character | negate-effect | [Rush][Once Per Turn] If this Character would leave the field, you may trash 1 card from the top of your Life cards instead. If there is a [Monkey.D.Luffy] Char |
| OP05-102 | Gedatsu | character | cost-eq-life | [On Play] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the number of your opponent's Life cards. |
| OP05-103 | Kotori | character | cost-eq-life | [On Play] If you have [Hotori], K.O. up to 1 of your opponent's Characters with a cost equal to or less than the number of your opponent's Life cards. |
| OP05-114 | El Thor | event | dynamic-scaling,cost-eq-life | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if your opponent has 2 or less Life cards, that card gains an ad |
| OP05-116 | Hino Bird Zap | event | cost-eq-life | [Main] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the number of your opponent's Life cards. [Trigger] Activate this card's [Ma |
| OP06-006 | Saga | character | delayed-effect | [DON!! x1] [When Attacking] This Character gains +1000 power until the start of your next turn. Then, trash 1 of your {FILM} type Characters at the end of this  |
| OP06-009 | Shuraiya | character | same-power-as | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[When Attacking]/[On Block] [Once Per Turn] T |
| OP06-012 | Bear.King | character | power-based-gate | If your opponent has a Leader or Character with a base power of 6000 or more, this Character cannot be K.O.'d in battle. |
| OP06-014 | Ratchet | character | dynamic-scaling,variable-count | [On Your Opponent's Attack] You may trash any number of {FILM} type cards from your hand. Your Leader or 1 of your Characters gains +1000 power during this batt |
| OP06-018 | Gum-Gum King Kong Gatling | event | power-based-gate | [Main] Up to 1 of your Leader or Character cards gains +3000 power during this turn. Then, if your opponent has a Character with 7000 power or more, up to 1 of  |
| OP06-023 | Arlong | character | attack-restriction,delayed-effect | [On Play] You may trash 1 card from your hand: Up to 1 of your opponent's rested Leader cannot attack until the end of your opponent's next turn. [Trigger] Rest |
| OP06-026 | Koushirou | character | attack-restriction,attribute-target | [On Play] Set up to 1 of your <Slash> attribute Characters with a cost of 4 or less as active. Then, you cannot attack a Leader during this turn. |
| OP06-038 | The Billion-fold World Trichiliocosm | event | dynamic-scaling | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have 8 or more rested cards, that card gains an additiona |
| OP06-042 | Vinsmoke Reiju | leader | custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, draw 1 card. |
| OP06-044 | Gion | character | custom-trigger | [Your Turn] [Once Per Turn] When your opponent activates an Event, your opponent must place 1 card from their hand at the bottom of their deck. |
| OP06-047 | Charlotte Pudding | character | hand-reset,opp-deck-manip | [On Play] Your opponent returns all cards in their hand to their deck and shuffles their deck. Then, your opponent draws 5 cards. |
| OP06-048 | Zeff | character | custom-trigger | [Your Turn] When your opponent activates [Blocker] or an Event, if your Leader has the {East Blue} type, you may trash 4 cards from the top of your deck. |
| OP06-051 | Tsuru | character | opp-deck-manip | [On Play] You may trash 2 cards from your hand: Your opponent returns 1 of their Characters to the owner's hand. |
| OP06-074 | Zephyr (Navy) | character | negate-effect | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): Negate the effect of up to 1 of your opponent's Cha |
| OP06-076 | Hitokiri Kamazo | character | custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, K.O. up to 1 of your opponent's Characters with a cost of 2 or less. |
| OP06-083 | Oars | character | negate-effect,attack-restriction | This Character cannot attack.[Activate: Main] You may K.O. 1 of your {Thriller Bark Pirates} type Characters: This Character's effect is negated during this tur |
| OP06-085 | Kumacy | character | dynamic-scaling | [DON!! x2] [Your Turn] This Character gains +1000 power for every 5 cards in your trash. |
| OP06-092 | Brook | character | opp-deck-manip | [On Play] Choose one:• Trash up to 1 of your opponent's Characters with a cost of 4 or less.• Your opponent places 3 cards from their trash at the bottom of the |
| OP06-095 | Shadows Asgard | event | dynamic-scaling,variable-count | [Main]/[Counter] Your Leader gains +1000 power during this turn. Then, you may K.O. any number of your {Thriller Bark Pirates} type Characters with a cost of 2  |
| OP06-100 | Inuarashi | character | cost-eq-life | [DON!! x2] [When Attacking] You may trash 1 card from your hand: K.O. up to 1 of your opponent's Characters with a cost equal to or less than the number of your |
| OP06-110 | Nekomamushi | character | attack-restriction | [DON!! x2] This Character can also attack your opponent's active Characters. [Trigger] If your opponent has 3 or less Life cards, play this card. |
| OP06-116 | Reject | event | direct-damage | [Main] Choose one:• K.O. up to 1 of your opponent's Characters with a cost of 5 or less.• If your opponent has 1 Life card, deal 1 damage to your opponent. Then |
| OP07-047 | Trafalgar Law | character | opp-deck-manip | [Activate: Main] You may return this Character to the owner's hand: If your opponent has 6 or more cards in their hand, your opponent places 1 card from their h |
| OP07-051 | Boa Hancock | character | attack-restriction,delayed-effect | [On Play] Up to 1 of your opponent's Characters other than [Monkey.D.Luffy] cannot attack until the end of your opponent's next turn. Then, place up to 1 Charac |
| OP07-063 | Capote | character | attack-restriction,delayed-effect | [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader has the {Foxy Pirates} type, up to 1 |
| OP07-091 | Monkey.D.Luffy | character | dynamic-scaling,variable-count | [When Attacking] Trash up to 1 of your opponent's Characters with a cost of 2 or less. Then, place any number of Character cards with a cost of 4 or more from y |
| OP07-095 | Iron Body | event | dynamic-scaling | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 10 or more cards in your trash, that card gains an a |
| OP07-097 | Vegapunk | leader | attack-restriction | This Leader cannot attack.[Activate: Main] [Once Per Turn] ① (You may rest the specified number of DON!! cards in your cost area.): Select up to 1 {Egghead} typ |
| OP08-038 | We Would Never Sell a Comrade to an Enemy!!! | event | delayed-effect | [Main] You may rest 2 of your Characters: None of your Characters can be K.O.'d by your opponent's effects until the end of your opponent's next turn. [Trigger] |
| OP08-043 | Edward.Newgate | character | delayed-effect | [On Play] If your Leader's type includes "Whitebeard Pirates" and you have 2 or less Life cards, select all of your opponent's Characters on their field. Until  |
| OP08-046 | Shakuyaku | character | opp-deck-manip | [Your Turn] [Once Per Turn] When a Character is removed from the field by your effect, if your opponent has 5 or more cards in their hand, your opponent places  |
| OP08-067 | Charlotte Pudding | character | custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, add up to 1 DON!! card from your DON!! deck and rest it. |
| OP08-072 | Biscuit Warrior | character | variable-count | Under the rules of this game, you may have any number of this card in your deck.[Blocker] (After your opponent declares an attack, you may rest this card to mak |
| OP08-074 | Black Maria | character | delayed-effect | [Activate: Main] [Once Per Turn] If you have no other [Black Maria] Characters, add up to 5 DON!! cards from your DON!! deck and rest them. Then, at the end of  |
| OP08-076 | It's to Die For... | event | power-based-gate | [Main] Add up to 1 DON!! card from your DON!! deck and set it as active. Then, if your opponent has a Character with 6000 power or more, add up to 1 DON!! card  |
| OP08-095 | Iron Body Fang Flash | event | delayed-effect | [Main] If you have 10 or more cards in your trash, up to 1 of your Characters gains +2000 power until the end of your opponent's next turn. [Trigger] Up to 1 of |
| OP08-098 | Kalgara | leader | cost-eq-life | [DON!! x1] [When Attacking] Play up to 1 {Shandian Warrior} type Character card from your hand with a cost equal to or less than the number of DON!! cards on yo |
| OP08-101 | Charlotte Angel | character | delayed-effect | [Activate: Main] [Once Per Turn] You may trash 1 card from the top of your Life cards: If your Leader has the {Big Mom Pirates} type, add 1 card from the top of |
| OP08-103 | Charlotte Custard | character | delayed-effect | [Activate: Main] [Once Per Turn] You may add 1 card from the top of your Life cards to your hand: Up to 1 of your Characters gains +1000 power until the end of  |
| OP08-112 | S-Snake | character | attack-restriction,delayed-effect | [On Play] Up to 1 of your opponent's Characters with a cost of 6 or less other than [Monkey.D.Luffy] cannot attack until the end of your opponent's next turn. [ |
| OP08-118 | Silvers Rayleigh | character | delayed-effect | [On Play] Select up to 2 of your opponent's Characters, and give 1 Character −3000 power and the other −2000 power until the end of your opponent's next turn. T |
| OP09-013 | Yasopp | character | delayed-effect | [On Play] Up to 1 of your Leader gains +1000 power until the end of your opponent's next turn.[DON!! x1] [When Attacking] Give up to 1 of your opponent's Charac |
| OP09-033 | Nico Robin | character | delayed-effect | [On Play] If you have 2 or more rested Characters, none of your {ODYSSEY} or {Straw Hat Crew} type Characters can be K.O.'d by effects until the end of your opp |
| OP09-068 | Tony Tony.Chopper | character | delayed-effect | [End of Your Turn] You may return 1 or more DON!! cards from your field to your DON!! deck: Set this Character as active. Then, this Character gains [Blocker] u |
| OP09-074 | Bepo | character | custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, up to 1 of your Leader or Character cards gains +1000 power during t |
| OP09-081 | Marshall.D.Teach | leader | negate-effect,delayed-effect | Your [On Play] effects are negated.[Activate: Main] You may trash 1 card from your hand: Your opponent's [On Play] effects are negated until the end of your opp |
| OP09-084 | Catarina Devon | character | delayed-effect | [Activate: Main] [Once Per Turn] If your Leader has the {Blackbeard Pirates} type, this Character gains [Double Attack], [Banish] or [Blocker] until the end of  |
| OP09-086 | Jesus Burgess | character | dynamic-scaling | This Character cannot be K.O.'d by your opponent's effects.If your Leader has the {Blackbeard Pirates} type, this Character gains +1000 power for every 4 cards  |
| OP09-093 | Marshall.D.Teach | character | negate-effect,attack-restriction,delayed-effect | [Blocker][Activate: Main] [Once Per Turn] If your Leader has the {Blackbeard Pirates} type and this Character was played on this turn, negate the effect of up t |
| OP09-097 | Black Vortex | event | negate-effect | [Counter] Negate the effect of up to 1 of your opponent's Leader or Character cards and give that card −4000 power during this turn. [Trigger] Negate the effect |
| OP09-098 | Black Hole | event | negate-effect | [Main] If your Leader has the {Blackbeard Pirates} type, negate the effect of up to 1 of your opponent's Characters during this turn. Then, if that Character ha |
| OP09-118 | Gol.D.Roger | character | custom-trigger | [Rush] (This card can attack on the turn in which it is played.)When your opponent activates [Blocker], if either you or your opponent has 0 Life cards, you win |
| OP10-070 | Trebol | character | delayed-effect | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Play] All of your Characters with 1000 ba |
| OP10-098 | Liberation | event | negate-effect | [Main] If the number of your Characters is at least 2 less than the number of your opponent's Characters, K.O. up to 1 of your opponent's Characters with a base |
| OP10-099 | Eustass"Captain"Kid | leader | delayed-effect | [End of Your Turn] You may turn 1 card from the top of your Life cards face-up: Set up to 1 of your {Supernovas} type Characters with a cost of 3 to 8 as active |
| OP10-110 | Heat & Wire | character | cost-eq-life | [On Play] Rest up to 1 of your opponent's Characters with a cost equal to or less than the number of your opponent's Life cards. [Trigger] If you have 2 or less |
| OP10-115 | Let's Meet Again in the New World | event | cost-eq-life | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you have 0 Life cards, draw 1 card. [Trigger] K.O. up to 1 of |
| OP11-006 | Zephyr | character | attribute-target | [DON!! x1] [When Attacking] Give up to 1 of your opponent's <Special> attribute Characters −5000 power during this turn. |
| OP11-012 | Franky | character | custom-trigger | [Your Turn] [Once Per Turn] When your opponent activates an Event, all of your Characters gain +2000 power during this turn. |
| OP11-014 | Borsalino | character | attack-restriction | [Blocker][Activate: Main] You may rest this Character: Up to 1 of your {Navy} type Leader or Character cards can also attack active Characters during this turn. |
| OP11-019 | Glorp Web!! | event | power-based-gate | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if your opponent has a Character with 6000 power or more, up to  |
| OP11-022 | Shirahoshi | leader | attack-restriction,cost-eq-life | This Leader cannot attack.[Activate: Main] [Once Per Turn] You may rest 1 of your DON!! cards and turn 1 card from the top of your Life cards face-up: Play up t |
| OP11-034 | Hatchan | character | delayed-effect | [Activate: Main] You may rest this Character: If your Leader has the {Fish-Man} or {Merfolk} type, up to 1 of your opponent's Characters with a cost of 3 or les |
| OP11-058 | Monkey.D.Luffy | character | attack-restriction | If you have 5 or more cards in your hand, this Character cannot attack.[Blocker] (After your opponent declares an attack, you may rest this card to make it the  |
| OP11-059 | Gum-Gum King Cobra | event | dynamic-scaling | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have 4 or less cards in your hand, that card gains an add |
| OP11-072 | Charlotte Mont-d'or | character | opp-deck-manip | [Activate: Main] [Once Per Turn] DON!! −1, You may rest this Character: Your opponent places 2 cards from their trash at the bottom of their deck in any order.  |
| OP11-077 | Randolph | character | delayed-effect,custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, up to 1 of your {Big Mom Pirates} type Characters gains +2 cost unti |
| OP11-082 | Aramaki | character | attack-restriction | [Activate: Main] You may trash this Character: If your Leader has the {Navy} type, up to 1 of your {Navy} type Characters can also attack active Characters duri |
| OP11-084 | Kuzan | character | attack-restriction | [On Play] Trash 3 cards from the top of your deck.[When Attacking] Up to 1 of your {Navy} type Leader or Character cards can also attack active Characters durin |
| OP11-091 | Berry Good | character | opp-deck-manip | [On Play] Your opponent places 3 Events from their trash at the bottom of their deck in any order. |
| OP11-092 | Helmeppo | character | delayed-effect | [On Play] You may trash 1 card from your hand: Draw 1 card and play up to 1 {SWORD} type Character card with a cost of 8 or less other than [Helmeppo] from your |
| OP11-102 | Camie | character | custom-trigger | [Your Turn] [Once Per Turn] This effect can be activated when your opponent activates an Event or [Trigger]. If your opponent has 2 or more Life cards, trash 1  |
| OP11-107 | Topknot Neptunian | character | delayed-effect | [Blocker][Activate: Main] [Once Per Turn] If your Leader is [Shirahoshi], you may turn 1 card from the top of your Life cards face-down: Set this Character as a |
| OP11-119 | Koby | character | attack-restriction,delayed-effect | [On Play] Up to 1 of your Characters can also attack active Characters during this turn.[When Attacking] You may place 2 cards from your trash at the bottom of  |
| OP12-009 | Jinbe | character | delayed-effect | [On Play] You may reveal 2 Events from your hand: This Character gains [Rush] during this turn. Then, this Character gains +1000 power until the end of your opp |
| OP12-012 | Buggy | character | delayed-effect | [On Play] Up to 1 of your Characters with a type including "Roger Pirates" other than [Buggy] gains [Blocker] until the end of your opponent's next End Phase. |
| OP12-020 | Roronoa Zoro | leader | attack-restriction | [DON!! x3] [Activate: Main] [Once Per Turn] If this Leader battles your opponent's Character during this turn, set this Leader as active. Then, this Leader cann |
| OP12-027 | Koushirou | character | attribute-target | If your <Slash> attribute Character with a cost of 5 or less other than this Character would be K.O.'d by your opponent's effect, you may rest this Character in |
| OP12-040 | Kuzan | leader | same-power-as | When a card is trashed from your hand by your {Navy} type card's effect, draw cards equal to the number of cards trashed. |
| OP12-043 | Kuzan | character | attack-restriction,delayed-effect | If you have 5 or more cards in your hand, this Character gains +1 cost.[On Play] You may trash 1 card from your hand: Up to 1 of your opponent's Characters cann |
| OP12-070 | Sanji | character | dynamic-scaling | This Character gains +1000 power for every 5 Events in your trash.If this Character would be removed from the field by your opponent's effect, you may return 1  |
| OP12-072 | Zeff | character | custom-trigger | When a DON!! card on your field is returned to your DON!! deck, if your Leader is [Sanji], this Character gains [Rush] during this turn.(This card can attack on |
| OP12-073 | Trafalgar Law | character | delayed-effect | [On Play] If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, add up to 1 DON!! card from your DON!! deck a |
| OP12-098 | Hair Removal Fist | event | dynamic-scaling | [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have a {Revolutionary Army} type Character with a cost of |
| OP12-101 | Jewelry Bonney | character | delayed-effect | [Activate: Main] You may rest this Character: Your {Supernovas} type Leader gains +1000 power until the end of your opponent's next turn. [Trigger] If your Lead |
| OP12-119 | Bartholomew Kuma | character | delayed-effect | [On Play] You may trash 1 card from your hand: Add up to 1 card from the top of your deck to the top of your Life cards. Then, this Character gains +2 cost unti |
| OP13-001 | Monkey.D.Luffy | leader | dynamic-scaling,variable-count | [DON!! x1] [On Your Opponent's Attack] If you have 5 or less active DON!! cards, you may rest any number of your DON!! cards. For every DON!! card rested this w |
| OP13-024 | Gordon | character | delayed-effect | [On Play] You may reveal 1 {Music} or {FILM} type card from your hand: Set up to 2 of your DON!! cards as active at the end of this turn. |
| OP13-026 | Sunny-Kun | character | delayed-effect | [Activate: Main] [Once Per Turn] You may rest 1 of your DON!! cards: This Character gains +2000 power until the end of your opponent's next turn. |
| OP13-032 | Nico Robin | character | delayed-effect | [On Play] Up to 1 of your opponent's Characters with a cost of 8 or less cannot be rested until the end of your opponent's next End Phase. |
| OP13-038 | Gum-Gum Elephant Gun | event | delayed-effect | [Main] Rest up to 1 of your opponent's Characters with a cost of 5 or less. Then, set up to 2 of your DON!! cards as active at the end of this turn. [Trigger] R |
| OP13-064 | Gol.D.Roger | character | negate-effect,delayed-effect | Your Leader and all of your Characters that do not have a type including "Roger Pirates" have their effects negated.[On Play] DON!! −3: Your Leader gains +2000  |
| OP13-066 | Silvers Rayleigh | character | delayed-effect | [Rush][On Play] If you have any DON!! cards given, rest up to 1 of your opponent's Characters with a cost of 5 or less. Then, add up to 1 DON!! card from your D |
| OP13-099 | The Empty Throne | stage | cost-eq-life | [Your Turn] If you have 19 or more cards in your trash, your Leader gains +1000 power.[Activate: Main] You may rest this card and 3 of your DON!! cards: Play up |
| OP13-120 | Sabo | character | delayed-effect | [Blocker][Activate: Main] [Once Per Turn] Up to 1 of your Characters gains +2 cost until the end of your opponent's next turn. Then, give up to 1 rested DON!! c |
| OP14-029 | Tashigi | character | delayed-effect | [Opponent's Turn] If this Character would be removed from the field by your opponent's effect, you may rest 1 of your cards instead.[Activate: Main] [Once Per T |
| OP14-031 | Nami | character | delayed-effect | [Blocker][On Play] Rest up to 2 of your opponent's Characters with a cost of 8 or less. Then, set up to 5 of your DON!! cards as active at the end of this turn. |
| OP14-033 | Perona | character | delayed-effect | [On Play] Up to 2 of your opponent's Characters with a cost of 5 or less cannot be rested until the end of your opponent's next End Phase.[On K.O.] You may rest |
| OP14-056 | Wadatsumi | character | negate-effect,attack-restriction | This Character cannot attack.When a card is trashed from your hand by an effect, this Character's effect is negated during this turn. |
| OP14-065 | Senor Pink | character | opp-deck-manip | [On K.O.] Your opponent returns 1 DON!! card from their field to their DON!! deck. |
| OP14-068 | Trebol | character | custom-trigger | [Opponent's Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, if your Leader has the {Donquixote Pirates} type, add up to 1  |
| OP14-069 | Donquixote Doflamingo | character | delayed-effect | [On Play] DON!! −3: Choose one:• If your Leader has the {Donquixote Pirates} type, K.O. up to 1 of your opponent's Characters with a cost of 8 or less.• Up to 3 |
| OP14-077 | Penta-Chromatic String | event | power-based-gate | [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if your opponent has a Character with 6000 power or more, add up |
| OP14-078 | Bullet String | event | dynamic-scaling | [Counter] DON!! −1: If your Leader has the {Donquixote Pirates} type, up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, that |
| OP14-082 | Oinkchuck | character | delayed-effect | [On K.O.] All of your {Thriller Bark Pirates} type Characters gain +4 cost until the end of your opponent's next End Phase. [Trigger] Play up to 1 {Thriller Bar |
| OP14-096 | Ground Death | event | negate-effect | [Main] You may rest 2 of your DON!! cards: Negate the effect of up to 1 of your opponent's Characters with a cost of 5 or less during this turn.[Counter] If you |
| OP14-098 | Crescent Cutlass | event | delayed-effect | [Main] If there is a Character with a cost of 0 or with a cost of 8 or more, all of your Characters with a type including "Baroque Works" gain +3 cost until the |
| OP14-111 | Perona | character | attack-restriction,delayed-effect | [On Play]/[On K.O.] Up to 1 of your opponent's Characters with a cost of 6 or less cannot attack until the end of your opponent's next End Phase. [Trigger] Play |
| OP14-118 | You'll Frighten Me... ♡ | event | attack-restriction | [Counter] If you have 2 or less Life cards, up to 1 of your opponent's active Characters cannot attack during this turn. [Trigger] Play up to 1 Character card w |
| OP14-119 | Dracule Mihawk | character | delayed-effect | [Your Turn] When this Character becomes rested, up to 1 of your opponent's Characters with a cost of 9 or less cannot be rested until the end of your opponent's |
| OP14-120 | Crocodile | character | attack-restriction,delayed-effect | [On Play] Up to 1 of your opponent's Characters with a cost of 9 or less cannot attack until the end of your opponent's next End Phase. Then, if your opponent h |
| OP15-002 | Lucy | leader | dynamic-scaling,variable-count | [When Attacking]/[On Your Opponent's Attack] You may trash any number of Event or Stage cards from your hand. This Leader gains +1000 power during this battle f |
| OP15-008 | Krieg | character | dynamic-scaling | [On Play] Give up to 3 of your opponent's rested DON!! cards to 1 of your opponent's Characters. Then, this Character gains [Rush] during this turn.[Activate: M |
| OP15-019 | Barrier Bulls | event | delayed-effect | [Main] Draw 1 card and your Leader gains +1000 power until the end of your opponent's next End Phase. [Trigger] Give up to 1 of your opponent's Characters −4000 |
| OP15-020 | Fire Fist | event | delayed-effect | [Main] Your Leader gains +3000 power during this turn and give up to 1 of your opponent's Characters −8000 power until the end of your opponent's next End Phase |
| OP15-025 | Kuro | character | delayed-effect | [Blocker][On Play] Give up to 2 DON!! cards from your opponent's cost area to 1 of your opponent's Characters. Then, at the end of this turn, up to 1 rested Cha |
| OP15-029 | Bartholomew Kuma | character | delayed-effect | [On Play] Up to 1 of your opponent's Characters with a cost of 5 or less cannot be rested until the end of your opponent's next End Phase. |
| OP15-031 | Purinpurin | character | same-power-as | [On Play] Select up to 1 of your opponent's rested Characters. If the chosen Character has a cost equal to the number of DON!! cards given to it, K.O. it. |
| OP15-039 | Rebecca | leader | attack-restriction | This Leader cannot attack.[Activate: Main] You may rest this Leader and return 1 of your {Dressrosa} type Characters to the owner's hand: Play up to 1 {Dressros |
| OP15-048 | Chinjao | character | opp-deck-manip | [On Play] You may trash 1 Event from your hand: Draw 2 cards.[Opponent's Turn] [On K.O.] Your opponent places 1 card from their hand at the bottom of their deck |
| OP15-055 | Go Ahead and Use 'Em, Mr. Luffy!!! | event | delayed-effect | [Main] Choose one:• Draw 2 cards.• Up to 1 of your {Dressrosa} type Characters gains [Blocker] until the end of your opponent's next End Phase. |
| OP15-060 | Enel | character | delayed-effect | If you have 6 or less DON!! cards on your field, this Character cannot be removed from the field by your opponent's effects and gains +2000 power.[Activate: Mai |
| OP15-074 | Varie | event | delayed-effect | [Main] DON!! −1: If your Leader is [Enel], draw 1 card. Then, up to 1 of your Characters gains +2 cost until the end of your opponent's next End Phase.[Counter] |
| OP15-097 | I Find It Embarrassing as a Human Being | event | attack-restriction,delayed-effect | [Main] If you have 10 or more cards in your trash, up to 1 of your opponent's Characters with a base cost of 5 or less cannot attack until the end of your oppon |
| OP15-102 | Gan.Fall | character | cost-eq-life | If you have a {Sky Island} type Character with 7000 power or more, give this card in your hand −3 cost.[On Play] Rest up to 1 of your opponent's Characters with |
| OP15-119 | Monkey.D.Luffy | character | custom-trigger | If you have 6 or more DON!! cards on your field, this Character gains [Rush].When your opponent activates an Event or [Blocker], reveal up to 1 card from the to |
| OP16-009 | Speed Jil | character | delayed-effect | [On Play] You may trash 1 Character card with 8000 power from your hand: This Character gains [Rush] and +2000 power until the end of your opponent's next End P |
| OP16-032 | Boa Hancock | character | delayed-effect | [Unblockable] (This card cannot be blocked.)[On Play] Up to 1 of your opponent's Characters other than [Monkey.D.Luffy] cannot be rested until the end of your o |
| OP16-034 | Monkey.D.Luffy | character | dynamic-scaling | [DON!! x1] [Your Turn] This Character gains +1000 power for each of your Characters with a different card name.[On Play] Look at 3 cards from the top of your de |
| OP16-042 | Prisoner of Impel Down | character | variable-count | Under the rules of this game, you may have any number of this card in your deck. |
| OP16-056 | Mr.3(Galdino) | character | attack-restriction,delayed-effect | [Activate: Main] You may trash this Character: Draw 2 cards, and up to 1 of your opponent's Characters with a cost of 9 or less cannot attack until the end of y |
| OP16-065 | Sakazuki | character | delayed-effect | [On Play] DON!! −1: Give up to 1 of your opponent's Characters −6000 power until the end of your opponent's next End Phase.[Activate: Main] [Once Per Turn] You  |
| OP16-073 | Borsalino | character | delayed-effect | [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active, and add up to 1 additional DON!! card and rest it.[End of Your Turn] DON!! −2: Set t |
| OP16-074 | Magellan | character | opp-deck-manip | [On Play] If your Leader has the {Impel Down} type, your opponent returns 1 DON!! card from their field to their DON!! deck.[On K.O.] Your opponent returns 4 DO |
| OP16-115 | Black Vortex | event | negate-effect | [Main] If your Leader has the {Blackbeard Pirates} type, add up to 1 card with a [Trigger] other than [Black Vortex] from your trash to your hand. [Trigger] Neg |
| OP16-117 | Black Hole | event | negate-effect | [Main] You may trash 1 card with a [Trigger] from your hand: Negate the effects of up to 1 of your opponent's Characters with a cost of 8 or less during this tu |
| OP16-119 | Marshall.D.Teach | character | negate-effect | [On Play] Look at 3 cards from the top of your deck; add up to 1 card to the top of your Life cards. Then, place the rest at the bottom of your deck in any orde |
| P-055 | Monkey.D.Luffy | character | opp-deck-manip | [On Play] You may trash 2 cards from your hand: Your opponent places 1 of their Characters at the bottom of the owner's deck. |
| P-058 | Where the Wind Blows | event | delayed-effect | [Main] If your Leader is [Uta], set all of your {FILM} type Characters as active at the end of this turn. [Trigger] Set all of your {FILM} type Characters as ac |
| P-059 | The World's Continuation | event | dynamic-scaling,variable-count | [Counter] If your Leader is [Uta], you may return any number of Characters on your field to the owner's hand. Up to 1 of your Leader or Character cards gains +2 |
| P-084 | Buggy | character | attack-restriction | This Character cannot attack.If your Leader is [Buggy], all Characters with a cost of 3 or 4 cannot attack.[On Play] Play up to 1 {Cross Guild} type Character c |
| PRB02-017 | Boa Hancock | character | attack-restriction,delayed-effect | [On Play] You may trash 1 card with a [Trigger] from your hand: Your opponent's rested Leader or up to 1 of your opponent's Characters other than [Monkey.D.Luff |
| ST10-006 | Monkey.D.Luffy | character | custom-trigger | [Rush] (This card can attack on the turn in which it is played.)[Once Per Turn] When your opponent activates a [Blocker], K.O. up to 1 of your opponent's Charac |
| ST10-007 | Killer | character | custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, K.O. up to 1 of your opponent's rested Characters with a cost of 3 o |
| ST10-011 | Heat | character | custom-trigger | [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, this Character gains +2000 power until the start of your next turn. |
| ST10-014 | Wire | character | custom-trigger | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[Once Per Turn] When a DON!! card on your fie |
| ST13-007 | Sabo | character | delayed-effect | [Activate: Main] You may trash this Character: Reveal 1 card from the top of your Life cards. If that card is a [Sabo] with a cost of 5, you may play that card. |
| ST13-010 | Portgas.D.Ace | character | delayed-effect | [Activate: Main] You may trash this Character: Reveal 1 card from the top of your Life cards. If that card is a [Portgas.D.Ace] with a cost of 5, you may play t |
| ST13-014 | Monkey.D.Luffy | character | delayed-effect | [Activate: Main] You may trash this Character: Reveal 1 card from the top of your Life cards. If that card is a [Monkey.D.Luffy] with a cost of 5, you may play  |
| ST16-002 | Gordon | character | dynamic-scaling,variable-count | [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)[On Your Opponent's Attack] You may trash any |
| ST19-001 | Smoker | character | attack-restriction,delayed-effect | [On Play] You may trash 1 black {Navy} type card from your hand: Up to 2 of your opponent's Characters with a cost of 4 or less cannot attack until the end of y |
| ST22-012 | Marco | character | delayed-effect | [Once Per Turn] If this Character would be K.O.'d by your opponent's effect, you may trash 1 card from your hand instead.[When Attacking] Reveal 1 card from the |
| ST22-015 | I Am Whitebeard!! | event | delayed-effect | [Main] If your Leader's type includes "Whitebeard Pirates", play up to 1 [Edward.Newgate] from your hand. Then, you may add 1 card from the top or bottom of you |
| ST23-002 | Shanks | character | delayed-effect | If your opponent has a Character with 8000 base power or more, give this card in your hand −3 cost.[On Play] If your Leader has the {Red-Haired Pirates} type or |
| ST24-004 | Law & Bepo | character | delayed-effect | [On Play] Rest up to 1 of your opponent's Characters and that Character will not become active in your opponent's next Refresh Phase. Then, if your opponent has |
| ST24-005 | X.Drake | character | delayed-effect | [On Play] If your Leader has the {Supernovas} type, rest up to 1 of your opponent's Characters with a cost of 5 or less. Then, set up to 1 of your DON!! cards a |
| ST26-005 | Monkey.D.Luffy | character | delayed-effect | [On Play]/[When Attacking] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!! deck.): If your Leader is multicolored and |
| ST27-004 | Sanjuan.Wolf | character | dynamic-scaling | If your Leader has the {Blackbeard Pirates} type, this Character gains [Blocker] and +1 cost for every 4 cards in your trash.(After your opponent declares an at |
| ST29-002 | Usopp | character | cost-eq-life | [On Play]/[When Attacking] Rest up to 1 of your opponent's Characters with a cost equal to or less than the number of your opponent's Life cards. |
