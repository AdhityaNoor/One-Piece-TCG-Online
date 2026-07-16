import { describe, expect, it } from 'vitest';
import { buildCoverageReportFromAssignments_V2, compileCardEffects_V2, toMongoCompiledCardEffectDocument_V2, toMongoEffectAssignmentDocuments_V2 } from '../compiler_V2';
import { EFFECT_ASSIGNMENTS_V2 } from '../assignments_V2';
import { adaptCompiledCardEffectsToLegacyProgram_V2 } from '../legacyAdapter_V2';
import { parseCardEffect_V2 } from '../parser_V2';

describe('effectCompiler_V2 parser', () => {
  it('parses canonical markers and covered atomic actions into inert V2 JSON', () => {
    const parsed = parseCardEffect_V2(
      'OP01-001',
      '[DON!! x1] [Your Turn] All of your Characters gain +1000 power.',
    );

    expect(parsed.schemaVersion).toBe('op-tcg-effect-v2.0.0');
    expect(parsed.effects).toHaveLength(1);
    expect(parsed.effects[0].category).toBe('PERMANENT');
    expect(parsed.effects[0].conditions?.kind).toBe('AND');
    expect(parsed.atomicEffects).toHaveLength(1);
    expect(parsed.atomicEffects[0].coverage).toBe('coveredByParser');
    expect(parsed.atomicEffects[0].parsedAction?.type).toBe('MODIFY_POWER');
    expect(() => JSON.stringify(parsed)).not.toThrow();
  });

  it('keeps unmatched text as uncovered atomic effects instead of executable logic', () => {
    const parsed = parseCardEffect_V2('TEST-001', '[On Play] Do a complicated unresolved thing.');

    expect(parsed.effects).toHaveLength(1);
    expect(parsed.effects[0].metadata.authoringStatus).toBe('UNCOVERED');
    expect(parsed.atomicEffects).toHaveLength(1);
    expect(parsed.atomicEffects[0]).toMatchObject({
      coverage: 'uncovered',
      uncoveredReason: 'No conservative V2 atomic recognizer matched this clause.',
    });
  });

  it('maps canonical search text into look, selected move, and remainder atoms', () => {
    const parsed = parseCardEffect_V2(
      'TEST-SEARCH',
      '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add it to your hand. Then, place the rest at the bottom of your deck in any order.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser', 'coveredByParser']);
    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['LOOK_AT_CARDS', 'MOVE_CARD', 'REORDER_CARDS']);
    expect(parsed.atomicEffects.map((atom) => atom.canonicalCoverage)).toEqual(['canonical', 'canonical', 'canonical']);
    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({
      type: 'MOVE_CARD',
      to: { zone: 'HAND', owner: 'PLAYER' },
    });
    expect(parsed.atomicEffects[2].parsedAction).toMatchObject({
      type: 'REORDER_CARDS',
      destination: { zone: 'DECK', owner: 'PLAYER', position: 'BOTTOM' },
      orderChooser: 'PLAYER',
    });
  });

  it('lifts activation costs out of resolution atoms', () => {
    const parsed = parseCardEffect_V2(
      'TEST-COST',
      '[Activate: Main] You may trash 1 {Land of Wano} type card from your hand: Draw 1 card.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser']);
    expect(parsed.atomicEffects[0].parsedCost).toMatchObject({ type: 'TRASH_CARD_COST' });
    expect(parsed.effects[0].activationCost?.payments).toHaveLength(1);
    expect(parsed.effects[0].activationCost?.payments[0]).toMatchObject({
      type: 'TRASH_CARD_COST',
      selector: { types: { kind: 'HAS_ANY_TYPE', values: ['Land of Wano'] } },
    });
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: { type: 'DRAW_CARD' },
    });
  });

  it('keeps typed hand-trash payments when an activation cost is split after another cost', () => {
    const parsed = parseCardEffect_V2(
      'ST05-005',
      "[Activate: Main] [Once Per Turn] You may rest this Character and trash 1 {FILM} type card from your hand: If your opponent has more DON!! cards on their field than you, add 2 DON!! cards from your DON!! deck and rest them.",
    );

    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser', 'coveredByParser']);
    expect(parsed.effects[0].activationCost?.payments).toEqual([
      expect.objectContaining({ type: 'REST_CARD_COST' }),
      expect.objectContaining({
        type: 'TRASH_CARD_COST',
        selector: expect.objectContaining({ types: { kind: 'HAS_ANY_TYPE', values: ['FILM'] } }),
      }),
    ]);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'IF',
      then: { kind: 'ACTION', action: { type: 'ADD_DON_FROM_DON_DECK' } },
    });
  });

  it('lifts rest-DON plus rest-this-Character activation costs', () => {
    const parsed = parseCardEffect_V2(
      'OP09-095',
      '[Activate: Main] You may rest 1 of your DON!! cards and this Character: Draw 1 card.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser']);
    expect(parsed.effects[0].activationCost?.payments).toEqual([
      expect.objectContaining({ type: 'REST_DON_COST', count: { kind: 'NUMBER', value: 1 } }),
      expect.objectContaining({
        type: 'REST_CARD_COST',
        selector: expect.objectContaining({ relations: ['THIS_CARD'] }),
      }),
    ]);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: { type: 'DRAW_CARD' },
    });
  });

  it('parses OP13-079 deck restriction, game-start setup, and choose-one activate cost', () => {
    const parsed = parseCardEffect_V2(
      'OP13-079',
      'Under the rules of this game, you cannot include Events with a cost of 2 or more in your deck and at the start of the game, play up to 1 {Mary Geoise} type Stage card from your deck.[Activate: Main] [Once Per Turn] You may trash 1 of your {Celestial Dragons} type Characters or 1 card from your hand: Draw 1 card.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual([
      'coveredByParser',
      'coveredByParser',
      'coveredByParser',
      'coveredByParser',
    ]);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'MODIFY_DECK_CONSTRUCTION', modifier: { modifier: { expression: { rule: 'CANNOT_INCLUDE_CATEGORY_COST_OR_MORE', cardCategory: 'EVENT', cost: 2 } } } } },
        { kind: 'ACTION', action: { type: 'MODIFY_STARTING_SETUP', modifier: { validFrom: 'GAME_START', modifier: { expression: { operation: 'PLAY_FROM_DECK_AT_GAME_START' } } } } },
      ],
    });
    expect(parsed.effects[1].activationCost?.payments).toEqual([
      expect.objectContaining({
        type: 'CHOOSE_ONE_COST',
        options: [
          [expect.objectContaining({
            type: 'TRASH_CARD_COST',
            selector: expect.objectContaining({
              zones: ['CHARACTER_AREA'],
              types: { kind: 'HAS_ANY_TYPE', values: ['Celestial Dragons'] },
            }),
          })],
          [expect.objectContaining({
            type: 'TRASH_CARD_COST',
            selector: expect.objectContaining({ zones: ['HAND'] }),
          })],
        ],
      }),
    ]);
    expect(parsed.effects[1].resolution).toMatchObject({
      kind: 'ACTION',
      action: { type: 'DRAW_CARD' },
    });
  });

  it('keeps every payment in circled-DON compound activation costs', () => {
    const parsed = parseCardEffect_V2(
      'OP05-088',
      '[Activate: Main] ➀ You may rest this Character and place 2 cards from your trash at the bottom of your deck in any order: Add up to 1 black Character card with a cost of 3 to 5 from your trash to your hand.',
    );

    expect(parsed.atomicEffects[0].coverage).toBe('coveredByParser');
    expect(parsed.atomicEffects[0].parsedCosts).toEqual([
      expect.objectContaining({ type: 'REST_DON_COST', count: { kind: 'NUMBER', value: 1 } }),
      expect.objectContaining({
        type: 'REST_CARD_COST',
        selector: expect.objectContaining({ relations: ['THIS_CARD'] }),
      }),
      expect.objectContaining({
        type: 'RETURN_CARD_TO_DECK_COST',
        selector: expect.objectContaining({ zones: ['TRASH'], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 2 } } }),
      }),
    ]);
    expect(parsed.effects[0].activationCost?.payments).toEqual(parsed.atomicEffects[0].parsedCosts);
  });

  it('uses BASE cost filters when card text says base cost', () => {
    const parsed = parseCardEffect_V2(
      'EB03-056',
      '[On Play] DON!! −1: K.O. up to 2 of your opponent\'s Characters with a base cost of 3 or less.',
    );

    expect(parsed.atomicEffects.at(-1)?.parsedAction).toMatchObject({
      type: 'KO_CARD',
      selector: { cost: { propertyLayer: 'BASE', comparison: 'AT_MOST', value: { kind: 'NUMBER', value: 3 } } },
    });
    expect(parsed.atomicEffects.at(-1)?.semanticStatus).toBe('safe');
  });

  it('preserves without-counter filters in counter rule modifiers', () => {
    const parsed = parseCardEffect_V2(
      'EB01-001',
      'All of your {Land of Wano} type Character cards without a Counter have a +1000 Counter, according to the rules.',
    );

    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_COUNTER',
      selector: {
        controller: 'PLAYER',
        cardCategories: ['CHARACTER'],
        types: { kind: 'HAS_ANY_TYPE', values: ['Land of Wano'] },
        counter: { propertyLayer: 'BASE', comparison: 'EQUAL', value: { kind: 'NUMBER', value: 0 } },
      },
      duration: { kind: 'PERMANENT' },
    });
    expect(parsed.atomicEffects[0].semanticStatus).toBe('safe');
  });

  it('parses deck-out win text as a victory-condition rule modifier', () => {
    const parsed = parseCardEffect_V2(
      'OP03-040',
      'When your deck is reduced to 0, you win the game instead of losing, according to the rules.',
    );

    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_VICTORY_CONDITION',
      modifier: {
        scope: 'VICTORY_CONDITION',
        modifier: { expression: { operation: 'WIN_INSTEAD_OF_LOSE' } },
      },
    });
    expect(parsed.atomicEffects[0].semanticStatus).toBe('safe');
  });

  it('does not split trigger-filter cost text into a separate timing segment', () => {
    const parsed = parseCardEffect_V2(
      'TEST-TRIGGER-COST',
      '[DON!! x1] [When Attacking] You may trash 1 card with a [Trigger] from your hand: This Character gains +3000 power during this battle.',
    );

    expect(parsed.effects).toHaveLength(1);
    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser']);
    expect(parsed.atomicEffects[0].parsedCost).toMatchObject({ type: 'TRASH_CARD_COST' });
    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({ type: 'MODIFY_POWER' });
  });

  it('maps trash-the-rest search remainders to a canonical trash action', () => {
    const parsed = parseCardEffect_V2(
      'TEST-TRASH-REST',
      '[On Play] Look at 3 cards from the top of your deck; reveal up to 1 card and add it to your hand. Then, trash the rest.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser', 'coveredByParser']);
    expect(parsed.atomicEffects[2].parsedAction).toMatchObject({
      type: 'TRASH_CARD',
      selector: { subject: 'ACTION_RESULT', relations: ['REMAINDER_OF_PREVIOUS_SELECTION'] },
    });
  });

  it('maps hand-to-life movement to ADD_CARD_TO_LIFE', () => {
    const parsed = parseCardEffect_V2(
      'TEST-HAND-TO-LIFE',
      '[On Play] Add up to 1 card from your hand to the top of your Life cards.',
    );

    expect(parsed.atomicEffects).toHaveLength(1);
    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'ADD_CARD_TO_LIFE',
      player: 'PLAYER',
      position: 'TOP',
    });
  });

  it('keeps referenced timing tags inside activate-this-card effect text', () => {
    const parsed = parseCardEffect_V2('TEST-ACTIVATE-REF', "[Trigger] Activate this card's [Main] effect.");

    expect(parsed.atomicEffects).toHaveLength(1);
    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({ type: 'ACTIVATE_EVENT' });
  });

  it('does not split colons inside bracketed keyword names', () => {
    const parsed = parseCardEffect_V2(
      'TEST-RUSH-CHARACTER',
      '[On Play] This Character gains [Rush: Character] during this turn.',
    );

    expect(parsed.atomicEffects).toHaveLength(1);
    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'GRANT_KEYWORD',
      keyword: 'RUSH_CHARACTER',
    });
  });

  it('keeps bracketed card names in inline condition selectors', () => {
    const parsed = parseCardEffect_V2(
      'EB02-012',
      'If you have a [Sarfunkel], this Character gains [Blocker].',
    );

    expect(parsed.effects[0].conditions).toMatchObject({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          names: [{ kind: 'NAME_EXACT', value: 'Sarfunkel' }],
        },
      },
      operator: 'GREATER_OR_EQUAL',
    });
    expect(parsed.warnings).toEqual([]);
  });

  it('keeps bracketed card names in search and play selectors', () => {
    const parsed = parseCardEffect_V2(
      'EB02-013',
      '[On Play] If you have 3 or more DON!! cards on your field, look at 7 cards from the top of your deck; reveal up to 1 [Zou] and add it to your hand. Then, place the rest at the bottom of your deck in any order and play up to 1 [Zou] from your hand.',
    );

    expect(parsed.effects[0].optionality).toBe('MANDATORY');
    expect(parsed.effects[0].conditions).toMatchObject({
      kind: 'PREDICATE',
      left: { kind: 'COUNT', selector: { subject: 'DON', zones: ['COST_AREA'] } },
      operator: 'GREATER_OR_EQUAL',
    });
    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({
      type: 'MOVE_CARD',
      selector: { names: [{ kind: 'NAME_EXACT', value: 'Zou' }] },
    });
    expect(parsed.atomicEffects[3].parsedAction).toMatchObject({
      type: 'PLAY_CARD',
      selector: { names: [{ kind: 'NAME_EXACT', value: 'Zou' }] },
    });
    expect(parsed.warnings).toEqual([]);
  });

  it('keeps brace-wrapped type filters and excluded names in search selectors', () => {
    const parsed = parseCardEffect_V2(
      'EB02-017',
      '[On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card other than [Nami] and add it to your hand. Then, place the rest at the bottom of your deck in any order.',
    );

    expect(parsed.effects[0].optionality).toBe('MANDATORY');
    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({
      type: 'MOVE_CARD',
      selector: {
        types: { kind: 'HAS_ANY_TYPE', values: ['Straw Hat Crew'] },
        names: [{ kind: 'NAME_NOT', value: 'Nami' }],
      },
    });
  });

  it('keeps brace-wrapped type filters in direct play-from-hand selectors', () => {
    const parsed = parseCardEffect_V2(
      'EB02-016',
      '[On Play] Play up to 1 {Animal} type Character card with a cost of 3 or less from your hand.',
    );

    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'PLAY_CARD',
      selector: {
        zones: ['HAND'],
        types: { kind: 'HAS_ANY_TYPE', values: ['Animal'] },
      },
    });
  });

  it('maps Life-card look and top-or-bottom placement permutations', () => {
    const parsed = parseCardEffect_V2(
      'EB02-053',
      '[On Play] Look at up to 1 card from the top of your or your opponent\'s Life cards and place it at the top or bottom of the Life cards.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser']);
    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'LOOK_AT_LIFE',
      player: 'ANY',
      position: 'TOP',
    });
    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({
      type: 'REORDER_LIFE',
      player: 'ANY',
    });
  });

  it('maps play-this-card-from-trash-rested as a reusable PLAY_CARD permutation', () => {
    const parsed = parseCardEffect_V2(
      'OP03-013',
      '[On K.O.] You may play this Character card from your trash rested.',
    );

    expect(parsed.effects[0].optionality).toBe('OPTIONAL');
    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'PLAY_CARD',
      selector: {
        zones: ['TRASH'],
        relations: ['THIS_CARD'],
        states: ['RESTED'],
      },
    });
  });

  it('maps source-to-life and opponent-life-to-owner-hand movements', () => {
    const addToLife = parseCardEffect_V2(
      'EB04-060',
      '[Main] Add up to 1 {Egghead} type Character card from your hand to the top of your Life cards face-up.',
    );
    const takeOpponentLife = parseCardEffect_V2(
      'EB04-054',
      '[On Play] Add up to 1 card from the top of your opponent\'s Life cards to the owner\'s hand.',
    );

    expect(addToLife.atomicEffects[0].parsedAction).toMatchObject({
      type: 'ADD_CARD_TO_LIFE',
      selector: { types: { kind: 'HAS_ANY_TYPE', values: ['Egghead'] } },
      face: 'FACE_UP',
    });
    expect(takeOpponentLife.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MOVE_CARD',
      selector: { owner: 'OPPONENT', zones: ['LIFE'] },
      to: { zone: 'HAND', owner: 'CARD_OWNER' },
    });
  });

  it('extracts common Leader and resource condition gates', () => {
    const parsed = parseCardEffect_V2(
      'EB03-031',
      '[Main] If your Leader is [Sanji], activate the [Main] effect of up to 1 Event card with a cost of 7 or less in your trash.',
    );

    expect(parsed.effects[0].conditions).toMatchObject({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          zones: ['LEADER_AREA'],
          names: [{ kind: 'NAME_EXACT', value: 'Sanji' }],
        },
      },
    });
  });

  it('maps trash-life-until and opponent DON return permutations', () => {
    const trashLife = parseCardEffect_V2(
      'EB01-059',
      '[Main] Trash cards from the top of your Life cards until you have 1 Life card.',
    );
    const returnDon = parseCardEffect_V2(
      'OP16-074',
      '[On Play] Your opponent returns 4 DON!! cards from their field to their DON!! deck.',
    );

    expect(trashLife.atomicEffects[0].parsedAction).toMatchObject({ type: 'TRASH_LIFE' });
    expect(returnDon.atomicEffects[0].parsedAction).toMatchObject({
      type: 'RETURN_DON_TO_DON_DECK',
      selector: { owner: 'OPPONENT', quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 4 } } },
    });
  });

  it('maps top-or-bottom deck placement and simple play-from-trash permutations', () => {
    const reorder = parseCardEffect_V2(
      'OP01-073',
      '[On Play] Look at 5 cards from the top of your deck; place them at the top or bottom of the deck in any order.',
    );
    const play = parseCardEffect_V2('OP04-055', '[Main] Play 1 [Ice Oni] from your trash.');

    expect(reorder.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['LOOK_AT_CARDS', 'REORDER_CARDS']);
    expect(play.atomicEffects[0].parsedAction).toMatchObject({
      type: 'PLAY_CARD',
      selector: { zones: ['TRASH'], names: [{ kind: 'NAME_EXACT', value: 'Ice Oni' }] },
    });
  });

  it('maps negation, stat copy, and set-power permutations', () => {
    const negate = parseCardEffect_V2(
      'OP16-115',
      '[Main] Negate the effect of up to 1 of your opponent\'s Leader or Character cards during this turn.',
    );
    const copyPower = parseCardEffect_V2(
      'EB01-061',
      '[Activate: Main] This Character\'s base power becomes the same as the selected Character\'s power during this turn.',
    );
    const setPower = parseCardEffect_V2(
      'EB04-010',
      '[Main] Set the power of up to 1 of your opponent\'s Characters to 0 during this turn.',
    );

    expect(negate.atomicEffects[0].parsedAction).toMatchObject({ type: 'INVALIDATE_EFFECTS' });
    expect(copyPower.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      operation: 'COPY',
      propertyLayer: 'BASE_VALUE',
      value: {
        kind: 'PROPERTY_VALUE',
        selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'] },
        property: 'POWER',
      },
    });
    expect(setPower.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      operation: 'SET',
      value: { kind: 'NUMBER', value: 0 },
    });
  });

  it('maps bracketed On Play effect negation to effect-scope filters instead of card targets', () => {
    const staticNegation = parseCardEffect_V2('OP09-081', 'Your [On Play] effects are negated.');
    const activatedNegation = parseCardEffect_V2(
      'OP09-081',
      "[Activate: Main] You may trash 1 card from your hand: Your opponent's [On Play] effects are negated until the end of your opponent's next turn.",
    );

    expect(staticNegation.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'INVALIDATE_EFFECTS',
        selector: { subject: 'EFFECT', controller: 'PLAYER', quantity: { kind: 'ALL' } },
        effectFilter: { kind: 'MATCHING_EFFECT', timing: 'ON_PLAY', rawText: '[On Play]' },
        duration: { kind: 'WHILE_SOURCE_VALID' },
      },
    });
    expect(activatedNegation.effects[0].activationCost?.payments[0]).toMatchObject({
      type: 'TRASH_CARD_COST',
      selector: { zones: ['HAND'] },
    });
    expect(activatedNegation.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'INVALIDATE_EFFECTS',
        selector: { subject: 'EFFECT', controller: 'OPPONENT', quantity: { kind: 'ALL' } },
        effectFilter: { kind: 'MATCHING_EFFECT', timing: 'ON_PLAY', rawText: '[On Play]' },
        duration: { kind: 'UNTIL_END_OF_NEXT_TURN', player: 'OPPONENT' },
      },
    });
  });

  it('maps event activation and own-effect life prevention permutations', () => {
    const activate = parseCardEffect_V2(
      'OP15-046',
      '[On Play] If your Leader has the {Dressrosa} type, activate up to 1 {Dressrosa} type Event from your hand.',
    );
    const prevent = parseCardEffect_V2(
      'OP02-004',
      '[On Play] You cannot add Life cards to your hand using your own effects during this turn.',
    );

    expect(activate.atomicEffects[0].parsedAction).toMatchObject({
      type: 'ACTIVATE_EVENT',
      selector: { zones: ['HAND'], cardCategories: ['EVENT'], types: { values: ['Dressrosa'] } },
    });
    expect(prevent.atomicEffects[0].parsedAction).toMatchObject({
      type: 'PREVENT_ZONE_CHANGE',
      action: 'ADD_LIFE_TO_HAND_BY_OWN_EFFECT',
    });
  });

  it('preserves exact select counts and multi-type selector text', () => {
    const parsed = parseCardEffect_V2(
      'OP14-001',
      '[Activate: Main] Select 2 of your {Supernovas} or {Heart Pirates} type Characters. Swap the base power of the selected Characters with each other during this turn.',
    );

    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'SELECT',
      selector: {
        quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 2 } },
        types: { kind: 'HAS_ANY_TYPE' },
      },
    });
    expect((parsed.atomicEffects[0].parsedAction as Extract<NonNullable<typeof parsed.atomicEffects[0]['parsedAction']>, { type: 'SELECT' }>).selector.types?.values)
      .toEqual(expect.arrayContaining(['Supernovas', 'Heart Pirates']));
    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({
      type: 'SWAP_POWER',
      selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'] },
      propertyLayer: 'BASE_VALUE',
    });
  });

  it('keeps DON ramp and DON rest as DON actions instead of card active/rest actions', () => {
    const ramp = parseCardEffect_V2('OP05-119', '[Activate: Main] Add up to 1 DON!! card from your DON!! deck and set it as active.');
    const delayed = parseCardEffect_V2('PRB02-005', '[On Play] Your opponent rests 1 of their active DON!! cards at the start of their next Main Phase.');

    expect(ramp.atomicEffects[0].parsedAction).toMatchObject({
      type: 'ADD_DON_FROM_DON_DECK',
      state: 'ACTIVE',
    });
    expect(delayed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'CREATE_DELAYED_EFFECT',
      effect: { resolution: { kind: 'ACTION', action: { type: 'REST_DON' } } },
    });
  });

  it('gates activated-event payoff effects by current-turn Event base cost history', () => {
    const parsed = parseCardEffect_V2(
      'OP15-002',
      '[Activate: Main] [Once Per Turn] If you have activated an Event with a base cost of 3 or more during this turn, draw 1 card.',
    );

    expect(parsed.effects[0]).toMatchObject({
      category: 'ACTIVATE',
      timing: { kind: 'STANDARD_TIMING', timing: 'ACTIVATE_MAIN' },
      conditions: {
        kind: 'PREDICATE',
        left: {
          kind: 'EVENT_ACTIVATION_COUNT',
          player: 'PLAYER',
          during: 'THIS_TURN',
          eventBaseCost: {
            comparison: 'AT_LEAST',
            value: { kind: 'NUMBER', value: 3 },
          },
        },
        operator: 'GREATER_OR_EQUAL',
        right: { kind: 'NUMBER', value: 1 },
      },
      resolution: { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
    });
  });

  it('gates OP15-058 style turn-count DON ramp and keeps active/rested DON actions separate', () => {
    const parsed = parseCardEffect_V2(
      'OP15-058',
      '[Activate: Main] [Once Per Turn] If it is your second turn or later, add up to 1 DON!! card from your DON!! deck and set it as active, and add up to 4 additional DON!! cards and rest them. Then, give up to 4 rested DON!! cards to 1 of your Characters.',
    );

    expect(parsed.effects[0]).toMatchObject({
      conditions: {
        kind: 'PREDICATE',
        left: { kind: 'SELF_TURN_COUNT', player: 'PLAYER' },
        operator: 'GREATER_OR_EQUAL',
        right: { kind: 'NUMBER', value: 2 },
      },
    });
    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual([
      'ADD_DON_FROM_DON_DECK',
      'ADD_DON_FROM_DON_DECK',
      'GIVE_DON',
    ]);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'ADD_DON_FROM_DON_DECK', count: { value: 1 }, state: 'ACTIVE' } },
        { kind: 'ACTION', action: { type: 'ADD_DON_FROM_DON_DECK', count: { value: 4 }, state: 'RESTED' } },
        {
          kind: 'ACTION',
          action: {
            type: 'GIVE_DON',
            donSelector: { states: ['RESTED'], quantity: { kind: 'UP_TO', value: { value: 4 } } },
            target: { zones: ['CHARACTER_AREA'], quantity: { kind: 'EXACTLY', value: { value: 1 } } },
          },
        },
      ],
    });
  });

  it('maps replacement-to-life and all-except-this selectors explicitly', () => {
    const replacement = parseCardEffect_V2(
      'OP11-101',
      '[Once Per Turn] If your {Supernovas} type Character other than [Capone"Gang"Bege] would be removed from the field by your opponent\'s effect, you may add it to the top of your Life cards face-down instead.',
    );
    const allExceptThis = parseCardEffect_V2(
      'OP05-119',
      '[On Play] DON!! -10: Place all of your Characters except this Character at the bottom of your deck in any order.',
    );

    expect(replacement.atomicEffects[0].parsedAction).toMatchObject({
      type: 'CREATE_REPLACEMENT_EFFECT',
      effect: { resolution: { kind: 'ACTION', action: { type: 'ADD_CARD_TO_LIFE' } } },
    });
    expect(allExceptThis.atomicEffects[1].parsedAction).toMatchObject({
      type: 'MOVE_CARD',
      selector: { controller: 'PLAYER', zones: ['CHARACTER_AREA'], relations: ['EXCLUDE_THIS_CARD'] },
    });
  });

  it('maps KO trash-instead clauses as replacement effects', () => {
    const battleReplacement = parseCardEffect_V2(
      'EB02-030',
      "[Counter] If any of your Characters would be K.O.'d in battle during this turn, you may trash 1 card from your hand instead.",
    );
    const genericReplacement = parseCardEffect_V2(
      'EB03-001',
      "[Once Per Turn] If your Character with a base cost of 4 or more would be K.O.'d, you may trash 1 card from your hand instead.",
    );

    expect(battleReplacement.atomicEffects[0].parsedAction).toMatchObject({
      type: 'CREATE_REPLACEMENT_EFFECT',
      effect: {
        optionality: 'OPTIONAL',
        timing: {
          kind: 'CUSTOM_EVENT',
          eventType: 'CARD_WOULD_BE_KO',
          conditions: { left: { kind: 'KO_CAUSE' }, right: { kind: 'STRING', value: 'BATTLE' } },
        },
        resolution: { kind: 'ACTION', action: { type: 'TRASH_CARD' } },
      },
    });
    expect(genericReplacement.atomicEffects[0].parsedAction).toMatchObject({
      type: 'CREATE_REPLACEMENT_EFFECT',
      effect: {
        optionality: 'OPTIONAL',
        timing: { kind: 'CUSTOM_EVENT', eventType: 'CARD_WOULD_BE_KO' },
        resolution: { kind: 'ACTION', action: { type: 'TRASH_CARD' } },
      },
    });
  });

  it('maps removed-from-field instead clauses as replacement effects', () => {
    const leaderPower = parseCardEffect_V2(
      'OP14-016',
      "[Opponent's Turn] [Once Per Turn] If your {Supernovas} type Character would be removed from the field by your opponent's effect, you may give your Leader -2000 power during this turn instead.",
    );
    const restCards = parseCardEffect_V2(
      'OP15-035',
      "If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may rest 2 of your cards instead.",
    );
    const returnDon = parseCardEffect_V2(
      'OP15-069',
      "If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may return 1 DON!! card from your field to your DON!! deck instead.",
    );
    const trashThis = parseCardEffect_V2(
      'OP15-094',
      "If your {Straw Hat Crew} type Character other than this Character would be removed from the field by your opponent's effect, you may trash this Character instead.[Blocker]",
    );
    const lifeToHand = parseCardEffect_V2(
      'OP15-105',
      "If your Character with 7000 base power or less would be removed from the field by your opponent's effect, you may add 1 card from the top of your Life cards to your hand instead.",
    );
    const trashCharacter = parseCardEffect_V2(
      'OP15-003',
      "If this Character would be K.O.'d, you may trash 1 Character card with a power of 6000 or less from your hand instead.",
    );
    const trashEvent = parseCardEffect_V2(
      'OP15-014',
      "If this Character would be K.O.'d, you may trash 1 Event from your hand instead.",
    );

    for (const parsed of [leaderPower, restCards, returnDon, trashThis, lifeToHand]) {
      expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
        type: 'CREATE_REPLACEMENT_EFFECT',
        effect: {
          optionality: 'OPTIONAL',
          timing: { kind: 'CUSTOM_EVENT', eventType: 'CARD_WOULD_MOVE', fromZone: 'CHARACTER_AREA' },
        },
      });
    }
    for (const parsed of [trashCharacter, trashEvent]) {
      expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
        type: 'CREATE_REPLACEMENT_EFFECT',
        effect: {
          optionality: 'OPTIONAL',
          timing: { kind: 'CUSTOM_EVENT', eventType: 'CARD_WOULD_BE_KO' },
          resolution: { kind: 'ACTION', action: { type: 'TRASH_CARD' } },
        },
      });
    }
    expect(leaderPower.atomicEffects[0].parsedAction).toMatchObject({
      effect: { resolution: { kind: 'ACTION', action: { type: 'MODIFY_POWER' } } },
    });
    expect(restCards.atomicEffects[0].parsedAction).toMatchObject({
      effect: { resolution: { kind: 'ACTION', action: { type: 'REST_CARD' } } },
    });
    expect(returnDon.atomicEffects[0].parsedAction).toMatchObject({
      effect: { resolution: { kind: 'ACTION', action: { type: 'RETURN_DON_TO_DON_DECK' } } },
    });
    expect(trashThis.atomicEffects[0].parsedAction).toMatchObject({
      effect: { resolution: { kind: 'ACTION', action: { type: 'TRASH_CARD' } } },
    });
    expect(lifeToHand.atomicEffects[0].parsedAction).toMatchObject({
      effect: { resolution: { kind: 'ACTION', action: { type: 'MOVE_CARD' } } },
    });
  });

  it('maps rested-by-effect instead clauses as rest replacement effects', () => {
    const parsed = parseCardEffect_V2(
      'PRB02-006',
      "[Opponent's Turn] If this Character would be rested by your opponent's Character's effect, you may rest 1 of your other Characters instead.",
    );

    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'CREATE_REPLACEMENT_EFFECT',
      effect: {
        optionality: 'OPTIONAL',
        timing: {
          kind: 'CUSTOM_EVENT',
          eventType: 'CARD_WOULD_REST',
          subject: { relations: ['THIS_CARD'] },
          sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT' },
          conditions: { left: { kind: 'REST_CAUSE' }, right: { kind: 'STRING', value: 'EFFECT' } },
        },
        resolution: { kind: 'ACTION', action: { type: 'REST_CARD' } },
      },
    });
  });

  it('maps rested-by-opponent-effect activation text as custom timing', () => {
    const parsed = parseCardEffect_V2(
      'PRB02-009',
      "This effect can be activated when this Character is rested by your opponent's effect. You may trash this Character and draw 2 cards.",
    );

    expect(parsed.effects[0]).toMatchObject({
      category: 'AUTO',
      timing: {
        kind: 'CUSTOM_EVENT',
        eventType: 'CARD_RESTED',
        subject: { relations: ['THIS_CARD'] },
        sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT' },
        conditions: { left: { kind: 'REST_CAUSE' }, right: { kind: 'STRING', value: 'EFFECT' } },
      },
      resolution: {
        kind: 'SEQUENCE',
        nodes: [
          { kind: 'ACTION', action: { type: 'TRASH_CARD' } },
          { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
        ],
      },
    });
  });

  it('maps mixed K.O. or removed replacement clauses with OR timing', () => {
    const trashAndDraw = parseCardEffect_V2(
      'OP08-045',
      "If this Character would be removed from the field by your opponent's effect or K.O.'d, trash this Character and draw 1 card instead.",
    );
    const handTrash = parseCardEffect_V2(
      'OP13-046',
      '[Double Attack][Once Per Turn] If this Character would be K.O.\'d or would be removed from the field by your opponent\'s effect, you may trash 1 card with a type including "Whitebeard Pirates" from your hand instead.',
    );

    for (const parsed of [trashAndDraw, handTrash]) {
      const replacementAtom = parsed.atomicEffects.find((atom) => atom.parsedAction?.type === 'CREATE_REPLACEMENT_EFFECT');
      expect(replacementAtom?.parsedAction).toMatchObject({
        type: 'CREATE_REPLACEMENT_EFFECT',
      });
      const timing = replacementAtom?.parsedAction?.type === 'CREATE_REPLACEMENT_EFFECT'
        ? replacementAtom.parsedAction.effect.timing
        : undefined;
      expect(timing?.kind).toBe('OR');
      if (timing?.kind !== 'OR') throw new Error('expected OR timing');
      expect(timing.timings).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'CUSTOM_EVENT', eventType: 'CARD_WOULD_BE_KO' }),
        expect.objectContaining({ kind: 'CUSTOM_EVENT', eventType: 'CARD_WOULD_MOVE' }),
      ]));
      expect(timing.timings.find((entry) => entry.kind === 'CUSTOM_EVENT' && entry.eventType === 'CARD_WOULD_MOVE')).toMatchObject({
        sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT' },
      });
    }
    expect(trashAndDraw.atomicEffects[0].parsedAction).toMatchObject({
      effect: {
        resolution: {
          kind: 'SEQUENCE',
          nodes: [
            { kind: 'ACTION', action: { type: 'TRASH_CARD' } },
            { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
          ],
        },
      },
    });
    const handTrashReplacement = handTrash.atomicEffects.find((atom) => atom.parsedAction?.type === 'CREATE_REPLACEMENT_EFFECT');
    expect(handTrashReplacement?.parsedAction).toMatchObject({
      effect: { resolution: { kind: 'ACTION', action: { type: 'TRASH_CARD', selector: { types: { values: ['Whitebeard Pirates'] } } } } },
    });
  });

  it('maps instead-of-being-KO stat changes as replacement effects', () => {
    const parsed = parseCardEffect_V2(
      'OP05-001',
      "[DON!! x1] [Opponent's Turn] [Once Per Turn] If your Character with 5000 power or more would be K.O.'d, you may give that Character -1000 power during this turn instead of that Character being K.O.'d.",
    );

    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'CREATE_REPLACEMENT_EFFECT',
      effect: {
        timing: { kind: 'CUSTOM_EVENT', eventType: 'CARD_WOULD_BE_KO' },
        resolution: {
          kind: 'ACTION',
          action: {
            type: 'MODIFY_POWER',
            selector: { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'] },
            operation: 'SUBTRACT',
            value: { kind: 'NUMBER', value: 1000 },
          },
        },
      },
    });
  });

  it('maps instead-of-drawing text as a conditional alternate resolution', () => {
    const parsed = parseCardEffect_V2(
      'OP04-040',
      '[DON!! x1] [When Attacking] If you have a total of 4 or less cards in your Life area and hand, draw 1 card. If you have a Character with a cost of 8 or more, you may add up to 1 card from the top of your deck to the top of your Life cards instead of drawing 1 card.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'IF',
      condition: { operator: 'LESS_OR_EQUAL', right: { kind: 'NUMBER', value: 4 } },
      then: {
        kind: 'IF',
        condition: { operator: 'GREATER_OR_EQUAL', right: { kind: 'NUMBER', value: 1 } },
        then: {
          kind: 'CHOOSE',
          options: [
            { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
            { kind: 'ACTION', action: { type: 'ADD_CARD_TO_LIFE' } },
          ],
        },
        else: { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
      },
    });
  });

  it('maps instead-of-lower-cost-target text as a conditional target upgrade', () => {
    const parsed = parseCardEffect_V2(
      'OP04-094',
      "[Main] Choose up to 1 of your opponent's Characters with a cost of 4 or less and K.O. it. If you have 15 or more cards in your trash, choose up to 1 of your opponent's Characters with a cost of 6 or less instead of a Character with a cost of 4 or less.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'IF',
      condition: { operator: 'GREATER_OR_EQUAL', right: { kind: 'NUMBER', value: 15 } },
      then: { kind: 'ACTION', action: { type: 'KO_CARD', selector: { cost: { comparison: 'AT_MOST', value: { value: 6 } } } } },
      else: { kind: 'ACTION', action: { type: 'KO_CARD', selector: { cost: { comparison: 'AT_MOST', value: { value: 4 } } } } },
    });
  });

  it('maps if-you-do-not-have name gates as absence conditions', () => {
    const parsed = parseCardEffect_V2(
      'OP01-044',
      "[On Play] If you don't have [Penguin], play up to 1 [Penguin] from your hand.",
    );

    expect(parsed.effects[0]).toMatchObject({
      conditions: {
        kind: 'PREDICATE',
        operator: 'EQUAL',
        left: { kind: 'COUNT', selector: { names: [{ kind: 'NAME_EXACT', value: 'Penguin' }] } },
        right: { kind: 'NUMBER', value: 0 },
      },
      resolution: { kind: 'ACTION', action: { type: 'PLAY_CARD', selector: { names: [{ kind: 'NAME_EXACT', value: 'Penguin' }] } } },
    });
  });

  it('splits action and conditional play clauses joined by and-if', () => {
    const parsed = parseCardEffect_V2(
      'OP03-027',
      "[On Play] If your Leader has the {East Blue} type, rest up to 1 of your opponent's Characters with a cost of 2 or less and, if you don't have [Buchi], play up to 1 [Buchi] from your hand.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'REST_CARD', selector: { controller: 'OPPONENT', cost: { comparison: 'AT_MOST', value: { value: 2 } } } } },
        {
          kind: 'IF',
          condition: { operator: 'EQUAL', right: { kind: 'NUMBER', value: 0 } },
          then: { kind: 'ACTION', action: { type: 'PLAY_CARD', selector: { names: [{ kind: 'NAME_EXACT', value: 'Buchi' }] } } },
        },
      ],
    });
    expect(parsed.atomicEffects[0].parsedAction).toMatchObject({
      type: 'REST_CARD',
    });
    expect(parsed.atomicEffects[0].parsedAction?.type === 'REST_CARD'
      ? parsed.atomicEffects[0].parsedAction.selector
      : {}).not.toHaveProperty('names');
  });

  it('maps for-every count scaling into dynamic power values', () => {
    const hand = parseCardEffect_V2(
      'OP01-072',
      '[DON!! x1] [Your Turn] This Character gains +1000 power for every card in your hand.',
    );
    const trashEveryFive = parseCardEffect_V2(
      'OP06-085',
      '[DON!! x2] [Your Turn] This Character gains +1000 power for every 5 cards in your trash.',
    );
    const eventsEveryTwo = parseCardEffect_V2(
      'OP01-083',
      '[DON!! x1] [Your Turn] If your Leader has the {Baroque Works} type, this Character gains +1000 power for every 2 Events in your trash.',
    );

    expect(hand.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      value: { kind: 'MULTIPLY', values: [{ kind: 'NUMBER', value: 1000 }, { kind: 'COUNT', selector: { zones: ['HAND'] } }] },
    });
    expect(trashEveryFive.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      value: {
        kind: 'MULTIPLY',
        values: [
          { kind: 'NUMBER', value: 1000 },
          { kind: 'FLOOR_DIVIDE', left: { kind: 'COUNT', selector: { zones: ['TRASH'] } }, right: { kind: 'NUMBER', value: 5 } },
        ],
      },
    });
    expect(eventsEveryTwo.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      value: {
        kind: 'MULTIPLY',
        values: [
          { kind: 'NUMBER', value: 1000 },
          { kind: 'FLOOR_DIVIDE', left: { kind: 'COUNT', selector: { zones: ['TRASH'], cardCategories: ['EVENT'] } }, right: { kind: 'NUMBER', value: 2 } },
        ],
      },
    });
  });

  it('maps this-way scaling into previous-result power values', () => {
    const parsed = parseCardEffect_V2(
      'OP13-001',
      '[DON!! x1] [On Your Opponent\'s Attack] If you have 5 or less active DON!! cards, you may rest any number of your DON!! cards. For every DON!! card rested this way, this Leader or up to 1 of your {Straw Hat Crew} type Characters gains +2000 power during this battle.',
    );

    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      value: { kind: 'MULTIPLY', values: [{ kind: 'NUMBER', value: 2000 }, { kind: 'PREVIOUS_RESULT', resultId: 'rested-don-count' }] },
    });
  });

  it('maps attached-DON and distinct-name scaling into dynamic stat values', () => {
    const attachedDon = parseCardEffect_V2(
      'OP15-008',
      "[Activate: Main] [Once Per Turn] If this Character was played on this turn, give all of your opponent's Characters -1000 power during this turn for every DON!! card given to that Character.",
    );
    const distinctNames = parseCardEffect_V2(
      'OP16-034',
      '[DON!! x1] [Your Turn] This Character gains +1000 power for each of your Characters with a different card name.',
    );

    expect(attachedDon.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      selector: { controller: 'OPPONENT', zones: ['CHARACTER_AREA'], quantity: { kind: 'ALL' } },
      value: {
        kind: 'MULTIPLY',
        values: [
          { kind: 'NUMBER', value: 1000 },
          { kind: 'COUNT', selector: { subject: 'DON', zones: ['ATTACHED_DON'], relations: ['ATTACHED_TO_THIS_CARD'] } },
        ],
      },
    });
    expect(distinctNames.atomicEffects[0].parsedAction).toMatchObject({
      type: 'MODIFY_POWER',
      value: {
        kind: 'MULTIPLY',
        values: [
          { kind: 'NUMBER', value: 1000 },
          { kind: 'COUNT', selector: { zones: ['CHARACTER_AREA'], distinctBy: 'CARD_NAME' } },
        ],
      },
    });
  });

  it('maps for-every cost scaling into dynamic cost values', () => {
    const parsed = parseCardEffect_V2(
      'ST27-004',
      'If your Leader has the {Blackbeard Pirates} type, this Character gains [Blocker] and +1 cost for every 4 cards in your trash.',
    );

    expect(parsed.atomicEffects[1].parsedAction).toMatchObject({
      type: 'MODIFY_COST',
      value: {
        kind: 'MULTIPLY',
        values: [
          { kind: 'NUMBER', value: 1 },
          { kind: 'FLOOR_DIVIDE', left: { kind: 'COUNT', selector: { zones: ['TRASH'] } }, right: { kind: 'NUMBER', value: 4 } },
        ],
      },
    });
  });

  it('maps choose-one clauses as modal resolution nodes', () => {
    const eventChoice = parseCardEffect_V2(
      'EB02-051',
      "[Main] Choose one:\u2022 K.O. up to 1 of your opponent's Characters with a cost of 2 or less.\u2022 Give up to 1 of your opponent's Characters -4 cost during this turn.",
    );
    const paidChoice = parseCardEffect_V2(
      'EB02-045',
      '[Blocker] [On Play] You may place 2 cards from your trash at the bottom of your deck in any order: Choose one:\u2022 Draw 1 card.\u2022 If your opponent has 5 or more cards in their hand, your opponent trashes 1 card from their hand.',
    );
    const gatedChoice = parseCardEffect_V2(
      'ST11-003',
      "[Main] If your Leader is [Uta], choose one:\u2022 Rest up to 1 of your opponent's Characters with a cost of 5 or less.\u2022 K.O. up to 1 of your opponent's rested Characters with a cost of 5 or less.",
    );
    const lifeChoice = parseCardEffect_V2(
      'EB01-052',
      "[On Play] Choose one:\u2022 Look at all of your opponent's Life cards and place them back in their Life area in any order.\u2022 Turn all of your Life cards face-down.",
    );

    expect(eventChoice.effects[0].resolution).toMatchObject({
      kind: 'CHOOSE',
      chooser: 'PLAYER',
      minimumChoices: 1,
      maximumChoices: 1,
      options: [
        { kind: 'ACTION', action: { type: 'KO_CARD' } },
        { kind: 'ACTION', action: { type: 'MODIFY_COST' } },
      ],
    });
    expect(paidChoice.effects[0].conditions).toBeUndefined();
    expect(paidChoice.effects[0].activationCost?.payments[0]).toMatchObject({
      type: 'RETURN_CARD_TO_DECK_COST',
      selector: { zones: ['TRASH'], quantity: { kind: 'EXACTLY', value: { value: 2 } } },
      position: 'BOTTOM',
    });
    expect(paidChoice.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'GRANT_KEYWORD', keyword: 'BLOCKER' } },
        {
          kind: 'CHOOSE',
          options: [
            { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
            { kind: 'IF', condition: { kind: 'PREDICATE' }, then: { kind: 'ACTION', action: { type: 'TRASH_CARD' } } },
          ],
        },
      ],
    });
    expect(gatedChoice.effects[0].conditions).toMatchObject({
      kind: 'PREDICATE',
      left: { kind: 'COUNT', selector: { names: [{ kind: 'NAME_EXACT', value: 'Uta' }] } },
    });
    expect(gatedChoice.atomicEffects.map((atom) => atom.coverage)).toEqual(['coveredByParser', 'coveredByParser']);
    expect(lifeChoice.effects[0].resolution).toMatchObject({
      kind: 'CHOOSE',
      options: [
        { kind: 'SEQUENCE', nodes: [{ kind: 'ACTION', action: { type: 'LOOK_AT_LIFE' } }, { kind: 'ACTION', action: { type: 'REORDER_LIFE' } }] },
        { kind: 'ACTION', action: { type: 'TURN_LIFE_FACE_DOWN' } },
      ],
    });
  });

  it('preserves result-dependent and clause-local conditional chains', () => {
    const ifYouDo = parseCardEffect_V2(
      'OP15-020',
      "[Main] Your Leader gains +3000 power during this turn and give up to 1 of your opponent's Characters -8000 power until the end of your opponent's next End Phase. Then, you may trash 2 cards from your hand. If you do, K.O. up to 1 of your opponent's Characters with 0 power or less.",
    );
    const thatCard = parseCardEffect_V2(
      'OP14-044',
      '[Blocker] [On Play] Reveal 1 card from the top of your deck. If that card\'s type includes "Whitebeard Pirates", draw 2 cards and trash 1 card from your hand.',
    );
    const thenIf = parseCardEffect_V2(
      'OP14-077',
      "[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if your opponent has a Character with 6000 power or more, add up to 1 DON!! card from your DON!! deck and rest it.",
    );
    const selected = parseCardEffect_V2(
      'OP15-031',
      "[On Play] Select up to 1 of your opponent's rested Characters. If the chosen Character has a cost equal to the number of DON!! cards given to it, K.O. it.",
    );
    const thatCardBuff = parseCardEffect_V2(
      'OP14-078',
      "[Counter] DON!! -1: If your Leader has the {Donquixote Pirates} type, up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, that card gains an additional +2000 power during this turn.",
    );
    const opponentMayNot = parseCardEffect_V2(
      'OP15-059',
      "[On Your Opponent's Attack] You may rest this Character: Your opponent may return 1 of their active DON!! cards to their DON!! deck. If they do not, give up to 1 of your opponent's Leader or Character cards -2000 power during this turn.",
    );
    const revealedCost = parseCardEffect_V2(
      'OP15-065',
      '[On Play] Reveal 1 card from the top of your deck. If the revealed card has a cost of 2 or less, add up to 1 DON!! card from your DON!! deck and rest it.',
    );
    const typedPowerPresence = parseCardEffect_V2(
      'OP15-102',
      'If you have a {Sky Island} type Character with 7000 power or more, give this card in your hand -3 cost.',
    );

    expect(ifYouDo.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { zones: ['LEADER_AREA'] } } },
        { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { controller: 'OPPONENT' } } },
        { kind: 'ACTION', action: { type: 'TRASH_CARD' } },
        { kind: 'IF_ACTION_SUCCEEDED', then: { kind: 'ACTION', action: { type: 'KO_CARD' } } },
      ],
    });
    expect(thatCard.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'GRANT_KEYWORD' } },
        { kind: 'ACTION', action: { type: 'REVEAL_CARD' } },
        { kind: 'IF', condition: { kind: 'PREDICATE' }, then: { kind: 'SEQUENCE' } },
      ],
    });
    expect(thenIf.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'MODIFY_POWER' } },
        { kind: 'IF', condition: { kind: 'PREDICATE' }, then: { kind: 'ACTION', action: { type: 'ADD_DON_FROM_DON_DECK' } } },
      ],
    });
    expect(selected.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'SELECT' } },
        { kind: 'IF', condition: { kind: 'PREDICATE' }, then: { kind: 'ACTION', action: { type: 'KO_CARD', selector: { subject: 'ACTION_RESULT', relations: ['SELECTED_PREVIOUSLY'] } } } },
      ],
    });
    expect(thatCardBuff.effects[0].resolution).toMatchObject({
      kind: 'IF',
      then: {
        kind: 'SEQUENCE',
        nodes: [
          { kind: 'ACTION', action: { type: 'MODIFY_POWER' } },
          { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'] } } },
        ],
      },
    });
    expect(opponentMayNot.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        {
          kind: 'ACTION',
          action: {
            type: 'RETURN_DON_TO_DON_DECK',
            selector: { owner: 'OPPONENT', states: ['ACTIVE'], quantity: { kind: 'UP_TO', value: { value: 1 } }, chooser: 'OPPONENT' },
          },
        },
        { kind: 'IF_ACTION_SUCCEEDED', then: { kind: 'NO_OP' }, else: { kind: 'ACTION', action: { type: 'MODIFY_POWER' } } },
      ],
    });
    expect(revealedCost.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'REVEAL_CARD' } },
        {
          kind: 'IF',
          condition: {
            kind: 'PREDICATE',
            left: { kind: 'COUNT', selector: { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'], cost: { comparison: 'AT_MOST', value: { value: 2 } } } },
          },
          then: { kind: 'ACTION', action: { type: 'ADD_DON_FROM_DON_DECK', state: 'RESTED' } },
        },
      ],
    });
    expect(typedPowerPresence.effects[0].conditions).toMatchObject({
      kind: 'PREDICATE',
      left: {
        kind: 'COUNT',
        selector: {
          types: { kind: 'HAS_TYPE', values: ['Sky Island'] },
          power: { comparison: 'AT_LEAST', value: { value: 7000 } },
        },
      },
    });
  });

  it('preserves source and owner destination for opponent trash to owner deck moves', () => {
    const parsed = parseCardEffect_V2(
      'OP15-091',
      "[On Play] Place up to 1 card from your opponent's trash at the bottom of the owner's deck.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'MOVE_CARD',
        selector: { owner: 'OPPONENT', zones: ['TRASH'] },
        to: { zone: 'DECK', owner: 'CARD_OWNER', position: 'BOTTOM' },
      },
    });
  });

  it('rests opponent Characters with attached DON instead of resting DON cards', () => {
    const parsed = parseCardEffect_V2(
      'OP15-001',
      "[Activate: Main] [Once Per Turn] Rest up to 1 of your opponent's Characters that has 2 or more DON!! cards given.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          controller: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          relations: ['HAS_ATTACHED_DON_AT_LEAST_2'],
        },
      },
    });
  });

  it('rests opponent Characters with a single attached DON instead of resting DON cards', () => {
    const parsed = parseCardEffect_V2(
      'OP15-027',
      "[On Play] Rest up to 1 of your opponent's Characters with a DON!! card given.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'REST_CARD',
        selector: {
          subject: 'CARD',
          controller: 'OPPONENT',
          zones: ['CHARACTER_AREA'],
          relations: ['HAS_ATTACHED_DON_AT_LEAST_1'],
        },
      },
    });
  });

  it('targets both Leader and Character for DON attachment text', () => {
    const parsed = parseCardEffect_V2(
      'EB01-002',
      '[On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'GIVE_DON',
        target: {
          zones: ['LEADER_AREA', 'CHARACTER_AREA'],
          cardCategories: ['LEADER', 'CHARACTER'],
        },
      },
    });
  });

  it('targets this Leader or a Character for leader-specific DON attachment text', () => {
    const parsed = parseCardEffect_V2(
      'ST01-001',
      '[Activate: Main] [Once Per Turn] Give this Leader or 1 of your Characters up to 1 rested DON!! card.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'GIVE_DON',
        target: {
          zones: ['LEADER_AREA', 'CHARACTER_AREA'],
          cardCategories: ['LEADER', 'CHARACTER'],
        },
      },
    });
  });

  it('excludes this card from Leader or Character selector text', () => {
    const parsed = parseCardEffect_V2(
      'ST01-005',
      '[DON!! x1] [When Attacking] Up to 1 of your Leader or Character cards other than this card gains +1000 power during this turn.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'MODIFY_POWER',
        selector: {
          zones: ['LEADER_AREA', 'CHARACTER_AREA'],
          relations: ['EXCLUDE_THIS_CARD'],
        },
      },
    });
  });

  it('sets DON cards active with a DON action instead of a card action', () => {
    const parsed = parseCardEffect_V2(
      'OP01-034',
      '[DON!! x1] [When Attacking] Set up to 1 of your DON!! cards as active.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'SET_DON_ACTIVE',
        selector: {
          subject: 'DON',
          owner: 'PLAYER',
          zones: ['COST_AREA'],
        },
      },
    });
  });

  it('keeps Character and DON active clauses as separate actions', () => {
    const parsed = parseCardEffect_V2(
      'OP11-021',
      '[End of Your Turn] If you have 6 or less cards in your hand, set up to 1 of your {Fish-Man} or {Merfolk} type Characters and up to 1 of your DON!! cards as active.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'SET_CARD_ACTIVE' } },
        { kind: 'ACTION', action: { type: 'SET_DON_ACTIVE', selector: { subject: 'DON', owner: 'PLAYER' } } },
      ],
    });
  });

  it('maps opponent DON deck add-and-active text to opponent DON action', () => {
    const parsed = parseCardEffect_V2(
      'OP12-075',
      "[On Play] K.O. up to 1 of your opponent's Characters with a cost of 4 or less. Then, your opponent may add 1 DON!! card from their DON!! deck and set it as active.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'KO_CARD' } },
        { kind: 'ACTION', action: { type: 'ADD_DON_FROM_DON_DECK', player: 'OPPONENT', state: 'ACTIVE' } },
      ],
    });
  });

  it('represents this Character or DON active text as a player choice', () => {
    const parsed = parseCardEffect_V2(
      'OP13-035',
      '[On Play] Set this Character or up to 1 of your DON!! cards as active.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'PLAYER_CHOOSES',
        options: [
          { kind: 'ACTION', action: { type: 'SET_CARD_ACTIVE' } },
          { kind: 'ACTION', action: { type: 'SET_DON_ACTIVE' } },
        ],
      },
    });
  });

  it('keeps comma-and draw clauses after a power buff', () => {
    const parsed = parseCardEffect_V2(
      'OP06-059',
      '[Counter] Up to 1 of your Leader or Character cards gains +1000 power during this turn, and draw 1 card.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] } } },
        { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
      ],
    });
  });

  it('keeps select before that-card follow-up buffs', () => {
    const parsed = parseCardEffect_V2(
      'OP07-057',
      '[Main] Select up to 1 of your {The Seven Warlords of the Sea} type Leader or Character cards and that card gains +2000 power during this turn.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'SELECT', selector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] } } },
        { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'] } } },
      ],
    });
  });

  it('keeps negate before that-card power modifier clauses', () => {
    const parsed = parseCardEffect_V2(
      'OP09-097',
      "[Counter] Negate the effect of up to 1 of your opponent's Leader or Character cards and give that card -4000 power during this turn.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'INVALIDATE_EFFECTS', selector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] } } },
        { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { subject: 'ACTION_RESULT', relations: ['PREVIOUS_ACTION_TARGET'] } } },
      ],
    });
    if (parsed.effects[0].resolution.kind === 'SEQUENCE') {
      expect(parsed.effects[0].resolution.nodes[0]).toMatchObject({
        kind: 'ACTION',
        action: { type: 'INVALIDATE_EFFECTS', duration: { kind: 'THIS_TURN' } },
      });
    }
  });

  it('keeps opponent Leader targets in negate-effect permutations', () => {
    const leaderOnly = parseCardEffect_V2(
      'OP09-093',
      "[Activate: Main] If your Leader has the {Blackbeard Pirates} type, negate the effect of up to 1 of your opponent's Leader during this turn. Then, negate the effect of up to 1 of your opponent's Characters and that Character cannot attack until the end of your opponent's next turn.",
    );
    const eachLeaderAndCharacter = parseCardEffect_V2(
      'OP10-098',
      "[Trigger] Negate the effect of up to 1 of each of your opponent's Leader and Character cards during this turn.",
    );

    expect(leaderOnly.atomicEffects[0].parsedAction).toMatchObject({
      type: 'INVALIDATE_EFFECTS',
      selector: { controller: 'OPPONENT', zones: ['LEADER_AREA'], cardCategories: ['LEADER'] },
      duration: { kind: 'THIS_TURN' },
    });
    expect(eachLeaderAndCharacter.atomicEffects[0].parsedAction).toMatchObject({
      type: 'INVALIDATE_EFFECTS',
      selector: {
        controller: 'OPPONENT',
        zones: ['LEADER_AREA', 'CHARACTER_AREA'],
        quantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 2 } },
        perCardCategoryQuantity: { kind: 'UP_TO', value: { kind: 'NUMBER', value: 1 } },
        relations: ['EACH_CARD_CATEGORY'],
      },
      duration: { kind: 'THIS_TURN' },
    });
  });

  it('splits hyphenated choose-one options into separate option nodes', () => {
    const parsed = parseCardEffect_V2(
      'OP03-028',
      "[On Play] Choose one:- Set up to 1 of your {East Blue} type Leader or Character cards with a cost of 6 or less as active.- Rest this Character and up to 1 of your opponent's Characters.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'CHOOSE',
      options: [
        { kind: 'ACTION', action: { type: 'SET_CARD_ACTIVE', selector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] } } },
        { kind: 'ACTION', action: { type: 'REST_CARD' } },
      ],
    });
  });

  it('splits condition-tag effects and preserves the first Leader or Character modifier', () => {
    const parsed = parseCardEffect_V2(
      'OP13-002',
      "[On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: Give up to 1 of your opponent's Leader or Character cards -2000 power during this battle.[DON!! x1] [Once Per Turn] When you take damage or your Character with 6000 base power or more is K.O.'d, draw 1 card.",
    );

    expect(parsed.effects).toHaveLength(2);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: { type: 'MODIFY_POWER', selector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] } },
    });
    expect(parsed.effects[1]).toMatchObject({
      category: 'AUTO',
      resolution: { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
    });
  });

  it('gates cannot-be-KO text by opponent Leader or Character base power', () => {
    const parsed = parseCardEffect_V2(
      'OP06-012',
      "If your opponent has a Leader or Character with a base power of 6000 or more, this Character cannot be K.O.'d in battle.",
    );

    expect(parsed.effects[0]).toMatchObject({
      conditions: {
        kind: 'PREDICATE',
        left: { kind: 'COUNT', selector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] } },
      },
      resolution: {
        kind: 'ACTION',
        action: { type: 'PREVENT_ACTION', action: 'KO_CARD' },
      },
    });
  });

  it('sets base power with explicit set-the-base-power wording', () => {
    const parsed = parseCardEffect_V2(
      'OP13-084',
      '[Your Turn] If you have 10 or more cards in your trash, set the base power of all of your {Five Elders} type Characters to 7000.',
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'MODIFY_POWER',
        propertyLayer: 'BASE_VALUE',
        operation: 'SET',
        selector: { zones: ['CHARACTER_AREA'], types: { values: ['Five Elders'] } },
      },
    });
  });

  it('keeps cannot-be-rested text before keyword grants', () => {
    const parsed = parseCardEffect_V2(
      'OP15-024',
      "[Opponent's Turn] This Character cannot be rested by your opponent's Leader and Character effects and gains [Blocker].",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'PREVENT_ACTION', action: 'REST_CARD' } },
        { kind: 'ACTION', action: { type: 'GRANT_KEYWORD', keyword: 'BLOCKER' } },
      ],
    });
    expect(parsed.effects[0].resolution.kind).toBe('SEQUENCE');
    if (parsed.effects[0].resolution.kind === 'SEQUENCE') {
      expect(parsed.effects[0].resolution.nodes[0]).toMatchObject({
        kind: 'ACTION',
        action: { type: 'PREVENT_ACTION', sourceSelector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] } },
      });
    }
  });

  it('tracks generic opponent effect sources for prevention text', () => {
    const parsed = parseCardEffect_V2(
      'OP13-084',
      "If you have 7 or more cards in your trash, this Character cannot be removed from the field by your opponent's effects.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: {
        type: 'PREVENT_ZONE_CHANGE',
        sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT' },
      },
    });
  });

  it('splits cannot-be-KO-or-rested prevention into separate source-filtered atoms', () => {
    const parsed = parseCardEffect_V2(
      'OP11-046',
      'If you only have Characters with a type including "GERMA", this Character cannot be K.O.\'d or rested by your opponent\'s effects.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['PREVENT_ACTION', 'PREVENT_ACTION']);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'PREVENT_ACTION', action: 'KO_CARD', sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT' } } },
        { kind: 'ACTION', action: { type: 'PREVENT_ACTION', action: 'REST_CARD', sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT' } } },
      ],
    });
  });

  it('splits cannot-be-removed plus power gain into separate atoms', () => {
    const parsed = parseCardEffect_V2(
      'OP15-060',
      "If you have 6 or less DON!! cards on your field, this Character cannot be removed from the field by your opponent's effects and gains +2000 power.",
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['PREVENT_ZONE_CHANGE', 'MODIFY_POWER']);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'PREVENT_ZONE_CHANGE', sourceSelector: { subject: 'EFFECT', controller: 'OPPONENT' } } },
        { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { relations: ['THIS_CARD'] } } },
      ],
    });
  });

  it('keeps appended keyword tags as separate effects', () => {
    const parsed = parseCardEffect_V2(
      'OP06-067',
      'If the number of DON!! cards on your field is equal to or less than the number on your opponent\'s field, this Character gains +1000 power.[Blocker] (After your opponent declares an attack, you may rest this card to make it the new target of the attack.)',
    );

    expect(parsed.effects).toHaveLength(2);
    expect(parsed.effects[1].resolution).toMatchObject({
      kind: 'ACTION',
      action: { type: 'GRANT_KEYWORD', keyword: 'BLOCKER' },
    });
  });

  it('splits keyword plus stat modifiers into separate atoms', () => {
    const parsed = parseCardEffect_V2(
      'OP04-071',
      "[On Your Opponent's Attack] This Character gains [Blocker] and +1000 power during this battle.",
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['GRANT_KEYWORD', 'MODIFY_POWER']);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'GRANT_KEYWORD', keyword: 'BLOCKER' } },
        { kind: 'ACTION', action: { type: 'MODIFY_POWER' } },
      ],
    });
  });

  it('splits draw plus targeted keyword grants', () => {
    const parsed = parseCardEffect_V2(
      'OP04-001',
      '[Activate: Main] Draw 1 card and up to 1 of your Characters gains [Rush] during this turn.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['DRAW_CARD', 'GRANT_KEYWORD']);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
        { kind: 'ACTION', action: { type: 'GRANT_KEYWORD', selector: { zones: ['CHARACTER_AREA'] } } },
      ],
    });
  });

  it('splits power reduction plus this-character keyword grants', () => {
    const parsed = parseCardEffect_V2(
      'OP06-061',
      "[On Play] If the number of DON!! cards on your field is equal to or less than the number on your opponent's field, give up to 1 of your opponent's Characters -2000 power during this turn and this Character gains [Rush].",
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['MODIFY_POWER', 'GRANT_KEYWORD']);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'MODIFY_POWER' } },
        { kind: 'ACTION', action: { type: 'GRANT_KEYWORD', keyword: 'RUSH' } },
      ],
    });
  });

  it('splits cannot-be-KO plus power gain into separate atoms', () => {
    const parsed = parseCardEffect_V2(
      'OP06-030',
      "[When Attacking] If your Leader has the {New Fish-Man Pirates} type, this Character cannot be K.O.'d in battle and gains +2000 power until the start of your next turn.",
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['PREVENT_ACTION', 'MODIFY_POWER']);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'PREVENT_ACTION', action: 'KO_CARD' } },
        { kind: 'ACTION', action: { type: 'MODIFY_POWER' } },
      ],
    });
  });

  it('splits no-space sentence boundaries before conditional clauses', () => {
    const parsed = parseCardEffect_V2(
      'OP12-036',
      'This card in your hand cannot be played by effects.If your Leader has the <Slash> attribute, this Character cannot be K.O.\'d in battle by <Slash> attribute cards and gains +1000 power.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['PREVENT_ACTION', 'PREVENT_ACTION', 'MODIFY_POWER']);
  });

  it('keeps global cost-3-or-4 attack prevention scoped to Characters', () => {
    const parsed = parseCardEffect_V2(
      'P-084',
      'This Character cannot attack.If your Leader is [Buggy], all Characters with a cost of 3 or 4 cannot attack.',
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['PREVENT_ACTION', 'PREVENT_ACTION']);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'PREVENT_ACTION', selector: { relations: ['THIS_CARD'] } } },
        {
          kind: 'IF',
          then: {
            kind: 'ACTION',
            action: {
              type: 'PREVENT_ACTION',
              selector: {
                zones: ['CHARACTER_AREA'],
                cardCategories: ['CHARACTER'],
                quantity: { kind: 'ALL' },
                cost: {
                  propertyLayer: 'CURRENT',
                  comparison: 'IN_SET',
                  values: [
                    { kind: 'NUMBER', value: 3 },
                    { kind: 'NUMBER', value: 4 },
                  ],
                },
              },
            },
          },
        },
      ],
    });
  });

  it('does not split condition conjunctions before keyword grants', () => {
    const parsed = parseCardEffect_V2(
      'EB02-061',
      'If your Leader is multicolored and your opponent has 5 or more DON!! cards on their field, this Character gains [Rush].',
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual(['GRANT_KEYWORD']);
  });

  it('maps DON phase placement being given to Leader', () => {
    const parsed = parseCardEffect_V2(
      'OP13-003',
      'If you have any DON!! cards on your field, 1 DON!! card placed during your DON!! Phase is given to your Leader.',
    );

    expect(parsed.effects[0]).toMatchObject({
      conditions: { kind: 'PREDICATE' },
      resolution: { kind: 'ACTION', action: { type: 'GIVE_DON', target: { zones: ['LEADER_AREA'] } } },
    });
  });

  it('targets named cards plus this Character for shared keyword and base power text', () => {
    const keyword = parseCardEffect_V2(
      'OP15-070',
      'All of your [Shura] cards and this Character gain [Unblockable].',
    );
    const basePower = parseCardEffect_V2(
      'OP15-070',
      "[Opponent's Turn] All of your [Shura] cards' base power and this Character's base power become 6000.",
    );

    expect(keyword.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: { type: 'GRANT_KEYWORD', selector: { names: [{ value: 'Shura' }], relations: ['INCLUDE_THIS_CARD'] } },
    });
    expect(basePower.effects[0].resolution).toMatchObject({
      kind: 'ACTION',
      action: { type: 'MODIFY_POWER', selector: { names: [{ value: 'Shura' }], relations: ['INCLUDE_THIS_CARD'] } },
    });
  });

  it('keeps draw before then-delimited leader-or-character base power changes', () => {
    const parsed = parseCardEffect_V2(
      'OP16-106',
      "[On K.O.] If your Leader has the {Blackbeard Pirates} type, draw 1 card, then up to 1 of your Leader or Character cards' base power becomes 7000 during this turn.",
    );

    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        { kind: 'ACTION', action: { type: 'DRAW_CARD' } },
        { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { zones: ['LEADER_AREA', 'CHARACTER_AREA'] }, propertyLayer: 'BASE_VALUE' } },
      ],
    });
  });

  it('maps staged trash-count effects as separate gated atoms', () => {
    const parsed = parseCardEffect_V2(
      'OP15-092',
      "Apply each of the following effects based on the number of cards in your trash:• If there are 10 or more cards, this Character's base power becomes 9000 and it gains +10 cost.• If you have 20 or more cards, during your opponent's turn, your Leader's base power becomes 7000.• If you have 30 or more cards, this Character gains +1000 power.",
    );

    expect(parsed.atomicEffects.map((atom) => atom.parsedAction?.type)).toEqual([
      'MODIFY_POWER',
      'MODIFY_COST',
      'MODIFY_POWER',
      'MODIFY_POWER',
    ]);
    expect(parsed.effects[0].resolution).toMatchObject({
      kind: 'SEQUENCE',
      nodes: [
        {
          kind: 'IF',
          then: {
            kind: 'SEQUENCE',
            nodes: [
              { kind: 'ACTION', action: { type: 'MODIFY_POWER', propertyLayer: 'BASE_VALUE', value: { value: 9000 } } },
              { kind: 'ACTION', action: { type: 'MODIFY_COST', value: { value: 10 } } },
            ],
          },
        },
        { kind: 'IF', condition: { kind: 'AND' }, then: { kind: 'ACTION', action: { type: 'MODIFY_POWER', selector: { zones: ['LEADER_AREA'] }, value: { value: 7000 } } } },
        { kind: 'IF', then: { kind: 'ACTION', action: { type: 'MODIFY_POWER', value: { value: 1000 } } } },
      ],
    });
  });
});

