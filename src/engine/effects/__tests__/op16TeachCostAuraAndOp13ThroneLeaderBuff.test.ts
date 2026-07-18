/**
 * Regression: OP16-080 (Leader Marshall.D.Teach) opponent-turn +1 cost aura,
 * and OP13-099 (Stage The Empty Throne) trash-gated Leader +1000 on your turn.
 */
import { describe, expect, it } from 'vitest';
import { CURATED_EFFECT_PROGRAMS } from '../../../cards/effectTemplates';
import { runTimings } from '../interpreter';
import { computeCurrentCost, computeCurrentPower } from '../../rules/shared/power';
import {
  buildBaseRig,
  makeCharacterDef,
  makeStageDef,
  putCharacterInPlay,
  putStageInPlay,
  nextTestId,
} from '../../rules/shared/__tests__/testRig';
import { createPreGameState } from '../../setup/createPreGameState';
import { executeChooseGoingFirst } from '../../setup/applyChooseGoingFirst';
import { advanceStartOfGameEffects } from '../../setup/advanceStartOfGameEffects';
import { makePlayerSetupInput, makeDeckOf, makeDonDefinition } from '../../setup/__tests__/fixtures';
import type { CardDefinition } from '../../state/card';
import type { CardDefinitionLookup } from '../../rules/shared/definitions';
import type { ContinuousEffectRecord, GameState } from '../../state/game';

const TEACH_DEF: CardDefinition = {
  cardDefinitionId: 'OP16-080',
  name: 'Marshall.D.Teach',
  category: 'leader',
  colors: ['black'],
  types: ['Blackbeard Pirates'],
  basePower: 5000,
  text: '',
  life: 4,
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'OP16-080',
};

const PLAIN_LEADER_DEF: CardDefinition = {
  cardDefinitionId: 'plain-leader-def',
  name: 'Plain Leader',
  category: 'leader',
  colors: ['red'],
  types: [],
  basePower: 5000,
  text: '',
  life: 5,
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'PLAIN-LEADER',
};

const ALLY_DEF = makeCharacterDef({
  cardDefinitionId: 'TEACH-ALLY',
  cardNumber: 'TEACH-ALLY',
  name: 'Ally',
  baseCost: 3,
});

function fillTrash(state: GameState, playerId: string, count: number): GameState {
  const ids: string[] = [];
  const cardsById = { ...state.cardsById };
  for (let i = 0; i < count; i += 1) {
    const id = nextTestId('trash');
    ids.push(id);
    cardsById[id] = {
      instanceId: id,
      cardDefinitionId: 'trash-filler',
      ownerId: playerId,
      controllerId: playerId,
      currentZone: 'trash',
      orientation: null,
      faceState: 'faceUp',
      donAttached: [],
      appliedContinuousEffectIds: [],
      oncePerTurnUsed: [],
      summoningSick: false,
      revealedTo: 'all',
    };
  }
  const player = state.players[playerId];
  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [playerId]: { ...player, trash: { ...player.trash, cardIds: [...player.trash.cardIds, ...ids] } },
    },
  };
}

