import type { BoardZoneId, MovementAnchor } from './types';

const REF_CARD_W = 150;
const REF_CARD_H = 210;
const REF_ASPECT = REF_CARD_H / REF_CARD_W;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Resolve a zone or card tile to a screen-space rect for flying-card animations. */
export function resolveAnchorRect(
  shell: HTMLElement,
  playerId: string,
  anchor: MovementAnchor,
): DOMRect | null {
  if (anchor.instanceId) {
    const scoped = shell.querySelector<HTMLElement>(
      `[data-board-player="${playerId}"][data-board-zone="${anchor.zone}"] [data-card-instance-id="${anchor.instanceId}"]`,
    );
    if (scoped) return scoped.getBoundingClientRect();

    const cardEl = shell.querySelector<HTMLElement>(
      `[data-card-instance-id="${anchor.instanceId}"]`,
    );
    if (cardEl) return cardEl.getBoundingClientRect();
  }

  const zoneEl = shell.querySelector<HTMLElement>(
    `[data-board-player="${playerId}"][data-board-zone="${anchor.zone}"] [data-board-card-anchor]`,
  ) ?? shell.querySelector<HTMLElement>(
    `[data-board-player="${playerId}"][data-board-zone="${anchor.zone}"]`,
  );
  if (zoneEl) return zoneEl.getBoundingClientRect();

  return null;
}

/** Map an anchor's measured box to a card scale (zone strips can span full table width). */
export function cardScaleFromAnchorRect(rect: DOMRect, anchor: MovementAnchor): number {
  if (anchor.instanceId) {
    const scale = Math.min(rect.width / REF_CARD_W, rect.height / REF_CARD_H);
    return clamp(scale, 0.25, 1.6);
  }

  // Wide zone containers (hand dock, character row): size from height, not width.
  const heightScale = rect.height / REF_CARD_H;
  const widthFromHeight = rect.height / REF_ASPECT;
  const widthScale = widthFromHeight / REF_CARD_W;
  return clamp(Math.min(heightScale, widthScale), 0.25, 1.6);
}

export function anchorCenterInShell(
  shellRect: DOMRect,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2 - shellRect.left,
    y: rect.top + rect.height / 2 - shellRect.top,
  };
}

const ENGINE_TO_BOARD_ZONE: Record<string, BoardZoneId | null> = {
  deck: 'deck',
  donDeck: 'donDeck',
  hand: 'hand',
  lifeArea: 'life',
  trash: 'trash',
  characterArea: 'characterArea',
  leaderArea: 'leaderArea',
  stageArea: 'stageArea',
  costArea: 'costArea',
};

export function normalizeEngineZone(zone: unknown): BoardZoneId | null {
  if (typeof zone !== 'string') return null;
  return ENGINE_TO_BOARD_ZONE[zone] ?? null;
}
