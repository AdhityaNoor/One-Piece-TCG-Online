/**
 * In-progress deck construction state for the Deck Builder screen (Task 10).
 * Holds selections made via any of the 3 creation methods (Browse,
 * Search-by-ID, Clipboard Import) in the SAME shape (`DeckCardSelection`)
 * the pure `createSavedDeck` already consumes — this store's only job is to
 * accumulate selections and hand them to that pure function on save, never
 * to re-implement deck-construction rules itself. Live legality feedback
 * (project requirement) is just calling `validateDeckConstruction` on every
 * render via the selector hook below, not a parallel rule implementation.
 */
import { create } from 'zustand';
import { evaluateDeckFormatStatusFromCards, type DeckFormatStatusResult } from '../../cards/format';
import { resolveCardPrintingsById } from '../lib/cardCatalog';
import { buildCardLibraryEntry, type CardLibraryEntry } from '../../cards/library';
import {
  createSavedDeck,
  parseClipboardDeckList,
  validateDeckConstruction,
  type DeckCardSelection,
  type DeckConstructionEntry,
  type InvalidDeckListLine,
  type SavedDeck,
  type SavedDeckCardSnapshot,
} from '../../cards/decks';
import { browserFetch, generateDeckId, nowIso } from '../lib/runtime';
import { useSavedDecksStore } from './savedDecksStore';

export interface ClipboardImportIssue {
  cardId: string;
  variant: string | null;
  message: string;
}

export interface ClipboardImportSummary {
  resolvedCount: number;
  issues: ClipboardImportIssue[];
  unresolvedEntries: { cardId: string; variant: string | null; reason: string }[];
  /**
   * Lines that didn't even match the "<qty>x<cardId>[_variant]" format —
   * forwarded verbatim from parseClipboardDeckList's own `invalidLines`
   * (see clipboardImport.ts: "never silently dropped"). Previously this
   * store discarded `parsed.invalidLines` entirely, which meant a typo'd
   * line vanished with zero feedback; fixed here so the UI can show it.
   */
  invalidLines: InvalidDeckListLine[];
}

function snapshotToSelection(snapshot: SavedDeckCardSnapshot): DeckCardSelection {
  const libraryEntry: CardLibraryEntry = {
    cardNumber: snapshot.cardNumber,
    definition: snapshot.definition,
    printings: [
      {
        printingImageId: snapshot.printingImageId,
        setId: snapshot.rawPrinting.set_id,
        setName: snapshot.rawPrinting.set_name,
        rarity: snapshot.rawPrinting.rarity,
        imageUrl: snapshot.imageUrl,
      },
    ],
    rawPrintings: [snapshot.rawPrinting],
    warnings: snapshot.warnings,
  };
  return {
    libraryEntry,
    chosenPrintingImageId: snapshot.printingImageId,
    quantity: snapshot.quantity,
    sourceImportLines: snapshot.sourceImportLines ?? undefined,
  };
}

interface DeckBuilderState {
  editingDeckId: string | null;
  name: string;
  leaderSelection: DeckCardSelection | null;
  mainDeckSelections: DeckCardSelection[];

  clipboardRawInput: string;
  clipboardImportStatus: 'idle' | 'importing' | 'done';
  clipboardImportSummary: ClipboardImportSummary | null;

  lastSaveResult: { ok: true; deck: SavedDeck } | { ok: false; reasons: string[] } | null;

  startNewDeck(): void;
  startEditingDeck(deck: SavedDeck): void;
  setName(name: string): void;

  setLeader(libraryEntry: CardLibraryEntry, printingImageId: string): void;
  removeLeader(): void;

  addMainDeckCard(libraryEntry: CardLibraryEntry, printingImageId: string, quantity?: number): void;
  removeMainDeckCard(printingImageId: string): void;
  setMainDeckQuantity(printingImageId: string, quantity: number): void;
  changeMainDeckPrinting(currentPrintingImageId: string, nextPrintingImageId: string): void;

  importFromClipboard(rawInput: string): Promise<void>;

  save(): { ok: true; deck: SavedDeck } | { ok: false; reasons: string[] };
}

const EMPTY: Pick<DeckBuilderState, 'editingDeckId' | 'name' | 'leaderSelection' | 'mainDeckSelections' | 'clipboardRawInput' | 'clipboardImportStatus' | 'clipboardImportSummary' | 'lastSaveResult'> = {
  editingDeckId: null,
  name: '',
  leaderSelection: null,
  mainDeckSelections: [],
  clipboardRawInput: '',
  clipboardImportStatus: 'idle',
  clipboardImportSummary: null,
  lastSaveResult: null,
};

