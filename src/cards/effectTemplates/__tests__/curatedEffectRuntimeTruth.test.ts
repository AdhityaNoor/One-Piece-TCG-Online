import { describe, expect, it } from 'vitest';
import { executeAction, validateAction } from '../../../engine/actions';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { resolveDamageAndEndOfBattle } from '../../../engine/rules/battle/damageStep';
import { computeCurrentPower } from '../../../engine/rules/shared';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  makeLeaderDef,
  makeStageDef,
  nextTestId,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putInHand,
  putLifeCards,
  putStageInPlay,
  type Rig,
} from '../../../engine/rules/shared/__tests__/testRig';
import { settleOnKoTriggers } from '../../../engine/rules/shared/settleOnKoTriggers';
import type { CardDefinition, CardInstance } from '../../../engine/state/card';
import type { GameState } from '../../../engine/state/game';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import { OP16_ASSIGNMENTS } from '../assignments/OP16';
import { buildCuratedEffectRegistry } from '../curatedPrograms';

type Registry = ReturnType<typeof buildRegistryFromAssignments>;

function stateAtDamageStep(rig: Rig): GameState {
  const attackerInstanceId = rig.state.players.p2.leaderInstanceId;
  const targetInstanceId = rig.state.players.p1.leaderInstanceId;
  return {
    ...rig.state,
    currentBattle: {
      attackerInstanceId,
      targetInstanceId,
      originalTargetInstanceId: targetInstanceId,
      step: 'damage',
      blockerUsed: false,
      battlePowerBonuses: {},
    },
  };
}

function damageIntoLifeTrigger(
  rig: Rig,
  triggerDef: CardDefinition,
  assignment: CardEffectAssignment,
): { rig: Rig; lifeId: string; state: GameState; registry: Registry } {
  const withLife = putLifeCards(rig, 'p1', [triggerDef]);
  const lifeId = withLife.lifeIds[0]!;
  const registry = buildRegistryFromAssignments([assignment]);
  const damaged = resolveDamageAndEndOfBattle(stateAtDamageStep(withLife.rig), withLife.rig.defs, 'damage-test', registry);

  expect(damaged.pendingChoices).toHaveLength(1);
  expect(damaged.pendingChoices[0]!).toMatchObject({ sourceEffectId: 'rule:lifeTrigger', sourceInstanceId: lifeId });
  expect(damaged.state.players.p1.hand.cardIds).toContain(lifeId);

  return { rig: withLife.rig, lifeId, state: { ...damaged.state, pendingChoices: damaged.pendingChoices }, registry };
}

function resolvePending(state: GameState, rig: Rig, registry: Registry, response: readonly string[] | number | boolean): GameState {
  const choice = state.pendingChoices[0]!;
  return executeAction(
    state,
    {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: nextTestId('resolve-pending'),
      playerId: choice.playerId,
      choiceId: choice.id,
      response,
    },
    rig.defs,
    registry,
  ).state;
}

function expectTrashWithoutOnKo(
  result: { state: { pendingOnKoTriggers?: unknown[]; cardsById: Record<string, { currentZone: string }> }; log: { type: string }[] },
  trashedId: string,
): void {
  expect(result.state.cardsById[trashedId]?.currentZone).toBe('trash');
  expect(result.state.pendingOnKoTriggers ?? []).toEqual([]);
  expect(result.log.some((entry) => entry.type === 'CHARACTER_KO')).toBe(false);
}

function withExactDeck(rig: Rig, defs: CardDefinition[]): { rig: Rig; deckIds: string[] } {
  const deckIds = defs.map((_, i) => `deck-${nextTestId(String(i))}`);
  return {
    rig: {
      defs: Object.fromEntries([...Object.entries(rig.defs), ...defs.map((def) => [def.cardDefinitionId, def])]),
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          ...Object.fromEntries(defs.map((def, i) => [deckIds[i], {
            instanceId: deckIds[i],
            cardDefinitionId: def.cardDefinitionId,
            ownerId: 'p1',
            controllerId: 'p1',
            currentZone: 'deck',
            orientation: null,
            faceState: 'faceDown',
            donAttached: [],
            appliedContinuousEffectIds: [],
            oncePerTurnUsed: [],
            summoningSick: false,
            revealedTo: [],
          } satisfies CardInstance])),
        },
        players: { ...rig.state.players, p1: { ...rig.state.players.p1, deck: { ...rig.state.players.p1.deck, cardIds: deckIds } } },
      },
    },
    deckIds,
  };
}

