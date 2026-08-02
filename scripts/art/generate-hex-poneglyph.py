"""Regenerate public/ui/hex-poneglyph.svg — the animated honeycomb background.

Run from the repo root:  python3 scripts/art/generate-hex-poneglyph.py

Emits an 8x6 block of flat-top hexagon cells, each holding a randomly chosen
Poneglyph glyph, plus a scattered subset of darker "shaded" cells. The result
tiles seamlessly and is painted by .op-hex-bg in src/app/styles/index.css.

Poneglyph glyphs are baked in as vector PATHS, not <text>.

SVG used via CSS background-image is loaded in "secure static mode": external
resources (including @font-face files) are blocked, so <text> would silently
fall back to a system font. Converting each glyph to a <path> sidesteps that
entirely — no runtime font dependency for the background.
"""
import math, random
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

random.seed(11)
font = TTFont('public/Poneglyph.ttf')
glyphset = font.getGlyphSet()
cmap = font.getBestCmap()
chars = [chr(c) for c in sorted(cmap) if 32 < c < 0x7b and chr(c).isalnum()]

s = 24.0                      # hex circumradius, tile units
h = math.sqrt(3) * s          # vertical step
stepx = 1.5 * s               # horizontal step
NX, NY = 8, 6
W, H = NX * stepx, NY * h
GLYPH_TARGET = s * 0.62       # glyph size relative to the cell's circumradius

def hexpath(cx, cy):
    p = [(cx + s*math.cos(math.radians(60*k)), cy + s*math.sin(math.radians(60*k))) for k in range(6)]
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in p) + "Z"

def glyph_path(ch, cx, cy):
    """Glyph outline centred on (cx, cy), scaled to GLYPH_TARGET, y-flipped."""
    g = glyphset[cmap[ord(ch)]]
    bp = BoundsPen(glyphset); g.draw(bp)
    if not bp.bounds: return ""
    x0, y0, x1, y1 = bp.bounds
    gw, gh = x1 - x0, y1 - y0
    if gw <= 0 or gh <= 0: return ""
    k = GLYPH_TARGET / max(gw, gh)
    # y is negated: font coords are y-up, SVG is y-down.
    t = (Transform()
         .translate(cx - (x0 + gw/2)*k, cy + (y0 + gh/2)*k)
         .scale(k, -k))
    pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.0f}")
    g.draw(TransformPen(pen, t))
    return pen.getCommands()

cells = [(i*stepx, j*h + (h/2 if i % 2 else 0)) for i in range(NX) for j in range(NY)]
filled = set(random.sample(range(len(cells)), int(len(cells)*0.19)))

def wrapped(cx, cy, pad):
    for dx in (-W, 0, W):
        for dy in (-H, 0, H):
            x, y = cx+dx, cy+dy
            if -pad <= x <= W+pad and -pad <= y <= H+pad:
                yield x, y

lines, fills, glyphs = [], [], []
for i in range(-1, NX+1):
    for j in range(-1, NY+1):
        lines.append(hexpath(i*stepx, j*h + (h/2 if i % 2 else 0)))
for idx, (cx, cy) in enumerate(cells):
    ch = random.choice(chars)
    for x, y in wrapped(cx, cy, s):
        if idx in filled: fills.append(hexpath(x, y))
        glyphs.append(glyph_path(ch, x, y))

svg = (
  f"<svg xmlns='http://www.w3.org/2000/svg' width='{W:.2f}' height='{H:.2f}' viewBox='0 0 {W:.2f} {H:.2f}'>"
  f"<path d='{''.join(fills)}' fill='%23050d24' fill-opacity='0.38'/>"
  f"<path d='{''.join(glyphs)}' fill='%23ffffff' fill-opacity='0.20'/>"
  f"<path d='{''.join(lines)}' fill='none' stroke='%23d9a441' stroke-opacity='0.16' stroke-width='1.4'/>"
  f"</svg>")
svg = svg.replace('%23', '#')
open('public/ui/hex-poneglyph.svg','w').write(svg)
print("cells", len(cells), "glyph paths", len(glyphs), "file bytes", len(svg))
