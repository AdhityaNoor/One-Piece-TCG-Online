"""
Placeholder "instruments". Each returns a mono float array; the cue table in
generate.py picks one and tunes it. Grouped by the physical gesture they
stand in for so a replacement asset has an obvious brief.
"""
import numpy as np
from synth import (RNG, adsr, at, bell, expdecay, fade, fm, layer, n_samples,
                   noise, normalize, spectral_shape, sweep, t, tri)


# ---------------------------------------------------------------- UI voices
def blip(f0, f1, dur=0.09, tau=0.045, wave="tri", body=0.0):
    core = tri(f0, f1, dur) if wave == "tri" else sweep(f0, f1, dur)
    out = core * expdecay(dur, tau)
    if body:
        out = layer(out, body * spectral_shape(noise(dur) * expdecay(dur, tau * 0.4), f0 * 1.5, 0.8))
    return fade(normalize(out, 0.7))


def tick(dur=0.035, center=3200):
    return fade(normalize(spectral_shape(noise(dur) * expdecay(dur, 0.012), center, 0.9), 0.5), 0.001, 0.012)


def buzz(f0=140, dur=0.24):
    x = t(dur)
    saw = 2 * ((f0 * x) % 1.0) - 1.0
    wob = 1 + 0.25 * np.sin(2 * np.pi * 22 * x)
    return fade(normalize(saw * wob * adsr(dur, 0.004, 0.05, 0.6, 0.12), 0.6))


def sparkle(root=880, steps=(0, 4, 7, 12), step_ms=55, dur=0.55):
    out = np.zeros(n_samples(dur))
    for i, s in enumerate(steps):
        f = root * 2 ** (s / 12)
        out += at(bell(f, 0.4, decay=0.22) * 0.8 ** i, i * step_ms / 1000.0, dur)
    return fade(normalize(out, 0.8))


def whoosh(dur=0.42, c0=400, c1=2600, width=1.4):
    half = n_samples(dur) // 2
    lo = spectral_shape(noise(dur), c0, width)
    hi = spectral_shape(noise(dur), c1, width)
    ramp = np.linspace(0, 1, n_samples(dur)) ** 1.4
    mix = lo * (1 - ramp) + hi * ramp
    env = np.sin(np.linspace(0, np.pi, n_samples(dur))) ** 1.6
    del half
    return fade(normalize(mix * env, 0.65), 0.02, 0.09)


# -------------------------------------------------------------- Card voices
def slap(dur=0.16, center=900, width=1.5, thump=0.5):
    body = spectral_shape(noise(dur) * expdecay(dur, 0.035), center, width, tilt=-1.5)
    low = sweep(180, 90, dur) * expdecay(dur, 0.05) * thump
    return fade(normalize(layer(body, low), 0.8), 0.001, 0.03)


def riffle(dur=0.75, count=26):
    out = np.zeros(n_samples(dur))
    for i in range(count):
        pos = (i / count) ** 0.85 * (dur - 0.05)
        grain = spectral_shape(noise(0.03) * expdecay(0.03, 0.006), 2400 + RNG.uniform(-600, 900), 1.0)
        out += at(grain * RNG.uniform(0.5, 1.0), pos, dur)
    return fade(normalize(out, 0.7), 0.01, 0.08)


def flick(dur=0.13, center=2600):
    return fade(normalize(spectral_shape(noise(dur) * expdecay(dur, 0.028), center, 1.1, tilt=1.0), 0.6), 0.001, 0.03)


def thud(dur=0.28, f0=150, f1=55):
    low = sweep(f0, f1, dur) * expdecay(dur, 0.07)
    knock = spectral_shape(noise(dur) * expdecay(dur, 0.02), 450, 1.2)
    return fade(normalize(layer(low, knock * 0.5), 0.85), 0.001, 0.05)


# ------------------------------------------------------------ Battle voices
def clash(dur=0.55):
    metal = layer(
        fm(520, 1.41, 9.0, dur, decay=0.09),
        fm(870, 2.37, 6.0, dur, decay=0.06) * 0.6,
        fm(1310, 3.11, 4.0, dur, decay=0.05) * 0.35,
    ) * expdecay(dur, 0.14)
    air = spectral_shape(noise(dur) * expdecay(dur, 0.05), 3800, 1.0) * 0.5
    return fade(normalize(layer(metal, air), 0.9), 0.001, 0.09)


