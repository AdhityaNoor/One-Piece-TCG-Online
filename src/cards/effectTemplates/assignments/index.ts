/**
 * Aggregates all reviewed per-set assignments into ALL_ASSIGNMENTS.
 *
 * When adding a new set file:
 *   1. Create src/cards/effectTemplates/assignments/<SET>.ts
 *   2. Import it here and spread into ALL_ASSIGNMENTS.
 *   3. Run `npm run coverage` to see the updated curated count.
 *
 * Order within ALL_ASSIGNMENTS does not matter for correctness, but keeping it
 * alphabetical makes diffs easy to read.
 */
import type { CardEffectAssignment } from '../assembler';
import { EB_ASSIGNMENTS } from './EB';
import { OP_ASSIGNMENTS } from './OP';
import { P_ASSIGNMENTS } from './P';
import { ST01_ASSIGNMENTS } from './ST01';
import { ST02_ASSIGNMENTS } from './ST02';
import { ST03_ASSIGNMENTS } from './ST03';
import { ST05_ASSIGNMENTS } from './ST05';
import { ST06_ASSIGNMENTS } from './ST06';
import { ST08_ASSIGNMENTS } from './ST08';
import { ST10_ASSIGNMENTS } from './ST10';
import { ST23_ASSIGNMENTS } from './ST23';

export const ALL_ASSIGNMENTS: readonly CardEffectAssignment[] = [
  ...EB_ASSIGNMENTS,
  ...OP_ASSIGNMENTS,
  ...P_ASSIGNMENTS,
  ...ST01_ASSIGNMENTS,
  ...ST02_ASSIGNMENTS,
  ...ST03_ASSIGNMENTS,
  ...ST05_ASSIGNMENTS,
  ...ST06_ASSIGNMENTS,
  ...ST08_ASSIGNMENTS,
  ...ST10_ASSIGNMENTS,
  ...ST23_ASSIGNMENTS,
];
