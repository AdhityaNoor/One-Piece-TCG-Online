import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const TS_EXT = ['.ts', '.tsx', '.mts', '.cts'];
function tryResolve(basePath) {
  if (existsSync(basePath) && statSync(basePath).isFile()) return basePath;
  for (const ext of TS_EXT) if (existsSync(basePath + ext)) return basePath + ext;
  if (basePath.endsWith('.js')) { const stem = basePath.slice(0, -3); for (const ext of TS_EXT) if (existsSync(stem + ext)) return stem + ext; }
  if (existsSync(basePath) && statSync(basePath).isDirectory()) { for (const ext of TS_EXT) { const idx = pathResolve(basePath, 'index' + ext); if (existsSync(idx)) return idx; } }
  return null;
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('file:')) {
    const parentPath = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const base = specifier.startsWith('file:') ? fileURLToPath(specifier) : pathResolve(parentPath, specifier);
    const found = tryResolve(base);
    if (found) return { url: pathToFileURL(found).href, format: 'ts', shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (context.format === 'ts' || TS_EXT.some((e) => url.endsWith(e))) {
    const path = fileURLToPath(url);
    const src = readFileSync(path, 'utf8');
    const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, verbatimModuleSyntax: false, isolatedModules: true }, fileName: path });
    return { format: 'module', source: out.outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
