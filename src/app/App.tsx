/**
 * App root — a thin switch over the navigation stack's current screen
 * (navigationStore.ts). Holds no logic of its own: every actual screen is
 * its own component under /src/app/screens.
 *
 * Every screen except live gameplay (`match`, `online-match`, and
 * `play-test` — which embeds MatchScreen directly for developer testing) is
 * wrapped in AppShell, which renders the universal header (Home/Play/Decks/
 * Social + Settings gear — see AppHeader.tsx) above the screen's own
 * content. MatchScreen owns its own full-viewport chrome and is never
 * touched here, by design.
 *
 * ComingSoonScreen still exists under /src/app/screens for any future
 * NavigationTarget added before its real screen is built, but nothing
 * currently routes to it.
 */
import { AppShell, BacksoundControl } from './components';
import {
  CardLibraryScreen,
  CreditsScreen,
  CpuDeckSelectScreen,
  CasualLobbyScreen,
  DebugToolsScreen,
  DeckBuilderScreen,
  DeckSelectScreen,
  HubScreen,
  LandingScreen,
  MatchScreen,
  PlayTestScreen,
  ProfileScreen,
  RankedScreen,
  SettingsScreen,
  SplashScreen,
} from './screens';
import { useCurrentScreen } from './store/navigationStore';
import { useAppInit } from './hooks/useAppInit';
import { useAuthStore } from './store/authStore';

const BARE_SCREENS = new Set(['match', 'online-match', 'play-test']);

export function App() {
  const { ready, progress } = useAppInit();
  const current = useCurrentScreen();
  const authStatus = useAuthStore((state) => state.status);
  const offlineMode = useAuthStore((state) => state.offlineMode);

  if (!ready) return <SplashScreen progress={progress} />;
  if (authStatus === 'unknown') return <SplashScreen progress={100} />;
  if (authStatus !== 'authenticated' && !offlineMode) {
    return (
      <>
        <LandingScreen />
        <BacksoundControl />
      </>
    );
  }

  const screen = (() => {
    switch (current.screen) {
      case 'hub':
        return <HubScreen tab={current.tab} />;
      case 'main-menu':
        return <HubScreen tab="home" />;
      case 'play-menu':
        return <HubScreen tab="play" />;
      case 'saved-decks':
        return <HubScreen tab="decks" />;
      case 'settings':
        return <SettingsScreen />;
      case 'debug-tools':
        return <DebugToolsScreen />;
      case 'play-test':
        return <PlayTestScreen />;
      case 'card-library':
        return <CardLibraryScreen />;
      case 'deck-builder':
        return <DeckBuilderScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'ranked':
        return <RankedScreen />;
      case 'deck-select':
        return <DeckSelectScreen />;
      case 'cpu-deck-select':
        return <CpuDeckSelectScreen />;
      case 'casual-lobby':
        return <CasualLobbyScreen />;
      case 'online-match':
        return <MatchScreen />;
      case 'credits':
        return <CreditsScreen />;
      case 'match':
        return <MatchScreen />;
      default:
        return <HubScreen tab="home" />;
    }
  })();

  const bare = BARE_SCREENS.has(current.screen);

  return (
    <>
      {bare ? screen : <AppShell>{screen}</AppShell>}
      <BacksoundControl />
    </>
  );
}
