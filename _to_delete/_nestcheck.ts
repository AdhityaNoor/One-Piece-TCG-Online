import { buildRegistryFromAssignments } from '../src/cards/effectTemplates/assembler';
import { ALL_ASSIGNMENTS } from '../src/cards/effectTemplates/assignments';

const reg = buildRegistryFromAssignments(ALL_ASSIGNMENTS as never);
for (const [cn, prog] of Object.entries(reg)) {
  for (const ab of (prog as never as { abilities: { timing: string; ops: never[] }[] }).abilities) {
    (ab.ops as never as { op: string; options?: { label: string; ops: { op: string }[] }[] }[]).forEach((op, k) => {
      if (op.op !== 'chooseOption' || !op.options) return;
      op.options.forEach((o) => {
        o.ops.forEach((inner, j) => {
          if (inner.op !== 'chooseOption') return;
          const after = o.ops.slice(j + 1).map((x) => x.op);
          const flag = after.length > 0 ? '  <<< OPS AFTER THE INNER CHOICE WOULD BE SKIPPED' : '  (nothing after — safe)';
          console.log(`${cn} [${ab.timing}] op${k} branch="${o.label}" innerAt=${j} after=[${after.join(', ')}]${flag}`);
        });
      });
    });
  }
}
