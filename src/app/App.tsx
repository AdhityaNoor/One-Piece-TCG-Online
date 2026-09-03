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
 * OnlineRpsToss is mounted here, at the root, rather than inside any one
 * screen. The server opens the pre-game Rock-Paper-Scissors round in the
 * window between "both seats ready" and "match started" — which is BEFORE
 * either client has navigated to `online-match`. Casual clients are still on
 * `casual-lobby` and ranked clients on `ranked` at that moment, so a toss
 * mounted under MatchScreen could never be thrown, and the room waited on a
 * pick that had no UI. It self-gates on `onlineStore.rps` and draws its own
 * full-screen scrim, so a single root-level mount covers every screen the
 * toss can open on, including a rematch toss that opens while both players
 * are still sitting on the finished board.
 *
 * FanProjectNotice is mounted at the root for the same reason as
 * OnlineRpsToss, but with the opposite gate: it is a one-time "this is an
 * unofficial fan project" acknowledgement that must be seen once on ANY
 * screen a first-run player can land on, so it self-gates on localStorage
 * (see FanProjectNotice.tsx) and renders nothing thereafter. It sits inside
 * the authenticated branch on purpose — LandingScreen returns early above
 * and carries the same disclaimer inline, so a signed-out visitor is never
 * shown the notice twice.
 *
 * ComingSoonScreen still exists under /src/app/screens for any future
 * NavigationTarget added before its real screen is built, but nothing
 * currently routes to it.
 */
import { AppShell, BacksoundControl, FanProjectNotice } from './components';
import { OnlineRpsToss } from './components/match/OnlineRpsToss';
import {
  CardLibraryScreen,
  CreditsScreen,
  CpuDeckSelectScreen,
  CasualLobbyScreen,
  DebugToolsScreen,
  DeckBuilderScreen,
  AccessoriesScreen,
  DeckStatsScreen,
  DeckSelectScreen,
  HubScreen,
  LandingScreen,
  LegalScreen,
  MatchScreen,
  PlayTestScreen,
  ProfileScreen,
  RankedScreen,
  SettingsScreen,
  SplashScreen,
} from './screens';
import { useCurrentScreen, useNavigationStore } from './store/navigationStore';
import { useAppInit } from './hooks/useAppInit';
import { useAuthStore } from './store/authStore';
import { TutorialManager } from '../features/tutorial';

const BARE_SCREENS = new Set(['match', 'online-match', 'play-test', 'tutorial']);

export function App() {
  const { ready, progress } = useAppInit();
  const current = useCurrentScreen();
  const navigateTo = useNavigationStore((state) => state.navigateTo);
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
      case 'tutorial':
        return <TutorialManager />;
      case 'card-library':
        return <CardLibraryScreen />;
      case 'deck-builder':
        return <DeckBuilderScreen />;
      case 'accessories':
        return <AccessoriesScreen />;
      case 'deck-stats':
        return <DeckStatsScreen />;
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
      case 'legal':
        return <LegalScreen doc={current.doc} />;
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
      <OnlineRpsToss />
      <FanProjectNotice onOpenLegal={() => navigateTo({ screen: 'legal' })} />
      <BacksoundControl />
    </>
  );
}
