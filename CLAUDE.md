Design the card library and deck-save architecture.

Requirements:
1. Card library preview should fetch/search cards from OPTCG API.
2. Deck builder should use live API data while browsing.
3. Saving a deck must create a stable local snapshot of every selected card.
4. The saved deck must not break if the API changes later.
5. Saved deck data should include normalized card data for the game engine.
6. Do not use API card text directly as executable effect logic.
7. Store card effect text as raw text, then map it later to effect templates.
8. Card images/assets should be cacheable.
9. Support future asset download/caching.
10. Support future offline/local deck loading.

Output:
1. API provider analysis
2. Card data model
3. Normalized card model
4. Saved deck model
5. Card asset caching strategy
6. Deck builder flow
7. Save deck flow
8. API adapter folder structure
9. Error handling strategy
10. TypeScript interfaces
11. First implementation milestone