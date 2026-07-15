import type { EffectProgram_V2 } from '../../cards/effectCompiler_V2/effectIr_V2';
import type { PrimitiveUsageSummary_V2 } from './analyzeRuntime_V2';

export interface EffectRuntimeCompatibilityWarning_V2 {
  cardNumber: string;
  effectId: string;
  message: string;
}

export interface EffectRuntimeSummary_V2 {
  cardCount: number;
  assignmentCount: number;
  v2AbilityCount: number;
  /** Present only for explicit compatibility-audit adapters, not native V2 runtime. */
  legacyAbilityCount?: number;
  /** Present only for explicit compatibility-audit adapters, not native V2 runtime. */
  legacyWarningCount?: number;
  primitiveUsage?: PrimitiveUsageSummary_V2;
}

/**
 * Engine-facing V2 sidecar contract.
 *
 * This is intentionally not the V1 EffectTemplateRegistry. The dev:v2 path
 * feeds this bundle into the V2 dispatcher/adapter directly, while the normal
 * V1 registry remains isolated behind the existing runtime mode switch.
 */
export interface EffectRuntimeBundle_V2 {
  programsByCardNumber: Record<string, EffectProgram_V2>;
  compatibilityWarnings: EffectRuntimeCompatibilityWarning_V2[];
  summary: EffectRuntimeSummary_V2;
}
