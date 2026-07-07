import type { CardDefinition } from '../state/card';

const ENGINE_STATIC_KEYWORD_TAGS = new Set(['[Rush]', '[Rush: Character]', '[Blocker]', '[Double Attack]', '[Banish]', '[Unblockable]']);

function stripReminderText(text: string): string {
  return text.replace(/\([^)]*\)/g, '').trim();
}

/** True when card text is empty or only static keyword tags (2-8-5 "no base effect"), and no [Trigger]. */
export function cardHasNoBaseEffect(def: Pick<CardDefinition, 'text' | 'hasTrigger'>): boolean {
  if (def.hasTrigger) return false;
  let rest = stripReminderText(def.text);
  while (rest.startsWith('[')) {
    const close = rest.indexOf(']');
    if (close < 0) break;
    const tag = rest.slice(0, close + 1);
    if (!ENGINE_STATIC_KEYWORD_TAGS.has(tag)) return false;
    rest = rest.slice(close + 1).trim();
  }
  return rest.length === 0;
}