describe('effectCompiler_V2 assignments and coverage', () => {
  it('compiles reviewed V2 assignments and reports covered atomic effects', () => {
    const parsed = parseCardEffect_V2(
      'OP01-026',
      "[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, K.O. up to 1 of your opponent's Characters with 4000 power or less.",
    );

    const compiled = compileCardEffects_V2(parsed, EFFECT_ASSIGNMENTS_V2);
    const coverage = buildCoverageReportFromAssignments_V2(parsed, EFFECT_ASSIGNMENTS_V2);

    expect(compiled.assignments).toHaveLength(1);
    expect(compiled.effects[0].metadata.assignmentId).toBe('v2:OP01-026:0');
    expect(coverage.totalAtomicEffects).toBe(2);
    expect(coverage.coveredAtomicEffects).toBe(2);
    expect(coverage.uncoveredAtomicEffects).toBe(0);
  });

  it('keeps parser-only effects out of compiled assignment effects', () => {
    const parsed = parseCardEffect_V2('OP02-119', "[Main] K.O. up to 1 of your opponent's Characters with a cost of 1 or less.");

    const compiled = compileCardEffects_V2(parsed, EFFECT_ASSIGNMENTS_V2);
    const coverage = buildCoverageReportFromAssignments_V2(parsed, EFFECT_ASSIGNMENTS_V2);

    expect(parsed.effects).toHaveLength(1);
    expect(compiled.parsedEffects).toHaveLength(1);
    expect(compiled.effects).toHaveLength(0);
    expect(coverage.parserRecognizedAtomicEffects).toBe(1);
    expect(coverage.assignmentCoveredAtomicEffects).toBe(0);
    expect(coverage.assignmentUncoveredAtomicEffects).toBe(1);
  });

  it('emits MongoDB-ready assignment and compiled-card documents', () => {
    const parsed = parseCardEffect_V2(
      'OP01-001',
      '[DON!! x1] [Your Turn] All of your Characters gain +1000 power.',
    );
    const compiled = compileCardEffects_V2(parsed, EFFECT_ASSIGNMENTS_V2);
    const coverage = buildCoverageReportFromAssignments_V2(parsed, EFFECT_ASSIGNMENTS_V2);

    const assignmentDocs = toMongoEffectAssignmentDocuments_V2(compiled);
    const cardDoc = toMongoCompiledCardEffectDocument_V2(compiled, coverage);

    expect(assignmentDocs[0]).toMatchObject({
      _id: 'v2:OP01-001:0',
      cardNumber: 'OP01-001',
      status: 'ASSIGNED',
    });
    expect(cardDoc).toMatchObject({
      _id: 'effects-v2:OP01-001',
      cardNumber: 'OP01-001',
    });
    expect(() => JSON.stringify({ assignmentDocs, cardDoc })).not.toThrow();
  });

  it('can adapt the supported V2 subset to the existing engine EffectProgram shape later', () => {
    const parsed = parseCardEffect_V2(
      'OP01-026',
      "[Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, K.O. up to 1 of your opponent's Characters with 4000 power or less.",
    );
    const compiled = compileCardEffects_V2(parsed, EFFECT_ASSIGNMENTS_V2);

    const adapted = adaptCompiledCardEffectsToLegacyProgram_V2(compiled);

    expect(adapted.warnings).toEqual([]);
    expect(adapted.program).toMatchObject({
      cardNumber: 'OP01-026',
      abilities: [
        {
          timing: 'counter',
          ops: [
            { op: 'chooseTargets', from: { sel: 'controllerLeaderOrCharacters' }, min: 0, max: 1, var: 't' },
            { op: 'addPower', target: { sel: 'var', name: 't' }, amount: 4000, duration: 'duringThisBattle' },
            { op: 'chooseTargets', from: { sel: 'opponentCharacters', maxPower: 4000 }, min: 0, max: 1, var: 't' },
            { op: 'ko', target: { sel: 'var', name: 't' } },
          ],
        },
      ],
    });
  });
});
