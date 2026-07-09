import { describe, expect, it } from 'vitest';
import {
  assignedCardNumbersInSource,
  partialCardNumberSet,
  scanAssignmentSource,
  scanPartialCurations,
} from '../partialCurationScan';

const SAMPLE = `
  // OP15-011 — [On K.O.] ... PARTIAL: conditional [Blocker]/+2000 deferred.
  { cardNumber: 'OP15-011', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko' }] } },

  // PARTIAL: opp-Life-to-hand deferred.
  { cardNumber: 'OP16-116', templates: [
    { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 2 }] } },
  ] },

  // OP10-002 (leader) Caesar Clown —
  //   [When Attacking] ...
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP10-001', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [] } }] },
  // OP10-001 (leader) Smoker —
  // NOTE: not yet implemented (needs template).
`;

describe('partialCurationScan', () => {
  it('collects assigned card numbers from source', () => {
    const assigned = assignedCardNumbersInSource(SAMPLE);
    expect(assigned).toEqual(new Set(['OP15-011', 'OP16-116', 'OP10-001']));
  });

  it('finds PARTIAL markers on assigned cards', () => {
    const findings = scanAssignmentSource({ filePath: 'OP15.ts', content: SAMPLE });
    const op15011 = findings.find((f) => f.cardNumber === 'OP15-011');
    expect(op15011).toMatchObject({ kind: 'partial', hasAssignment: true, isStale: false });
    const op16116 = findings.find((f) => f.cardNumber === 'OP16-116');
    expect(op16116).toMatchObject({ kind: 'partial', hasAssignment: true });
  });

  it('flags stale NOTE comments when the card is already assigned', () => {
    const findings = scanAssignmentSource({ filePath: 'OP10.ts', content: SAMPLE });
    const stale = findings.find((f) => f.cardNumber === 'OP10-001' && f.kind === 'notImplemented');
    expect(stale).toMatchObject({ hasAssignment: true, isStale: true });
    const unassigned = findings.find((f) => f.cardNumber === 'OP10-002' && f.kind === 'notImplemented');
    expect(unassigned).toMatchObject({ hasAssignment: false, isStale: false });
  });

  it('builds a partial card set excluding batch-only notes', () => {
    const findings = scanPartialCurations([{ filePath: 'sample.ts', content: SAMPLE }]);
    expect(partialCardNumberSet(findings)).toEqual(new Set(['OP15-011', 'OP16-116']));
  });
});
