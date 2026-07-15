export type GuideCoverageStatus_V2 = 'covered' | 'partial' | 'missing' | 'notApplicable';

export interface GuideCoverageEntry_V2 {
  area: string;
  atom: string;
  guideStatus: 'defined';
  v2TypeStatus: GuideCoverageStatus_V2;
  parserStatus: GuideCoverageStatus_V2;
  compilerStatus: GuideCoverageStatus_V2;
  legacyAdapterStatus: GuideCoverageStatus_V2;
  remark: string;
}

export interface GuideCoverageReport_V2 {
  generatedBy: 'effectCompiler_V2';
  sourceGuide: 'OPTCG_Canonical_Effect_Structure.md';
  entries: GuideCoverageEntry_V2[];
  totals: Record<GuideCoverageStatus_V2, number>;
}

const entries: GuideCoverageEntry_V2[] = [
  entry('Card movement', 'DRAW_CARD', 'covered', 'covered', 'covered', 'covered', 'Parser recognizes simple draw clauses.'),
  entry('Card movement', 'MOVE_CARD', 'covered', 'partial', 'covered', 'missing', 'Parser recognizes common hand/life/deck/trash movement, but not every placement/from-zone permutation yet.'),
  entry('Card movement', 'PLAY_CARD', 'covered', 'partial', 'covered', 'missing', 'Parser recognizes common play-from-hand/trash clauses; cost policy and destination details still need more extraction.'),
  entry('Card movement', 'ACTIVATE_EVENT', 'covered', 'partial', 'covered', 'covered', 'Parser recognizes common Event activation clauses; native V2 activation records and nested Event ability resolution are available.'),
  entry('Card movement', 'TRASH_CARD', 'covered', 'partial', 'covered', 'covered', 'Parser recognizes simple trash-from-hand clauses.'),
  entry('Card movement', 'KO_CARD', 'covered', 'covered', 'covered', 'covered', 'Parser recognizes simple KO and blocks KO-prevention from becoming KO.'),
  entry('Card movement', 'RETURN_CARD', 'covered', 'partial', 'covered', 'missing', 'Represented through MOVE_CARD to hand/deck.'),
  entry('Card movement', 'ADD_CARD_TO_HAND', 'covered', 'partial', 'covered', 'missing', 'Represented through MOVE_CARD to HAND; parser covers common deck/trash/life variants.'),
  entry('Card movement', 'PLACE_CARD_IN_DECK', 'covered', 'partial', 'covered', 'missing', 'Represented through MOVE_CARD to DECK with placement.'),
  entry('Card movement', 'REVEAL_CARD', 'covered', 'partial', 'covered', 'missing', 'Typed and parser recognizes reveal-from-top; search reveal+move is still collapsed into MOVE_CARD.'),
  entry('Card movement', 'LOOK_AT_CARDS', 'covered', 'covered', 'covered', 'missing', 'Parser recognizes top-deck look clauses.'),
  entry('Card movement', 'SELECT_CARD', 'covered', 'partial', 'covered', 'missing', 'Typed; parser still needs result-reference selection expansion.'),
  entry('Card movement', 'REORDER_CARDS', 'covered', 'partial', 'covered', 'missing', 'Typed and parser covers common search remainder clauses using an ACTION_RESULT remainder selector.'),
  entry('Card movement', 'SHUFFLE_ZONE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('Life', 'ADD_CARD_TO_LIFE', 'covered', 'partial', 'covered', 'missing', 'Parser recognizes common deck/opponent-character to life clauses.'),
  entry('Life', 'TAKE_LIFE_TO_HAND', 'covered', 'partial', 'covered', 'missing', 'Simple life-to-hand is represented through MOVE_CARD; dedicated action is typed.'),
  entry('Life', 'TRASH_LIFE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Life', 'TAKE_DAMAGE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Life', 'REVEAL_LIFE', 'covered', 'missing', 'covered', 'missing', 'Guide-covered but not parser-recognized yet.'),
  entry('Life', 'LOOK_AT_LIFE', 'covered', 'partial', 'covered', 'missing', 'Typed; parser has only narrow life look coverage pending.'),
  entry('Life', 'REORDER_LIFE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Life', 'TURN_LIFE_FACE_UP', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Life', 'TURN_LIFE_FACE_DOWN', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('State', 'REST_CARD', 'covered', 'covered', 'covered', 'covered', 'Parser recognizes rest clauses, excluding search remainder text.'),
  entry('State', 'SET_CARD_ACTIVE', 'covered', 'covered', 'covered', 'missing', 'Parser recognizes set-active clauses.'),
  entry('State', 'TURN_CARD_FACE_UP', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('State', 'TURN_CARD_FACE_DOWN', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('DON', 'ADD_DON_FROM_DON_DECK', 'covered', 'covered', 'covered', 'covered', 'Parser recognizes add-DON-from-DON-deck clauses.'),
  entry('DON', 'GIVE_DON', 'covered', 'covered', 'covered', 'missing', 'Parser recognizes common give-DON clauses.'),
  entry('DON', 'DETACH_DON', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('DON', 'REST_DON', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('DON', 'SET_DON_ACTIVE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('DON', 'RETURN_DON_TO_DON_DECK', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('DON', 'MOVE_DON_TO_COST_AREA', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('Stats', 'MODIFY_POWER', 'covered', 'covered', 'covered', 'covered', 'Parser recognizes +/- power clauses.'),
  entry('Stats', 'MODIFY_COST', 'covered', 'covered', 'covered', 'missing', 'Parser recognizes +/- cost clauses.'),
  entry('Stats', 'MODIFY_COUNTER', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Stats', 'MODIFY_LIFE_VALUE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Stats', 'MODIFY_DAMAGE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('Information', 'MODIFY_NAME', 'covered', 'missing', 'covered', 'missing', 'Typed; parser currently tracks according-to-rules as rule-modifier gaps.'),
  entry('Information', 'MODIFY_COLOR', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Information', 'MODIFY_TYPE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Information', 'MODIFY_ATTRIBUTE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Information', 'MODIFY_BASE_EFFECT_STATUS', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('Effect modification', 'GRANT_KEYWORD', 'covered', 'covered', 'covered', 'covered', 'Parser recognizes keyword tags and gains-keyword clauses.'),
  entry('Effect modification', 'REMOVE_KEYWORD', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Effect modification', 'ADD_EFFECT', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Effect modification', 'REMOVE_GAINED_EFFECT', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Effect modification', 'INVALIDATE_EFFECTS', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Effect modification', 'VALIDATE_EFFECTS', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Effect modification', 'COPY_EFFECT', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Effect modification', 'CREATE_DELAYED_EFFECT', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Effect modification', 'CREATE_REPLACEMENT_EFFECT', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('Permission', 'PREVENT_ACTION', 'covered', 'partial', 'covered', 'missing', 'Parser recognizes KO prevention, freeze-like active prevention, rest prevention, and play prevention.'),
  entry('Permission', 'ALLOW_ACTION', 'covered', 'partial', 'covered', 'missing', 'Parser recognizes active-character attack permission.'),
  entry('Permission', 'PREVENT_SELECTION', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Permission', 'PREVENT_ZONE_CHANGE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Permission', 'MODIFY_VALID_TARGETS', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Permission', 'MODIFY_PLAY_PERMISSION', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('Battle', 'DECLARE_ATTACK', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Battle', 'CHANGE_ATTACK_TARGET', 'covered', 'covered', 'covered', 'covered', 'Parser recognizes target-change clauses and native V2 current-battle redirection is available.'),
  entry('Battle', 'ACTIVATE_BLOCKER', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Battle', 'CANCEL_ATTACK', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Battle', 'END_BATTLE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Battle', 'DEAL_DAMAGE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Battle', 'SET_DAMAGE', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Battle', 'SKIP_BATTLE_STEP', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),

  entry('Player and rule', 'PLAYER_WINS', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Player and rule', 'PLAYER_LOSES', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Player and rule', 'PLAYER_CHOOSES', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Player and rule', 'OPPONENT_CHOOSES', 'covered', 'missing', 'covered', 'missing', 'Typed but no parser recognizer yet.'),
  entry('Player and rule', 'RULE_MODIFIER', 'covered', 'partial', 'covered', 'missing', 'Typed; parser tracks rule-modifier text but does not lower it automatically yet.'),
];

function entry(
  area: string,
  atom: string,
  v2TypeStatus: GuideCoverageStatus_V2,
  parserStatus: GuideCoverageStatus_V2,
  compilerStatus: GuideCoverageStatus_V2,
  legacyAdapterStatus: GuideCoverageStatus_V2,
  remark: string,
): GuideCoverageEntry_V2 {
  return {
    area,
    atom,
    guideStatus: 'defined',
    v2TypeStatus,
    parserStatus,
    compilerStatus,
    legacyAdapterStatus,
    remark,
  };
}

export function buildGuideCoverageReport_V2(): GuideCoverageReport_V2 {
  const totals: Record<GuideCoverageStatus_V2, number> = {
    covered: 0,
    partial: 0,
    missing: 0,
    notApplicable: 0,
  };

  for (const item of entries) totals[item.parserStatus] += 1;

  return {
    generatedBy: 'effectCompiler_V2',
    sourceGuide: 'OPTCG_Canonical_Effect_Structure.md',
    entries,
    totals,
  };
}
