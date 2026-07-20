/**
 * Universal top bar — see AppShell.tsx. Applied to every screen except live
 * gameplay (match / online-match / play-test all render MatchScreen itself,
 * which owns its own full-viewport chrome and is never touched here).
 *
 * Home / Play / Decks / Social / Settings are an instant tab swap
 * (navigationStore's `setHubTab` — always resets to the hub root on that
 * tab, no back-stack entry). Settings used to be a separate gear-icon button
 * routed as a pushed screen; it's a tab like the others now (see
 * navigationStore.ts's HubTab union) so it reads consistently with the rest
 * of the bar instead of looking like a different kind of control.
 *
 * The profile preview (avatar + username, far right) is NOT a tab — it's a
 * shortcut straight to the Pirate Profile screen, styled differently on
 * purpose so it doesn't look like a sixth tab.
 *
 * Visual language: dark frosted glass bar. Each nav item is plain text when
 * unselected; the active item sits over a full-height, skewed red
 * parallelogram. That fill is a SINGLE shared element (not one per tab): it's
 * absolutely positioned inside the nav and slides sideways to the active tab
 * by animating `transform`/`width`, so switching menus glides the highlight
 * horizontally to the new item instead of fading or wiping in place. We
 * measure the active button's `offsetLeft`/`offsetWidth` (re-measured on tab
 * change and on resize) to drive it. The skew lives on an inner span so its
 * transform-origin stays centered on itself and the outer slide transform
 * doesn't shear it. The first appearance (and any hidden->shown transition,
 * e.g. leaving the profile screen) jumps without animating so the highlight
 * never streaks in from the far left.
 *
 * Mobile/tablet (below `sm`): the desktop tab row (`hidden sm:flex`, still
 * pixel-identical above `sm`) is swapped for a single trigger button showing
 * the active tab's label + a chevron; tapping it drops a full-width menu of
 * all five tabs beneath the header. A fixed-position backdrop behind the
 * menu closes it on outside-tap. This is purely a `sm:hidden` / `sm:flex`
 * split — no desktop layout, sizing, or spacing changed.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { HubTab } from '../store/navigationStore';
import { useCurrentScreen, useHeaderTab, useNavigationStore } from '../store/navigationStore';
import { useSettingsStore } from '../store/settingsStore';
import { resolveAvatarUrl } from '../lib/avatars';

const TABS: { id: HubTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'play', label: 'Play' },
  { id: 'decks', label: 'Decks' },
  { id: 'social', label: 'Social' },
  { id: 'settings', label: 'Settings' },
];

export function AppHeader() {
  const current = useCurrentScreen();
  const activeTab = useHeaderTab();
  const setHubTab = useNavigationStore((state) => state.setHubTab);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const username = useSettingsStore((state) => state.username);
  const avatarId = useSettingsStore((state) => state.avatarId);
  const isProfileActive = current.screen === 'profile';

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const wasVisible = useRef(false);
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean; animate: boolean }>({
    left: 0,
    width: 0,
    visible: false,
    animate: false,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? 'Menu';

  useLayoutEffect(() => {
    const measure = () => {
      if (!activeTab) {
        wasVisible.current = false;
        setIndicator((prev) => ({ ...prev, visible: false }));
        return;
      }
      const el = tabRefs.current[activeTab];
      if (!el) {
        wasVisible.current = false;
        setIndicator((prev) => ({ ...prev, visible: false }));
        return;
      }
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, visible: true, animate: wasVisible.current });
      wasVisible.current = true;
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeTab]);

  // Collapse the mobile dropdown whenever the active tab changes for any
  // reason (a tab tap already closes it locally, but this also covers
  // navigating away and back, e.g. via the profile shortcut).
  useLayoutEffect(() => {
    setMobileNavOpen(false);
  }, [activeTab]);

  return (
    <header className="relative z-30 h-16 w-full flex-shrink-0 border-b border-white/10 bg-black/15 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:h-20">
    {/* Row content lives in its own overflow-hidden wrapper, separate from
        `header` itself, because the mobile dropdown below needs to render
        OUTSIDE this row's box (positioned off `header`, which stays
        overflow-visible) — clipping had to move one level in rather than
        living on `header` directly, or the dropdown would clip itself.
        This wrapper's `overflow-hidden` is also a hard guarantee: whatever
        intrinsic-sizing quirk was pushing the profile avatar out of its own
        box on iOS Safari, it now physically cannot spill past this row and
        overlap the nav trigger — the browser has no choice but to clip it
        to the row's real width. */}
    <div className="flex h-full w-full items-stretch gap-2 overflow-hidden px-3 sm:gap-2 sm:px-6">
      <button
        type="button"
        onClick={() => setHubTab('home')}
        aria-label="Home"
        className="relative z-10 flex flex-shrink-0 items-center justify-center py-1"
      >
        <span
          aria-hidden="true"
          className="block h-9 w-auto aspect-[562/145] bg-[linear-gradient(180deg,_#ffe17a_0%,_#d9a441_50%,_#8e5b12_100%)] sm:h-12"
          style={{
            WebkitMaskImage: 'url(/ui/logo_op.png)',
            maskImage: 'url(/ui/logo_op.png)',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
      </button>

      {/* Mobile/tablet trigger — replaces the whole tab row below `sm`. */}
      <button
        type="button"
        onClick={() => setMobileNavOpen((value) => !value)}
        aria-expanded={mobileNavOpen}
        aria-haspopup="true"
        aria-label="Toggle navigation menu"
        className="relative z-10 ml-1 flex h-full min-w-0 flex-1 items-center justify-between gap-2 pl-3 sm:hidden"
      >
        <span className="truncate font-heading text-base font-black uppercase tracking-[0.06em] text-white">
          {activeTabLabel}
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={[
            'h-5 w-5 flex-shrink-0 text-white/70 transition-transform duration-200',
            mobileNavOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <nav className="relative z-10 ml-1 hidden h-full min-w-0 flex-1 items-stretch gap-1 overflow-x-auto pl-3 sm:ml-6 sm:flex sm:gap-2 sm:pl-4" aria-label="Main navigation">
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-y-0 left-0 z-0',
            indicator.visible ? 'opacity-100' : 'opacity-0',
            indicator.animate ? 'transition-[transform,width,opacity] duration-300 ease-out' : '',
          ].join(' ')}
          style={{ width: `${indicator.width}px`, transform: `translateX(${indicator.left}px)` }}
        >
          <span className="absolute inset-0 skew-x-12 bg-red-600" />
        </span>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              onClick={() => setHubTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className="group relative z-10 flex flex-shrink-0 items-center px-4 transition-colors sm:px-7"
            >
              <span
                className={[
                  'relative z-10 font-heading text-base font-black uppercase tracking-[0.06em] transition-colors sm:text-lg sm:tracking-[0.08em]',
                  isActive ? 'text-white' : 'text-white/60 group-hover:text-white',
                ].join(' ')}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => navigateTo({ screen: 'profile' })}
        aria-label="Your profile"
        aria-current={isProfileActive ? 'page' : undefined}
        className="group relative z-10 ml-auto flex max-w-[3.25rem] flex-shrink-0 items-center gap-1.5 px-1 sm:max-w-none sm:min-w-0 sm:gap-2 sm:px-1.5"
      >
        {/* No fill/box behind the art — the button itself carries no
            background either, so only the character's own silhouette (the
            source webp's alpha) ever shows against the header. Below `sm`
            the art gets an explicit fixed height (`h-10`, not a `h-full`
            percentage) — percentage-height images inside a flex-stretched
            row were rendering at the wrong intrinsic width on iOS Safari
            specifically, ballooning the button and overlapping the nav
            trigger next to it. A fixed rem value has no ancestor-height
            chain to resolve against, so there's nothing left for that to go
            wrong on. `sm:h-full` restores the original "spans the header's
            full height" treatment once the row has the extra breathing room
            of the desktop layout. */}
        <img
          src={resolveAvatarUrl(avatarId)}
          alt=""
          draggable={false}
          className={[
            'h-10 w-auto flex-shrink-0 object-contain transition-all sm:h-full sm:py-2',
            isProfileActive ? 'drop-shadow-[0_0_6px_rgba(217,164,65,0.75)]' : 'opacity-80 group-hover:opacity-100',
          ].join(' ')}
        />
        <span
          className={[
            'hidden min-w-0 max-w-[5rem] truncate text-left text-[11px] font-black uppercase tracking-[0.06em] transition-colors sm:inline-block sm:max-w-[7rem] sm:text-xs lg:max-w-[10rem]',
            isProfileActive ? 'text-gold' : 'text-white/75 group-hover:text-white',
          ].join(' ')}
        >
          {username}
        </span>
      </button>
    </div>

      {/* Mobile dropdown menu — anchored to the header (which is `relative`),
          so it spans the full header width regardless of where the trigger
          button sits in the flex row. `sm:hidden` so it can never render at
          desktop widths even if state is somehow left open through a resize. */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-20 sm:hidden"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className="absolute inset-x-0 top-full z-30 flex flex-col border-b border-white/10 bg-[#050d1e] shadow-[0_16px_30px_rgba(0,0,0,0.45)] sm:hidden"
            role="menu"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setHubTab(tab.id);
                    setMobileNavOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center justify-between px-4 py-3.5 text-left font-heading text-sm font-black uppercase tracking-[0.08em] transition-colors',
                    isActive ? 'bg-red-600/20 text-white' : 'text-white/60 active:bg-white/5',
                  ].join(' ')}
                >
                  {tab.label}
                  {isActive && (
                    <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold shadow-[0_0_8px_rgba(217,164,65,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </header>
  );
}
