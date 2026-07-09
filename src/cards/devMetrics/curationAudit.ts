/**
 * Curation audit — cross-checks curated EffectPrograms against printed text.
 * Advisory heuristics only; nothing here executes card logic.
 */
import type { Ability, EffectProgram, IrTiming } from '../../engine/effects/effectIr';
import type { AuditCategory, AuditFinding, CatalogCard } from './types';

interface Literals {
  types: Set<string>;
  names: Set<string>;
  keywords: Set<string>;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectLiterals(node: unknown, acc: Literals): void {
  if (Array.isArray(node)) {
    for (const v of node) collectLiterals(v, acc);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const isGate = typeof obj.kind === 'string';
  const isVarSelector = obj.sel === 'var';
  for (const [key, value] of Object.entries(obj)) {
    if ((key === 'typeIncludes' || key === 'targetTypeIncludes') && typeof value === 'string') {
      acc.types.add(value);
    } else if (key === 'anyOfTypes' && Array.isArray(value)) {
      for (const v of value) if (typeof v === 'string') acc.types.add(v);
    } else if (key === 'type' && isGate && typeof value === 'string') {
      acc.types.add(value);
    } else if ((key === 'name' || key === 'targetName') && typeof value === 'string' && !isVarSelector) {
      acc.names.add(value);
    } else if (key === 'anyOfNames' && Array.isArray(value)) {
      for (const v of value) if (typeof v === 'string') acc.names.add(v);
    } else if (key === 'keyword' && typeof value === 'string') {
      acc.keywords.add(value);
    }
    collectLiterals(value, acc);
  }
}

const KEYWORD_TEXT: Record<string, string> = {
  blocker: 'blocker',
  rush: 'rush',
  doubleAttack: 'double attack',
  banish: 'banish',
};

const TIMING_MARKERS: Partial<Record<IrTiming, RegExp>> = {
  onPlay: /\[On Play\]/i,
  onKO: /\[On K\.?O\.?\]|K\.?O\.?['’ʼ]?d/i,
  whenAttacking: /\[When Attacking\]/i,
  activateMain: /\[Activate:\s*Main\]|\[Main\]/i,
  onBlock: /\[On Block\]/i,
  counter: /\[Counter\]/i,
  onOpponentsAttack: /\[On (Your )?Opponent's Attack\]|when your opponent attacks/i,
  lifeTrigger: /\[Trigger\]/i,
};

/** Audit one curated card against its printed effect text. */
export function auditCuratedCard(card: CatalogCard, program: EffectProgram): AuditFinding[] {
  const text = card.en?.effectText ?? '';
  const findings: AuditFinding[] = [];
  const base = { cardNumber: card.cardNumber, setCode: card.setCode, name: card.en?.name ?? '', effectText: text };
  const normText = norm(text);

  const lits: Literals = { types: new Set(), names: new Set(), keywords: new Set() };
  for (const ability of program.abilities) collectLiterals(ability as Ability, lits);

  for (const t of lits.types) {
    if (!normText.includes(norm(t))) findings.push({ ...base, category: 'type', detail: t });
  }
  const selfName = norm(card.en?.name ?? '');
  for (const n of lits.names) {
    if (selfName && norm(n) === selfName) continue;
    if (!normText.includes(norm(n))) findings.push({ ...base, category: 'name', detail: n });
  }
  for (const k of lits.keywords) {
    const marker = KEYWORD_TEXT[k];
    if (marker && !normText.includes(marker)) findings.push({ ...base, category: 'keyword', detail: k });
  }

  const seenTimings = new Set<IrTiming>();
  for (const ability of program.abilities) seenTimings.add(ability.timing);
  for (const timing of seenTimings) {
    const marker = TIMING_MARKERS[timing];
    if (marker && !marker.test(text)) findings.push({ ...base, category: 'timing', detail: timing });
  }

  return findings;
}

export function emptyAuditByCategory(): Record<AuditCategory, number> {
  return { type: 0, name: 0, keyword: 0, timing: 0 };
}
