/**
 * Crop / move / zoom step between picking a file and uploading it.
 *
 * The model is deliberately "one transform, not a draggable rectangle": the
 * crop window is FIXED (it is the output aspect, centred in the stage) and
 * the player moves and scales the IMAGE behind it. That is the interaction
 * every phone photo picker uses, it needs no handles, and it makes the
 * export a single affine mapping instead of a rectangle-intersection
 * problem. State is therefore just {offsetX, offsetY, scale}.
 *
 * Coordinates: `scale` is relative to COVER — scale 1 is the smallest zoom
 * at which the image still fills the crop window on both axes. That is what
 * makes clamping trivial and correct at any aspect: at scale >= 1 the
 * image is always at least as large as the window, so the offset simply has
 * to stay inside the overhang, and there is no zoom level that can expose a
 * transparent gap. Offsets are in CROP-WINDOW pixels from centre.
 *
 * Export re-derives the same mapping at the output resolution rather than
 * scaling the preview canvas, so the saved image is as sharp as the source
 * allows regardless of how large the modal happened to be on screen. The
 * stage is MEASURED rather than assumed for exactly this reason: drag
 * deltas arrive in real client pixels, so a stage that shrank to fit a
 * 320px phone would otherwise be clamped and exported against a width it
 * never had, offsetting the crop by the difference.
 *
 * Pointer events (not mouse + touch) so drag works identically for mouse,
 * touch and pen; a two-finger pinch is handled by tracking the two active
 * pointers' distance.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { HEX_VIEWBOX, HEX_VIEWBOX_HEIGHT, HEX_VIEWBOX_WIDTH, hexPath } from '../lib/avatarFrames';
import { encodeCanvas } from '../lib/profileImages';
import {
  IDENTITY_TRANSFORM,
  MAX_CROP_SCALE,
  normalizeTransform,
  type ProfileImageTransform,
} from '../../../shared/profileImage';

/** Ceiling on the on-screen stage; the real width is measured and may be smaller. */
const STAGE_MAX_WIDTH = 420;

export interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  /** Decoded source image. Null while one is still loading. */
  image: HTMLImageElement | null;
  title: string;
  outputWidth: number;
  outputHeight: number;
  /**
   * How the crop window is PREVIEWED. 'hex' dims everything outside the
   * hexagon so the player sees what the frame will actually show, but the
   * exported pixels are always the full rectangle — the hexagon is a render-
   * time mask (see lib/avatarFrames.ts), so baking it into the file would
   * make the upload unusable by any future frame with a different shape.
   */
  shape: 'hex' | 'rect';
  busy?: boolean;
  error?: string | null;
  confirmLabel?: string;
  /** Restores a previous crop — the whole point of being able to reposition an existing upload. */
  initialTransform?: ProfileImageTransform | null;
  onConfirm: (blob: Blob, transform: ProfileImageTransform) => void | Promise<void>;
}

