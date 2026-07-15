import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectProgram_V2 } from './effectIr_V2';
import type { EffectRuntimeBundle_V2 } from '../../engine/effects_V2/runtime_V2';
import { analyzeEffectPrograms_V2 } from '../../engine/effects_V2/analyzeRuntime_V2';
import type { EffectAssignment_V2 } from './types_V2';
import { compileCardEffects_V2, toEffectProgram_V2 } from './compiler_V2';
import { EB01_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/EB01/auto-assignments';
import { EB02_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/EB02/auto-assignments';
import { EB03_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/EB03/auto-assignments';
import { EB04_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/EB04/auto-assignments';
import { OP01_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP01/auto-assignments';
import { OP02_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP02/auto-assignments';
import { OP03_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP03/auto-assignments';
import { OP04_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP04/auto-assignments';
import { OP05_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP05/auto-assignments';
import { OP06_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP06/auto-assignments';
import { OP07_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP07/auto-assignments';
import { OP08_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP08/auto-assignments';
import { OP09_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP09/auto-assignments';
import { OP10_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP10/auto-assignments';
import { OP11_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP11/auto-assignments';
import { OP12_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP12/auto-assignments';
import { OP13_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP13/auto-assignments';
import { OP14_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP14/auto-assignments';
import { OP15_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP15/auto-assignments';
import { OP16_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/OP16/auto-assignments';
import { P_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/P/auto-assignments';
import { PRB01_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/PRB01/auto-assignments';
import { PRB02_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/PRB02/auto-assignments';
import { ST01_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST01/auto-assignments';
import { ST02_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST02/auto-assignments';
import { ST03_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST03/auto-assignments';
import { ST04_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST04/auto-assignments';
import { ST05_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST05/auto-assignments';
import { ST06_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST06/auto-assignments';
import { ST07_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST07/auto-assignments';
import { ST08_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST08/auto-assignments';
import { ST09_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST09/auto-assignments';
import { ST10_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST10/auto-assignments';
import { ST11_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST11/auto-assignments';
import { ST12_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST12/auto-assignments';
import { ST13_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST13/auto-assignments';
import { ST14_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST14/auto-assignments';
import { ST15_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST15/auto-assignments';
import { ST16_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST16/auto-assignments';
import { ST17_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST17/auto-assignments';
import { ST18_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST18/auto-assignments';
import { ST19_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST19/auto-assignments';
import { ST20_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST20/auto-assignments';
import { ST21_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST21/auto-assignments';
import { ST22_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST22/auto-assignments';
import { ST23_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST23/auto-assignments';
import { ST24_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST24/auto-assignments';
import { ST25_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST25/auto-assignments';
import { ST26_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST26/auto-assignments';
import { ST27_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST27/auto-assignments';
import { ST28_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST28/auto-assignments';
import { ST29_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST29/auto-assignments';
import { ST30_AUTO_ASSIGNMENTS_V2 } from '../../../effect-v2-output/ST30/auto-assignments';

const AUTO_EFFECT_ASSIGNMENT_SETS_V2: readonly (readonly EffectAssignment_V2[])[] = [
  EB01_AUTO_ASSIGNMENTS_V2,
  EB02_AUTO_ASSIGNMENTS_V2,
  EB03_AUTO_ASSIGNMENTS_V2,
  EB04_AUTO_ASSIGNMENTS_V2,
  OP01_AUTO_ASSIGNMENTS_V2,
  OP02_AUTO_ASSIGNMENTS_V2,
  OP03_AUTO_ASSIGNMENTS_V2,
  OP04_AUTO_ASSIGNMENTS_V2,
  OP05_AUTO_ASSIGNMENTS_V2,
  OP06_AUTO_ASSIGNMENTS_V2,
  OP07_AUTO_ASSIGNMENTS_V2,
  OP08_AUTO_ASSIGNMENTS_V2,
  OP09_AUTO_ASSIGNMENTS_V2,
  OP10_AUTO_ASSIGNMENTS_V2,
  OP11_AUTO_ASSIGNMENTS_V2,
  OP12_AUTO_ASSIGNMENTS_V2,
  OP13_AUTO_ASSIGNMENTS_V2,
  OP14_AUTO_ASSIGNMENTS_V2,
  OP15_AUTO_ASSIGNMENTS_V2,
  OP16_AUTO_ASSIGNMENTS_V2,
  P_AUTO_ASSIGNMENTS_V2,
  PRB01_AUTO_ASSIGNMENTS_V2,
  PRB02_AUTO_ASSIGNMENTS_V2,
  ST01_AUTO_ASSIGNMENTS_V2,
  ST02_AUTO_ASSIGNMENTS_V2,
  ST03_AUTO_ASSIGNMENTS_V2,
  ST04_AUTO_ASSIGNMENTS_V2,
  ST05_AUTO_ASSIGNMENTS_V2,
  ST06_AUTO_ASSIGNMENTS_V2,
  ST07_AUTO_ASSIGNMENTS_V2,
  ST08_AUTO_ASSIGNMENTS_V2,
  ST09_AUTO_ASSIGNMENTS_V2,
  ST10_AUTO_ASSIGNMENTS_V2,
  ST11_AUTO_ASSIGNMENTS_V2,
  ST12_AUTO_ASSIGNMENTS_V2,
  ST13_AUTO_ASSIGNMENTS_V2,
  ST14_AUTO_ASSIGNMENTS_V2,
  ST15_AUTO_ASSIGNMENTS_V2,
  ST16_AUTO_ASSIGNMENTS_V2,
  ST17_AUTO_ASSIGNMENTS_V2,
  ST18_AUTO_ASSIGNMENTS_V2,
  ST19_AUTO_ASSIGNMENTS_V2,
  ST20_AUTO_ASSIGNMENTS_V2,
  ST21_AUTO_ASSIGNMENTS_V2,
  ST22_AUTO_ASSIGNMENTS_V2,
  ST23_AUTO_ASSIGNMENTS_V2,
  ST24_AUTO_ASSIGNMENTS_V2,
  ST25_AUTO_ASSIGNMENTS_V2,
  ST26_AUTO_ASSIGNMENTS_V2,
  ST27_AUTO_ASSIGNMENTS_V2,
  ST28_AUTO_ASSIGNMENTS_V2,
  ST29_AUTO_ASSIGNMENTS_V2,
  ST30_AUTO_ASSIGNMENTS_V2,
];

export const AUTO_EFFECT_ASSIGNMENTS_V2: readonly EffectAssignment_V2[] = AUTO_EFFECT_ASSIGNMENT_SETS_V2.flatMap((assignments) => assignments);

const ASSIGNMENTS_BY_CARD_V2 = AUTO_EFFECT_ASSIGNMENTS_V2.reduce((map, assignment) => {
  const list = map.get(assignment.cardNumber) ?? [];
  list.push(assignment);
  map.set(assignment.cardNumber, list);
  return map;
}, new Map<string, EffectAssignment_V2[]>());

export interface V2RuntimeRegistryResult {
  /** Native V2 sidecar for the V2 interpreter. */
  runtime: EffectRuntimeBundle_V2;
  v2Programs: Record<string, EffectProgram_V2>;
  summary: {
    cardCount: number;
    assignmentCount: number;
    v2AbilityCount: number;
  };
}

export function buildV2EffectRuntimeRegistry(defs: CardDefinitionLookup): V2RuntimeRegistryResult {
  const v2Programs: Record<string, EffectProgram_V2> = {};
  let assignmentCount = 0;
  let v2AbilityCount = 0;
  for (const cardNumber of Object.keys(defs)) {
    const assignments = ASSIGNMENTS_BY_CARD_V2.get(cardNumber);
    if (!assignments?.length) continue;
    assignmentCount += assignments.length;
    const compiled = compileCardEffects_V2({
      schemaVersion: 'op-tcg-effect-v2.0.0',
      parserVersion: 'runtimeCatalog_V2',
      cardNumber,
      rawText: '',
      effects: [],
      atomicEffects: [],
      warnings: [],
    }, assignments);
    const v2Program = toEffectProgram_V2(compiled);
    v2Programs[cardNumber] = v2Program;
    v2AbilityCount += v2Program.abilities.length;
  }
  const primitiveUsage = analyzeEffectPrograms_V2(v2Programs);
  const summary = {
    cardCount: Object.keys(v2Programs).length,
    assignmentCount,
    v2AbilityCount,
    primitiveUsage,
  };
  return {
    runtime: {
      programsByCardNumber: v2Programs,
      compatibilityWarnings: [],
      summary,
    },
    v2Programs,
    summary,
  };
}
