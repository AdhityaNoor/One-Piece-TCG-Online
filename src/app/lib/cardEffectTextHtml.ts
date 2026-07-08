/**
 * Display-only conversion from raw card_text to the same colored ability chips
 * used in OPTCG Custom Card Shop (AbilityEditor.jsx / cardToBuilder.js).
 *
 * Bracket tags on a finite vocabulary become styled chips; everything else is
 * HTML-escaped plain text. This is never parsed into executable effect logic.
 */

const CHIP_CLASS_BY_TAG: Record<string, string> = {
  'on play': 'blue-ability',
  'on block': 'blue-ability',
  'on k.o.': 'blue-ability',
  'activate:main': 'blue-ability',
  'activate: main': 'blue-ability',
  'when attacking': 'blue-ability',
  'your turn': 'blue-ability',
  "opponent's turn": 'blue-ability',
  main: 'blue-ability',
  'when attacked': 'blue-ability',
  'start of your turn': 'blue-ability',
  'end of your turn': 'blue-ability',
  'when opponent attacks': 'blue-ability',
  "on your opponent's attack": 'blue-ability',
  "end of your opponent's turn": 'blue-ability',
  'once per turn': 'pink-ability',
  blocker: 'orange-ability',
  rush: 'orange-ability',
  'rush: character': 'orange-ability',
  'double attack': 'orange-ability',
  banish: 'orange-ability',
  unblockable: 'orange-ability',
  counter: 'red-ability',
  trigger: 'trigger-ability',
};

const TRIGGER_TAG_RE = /\[trigger\]\s*/i;

function replaceEvery(text: string, search: string, replacement: string): string {
  return text.split(search).join(replacement);
}

function chipInner(text: string, className: string): string {
  if (className === 'trigger-ability') {
    return `<span class="trigger-ability-container"><span class="trigger-ability-shadow"></span><span class="op-chip trigger-ability">${text}</span></span>`;
  }
  if (className === 'orange-ability') {
    return `<span class="orange-ability-container"><span class="orange-ability-shadow"></span><span class="op-chip orange-ability">${text}</span></span>`;
  }
  if (className === 'black-ability') {
    return `<span class="black-ability-container"><span class="black-ability-shadow"></span><span class="op-chip black-ability">${text}</span></span>`;
  }
  return `<span class="op-chip ${className}">${text}</span>`;
}

function chip(text: string, className: string): string {
  return `${chipInner(text, className)}&nbsp;`;
}

function escapeHtml(text: string): string {
  return replaceEvery(
    replaceEvery(replaceEvery(replaceEvery(text, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
    '"',
    '&quot;',
  );
}

function chipifyTags(escapedText: string): string {
  const replaced = escapedText.replace(/\[([^[\]]{1,40})\]/g, (whole, inner: string) => {
    const key = inner.trim().toLowerCase();
    if (/^don!! ?x\d+$/.test(key) || /^don!! ?[-−]\d+$/.test(key)) {
      return chip(inner.trim(), 'black-ability');
    }
    const className = CHIP_CLASS_BY_TAG[key];
    return className ? chip(inner.trim(), className) : whole;
  });
  return replaceEvery(replaced, '&nbsp; ', '&nbsp;');
}

/** `{Type}` trait references (Comprehensive Rules 2-4-3). Display-only. */
function highlightTypeIdentifiers(escapedText: string): string {
  return escapedText.replace(/\{([^{}]{1,80})\}/g, (whole) => `<span class="effect-type-identifier">${whole}</span>`);
}

/** `[Card Name]` references left after known keyword chips are applied. Display-only. */
function highlightCardNames(escapedText: string): string {
  return escapedText.replace(/\[([^[\]]{1,80})\]/g, (whole) => `<span class="effect-card-name">${whole}</span>`);
}

/** Raw card_text -> rich HTML with ability chips for display. */
export function cardEffectTextToHtml(text: string): string {
  return replaceEvery(highlightTypeIdentifiers(highlightCardNames(chipifyTags(escapeHtml(text)))), '\n', '<br>');
}

export function splitTriggerText(text: string): { ability: string; trigger: string } {
  const match = text.match(TRIGGER_TAG_RE);
  if (!match || match.index === undefined) {
    return { ability: text, trigger: '' };
  }
  return {
    ability: text.slice(0, match.index).trim(),
    trigger: text.slice(match.index + match[0].length).trim(),
  };
}

/** Main effect body for preview: strips inline [Trigger] when shown separately. */
export function cardAbilityDisplayText(text: string, hasTrigger: boolean, triggerText?: string): string {
  if (!text) return '';
  if (!hasTrigger) return text;
  if (triggerText !== undefined) {
    const { ability } = splitTriggerText(text);
    return ability || text.replace(TRIGGER_TAG_RE, '').trim();
  }
  return splitTriggerText(text).ability;
}
