/**
 * CSS 3D coin toss for match setup — structure/animation adapted from
 * https://codepen.io/Shahibur-Rahman/pen/zxrqpGz (edge-stack + rotateY flip).
 */
import { useMemo, type CSSProperties } from 'react';

export type StlCoinSide = 'jollyRoger' | 'sunnyGo';

export const COIN_FLIP_DURATION_MS = 2800;

const EDGE_COUNT = 24;
const EDGE_STEP = 1.2;
const MAX_OFFSET = (EDGE_COUNT / 2) * EDGE_STEP;

interface StlCoinCanvasProps {
  result: StlCoinSide | null;
  flipping: boolean;
  loadModel?: boolean;
  className?: string;
}

function finalRotation(result: StlCoinSide | null): number {
  return result === 'sunnyGo' ? 180 : 0;
}

const EDGE_GRADIENTS = [
  'linear-gradient(90deg, #e8c04a 0%, #c89418 28%, #9a6209 50%, #c89418 72%, #e8c04a 100%)',
  'linear-gradient(90deg, #d4ad38 0%, #b08014 28%, #885508 50%, #b08014 72%, #d4ad38 100%)',
  'linear-gradient(90deg, #c49a2c 0%, #a07010 28%, #784806 50%, #a07010 72%, #c49a2c 100%)',
] as const;

function SparkleParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => ({
        id: index,
        size: 1 + (index * 0.37) % 3,
        left: (index * 17.3) % 100,
        top: (index * 23.7) % 100,
        delay: (index * 0.53) % 5,
        duration: 2 + ((index * 0.31) % 2),
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute rounded-full bg-white/85"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animation: `optcg-coin-sparkle ${particle.duration}s infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function CoinFace({
  side,
  iconUrl,
  iconClassName,
}: {
  side: 'front' | 'back';
  iconUrl: string;
  iconClassName: string;
}) {
  const isBack = side === 'back';

  return (
    <div
      className={[
        'absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border-[0.42rem] border-[#fff0a6]',
        'shadow-[inset_0_0_0_0.55rem_rgba(122,74,11,0.32),inset_0_-1.6rem_2.7rem_rgba(89,45,4,0.34),inset_0_1.6rem_2.2rem_rgba(255,247,184,0.62),0_1.8rem_3.8rem_rgba(0,0,0,0.44)]',
        '[backface-visibility:hidden]',
      ].join(' ')}
      style={{
        background:
          'radial-gradient(circle at 36% 26%, #fff4ad 0 10%, #f3c650 24%, #d69a25 55%, #a96412 82%, #744007 100%)',
        transform: isBack
          ? `rotateY(180deg) translateZ(${MAX_OFFSET}px)`
          : `rotateY(0deg) translateZ(${MAX_OFFSET}px)`,
      }}
    >
      <SparkleParticles />
      <span className="absolute inset-[8%] rounded-full border border-[#7a4a0b]/35 shadow-[inset_0_0_1rem_rgba(255,255,255,0.2)]" />
      <span className="absolute inset-[15%] rounded-full border-2 border-[#7a4a0b]/30" />
      <span
        className="absolute -inset-y-8 left-[-28%] w-[32%] bg-white/45 blur-sm"
        style={{ animation: 'optcg-coin-glint 3.2s ease-in-out infinite' }}
      />
      <img
        src={iconUrl}
        alt=""
        draggable={false}
        className={['relative z-10 object-contain opacity-90 drop-shadow-[0_0.12rem_0_rgba(89,45,4,0.45)]', iconClassName].join(' ')}
      />
    </div>
  );
}

export function StlCoinCanvas({ result, flipping, loadModel: _loadModel, className }: StlCoinCanvasProps) {
  const endRotation = finalRotation(result);
  const tossEndRotation = 360 * 5 + endRotation;

  const edges = useMemo(
    () =>
      Array.from({ length: EDGE_COUNT }, (_, index) => (
        <div
          key={index}
          className="pointer-events-none absolute inset-0 rounded-full border border-[#6b4508]/60"
          style={buildEdgeStyle(index)}
        />
      )),
    [],
  );

  return (
    <div
      className={['relative mx-auto [perspective:1000px]', className ?? ''].filter(Boolean).join(' ')}
      style={{
        width: 'min(21vh, 11rem, 45vw)',
        height: 'min(21vh, 11rem, 45vw)',
        animation: flipping ? 'none' : 'optcg-coin-scene-pulse 3s ease-in-out infinite',
      }}
    >
      <style>
        {`
          @keyframes optcg-coin-scene-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
          }

          @keyframes optcg-coin-toss {
            0% { transform: rotateY(0deg) translateY(0); }
            18% { transform: rotateY(540deg) translateY(-18%); }
            42% { transform: rotateY(1260deg) translateY(-30%); }
            68% { transform: rotateY(1980deg) translateY(-12%); }
            100% { transform: rotateY(${tossEndRotation}deg) translateY(0); }
          }

          @keyframes optcg-coin-glint {
            0% { transform: translateX(-130%) rotate(18deg); opacity: 0; }
            26% { opacity: 0.48; }
            56% { opacity: 0; }
            100% { transform: translateX(130%) rotate(18deg); opacity: 0; }
          }

          @keyframes optcg-coin-sparkle {
            0% { opacity: 0; transform: translateY(0) rotate(0deg); }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { opacity: 0; transform: translateY(-30px) rotate(360deg); }
          }
        `}
      </style>

      <div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={
          flipping
            ? {
                animation: `optcg-coin-toss ${COIN_FLIP_DURATION_MS}ms ease-in-out forwards`,
              }
            : {
                transform: `rotateY(${endRotation}deg)`,
              }
        }
      >
        {edges}
        <CoinFace
          side="front"
          iconUrl="/ui/straw-hat-pirates.svg"
          iconClassName="h-[52%] w-[52%]"
        />
        <CoinFace
          side="back"
          iconUrl="/ui/berry-symbol.svg"
          iconClassName="h-[54%] w-[40%]"
        />
      </div>
    </div>
  );
}

function buildEdgeStyle(index: number): CSSProperties {
  const offset = (index - EDGE_COUNT / 2) * EDGE_STEP;
  return {
    transform: `translateZ(${offset}px)`,
    background: EDGE_GRADIENTS[index % 3],
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.55)',
  };
}
