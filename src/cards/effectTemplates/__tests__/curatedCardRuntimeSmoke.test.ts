import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { GameAction } from '../../../engine/actions';
import { executeAction, validateAction } from '../../../engine/actions';
import type { PendingChoice } from '../../../engine/events/pendingChoice';
import type { Ability, AbilityCost, AbilityGate, EffectProgram, SearchFilter } from '../../../engine/effects/effectIr';
import { buildCuratedEffectRegistry, CURATED_EFFECT_PROGRAMS } from '../curatedPrograms';
import { computeCurrentCost } from '../../../engine/rules/shared/power';
import { donMinusCandidateIds, requiredDonMinusCount } from '../../../engine/effects';
import type { CardDefinition } from '../../../engine/state/card';
import type { GameState } from '../../../engine/state/game';
import type { CardDefinitionLookup } from '../../../engine/rules/shared';
import {
  buildBaseRig,
  makeCharacterDef,
  nextTestId,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putInHand,
  putLifeCards,
  putStageInPlay,
  type Rig,
} from '../../../engine/rules/shared/__tests__/testRig';

interface CatalogRow {
  definition?: CardDefinition;
}

interface RuntimeCase {
  cardNumber: string;
  abilityIndex: number;
  timing: Ability['timing'];
}

type RuntimeStatus = 'executed' | 'scenarioRejected' | 'registeredOnly';
interface RuntimeResult {
  status: RuntimeStatus;
  reasons: string[];
}

const ACTION_TIMINGS = new Set<Ability['timing']>([
  'activateMain',
  'counter',
  'onPlay',
  'whenAttacking',
  'onOpponentsAttack',
  'lifeTrigger',
]);

const UI_SUPPORTED_CHOICE_SOURCES = new Set([
  'ir',
  'rule:attackTrashTax',
  'rule:battleKoReplacement',
  'rule:characterAreaOverflow',
  'rule:lifeTrigger',
]);

function catalogSetsDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../public/cards/sets');
}

function loadCatalogDefinitions(): CardDefinition[] {
  const setsDir = catalogSetsDir();
  if (!existsSync(setsDir)) throw new Error(`Missing catalog sets directory: ${setsDir}`);

  const defs: CardDefinition[] = [];
  for (const file of readdirSync(setsDir).filter((name) => name.endsWith('.json'))) {
    const rows = JSON.parse(readFileSync(resolve(setsDir, file), 'utf8')) as CatalogRow[];
    if (!Array.isArray(rows)) continue;
    defs.push(...rows.flatMap((row) => row.definition ? [row.definition] : []));
  }
  return defs;
}

const CATALOG_DEFS = loadCatalogDefinitions();
const DEF_BY_CARD_NUMBER = new Map(CATALOG_DEFS.map((def) => [def.cardNumber, def]));

const RUNTIME_CASES: RuntimeCase[] = Object.entries(CURATED_EFFECT_PROGRAMS)
  .filter(([key, program]) => key === program.cardNumber)
  .flatMap(([cardNumber, program]) =>
    program.abilities.map((ability, abilityIndex) => ({
      cardNumber,
      abilityIndex,
      timing: ability.timing,
    })),
  );

const RUNTIME_RESULTS = new Map<string, RuntimeResult>();

function runtimeCaseKey(cardNumber: string, abilityIndex: number): string {
  return `${cardNumber}#${abilityIndex}`;
}

function cloneDefinition(def: CardDefinition): CardDefinition {
  return JSON.parse(JSON.stringify(def)) as CardDefinition;
}

function indexedDefs(defs: CardDefinition[]): CardDefinitionLookup {
  const lookup: CardDefinitionLookup = {};
  for (const def of defs) {
    lookup[def.cardDefinitionId] = def;
    lookup[def.cardNumber] = def;
  }
  return lookup;
}

function addDefs(rig: Rig, defs: CardDefinition[]): Rig {
  return { state: rig.state, defs: { ...rig.defs, ...indexedDefs(defs) } };
}

function attachDonTo(rig: Rig, playerId: 'p1' | 'p2', targetId: string, donIds: string[]): Rig {
  let costArea = rig.state.players[playerId].costArea;
  const cardsById = { ...rig.state.cardsById };
  for (const donId of donIds) {
    costArea = { ...costArea, cardIds: costArea.cardIds.filter((id) => id !== donId) };
    cardsById[donId] = { ...cardsById[donId], currentZone: 'characterArea', donRested: false };
  }
  cardsById[targetId] = {
    ...cardsById[targetId],
    donAttached: [...cardsById[targetId].donAttached, ...donIds],
  };
  return {
    state: {
      ...rig.state,
      cardsById,
      players: {
        ...rig.state.players,
        [playerId]: { ...rig.state.players[playerId], costArea },
      },
    },
    defs: rig.defs,
  };
}

