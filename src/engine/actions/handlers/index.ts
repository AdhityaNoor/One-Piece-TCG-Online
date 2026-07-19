/**
 * Barrel for every generic-action handler (one module per GameActionType
 * that has real, executable behavior this milestone). Mirrors the
 * rules/battle/index.ts barrel pattern. dispatch.ts imports exclusively
 * from here rather than reaching into individual handler files.
 */
export * from './playCharacter';
export * from './playStage';
export * from './activateEventMain';
export * from './giveDon';
export * from './returnGivenDon';
export * from './endMainPhase';
export * from './resolvePendingChoice';
export * from './concede';
export * from './timeoutLoss';
export * from './activateCardEffect';
export * from './activateCounterEvent';
