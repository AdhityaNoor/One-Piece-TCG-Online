// @vitest-environment jsdom
/**
 * Mobile hand dock (DockHand `tapActions`).
 *
 * Not a game rule — a UI contract, but one with two rules of its own that are
 * easy to regress: a hand card must be operated exactly like a field card
 * (tap → raise + action bubble, never a magnified overlay), and the strip must
 * stay docked in view rather than hiding itself.
 */
import { act, type ComponentProps, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DockHand } from '../DockHand';
import type { CardView } from '../../../../board/projection';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CARD_WIDTH = 76;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 88 / 63);
const PEEK = 0.16;

function makeCard(instanceId: string): CardView {
  return {
    instanceId,
    cardDefinitionId: 'TEST-HAND-CARD',
    cardNumber: 'TEST-001',
    name: `Hand Card ${instanceId}`,
    category: 'character',
    imageUrl: null,
    donAttachedIds: [],
    donAttachedCount: 0,
  } as unknown as CardView;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(node: ReactNode): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(node); });
}

afterEach(() => {
  act(() => { root?.unmount(); });
  container?.remove();
  container = null;
  root = null;
});

function dock(props: Partial<ComponentProps<typeof DockHand>> = {}) {
  const card = makeCard('c1');
  return (
    <DockHand
      playerId="p1"
      cards={[card]}
      isOwn
      position="bottom"
      selectedIds={new Set<string>()}
      selectable={() => true}
      canPlay={() => true}
      onCardTap={() => {}}
      onPlayCard={() => {}}
      onCardZoom={() => {}}
      boardFocused={false}
      cardWidthPx={CARD_WIDTH}
      restPeekRatio={PEEK}
      touchReveal
      tapActions
      {...props}
    />
  );
}

function cardEl(): HTMLElement {
  const el = container!.querySelector('[data-card-instance-id="c1"]');
  if (!(el instanceof HTMLElement)) throw new Error('hand card not rendered');
  return el;
}

// The bubble is portalled to <body> (fixed-positioned) so no scroller or
// overflow: hidden ancestor can clip it — hence document, not container.
function bubble(): HTMLElement | null {
  return document.body.querySelector('.op-mobile-card-action-bubble');
}

function bubbleButtons(): string[] {
  return Array.from(document.body.querySelectorAll('.op-mobile-card-action-bubble button')).map((b) => (b.textContent ?? '').trim());
}

function click(el: Element): void {
  act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

describe('DockHand tapActions (mobile hand dock)', () => {
  it('stays docked in view at rest instead of hiding off screen', () => {
    render(dock());
    const strip = container!.querySelector('[data-board-zone="hand"] > div');
    const transform = (strip as HTMLElement).style.transform;
    const offset = Number(/translateY\((-?[\d.]+)px\)/.exec(transform)?.[1]);
    // Only the peek fraction is tucked behind the edge — the old mobile dock
    // used restPeekRatio 1 (the whole card hidden until a tab was tapped).
    expect(offset).toBeCloseTo(CARD_HEIGHT * PEEK, 0);
    expect(offset).toBeLessThan(CARD_HEIGHT);
  });

  it('shows no action affordance until the card is tapped, then raises it', () => {
    render(dock());
    expect(bubbleButtons()).toEqual([]);
    // Never magnified: the desktop dock scales the hovered card to 2.35x.
    expect(cardEl().style.transform).toContain('scale(1)');

    click(cardEl());

    expect(bubbleButtons()).toEqual(['Play', 'View']);
    const transform = cardEl().style.transform;
    expect(transform).toContain('scale(1)');
    const lift = Number(/translateY\((-?[\d.]+)px\)/.exec(transform)?.[1]);
    // Bottom dock lifts UP (negative), and by more than the peek so the card
    // clears the strip completely.
    expect(lift).toBeLessThan(-CARD_HEIGHT * PEEK);
  });

  it('plays from the bubble and closes it', () => {
    const onPlayCard = vi.fn();
    render(dock({ onPlayCard }));
    click(cardEl());
    const play = Array.from(document.body.querySelectorAll('.op-mobile-card-action-bubble button')).find((b) => b.textContent?.trim() === 'Play');
    click(play!);
    expect(onPlayCard).toHaveBeenCalledTimes(1);
    expect(bubbleButtons()).toEqual([]);
  });

  it('tapping the same card again closes the bubble', () => {
    render(dock());
    click(cardEl());
    expect(bubbleButtons()).toHaveLength(2);
    click(cardEl());
    expect(bubbleButtons()).toEqual([]);
  });

  it('selects directly while a selection mode is collecting targets', () => {
    const onCardTap = vi.fn();
    render(dock({ selectionActive: true, onCardTap }));
    click(cardEl());
    expect(onCardTap).toHaveBeenCalledTimes(1);
    expect(bubbleButtons()).toEqual([]);
  });

  it('renders the bubble outside the hand strip so nothing can clip it', () => {
    render(dock());
    click(cardEl());
    const el = bubble();
    expect(el).not.toBeNull();
    // Portalled to <body>, not nested in the horizontal scroller.
    expect(container!.contains(el)).toBe(false);
    expect(el!.style.position).toBe('fixed');
  });

  it('closes when something outside the card is tapped', () => {
    render(dock());
    click(cardEl());
    expect(bubbleButtons()).toHaveLength(2);
    act(() => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
    expect(bubbleButtons()).toEqual([]);
  });

  it('opens the bubble downward for the top (opponent-side) dock', () => {
    render(dock({ position: 'top' }));
    click(cardEl());
    expect(bubble()?.classList.contains('is-below')).toBe(true);
  });
});
