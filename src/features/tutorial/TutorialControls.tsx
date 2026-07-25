/**
 * Next / Previous / Restart Chapter / Skip Tutorial / Exit to Main Menu —
 * the full control set the project spec calls for. `onNext` is disabled
 * until the chapter's completionCondition is satisfied (or immediately
 * enabled for manualAdvance/needsEngineHookup chapters, which have nothing
 * live to wait on).
 */
export interface TutorialControlsProps {
  canGoPrevious: boolean;
  canGoNext: boolean;
  isLastChapter: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onRestartChapter: () => void;
  onSkipTutorial: () => void;
  onExit: () => void;
}

export function TutorialControls({ canGoPrevious, canGoNext, isLastChapter, onPrevious, onNext, onRestartChapter, onSkipTutorial, onExit }: TutorialControlsProps) {
  return (
    <div style={{ position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 9996 }} className="flex flex-wrap items-center justify-center gap-2">
      <ControlButton label="Exit" onClick={onExit} tone="ghost" />
      <ControlButton label="Restart Chapter" onClick={onRestartChapter} tone="ghost" />
      <ControlButton label="Previous" onClick={onPrevious} tone="ghost" disabled={!canGoPrevious} />
      <ControlButton label={isLastChapter ? 'Finish' : 'Next'} onClick={onNext} tone="primary" disabled={!canGoNext} />
      <ControlButton label="Skip Tutorial" onClick={onSkipTutorial} tone="ghost" />
    </div>
  );
}

function ControlButton({ label, onClick, tone, disabled }: { label: string; onClick: () => void; tone: 'primary' | 'ghost'; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-md border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition',
        disabled
          ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
          : tone === 'primary'
            ? 'border-white/80 bg-red-600/70 text-white hover:bg-red-600/90'
            : 'border-white/25 bg-black/50 text-white/80 hover:bg-black/70',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
