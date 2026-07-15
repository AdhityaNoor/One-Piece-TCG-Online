import type { Duration_V2, Zone_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameState } from '../state/game';
import type { ZoneId } from '../state/zone';
import type { EffectRuntimeSidecars_V2 } from './dispatcher_V2';

type DurationRecord_V2 = {
  sourceInstanceId: string;
  createdAtTurn: number;
  duration: Duration_V2;
};

const V2_TO_ENGINE_ZONE: Partial<Record<Zone_V2, ZoneId>> = {
  LEADER_AREA: 'leaderArea',
  CHARACTER_AREA: 'characterArea',
  STAGE_AREA: 'stageArea',
  COST_AREA: 'costArea',
  HAND: 'hand',
  DECK: 'deck',
  TRASH: 'trash',
  LIFE: 'lifeArea',
  DON_DECK: 'donDeck',
};

function sourceExistsOnBoard(state: GameState, sourceInstanceId: string): boolean {
  const source = state.cardsById[sourceInstanceId];
  return source?.currentZone === 'leaderArea' || source?.currentZone === 'characterArea' || source?.currentZone === 'stageArea';
}

function sourceIsInZone(state: GameState, sourceInstanceId: string, zone: Zone_V2): boolean {
  if (zone === 'ATTACHED_DON') {
    return Object.values(state.cardsById).some((card) => card.donAttached.includes(sourceInstanceId));
  }
  const engineZone = V2_TO_ENGINE_ZONE[zone];
  if (!engineZone) return false;
  return state.cardsById[sourceInstanceId]?.currentZone === engineZone;
}

function isDurationStillActive_V2(state: GameState, record: DurationRecord_V2): boolean {
  switch (record.duration.kind) {
    case 'INSTANT':
      return false;
    case 'THIS_BATTLE':
      return state.currentBattle !== null && state.turnNumber === record.createdAtTurn;
    case 'THIS_TURN':
    case 'UNTIL_END_OF_CURRENT_TURN':
      return state.turnNumber === record.createdAtTurn;
    case 'WHILE_SOURCE_VALID':
      return sourceExistsOnBoard(state, record.sourceInstanceId);
    case 'WHILE_SOURCE_IN_ZONE':
      return sourceIsInZone(state, record.sourceInstanceId, record.duration.zone);
    case 'WHILE_CONDITION':
    case 'UNTIL_END_OF_NEXT_TURN':
    case 'UNTIL_NEXT_REFRESH_PHASE':
    case 'PERMANENT':
      return true;
  }
}

function keepDurationRecords<T extends DurationRecord_V2>(state: GameState, records: T[]): T[] {
  return records.filter((record) => isDurationStillActive_V2(state, record));
}

export function pruneExpiredEffectRuntimeSidecars_V2(
  state: GameState,
  sidecars: EffectRuntimeSidecars_V2,
): EffectRuntimeSidecars_V2 {
  return {
    delayedEffects: keepDurationRecords(state, sidecars.delayedEffects),
    replacementEffects: keepDurationRecords(state, sidecars.replacementEffects),
    permissionEffects: keepDurationRecords(state, sidecars.permissionEffects),
    statModifiers: keepDurationRecords(state, sidecars.statModifiers),
    keywordModifiers: keepDurationRecords(state, sidecars.keywordModifiers),
    counterModifiers: keepDurationRecords(state, sidecars.counterModifiers),
    effectInvalidations: keepDurationRecords(state, sidecars.effectInvalidations),
    activatedEvents: sidecars.activatedEvents,
    choicePrompts: sidecars.choicePrompts,
    lookBuffers: sidecars.lookBuffers,
  };
}
