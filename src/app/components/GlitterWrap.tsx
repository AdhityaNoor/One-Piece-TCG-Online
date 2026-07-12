/**
 * Decorative starfield-warp background (particles streaming outward from
 * centre with occasional sparkle flashes). Adapted from the Originkit
 * "Glitter Wrap" component (https://www.originkit.dev/components/glitterwrap)
 * — the Framer-only bits (RenderTarget stub, @framerSupportedLayout*
 * annotations, static-export warm-up branch) were stripped since this is a
 * plain always-animating React component, not a Framer canvas node.
 *
 * Pure Layer 5 (animation) / visual polish: reads nothing from and writes
 * nothing to GameState, so it is safe to mount unconditionally behind any
 * screen. Renders to an absolutely-positioned <canvas> and is marked
 * aria-hidden + pointer-events-none so it never intercepts input or shows up
 * to assistive tech (project rule: "animations must never control game
 * rules" / "UI must never directly mutate game state" — this component has
 * no path to either).
 */
import { useEffect, useRef, type CSSProperties } from 'react';

interface GlitterWrapProps {
  /** Number of particles alive at once. Higher = denser field, more GPU/CPU cost. */
  particleCount?: number;
  /** Three colors randomly assigned per-star. */
  color1?: string;
  color2?: string;
  color3?: string;
  /** Drives the warp-tunnel travel speed. */
  speed?: number;
  /** Spawn radius spread around centre. */
  density?: number;
  /** Base star size. */
  starSize?: number;
  /** Perspective focal depth — shapes how sharply stars grow near the viewer. */
  focalDepth?: number;
  /** Sinusoidal wobble amount as stars approach. */
  turbulence?: number;
  /** Overall opacity multiplier. */
  brightness?: number;
  /** Random sparkle-flash frequency/intensity. */
  glitterIntensity?: number;
  /** false = stars fly outward (hyperspace); true = stars recede inward. */
  reverse?: boolean;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS: Required<Omit<GlitterWrapProps, 'className' | 'style'>> = {
  particleCount: 260,
  color1: '#d9a441', // gold accent
  color2: '#ffffff',
  color3: '#7ec8ff', // soft cyan accent
  speed: 3,
  density: 100,
  starSize: 14,
  focalDepth: 13,
  turbulence: 2,
  brightness: 55,
  glitterIntensity: 3,
  reverse: false,
};

function parseColor(input: string): [number, number, number, number] {
  if (!input) return [255, 255, 255, 1];
  const s = input.trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] == null ? 1 : parts[3]];
  }
  return [255, 255, 255, 1];
}