describe('OP16-080 Teach opponent-turn +1 cost aura', () => {
  it('registers the cost aura during start-of-game Leader setup (onEnterPlay)', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP16-080'];
    expect(program).toBeDefined();
    const registry = { 'OP16-080': program };

    const p1Deck = makeDeckOf(50);
    const p2Deck = makeDeckOf(50);
    const don = makeDonDefinition();
    const p1 = makePlayerSetupInput('p1', { leader: TEACH_DEF, deck: p1Deck, donCard: don });
    const p2 = makePlayerSetupInput('p2', { leader: PLAIN_LEADER_DEF, deck: p2Deck, donCard: don });
    const defs: CardDefinitionLookup = {
      [TEACH_DEF.cardDefinitionId]: TEACH_DEF,
      [PLAIN_LEADER_DEF.cardDefinitionId]: PLAIN_LEADER_DEF,
      [don.cardDefinitionId]: don,
      [ALLY_DEF.cardDefinitionId]: ALLY_DEF,
      ...Object.fromEntries(p1Deck.map((d) => [d.cardDefinitionId, d])),
      ...Object.fromEntries(p2Deck.map((d) => [d.cardDefinitionId, d])),
    };

    const pre = createPreGameState(p1, p2, { decidingPlayerId: 'p1', rngState: { seed: 'teach-aura', cursor: 0 } });
    if (!pre.ok) throw new Error(pre.reasons.join('; '));
    const chosen = executeChooseGoingFirst(pre.state, {
      type: 'CHOOSE_GOING_FIRST',
      actionId: 'choose-first',
      playerId: 'p1',
      goingFirst: true,
    });
    const advanced = advanceStartOfGameEffects(chosen.state, defs, registry, 'choose-first');

    const aura = advanced.state.continuousEffects.find(
      (ce) => ce.costModifier?.amount === 1 && ce.costModifier.appliesToGroup?.charactersOnly === true,
    );
    expect(aura).toBeDefined();
    expect(aura?.costModifier?.sourceCondition).toEqual({ turn: 'opponent' });

    // Drop a Character onto Teach's side after setup and confirm the aura applies only on the opponent's turn.
    let mid = {
      state: { ...advanced.state, activePlayerId: 'p2' as const, currentPhase: 'main' as const },
      defs,
    };
    const ally = putCharacterInPlay(mid, 'p1', ALLY_DEF);
    mid = ally.rig;

    expect(computeCurrentCost(mid.defs, mid.state, ally.instanceId)).toBe(4);
    expect(computeCurrentCost(mid.defs, { ...mid.state, activePlayerId: 'p1' }, ally.instanceId)).toBe(3);
  });
});

describe('OP13-099 Empty Throne Leader +1000 at 19 trash', () => {
  it('grants Leader +1000 on your turn when trash has 19+ cards', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP13-099'];
    expect(program).toBeDefined();
    const registry = { 'OP13-099': program };

    let rig = buildBaseRig({ activePlayerId: 'p1' });
    const stageDef = makeStageDef({
      cardDefinitionId: 'OP13-099',
      cardNumber: 'OP13-099',
      name: 'The Empty Throne',
      colors: ['black'],
    });
    const stage = putStageInPlay(rig, 'p1', stageDef);
    rig = stage.rig;

    const registered = runTimings(program, ['onEnterPlay'], rig.state, stage.instanceId, rig.defs, null, registry);
    rig = { ...rig, state: registered.state };

    const leaderId = rig.state.players.p1.leaderInstanceId;
    expect(computeCurrentPower(rig.defs, rig.state, leaderId)).toBe(5000);

    const with18 = fillTrash(rig.state, 'p1', 18);
    expect(computeCurrentPower(rig.defs, with18, leaderId)).toBe(5000);

    const with19 = fillTrash(rig.state, 'p1', 19);
    expect(computeCurrentPower(rig.defs, with19, leaderId)).toBe(6000);

    const oppTurn = { ...with19, activePlayerId: 'p2' as const };
    expect(computeCurrentPower(rig.defs, oppTurn, leaderId)).toBe(5000);
  });

  it('evaluates [Your Turn] on condition against the modifier owner, not the target owner', () => {
    // Debuff on an opponent Character with condition.turn:'your' must apply on
    // p1's turn even though the TARGET's owner is p2 (ContinuousPowerCondition docs).
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ basePower: 2000 }));
    const foe = putCharacterInPlay(src.rig, 'p2', makeCharacterDef({ basePower: 5000 }));
    const record: ContinuousEffectRecord = {
      id: 'your-turn-opp-debuff',
      sourceInstanceId: src.instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: '−1000 on your turn',
      powerModifier: {
        appliesToInstanceId: foe.instanceId,
        amount: -1000,
        condition: { turn: 'your' },
      },
    };
    const state: GameState = { ...foe.rig.state, continuousEffects: [record] };
    expect(computeCurrentPower(foe.rig.defs, state, foe.instanceId)).toBe(4000);
    expect(computeCurrentPower(foe.rig.defs, { ...state, activePlayerId: 'p2' }, foe.instanceId)).toBe(5000);
  });
});
