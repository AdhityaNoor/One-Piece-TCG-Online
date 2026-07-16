import {
  EFFECT_SCHEMA_VERSION_V2,
  type AtomicCoverageStatus_V2,
  type CardEffectCoverageReport_V2,
  type CompiledCardEffects_V2,
  type EffectAssignment_V2,
  type EffectDefinition_V2,
  type ParsedEffect_V2,
} from './types_V2';
import type { EffectProgram_V2 } from './effectIr_V2';

export const EFFECT_COMPILER_VERSION_V2 = 'effect-compiler-v2.0.0' as const;

function finalizeAssignedEffect_V2(assignment: EffectAssignment_V2): EffectDefinition_V2 {
  return {
    id: `${assignment.cardNumber}#${assignment.effectIndex}`,
    source: {
      objectRef: 'THIS_CARD',
      owner: 'PLAYER',
      controller: 'PLAYER',
      sourceZone: 'NONE',
      effectIndex: assignment.effectIndex,
    },
    ...assignment.effect,
    metadata: {
      sourceCardNumber: assignment.cardNumber,
      effectIndex: assignment.effectIndex,
      printedText: assignment.printedText,
      normalizedText: assignment.printedText.replace(/\s+/g, ' ').trim(),
      parserVersion: EFFECT_COMPILER_VERSION_V2,
      assignmentId: assignment.assignmentId,
      authoringStatus: assignment.status,
    },
  };
}

export function compileCardEffects_V2(parsed: ParsedEffect_V2, assignments: readonly EffectAssignment_V2[]): CompiledCardEffects_V2 {
  const cardAssignments = assignments.filter((assignment) => assignment.cardNumber === parsed.cardNumber);
  const assignedEffects = cardAssignments.map(finalizeAssignedEffect_V2);

  return {
    schemaVersion: EFFECT_SCHEMA_VERSION_V2,
    compilerVersion: EFFECT_COMPILER_VERSION_V2,
    cardNumber: parsed.cardNumber,
    parsedEffects: parsed.effects,
    effects: assignedEffects.sort((a, b) => a.metadata.effectIndex - b.metadata.effectIndex),
    assignments: cardAssignments,
  };
}

