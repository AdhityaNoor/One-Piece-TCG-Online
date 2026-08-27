// @vitest-environment jsdom
/**
 * The browse grid loads on SCROLL, not on a "Load more" click, and only ever grows by a
 * whole number of grid columns so the last row is never a ragged half-row.
 *
 * Both halves are easy to regress invisibly: swapping the sentinel back for a button still
 * "works", and dropping the column rounding still shows cards — it just leaves a gap-toothed
 * final row that nobody notices in review. The column count can only come from the laid-out
 * DOM (the grids are `auto-fill`), so `getComputedStyle` is stubbed to a known track list.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLUMNS = 5;
const FILTERED_COUNT = 400;
const setVisibleCountCalls: number[] = [];

const storeState = {
  selectedSetId: 'OP01',
  setStatusById: { OP01: 'ready' } as Record<string, string>,
  setErrorById: {} as Record<string, unknown>,
  loadSetCards: () => {},
  visibleCount: 30,
  setVisibleCount: (n: number) => {
    setVisibleCountCalls.push(n);
    storeState.visibleCount = n;
  },
};

vi.mock('../../../store/cardLibraryStore', () => ({
  CARD_LIBRARY_PAGE_SIZE: 30,
  useCardLibraryStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
  useFilteredCardLibraryCount: () => FILTERED_COUNT,
  useKnownCardLibraryTypes: () => [],
  useVisibleCardLibraryEntries: () =>
    Array.from({ length: storeState.visibleCount }, (_, i) => ({ cardNumber: `C-${i}` })),
}));

const { CardSetBrowserResults } = await import('../CardSetBrowser');

let container: HTMLDivElement;
let root: Root;
let observerCallbacks: IntersectionObserverCallback[] = [];

beforeEach(() => {
  setVisibleCountCalls.length = 0;
  storeState.visibleCount = 30;
  observerCallbacks = [];

  class StubObserver {
    constructor(cb: IntersectionObserverCallback) {
      observerCallbacks.push(cb);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', StubObserver);
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    gridTemplateColumns: Array.from({ length: COLUMNS }, () => '100px').join(' '),
  } as CSSStyleDeclaration);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount() {
  act(() => {
    root.render(<CardSetBrowserResults renderEntry={(entry) => <div key={entry.cardNumber} />} />);
  });
}

/** Fire the most recently registered observer as if the sentinel came into view. */
function scrollSentinelIntoView() {
  const callback = observerCallbacks[observerCallbacks.length - 1];
  act(() => {
    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

describe('browse results load on scroll', () => {
  it('offers no "Load more" button', () => {
    mount();
    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent ?? '');
    expect(labels.some((text) => /load more/i.test(text))).toBe(false);
  });

  it('renders a sentinel while more cards remain', () => {
    mount();
    expect(container.querySelector('[data-testid="browser-results-sentinel"]')).not.toBeNull();
  });

  it('grows the window when the sentinel comes into view', () => {
    mount();
    setVisibleCountCalls.length = 0;
    scrollSentinelIntoView();
    expect(setVisibleCountCalls.length).toBeGreaterThan(0);
    expect(setVisibleCountCalls[setVisibleCountCalls.length - 1]).toBeGreaterThan(30);
  });

  it('only ever asks for whole rows', () => {
    mount();
    setVisibleCountCalls.length = 0;
    scrollSentinelIntoView();
    for (const count of setVisibleCountCalls) {
      expect(count % COLUMNS, `${count} is not a multiple of the ${COLUMNS} columns`).toBe(0);
    }
  });

  it('never grows past the filtered total', () => {
    mount();
    storeState.visibleCount = FILTERED_COUNT - 2;
    scrollSentinelIntoView();
    for (const count of setVisibleCountCalls) expect(count).toBeLessThanOrEqual(FILTERED_COUNT);
  });

  it('does nothing while the sentinel is out of view', () => {
    mount();
    setVisibleCountCalls.length = 0;
    const callback = observerCallbacks[observerCallbacks.length - 1];
    act(() => {
      callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(setVisibleCountCalls).toEqual([]);
  });
});
