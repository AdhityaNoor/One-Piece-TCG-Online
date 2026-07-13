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
 * unselected; the active item gets a full-height, left-to-right skewed
 * parallelogram in opaque red behind it (an absolutely-positioned skewed
 * span, not a skewed hit-box, so the clickable area/text stay upright).
 * The reveal (scale-y, `origin-top`) and the skew live on two nested spans
 * rather than one — stacking both transforms on a single element forces
 * them to share one transform-origin, which pulls the skew's pivot off its
 * own center and makes the parallelogram shear asymmetrically. The outer
 * span is always mounted (never conditionally rendered) and toggles
 * `scale-y-0` -> `scale-y-100` so switching tabs animates the fill sweeping
 * top-to-bottom instead of popping in instantly; the inner span just skews.
 */
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

  return (
    <header className="relative z-30 flex h-16 w-full flex-shrink-0 items-stretch gap-2 border-b border-white/10 bg-black/15 px-3 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:h-20 sm:px-6">
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

      <nav className="relative z-10 ml-1 flex h-full min-w-0 flex-1 items-stretch gap-1 overflow-x-auto pl-3 sm:ml-6 sm:gap-2 sm:pl-4" aria-label="Main navigation">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setHubTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className="group relative flex flex-shrink-0 items-center px-4 transition-colors sm:px-7"
            >
              <span
                aria-hidden="true"
                className={[
                  'absolute inset-y-0 inset-x-0 origin-top transition-transform duration-300 ease-out',
                  isActive ? 'scale-y-100' : 'scale-y-0',
                ].join(' ')}
              >
                <span className="absolute inset-0 skew-x-12 bg-red-600" />
              </span>
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
        className="group relative z-10 flex min-w-0 flex-shrink-0 items-center gap-1.5 px-1 sm:gap-2 sm:px-1.5"
      >
        {/* No fill/box behind the art — the button itself carries no
            background either, so only the character's own silhouette (the
            source webp's alpha) ever shows against the header. `h-full`
            (no fixed h-8/h-10) so the avatar spans the header's full height,
            same as the logo mark on the left; width follows from the
            source image's own aspect ratio via object-contain. */}
        <img
          src={resolveAvatarUrl(avatarId)}
          alt=""
          draggable={false}
          className={[
            'h-full w-auto flex-shrink-0 object-contain py-1.5 transition-all sm:py-2',
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
    </header>
  );
}
