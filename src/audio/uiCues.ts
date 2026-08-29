/**
 * Which cue a raw DOM interaction should make. Kept as a pure element->cue
 * function so the global listener in the app shell stays three lines long and
 * this logic is unit-testable.
 *
 * Components opt out of, or override, the default with attributes:
 *   data-sfx="ui.back"     play this cue instead
 *   data-sfx="none"        stay silent (drag handles, canvases, list rows)
 *   data-sfx-role="tab"    pick a cue by role without naming one
 * The attribute wins over every heuristic below, so a component always has
 * the final say over how it sounds.
 */
import { isSoundCueId, type SoundCueId } from './cues';

/** Minimal shape of the DOM we need — keeps this file testable without jsdom. */
export interface CueElementLike {
  getAttribute(name: string): string | null;
  closest(selector: string): CueElementLike | null;
}

const ROLE_CUES: Record<string, SoundCueId> = {
  primary: 'ui.confirm',
  confirm: 'ui.confirm',
  back: 'ui.back',
  cancel: 'ui.back',
  close: 'ui.modal.close',
  tab: 'ui.tab',
  destructive: 'ui.deck.remove',
  add: 'ui.deck.add',
  card: 'ui.card.detail.open',
  chat: 'ui.chat.send',
};

/** Labels that read as "go back" even when the component never says so. */
const BACK_LABEL = /\b(back|cancel|close|dismiss|return)\b/i;

function explicit(element: CueElementLike): SoundCueId | null | undefined {
  const raw = element.getAttribute('data-sfx');
  if (raw === null) return undefined;
  if (raw === 'none' || raw === 'off') return null;
  return isSoundCueId(raw) ? raw : undefined;
}

/** The cue for pressing `element`, or null for deliberate silence. */
export function resolveClickCue(element: CueElementLike): SoundCueId | null {
  const owner = element.closest('[data-sfx], [data-sfx-role]') ?? element;
  const chosen = explicit(owner);
  if (chosen !== undefined) return chosen;

  const role = owner.getAttribute('data-sfx-role');
  if (role && ROLE_CUES[role]) return ROLE_CUES[role];

  // A switch announces where it is going, not where it has been: aria-checked
  // is still the PRE-click value when the listener runs.
  if (element.getAttribute('role') === 'switch' || element.closest('[role="switch"]')) {
    const node = element.getAttribute('role') === 'switch' ? element : element.closest('[role="switch"]');
    return node?.getAttribute('aria-checked') === 'true' ? 'ui.toggle.off' : 'ui.toggle.on';
  }
  if (element.closest('[role="tab"]')) return 'ui.tab';

  const label = element.getAttribute('aria-label') ?? element.getAttribute('title') ?? '';
  if (BACK_LABEL.test(label)) return 'ui.back';

  return 'ui.click';
}

/** The cue for focusing/hovering `element`, or null. Hover cues are the quietest thing in the mix. */
export function resolveHoverCue(element: CueElementLike): SoundCueId | null {
  const raw = element.getAttribute('data-sfx-hover');
  if (raw === 'none' || raw === 'off') return null;
  if (raw !== null && isSoundCueId(raw)) return raw;
  if (element.getAttribute('data-sfx-role') === 'card' || element.closest('[data-sfx-role="card"]')) {
    return 'ui.card.hover';
  }
  return 'ui.hover';
}
