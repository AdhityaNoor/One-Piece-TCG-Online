"""
Tiny procedural synth used to build the PLACEHOLDER sound effects in
public/audio/sfx/. These are deliberately synthetic: they exist so the game
can be played, paced and mixed end to end before any real sound design
lands. Every one is meant to be overwritten by a real asset of the same
filename (see docs/09-audio-and-sound-design.md).

Pure numpy — no scipy, no external sample libraries.
"""
import numpy as np

SR = 44100
RNG = np.random.default_rng(20260829)


def n_samples(dur: float) -> int:
    return max(1, int(round(SR * dur)))


def t(dur: float) -> np.ndarray:
    return np.arange(n_samples(dur)) / SR


def expdecay(dur: float, tau: float, attack: float = 0.002) -> np.ndarray:
    """Percussive envelope: fast linear attack, exponential tail."""
    x = t(dur)
    env = np.exp(-x / max(tau, 1e-4))
    a = n_samples(attack)
    if a > 1:
        env[:a] *= np.linspace(0.0, 1.0, a)
    return env


def adsr(dur: float, a: float, d: float, s: float, r: float) -> np.ndarray:
    n = n_samples(dur)
    na, nd, nr = n_samples(a), n_samples(d), n_samples(r)
    ns = max(0, n - na - nd - nr)
    parts = [
        np.linspace(0, 1, na, endpoint=False),
        np.linspace(1, s, nd, endpoint=False),
        np.full(ns, s),
        np.linspace(s, 0, nr),
    ]
    env = np.concatenate(parts)
    return env[:n] if env.size >= n else np.pad(env, (0, n - env.size))


def sweep(f0: float, f1: float, dur: float, curve: str = "exp") -> np.ndarray:
    """Instantaneous-phase sine sweep from f0 to f1."""
    x = t(dur)
    if curve == "exp" and f0 > 0 and f1 > 0:
        f = f0 * (f1 / f0) ** (x / max(dur, 1e-6))
    else:
        f = np.linspace(f0, f1, x.size)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase)


def tri(f0: float, f1: float, dur: float) -> np.ndarray:
    s = sweep(f0, f1, dur)
    return 2 / np.pi * np.arcsin(np.clip(s, -1, 1))


def noise(dur: float) -> np.ndarray:
    return RNG.uniform(-1.0, 1.0, n_samples(dur))


def spectral_shape(x: np.ndarray, center: float, width_oct: float = 1.2, tilt: float = 0.0) -> np.ndarray:
    """
    Band-shape a signal with a log-frequency gaussian. Replaces a biquad
    bandpass; frequency-domain so it stays fast and dependency-free.
    `tilt` in dB/octave adds brightness (+) or darkness (-).
    """
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(x.size, 1 / SR)
    safe = np.maximum(freqs, 1.0)
    octaves = np.log2(safe / center)
    resp = np.exp(-0.5 * (octaves / max(width_oct, 1e-3)) ** 2)
    if tilt:
        resp *= 10 ** (tilt * octaves / 20.0)
    return np.fft.irfft(spec * resp, n=x.size)


def bell(freq: float, dur: float, partials=(1.0, 2.76, 5.4, 8.9), decay: float = 0.35) -> np.ndarray:
    out = np.zeros(n_samples(dur))
    for i, p in enumerate(partials):
        amp = 1.0 / (i + 1) ** 1.4
        out += amp * np.sin(2 * np.pi * freq * p * t(dur)) * np.exp(-t(dur) / (decay / (i * 0.5 + 1)))
    return out


def fm(carrier: float, ratio: float, index: float, dur: float, decay: float = 0.12) -> np.ndarray:
    x = t(dur)
    idx = index * np.exp(-x / decay)
    return np.sin(2 * np.pi * carrier * x + idx * np.sin(2 * np.pi * carrier * ratio * x))


def normalize(x: np.ndarray, peak: float = 0.85) -> np.ndarray:
    m = float(np.max(np.abs(x))) if x.size else 0.0
    return x if m < 1e-9 else x * (peak / m)


def fade(x: np.ndarray, fade_in: float = 0.003, fade_out: float = 0.02) -> np.ndarray:
    """Kill clicks at both ends — important for very short cues."""
    y = x.copy()
    a, b = n_samples(fade_in), n_samples(fade_out)
    if a < y.size:
        y[:a] *= np.linspace(0, 1, a)
    if b < y.size:
        y[-b:] *= np.linspace(1, 0, b)
    return y


def layer(*parts: np.ndarray) -> np.ndarray:
    n = max(p.size for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: p.size] += p
    return out


def at(x: np.ndarray, offset: float, total: float) -> np.ndarray:
    """Place `x` at `offset` seconds inside a buffer of `total` seconds."""
    out = np.zeros(n_samples(total))
    start = n_samples(offset)
    end = min(out.size, start + x.size)
    if start < out.size:
        out[start:end] += x[: end - start]
    return out


def stereo(x: np.ndarray, width: float = 0.0) -> np.ndarray:
    """Mono -> (n,2). `width` slightly decorrelates the sides for space."""
    if width <= 0:
        return np.stack([x, x], axis=1)
    d = n_samples(width / 1000.0)
    right = np.concatenate([np.zeros(d), x])[: x.size]
    return np.stack([x, right], axis=1)
