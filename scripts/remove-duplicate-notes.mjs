import fs from 'node:fs';
import path from 'node:path';

const files = ['OP09', 'OP10', 'OP11', 'OP12', 'OP13', 'OP14', 'OP15', 'OP16', 'PRB', 'P'];
let totalRemoved = 0;

for (const f of files) {
  const p = path.join('src/cards/effectTemplates/assignments', `${f}.ts`);
  let t = fs.readFileSync(p, 'utf8');
  const assigned = new Set([...t.matchAll(/cardNumber: '([^']+)'/g)].map((m) => m[1]));
  const before = (t.match(/NOTE: not yet implemented/g) || []).length;
  t = t.replace(
    /\n  \/\/ ([^\n]+)\n(?:  \/\/[^\n]*\n)*  \/\/ NOTE: not yet implemented[^\n]*\n/g,
    (block) => {
      const idMatch = block.match(/\/\/ ((?:OP\d{2}-\d{3}|PRB\d{2}-\d{3}|P-\d{3}))/);
      if (idMatch && assigned.has(idMatch[1])) {
        totalRemoved += 1;
        return '\n';
      }
      return block;
    },
  );
  const after = (t.match(/NOTE: not yet implemented/g) || []).length;
  fs.writeFileSync(p, t);
  console.log(`${f}: NOTE ${before} -> ${after}`);
}

console.log(`Removed duplicate blocks: ${totalRemoved}`);
