/**
 * Load raw assignment file contents for partial-curation scanning (Node CLI).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AssignmentSourceFile } from '../../src/cards/devMetrics/partialCurationScan';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
export const ASSIGNMENTS_DIR = resolve(ROOT, 'src', 'cards', 'effectTemplates', 'assignments');

export function loadAssignmentSources(dir = ASSIGNMENTS_DIR): AssignmentSourceFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .sort()
    .map((f) => ({
      filePath: join(dir, f),
      content: readFileSync(join(dir, f), 'utf8'),
    }));
}