export const useDeckBuilderStore = create<DeckBuilderState>((set, get) => ({
  ...EMPTY,

  startNewDeck: () => set({ ...EMPTY }),

  startEditingDeck: (deck) =>
    set({
      ...EMPTY,
      editingDeckId: deck.deckId,
      name: deck.name,
      leaderSelection: snapshotToSelection(deck.leader),
      mainDeckSelections: deck.cards.map(snapshotToSelection),
    }),

  setName: (name) => set({ name }),

  setLeader: (libraryEntry, printingImageId) =>
    set({ leaderSelection: { libraryEntry, chosenPrintingImageId: printingImageId, quantity: 1 } }),

  removeLeader: () => set({ leaderSelection: null }),

  addMainDeckCard: (libraryEntry, printingImageId, quantity = 1) =>
    set((state) => {
      const existingIndex = state.mainDeckSelections.findIndex((s) => s.chosenPrintingImageId === printingImageId);
      if (existingIndex === -1) {
        return {
          mainDeckSelections: [...state.mainDeckSelections, { libraryEntry, chosenPrintingImageId: printingImageId, quantity }],
        };
      }
      const next = [...state.mainDeckSelections];
      next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + quantity };
      return { mainDeckSelections: next };
    }),

  removeMainDeckCard: (printingImageId) =>
    set((state) => ({ mainDeckSelections: state.mainDeckSelections.filter((s) => s.chosenPrintingImageId !== printingImageId) })),

  setMainDeckQuantity: (printingImageId, quantity) =>
    set((state) => ({
      mainDeckSelections:
        quantity <= 0
          ? state.mainDeckSelections.filter((s) => s.chosenPrintingImageId !== printingImageId)
          : state.mainDeckSelections.map((s) => (s.chosenPrintingImageId === printingImageId ? { ...s, quantity } : s)),
    })),

  changeMainDeckPrinting: (currentPrintingImageId, nextPrintingImageId) =>
    set((state) => {
      if (currentPrintingImageId === nextPrintingImageId) return {};

      const current = state.mainDeckSelections.find((s) => s.chosenPrintingImageId === currentPrintingImageId);
      if (!current) return {};

      const nextRaw = current.libraryEntry.rawPrintings.find((p) => p.card_image_id === nextPrintingImageId);
      if (!nextRaw) return {};

      const existing = state.mainDeckSelections.find((s) => s.chosenPrintingImageId === nextPrintingImageId);
      if (existing) {
        return {
          mainDeckSelections: state.mainDeckSelections
            .filter((s) => s.chosenPrintingImageId !== currentPrintingImageId)
            .map((s) => (s.chosenPrintingImageId === nextPrintingImageId ? { ...s, quantity: s.quantity + current.quantity } : s)),
        };
      }

      return {
        mainDeckSelections: state.mainDeckSelections.map((s) =>
          s.chosenPrintingImageId === currentPrintingImageId ? { ...s, chosenPrintingImageId: nextPrintingImageId } : s,
        ),
      };
    }),

  /**
   * Replaces the current main-deck selection list with whatever resolves
   * from the pasted text (leader, if found among the pasted lines, replaces
   * leaderSelection too). This is a deliberate REPLACE, not a merge with
   * prior Browse/Search-by-ID picks — pasting a decklist is treated as
   * "this defines the whole deck." Known limitation, see project docs.
   */
  importFromClipboard: async (rawInput) => {
    set({ clipboardRawInput: rawInput, clipboardImportStatus: 'importing' });

    const parsed = parseClipboardDeckList(rawInput);
    const uniqueCardIds = [...new Set(parsed.entries.map((e) => e.cardId))];

    const resolutions = new Map<string, Awaited<ReturnType<typeof resolveCardPrintingsById>>>();
    await Promise.all(
      uniqueCardIds.map(async (cardId) => {
        resolutions.set(cardId, await resolveCardPrintingsById(browserFetch, cardId));
      }),
    );

    const issues: ClipboardImportIssue[] = [];
    const unresolvedEntries: ClipboardImportSummary['unresolvedEntries'] = [];
    const leaderSelections: DeckCardSelection[] = [];
    const mainDeckSelections: DeckCardSelection[] = [];

    for (const entry of parsed.entries) {
      const resolution = resolutions.get(entry.cardId);
      if (!resolution || !resolution.ok) {
        unresolvedEntries.push({ cardId: entry.cardId, variant: entry.variant, reason: 'API error while resolving this card id.' });
        continue;
      }
      if (!resolution.found) {
        unresolvedEntries.push({ cardId: entry.cardId, variant: entry.variant, reason: 'Card id not found in any endpoint family.' });
        continue;
      }

      const libraryEntry = buildCardLibraryEntry(resolution.printings);
      const wantedImageId = entry.variant === null ? entry.cardId : `${entry.cardId}_${entry.variant}`;
      const matchedPrinting = libraryEntry.rawPrintings.find((p) => p.card_image_id === wantedImageId);
      const chosenPrintingImageId = matchedPrinting?.card_image_id ?? libraryEntry.rawPrintings[0].card_image_id;

      if (!matchedPrinting) {
        issues.push({
          cardId: entry.cardId,
          variant: entry.variant,
          message: `Requested printing "${wantedImageId}" not found; used "${chosenPrintingImageId}" instead.`,
        });
      }

      const selection: DeckCardSelection = {
        libraryEntry,
        chosenPrintingImageId,
        quantity: entry.quantity,
        sourceImportLines: entry.sourceLines,
      };

      if (libraryEntry.definition.category === 'leader') {
        leaderSelections.push(selection);
      } else {
        mainDeckSelections.push(selection);
      }
    }

    if (leaderSelections.length > 1) {
      issues.push({ cardId: '', variant: null, message: `Pasted list contains ${leaderSelections.length} Leader cards; only one is allowed. Leader selection left unchanged.` });
    } else if (leaderSelections.length === 0) {
      issues.push({ cardId: '', variant: null, message: 'No Leader card found in pasted list. Leader selection left unchanged.' });
    }

    set((state) => ({
      leaderSelection: leaderSelections.length === 1 ? leaderSelections[0] : state.leaderSelection,
      mainDeckSelections,
      clipboardImportStatus: 'done',
      clipboardImportSummary: {
        resolvedCount: mainDeckSelections.length + leaderSelections.length,
        issues,
        unresolvedEntries,
        invalidLines: parsed.invalidLines,
      },
    }));
  },

  save: () => {
    const state = get();
    const deckId = state.editingDeckId ?? generateDeckId();

    if (!state.leaderSelection) {
      const result = { ok: false as const, reasons: ['No Leader selected.'] };
      set({ lastSaveResult: result });
      return result;
    }

    const result = createSavedDeck({
      deckId,
      name: state.name.trim().length > 0 ? state.name.trim() : 'Untitled Deck',
      leader: state.leaderSelection,
      mainDeck: state.mainDeckSelections,
      now: nowIso,
    });

    set({ lastSaveResult: result });

    if (result.ok) {
      useSavedDecksStore.getState().save(result.deck);
      set({ editingDeckId: result.deck.deckId });
    }

    return result;
  },
}));