/** Stage-pixel form of ProfileImageTransform; the normalized form is what crosses the wire. */
interface Transform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function ImageCropModal({
  open,
  onClose,
  image,
  title,
  outputWidth,
  outputHeight,
  shape,
  busy = false,
  error = null,
  confirmLabel = 'Save',
  initialTransform = null,
  onConfirm,
}: ImageCropModalProps) {
  const [transform, setTransform] = useState<Transform>({ ...IDENTITY_TRANSFORM });
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ distance: number; scale: number } | null>(null);

  // Crop-window size on screen. Measured from the laid-out element (it is
  // `max-w-full`, so a narrow viewport makes it smaller than STAGE_MAX_WIDTH)
  // and re-measured on resize/rotate, because every clamp and the export
  // mapping are expressed in these units.
  const [stageWidth, setStageWidth] = useState(STAGE_MAX_WIDTH);
  useEffect(() => {
    if (!open) return;
    const element = stageRef.current;
    if (!element) return;
    const measure = () => setStageWidth(element.getBoundingClientRect().width || STAGE_MAX_WIDTH);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open, image]);

  const stage = useMemo(
    () => ({ width: stageWidth, height: (stageWidth * outputHeight) / outputWidth }),
    [stageWidth, outputWidth, outputHeight],
  );

  /** Cover scale in stage pixels — the "scale 1" the module doc describes. */
  const coverScale = useMemo(() => {
    if (!image) return 1;
    return Math.max(stage.width / image.naturalWidth, stage.height / image.naturalHeight);
  }, [image, stage.width, stage.height]);

  /**
   * A newly picked image starts centred at cover; an EXISTING upload being
   * repositioned starts exactly where the player last left it. The stored
   * offsets are fractions of the crop window, so they are multiplied back up
   * by the measured stage here — which is also why this waits on
   * `stage.width` rather than running on mount.
   */
  useEffect(() => {
    if (!image) return;
    const saved = initialTransform ? normalizeTransform(initialTransform) : null;
    setTransform(
      saved
        ? { offsetX: saved.offsetX * stage.width, offsetY: saved.offsetY * stage.height, scale: saved.scale }
        : { ...IDENTITY_TRANSFORM },
    );
    // Re-seeding on every stage resize would fight the player mid-drag; this
    // intentionally re-runs only when the image or the saved crop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, initialTransform]);

  /**
   * Keeps the image covering the window. The overhang on each axis is half
   * the amount by which the scaled image exceeds the window; an offset past
   * it would drag an edge into frame.
   */
  const clamp = useCallback(
    (next: Transform): Transform => {
      if (!image) return next;
      const scale = Math.min(MAX_CROP_SCALE, Math.max(1, next.scale));
      const drawnWidth = image.naturalWidth * coverScale * scale;
      const drawnHeight = image.naturalHeight * coverScale * scale;
      const maxX = Math.max(0, (drawnWidth - stage.width) / 2);
      const maxY = Math.max(0, (drawnHeight - stage.height) / 2);
      return {
        scale,
        offsetX: Math.min(maxX, Math.max(-maxX, next.offsetX)),
        offsetY: Math.min(maxY, Math.max(-maxY, next.offsetY)),
      };
    },
    [image, coverScale, stage.width, stage.height],
  );

  // Re-clamp when the zoom drops: an offset that was legal at 3x usually
  // isn't at 1x, and leaving it would show a transparent wedge.
  const applyTransform = useCallback((update: (current: Transform) => Transform) => {
    setTransform((current) => clamp(update(current)));
  }, [clamp]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!image) return;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!image) return;
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const active = Array.from(pointers.current.values());
    if (active.length >= 2) {
      // Pinch: scale by the ratio of the current finger distance to the one
      // recorded when the second finger landed.
      const [a, b] = active;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (!gesture.current) {
        gesture.current = { distance, scale: transform.scale };
        return;
      }
      const ratio = distance / (gesture.current.distance || distance);
      applyTransform((current) => ({ ...current, scale: gesture.current!.scale * ratio }));
      return;
    }

    gesture.current = null;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    applyTransform((current) => ({ ...current, offsetX: current.offsetX + dx, offsetY: current.offsetY + dy }));
  }

  function endPointer(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  }

  /**
   * Keyboard/button repositioning. Dragging is the primary gesture, but it
   * is not available to a keyboard user, it is fiddly with a trackpad at
   * high zoom, and on a touch device a one-finger drag inside a modal is
   * easy to mistake for a scroll. A nudge of 2% of the window per press
   * gives a precise way to do the same thing.
   */
  function nudge(dx: number, dy: number) {
    applyTransform((current) => ({
      ...current,
      offsetX: current.offsetX + dx * stage.width * 0.02,
      offsetY: current.offsetY + dy * stage.height * 0.02,
    }));
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!image) return;
    // Multiplicative so a notch feels the same at every zoom level.
    const factor = Math.exp(-event.deltaY / 400);
    applyTransform((current) => ({ ...current, scale: current.scale * factor }));
  }

  async function handleConfirm() {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Same mapping as the preview, re-derived at output resolution: the
    // stage is `outputWidth / stage.width` smaller than the export, so
    // every stage-pixel quantity scales by that ratio.
    const ratio = outputWidth / stage.width;
    const drawScale = coverScale * transform.scale * ratio;
    const drawnWidth = image.naturalWidth * drawScale;
    const drawnHeight = image.naturalHeight * drawScale;
    const x = (outputWidth - drawnWidth) / 2 + transform.offsetX * ratio;
    const y = (outputHeight - drawnHeight) / 2 + transform.offsetY * ratio;

    // A source with alpha (a transparent PNG) would otherwise export as
    // transparent and read as a hole once masked, so the plate is painted first.
    context.fillStyle = '#0a1226';
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, x, y, drawnWidth, drawnHeight);

    // Normalized to the crop window so it restores identically on a device
    // whose stage is a different size — see ProfileImageTransform's doc.
    await onConfirm(await encodeCanvas(canvas), {
      offsetX: stage.width ? transform.offsetX / stage.width : 0,
      offsetY: stage.height ? transform.offsetY / stage.height : 0,
      scale: transform.scale,
    });
  }

  const drawnWidth = image ? image.naturalWidth * coverScale * transform.scale : 0;
  const drawnHeight = image ? image.naturalHeight * coverScale * transform.scale : 0;

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClassName="max-w-lg">
      <div className="p-4 sm:p-5">
        <p className="mb-3 text-xs leading-5 text-slate-200/65">
          Drag to reposition, scroll or pinch to zoom. Only what you see inside the frame is saved.
        </p>

        <div className="flex justify-center">
          <div
            ref={stageRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onPointerLeave={endPointer}
            onWheel={handleWheel}
            className="relative w-full max-w-full touch-none select-none overflow-hidden border border-white/10 bg-[#050d1e]"
            style={{
              aspectRatio: `${outputWidth} / ${outputHeight}`,
              maxWidth: STAGE_MAX_WIDTH,
              cursor: image ? 'grab' : 'default',
            }}
          >
            {image ? (
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: drawnWidth,
                  height: drawnHeight,
                  transform: `translate(calc(-50% + ${transform.offsetX}px), calc(-50% + ${transform.offsetY}px))`,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                Loading image
              </div>
            )}

            {/* Hex preview is an OVERLAY, not a clip-path on the stage
                itself. Clipping the stage would also clip its hit area, so a
                drag started in one of the six chamfered corners would never
                reach the pointer handlers — and the player would lose the
                context of what sits just outside the frame. An evenodd path
                (outer rectangle, inner hexagon) dims the discarded region
                instead. */}
            {shape === 'hex' && (
              <svg
                viewBox={HEX_VIEWBOX}
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <path
                  d={`M0 0 H${HEX_VIEWBOX_WIDTH} V${HEX_VIEWBOX_HEIGHT} H0 Z ${hexPath(0.75)}`}
                  fillRule="evenodd"
                  fill="rgba(5,13,30,0.66)"
                />
                <path d={hexPath(0.75)} fill="none" stroke="rgba(217,164,65,0.85)" strokeWidth={1.5} />
              </svg>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <span className="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-gold">Position</span>
          <NudgeButton label="Move left" disabled={!image} onClick={() => nudge(1, 0)} d="M15 5l-7 7 7 7" />
          <NudgeButton label="Move up" disabled={!image} onClick={() => nudge(0, 1)} d="M5 15l7-7 7 7" />
          <NudgeButton label="Move down" disabled={!image} onClick={() => nudge(0, -1)} d="M19 9l-7 7-7-7" />
          <NudgeButton label="Move right" disabled={!image} onClick={() => nudge(-1, 0)} d="M9 5l7 7-7 7" />
        </div>

        <label className="mt-3 flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gold">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_CROP_SCALE}
            step={0.01}
            value={transform.scale}
            disabled={!image}
            onChange={(event) => applyTransform((current) => ({ ...current, scale: Number(event.target.value) }))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#d9a441]"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => setTransform({ ...IDENTITY_TRANSFORM })}
            disabled={!image}
            className="shrink-0 border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55 transition hover:border-gold/45 hover:text-gold disabled:opacity-40"
          >
            Reset
          </button>
        </label>

        {error && <p className="mt-3 text-xs leading-5 text-red-200">{error}</p>}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="border border-white/15 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/60 transition hover:border-white/30 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!image || busy}
            className="border border-gold/50 bg-gold/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-gold transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Uploading...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function NudgeButton({ label, d, disabled, onClick }: { label: string; d: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center border border-white/15 bg-white/[0.04] text-white/60 transition hover:border-gold/45 hover:text-gold disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d={d} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
