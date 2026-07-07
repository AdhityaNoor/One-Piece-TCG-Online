/**
 * Layer 5 overlay: clones card art and flies it between zone anchors after
 * each successful dispatch. Anchors are measured from data-board-* attributes
 * on the playmat and dock hands (see boardAnchors.ts).
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { anchorCenterInShell, cardScaleFromAnchorRect, resolveAnchorRect } from '../../../animations/cardMovement/boardAnchors';
import type { CardMovementSpec } from '../../../animations/cardMovement/types';
import { useCardAnimationStore } from '../../store/cardAnimationStore';
import { useSettingsStore } from '../../store/settingsStore';
import { CardBackArt } from './CardBackArt';
import { CardImage } from '../CardImage';

const DON_TOKEN_SRC = '/ui/don-token.png';
const FLIGHT_MS = 640;
const FLIP_START = 0.72;
const EASING = 'cubic-bezier(0.33, 1, 0.38, 1)';

interface CardMovementOverlayProps {
  shellRef: RefObject<HTMLElement | null>;
}

interface ActiveFlight extends CardMovementSpec {
  key: string;
}

function flightTransform(x: number, y: number, scale: number, rotateY: number): string {
  return `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotateY(${rotateY}deg)`;
}

function FlightCardArt({ spec }: { spec: CardMovementSpec }) {
  if (spec.isDon) {
    return <img src={DON_TOKEN_SRC} alt="" className="block h-full w-full object-cover" draggable={false} />;
  }

  const canFlip = spec.revealFaceOnLand && spec.faceDown && !!spec.imageUrl;
  if (!canFlip) {
    return spec.faceDown ? (
      <CardBackArt tone="navy" />
    ) : (
      <CardImage src={spec.imageUrl} alt="" className="h-full w-full" />
    );
  }

  return (
    <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
      <div
        className="absolute inset-0 overflow-hidden rounded-md"
        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      >
        <CardBackArt tone="navy" />
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-md" style={{ backfaceVisibility: 'hidden' }}>
        <CardImage src={spec.imageUrl} alt="" className="h-full w-full" />
      </div>
    </div>
  );
}

function FlyingCard({
  spec,
  shell,
  onComplete,
}: {
  spec: ActiveFlight;
  shell: HTMLElement;
  onComplete: () => void;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      onCompleteRef.current();
      return;
    }

    let cancelled = false;
    let finished = false;
    let animation: Animation | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (): void => {
      if (cancelled || finished) return;
      finished = true;
      onCompleteRef.current();
    };

    const run = (): void => {
      if (cancelled) return;

      const fromRect = resolveAnchorRect(shell, spec.playerId, spec.from);
      const toRect = resolveAnchorRect(shell, spec.playerId, spec.to);
      if (!fromRect || !toRect) {
        finish();
        return;
      }

      const shellRect = shell.getBoundingClientRect();
      const fromCenter = anchorCenterInShell(shellRect, fromRect);
      const toCenter = anchorCenterInShell(shellRect, toRect);
      const scale0 = cardScaleFromAnchorRect(fromRect, spec.from);
      const scale1 = cardScaleFromAnchorRect(toRect, spec.to);
      const dx = toCenter.x - fromCenter.x;
      const dy = toCenter.y - fromCenter.y;
      const midScale = scale0 + (scale1 - scale0) * FLIP_START;
      const shouldFlip = spec.revealFaceOnLand && spec.faceDown && !!spec.imageUrl && !spec.isDon;

      node.style.left = `${fromCenter.x}px`;
      node.style.top = `${fromCenter.y}px`;
      node.style.width = '150px';
      node.style.height = '210px';
      node.style.transform = flightTransform(0, 0, scale0, shouldFlip ? 180 : 0);

      animation = node.animate(
        shouldFlip
          ? [
              { transform: flightTransform(0, 0, scale0, 180), offset: 0 },
              { transform: flightTransform(dx * FLIP_START, dy * FLIP_START, midScale, 180), offset: FLIP_START },
              { transform: flightTransform(dx, dy, scale1, 0), offset: 1 },
            ]
          : [
              { transform: flightTransform(0, 0, scale0, 0), offset: 0 },
              { transform: flightTransform(dx, dy, scale1, 0), offset: 1 },
            ],
        { duration: FLIGHT_MS, easing: EASING, fill: 'forwards' },
      );
      animation.onfinish = finish;
      animation.oncancel = finish;
    };

    delayTimer = setTimeout(() => {
      requestAnimationFrame(run);
    }, spec.delayMs);

    const safetyTimer = setTimeout(finish, spec.delayMs + FLIGHT_MS + 250);

    return () => {
      cancelled = true;
      if (delayTimer) clearTimeout(delayTimer);
      clearTimeout(safetyTimer);
      animation?.cancel();
    };
  }, [spec, shell]);

  return (
    <div
      ref={nodeRef}
      className="pointer-events-none absolute overflow-visible rounded-md shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
      style={{ zIndex: 200, willChange: 'transform', perspective: '900px' }}
      aria-hidden="true"
    >
      <div className="h-full w-full overflow-hidden rounded-md">
        <FlightCardArt spec={spec} />
      </div>
    </div>
  );
}

export function CardMovementOverlay({ shellRef }: CardMovementOverlayProps) {
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const batchSeq = useCardAnimationStore((s) => s.batchSeq);
  const takeBatch = useCardAnimationStore((s) => s.takeBatch);
  const beginFlights = useCardAnimationStore((s) => s.beginFlights);
  const endFlight = useCardAnimationStore((s) => s.endFlight);
  const [active, setActive] = useState<ActiveFlight[]>([]);
  const flightKey = useRef(0);

  useLayoutEffect(() => {
    if (!animationsEnabled || batchSeq === 0) return;

    const specs = takeBatch();
    if (specs.length === 0) return;

    beginFlights(specs.map((spec) => spec.suppressInstanceId));

    requestAnimationFrame(() => {
      setActive((prev) => [
        ...prev,
        ...specs.map((spec) => ({ ...spec, key: `flight-${flightKey.current++}` })),
      ]);
    });
  }, [animationsEnabled, batchSeq, takeBatch, beginFlights]);

  const portalRoot = typeof document !== 'undefined' ? document.getElementById('board-overlay-root') : null;
  const shell = shellRef.current;
  if (!portalRoot || !shell || active.length === 0) return null;

  return createPortal(
    <>
      {active.map((spec) => (
        <FlyingCard
          key={spec.key}
          spec={spec}
          shell={shell}
          onComplete={() => {
            endFlight(spec.suppressInstanceId);
            setActive((prev) => prev.filter((f) => f.key !== spec.key));
          }}
        />
      ))}
    </>,
    portalRoot,
  );
}