describe('canonical curated effect runtime truth', () => {
  describe('Life Trigger dispatch', () => {
    it('declining a revealed curated trigger keeps the card in hand', () => {
      const triggerDef = makeEventDef({
        cardDefinitionId: 'SYN-LT-DECLINE',
        cardNumber: 'SYN-LT-DECLINE',
        hasTrigger: true,
        text: '[Trigger] Draw 1 card.',
      });
      const assignment: CardEffectAssignment = {
        cardNumber: triggerDef.cardNumber,
        templateId: 'ability',
        params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] },
      };
      const { rig, lifeId, state, registry } = damageIntoLifeTrigger(buildBaseRig({ activePlayerId: 'p2', phase: 'main' }), triggerDef, assignment);

      const declined = resolvePending(state, rig, registry, []);

      expect(declined.players.p1.hand.cardIds).toContain(lifeId);
      expect(declined.players.p1.trash.cardIds).not.toContain(lifeId);
      expect(declined.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
      expect(declined.pendingChoices).toHaveLength(0);
    });

    it('activating an immediate draw trigger resolves the effect then trashes the trigger source', () => {
      const triggerDef = makeEventDef({
        cardDefinitionId: 'SYN-LT-DRAW',
        cardNumber: 'SYN-LT-DRAW',
        hasTrigger: true,
        text: '[Trigger] Draw 1 card.',
      });
      const filler = makeCharacterDef({ cardDefinitionId: 'SYN-LT-FILLER', cardNumber: 'SYN-LT-FILLER' });
      const assignment: CardEffectAssignment = {
        cardNumber: triggerDef.cardNumber,
        templateId: 'ability',
        params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] },
      };
      const withDeck = putDeckCards(buildBaseRig({ activePlayerId: 'p2', phase: 'main' }), 'p1', filler, 1);
      const deckCardId = withDeck.deckIds[0]!;
      const { rig, lifeId, state, registry } = damageIntoLifeTrigger(withDeck.rig, triggerDef, assignment);

      const resolved = resolvePending(state, rig, registry, [lifeId]);

      expect(resolved.players.p1.hand.cardIds).toContain(deckCardId);
      expect(resolved.players.p1.hand.cardIds).not.toContain(lifeId);
      expect(resolved.players.p1.trash.cardIds).toContain(lifeId);
      expect(resolved.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
      expect(resolved.pendingChoices).toHaveLength(0);
    });

    it('triggerPlaySelf plays the trigger source instead of trashing it', () => {
      const triggerDef = makeCharacterDef({
        cardDefinitionId: 'SYN-LT-PLAY-SELF',
        cardNumber: 'SYN-LT-PLAY-SELF',
        baseCost: 2,
        basePower: 3000,
        hasTrigger: true,
        text: '[Trigger] Play this card.',
      });
      const assignment: CardEffectAssignment = {
        cardNumber: triggerDef.cardNumber,
        templateId: 'ability',
        params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] },
      };
      const { rig, lifeId, state, registry } = damageIntoLifeTrigger(buildBaseRig({ activePlayerId: 'p2', phase: 'main' }), triggerDef, assignment);

      const resolved = resolvePending(state, rig, registry, [lifeId]);
      const played = resolved.players.p1.characterArea.cardIds
        .map((id) => resolved.cardsById[id])
        .find((card) => card?.cardDefinitionId === triggerDef.cardDefinitionId);

      expect(played).toBeDefined();
      expect(resolved.players.p1.hand.cardIds).not.toContain(lifeId);
      expect(resolved.players.p1.trash.cardIds).not.toContain(lifeId);
      expect(resolved.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
      expect(resolved.pendingChoices).toHaveLength(0);
    });

    it('keeps the trigger source pending in hand while a target choice is unresolved, then trashes it after resume', () => {
      const triggerDef = makeEventDef({
        cardDefinitionId: 'SYN-LT-PENDING-BUFF',
        cardNumber: 'SYN-LT-PENDING-BUFF',
        hasTrigger: true,
        text: '[Trigger] Up to 1 of your Leader or Character cards gains +1000 power during this turn.',
      });
      const assignment: CardEffectAssignment = {
        cardNumber: triggerDef.cardNumber,
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [{
            fn: 'addPower',
            target: { group: 'leaderOrCharacters', player: 'controller' },
            amount: 1000,
            duration: 'duringThisTurn',
            optional: true,
            maxTargets: 1,
          }],
        },
      };
      const { rig, lifeId, state, registry } = damageIntoLifeTrigger(buildBaseRig({ activePlayerId: 'p2', phase: 'main' }), triggerDef, assignment);

      const awaitingTarget = resolvePending(state, rig, registry, [lifeId]);

      expect(awaitingTarget.pendingChoices).toHaveLength(1);
      expect(awaitingTarget.pendingLifeTriggerTrash ?? []).toContain(lifeId);
      expect(awaitingTarget.players.p1.hand.cardIds).toContain(lifeId);
      expect(awaitingTarget.players.p1.trash.cardIds).not.toContain(lifeId);

      const leaderId = awaitingTarget.players.p1.leaderInstanceId;
      const resumed = resolvePending(awaitingTarget, rig, registry, [leaderId]);

      expect(computeCurrentPower(rig.defs, resumed, leaderId)).toBe(6000);
      expect(resumed.players.p1.hand.cardIds).not.toContain(lifeId);
      expect(resumed.players.p1.trash.cardIds).toContain(lifeId);
      expect(resumed.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
      expect(resumed.pendingChoices).toHaveLength(0);
    });

    it('resolves target-driven KO triggers and only trashes the trigger source after the KO choice', () => {
      const triggerDef = makeEventDef({
        cardDefinitionId: 'SYN-LT-KO',
        cardNumber: 'SYN-LT-KO',
        hasTrigger: true,
        text: "[Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.",
      });
      const victimDef = makeCharacterDef({
        cardDefinitionId: 'SYN-LT-KO-VICTIM',
        cardNumber: 'SYN-LT-KO-VICTIM',
        baseCost: 4,
        basePower: 5000,
      });
      const assignment: CardEffectAssignment = {
        cardNumber: triggerDef.cardNumber,
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [{
            fn: 'ko',
            target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } },
            optional: true,
            maxTargets: 1,
          }],
        },
      };
      const withVictim = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p2', phase: 'main' }), 'p2', victimDef);
      const { rig, lifeId, state, registry } = damageIntoLifeTrigger(withVictim.rig, triggerDef, assignment);
      const awaitingTarget = resolvePending(state, rig, registry, [lifeId]);

      expect(awaitingTarget.pendingChoices).toHaveLength(1);
      expect(awaitingTarget.pendingLifeTriggerTrash ?? []).toContain(lifeId);
      expect(awaitingTarget.players.p2.characterArea.cardIds).toContain(withVictim.instanceId);

      const resumed = resolvePending(awaitingTarget, rig, registry, [withVictim.instanceId]);

      expect(resumed.players.p2.characterArea.cardIds).not.toContain(withVictim.instanceId);
      expect(resumed.players.p2.trash.cardIds).toContain(withVictim.instanceId);
      expect(resumed.players.p1.trash.cardIds).toContain(lifeId);
      expect(resumed.players.p1.hand.cardIds).not.toContain(lifeId);
      expect(resumed.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
      expect(resumed.pendingChoices).toHaveLength(0);
    });

    it('OP16-109 activates from Life damage, draws, prompts KO, resolves KO, and trashes the trigger card', () => {
      const docQDef = makeCharacterDef({
        cardDefinitionId: 'OP16-109_snapshot',
        cardNumber: 'OP16-109',
        name: 'Doc Q',
        category: 'character',
        baseCost: 1,
        basePower: 0,
        types: ['Blackbeard Pirates'],
        hasTrigger: true,
      });
      const drawDef = makeCharacterDef({ cardDefinitionId: nextTestId('draw'), cardNumber: 'TEST-DRAW' });
      const koTargetDef = makeCharacterDef({
        cardDefinitionId: nextTestId('ko-target'),
        cardNumber: 'TEST-KO-TARGET',
        baseCost: 1,
        basePower: 1000,
      });

      let rig = buildBaseRig({
        activePlayerId: 'p2',
        phase: 'main',
        leaderOverridesP1: { types: ['Blackbeard Pirates'] },
      });
      let lifeId: string;
      let drawId: string;
      let koTargetId: string;
      ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p1', [docQDef]));
      ({ rig, deckIds: [drawId] } = putDeckCards(rig, 'p1', drawDef, 1));
      ({ rig, instanceId: koTargetId } = putCharacterInPlay(rig, 'p2', koTargetDef, { summoningSick: false }));

      const registry = buildCuratedEffectRegistry(rig.defs);
      const damaged = resolveDamageAndEndOfBattle(stateAtDamageStep(rig), rig.defs, 'test', registry);
      expect(damaged.state.pendingChoices[0]).toMatchObject({ sourceEffectId: 'rule:lifeTrigger', sourceInstanceId: lifeId });

      const activated = executeAction(
        damaged.state,
        { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: damaged.state.pendingChoices[0].id, response: [lifeId] },
        rig.defs,
        registry,
      ).state;

      expect(activated.players.p1.hand.cardIds).toContain(drawId);
      expect(activated.pendingLifeTriggerTrash ?? []).toContain(lifeId);
      expect(activated.pendingChoices[0]).toMatchObject({
        kind: 'SELECT_CARDS',
        constraints: { candidateInstanceIds: [koTargetId] },
      });

      const resolved = executeAction(
        activated,
        { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: activated.pendingChoices[0].id, response: [koTargetId] },
        rig.defs,
        registry,
      ).state;

      expect(resolved.players.p2.characterArea.cardIds).not.toContain(koTargetId);
      expect(resolved.players.p2.trash.cardIds).toContain(koTargetId);
      expect(resolved.players.p1.trash.cardIds).toContain(lifeId);
      expect(resolved.players.p1.hand.cardIds).not.toContain(lifeId);
      expect(resolved.pendingChoices).toHaveLength(0);
    });
  });

  describe('search visibility and type matching', () => {
    const searchSource = makeCharacterDef({ cardDefinitionId: 'SYN-FULL-DECK-SRC', cardNumber: 'SYN-FULL-DECK-SRC', category: 'character', baseCost: 3 });
    const smile = makeEventDef({ cardDefinitionId: 'SYN-SMILE', cardNumber: 'SYN-SMILE', category: 'event', name: 'Artificial Devil Fruit SMILE' });
    const off = makeCharacterDef({ cardDefinitionId: 'SYN-OFF', cardNumber: 'SYN-OFF', category: 'character', baseCost: 2 });
    const blackbeard = makeCharacterDef({ cardDefinitionId: 'SYN-BLACKBEARD', cardNumber: 'SYN-BLACKBEARD', category: 'character', types: ['The Seven Warlords of the Sea', 'Blackbeard Pirates'] });
    const blackbeardCompact = makeStageDef({ cardDefinitionId: 'SYN-BLACKBEARD-COMPACT', cardNumber: 'SYN-BLACKBEARD-COMPACT', category: 'stage', types: ['The Seven Warlords of the Sea/BlackbeardPirates'] });
    const whitebeard = makeCharacterDef({ cardDefinitionId: 'SYN-WHITEBEARD', cardNumber: 'SYN-WHITEBEARD', category: 'character', types: ['Whitebeard Pirates'] });

    it('reveals a matching full-deck search result to hand and shuffles the rest', () => {
      const assignment: CardEffectAssignment = {
        cardNumber: searchSource.cardNumber,
        templateId: 'ability',
        params: { timing: 'onPlay', functions: [{ fn: 'searchDeck', pick: 1, reveal: true, destination: 'hand', filter: { name: 'Artificial Devil Fruit SMILE' } }] },
      };
      const registry = buildRegistryFromAssignments([assignment]);
      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
      let sourceId: string;
      ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', searchSource));
      const seeded = withExactDeck(rig, [off, smile, off]);
      rig = seeded.rig;

      const fired = runTimings(registry[searchSource.cardNumber], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
      const choice = fired.state.pendingChoices[0];

      expect(choice.constraints.candidateInstanceIds).toEqual([seeded.deckIds[1]]);
      expect(choice.constraints.visibleInstanceIds).toEqual(seeded.deckIds);

      const resolved = resumeProgram(registry[searchSource.cardNumber], fired.state, choice, [seeded.deckIds[1]], rig.defs, null, registry).state;

      expect(resolved.players.p1.hand.cardIds).toContain(seeded.deckIds[1]);
      expect(resolved.cardsById[seeded.deckIds[1]].revealedTo).toBe('all');
      expect(resolved.players.p1.deck.cardIds).toHaveLength(2);
      expect(new Set(resolved.players.p1.deck.cardIds)).toEqual(new Set([seeded.deckIds[0], seeded.deckIds[2]]));
    });

    it('uses normalized type matching for full-deck search candidates', () => {
      const assignment: CardEffectAssignment = {
        cardNumber: searchSource.cardNumber,
        templateId: 'ability',
        params: { timing: 'onPlay', functions: [{ fn: 'searchDeck', pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Blackbeard Pirates' } }] },
      };
      const registry = buildRegistryFromAssignments([assignment]);
      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
      let sourceId: string;
      ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', searchSource));
      const seeded = withExactDeck(rig, [whitebeard, blackbeard, blackbeardCompact]);
      rig = seeded.rig;

      const fired = runTimings(registry[searchSource.cardNumber], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
      const choice = fired.state.pendingChoices[0];

      expect(choice.constraints.candidateInstanceIds).toEqual([seeded.deckIds[1], seeded.deckIds[2]]);
      expect(choice.constraints.visibleInstanceIds).toEqual(seeded.deckIds);
      expect(choice.constraints.uiShowOnlyCandidates).toBe(true);
    });

    it('keeps full-deck searched cards private when the text does not say reveal', () => {
      const assignment: CardEffectAssignment = {
        cardNumber: searchSource.cardNumber,
        templateId: 'ability',
        params: { timing: 'onPlay', functions: [{ fn: 'searchDeck', pick: 1, reveal: false, destination: 'hand', filter: { typeIncludes: 'Blackbeard Pirates' } }] },
      };
      const registry = buildRegistryFromAssignments([assignment]);
      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
      let sourceId: string;
      ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', searchSource));
      const seeded = withExactDeck(rig, [blackbeard, whitebeard]);
      rig = seeded.rig;

      const fired = runTimings(registry[searchSource.cardNumber], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
      const choice = fired.state.pendingChoices[0];
      const resolved = resumeProgram(registry[searchSource.cardNumber], fired.state, choice, [seeded.deckIds[0]], rig.defs, null, registry).state;

      expect(resolved.players.p1.hand.cardIds).toContain(seeded.deckIds[0]);
      expect(resolved.cardsById[seeded.deckIds[0]].revealedTo).toEqual(['p1']);
      expect(resolved.log.at(-1)).toMatchObject({
        visibility: { visibleTo: ['p1'] },
        data: { reveal: false, addedInstanceIds: [], privateAddedInstanceIds: [seeded.deckIds[0]] },
      });
    });

    it('lets OP09-099 Fullalead find OP16-119 by Blackbeard Pirates type during play', () => {
      const fullalead = makeStageDef({
        cardDefinitionId: 'OP09-099',
        cardNumber: 'OP09-099',
        name: 'Fullalead',
        category: 'stage',
        colors: ['black'],
        types: ['Blackbeard Pirates'],
        baseCost: 1,
      });
      const teach = makeCharacterDef({
        cardDefinitionId: 'OP16-119',
        cardNumber: 'OP16-119',
        name: 'Marshall.D.Teach',
        category: 'character',
        colors: ['yellow'],
        types: ['The Seven Warlords of the Sea', 'Blackbeard Pirates'],
        baseCost: 8,
        basePower: 10000,
        hasTrigger: true,
      });
      const compactTeach = makeCharacterDef({
        cardDefinitionId: 'TEST-COMPACT-BLACKBEARD',
        cardNumber: 'TEST-COMPACT-BLACKBEARD',
        name: 'Compact Blackbeard',
        category: 'character',
        types: ['The Seven Warlords of the Sea/BlackbeardPirates'],
      });
      const spareHand = makeCharacterDef({ cardDefinitionId: 'TEST-FULLALEAD-SPARE', cardNumber: 'TEST-FULLALEAD-SPARE' });

      let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
      let stageId: string;
      let spareHandId: string;
      let offTypeId: string;
      let teachId: string;
      let compactTeachId: string;
      ({ rig, instanceId: stageId } = putStageInPlay(rig, 'p1', fullalead));
      ({ rig, instanceId: spareHandId } = putInHand(rig, 'p1', spareHand));
      ({ rig, deckIds: [offTypeId] } = putDeckCards(rig, 'p1', whitebeard, 1));
      ({ rig, deckIds: [teachId] } = putDeckCards(rig, 'p1', teach, 1));
      ({ rig, deckIds: [compactTeachId] } = putDeckCards(rig, 'p1', compactTeach, 1));

      const registry = buildCuratedEffectRegistry(rig.defs);
      const activateAction = { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: stageId, effectId: 'activateMain', donInstanceIds: [] } as const;
      expect(validateAction(rig.state, activateAction, rig.defs, registry)).toEqual({ legal: true, reasons: [] });

      const activated = executeAction(rig.state, activateAction, rig.defs, registry).state;
      expect(activated.cardsById[stageId].orientation).toBe('rested');
      const afterTrash = executeAction(
        activated,
        { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: activated.pendingChoices[0].id, response: [spareHandId] },
        rig.defs,
        registry,
      ).state;
      const searchChoice = afterTrash.pendingChoices[0];

      expect(searchChoice.constraints.visibleInstanceIds).toEqual([offTypeId, teachId, compactTeachId]);
      expect(searchChoice.constraints.candidateInstanceIds).toEqual([teachId, compactTeachId]);
    });
  });

  describe('on-opponent-attack redirect', () => {
    it('OP16-080 redirects an attack to an eligible Blackbeard Pirates Character after trashing a Trigger card', () => {
      const blackbeardTargetDef = makeCharacterDef({
        cardDefinitionId: nextTestId('bbp-target'),
        cardNumber: 'TEST-BBP-TARGET',
        name: 'Blackbeard Pirates Target',
        category: 'character',
        baseCost: 1,
        basePower: 1000,
        types: ['Blackbeard Pirates'],
      });
      const offTypeTargetDef = makeCharacterDef({
        cardDefinitionId: nextTestId('off-target'),
        cardNumber: 'TEST-OFF-TARGET',
        name: 'Off Target',
        category: 'character',
        baseCost: 1,
        basePower: 1000,
        types: ['Whitebeard Pirates'],
      });
      const triggerHandDef = makeEventDef({
        cardDefinitionId: nextTestId('trigger-hand'),
        cardNumber: 'TEST-TRIGGER-HAND',
        name: 'Trigger Hand Card',
        hasTrigger: true,
      });

      let rig = buildBaseRig({
        activePlayerId: 'p1',
        phase: 'main',
        leaderOverridesP2: {
          cardDefinitionId: 'OP16-080_snapshot',
          cardNumber: 'OP16-080',
          name: 'Marshall.D.Teach',
          colors: ['black', 'yellow'],
          types: ['The Seven Warlords of the Sea', 'Blackbeard Pirates'],
          life: 4,
        },
      });
      let blackbeardTargetId: string;
      let offTypeTargetId: string;
      let triggerHandId: string;
      ({ rig, instanceId: blackbeardTargetId } = putCharacterInPlay(rig, 'p2', blackbeardTargetDef, { summoningSick: false }));
      ({ rig, instanceId: offTypeTargetId } = putCharacterInPlay(rig, 'p2', offTypeTargetDef, { summoningSick: false }));
      ({ rig, instanceId: triggerHandId } = putInHand(rig, 'p2', triggerHandDef));

      const registry = buildCuratedEffectRegistry(rig.defs);
      const attackerId = rig.state.players.p1.leaderInstanceId;
      const defenderLeaderId = rig.state.players.p2.leaderInstanceId;
      const attacked = executeAction(
        rig.state,
        { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: defenderLeaderId },
        rig.defs,
        registry,
      ).state;
      expect(attacked.currentBattle?.step).toBe('block');

      const activated = executeAction(
        attacked,
        { type: 'ACTIVATE_ON_OPPONENTS_ATTACK', actionId: nextTestId('action'), playerId: 'p2', sourceInstanceId: defenderLeaderId, effectId: 'onOpponentsAttack', donInstanceIds: [] },
        rig.defs,
        registry,
      ).state;
      const trashChoice = activated.pendingChoices[0];
      expect(trashChoice).toMatchObject({
        kind: 'SELECT_CARDS',
        constraints: { min: 0, max: 1, candidateInstanceIds: [triggerHandId] },
      });

      const afterTrash = executeAction(
        activated,
        { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p2', choiceId: trashChoice.id, response: [triggerHandId] },
        rig.defs,
        registry,
      ).state;
      const redirectChoice = afterTrash.pendingChoices[0];

      expect(redirectChoice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([defenderLeaderId, blackbeardTargetId]));
      expect(redirectChoice.constraints.candidateInstanceIds).not.toContain(offTypeTargetId);

      const redirected = executeAction(
        afterTrash,
        { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p2', choiceId: redirectChoice.id, response: [blackbeardTargetId] },
        rig.defs,
        registry,
      ).state;

      expect(redirected.currentBattle?.targetInstanceId).toBe(blackbeardTargetId);
      expect(redirected.players.p2.trash.cardIds).toContain(triggerHandId);
      expect(redirected.pendingChoices).toHaveLength(0);
    });
  });

  describe('KO versus trash and OP14 regressions', () => {
    it('OP14-120 played from hand prompts and applies its opponent attack lock', () => {
      const crocodile = makeCharacterDef({
        cardDefinitionId: 'OP14-120',
        cardNumber: 'OP14-120',
        name: 'Crocodile',
        category: 'character',
        types: ['Baroque Works'],
        baseCost: 9,
        basePower: 9000,
      });
      const foe = makeCharacterDef({ cardDefinitionId: 'SYN-FOE-NINE', cardNumber: 'SYN-FOE-NINE', baseCost: 9, basePower: 9000 });
      const drawFiller = makeCharacterDef({ cardDefinitionId: 'SYN-DRAW-FILLER', cardNumber: 'SYN-DRAW-FILLER' });

      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
      let crocodileId: string;
      let foeId: string;
      ({ rig, instanceId: crocodileId } = putInHand(rig, 'p1', crocodile));
      ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', foe));
      ({ rig } = putDeckCards(rig, 'p1', drawFiller, 1));
      const withDon = putDon(rig, 'p1', 9);
      rig = withDon.rig;

      const registry = buildCuratedEffectRegistry(rig.defs);
      const played = executeAction(
        rig.state,
        {
          type: 'PLAY_CHARACTER',
          actionId: nextTestId('play-op14-120'),
          playerId: 'p1',
          handCardInstanceId: crocodileId,
          donInstanceIds: withDon.donIds,
        },
        rig.defs,
        registry,
      ).state;

      const lockChoice = played.pendingChoices[0];
      expect(lockChoice).toMatchObject({
        kind: 'SELECT_CARDS',
        constraints: { candidateInstanceIds: [foeId] },
      });
      expect(lockChoice.sourceInstanceId).not.toBeNull();
      expect(lockChoice.sourceInstanceId).not.toBe(crocodileId);
      expect(played.cardsById[lockChoice.sourceInstanceId!]?.cardDefinitionId).toBe(crocodile.cardDefinitionId);

      const resolved = executeAction(
        played,
        {
          type: 'RESOLVE_PENDING_CHOICE',
          actionId: nextTestId('resolve-op14-120-lock'),
          playerId: 'p1',
          choiceId: lockChoice.id,
          response: [foeId],
        },
        rig.defs,
        registry,
      ).state;

      expect(resolved.continuousEffects.some((effect) =>
        effect.attackRestriction?.appliesToInstanceId === foeId &&
        effect.duration === 'endOfOpponentsTurn'
      )).toBe(true);
    });

    it('OP14-079 continues to the optional trash-2 deck prompt after K.O.ing a Baroque Works Character', () => {
      const stage = makeStageDef({
        cardDefinitionId: 'OP14-079',
        cardNumber: 'OP14-079',
        name: 'Baroque Works HQ',
        types: ['Baroque Works'],
      });
      const ally = makeCharacterDef({
        cardDefinitionId: 'SYN-BW-ALLY',
        cardNumber: 'SYN-BW-ALLY',
        name: 'Baroque Works Ally',
        types: ['Baroque Works'],
        basePower: 4000,
        baseCost: 3,
      });
      const opponent = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-CHARACTER', cardNumber: 'SYN-OPP-CHARACTER', baseCost: 5 });
      const deckCard = makeCharacterDef({ cardDefinitionId: 'SYN-DECK-CARD', cardNumber: 'SYN-DECK-CARD' });

      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
      let stageId: string;
      let allyId: string;
      ({ rig, instanceId: stageId } = putStageInPlay(rig, 'p1', stage));
      ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', ally));
      ({ rig } = putCharacterInPlay(rig, 'p2', opponent));
      ({ rig } = putDeckCards(rig, 'p1', deckCard, 4));

      const registry = buildCuratedEffectRegistry(rig.defs);
      let result = runTimings(registry['OP14-079'], ['activateMain'], rig.state, stageId, rig.defs, nextTestId('op14-079'), registry);
      expect(result.pendingChoices[0]).toMatchObject({ kind: 'SELECT_OPTION' });
      result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], 1, rig.defs, nextTestId('op14-079'), registry);

      expect(result.pendingChoices[0]).toMatchObject({ kind: 'SELECT_CARDS' });
      result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], [allyId], rig.defs, nextTestId('op14-079'), registry);
      expect(result.state.cardsById[allyId]?.currentZone).toBe('trash');

      expect(result.pendingChoices[0]).toMatchObject({ kind: 'SELECT_CARDS' });
      result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], [], rig.defs, nextTestId('op14-079'), registry);

      expect(result.pendingChoices).toHaveLength(1);
      expect(result.pendingChoices[0]).toMatchObject({ kind: 'SELECT_OPTION' });
      expect(result.pendingChoices[0].prompt).toMatch(/trash 2 cards from the top of your deck/i);
      expect(result.pendingChoices[0].constraints.options?.map((option) => option.label)).toEqual(['skip', 'trash']);

      const beforeTrash = result.state.players.p1.trash.cardIds.length;
      result = resumeProgram(registry['OP14-079'], result.state, result.pendingChoices[0], 1, rig.defs, nextTestId('op14-079'), registry);
      expect(result.state.players.p1.trash.cardIds.length).toBe(beforeTrash + 2);
    });

    it.each([
      ['OP09-009', 'onPlay'],
      ['OP07-091', 'whenAttacking'],
      ['OP08-079', 'activateMain'],
    ] as const)('OP14-091 On K.O. does not fire when trashed by %s', (sourceCardNumber, timing) => {
      const source = makeCharacterDef({
        cardDefinitionId: sourceCardNumber,
        cardNumber: sourceCardNumber,
        name: sourceCardNumber,
        category: 'character',
        basePower: sourceCardNumber === 'OP08-079' ? 10000 : 5000,
        baseCost: sourceCardNumber === 'OP08-079' ? 10 : 4,
      });
      const bentham = makeCharacterDef({
        cardDefinitionId: 'OP14-091',
        cardNumber: 'OP14-091',
        name: 'Mr.2.Bon.Kurei(Bentham)',
        category: 'character',
        types: ['Baroque Works'],
        basePower: 5000,
        baseCost: sourceCardNumber === 'OP07-091' ? 2 : 5,
      });
      const handCost = makeCharacterDef({ cardDefinitionId: nextTestId('hand-cost'), cardNumber: 'SYN-HAND-COST' });

      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
      let sourceId: string;
      let benthamId: string;
      let handCostId: string;
      ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { enteredPlayTurn: 3 }));
      ({ rig, instanceId: benthamId } = putCharacterInPlay(rig, 'p2', bentham));
      ({ rig, instanceId: handCostId } = putInHand(rig, 'p1', handCost));

      const registry = buildCuratedEffectRegistry(rig.defs);
      let result = runTimings(registry[sourceCardNumber], [timing], rig.state, sourceId, rig.defs, nextTestId(sourceCardNumber), registry);

      if (sourceCardNumber === 'OP08-079') {
        expect(result.pendingChoices[0]).toMatchObject({ kind: 'SELECT_CARDS' });
        result = resumeProgram(registry[sourceCardNumber], result.state, result.pendingChoices[0], [handCostId], rig.defs, nextTestId(sourceCardNumber), registry);
      }

      expect(result.pendingChoices[0]).toMatchObject({ kind: 'SELECT_CARDS' });
      result = resumeProgram(registry[sourceCardNumber], result.state, result.pendingChoices[0], [benthamId], rig.defs, nextTestId(sourceCardNumber), registry);

      expectTrashWithoutOnKo(result, benthamId);
      if (result.pendingChoices[0]?.kind === 'SELECT_CARDS') {
        result = resumeProgram(registry[sourceCardNumber], result.state, result.pendingChoices[0], [], rig.defs, nextTestId(sourceCardNumber), registry);
      }
      expect(result.state.pendingOnKoTriggers ?? []).toEqual([]);
      expect(result.log.some((entry) => entry.type === 'CHARACTER_KO')).toBe(false);
    });

    it('OP14-091 On K.O. is deferred, not dropped, while the parent K.O. effect waits on a follow-up choice', () => {
      const leaderAssignment: CardEffectAssignment = {
        cardNumber: 'SYN-LEADER-KO',
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [{
            fn: 'chooseOne',
            chooser: 'controller',
            prompt: 'K.O. 1 of your Characters?',
            options: [
              { label: 'skip', functions: [] },
              {
                label: 'pay',
                functions: [
                  { fn: 'ko', target: { group: 'characters', player: 'controller' }, maxTargets: 1 },
                  {
                    fn: 'addCost',
                    target: { group: 'characters', player: 'opponent' },
                    amount: -1,
                    duration: 'duringThisTurn',
                    optional: true,
                    ifPrevious: 'previousMovedAny',
                  },
                ],
              },
            ],
          }],
        },
      };
      const leader = makeLeaderDef({ cardDefinitionId: 'SYN-LEADER-KO', cardNumber: 'SYN-LEADER-KO', name: 'Own Leader', types: ['Baroque Works'] });
      const bentham = makeCharacterDef({
        cardDefinitionId: 'OP14-091',
        cardNumber: 'OP14-091',
        name: 'Mr.2.Bon.Kurei(Bentham)',
        category: 'character',
        types: ['Baroque Works'],
        basePower: 5000,
        baseCost: 5,
      });
      const opponent = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-COST', cardNumber: 'SYN-OPP-COST', baseCost: 3 });
      const playable = makeCharacterDef({
        cardDefinitionId: 'SYN-BW-PLAYABLE',
        cardNumber: 'SYN-BW-PLAYABLE',
        name: 'Mr.3',
        category: 'character',
        types: ['Baroque Works'],
        baseCost: 3,
        basePower: 4000,
      });

      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: leader });
      const leaderId = rig.state.players.p1.leaderInstanceId;
      let benthamId: string;
      ({ rig, instanceId: benthamId } = putCharacterInPlay(rig, 'p1', bentham));
      ({ rig } = putCharacterInPlay(rig, 'p2', opponent));
      const trashId = nextTestId('trash-bw');
      rig = {
        ...rig,
        defs: { ...rig.defs, [playable.cardDefinitionId]: playable },
        state: {
          ...rig.state,
          cardsById: {
            ...rig.state.cardsById,
            [trashId]: {
              instanceId: trashId,
              cardDefinitionId: playable.cardDefinitionId,
              ownerId: 'p1',
              controllerId: 'p1',
              currentZone: 'trash',
              orientation: null,
              faceState: 'faceUp',
              donAttached: [],
              appliedContinuousEffectIds: [],
              oncePerTurnUsed: [],
              summoningSick: false,
              revealedTo: 'all',
            },
          },
          players: {
            ...rig.state.players,
            p1: { ...rig.state.players.p1, trash: { ...rig.state.players.p1.trash, cardIds: [trashId] } },
          },
        },
      };
      const registry: Registry = { ...buildCuratedEffectRegistry(rig.defs), ...buildRegistryFromAssignments([leaderAssignment]) };

      let result = runTimings(registry['SYN-LEADER-KO'], ['activateMain'], rig.state, leaderId, rig.defs, nextTestId('leader-ko'), registry);
      result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], 1, rig.defs, nextTestId('leader-ko'), registry);
      result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [benthamId], rig.defs, nextTestId('leader-ko'), registry);
      expect(result.state.cardsById[benthamId]?.currentZone).toBe('trash');
      expect(result.state.pendingOnKoTriggers?.some((event) => event.targetInstanceId === benthamId)).toBe(true);

      result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [], rig.defs, nextTestId('leader-ko'), registry);
      if (result.pendingChoices.length === 0 && (result.state.pendingOnKoTriggers?.length ?? 0) > 0) {
        result = settleOnKoTriggers(result.state, registry, rig.defs, nextTestId('leader-ko'));
      }

      expect(result.pendingChoices.length).toBeGreaterThan(0);
      expect(result.pendingChoices[0]).toMatchObject({ sourceInstanceId: benthamId });
      expect(result.pendingChoices[0].prompt).toMatch(/Baroque Works|from:/i);
    });

    it('OP14-120 On K.O. can trash hand cost and replay itself after the parent K.O. effect resumes', () => {
      const leaderAssignment: CardEffectAssignment = {
        cardNumber: 'SYN-LEADER-KO',
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [{
            fn: 'chooseOne',
            chooser: 'controller',
            prompt: 'K.O. 1 of your Characters?',
            options: [
              { label: 'skip', functions: [] },
              {
                label: 'pay',
                functions: [
                  { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Baroque Works' } }, maxTargets: 1 },
                  {
                    fn: 'addCost',
                    target: { group: 'characters', player: 'opponent' },
                    amount: -1,
                    duration: 'duringThisTurn',
                    optional: true,
                    ifPrevious: 'previousMovedAny',
                  },
                ],
              },
            ],
          }],
        },
      };
      const leader = makeLeaderDef({ cardDefinitionId: 'SYN-LEADER-KO', cardNumber: 'SYN-LEADER-KO', name: 'Own Leader', types: ['Baroque Works'] });
      const crocodile = makeCharacterDef({
        cardDefinitionId: 'OP14-120',
        cardNumber: 'OP14-120',
        name: 'Crocodile',
        category: 'character',
        types: ['Baroque Works'],
        basePower: 9000,
        baseCost: 9,
      });
      const opponent = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-COST-2', cardNumber: 'SYN-OPP-COST-2', baseCost: 3 });
      const handCost = makeCharacterDef({ cardDefinitionId: 'SYN-HAND-COST-2', cardNumber: 'SYN-HAND-COST-2' });

      let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: leader });
      const leaderId = rig.state.players.p1.leaderInstanceId;
      let crocodileId: string;
      let handCostId: string;
      ({ rig, instanceId: crocodileId } = putCharacterInPlay(rig, 'p1', crocodile));
      ({ rig, instanceId: handCostId } = putInHand(rig, 'p1', handCost));
      ({ rig } = putCharacterInPlay(rig, 'p2', opponent));
      const registry: Registry = { ...buildCuratedEffectRegistry(rig.defs), ...buildRegistryFromAssignments([leaderAssignment]) };

      let result = runTimings(registry['SYN-LEADER-KO'], ['activateMain'], rig.state, leaderId, rig.defs, nextTestId('leader-ko'), registry);
      result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], 1, rig.defs, nextTestId('leader-ko'), registry);
      result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [crocodileId], rig.defs, nextTestId('leader-ko'), registry);
      expect(result.state.pendingOnKoTriggers?.some((event) => event.targetInstanceId === crocodileId)).toBe(true);

      result = resumeProgram(registry['SYN-LEADER-KO'], result.state, result.pendingChoices[0], [], rig.defs, nextTestId('leader-ko'), registry);
      if (result.pendingChoices.length === 0 && (result.state.pendingOnKoTriggers?.length ?? 0) > 0) {
        result = settleOnKoTriggers(result.state, registry, rig.defs, nextTestId('leader-ko'));
      }

      expect(result.pendingChoices[0]).toMatchObject({ sourceInstanceId: crocodileId });
      result = resumeProgram(registry['OP14-120'], result.state, result.pendingChoices[0], [handCostId], rig.defs, nextTestId('op14-120'), registry);

      const revivedIds = result.state.players.p1.characterArea.cardIds.filter((id) =>
        result.state.cardsById[id]?.cardDefinitionId === crocodile.cardDefinitionId
      );
      expect(revivedIds).toHaveLength(1);
      expect(revivedIds[0]).not.toBe(crocodileId);
    });
  });

  describe('ordered effect cascades', () => {
    it('OP16-108 continues from hand-trash into trash-to-Life top face-up during play', () => {
      const shiryu = makeCharacterDef({
        cardDefinitionId: 'OP16-108',
        cardNumber: 'OP16-108',
        name: 'Shiryu',
        category: 'character',
        colors: ['black'],
        types: ['Blackbeard Pirates'],
        baseCost: 6,
        basePower: 8000,
      });
      const blackbeardHand = makeCharacterDef({
        cardDefinitionId: nextTestId('bbp-hand'),
        cardNumber: 'TEST-BBP-HAND',
        name: 'Blackbeard Pirates Hand Card',
        category: 'character',
        baseCost: 6,
        types: ['Blackbeard Pirates'],
      });
      const tooExpensive = makeCharacterDef({
        cardDefinitionId: nextTestId('bbp-cost7'),
        cardNumber: 'TEST-BBP-COST7',
        name: 'Too Expensive Blackbeard Pirates Card',
        category: 'character',
        baseCost: 7,
        types: ['Blackbeard Pirates'],
      });
      const offType = makeCharacterDef({
        cardDefinitionId: nextTestId('off-trash'),
        cardNumber: 'TEST-OFF-TRASH',
        name: 'Off-Type Trash Card',
        category: 'character',
        baseCost: 1,
        types: ['Whitebeard Pirates'],
      });

      let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
      let shiryuId: string;
      let blackbeardHandId: string;
      let tooExpensiveId: string;
      let offTypeId: string;
      ({ rig, instanceId: shiryuId } = putInHand(rig, 'p1', shiryu));
      ({ rig, instanceId: blackbeardHandId } = putInHand(rig, 'p1', blackbeardHand));
      ({ rig, instanceId: tooExpensiveId } = putInHand(rig, 'p1', tooExpensive));
      ({ rig, instanceId: offTypeId } = putInHand(rig, 'p1', offType));
      const withDon = putDon(rig, 'p1', 6);
      rig = withDon.rig;

      const registry = buildCuratedEffectRegistry(rig.defs);
      const played = executeAction(
        rig.state,
        {
          type: 'PLAY_CHARACTER',
          actionId: nextTestId('action'),
          playerId: 'p1',
          handCardInstanceId: shiryuId,
          donInstanceIds: withDon.donIds,
        },
        rig.defs,
        registry,
      ).state;
      const trashChoice = played.pendingChoices[0];
      expect(trashChoice).toMatchObject({
        playerId: 'p1',
        kind: 'SELECT_CARDS',
        constraints: { min: 0, max: 1 },
      });
      expect(trashChoice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([blackbeardHandId, tooExpensiveId, offTypeId]));
      expect(trashChoice.constraints.candidateInstanceIds).not.toContain(shiryuId);

      const afterTrash = executeAction(
        played,
        {
          type: 'RESOLVE_PENDING_CHOICE',
          actionId: nextTestId('action'),
          playerId: 'p1',
          choiceId: trashChoice.id,
          response: [blackbeardHandId],
        },
        rig.defs,
        registry,
      ).state;
      const lifeChoice = afterTrash.pendingChoices[0];
      expect(lifeChoice).toMatchObject({
        playerId: 'p1',
        kind: 'SELECT_CARDS',
        constraints: { min: 0, max: 1 },
      });
      expect(lifeChoice.constraints.candidateInstanceIds).toContain(blackbeardHandId);
      expect(lifeChoice.constraints.candidateInstanceIds).not.toContain(tooExpensiveId);
      expect(lifeChoice.constraints.candidateInstanceIds).not.toContain(offTypeId);

      const afterLife = executeAction(
        afterTrash,
        {
          type: 'RESOLVE_PENDING_CHOICE',
          actionId: nextTestId('action'),
          playerId: 'p1',
          choiceId: lifeChoice.id,
          response: [blackbeardHandId],
        },
        rig.defs,
        registry,
      ).state;

      expect(afterLife.pendingChoices).toEqual([]);
      expect(afterLife.players.p1.lifeArea.cardIds[0]).toBe(blackbeardHandId);
      expect(afterLife.players.p1.trash.cardIds).not.toContain(blackbeardHandId);
      expect(afterLife.cardsById[blackbeardHandId]).toMatchObject({
        currentZone: 'lifeArea',
        faceState: 'faceUp',
        revealedTo: 'all',
      });
    });
  });

  it('OP16-080 and OP16-109 still lower from the reviewed assignment catalog', () => {
    const registry = buildRegistryFromAssignments(OP16_ASSIGNMENTS);

    expect(registry['OP16-080'].abilities.map((ability) => ability.timing)).toEqual(['onEnterPlay', 'onOpponentsAttack']);
    expect(registry['OP16-109'].abilities.map((ability) => ability.timing)).toEqual(['onKO', 'lifeTrigger']);
  });
});
