/**
 * The one modal a player uses to change their profile photo or banner.
 *
 * Both slots go through this component rather than two near-identical ones,
 * because the only real differences between them are the preset grid, the
 * preview shape and the output size — everything else (the preset/upload
 * split, the file gate, the cropper hand-off, the remove path, the error
 * surface) is identical, and duplicating it is how the two drift.
 *
 * Presets and uploads coexist on purpose. Uploading does not clear the
 * equipped cosmetic and equipping a preset does not delete the upload (see
 * shared/profile.ts's CustomProfileImages doc): the upload simply takes
 * precedence while it exists, so "Remove" is a real, non-destructive undo
 * back to whichever preset the player last chose.
 *
 * The Upload tab hides itself entirely when the backend has no image
 * storage configured — an affordance that can only ever 503 is worse than
 * no affordance.
 */
import { useEffect, useRef, useState } from 'react';
import { PROFILE_IMAGE_ACCEPT_ATTRIBUTE, PROFILE_IMAGE_SPECS, type ProfileImageKind } from '../../../shared/profileImage';
import type { CustomProfileImage } from '../../../shared/profile';
import { AvatarPicker } from './AvatarPicker';
import { BannerPicker } from './BannerPicker';
import { ImageCropModal } from './ImageCropModal';
import { Modal } from './Modal';
import { PlayerAvatar } from './PlayerAvatar';
import { loadImageFromFile, rejectSourceFile, uploadLimitHint } from '../lib/profileImages';

type Tab = 'presets' | 'upload';

export interface ProfileImageChooserProps {
  open: boolean;
  onClose: () => void;
  kind: ProfileImageKind;
  /** Currently equipped preset id — an avatar OPTION id ('luffy') or a banner catalog id. */
  presetValue: string | null;
  onPresetChange: (id: string) => void;
  current: CustomProfileImage | null;
  frameId?: string | null;
  uploadsEnabled: boolean;
  busy: boolean;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  onUpload: (blob: Blob) => Promise<boolean>;
  onRemove: () => void | Promise<void>;
}

const COPY: Record<ProfileImageKind, { title: string; presetLabel: string; presetHint: string }> = {
  avatar: {
    title: 'Profile Photo',
    presetLabel: 'Portraits',
    presetHint: 'The same portraits used across the app. Pick one, or upload your own photo.',
  },
  banner: {
    title: 'Profile Banner',
    presetLabel: 'Colours',
    presetHint: 'Preset colour banners, or upload your own artwork.',
  },
};

export function ProfileImageChooser({
  open,
  onClose,
  kind,
  presetValue,
  onPresetChange,
  current,
  frameId,
  uploadsEnabled,
  busy,
  error,
  onErrorChange,
  onUpload,
  onRemove,
}: ProfileImageChooserProps) {
  const [tab, setTab] = useState<Tab>('presets');
  const [pendingImage, setPendingImage] = useState<HTMLImageElement | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spec = PROFILE_IMAGE_SPECS[kind];
  const copy = COPY[kind];

  // Opening on the tab that matches what the player is actually using saves
  // a click for anyone who already uploaded something.
  useEffect(() => {
    if (!open) return;
    setTab(current && uploadsEnabled ? 'upload' : 'presets');
    onErrorChange(null);
    // onErrorChange is a stable store action; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uploadsEnabled]);

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the SAME file still fires a change event.
    event.target.value = '';
    if (!file) return;

    const rejection = rejectSourceFile(file);
    if (rejection) {
      onErrorChange(rejection.message);
      return;
    }
    onErrorChange(null);
    try {
      const image = await loadImageFromFile(file);
      setPendingImage(image);
      setCropOpen(true);
    } catch (cause) {
      onErrorChange(cause instanceof Error ? cause.message : 'That image could not be read.');
    }
  }

  async function handleCropConfirmed(blob: Blob) {
    const ok = await onUpload(blob);
    if (ok) {
      setCropOpen(false);
      setPendingImage(null);
      onClose();
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={copy.title} maxWidthClassName="max-w-xl">
        <div className="p-4 sm:p-5">
          {uploadsEnabled && (
            <div className="mb-4 inline-flex w-full gap-1 border border-white/10 bg-black/30 p-1 sm:w-auto" role="tablist">
              <TabButton active={tab === 'presets'} label={copy.presetLabel} onClick={() => setTab('presets')} />
              <TabButton active={tab === 'upload'} label="Upload" onClick={() => setTab('upload')} />
            </div>
          )}

          {tab === 'presets' ? (
            <>
              <p className="mb-3 text-xs leading-5 text-slate-200/65">{copy.presetHint}</p>
              {current && (
                <p className="mb-3 border border-gold/25 bg-gold/[0.07] px-3 py-2 text-[11px] leading-5 text-gold/85">
                  Your uploaded {kind === 'avatar' ? 'photo' : 'banner'} is showing right now. Picking a preset here saves it,
                  but it only becomes visible once you remove the upload.
                </p>
              )}
              {kind === 'avatar' ? (
                <AvatarPicker value={presetValue ?? 'luffy'} onChange={onPresetChange} />
              ) : (
                <BannerPicker value={presetValue} onChange={onPresetChange} />
              )}
            </>
          ) : (
            <div>
              <div className="flex flex-col items-center gap-4 border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center">
                <div className="shrink-0">
                  {current ? (
                    kind === 'avatar' ? (
                      <PlayerAvatar imageUrl={current.url} frameId={frameId} size={96} alt="Your uploaded profile photo" />
                    ) : (
                      <div
                        className="h-16 w-40 border border-white/10"
                        style={{ background: `url("${current.url}") center / cover no-repeat` }}
                        role="img"
                        aria-label="Your uploaded banner"
                      />
                    )
                  ) : (
                    <div className="grid h-24 w-24 place-items-center border border-dashed border-white/20 text-center text-[9px] font-black uppercase leading-4 tracking-[0.12em] text-white/35">
                      No upload
                      <br />
                      yet
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gold">
                    {current ? 'Your upload' : `Upload a ${kind === 'avatar' ? 'photo' : 'banner'}`}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-200/60">{uploadLimitHint(kind)}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-gold/50 bg-gold/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gold transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {current ? 'Replace Image' : 'Choose Image'}
                    </button>
                    {current && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onRemove()}
                        className="border border-white/15 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 transition hover:border-red-300/45 hover:text-red-100 disabled:opacity-45"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-white/40">
                Uploads are stored at {spec.outputWidth}x{spec.outputHeight}
                {kind === 'avatar' ? ' and shown inside a hexagonal frame.' : '.'} Only upload artwork you have the right to use.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept={PROFILE_IMAGE_ACCEPT_ATTRIBUTE}
                className="hidden"
                onChange={(event) => void handleFileChosen(event)}
              />
            </div>
          )}

          {error && <p className="mt-3 text-xs leading-5 text-red-200">{error}</p>}
        </div>
      </Modal>

      <ImageCropModal
        open={cropOpen}
        onClose={() => {
          setCropOpen(false);
          setPendingImage(null);
        }}
        image={pendingImage}
        title={`Crop ${copy.title}`}
        outputWidth={spec.outputWidth}
        outputHeight={spec.outputHeight}
        shape={kind === 'avatar' ? 'hex' : 'rect'}
        busy={busy}
        error={error}
        confirmLabel={kind === 'avatar' ? 'Save Photo' : 'Save Banner'}
        onConfirm={handleCropConfirmed}
      />
    </>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex-1 whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition sm:flex-none',
        active ? 'bg-gold/15 text-gold' : 'text-white/45 hover:text-white',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
