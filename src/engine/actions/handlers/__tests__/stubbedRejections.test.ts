/**
 * ACTIVATE_COUNTER_EVENT is no longer a stub — it's implemented in
 * activateCounterEvent.ts and covered by activateCounterEvent.test.ts. This
 * file is retained only so the prior path has a home; the placeholder test
 * documents that nothing remains stubbed here.
 */
import { describe, expect, it } from 'vitest';
import * as stub from '../stubbedRejections';

describe('stubbedRejections (migrated)', () => {
  it('no longer exports any rejection handlers', () => {
    expect(Object.keys(stub)).toEqual([]);
  });
});
