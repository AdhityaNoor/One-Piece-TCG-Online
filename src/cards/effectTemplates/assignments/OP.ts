/**
 * Aggregates reviewed effect template assignments for Main Booster sets.
 *
 * Keep individual OP set coverage in OPxx.ts so set-first work stays reviewable.
 */
import type { CardEffectAssignment } from '../assembler';
import { OP01_ASSIGNMENTS } from './OP01';
import { OP02_ASSIGNMENTS } from './OP02';
import { OP03_ASSIGNMENTS } from './OP03';
import { OP04_ASSIGNMENTS } from './OP04';
import { OP05_ASSIGNMENTS } from './OP05';
import { OP06_ASSIGNMENTS } from './OP06';
import { OP07_ASSIGNMENTS } from './OP07';
import { OP08_ASSIGNMENTS } from './OP08';
import { OP09_ASSIGNMENTS } from './OP09';
import { OP10_ASSIGNMENTS } from './OP10';
import { OP11_ASSIGNMENTS } from './OP11';
import { OP12_ASSIGNMENTS } from './OP12';
import { OP13_ASSIGNMENTS } from './OP13';
import { OP14_ASSIGNMENTS } from './OP14';
import { OP15_ASSIGNMENTS } from './OP15';
import { OP16_ASSIGNMENTS } from './OP16';

export const OP_ASSIGNMENTS: CardEffectAssignment[] = [
  ...OP01_ASSIGNMENTS,
  ...OP02_ASSIGNMENTS,
  ...OP03_ASSIGNMENTS,
  ...OP04_ASSIGNMENTS,
  ...OP05_ASSIGNMENTS,
  ...OP06_ASSIGNMENTS,
  ...OP07_ASSIGNMENTS,
  ...OP08_ASSIGNMENTS,
  ...OP09_ASSIGNMENTS,
  ...OP10_ASSIGNMENTS,
  ...OP11_ASSIGNMENTS,
  ...OP12_ASSIGNMENTS,
  ...OP13_ASSIGNMENTS,
  ...OP14_ASSIGNMENTS,
  ...OP15_ASSIGNMENTS,
  ...OP16_ASSIGNMENTS,
];
