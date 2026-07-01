export type StlCoinSide = 'jollyRoger' | 'sunnyGo';

interface StlCoinCanvasProps {
  result: StlCoinSide | null;
  flipping: boolean;
  loadModel?: boolean;
  className?: string;
}

const FLIP_DURATION_MS = 1650;
const FACE_ICON_COLOR = '#7a4a0b';

function finalRotation(result: StlCoinSide | null): number {
  if (result === 'sunnyGo') return 180;
  return 0;
}

export function StlCoinCanvas({ result, flipping, loadModel: _loadModel, className }: StlCoinCanvasProps) {
  const rotation = flipping ? finalRotation(result) + 3600 : finalRotation(result);

  return (
    <div className={['pointer-events-none relative flex h-full w-full items-center justify-center [perspective:1400px]', className ?? ''].filter(Boolean).join(' ')}>
      <style>
        {`
          @keyframes optcg-css-coin-float {
            0%, 100% { transform: translate3d(0, -2.5%, 0) rotateX(-12deg) rotateZ(-4deg); }
            50% { transform: translate3d(0, 2.5%, 0) rotateX(12deg) rotateZ(4deg); }
          }

          @keyframes optcg-css-coin-glint {
            0% { transform: translateX(-130%) rotate(18deg); opacity: 0; }
            26% { opacity: 0.48; }
            56% { opacity: 0; }
            100% { transform: translateX(130%) rotate(18deg); opacity: 0; }
          }
        `}
      </style>

      <div
        className="relative aspect-square w-[min(100%,22rem)] max-w-full [transform-style:preserve-3d]"
        style={{
          animation: flipping ? 'none' : 'optcg-css-coin-float 2.6s ease-in-out infinite',
          transform: flipping ? 'translate3d(0, -5%, 0) rotateX(24deg)' : 'rotateX(10deg)',
        }}
      >
        <div
          className="absolute inset-[5.5%] rounded-full [transform:translateZ(-0.9rem)]"
          style={{
            background:
              'radial-gradient(circle at 36% 26%, #f6cd67 0 12%, #ce8c18 52%, #92540b 100%)',
            boxShadow: '0 1.1rem 2.4rem rgba(0,0,0,0.34)',
          }}
        />
        <div
          className="absolute inset-[4.4%] rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, #f8d36f 0deg, #a96512 34deg, #f7d778 72deg, #945709 112deg, #f4c95d 152deg, #8d5008 196deg, #f8d772 232deg, #a66212 278deg, #f6cd63 320deg, #8b4f07 360deg)',
            transform: 'translateZ(-0.45rem)',
            boxShadow: 'inset 0 0 0 0.15rem rgba(255,247,184,0.16)',
          }}
        />
        <div
          className="absolute inset-0 rounded-full transition-transform ease-out [transform-style:preserve-3d]"
          style={{
            transitionDuration: `${FLIP_DURATION_MS}ms`,
            transform: `rotateY(${rotation}deg)`,
          }}
        >
          <CoinFace side="front" iconUrl="/ui/straw-hat-pirates.svg" iconClassName="h-[66%] w-[66%] translate-y-[3%]" maskSize="118%" maskPosition="center 42%" />
          <CoinFace side="back" iconUrl="/ui/berry-symbol.svg" iconClassName="h-[70%] w-[56%]" />
        </div>
      </div>
    </div>
  );
}

function CoinFace({
  side,
  iconUrl,
  iconClassName,
  maskSize = 'contain',
  maskPosition = 'center',
}: {
  side: 'front' | 'back';
  iconUrl: string;
  iconClassName: string;
  maskSize?: string;
  maskPosition?: string;
}) {
  const isBack = side === 'back';

  return (
    <div
      className={[
        'absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border-[0.42rem] border-[#fff0a6] shadow-[inset_0_0_0_0.55rem_rgba(122,74,11,0.32),inset_0_-1.6rem_2.7rem_rgba(89,45,4,0.34),inset_0_1.6rem_2.2rem_rgba(255,247,184,0.62),0_1.8rem_3.8rem_rgba(0,0,0,0.44)] [backface-visibility:hidden]',
        isBack ? '[transform:rotateY(180deg)]' : '',
      ].join(' ')}
      style={{
        background:
          'radial-gradient(circle at 36% 26%, #fff4ad 0 10%, #f3c650 24%, #d69a25 55%, #a96412 82%, #744007 100%)',
        transform: `${isBack ? 'rotateY(180deg) ' : ''}translateZ(0.9rem)`,
      }}
    >
      <span className="absolute inset-[8%] rounded-full border border-[#7a4a0b]/35 shadow-[inset_0_0_1rem_rgba(255,255,255,0.2)]" />
      <span className="absolute inset-[15%] rounded-full border-2 border-[#7a4a0b]/30" />
      <span className="absolute -inset-y-8 left-[-28%] w-[32%] bg-white/45 blur-sm" style={{ animation: 'optcg-css-coin-glint 3.2s ease-in-out infinite' }} />
      <span
        className={['relative z-10 block bg-[#7a4a0b] drop-shadow-[0_0.18rem_0_rgba(255,245,176,0.35)]', iconClassName].join(' ')}
        style={{
          backgroundColor: FACE_ICON_COLOR,
          maskImage: `url("${iconUrl}")`,
          maskRepeat: 'no-repeat',
          maskPosition,
          maskSize,
          WebkitMaskImage: `url("${iconUrl}")`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: maskPosition,
          WebkitMaskSize: maskSize,
        }}
      />
    </div>
  );
}
