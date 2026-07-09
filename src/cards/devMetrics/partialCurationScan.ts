/**
 * Scans assignment source files for PARTIAL / deferred / NOTE markers that mark
 * incomplete curation on otherwise-assigned cards. Curated cards disappear from
 * triage, so these comments are the only backlog signal unless we scan them.
 */
import type { CatalogCard, PartialCurationFinding, PartialCurationKind } from './types';

const CARD_NUMBER_RE = /\b((?:(?:OP|ST|EB)\d{2}|PRB\d{2}|P)-\d{3})\b/g;
const ASSIGNMENT_RE = /cardNumber:\s*'([^']+)'/g;
const COMMENT_RE = /^\s*\/\/\s?(.*)$/;

export interface AssignmentSourceFile {
  filePath: string;
  content: string;
}

function resetCardNumberRe(): void {
  CARD_NUMBER_RE.lastIndex = 0;
}

function extractCardNumbers(text: string): string[] {
  resetCardNumberRe();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = CARD_NUMBER_RE.exec(text)) !== null) out.push(m[1]);
  return out;
}

function classifyComment(comment: string): PartialCurationKind | null {
  const c = comment.trim();
  if (!c) return null;
  if (/NOTE:\s*not yet implemented/i.test(c)) return 'notImplemented';
  if (/PARTIAL:/i.test(c)) return 'partial';
  if (/^──/.test(c) && /\bdeferred\b/i.test(c)) return 'batchNote';
  if (/\bdropped\b/i.test(c)) return 'dropped';
  if (/\bdeferred\b/i.test(c) || /remains deferred/i.test(c)) return 'deferred';
  return null;
}

function cardNumberFromNearby(lines: string[], index: number, kind: PartialCurationKind): string | null {
  const window = 12;
  const commentMatch = lines[index].match(COMMENT_RE);
  if (commentMatch) {
    const inlineCards = extractCardNumbers(commentMatch[1]);
    if (inlineCards.length > 0) return inlineCards[0];
  }

  if (kind !== 'notImplemented') {
    for (let i = index + 1; i <= Math.min(lines.length - 1, index + 4); i += 1) {
      const assign = lines[i].match(/cardNumber:\s*'([^']+)'/);
      if (assign) return assign[1];
    }
  }

  if (kind === 'notImplemented') {
    for (let i = index - 1; i >= Math.max(0, index - window); i -= 1) {
      const comment = lines[i].match(COMMENT_RE);
      if (!comment) break;
      const nums = extractCardNumbers(comment[1]);
      if (nums.length > 0) return nums[0];
    }
    return null;
  }

  for (let i = index - 1; i >= Math.max(0, index - window); i -= 1) {
    const comment = lines[i].match(COMMENT_RE);
    if (comment) {
      const nums = extractCardNumbers(comment[1]);
      if (nums.length > 0) return nums[0];
    } else if (lines[i].trim()) {
      break;
    }
  }

  for (let i = index + 5; i <= Math.min(lines.length - 1, index + window); i += 1) {
    const assign = lines[i].match(/cardNumber:\s*'([^']+)'/);
    if (assign) return assign[1];
  }
  return null;
}

function setCodeFromCardNumber(cardNumber: string | null, filePath: string): string {
  if (cardNumber) {
    const m = cardNumber.match(/^([A-Z]+\d*)-/);
    if (m) return m[1];
  }
  const file = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath;
  return file.replace(/\.ts$/, '');
}

/** Collect every cardNumber literal assigned in a source file. */
export function assignedCardNumbersInSource(content: string): Set<string> {
  const assigned = new Set<string>();
  let m: RegExpExecArray | null;
  ASSIGNMENT_RE.lastIndex = 0;
  while ((m = ASSIGNMENT_RE.exec(content)) !== null) assigned.add(m[1]);
  return assigned;
}

/** Scan one assignment file for incomplete-curation markers. */
export function scanAssignmentSource(file: AssignmentSourceFile): PartialCurationFinding[] {
  const lines = file.content.split(/\r?\n/);
  const assigned = assignedCardNumbersInSource(file.content);
  const findings: PartialCurationFinding[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const commentMatch = lines[i].match(COMMENT_RE);
    if (!commentMatch) continue;
    const kind = classifyComment(commentMatch[1]);
    if (!kind) continue;

    const cardNumber = cardNumberFromNearby(lines, i, kind);
    const hasAssignment = cardNumber ? assigned.has(cardNumber) : false;
    const isStale = kind === 'notImplemented' && hasAssignment;

    findings.push({
      cardNumber,
      setCode: setCodeFromCardNumber(cardNumber, file.filePath),
      sourceFile: file.filePath,
      line: i + 1,
      kind,
      note: commentMatch[1].trim(),
      hasAssignment,
      isStale,
    });
  }

  return findings;
}

/** Scan all assignment sources and merge findings. */
export function scanPartialCurations(sources: AssignmentSourceFile[]): PartialCurationFinding[] {
  const merged = sources.flatMap(scanAssignmentSource);
  merged.sort((a, b) => {
    const cardA = a.cardNumber ?? '';
    const cardB = b.cardNumber ?? '';
    return cardA.localeCompare(cardB) || a.line - b.line;
  });
  return merged;
}

export function partialCardNumberSet(findings: PartialCurationFinding[]): Set<string> {
  const cards = new Set<string>();
  for (const f of findings) {
    if (!f.cardNumber || !f.hasAssignment || f.kind === 'batchNote' || f.kind === 'notImplemented') continue;
    cards.add(f.cardNumber);
  }
  return cards;
}

export function enrichPartialFindings(
  findings: PartialCurationFinding[],
  catalogByNumber: Map<string, CatalogCard>,
): PartialCurationFinding[] {
  return findings.map((f) => {
    if (!f.cardNumber) return f;
    const card = catalogByNumber.get(f.cardNumber);
    if (!card) return f;
    return {
      ...f,
      setCode: card.setCode,
      name: card.en?.name ?? '',
      effectText: card.en?.effectText ?? '',
    };
  });
}

export function emptyPartialByKind(): Record<PartialCurationKind, number> {
  return { partial: 0, deferred: 0, dropped: 0, notImplemented: 0, batchNote: 0 };
}
