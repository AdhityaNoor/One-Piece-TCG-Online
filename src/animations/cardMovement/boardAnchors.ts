import type { BoardZoneId, MovementAnchor } from './types';

const REF_CARD_W = 150;
const REF_CARD_H = 210;
const REF_ASPECT = REF_CARD_H / REF_CARD_W;
const DON_REF_W = 150;
const DON_REF_H = 210;

/** Zones whose DOM container grows with pile size — never scale from the full box. */
const PILE_ZONES: ReadonlySet<BoardZoneId> = new Set(['costArea', 'donDeck', 'deck']);

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function zoneSelector(playerId: string, zone: BoardZoneId): string {
  return `[data-board-player="${playerId}"][data-board-zone="${zone}"]`;
}

/** Resolve a zone or card tile to a screen-space rect for flying-card animations. */
export function resolveAnchorRect(
  shell: HTMLElement,
  playerId: string,
  anchor: MovementAnchor,
): DOMRect | null {
  const rootSel = zoneSelector(playerId, anchor.zone);
  const zoneEl = shell.querySelector<HTMLElement>(rootSel);

  if (anchor.instanceId) {
    const scoped = shell.querySelector<HTMLElement>(
      `${rootSel} [data-card-instance-id="${anchor.instanceId}"]`,
    );
    if (scoped) return scoped.getBoundingClientRect();

    const anywhere = shell.querySelector<HTMLElement>(
      `[data-card-instance-id="${anchor.instanceId}"]`,
    );
    if (anywhere) return anywhere.getBoundingClientRect();
  }

  // Prefer a card-sized anchor inside the zone (chip, deck top card, dock slot).
  const cardAnchor =
    zoneEl?.querySelector<HTMLElement>('[data-board-card-anchor]')
    ?? shell.querySelector<HTMLElement>(`${rootSel} [data-board-card-anchor]`);
  if (cardAnchor) return cardAnchor.getBoundingClientRect();

  if (zoneEl) return normalizePileRect(zoneEl.getBoundingClientRect(), anchor.zone);

  return null;
}

/** Shrink an oversized pile container rect to a single card footprint at its origin. */
function normalizePileRect(rect: DOMRect, zone: BoardZoneId): DOMRect {
  if (!PILE_ZONES.has(zone)) return rect;
  const w = Math.min(rect.width, DON_REF_W * 1.15);
  const h = Math.min(rect.height, DON_REF_H * 1.15);
  return new DOMRect(rect.left, rect.top, w, h);
}

/** Map an anchor's measured box to a card scale (zone strips can span full table width). */
export function cardScaleFromAnchorRect(
  rect: DOMRect,
  anchor: MovementAnchor,
  isDon = false,
): number {
  if (isDon) {
    const scale = Math.min(rect.width / DON_REF_W, rect.height / DON_REF_H);
    return clamp(scale, 0.85, 1.08);
  }

  if (anchor.instanceId) {
    const scale = Math.min(rect.width / REF_CARD_W, rect.height / REF_CARD_H);
    return clamp(scale, 0.25, 1.35);
  }

  if (PILE_ZONES.has(anchor.zone)) {
    const scale = Math.min(rect.width / REF_CARD_W, rect.height / REF_CARD_H);
    return clamp(scale, 0.5, 1.1);
  }

  // Wide zone containers (hand dock, character row): size from height, not width.
  const heightScale = rect.height / REF_CARD_H;
  const widthFromHeight = rect.height / REF_ASPECT;
  const widthScale = widthFromHeight / REF_CARD_W;
  return clamp(Math.min(heightScale, widthScale), 0.25, 1.35);
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
