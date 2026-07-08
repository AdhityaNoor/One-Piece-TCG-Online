import fs from 'fs';
import path from 'path';

const dir = 'src/cards/effectTemplates/assignments';
const sets = ['OP09', 'OP10', 'OP11', 'OP12', 'OP13', 'OP14', 'OP15', 'OP16', 'PRB', 'P'];

for (const f of sets) {
  const txt = fs.readFileSync(path.join(dir, `${f}.ts`), 'utf8');
  const assigned = new Set([...txt.matchAll(/cardNumber:\s*'([^']+)'/g)].map((m) => m[1]));
  const noteRe = new RegExp(
    String.raw`\/\/ (${f === 'PRB' ? 'PRB[0-9]+' : f === 'P' ? 'P' : 'OP[0-9]+'}-[0-9]+)[^\n]*\n(?:  \/\/[^\n]*\n)*  \/\/ NOTE: not yet implemented[^\n]*`,
    'g',
  );
  const missing = [];
  let m;
  while ((m = noteRe.exec(txt))) {
    if (!assigned.has(m[1])) missing.push(m[1]);
  }
  console.log(`${f} defer (${missing.length}): ${missing.join(', ')}`);
}