/** Live legality feedback selector — calls the same pure validator `createSavedDeck` uses, never a parallel rule check. */
export function useDeckBuilderLegality(): { legal: boolean; reasons: string[] } {
  return useDeckBuilderStore((state) => {
    if (!state.leaderSelection) {
      return { legal: false, reasons: ['No Leader selected.'] };
    }
    const entries: DeckConstructionEntry[] = state.mainDeckSelections.map((s) => ({
      definition: s.libraryEntry.definition,
      quantity: s.quantity,
    }));
    return validateDeckConstruction(state.leaderSelection.libraryEntry.definition, entries);
  });
}

/** Live tournament format status (Standard / Extra / Banned) for the in-progress deck. */
export function useDeckBuilderFormatStatus(): DeckFormatStatusResult {
  return useDeckBuilderStore((state) => {
    const cards: Array<{ cardNumber: string; name: string }> = [];
    if (state.leaderSelection) {
      cards.push({
        cardNumber: state.leaderSelection.libraryEntry.cardNumber,
        name: state.leaderSelection.libraryEntry.definition.name,
      });
    }
    for (const selection of state.mainDeckSelections) {
      cards.push({
        cardNumber: selection.libraryEntry.cardNumber,
        name: selection.libraryEntry.definition.name,
      });
    }
    return evaluateDeckFormatStatusFromCards(cards);
  });
}
