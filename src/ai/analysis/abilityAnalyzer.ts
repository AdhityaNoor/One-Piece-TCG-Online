import type { Ability, EffectOp } from '../../engine/effects/effectIr';
import type { CardStrategicProfile, StrategicTag } from '../strategy/types';
import { TIMING_REALIZATION } from '../strategy/types';

export function emptyProfile(): CardStrategicProfile {
  return {
    immediateValue: 0,
    boardDevelopment: 0,
    cardAdvantage: 0,
    removalValue: 0,
    tempoValue: 0,
    defensiveValue: 0,
    offensiveValue: 0,
    resourceAcceleration: 0,
    resourceDenial: 0,
    recursionValue: 0,
    searchValue: 0,
    comboPotential: 0,
    engineValue: 0,
    finisherValue: 0,
    futureValue: 0,
    setupTags: [],
    payoffTags: [],
    synergyRequirements: [],
    enables: [],
  };
}

function addTag(tags: StrategicTag[], tag: StrategicTag): void {
  if (!tags.includes(tag)) tags.push(tag);
}

export function accumulateOpProfile(profile: CardStrategicProfile, op: EffectOp, factor = 1): void {
  const f = factor;
  switch (op.op) {
    case 'draw':
    case 'drawUntilHandCount':
      profile.cardAdvantage += f * (op.op === 'draw' ? op.amount * 7 : 10);
      profile.immediateValue += f * 5;
      addTag(profile.payoffTags, 'engine');
      break;
    case 'addDonFromDeck':
      profile.resourceAcceleration += f * op.count * 8;
      profile.engineValue += f * op.count * 6;
      addTag(profile.setupTags, 'engine');
      break;
    case 'giveDon':
      profile.resourceAcceleration += f * op.count * 6;
      profile.offensiveValue += f * op.count * 4;
      break;
    case 'ko':
    case 'koAllCharacters':
      profile.removalValue += f * 14;
      profile.tempoValue += f * 10;
      addTag(profile.payoffTags, 'interaction');
      break;
    case 'rest':
      profile.tempoValue += f * 8;
      profile.removalValue += f * 4;
      break;
    case 'setActive':
      profile.tempoValue += f * 6;
      profile.offensiveValue += f * 4;
      break;
    case 'addPower':
    case 'addPowerSelf':
    case 'addPowerAura':
    case 'setBasePowerAura':
      profile.offensiveValue += f * 8;
      profile.finisherValue += f * 6;
      addTag(profile.payoffTags, 'finisher');
      break;
    case 'addKeyword':
    case 'addKeywordAura':
      profile.defensiveValue += f * (op.op === 'addKeyword' && op.keyword === 'blocker' ? 8 : 4);
      profile.offensiveValue += f * (op.op === 'addKeyword' && op.keyword === 'rush' ? 6 : 3);
      break;
    case 'returnToHand':
    case 'moveToBottomDeck':
      profile.removalValue += f * 10;
      profile.tempoValue += f * 8;
      break;
    case 'moveToHand':
    case 'moveToLifeTop':
      profile.recursionValue += f * 8;
      profile.defensiveValue += f * 5;
      break;
    case 'trashCards':
    case 'trashLife':
      profile.removalValue += f * 8;
      profile.resourceDenial += f * 5;
      break;
    case 'playFromHand':
    case 'playFromTrash':
    case 'playFromDeck':
      profile.comboPotential += f * 12;
      profile.engineValue += f * 8;
      addTag(profile.setupTags, 'bridge');
      break;
    case 'searchTopDeck':
    case 'searchDeck':
      profile.searchValue += f * (6 + ('pick' in op ? op.pick * 4 : 4));
      profile.comboPotential += f * 6;
      addTag(profile.setupTags, 'setup');
      break;
    case 'registerKoReplacement':
    case 'addKoImmunity':
    case 'addKoImmunityAura':
      profile.defensiveValue += f * 10;
      addTag(profile.setupTags, 'protection');
      break;
    case 'preventAttack':
    case 'preventAttackController':
    case 'setForcedAttackTarget':
    case 'redirectAttackTarget':
      profile.defensiveValue += f * 9;
      profile.tempoValue += f * 5;
      break;
    case 'preventBlockers':
    case 'suppressBlockerActivation':
      profile.offensiveValue += f * 8;
      profile.finisherValue += f * 6;
      break;
    case 'negateEffect':
    case 'negateControllerEffects':
      profile.defensiveValue += f * 9;
      profile.tempoValue += f * 6;
      break;
    case 'returnHandShuffleDraw':
      profile.cardAdvantage += f * 10;
      profile.engineValue += f * 6;
      break;
    case 'chooseOption':
      for (const option of op.options) {
        for (const child of option.ops) accumulateOpProfile(profile, child, f * 0.85);
      }
      break;
    default:
      break;
  }
}

