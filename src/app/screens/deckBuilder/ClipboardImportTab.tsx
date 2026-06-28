/**
 * Clipboard-import creation method. A full Import REPLACES mainDeckSelections
 * (and leaderSelection if exactly one Leader line resolves) — see
 * deckBuilderStore.importFromClipboard's module doc for why this is a
 * replace, not a merge. The textarea is local-only React state; nothing is
 * parsed/applied until "Import" is pressed, so switching tabs before
 * pressing Import discards the unsaved paste text (documented limitation).
 */
import { useState } from 'react';
import { Button } from '../../components';
import { useDeckBuilderStore } from '../../store/deckBuilderStore';

export function ClipboardImportTab() {
  const [text, setText] = useState('');
  const clipboardImportStatus = useDeckBuilderStore((state) => state.clipboardImportStatus);
  const clipboardImportSummary = useDeckBuilderStore((state) => state.clipboardImportSummary);
  const importFromClipboard = useDeckBuilderStore((state) => state.importFromClipboard);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-navy-900/50">
        Paste a decklist, one card per line — e.g. "4xOP09-083_r1" or "3xOP09-093". Importing REPLACES the current main deck (and the Leader, if exactly
        one Leader line is found).
      </p>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        placeholder={'1xOP01-001\n4xOP01-016_p1\n...'}
        className="w-full resize-none rounded-2xl border border-navy-900/15 bg-white p-3 font-mono text-xs text-navy-900 placeholder:text-navy-900/30 focus:border-navy-900/40 focus:outline-none"
      />

      <Button
        variant="primary"
        size="sm"
        disabled={clipboardImportStatus === 'importing' || text.trim().length === 0}
        onClick={() => void importFromClipboard(text)}
      >
        {clipboardImportStatus === 'importing' ? 'Importing…' : 'Import (replaces main deck)'}
      </Button>

      {clipboardImportSummary && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-panel p-3 text-sm">
          <p className="font-semibold text-navy-900">{clipboardImportSummary.resolvedCount} card line(s) resolved.</p>

          {clipboardImportSummary.issues.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gold-600">Notes</p>
              <ul className="list-disc pl-4 text-xs text-navy-900/70">
                {clipboardImportSummary.issues.map((issue, index) => (
                  <li key={index}>
                    {issue.cardId ? `${issue.cardId}: ` : ''}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clipboardImportSummary.unresolvedEntries.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">Unresolved</p>
              <ul className="list-disc pl-4 text-xs text-red-600">
                {clipboardImportSummary.unresolvedEntries.map((entry, index) => (
                  <li key={index}>
                    {entry.cardId}
                    {entry.variant ? `_${entry.variant}` : ''} — {entry.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clipboardImportSummary.invalidLines.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">Unparseable lines</p>
              <ul className="list-disc pl-4 text-xs text-red-600">
                {clipboardImportSummary.invalidLines.map((line) => (
                  <li key={line.lineNumber}>
                    Line {line.lineNumber}: "{line.raw}" — {line.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