def boom(dur=0.9, f0=180, f1=38, crack=0.6):
    low = sweep(f0, f1, dur) * expdecay(dur, 0.22)
    sub = np.sin(2 * np.pi * 46 * t(dur)) * expdecay(dur, 0.3) * 0.7
    hit = spectral_shape(noise(dur) * expdecay(dur, 0.03), 1500, 1.4) * crack
    return fade(normalize(layer(low, sub, hit), 0.95), 0.001, 0.12)


def riser(dur=0.6, f0=180, f1=1400):
    tone = sweep(f0, f1, dur) * np.linspace(0.2, 1.0, n_samples(dur))
    air = spectral_shape(noise(dur), 1200, 1.6) * np.linspace(0, 0.8, n_samples(dur)) ** 2
    return fade(normalize(layer(tone * 0.7, air), 0.7), 0.03, 0.05)


def shatter(dur=0.85):
    out = boom(dur, 200, 42, crack=0.4) * 0.9
    for i in range(9):
        f = RNG.uniform(1800, 5200)
        out += at(bell(f, 0.25, partials=(1.0, 3.3), decay=0.09) * 0.22, 0.03 + i * 0.028, dur)
    return fade(normalize(out, 0.95), 0.001, 0.14)


# ------------------------------------------------------- DON!! / magic / win
def chime(root=660, dur=0.7, partials=(1.0, 2.0, 3.01, 4.98), decay=0.34):
    return fade(normalize(bell(root, dur, partials, decay), 0.8), 0.002, 0.1)


def shimmer(dur=0.9, root=1046):
    out = np.zeros(n_samples(dur))
    for i in range(7):
        f = root * RNG.uniform(0.98, 2.05)
        out += at(bell(f, 0.5, partials=(1.0, 2.4), decay=0.2) * RNG.uniform(0.25, 0.6),
                  RNG.uniform(0.0, 0.35), dur)
    return fade(normalize(out, 0.75), 0.01, 0.16)


def fanfare(root=392, dur=1.6, steps=(0, 4, 7, 12), step_ms=130):
    out = np.zeros(n_samples(dur))
    for i, s in enumerate(steps):
        f = root * 2 ** (s / 12)
        v = layer(tri(f, f, 0.9), tri(f * 2.003, f * 2.003, 0.9) * 0.4) * adsr(0.9, 0.01, 0.15, 0.55, 0.5)
        out += at(v * 0.8, i * step_ms / 1000.0, dur)
    out += at(chime(root * 4, 0.9), (len(steps) - 1) * step_ms / 1000.0, dur) * 0.5
    return fade(normalize(out, 0.85), 0.005, 0.25)


def dirge(root=196, dur=1.8):
    out = np.zeros(n_samples(dur))
    for i, s in enumerate((0, 3, 7)):
        f = root * 2 ** (s / 12)
        out += at(tri(f, f * 0.985, 1.5) * adsr(1.5, 0.06, 0.4, 0.45, 0.8) * 0.7, i * 0.12, dur)
    return fade(normalize(out, 0.75), 0.02, 0.5)


# --------------------------------------------------------------- Music beds
def pad_loop(root=110, chord=(0, 7, 12, 16), dur=8.0, motion=0.12):
    x = t(dur)
    out = np.zeros(x.size)
    for i, s in enumerate(chord):
        f = root * 2 ** (s / 12)
        lfo = 1 + motion * 0.01 * np.sin(2 * np.pi * (0.07 + i * 0.013) * x)
        voice = np.sin(2 * np.pi * f * x * lfo) + 0.4 * np.sin(2 * np.pi * f * 2.002 * x)
        out += voice * (0.6 / (i + 1) ** 0.6)
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * x / dur - np.pi / 2)
    out = spectral_shape(out * swell, 420, 2.2, tilt=-1.0)
    # Loop-safe: equal-power crossfade of the tail back over the head.
    xf = n_samples(0.75)
    head, tail = out[:xf].copy(), out[-xf:].copy()
    ramp = np.linspace(0, 1, xf)
    out[:xf] = head * ramp + tail * (1 - ramp)
    return normalize(out[:-xf], 0.55)