function normalizeType(type: string): string {
  return type.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function typeIncludes(types: readonly string[] | undefined, wanted: string): boolean {
  const needle = normalizeType(wanted);
  return (types ?? []).some((type) => normalizeType(type).includes(needle) || needle.includes(normalizeType(type)));
}

function matchesFilter(def: CardDefinition, filter: SearchFilter | undefined, sourceDef: CardDefinition): boolean {
  if (!filter) return true;
  if (filter.anyOf?.length) {
    const siblingFilter = { ...filter, anyOf: undefined };
    return filter.anyOf.some((child) => matchesFilter(def, child, sourceDef) && matchesFilter(def, siblingFilter, sourceDef));
  }
  if (filter.category && def.category !== filter.category) return false;
  if (filter.color && !def.colors.includes(filter.color)) return false;
  if (filter.typeIncludes && !typeIncludes(def.types, filter.typeIncludes)) return false;
  if (filter.attribute && !(def.attributes ?? []).includes(filter.attribute)) return false;
  if (filter.name && def.name !== filter.name) return false;
  if (filter.excludeSelfName && def.name === sourceDef.name) return false;
  if (filter.excludeCardNames?.includes(def.name)) return false;
  if (filter.minCost !== undefined && (def.baseCost ?? 0) < filter.minCost) return false;
  if (filter.maxCost !== undefined && (def.baseCost ?? Infinity) > filter.maxCost) return false;
  if (filter.exactCost !== undefined && (def.baseCost ?? -1) !== filter.exactCost) return false;
  if (filter.minPower !== undefined && (def.basePower ?? 0) < filter.minPower) return false;
  if (filter.maxPower !== undefined && (def.basePower ?? Infinity) > filter.maxPower) return false;
  if (filter.exactPower !== undefined && (def.basePower ?? -1) !== filter.exactPower) return false;
  if (filter.minBasePower !== undefined && (def.basePower ?? 0) < filter.minBasePower) return false;
  if (filter.maxBasePower !== undefined && (def.basePower ?? Infinity) > filter.maxBasePower) return false;
  if (filter.exactBasePower !== undefined && (def.basePower ?? -1) !== filter.exactBasePower) return false;
  if (filter.hasTrigger !== undefined && !!def.hasTrigger !== filter.hasTrigger) return false;
  if (filter.noBaseEffect && def.text.trim().length > 0) return false;
  return true;
}

function filtersFromAbility(ability: Ability): SearchFilter[] {
  return ability.ops.flatMap((op) => {
    if ('filter' in op && op.filter) return [op.filter];
    if (op.op === 'chooseTargets') {
      const from = op.from;
      if ('filter' in from && from.filter) return [from.filter];
    }
    return [];
  });
}

function matchingCatalogDefs(sourceDef: CardDefinition, ability: Ability): CardDefinition[] {
  const filters = filtersFromAbility(ability);
  const matches = filters.flatMap((filter) => CATALOG_DEFS.filter((candidate) => matchesFilter(candidate, filter, sourceDef)).slice(0, 3));
  return [...new Map(matches.map((def) => [def.cardNumber, def])).values()];
}

function addScenarioCards(rig: Rig, sourceDef: CardDefinition, ability: Ability): Rig {
  const sourceTypes = sourceDef.types ?? [];
  const sourceColor = sourceDef.colors[0] ?? 'red';
  const typedAlly = makeCharacterDef({
    cardDefinitionId: 'SMOKE-TYPED-ALLY',
    cardNumber: 'SMOKE-TYPED-ALLY',
    name: 'Smoke Typed Ally',
    colors: [sourceColor],
    types: sourceTypes.length ? [sourceTypes[0]] : ['Straw Hat Crew'],
    baseCost: 2,
    basePower: 4000,
    attributes: sourceDef.attributes,
  });
  const genericEvent = {
    ...makeCharacterDef({
      cardDefinitionId: 'SMOKE-EVENT',
      cardNumber: 'SMOKE-EVENT',
      name: 'Smoke Event',
      colors: [sourceColor],
      types: sourceTypes,
      baseCost: 1,
      basePower: 0,
    }),
    category: 'event' as const,
  };
  const genericStage = {
    ...makeCharacterDef({
      cardDefinitionId: 'SMOKE-STAGE',
      cardNumber: 'SMOKE-STAGE',
      name: 'Smoke Stage',
      colors: [sourceColor],
      types: sourceTypes,
      baseCost: 1,
      basePower: 0,
    }),
    category: 'stage' as const,
  };

  const catalogMatches = matchingCatalogDefs(sourceDef, ability);
  rig = addDefs(rig, [sourceDef, typedAlly, genericEvent, genericStage, ...catalogMatches]);

  for (const def of [typedAlly, ...catalogMatches.filter((candidate) => candidate.category === 'character').slice(0, 3)]) {
    ({ rig } = putCharacterInPlay(rig, 'p1', def, { orientation: 'rested', summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p2', def, { orientation: 'rested', summoningSick: false }));
  }
  ({ rig } = putStageInPlay(rig, 'p1', genericStage));
  ({ rig } = putStageInPlay(rig, 'p2', genericStage));

  for (const def of [typedAlly, genericEvent, genericStage, ...catalogMatches].slice(0, 12)) {
    ({ rig } = putInHand(rig, 'p1', def));
    ({ rig } = putInHand(rig, 'p2', def));
    ({ rig } = putDeckCards(rig, 'p1', def, 1));
    ({ rig } = putDeckCards(rig, 'p2', def, 1));
  }
  ({ rig } = putLifeCards(rig, 'p1', [typedAlly, genericEvent]));
  ({ rig } = putLifeCards(rig, 'p2', [typedAlly, genericEvent]));

  return rig;
}

function costAreaIds(state: GameState, playerId: 'p1' | 'p2', count: number): string[] {
  return state.players[playerId].costArea.cardIds
    .filter((id) => state.cardsById[id]?.donRested === false)
    .slice(0, count);
}

function abilityDonCostIds(state: GameState, playerId: 'p1' | 'p2', ability: Ability): string[] {
  const required = requiredDonMinusCount(ability.cost ?? []);
  return required > 0 ? donMinusCandidateIds(state, playerId, ability.cost ?? []).slice(0, required) : [];
}

function prepareCostContext(rig: Rig, playerId: 'p1' | 'p2', sourceId: string, ability: Ability): Rig {
  const costs = ability.cost ?? [];
  const requiredReturnGiven = costs
    .filter((cost): cost is Extract<AbilityCost, { kind: 'returnGivenDon' }> => cost.kind === 'returnGivenDon')
    .reduce((sum, cost) => sum + cost.count, 0);
  if (requiredReturnGiven > 0) {
    const available = rig.state.players[playerId].costArea.cardIds.filter((id) => !rig.state.cardsById[id]?.donRested).slice(0, requiredReturnGiven);
    rig = attachDonTo(rig, playerId, sourceId, available);
  }
  return rig;
}

function flattenGates(gates: readonly AbilityGate[] = []): AbilityGate[] {
  return gates.flatMap((gate) => {
    if (gate.kind === 'anyOf' || gate.kind === 'noneOf') return flattenGates(gate.gates);
    return [gate];
  });
}

function gatesForAbility(ability: Ability): AbilityGate[] {
  return [
    ...flattenGates(ability.gate),
    ...flattenGates(ability.condition?.gate),
    ...ability.ops.flatMap((op) => [
      ...flattenGates(op.ifGate),
      ...('condition' in op ? flattenGates(op.condition?.gate) : []),
    ]),
  ];
}

function abilityHasExplicitAvailabilityGate(ability: Ability): boolean {
  return !!(
    ability.gate?.length ||
    ability.condition?.gate?.length ||
    ability.condition?.donAttachedAtLeast !== undefined ||
    ability.condition?.turn !== undefined
  );
}

function scenarioRejectIsAvailabilityGate(reasons: readonly string[]): boolean {
  const joined = reasons.join(' ');
  return joined.includes('its "If') || joined.includes('its activation condition') || joined.includes('the required attribute');
}

function updateLeaderDef(rig: Rig, playerId: 'p1' | 'p2', patch: Partial<CardDefinition>): Rig {
  const leaderId = rig.state.players[playerId].leaderInstanceId;
  const leader = rig.state.cardsById[leaderId];
  const current = rig.defs[leader.cardDefinitionId];
  const nextDef = { ...current, ...patch };
  return { state: rig.state, defs: { ...rig.defs, [nextDef.cardDefinitionId]: nextDef, [nextDef.cardNumber]: nextDef } };
}

function setOrientation(rig: Rig, instanceId: string, orientation: 'active' | 'rested'): Rig {
  const instance = rig.state.cardsById[instanceId];
  return {
    state: { ...rig.state, cardsById: { ...rig.state.cardsById, [instanceId]: { ...instance, orientation } } },
    defs: rig.defs,
  };
}

function trimZone(rig: Rig, playerId: 'p1' | 'p2', zone: 'hand' | 'lifeArea' | 'characterArea', max: number, keepId?: string): Rig {
  const player = rig.state.players[playerId];
  const currentIds = player[zone].cardIds;
  const kept = keepId && currentIds.includes(keepId) ? [keepId] : [];
  const nextIds = [...kept, ...currentIds.filter((id) => id !== keepId).slice(0, Math.max(0, max - kept.length))];
  const removed = new Set(currentIds.filter((id) => !nextIds.includes(id)));
  const cardsById = { ...rig.state.cardsById };
  for (const id of removed) cardsById[id] = { ...cardsById[id], currentZone: 'trash', revealedTo: 'all' };
  return {
    state: {
      ...rig.state,
      cardsById,
      players: { ...rig.state.players, [playerId]: { ...player, [zone]: { ...player[zone], cardIds: nextIds } } },
    },
    defs: rig.defs,
  };
}

function ensureLifeCount(rig: Rig, playerId: 'p1' | 'p2', count: number): Rig {
  if (rig.state.players[playerId].lifeArea.cardIds.length >= count) return rig;
  const filler = makeCharacterDef({ cardDefinitionId: `SMOKE-LIFE-${playerId}-${count}`, cardNumber: `SMOKE-LIFE-${playerId}-${count}` });
  return putLifeCards(rig, playerId, Array.from({ length: count - rig.state.players[playerId].lifeArea.cardIds.length }, () => filler)).rig;
}

function ensureHandCount(rig: Rig, playerId: 'p1' | 'p2', count: number): Rig {
  if (rig.state.players[playerId].hand.cardIds.length >= count) return rig;
  const filler = makeCharacterDef({ cardDefinitionId: `SMOKE-HAND-${playerId}-${count}`, cardNumber: `SMOKE-HAND-${playerId}-${count}` });
  let next = rig;
  while (next.state.players[playerId].hand.cardIds.length < count) ({ rig: next } = putInHand(next, playerId, filler));
  return next;
}

function ensureRestedDonCount(rig: Rig, playerId: 'p1' | 'p2', count: number): Rig {
  let next = rig;
  const rested = next.state.players[playerId].costArea.cardIds.filter((id) => next.state.cardsById[id]?.donRested).length;
  if (rested >= count) return next;
  ({ rig: next } = putDon(next, playerId, count - rested, { rested: true }));
  return next;
}

function ensureCharacterCount(rig: Rig, playerId: 'p1' | 'p2', count: number, sourceDef: CardDefinition): Rig {
  let next = rig;
  while (next.state.players[playerId].characterArea.cardIds.length < count) {
    ({ rig: next } = putCharacterInPlay(next, playerId, makeCharacterDef({
      cardDefinitionId: `SMOKE-CHAR-${playerId}-${next.state.players[playerId].characterArea.cardIds.length}`,
      cardNumber: `SMOKE-CHAR-${playerId}-${next.state.players[playerId].characterArea.cardIds.length}`,
      colors: sourceDef.colors,
      types: sourceDef.types,
      baseCost: 5,
      basePower: 7000,
    }), { orientation: 'rested', summoningSick: false }));
  }
  return next;
}

function satisfyGateScenario(rig: Rig, playerId: 'p1' | 'p2', sourceId: string, ability: Ability, sourceDef: CardDefinition): Rig {
  let next = rig;
  const opponentId = playerId === 'p1' ? 'p2' : 'p1';
  for (const gate of gatesForAbility(ability)) {
    switch (gate.kind) {
      case 'leaderName':
        next = updateLeaderDef(next, playerId, { name: gate.name });
        break;
      case 'leaderNameIncludes':
        next = updateLeaderDef(next, playerId, { name: `Smoke ${gate.name} Leader` });
        break;
      case 'leaderType':
        next = updateLeaderDef(next, playerId, { types: [gate.type] });
        break;
      case 'leaderColor':
        next = updateLeaderDef(next, playerId, { colors: [gate.color] });
        break;
      case 'leaderAttribute':
        next = updateLeaderDef(next, playerId, { attributes: [gate.attribute] });
        break;
      case 'opponentLeaderAttribute':
        next = updateLeaderDef(next, opponentId, { attributes: [gate.attribute] });
        break;
      case 'leaderMulticolor':
        next = updateLeaderDef(next, playerId, { colors: ['red', 'green'] });
        break;
      case 'leaderRested':
        next = setOrientation(next, next.state.players[playerId].leaderInstanceId, 'rested');
        break;
      case 'leaderActive':
        next = setOrientation(next, next.state.players[playerId].leaderInstanceId, 'active');
        break;
      case 'selfLife':
        if (gate.atMost !== undefined) next = trimZone(next, playerId, 'lifeArea', gate.atMost);
        if (gate.atLeast !== undefined) next = ensureLifeCount(next, playerId, gate.atLeast);
        break;
      case 'opponentLife':
        if (gate.atMost !== undefined) next = trimZone(next, opponentId, 'lifeArea', gate.atMost);
        if (gate.atLeast !== undefined) next = ensureLifeCount(next, opponentId, gate.atLeast);
        break;
      case 'selfHand':
        if (gate.atMost !== undefined) next = trimZone(next, playerId, 'hand', gate.atMost, sourceId);
        if (gate.atLeast !== undefined) next = ensureHandCount(next, playerId, gate.atLeast);
        break;
      case 'opponentHand':
        if (gate.atMost !== undefined) next = trimZone(next, opponentId, 'hand', gate.atMost);
        if (gate.atLeast !== undefined) next = ensureHandCount(next, opponentId, gate.atLeast);
        break;
      case 'selfCharacterCount':
        if (gate.atMost !== undefined) next = trimZone(next, playerId, 'characterArea', gate.atMost, sourceId);
        if (gate.atLeast !== undefined) next = ensureCharacterCount(next, playerId, gate.atLeast, sourceDef);
        break;
      case 'opponentCharacterCount':
        if (gate.atMost !== undefined) next = trimZone(next, opponentId, 'characterArea', gate.atMost);
        if (gate.atLeast !== undefined) next = ensureCharacterCount(next, opponentId, gate.atLeast, sourceDef);
        break;
      case 'selfRestedCharacterCount':
        next = ensureCharacterCount(next, playerId, gate.atLeast ?? 0, sourceDef);
        for (const id of next.state.players[playerId].characterArea.cardIds.filter((id) => id !== sourceId).slice(0, gate.atLeast ?? 0)) {
          next = setOrientation(next, id, 'rested');
        }
        break;
      case 'opponentRestedCharacterCount':
        next = ensureCharacterCount(next, opponentId, gate.atLeast ?? 0, sourceDef);
        for (const id of next.state.players[opponentId].characterArea.cardIds.slice(0, gate.atLeast ?? 0)) next = setOrientation(next, id, 'rested');
        break;
      case 'selfRestedDonCount':
        next = ensureRestedDonCount(next, playerId, gate.atLeast ?? 0);
        break;
      case 'opponentRestedCardCount':
        next = ensureRestedDonCount(next, opponentId, gate.atLeast ?? 0);
        break;
      case 'selfPlayedThisTurn': {
        const source = next.state.cardsById[sourceId];
        next = { state: { ...next.state, cardsById: { ...next.state.cardsById, [sourceId]: { ...source, enteredPlayTurn: next.state.turnNumber } } }, defs: next.defs };
        break;
      }
      case 'selfInstancePowerAtLeast': {
        const source = next.state.cardsById[sourceId];
        next = { state: { ...next.state, cardsById: { ...next.state.cardsById, [sourceId]: { ...source, currentPower: Math.max(source.currentPower ?? 0, gate.power) } } }, defs: next.defs };
        break;
      }
    }
  }
  if (ability.condition?.donAttachedAtLeast) {
    const needed = ability.condition.donAttachedAtLeast - (next.state.cardsById[sourceId]?.donAttached.length ?? 0);
    const available = next.state.players[playerId].costArea.cardIds.filter((id) => !next.state.cardsById[id]?.donRested).slice(0, Math.max(0, needed));
    if (available.length > 0) next = attachDonTo(next, playerId, sourceId, available);
  }
  if (ability.timing === 'whenAttacking') next = setOrientation(next, sourceId, 'active');
  return next;
}

function buildSourceRig(def: CardDefinition, ability: Ability): { rig: Rig; sourceId: string | null; playerId: 'p1' | 'p2' } {
  const playerId = ability.timing === 'onOpponentsAttack' || ability.timing === 'counter' ? 'p2' : 'p1';
  let rig = buildBaseRig({
    activePlayerId: 'p1',
    phase: 'main',
    turnNumber: 5,
    leaderOverridesP1: def.category === 'leader' ? cloneDefinition(def) : undefined,
    leaderOverridesP2: ability.timing === 'onOpponentsAttack' && def.category === 'leader' ? cloneDefinition(def) : undefined,
  });
  rig = addDefs(rig, CATALOG_DEFS);
  ({ rig } = putDon(rig, 'p1', 10));
  ({ rig } = putDon(rig, 'p2', 10));
  rig = addScenarioCards(rig, def, ability);

  if (def.category === 'leader') {
    const sourceId = playerId === 'p1' ? rig.state.players.p1.leaderInstanceId : rig.state.players.p2.leaderInstanceId;
    const gated = satisfyGateScenario(rig, playerId, sourceId, ability, def);
    return { rig: prepareCostContext(gated, playerId, sourceId, ability), sourceId, playerId };
  }
  if (ability.timing === 'onPlay' || ability.timing === 'counter' || (ability.timing === 'activateMain' && def.category === 'event') || ability.timing === 'lifeTrigger') {
    const placed = ability.timing === 'lifeTrigger' ? putLifeCards(rig, playerId, [def]) : putInHand(rig, playerId, def);
    const sourceId = placed.lifeIds?.[0] ?? placed.instanceId;
    const gated = satisfyGateScenario(placed.rig, playerId, sourceId, ability, def);
    return { rig: prepareCostContext(gated, playerId, sourceId, ability), sourceId, playerId };
  }
  if (def.category === 'character') {
    const placed = putCharacterInPlay(rig, playerId, def, { orientation: 'active', summoningSick: false });
    const gated = satisfyGateScenario(placed.rig, playerId, placed.instanceId, ability, def);
    return { rig: prepareCostContext(gated, playerId, placed.instanceId, ability), sourceId: placed.instanceId, playerId };
  }
  if (def.category === 'stage') {
    const placed = putStageInPlay(rig, playerId, def);
    const gated = satisfyGateScenario(placed.rig, playerId, placed.instanceId, ability, def);
    return { rig: prepareCostContext(gated, playerId, placed.instanceId, ability), sourceId: placed.instanceId, playerId };
  }
  if (def.category === 'event') {
    const placed = putInHand(rig, playerId, def);
    const gated = satisfyGateScenario(placed.rig, playerId, placed.instanceId, ability, def);
    return { rig: prepareCostContext(gated, playerId, placed.instanceId, ability), sourceId: placed.instanceId, playerId };
  }
  return { rig, sourceId: null, playerId };
}

function pendingChoicesAreUiSupported(state: GameState, choices: readonly PendingChoice[]): void {
  for (const choice of choices) {
    const sourceEffectId = choice.sourceEffectId;
    const supported = sourceEffectId?.startsWith('v2:') || (sourceEffectId !== null && UI_SUPPORTED_CHOICE_SOURCES.has(sourceEffectId));
    expect(supported, `PendingChoice '${choice.id}' has no match UI support for sourceEffectId '${sourceEffectId}'`).toBe(true);
    expect(JSON.parse(JSON.stringify(choice)), `PendingChoice '${choice.id}' must stay serializable`).toEqual(choice);

    for (const id of choice.constraints.candidateInstanceIds ?? []) {
      expect(state.cardsById[id], `PendingChoice '${choice.id}' candidate '${id}' does not exist in state`).toBeDefined();
    }
    for (const id of choice.constraints.visibleInstanceIds ?? []) {
      expect(state.cardsById[id], `PendingChoice '${choice.id}' visible card '${id}' does not exist in state`).toBeDefined();
    }
  }
}

function scenarioRejectIsExpected(reasons: readonly string[]): boolean {
  const joined = reasons.join(' ');
  return [
    'condition isn',
    'requires',
    'Cost requires',
    'not enough',
    'cannot attack',
    'is active',
    'has no',
    'must be active',
    'already rested',
    'only usable during',
    'Only the defending player',
    'does not have the required attribute',
  ].some((snippet) => joined.includes(snippet));
}

function runtimeActionFor(def: CardDefinition, ability: Ability, sourceId: string, rig: Rig, playerId: 'p1' | 'p2'): GameAction | null {
  const state = rig.state;
  const actionId = nextTestId(`smoke-${def.cardNumber}-${ability.timing}`);
  if (ability.timing === 'activateMain') {
    if (def.category === 'event') {
      const playCost = computeCurrentCost(rig.defs, state, sourceId, buildCuratedEffectRegistry(rig.defs));
      return {
        type: 'ACTIVATE_EVENT_MAIN',
        actionId,
        playerId,
        handCardInstanceId: sourceId,
        donInstanceIds: costAreaIds(state, playerId, playCost),
        abilityCostDonInstanceIds: abilityDonCostIds(state, playerId, ability),
      };
    }
    return {
      type: 'ACTIVATE_CARD_EFFECT',
      actionId,
      playerId,
      sourceInstanceId: sourceId,
      effectId: 'activateMain',
      donInstanceIds: abilityDonCostIds(state, playerId, ability),
    };
  }
  if (ability.timing === 'onPlay') {
    const playCost = computeCurrentCost(rig.defs, state, sourceId, buildCuratedEffectRegistry(rig.defs));
    if (def.category === 'character') {
      return { type: 'PLAY_CHARACTER', actionId, playerId, handCardInstanceId: sourceId, donInstanceIds: costAreaIds(state, playerId, playCost) };
    }
    if (def.category === 'stage') {
      return { type: 'PLAY_STAGE', actionId, playerId, handCardInstanceId: sourceId, donInstanceIds: costAreaIds(state, playerId, playCost) };
    }
  }
  if (ability.timing === 'whenAttacking') {
    return {
      type: 'DECLARE_ATTACK',
      actionId,
      playerId: 'p1',
      attackerInstanceId: sourceId,
      targetInstanceId: state.players.p2.leaderInstanceId,
    };
  }
  if (ability.timing === 'onOpponentsAttack') {
    return {
      type: 'ACTIVATE_ON_OPPONENTS_ATTACK',
      actionId,
      playerId: 'p2',
      sourceInstanceId: sourceId,
      effectId: 'onOpponentsAttack',
      donInstanceIds: abilityDonCostIds(state, 'p2', ability),
    };
  }
  if (ability.timing === 'lifeTrigger') {
    return {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId,
      playerId,
      choiceId: `${sourceId}__synthetic-life-trigger`,
      response: [sourceId],
    };
  }
  if (ability.timing === 'counter') {
    const playCost = computeCurrentCost(rig.defs, state, sourceId, buildCuratedEffectRegistry(rig.defs));
    return {
      type: 'ACTIVATE_COUNTER_EVENT',
      actionId,
      playerId: 'p2',
      handCardInstanceId: sourceId,
      donInstanceIds: costAreaIds(state, 'p2', playCost),
      abilityCostDonInstanceIds: abilityDonCostIds(state, 'p2', ability),
    };
  }
  return null;
}

function withOpponentAttackWindow(rig: Rig, ability?: Ability): Rig {
  const attackerDef = makeCharacterDef({
    cardDefinitionId: 'SMOKE-ATTACKER',
    cardNumber: 'SMOKE-ATTACKER',
    name: 'Smoke Attacker',
    baseCost: 1,
    basePower: 5000,
    attributes: ability?.battlingOpponentAttribute ? [ability.battlingOpponentAttribute] : ['Strike'],
  });
  const placed = putCharacterInPlay(rig, 'p1', attackerDef, { orientation: 'active', summoningSick: false });
  const registry = buildCuratedEffectRegistry(placed.rig.defs);
  const action: GameAction = {
    type: 'DECLARE_ATTACK',
    actionId: nextTestId('smoke-open-battle'),
    playerId: 'p1',
    attackerInstanceId: placed.instanceId,
    targetInstanceId: placed.rig.state.players.p2.leaderInstanceId,
  };
  const result = executeAction(placed.rig.state, action, placed.rig.defs, registry);
  if (!result.state.currentBattle) return { state: result.state, defs: placed.rig.defs };
  return {
    state: {
      ...result.state,
      currentBattle: { ...result.state.currentBattle, step: 'block' },
      pendingChoices: [],
    },
    defs: placed.rig.defs,
  };
}

function withCounterStepWindow(rig: Rig): Rig {
  const battleRig = withOpponentAttackWindow(rig);
  if (!battleRig.state.currentBattle) return battleRig;
  return {
    state: {
      ...battleRig.state,
      currentBattle: { ...battleRig.state.currentBattle, step: 'counter' },
      pendingChoices: [],
    },
    defs: battleRig.defs,
  };
}

function withSyntheticLifeTriggerChoice(rig: Rig, sourceId: string, playerId: 'p1' | 'p2'): Rig {
  const choice: PendingChoice = {
    id: `${sourceId}__synthetic-life-trigger`,
    playerId,
    kind: 'YES_NO',
    prompt: 'Activate this Life Trigger?',
    constraints: { min: 0, max: 1 },
    sourceInstanceId: sourceId,
    sourceEffectId: 'rule:lifeTrigger',
  };
  return { state: { ...rig.state, pendingChoices: [choice] }, defs: rig.defs };
}

function exerciseRuntimeCase(cardNumber: string, abilityIndex: number): RuntimeResult {
  const key = runtimeCaseKey(cardNumber, abilityIndex);
  const cached = RUNTIME_RESULTS.get(key);
  if (cached) return cached;

  const done = (result: RuntimeResult): RuntimeResult => {
    RUNTIME_RESULTS.set(key, result);
    return result;
  };

  const def = DEF_BY_CARD_NUMBER.get(cardNumber);
  expect(def, `${cardNumber} is curated but missing catalog definition`).toBeDefined();
  const program: EffectProgram | undefined = CURATED_EFFECT_PROGRAMS[cardNumber];
  expect(program, `${cardNumber} is missing curated program`).toBeDefined();
  const ability = program!.abilities[abilityIndex];
  expect(ability, `${cardNumber} ability[${abilityIndex}] missing`).toBeDefined();
  expect(ability.ops.length, `${cardNumber} ability[${abilityIndex}] has no primitive ops`).toBeGreaterThan(0);

  const { rig: baseRig, sourceId, playerId } = buildSourceRig(def!, ability);
  expect(sourceId, `${cardNumber} ability[${abilityIndex}] has no source placement for ${ability.timing}`).toBeTruthy();
  const registry = buildCuratedEffectRegistry(baseRig.defs);
  const resolved = registry[def!.cardDefinitionId] ?? registry[def!.cardNumber];
  expect(resolved, `${cardNumber} did not bind into registry for runtime smoke`).toBe(program);

  if (!ACTION_TIMINGS.has(ability.timing)) {
    return done({ status: 'registeredOnly', reasons: [`timing ${ability.timing} is reactive/automatic and is registry-smoked only`] });
  }

  let rig = baseRig;
  if (ability.timing === 'onOpponentsAttack') rig = withOpponentAttackWindow(rig, ability);
  if (ability.timing === 'counter') rig = withCounterStepWindow(rig);
  if (ability.timing === 'lifeTrigger') rig = withSyntheticLifeTriggerChoice(rig, sourceId!, playerId);

  const action = runtimeActionFor(def!, ability, sourceId!, rig, playerId);
  if (!action) return done({ status: 'registeredOnly', reasons: [`no generic action for ${def!.category}/${ability.timing}`] });

  const validation = validateAction(rig.state, action, rig.defs, registry);
  if (!validation.legal) {
    expect(scenarioRejectIsExpected(validation.reasons), `${cardNumber} ${ability.timing} rejected unexpectedly: ${validation.reasons.join('; ')}`).toBe(true);
    return done({ status: 'scenarioRejected', reasons: validation.reasons });
  }

  const result = executeAction(rig.state, action, rig.defs, registry);
  expect(result.state, `${cardNumber} ${ability.timing} did not return next state`).toBeDefined();
  expect(JSON.parse(JSON.stringify(result.state.pendingChoices)), `${cardNumber} pending choices must be serializable`).toEqual(result.state.pendingChoices);
  pendingChoicesAreUiSupported(result.state, result.pendingChoices);
  pendingChoicesAreUiSupported(result.state, result.state.pendingChoices);
  return done({ status: 'executed', reasons: [] });
}

describe('curated card runtime smoke coverage', () => {
  it.each(RUNTIME_CASES)('$cardNumber ability[$abilityIndex] $timing resolves through registry, gates, engine dispatch, and UI-supported prompts', ({ cardNumber, abilityIndex }) => {
    const result = exerciseRuntimeCase(cardNumber, abilityIndex);
    expect(['executed', 'scenarioRejected', 'registeredOnly']).toContain(result.status);
  });

  it('executes every ungated direct player-action ability through the generated runtime scenario', () => {
    const failures = RUNTIME_CASES.flatMap((runtimeCase) => {
      if (!ACTION_TIMINGS.has(runtimeCase.timing)) return [];
      const program = CURATED_EFFECT_PROGRAMS[runtimeCase.cardNumber];
      const ability = program?.abilities[runtimeCase.abilityIndex];
      if (!ability || abilityHasExplicitAvailabilityGate(ability)) return [];
      const result = exerciseRuntimeCase(runtimeCase.cardNumber, runtimeCase.abilityIndex);
      if (result.status === 'executed') return [];
      return [`${runtimeCase.cardNumber} ability[${runtimeCase.abilityIndex}] ${runtimeCase.timing}: ${result.status} - ${result.reasons.join('; ')}`];
    });

    expect(
      failures.slice(0, 80),
      `Ungated direct player-action curated abilities must be executable in the generated runtime scenario. Total failures: ${failures.length}`,
    ).toEqual([]);
  });

  it('treats gated direct player-action rejections as expected negative validation only when the gate is explicit', () => {
    const failures = RUNTIME_CASES.flatMap((runtimeCase) => {
      if (!ACTION_TIMINGS.has(runtimeCase.timing)) return [];
      const program = CURATED_EFFECT_PROGRAMS[runtimeCase.cardNumber];
      const ability = program?.abilities[runtimeCase.abilityIndex];
      if (!ability || !abilityHasExplicitAvailabilityGate(ability)) return [];
      const result = exerciseRuntimeCase(runtimeCase.cardNumber, runtimeCase.abilityIndex);
      if (result.status === 'executed') return [];
      if (result.status === 'scenarioRejected' && scenarioRejectIsAvailabilityGate(result.reasons)) return [];
      return [`${runtimeCase.cardNumber} ability[${runtimeCase.abilityIndex}] ${runtimeCase.timing}: ${result.status} - ${result.reasons.join('; ')}`];
    });

    expect(
      failures.slice(0, 80),
      `Gated direct player-action abilities may reject only for explicit availability gates. Total failures: ${failures.length}`,
    ).toEqual([]);
  });
});
