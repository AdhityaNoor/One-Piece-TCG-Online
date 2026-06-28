/**
 * Browse creation method — same set-picker/filter/pagination surface as the
 * Card Library screen (CardSetBrowser), but each result renders as a
 * DeckBuilderResultTile (add/remove/set-leader) instead of a plain zoom tile.
 */
import { CardSetBrowser } from '../shared';
import { DeckBuilderResultTile } from './DeckBuilderResultTile';

export function BrowseTab() {
  return <CardSetBrowser renderEntry={(entry) => <DeckBuilderResultTile key={entry.cardNumber} entry={entry} />} />;
}