export function analyzeAbility(ability: Ability, gatesMet = true): CardStrategicProfile {
  const profile = emptyProfile();
  const timingWeight = TIMING_REALIZATION[ability.timing] ?? 0.5;
  const gateFactor = gatesMet ? 1 : 0.35;
  const optionalFactor = ability.optionalActivate ? 0.65 : 1;

  for (const op of ability.ops) {
    const seqFactor = op.ifPrevious || op.ifGate ? 0.55 : 1;
    accumulateOpProfile(profile, op, timingWeight * gateFactor * optionalFactor * seqFactor);
  }

  if (ability.timing === 'onPlay' || ability.timing === 'onEnterPlay') {
    profile.immediateValue += 6 * gateFactor;
    addTag(profile.payoffTags, 'payoff');
  }
  if (ability.timing === 'activateMain') {
    profile.engineValue += 4 * gateFactor;
    addTag(profile.setupTags, 'engine');
  }
  if (ability.timing === 'whenAttacking' || ability.timing === 'onOpponentsAttack') {
    profile.offensiveValue += 5 * gateFactor;
    addTag(profile.payoffTags, 'finisher');
  }
  if (ability.timing === 'counter' || ability.timing === 'lifeTrigger') {
    profile.defensiveValue += 8 * gateFactor;
    addTag(profile.setupTags, 'protection');
  }

  if (ability.gate?.length) {
    for (const gate of ability.gate) {
      if (gate.kind === 'leaderType' || gate.kind === 'leaderName' || gate.kind === 'leaderNameIncludes') {
        profile.synergyRequirements.push({
          kind: 'gate',
          value: gate.kind === 'leaderType' ? gate.type : 'name' in gate ? gate.name : '',
          description: `Requires leader gate: ${gate.kind}`,
        });
      }
      if (gate.kind === 'selfCharacterCount' || gate.kind === 'selfRestedCharacterCount') {
        profile.synergyRequirements.push({
          kind: 'gate',
          value: `characters:${gate.atLeast ?? gate.atMost ?? 0}`,
          description: 'Requires board composition gate',
        });
      }
    }
  }

  profile.futureValue =
    profile.engineValue * 0.6 +
    profile.comboPotential * 0.5 +
    profile.searchValue * 0.4 +
    profile.recursionValue * 0.5;

  return profile;
}

export function mergeProfiles(base: CardStrategicProfile, add: CardStrategicProfile, weight = 1): CardStrategicProfile {
  const w = weight;
  return {
    immediateValue: base.immediateValue + add.immediateValue * w,
    boardDevelopment: base.boardDevelopment + add.boardDevelopment * w,
    cardAdvantage: base.cardAdvantage + add.cardAdvantage * w,
    removalValue: base.removalValue + add.removalValue * w,
    tempoValue: base.tempoValue + add.tempoValue * w,
    defensiveValue: base.defensiveValue + add.defensiveValue * w,
    offensiveValue: base.offensiveValue + add.offensiveValue * w,
    resourceAcceleration: base.resourceAcceleration + add.resourceAcceleration * w,
    resourceDenial: base.resourceDenial + add.resourceDenial * w,
    recursionValue: base.recursionValue + add.recursionValue * w,
    searchValue: base.searchValue + add.searchValue * w,
    comboPotential: base.comboPotential + add.comboPotential * w,
    engineValue: base.engineValue + add.engineValue * w,
    finisherValue: base.finisherValue + add.finisherValue * w,
    futureValue: base.futureValue + add.futureValue * w,
    setupTags: [...new Set([...base.setupTags, ...add.setupTags])],
    payoffTags: [...new Set([...base.payoffTags, ...add.payoffTags])],
    synergyRequirements: [...base.synergyRequirements, ...add.synergyRequirements],
    enables: [...base.enables, ...add.enables],
  };
}

export function profileScalar(profile: CardStrategicProfile): number {
  return (
    profile.immediateValue * 0.15 +
    profile.boardDevelopment * 0.1 +
    profile.cardAdvantage * 0.12 +
    profile.removalValue * 0.14 +
    profile.tempoValue * 0.1 +
    profile.defensiveValue * 0.1 +
    profile.offensiveValue * 0.12 +
    profile.resourceAcceleration * 0.08 +
    profile.engineValue * 0.1 +
    profile.finisherValue * 0.14 +
    profile.futureValue * 0.08
  );
}
