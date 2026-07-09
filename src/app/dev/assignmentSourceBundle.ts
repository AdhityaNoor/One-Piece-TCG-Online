/**
 * Vite-only bundle of raw assignment sources for in-app partial-curation metrics.
 */
const modules = import.meta.glob('../../cards/effectTemplates/assignments/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const assignmentSourceBundle = Object.entries(modules)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .map(([filePath, content]) => ({ filePath, content: content as string }));