export function GlitterWrap(props: GlitterWrapProps = {}) {
  const merged = { ...DEFAULTS, ...props };
  const { style } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  // Latest props, read fresh each frame so re-renders don't tear down and
  // rebuild the whole animation (which would re-init every star + RAF).
  const propsRef = useRef(merged);
  propsRef.current = merged;

  // Cached parsed colors — only recomputed when the string value changes.
  const colorCacheRef = useRef({
    color1: '' as string,
    color2: '' as string,
    color3: '' as string,
    parsed1: [255, 255, 255, 1] as [number, number, number, number],
    parsed2: [217, 164, 65, 1] as [number, number, number, number],
    parsed3: [126, 200, 255, 1] as [number, number, number, number],
  });

  const getCachedColors = () => {
    const p = propsRef.current;
    const c = colorCacheRef.current;
    if (p.color1 !== c.color1) {
      c.color1 = p.color1;
      c.parsed1 = parseColor(p.color1);
    }
    if (p.color2 !== c.color2) {
      c.color2 = p.color2;
      c.parsed2 = parseColor(p.color2);
    }
    if (p.color3 !== c.color3) {
      c.color3 = p.color3;
      c.parsed3 = parseColor(p.color3);
    }
    return c;
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type Star = {
      x: number;
      y: number;
      z: number; // depth: 1 = far, ~0 = near
      seed: number; // unique phase for turbulence + glitter
      vmul: number; // per-star speed multiplier (breaks up cohorts)
      colorIdx: number;
      flashUntil: number; // elapsed seconds until which it's flashing
      nextFlash: number; // elapsed seconds at which it can flash again
    };

    const stars: Star[] = [];
    // Elapsed wall-clock seconds. Turbulence + glitter cadence key off this
    // instead of a frame counter, so motion stays constant under variable
    // frame timing rather than jittering with each hitch.
    let elapsed = 0;
    let lastT = performance.now();

    const cfg = () => {
      const p = propsRef.current;
      return {
        reverse: p.reverse,
        density: p.density,
        stepZ: p.speed * 0.0008,
        focalDepth: p.focalDepth / 100,
        starScale: p.starSize * 0.15,
        turbulence: p.turbulence * 0.2,
        glitter: p.glitterIntensity * 0.1,
        brightness: Math.min(1, p.brightness / 100),
      };
    };

    const resetStar = (s: Star, initial = false) => {
      const { density, reverse, focalDepth, glitter } = cfg();
      const angle = Math.random() * Math.PI * 2;
      const radius = (0.2 + Math.random() * 0.8) * (density / 15);
      s.x = Math.cos(angle) * radius;
      s.y = Math.sin(angle) * radius;
      if (reverse) {
        s.z = initial ? focalDepth + Math.random() * (1 - focalDepth) : focalDepth;
      } else {
        s.z = initial ? Math.random() : 1.0;
      }
      s.seed = Math.random() * 1000;
      s.vmul = 0.6 + Math.random() * 0.8;
      s.colorIdx = Math.floor(Math.random() * 3);
      s.flashUntil = 0;
      s.nextFlash = elapsed + 1 + Math.random() * 4 * (1 / Math.max(0.0001, glitter));
    };

    const makeStar = (): Star => ({
      x: 0,
      y: 0,
      z: 0,
      seed: 0,
      vmul: 1,
      colorIdx: 0,
      flashUntil: 0,
      nextFlash: 0,
    });

    // Grow or shrink the star pool to match the requested count without
    // rebuilding the whole array (so live prop changes stay smooth).
    const syncCount = () => {
      const count = Math.max(1, Math.floor(propsRef.current.particleCount));
      if (stars.length === count) return;
      if (stars.length > count) {
        stars.length = count;
      } else {
        while (stars.length < count) {
          const s = makeStar();
          resetStar(s, true);
          stars.push(s);
        }
      }
    };

    const resize = (entry?: ResizeObserverEntry) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cr = entry?.contentRect;
      const rectW = cr?.width || container.clientWidth || container.getBoundingClientRect().width;
      const rectH = cr?.height || container.clientHeight || container.getBoundingClientRect().height;
      const w = Math.max(1, Math.floor(rectW) || 600);
      const h = Math.max(1, Math.floor(rectH) || 400);

      const prev = sizeRef.current;
      if (prev.w === w && prev.h === h && prev.dpr === dpr) return;

      sizeRef.current = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    };

    syncCount();
    resize();

    const ro = new ResizeObserver((entries) => resize(entries[0]));
    ro.observe(container);

    const drawFrame = (deltaSec: number) => {
      const { reverse, stepZ, focalDepth, starScale, turbulence, glitter, brightness } = cfg();

      syncCount();
      const colors = getCachedColors();
      const palette: [number, number, number, number][] = [colors.parsed1, colors.parsed2, colors.parsed3];
      const rgbStrs = [
        `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`,
        `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`,
        `rgb(${palette[2][0]}, ${palette[2][1]}, ${palette[2][2]})`,
      ];

      const { w, h } = sizeRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const projScale = Math.min(w, h) * 0.9;

      const dt = Math.max(0.001, Math.min(0.1, deltaSec)) * 60;

      // No trailing streaks: fully clear each frame instead of fading the
      // previous one, so only the current dot for each star is ever drawn.
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        const vz = stepZ * s.vmul * dt;
        if (reverse) {
          s.z += vz;
          if (s.z >= 1.0) {
            resetStar(s);
            continue;
          }
        } else {
          s.z -= vz;
          if (s.z <= focalDepth) {
            resetStar(s);
            continue;
          }
        }

        let tx = s.x;
        let ty = s.y;
        if (turbulence > 0) {
          const t = elapsed * 1.2 + s.seed;
          const amp = turbulence * (1 - s.z) * 0.25;
          tx += Math.sin(t + s.seed) * amp;
          ty += Math.cos(t * 1.13 + s.seed * 0.7) * amp;
        }

        const persp = focalDepth / Math.max(s.z, 0.0001);
        const sx = cx + tx * persp * projScale;
        const sy = cy + ty * persp * projScale;

        if (!reverse && (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20)) {
          resetStar(s);
          continue;
        }

        let flashMult = 1;
        if (glitter > 0) {
          if (elapsed >= s.nextFlash && s.flashUntil < elapsed) {
            s.flashUntil = elapsed + 0.04 + Math.random() * 0.07;
            s.nextFlash = elapsed + 1 + Math.random() * 4 * (1 / Math.max(0.0001, glitter));
          }
          if (elapsed <= s.flashUntil) {
            flashMult = 1 + 2.5 * glitter;
          }
        }

        const sizePersp = Math.min(2.5, (focalDepth / Math.max(s.z, 0.0001)) * 0.6);
        const baseR = Math.max(0.25, starScale * (0.4 + sizePersp));
        const maxR = 1 + starScale * 2.5;
        const r = Math.min(baseR * flashMult, maxR);

        const lifeT = reverse ? s.z : 1 - s.z;
        const fadeIn = reverse ? Math.min(1, (s.z - focalDepth) / (1 - focalDepth) / 0.12) : 1;
        const a = Math.min(1, reverse ? 0.85 - lifeT * 0.6 : lifeT * 0.9 + 0.05) * fadeIn * brightness * (flashMult > 1 ? 1 : 0.85);

        const colStr = rgbStrs[s.colorIdx];

        ctx.globalAlpha = a;
        ctx.fillStyle = colStr;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);

        if (flashMult > 1) {
          const rf = Math.min(r * 1.4, maxR * 1.4);
          ctx.globalAlpha = a * 0.5;
          ctx.fillRect(sx - rf, sy - rf, rf * 2, rf * 2);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      elapsed += Math.min(0.1, Math.max(0, deltaSec));
    };

    const loop = (t: number) => {
      const deltaSec = (t - lastT) / 1000;
      lastT = t;
      drawFrame(deltaSec);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
    // Single setup. Every animated value is read from propsRef each frame,
    // so prop changes apply live without rebuilding stars + RAF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={['pointer-events-none absolute inset-0 overflow-hidden', props.className ?? ''].join(' ')}
      style={style}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
