/**
 * Root of the app: switches Home/Play/Decks/Social by tab (see
 * navigationStore's HubTab + setHubTab — an instant swap, not a stack push).
 * Rendered for the `hub` screen target and its legacy aliases
 * (`main-menu`/`play-menu`/`saved-decks`, kept only so MatchScreen's
 * `resetTo` calls stay untouched — see navigationStore.ts).
 */
import type { HubTab } from '../store/navigationStore';
import { HomeTab } from './hub/HomeTab';
import { SocialTab } from './hub/SocialTab';
import { PlayMenuScreen } from './PlayMenuScreen';
import { SavedDecksScreen } from './SavedDecksScreen';
import { SettingsScreen } from './SettingsScreen';

export function HubScreen({ tab }: { tab: HubTab }) {
  switch (tab) {
    case 'home':
      return <HomeTab />;
    case 'play':
      return <PlayMenuScreen />;
    case 'decks':
      return <SavedDecksScreen />;
    case 'social':
      return <SocialTab />;
    case 'settings':
      return <SettingsScreen />;
  }
}
