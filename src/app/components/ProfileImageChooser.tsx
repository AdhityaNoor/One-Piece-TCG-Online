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
 * The Upload tab is ALWAYS shown, even when the backend cannot accept
 * uploads. Hiding it was worse: a player looking for the feature found no
 * trace of it and no way to tell whether it existed, was broken, or was
 * something they had misremembered. It now renders an explanation of what
 * is missing instead of a button that would 503.
 */
import { useEffect, useRef, useState } from 'react';
import { PROFILE_IMAGE_ACCEPT_ATTRIBUTE, PROFILE_IMAGE_SPECS, type ProfileImageKind } from '../../../shared/profileImage';
import type { CustomProfileImage } from '../../../shared/profile';
import { AvatarPicker } from './AvatarPicker';
import { BannerPicker } from './BannerPicker';
import { ImageCropModal } from './ImageCropModal';
import { Modal } from './Modal';
import { PlayerAvatar } from './PlayerAvatar';
import {
  encodeSourceCopy,
  loadImageFromFile,
  loadImageFromUrl,
  rejectSourceFile,
  uploadLimitHint,
  type LoadedImage,
} from '../lib/profileImages';
import type { ProfileImageTransform } from '../../../shared/profileImage';

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
  /** `sourceBlob` is null when re-cropping an upload whose original is already stored. */
  onUpload: (blob: Blob, transform: ProfileImageTransform, sourceBlob: Blob | null) => Promise<boolean>;
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
  const [pending, setPending] = useState<LoadedImage | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  /**
   * Distinguishes "cropping a file the player just picked" from "adjusting
   * the crop of something already uploaded". Only the first has a new
   * original to store; the second reuses the one on the server, which is
   * what makes repositioning possible without a re-upload.
   */
  const [adjusting, setAdjusting] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spec = PROFILE_IMAGE_SPECS[kind];
  const copy = COPY[kind];

  // Opening on the tab that matches what the player is actually using saves
  // a click for anyone who already uploaded something.
  useEffect(() => {
    if (!open) return;
    setTab(current ? 'upload' : 'presets');
    onErrorChange(null);
    // onErrorChange is a stable store action; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uploadsEnabled]);

  /**
   * Single owner of the loaded image's object-URL lifetime — see
   * lib/profileImages.loadImageFromFile. Every path that stops rendering the
   * crop stage (cancel, success, picking a different file, unmount) goes
   * through here, so the blob is released exactly once and never while it is
   * still on screen.
   */
  function releasePending() {
    setPending((current) => {
      current?.dispose();
      return null;
    });
  }

  useEffect(() => releasePending, []);

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
      const loaded = await loadImageFromFile(file);
      // Replacing a previous selection must free the old one first.
      setPending((current) => {
        current?.dispose();
        return loaded;
      });
      setAdjusting(false);
      setCropOpen(true);
    } catch (cause) {
      onErrorChange(cause instanceof Error ? cause.message : 'That image could not be read.');
    }
  }

  /**
   * Re-opens the cropper on the ORIGINAL stored behind the current crop,
   * seeded with the transform the player last saved. Nothing is re-uploaded
   * as a source on confirm — the server already has it.
   */
  async function handleAdjust() {
    if (!current?.sourceUrl) return;
    setLoadingSource(true);
    onErrorChange(null);
    try {
      const image = await loadImageFromUrl(current.sourceUrl);
      setPending((existing) => {
        existing?.dispose();
        // Not an object URL, so there is nothing to revoke.
        return { image, dispose: () => undefined };
      });
      setAdjusting(true);
      setCropOpen(true);
    } catch (cause) {
      onErrorChange(cause instanceof Error ? cause.message : 'Could not load the original image.');
    } finally {
      setLoadingSource(false);
    }
  }

  async function handleCropConfirmed(blob: Blob, transform: ProfileImageTransform) {
    // Only a freshly picked file carries a new original to keep.
    const sourceBlob = adjusting || !pending ? null : await encodeSourceCopy(pending.image);
    const ok = await onUpload(blob, transform, sourceBlob);
    if (ok) {
      setCropOpen(false);
      releasePending();
      onClose();
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={copy.title} maxWidthClassName="max-w-xl">
        <div className="p-4 sm:p-5">
          <div className="mb-4 inline-flex w-full gap-1 border border-white/10 bg-black/30 p-1 sm:w-auto" role="tablist">
            <TabButton active={tab === 'presets'} label={copy.presetLabel} onClick={() => setTab('presets')} />
            <TabButton active={tab === 'upload'} label="Upload" onClick={() => setTab('upload')} />
          </div>

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
          ) : !uploadsEnabled ? (
            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gold">Uploads Unavailable</p>
              <p className="mt-2 text-xs leading-5 text-slate-200/65">
                This server isn't accepting image uploads right now, so only the preset {kind === 'avatar' ? 'portraits' : 'colours'} are
                available. Everything else on your profile works normally.
              </p>
              <p className="mt-3 text-[11px] leading-5 text-white/40">
                If you run this server: the backend needs the profile-image routes deployed and a{' '}
                <code className="text-white/60">BLOB_READ_WRITE_TOKEN</code> set. See server/.env.example.
              </p>
            </div>
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
                  <p className="mt-1 text-xs leading-5 text-slate-200/60">
                    {current && !current.sourceUrl
                      ? 'This image was saved before repositioning was available — replace it to be able to adjust its position later.'
                      : uploadLimitHint(kind)}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-gold/50 bg-gold/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gold transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {current ? 'Replace Image' : 'Choose Image'}
                    </button>
                    {current?.sourceUrl && (
                      <button
                        type="button"
                        disabled={busy || loadingSource}
                        onClick={() => void handleAdjust()}
                        className="border border-white/20 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/75 transition hover:border-gold/50 hover:text-gold disabled:opacity-45"
                      >
                        {loadingSource ? 'Loading...' : 'Adjust Position'}
                      </button>
                    )}
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
          setAdjusting(false);
          releasePending();
        }}
        image={pending?.image ?? null}
        title={`Crop ${copy.title}`}
        outputWidth={spec.outputWidth}
        outputHeight={spec.outputHeight}
        shape={kind === 'avatar' ? 'hex' : 'rect'}
        busy={busy}
        error={error}
        confirmLabel={kind === 'avatar' ? 'Save Photo' : 'Save Banner'}
        initialTransform={adjusting ? current?.transform ?? null : null}
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
