/**
 * App root — a thin switch over the navigation stack's current screen
 * (navigationStore.ts). Holds no logic of its own: every actual screen is
 * its own component under /src/app/screens. The full nav graph (Main Menu ->
 * Deck Builder -> Save -> Saved Decks -> Play -> Deck Select -> Match) is
 * built and clickable end-to-end as of Task 11. ComingSoonScreen still exists
 * under /src/app/screens for any future NavigationTarget added before its
 * real screen is built, but nothing currently routes to it.
 */
import {
  CardLibraryScreen,
  DebugToolsScreen,
  DeckBuilderScreen,
  DeckSelectScreen,
  MainMenuScreen,
  MatchScreen,
  SavedDecksScreen,
  SettingsScreen,
} from './screens';
import { useCurrentScreen } from './store/navigationStore';

export function App() {
  const current = useCurrentScreen();

  switch (current.screen) {
    case 'main-menu':
      return <MainMenuScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'debug-tools':
      return <DebugToolsScreen />;
    case 'card-library':
      return <CardLibraryScreen />;
    case 'deck-builder':
      return <DeckBuilderScreen />;
    case 'saved-decks':
      return <SavedDecksScreen />;
    case 'deck-select':
      return <DeckSelectScreen />;
    case 'match':
      return <MatchScreen />;
    default:
      return <MainMenuScreen />;
  }
}
