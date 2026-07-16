import { createPreGameState } from './src/engine/setup/createPreGameState';
import { executeChooseGoingFirst } from './src/engine/setup/applyChooseGoingFirst';
import { advanceStartOfGameEffects } from './src/engine/setup/advanceStartOfGameEffects';
import { makePlayerSetupInput, makeDeckOf } from './src/engine/setup/__tests__/fixtures';
import { buildRegistryFromAssignments } from './src/cards/effectTemplates/assembler';
import type { CardDefinition } from './src/engine/state/card';

const IMU_DEF: CardDefinition = {
  cardDefinitionId: 'OP13-079-def', name: 'Imu', category: 'leader', colors: ['black'], types: ['World Government'],
  basePower: 5000, text: '', life: 4, hasTrigger: false, hasRush: false, hasBlocker: false, hasDoubleAttack: false,
  isUnblockable: false, cardNumber: 'OP13-079',
};
const PLAIN_LEADER_DEF: CardDefinition = {
  cardDefinitionId: 'plain-leader-def', name: 'Plain Leader', category: 'leader', colors: ['red'], types: [],
  basePower: 5000, text: '', life: 5, hasTrigger: false, hasRush: false, hasBlocker: false, hasDoubleAttack: false,
  isUnblockable: false, cardNumber: 'PLAIN-LEADER',
};
const MARY_GEOISE_STAGE_DEF: CardDefinition = {
  cardDefinitionId: 'mary-geoise-stage-def', name: 'Mary Geoise', category: 'stage', colors: ['black'], types: ['Mary Geoise'],
  baseCost: 2, text: '', hasTrigger: false, hasRush: false, hasBlocker: false, hasDoubleAttack: false, isUnblockable: false,
  cardNumber: 'OP13-STAGE-TEST',
};
const OFF_TYPE_STAGE_DEF: CardDefinition = {
  cardDefinitionId: 'off-type-stage-def', name: 'Not Mary Geoise', category: 'stage', colors: ['red'], types: ['Some Other Type'],
  baseCost: 1, text: '', hasTrigger: false, hasRush: false, hasBlocker: false, hasDoubleAttack: false, isUnblockable: false,
  cardNumber: 'OP13-STAGE-OFFTYPE',
};

const registry = buildRegistryFromAssignments([{
  cardNumber: 'OP13-079', templateId: 'ability',
  params: { timing: 'startOfGame', functions: [{ fn: 'playStageFromDeck', filter: { category: 'stage', typeIncludes: 'Mary Geoise' }, maxTargets: 1 }] },
}]);
const defs = {
  [IMU_DEF.cardDefinitionId]: IMU_DEF,
  [PLAIN_LEADER_DEF.cardDefinitionId]: PLAIN_LEADER_DEF,
  [MARY_GEOISE_STAGE_DEF.cardDefinitionId]: MARY_GEOISE_STAGE_DEF,
  [OFF_TYPE_STAGE_DEF.cardDefinitionId]: OFF_TYPE_STAGE_DEF,
};

const p1 = makePlayerSetupInput('p1', { leader: IMU_DEF, deck: [...makeDeckOf(47), MARY_GEOISE_STAGE_DEF, OFF_TYPE_STAGE_DEF, OFF_TYPE_STAGE_DEF] });
const p2 = makePlayerSetupInput('p2', { leader: PLAIN_LEADER_DEF });

const pregame = createPreGameState(p1, p2, { decidingPlayerId: 'p1', rngState: { seed: 'imu-seed', cursor: 0 } });
if (!pregame.ok) throw new Error('bad pregame ' + pregame.reasons.join(';'));

const chosen = executeChooseGoingFirst(pregame.state, { type: 'CHOOSE_GOING_FIRST', actionId: 'a1', playerId: 'p1', goingFirst: true });
console.log('chosen.state.pendingChoices.length', chosen.state.pendingChoices.length);
console.log('startOfGameEffectQueue', chosen.state.setupState?.startOfGameEffectQueue);

const advanced = advanceStartOfGameEffects(chosen.state, defs, registry, 'a1');
console.log('advanced pendingChoices count', advanced.state.pendingChoices.length);
console.log(JSON.stringify(advanced.state.pendingChoices, null, 2));