export function buildCoverageReportFromAssignments_V2(parsed: ParsedEffect_V2, assignments: readonly EffectAssignment_V2[]): CardEffectCoverageReport_V2 {
  const cardAssignments = assignments.filter((assignment) => assignment.cardNumber === parsed.cardNumber);
  const assignmentByAtom = new Map<string, EffectAssignment_V2[]>();
  for (const assignment of cardAssignments) {
    for (const atomId of assignment.coveredAtomicEffectIds) {
      const bucket = assignmentByAtom.get(atomId) ?? [];
      bucket.push(assignment);
      assignmentByAtom.set(atomId, bucket);
    }
  }

  const statuses: AtomicCoverageStatus_V2[] = parsed.atomicEffects.map((atom) => {
    const coveringAssignments = assignmentByAtom.get(atom.id) ?? [];
    const hasPartial = coveringAssignments.some((assignment) => assignment.status === 'PARTIAL');
    const hasAssigned = coveringAssignments.some((assignment) => assignment.status === 'ASSIGNED');
    const semanticNeedsAudit = atom.semanticStatus === 'needsAudit';
    const status: AtomicCoverageStatus_V2['status'] = semanticNeedsAudit ? 'partial' : hasAssigned ? 'covered' : hasPartial ? 'partial' : 'uncovered';
    const assignmentStatus: AtomicCoverageStatus_V2['assignmentStatus'] = hasAssigned ? 'assigned' : hasPartial ? 'partial' : 'unassigned';
    return {
      atomicEffectId: atom.id,
      cardNumber: atom.cardNumber,
      effectIndex: atom.effectIndex,
      atomIndex: atom.atomIndex,
      rawText: atom.rawText,
      parserStatus: atom.coverage === 'coveredByParser' ? 'recognized' : 'unrecognized',
      ...(atom.semanticStatus ? { semanticStatus: atom.semanticStatus } : {}),
      ...(atom.semanticIssues ? { semanticIssues: atom.semanticIssues } : {}),
      assignmentStatus,
      status,
      coveredByAssignmentIds: coveringAssignments.map((assignment) => assignment.assignmentId),
      ...(atom.canonicalAtoms ? { canonicalAtoms: atom.canonicalAtoms } : {}),
      ...(atom.canonicalCoverage ? { canonicalCoverage: atom.canonicalCoverage } : {}),
      ...(atom.canonicalRemark ? { canonicalRemark: atom.canonicalRemark } : {}),
      ...(atom.unrecognizedKind ? { unrecognizedKind: atom.unrecognizedKind } : {}),
      ...(status === 'uncovered' ? { uncoveredReason: atom.uncoveredReason ?? 'No V2 assignment covers this atomic effect.' } : {}),
      ...(atom.trackingRemark ? { trackingRemark: atom.trackingRemark } : {}),
      ...(semanticNeedsAudit ? { trackingRemark: atom.semanticIssues?.join(' ') ?? 'Parser recognized this atom, but semantic audit marked it unsafe.' } : {}),
    };
  });

  const parserRecognized = statuses.filter((status) => status.parserStatus === 'recognized').length;
  const parserUnrecognized = statuses.filter((status) => status.parserStatus === 'unrecognized').length;
  const assignmentCovered = statuses.filter((status) => status.assignmentStatus === 'assigned').length;
  const assignmentPartial = statuses.filter((status) => status.status === 'partial').length;
  const assignmentUncovered = statuses.filter((status) => status.assignmentStatus === 'unassigned').length;

  return {
    schemaVersion: EFFECT_SCHEMA_VERSION_V2,
    generatedBy: 'effectCompiler_V2',
    cardNumber: parsed.cardNumber,
    totalAtomicEffects: statuses.length,
    parserRecognizedAtomicEffects: parserRecognized,
    parserUnrecognizedAtomicEffects: parserUnrecognized,
    assignmentCoveredAtomicEffects: assignmentCovered,
    assignmentPartialAtomicEffects: assignmentPartial,
    assignmentUncoveredAtomicEffects: assignmentUncovered,
    coveredAtomicEffects: assignmentCovered,
    partialAtomicEffects: assignmentPartial,
    uncoveredAtomicEffects: assignmentUncovered,
    statuses,
  };
}

export function toMongoEffectAssignmentDocuments_V2(compiled: CompiledCardEffects_V2): Record<string, unknown>[] {
  return compiled.assignments.map((assignment) => ({
    _id: assignment.assignmentId,
    schemaVersion: compiled.schemaVersion,
    compilerVersion: compiled.compilerVersion,
    cardNumber: assignment.cardNumber,
    effectIndex: assignment.effectIndex,
    status: assignment.status,
    printedText: assignment.printedText,
    coveredAtomicEffectIds: assignment.coveredAtomicEffectIds,
    uncoveredNotes: assignment.uncoveredNotes ?? [],
    effect: finalizeAssignedEffect_V2(assignment),
  }));
}

export function toMongoCompiledCardEffectDocument_V2(compiled: CompiledCardEffects_V2, coverage: CardEffectCoverageReport_V2): Record<string, unknown> {
  return {
    _id: `effects-v2:${compiled.cardNumber}`,
    schemaVersion: compiled.schemaVersion,
    compilerVersion: compiled.compilerVersion,
    cardNumber: compiled.cardNumber,
    effects: compiled.effects,
    assignments: compiled.assignments,
    coverage,
  };
}

export function toEffectProgram_V2(compiled: CompiledCardEffects_V2): EffectProgram_V2 {
  return {
    schemaVersion: compiled.schemaVersion,
    cardNumber: compiled.cardNumber,
    canonicalEffects: compiled.effects,
    abilities: compiled.effects.map((effect, index) => ({
      abilityId: effect.id,
      timing: effect.timing ?? { kind: 'STANDARD_TIMING', timing: 'ON_ENTER_PLAY' },
      ...(effect.conditions ? { gates: [effect.conditions] } : {}),
      ...(effect.activationCost ? { activationCost: effect.activationCost } : {}),
      ...(effect.usageLimit?.maximumUses === 1 && effect.usageLimit.period === 'PER_TURN' ? { oncePerTurn: true } : {}),
      optionalActivate: effect.optionality === 'OPTIONAL',
      resolution: effect.resolution,
    })),
  };
}
