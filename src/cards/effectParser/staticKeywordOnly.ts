import { collapseSpaces, stripReminderText } from './tags';

/**
 * Keywords with direct normalized CardDefinition support today.
 * Do not include unsupported keyword rules here; they should stay in coverage
 * until the engine has a real field/rule path for them.
 */
const ENGINE_STATIC_KEYWORD_TAGS = new Set(['[Rush]', '[Rush: Character]', '[Blocker]', '[Double Attack]', '[Banish]', '[Unblockable]']);

/**
 * True only for cards whose entire effect text is static engine-backed keyword
 * tags plus parenthetical reminder text, e.g. "[Blocker] (...)".
 */
export function isStaticEngineKeywordOnly(cardText: string): boolean {
  const { cleaned } = stripReminderText(cardText);
  let rest = collapseSpaces(cleaned);
  let found = false;

  while (rest.startsWith('[')) {
    const close = rest.indexOf(']');
    if (close === -1) return false;

    const tag = rest.slice(0, close + 1);
    if (!ENGINE_STATIC_KEYWORD_TAGS.has(tag)) return false;

    found = true;
    rest = collapseSpaces(rest.slice(close + 1));
  }

  return found && rest.length === 0;
}
