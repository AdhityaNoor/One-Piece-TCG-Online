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
    <div className={['pointer-events-none relative flex h-full w-full items-center justify-center [perspective:900px]', className ?? ''].filter(Boolean).join(' ')}>
      <style>
        {`
          @keyframes optcg-css-coin-float {
            0%, 100% { transform: translate3d(0, -1.5%, 0) rotateX(-8deg); }
            50% { transform: translate3d(0, 1.5%, 0) rotateX(8deg); }
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
          transform: flipping ? 'translate3d(0, -4%, 0) rotateX(18deg)' : undefined,
        }}
      >
        <div
          className="absolute inset-0 rounded-full transition-transform ease-out [transform-style:preserve-3d]"
          style={{
            transitionDuration: `${FLIP_DURATION_MS}ms`,
            transform: `rotateY(${rotation}deg)`,
          }}
        >
          <CoinFace side="front" iconUrl="/ui/straw-hat-pirates.svg" iconClassName="h-[68%] w-[68%] translate-y-[3%]" maskSize="118%" maskPosition="center 42%" />
          <CoinFace side="back" iconUrl="/ui/berry-symbol.svg" iconClassName="h-[70%] w-[58%]" />
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
        'absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border-[0.38rem] border-[#fff0a6] shadow-[inset_0_0_0_0.45rem_rgba(122,74,11,0.32),inset_0_-1.4rem_2.4rem_rgba(89,45,4,0.32),inset_0_1.4rem_2rem_rgba(255,247,184,0.58),0_1.4rem_3.2rem_rgba(0,0,0,0.42)] [backface-visibility:hidden]',
        isBack ? '[transform:rotateY(180deg)]' : '',
      ].join(' ')}
      style={{
        background:
          'radial-gradient(circle at 36% 26%, #fff4ad 0 10%, #f3c650 24%, #d69a25 55%, #a96412 82%, #744007 100%)',
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
