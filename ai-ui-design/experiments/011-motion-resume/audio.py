#!/usr/bin/env python3
"""Original 15-second score and sound design for M/15.

Tempo: 80 BPM, 4/4, five bars of three seconds.
Everything is synthesized from scratch; no samples or external audio.
"""

from __future__ import annotations

import json
import math
import os
import subprocess
import wave

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DURATION = 15.0
N = int(SR * DURATION)
T = np.arange(N) / SR
BEAT = 60.0 / 80.0         # 0.75 s
BAR = BEAT * 4.0           # 3.0 s
RNG = np.random.default_rng(1515)

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# utility
# ---------------------------------------------------------------------------

def env_ar(n: int, attack: float, release: float, curve: float = 1.0) -> np.ndarray:
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e = np.ones(n, dtype=np.float64)
    a = min(a, n)
    r = min(r, n)
    e[:a] = np.linspace(0, 1, a) ** curve
    e[n - r:] *= np.linspace(1, 0, r) ** curve
    return e


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def hp(sig: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, cutoff, btype="highpass", fs=SR, output="sos")
    return signal.sosfilt(sos, sig)


def lp(sig: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, cutoff, btype="lowpass", fs=SR, output="sos")
    return signal.sosfilt(sos, sig)


def bp(sig: np.ndarray, low: float, high: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, [low, high], btype="bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, sig)


def midi(n: float) -> float:
    return 440.0 * (2.0 ** ((n - 69.0) / 12.0))


def fade_edges(sig: np.ndarray, fade_in: float = 0.003, fade_out: float = 0.01) -> np.ndarray:
    n = len(sig)
    fi = min(n, max(1, int(fade_in * SR)))
    fo = min(n, max(1, int(fade_out * SR)))
    sig = sig.copy()
    sig[:fi] *= np.linspace(0, 1, fi)
    sig[-fo:] *= np.linspace(1, 0, fo)
    return sig


def pan_gains(pan: float) -> tuple[float, float]:
    # Constant-power pan, pan in [-1, 1].
    p = (np.clip(pan, -1, 1) + 1.0) * math.pi / 4.0
    return math.cos(p), math.sin(p)


# ---------------------------------------------------------------------------
# buses
# ---------------------------------------------------------------------------

dry_l = np.zeros(N, dtype=np.float64)
dry_r = np.zeros(N, dtype=np.float64)
pad_l = np.zeros(N, dtype=np.float64)
pad_r = np.zeros(N, dtype=np.float64)
bass = np.zeros(N, dtype=np.float64)
pluck_l = np.zeros(N, dtype=np.float64)
pluck_r = np.zeros(N, dtype=np.float64)
bell_l = np.zeros(N, dtype=np.float64)
bell_r = np.zeros(N, dtype=np.float64)
perc_l = np.zeros(N, dtype=np.float64)
perc_r = np.zeros(N, dtype=np.float64)
fx_l = np.zeros(N, dtype=np.float64)
fx_r = np.zeros(N, dtype=np.float64)
send_l = np.zeros(N, dtype=np.float64)
send_r = np.zeros(N, dtype=np.float64)


def place(target_l, target_r, start: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0):
    i = int(round(start * SR))
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), N - i)
    if n <= 0:
        return
    s = sig[:n] * gain
    gl, gr = pan_gains(pan)
    np.add.at(target_l, slice(i, i + n), s * gl)
    np.add.at(target_r, slice(i, i + n), s * gr)


def send(start: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0):
    place(send_l, send_r, start, sig, gain, pan)


# ---------------------------------------------------------------------------
# harmony: five bars, a small arc from A minor to C major
# ---------------------------------------------------------------------------

CHORDS = [
    # bar 1: Am9, voiced above the bass so the low end stays clean
    [52, 59, 60, 64, 67],
    # bar 2: Fmaj9
    [48, 52, 57, 60, 64, 67],
    # bar 3: Cmaj9
    [48, 52, 59, 62, 67],
    # bar 4: G6/9
    [50, 52, 57, 59, 62, 67],
    # bar 5: Fmaj9, handing over to the final Cmaj9
    [48, 52, 57, 60, 64, 67],
]

PAD_LEVELS = [0.088, 0.10, 0.106, 0.112, 0.12]


def pad_voice(freq: float, dur: float, seed: int, pan: float, brightness: float = 1600.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    out = np.zeros(n, dtype=np.float64)
    # Additive, slightly detuned stack. Avoid a perfectly static choir.
    detunes = [-0.0045, 0.0, 0.0045]
    for di, cents in enumerate(detunes):
        f = freq * (2.0 ** (cents / 12.0))
        phase = rng.uniform(0, 2 * math.pi)
        for h in range(1, 8):
            amp = 1.0 / (h ** 1.8)
            out += amp * np.sin(2 * math.pi * f * h * tt + phase + h * 0.7)
    out /= 3.0
    out = lp(out, brightness, 2)
    # slow movement
    out *= 1.0 + 0.06 * np.sin(2 * math.pi * 0.13 * tt + seed)
    env = env_ar(n, attack=0.55, release=0.55, curve=1.0)
    out *= env
    return out


for bar, chord in enumerate(CHORDS):
    start = bar * BAR
    # The fifth F chord gets out of the way of the final C major resolution.
    dur = 1.72 if bar == 4 else BAR + 0.9
    for i, note in enumerate(chord):
        f = midi(note)
        pan = ((i % 4) - 1.5) / 3.2
        level = PAD_LEVELS[bar] * (0.75 if note < 50 else 1.0)
        v = pad_voice(f, dur, 1000 + bar * 20 + i, pan, brightness=1300 + bar * 280)
        place(pad_l, pad_r, start, v, level, pan)
        vv = pad_voice(f * 2, dur * 0.8, 5000 + bar * 20 + i, pan, brightness=2200)
        place(pad_l, pad_r, start + 0.08, vv, level * 0.16, -pan * 0.6)
        send(start, v, level * 0.55, pan)

# The last chord resolves to Cmaj9 at 13.75, with an added high E.
final_start = 13.75
for i, note in enumerate([48, 52, 55, 59, 62, 67, 72, 76]):
    f = midi(note)
    pan = ((i % 4) - 1.5) / 3.2
    dur = DURATION - final_start + 0.05
    v = pad_voice(f, dur, 7000 + i, pan, brightness=2100)
    place(pad_l, pad_r, final_start, v, 0.10 * (0.75 if note < 50 else 1.0), pan)
    send(final_start, v, 0.05, pan)


# ---------------------------------------------------------------------------
# bass
# ---------------------------------------------------------------------------

BASS_NOTES = [(0.0, 45, 2.9), (3.0, 41, 2.8), (6.0, 36, 2.8), (9.0, 43, 2.8), (12.0, 41, 1.65), (13.75, 36, 1.2)]


def bass_note(note: int, dur: float):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = midi(note)
    sig = (
        0.78 * np.sin(2 * math.pi * f * tt)
        + 0.20 * np.sin(2 * math.pi * f * 2 * tt + 0.4)
        + 0.08 * np.sin(2 * math.pi * f * 3 * tt + 1.2)
    )
    sig = np.tanh(sig * 1.5) / np.tanh(1.5)
    env = env_ar(n, attack=0.018, release=min(0.28, dur * 0.35), curve=1.2)
    # gentle tail wobble
    env *= 1.0 + 0.04 * np.sin(2 * math.pi * 0.7 * tt)
    return sig * env


for start, note, dur in BASS_NOTES:
    v = bass_note(note, dur)
    i = int(round(start * SR))
    n = min(len(v), N - i)
    if n > 0:
        bass[i:i + n] += v[:n] * 0.13

# Small pickup notes in bars 3 and 4.
for start, note, dur, g in [
    (5.25, 53, 0.55, 0.11),
    (8.25, 50, 0.45, 0.10),
    (11.25, 55, 0.55, 0.12),
    (13.5, 52, 0.55, 0.075),
]:
    v = bass_note(note, dur)
    place(dry_l, dry_r, start, v, g, 0.0)


# ---------------------------------------------------------------------------
# drums
# ---------------------------------------------------------------------------

def kick(dur: float = 0.42, level: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = 46 + 96 * np.exp(-tt * 30)
    phase = 2 * math.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-tt * 8.5)
    click = RNG.standard_normal(n) * np.exp(-tt * 160)
    click = hp(click, 1500, 2) * 0.14
    sub = np.sin(2 * math.pi * 38 * tt) * np.exp(-tt * 5.5) * 0.35
    out = body + click + sub
    out = np.tanh(out * 1.6) / np.tanh(1.6)
    return fade_edges(out * level, 0.001, 0.02)


def snare(dur: float = 0.26, level: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    tt = np.arange(n) / SR
    noise = RNG.standard_normal(n)
    noise = bp(noise, 1300, 6800, 2) * np.exp(-tt * 19)
    body = np.sin(2 * math.pi * 176 * tt) * np.exp(-tt * 26) * 0.35
    out = noise * 0.65 + body
    out = np.tanh(out * 1.2)
    return fade_edges(out * level, 0.001, 0.02)


def clap(dur: float = 0.3, level: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for offset, amp in [(0.0, 0.55), (0.011, 0.85), (0.023, 1.0), (0.041, 0.45)]:
        i = int(offset * SR)
        burst = RNG.standard_normal(n - i) * np.exp(-np.arange(n - i) / SR * 33)
        burst = bp(burst, 1100, 6200, 2)
        out[i:] += burst * amp
    out *= 0.55
    return fade_edges(out * level, 0.001, 0.03)


def hat(dur: float = 0.07, level: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    tt = np.arange(n) / SR
    noise = RNG.standard_normal(n)
    noise = hp(noise, 7200, 2) * np.exp(-tt * 58)
    return fade_edges(noise * level, 0.001, 0.01)


KICK_TIMES = [
    0.0,
    1.5,
    3.0,
    4.5,
    6.0,
    7.5,
    9.0,
    9.75,
    10.5,
    11.25,
    12.0,
    13.5,
    14.25,
]
KICK_LEVELS = [0.48, 0.16, 0.58, 0.28, 0.64, 0.30, 0.72, 0.26, 0.60, 0.42, 0.92, 0.40, 0.20]
for start, level in zip(KICK_TIMES, KICK_LEVELS):
    k = kick(level=level)
    place(dry_l, dry_r, start, k, 0.62, 0.0)
    place(perc_l, perc_r, start, k, 0.25, 0.0)

# A single soft heartbeat in the intro.
place(dry_l, dry_r, 0.78, kick(0.32, 0.20), 0.46, 0.0)

for start, level in [(4.5, 0.55), (10.5, 0.75), (13.5, 0.25)]:
    s = snare(level=level)
    place(dry_l, dry_r, start, s, 0.42, 0.05)
    place(perc_l, perc_r, start, s, 0.22, 0.05)
    send(start, s, 0.08, 0.1)

place(dry_l, dry_r, 10.5, clap(level=0.7), 0.35, 0.0)
send(10.5, clap(level=0.5), 0.07, 0.0)

# Hats: eighth notes, with sixteenth ghosts in the final builds.
for i in range(int(DURATION / (BEAT / 2))):
    start = i * BEAT / 2
    if start >= 14.95:
        break
    if 0.75 <= start < 2.95:
        level = 0.09 if i % 2 else 0.14
    elif 3.0 <= start < 8.9:
        level = 0.12 if i % 2 else 0.19
    elif 9.0 <= start < 11.9:
        level = 0.13 if i % 2 else 0.23
    else:
        level = 0.10 if i % 2 else 0.17
    h = hat(level=level)
    place(perc_l, perc_r, start, h, 1.15, -0.28 if i % 2 else 0.28)
    if i % 2 == 1:
        send(start, h, 0.07, 0.0)

for start in [9.1875, 9.5625, 9.9375, 10.3125, 10.6875, 11.0625, 11.4375]:
    h = hat(0.05, 0.06)
    place(perc_l, perc_r, start, h, 0.35, 0.0)

# Small snare build into the systems section.
for i, start in enumerate(np.arange(8.25, 9.0, 0.09375)):
    level = 0.05 + 0.14 * (i / 8)
    s = snare(0.12, level=level)
    place(perc_l, perc_r, float(start), s, 0.22, -0.15 + 0.3 * (i % 2))
    if i % 2 == 0:
        send(float(start), s, 0.025, 0.0)


# ---------------------------------------------------------------------------
# score: pluck, bells, type stamps, metronome, ticks
# ---------------------------------------------------------------------------

def pluck(note: int, dur: float = 1.0, brightness: float = 1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = midi(note)
    sig = (
        np.sin(2 * math.pi * f * tt) * 0.80
        + np.sin(2 * math.pi * f * 2.003 * tt) * 0.18
        + np.sin(2 * math.pi * f * 3.004 * tt) * 0.08
        + np.sin(2 * math.pi * f * 5.01 * tt) * 0.035
    )
    sig *= np.exp(-tt * 5.4)
    sig = lp(sig, 3600 * brightness, 2)
    # tiny mallet attack
    click = RNG.standard_normal(n) * np.exp(-tt * 140) * 0.04
    click = bp(click, 1500, 7000)
    sig += click
    return fade_edges(sig, 0.002, 0.08)


PLUCKS = [
    (1.5, 76, 0.13, 0.2),
    (2.25, 71, 0.10, -0.25),
    (3.75, 69, 0.17, -0.15),
    (4.5, 72, 0.16, 0.2),
    (5.25, 76, 0.13, 0.25),
    (6.75, 67, 0.17, -0.25),
    (7.5, 71, 0.16, 0.15),
    (8.25, 74, 0.14, 0.25),
    (9.375, 71, 0.17, -0.2),
    (10.125, 74, 0.16, 0.2),
    (10.875, 67, 0.13, 0.28),
    (11.625, 69, 0.14, -0.2),
    (12.75, 72, 0.18, 0.15),
    (13.5, 76, 0.13, -0.2),
    (14.25, 79, 0.12, 0.0),
]
for start, note, gain, pan in PLUCKS:
    v = pluck(note, dur=1.4, brightness=1.0)
    g = gain * 2.8
    place(pluck_l, pluck_r, start, v, g, pan)
    send(start, v, g * 0.75, pan)


def bell(freq: float, dur: float = 2.0, level: float = 1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    partials = [(1.0, 1.0, 2.4), (2.01, 0.42, 3.5), (3.99, 0.18, 4.8), (5.42, 0.10, 6.2), (8.1, 0.04, 8.0)]
    out = np.zeros(n)
    for ratio, amp, decay in partials:
        out += amp * np.sin(2 * math.pi * freq * ratio * tt + ratio) * np.exp(-tt * decay)
    out = lp(out, 9000)
    return fade_edges(out * level, 0.002, 0.2)


for start, note, gain, pan in [
    (1.82, 93, 0.10, -0.25),
    (4.55, 88, 0.065, 0.25),
    (8.25, 91, 0.06, 0.2),
    (11.3, 96, 0.075, -0.1),
    (12.0, 84, 0.08, 0.0),
    (12.76, 91, 0.075, 0.2),
    (13.15, 96, 0.055, -0.15),
    (14.25, 88, 0.07, 0.1),
]:
    v = bell(midi(note), dur=2.4, level=1.0)
    g = gain * 2.5
    place(bell_l, bell_r, start, v, g, pan)
    send(start, v, g * 1.25, pan)


def type_tick(seed: int, pitch: float = 1800.0, level: float = 1.0):
    n = int(0.035 * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    click = rng.standard_normal(n) * np.exp(-tt * 180)
    click = bp(click, 900, 7000)
    tone = np.sin(2 * math.pi * pitch * tt) * np.exp(-tt * 110)
    return fade_edges((click * 0.65 + tone * 0.35) * level, 0.001, 0.005)


# Word strips stamping into place.
for i in range(0, 10, 2):
    start = 3.62 + i * 0.027
    v = type_tick(300 + i, 1350 + i * 90, 0.35)
    place(perc_l, perc_r, start, v, 0.6, -0.4 + i * 0.09)
    send(start, v, 0.025, 0.0)

# Line entrances later in the film.
for i, start in enumerate([0.98, 1.42, 12.04, 12.4, 12.76, 13.55]):
    v = type_tick(700 + i, 1100 + i * 150, 0.24)
    place(perc_l, perc_r, start, v, 0.45, -0.25 + (i % 3) * 0.25)


def metronome_click(level: float = 1.0):
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for freq, amp, decay in [(1440, 1.0, 38), (2180, 0.55, 52), (720, 0.25, 28)]:
        out += amp * np.sin(2 * math.pi * freq * tt) * np.exp(-tt * decay)
    click = RNG.standard_normal(n) * np.exp(-tt * 200) * 0.18
    click = hp(click, 1400)
    out += click
    out = np.tanh(out * 1.4)
    return fade_edges(out * level, 0.001, 0.025)


# Metronome, exactly on the visual beat.
for i, start in enumerate([6.0, 6.75, 7.5, 8.25]):
    v = metronome_click(0.9 if i == 0 else 0.72)
    place(perc_l, perc_r, start, v, 0.48, 0.24)
    send(start, v, 0.06, 0.15)

# A quieter pulse continues the clock in the systems section.
for start in [9.0, 9.75, 10.5, 11.25]:
    v = metronome_click(0.30)
    place(perc_l, perc_r, start, v, 0.24, 0.2)
    send(start, v, 0.025, 0.1)

# System state ticks: one pitch per state, placed as the shape changes.
STATE_TICKS = [
    (9.375, 91, 0.11),
    (9.75, 88, 0.10),
    (10.125, 86, 0.10),
    (10.5, 83, 0.10),
    (10.875, 81, 0.09),
    (11.25, 84, 0.10),
]
for i, (start, note, gain) in enumerate(STATE_TICKS):
    n = int(0.16 * SR)
    tt = np.arange(n) / SR
    f = midi(note)
    sig = np.sin(2 * math.pi * f * tt) * np.exp(-tt * 34) * 0.7
    sig += np.sin(2 * math.pi * f * 2 * tt) * np.exp(-tt * 46) * 0.2
    sig = fade_edges(sig, 0.001, 0.02)
    place(perc_l, perc_r, start, sig, gain, -0.35 + (i % 3) * 0.3)
    send(start, sig, gain * 0.45, 0.0)

# A small confirmation when the identity locks.
for i, start in enumerate([11.3, 11.38]):
    v = type_tick(820 + i, 1700 + i * 220, 0.2)
    place(perc_l, perc_r, start, v, 0.4, 0.2)
    send(start, v, 0.03, 0.0)


# ---------------------------------------------------------------------------
# transitions, impacts, texture
# ---------------------------------------------------------------------------

def impact(dur: float = 1.1, level: float = 1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = 42 + 54 * np.exp(-tt * 13)
    phase = 2 * math.pi * np.cumsum(f) / SR
    low = np.sin(phase) * np.exp(-tt * 3.2)
    thump = np.sin(2 * math.pi * 62 * tt) * np.exp(-tt * 6.5) * 0.4
    noise = RNG.standard_normal(n) * np.exp(-tt * 18)
    noise = lp(noise, 600, 2) * 0.25
    out = np.tanh((low + thump + noise) * 1.4)
    return fade_edges(out * level, 0.001, 0.25)


def noise_swell(dur: float, rising: bool = True, tone: float = 0.0, level: float = 1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    noise = RNG.standard_normal(n)
    # Two bands, with a broad body, keep it airy rather than hissy.
    body = bp(noise, 250, 2800, 2)
    air = hp(noise, 2800, 2) * 0.55
    sig = body + air
    if rising:
        curve = (tt / dur) ** 2.3
        sig *= curve
    else:
        curve = (1 - tt / dur) ** 2.0
        sig *= curve
    if tone:
        sweep = np.sin(2 * math.pi * (tone * (0.5 + tt / dur * 1.5)) * tt) * 0.05
        sig += sweep
    # A little flutter makes it feel physical.
    sig *= 1.0 + 0.12 * np.sin(2 * math.pi * 7.0 * tt)
    return fade_edges(sig * level, 0.01, 0.02)


def paper_slide(dur: float, level: float = 1.0, seed: int = 0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    # Crinkle: sparse impulses through a resonant band.
    impulses = np.zeros(n)
    positions = rng.integers(0, max(1, n - 1), size=max(10, int(dur * 120)))
    strengths = rng.uniform(0.1, 1.0, size=len(positions))
    impulses[positions] += strengths
    crinkle = signal.lfilter([1.0], [1.0, -0.96], impulses)
    crinkle = bp(crinkle, 900, 9000, 2) * 0.6
    slide = bp(rng.standard_normal(n), 500, 6000, 2) * 0.5
    env = env_ar(n, attack=0.02, release=min(0.2, dur * 0.5), curve=1.4)
    slide *= env
    out = crinkle + slide
    out *= 1.0 + 0.25 * np.sin(2 * math.pi * 3.2 * tt)
    return fade_edges(out * level, 0.001, 0.03)


# The opening: a low impact and a breath of air.
place(dry_l, dry_r, 0.0, impact(1.4, 0.8), 0.55, 0.0)
place(fx_l, fx_r, 0.0, noise_swell(0.85, rising=True, tone=120, level=0.2), 0.26, 0.0)
place(fx_l, fx_r, 0.55, noise_swell(0.3, rising=True, tone=260, level=0.16), 0.22, 0.0)
place(fx_l, fx_r, 0.72, paper_slide(0.5, 0.18, 11), 0.5, -0.1)
send(0.0, impact(1.4, 0.5), 0.05, 0.0)

# Title words land.
place(fx_l, fx_r, 0.96, paper_slide(0.38, 0.10, 12), 0.4, 0.2)
place(perc_l, perc_r, 1.8, type_tick(901, 2100, 0.22), 0.4, 0.0)

# Curtain into act two.
place(fx_l, fx_r, 2.52, noise_swell(0.5, rising=True, tone=100, level=0.30), 0.32, 0.0)
place(fx_l, fx_r, 2.5, paper_slide(0.55, 0.16, 21), 0.5, 0.1)
place(dry_l, dry_r, 3.0, impact(0.8, 0.7), 0.48, 0.0)
send(3.0, impact(0.8, 0.4), 0.06, 0.0)

# Red disc entry.
place(fx_l, fx_r, 4.05, noise_swell(0.7, rising=True, tone=240, level=0.2), 0.2, 0.15)
# Disc expansion and paper strip wipe.
place(fx_l, fx_r, 5.1, noise_swell(0.42, rising=True, tone=190, level=0.18), 0.2, 0.0)
place(fx_l, fx_r, 5.46, noise_swell(0.55, rising=True, tone=150, level=0.25), 0.28, -0.1)
place(fx_l, fx_r, 5.44, paper_slide(0.68, 0.28, 31), 0.62, 0.1)
place(dry_l, dry_r, 6.0, impact(0.7, 0.55), 0.4, 0.0)

# Build into systems.
place(fx_l, fx_r, 8.55, noise_swell(0.48, rising=True, tone=220, level=0.25), 0.25, 0.2)
place(dry_l, dry_r, 9.0, impact(1.0, 1.0), 0.55, 0.0)
send(9.0, impact(1.0, 0.8), 0.07, 0.0)

# Identity -> paper card.
place(fx_l, fx_r, 11.30, paper_slide(0.32, 0.12, 41), 0.5, 0.0)
place(fx_l, fx_r, 11.55, noise_swell(0.48, rising=True, tone=170, level=0.3), 0.32, 0.0)
place(fx_l, fx_r, 11.60, paper_slide(0.45, 0.2, 42), 0.55, -0.1)
place(dry_l, dry_r, 12.0, impact(1.2, 1.0), 0.65, 0.0)
send(12.0, impact(1.2, 0.8), 0.1, 0.0)

# The final page settles.
place(fx_l, fx_r, 13.1, paper_slide(0.24, 0.06, 51), 0.35, 0.2)
place(perc_l, perc_r, 13.55, type_tick(950, 1250, 0.15), 0.35, -0.2)
place(perc_l, perc_r, 14.25, type_tick(951, 1500, 0.16), 0.3, 0.2)

# Low drone, mixed almost subliminally.
drone = np.sin(2 * math.pi * midi(33) * T) * 0.010
drone *= smoothstep(T / 1.5) * smoothstep((DURATION - T) / 1.2)
place(fx_l, fx_r, 0.0, drone, 0.6, 0.0)
place(fx_l, fx_r, 0.0, np.sin(2 * math.pi * midi(40) * T + 1.4) * 0.007, 0.6, 0.0)


# ---------------------------------------------------------------------------
# effects: ping-pong delay, reverb, sidechain, mix
# ---------------------------------------------------------------------------

def ping_pong(left: np.ndarray, right: np.ndarray, delay_s: float = 0.5625, feedback: float = 0.30, wet: float = 0.23):
    d = int(delay_s * SR)
    out_l = left.copy()
    out_r = right.copy()
    src_l = left
    src_r = right
    for tap in range(1, 5):
        idx = tap * d
        if idx >= N:
            break
        g = feedback ** (tap - 1)
        if tap % 2 == 1:
            out_r[idx:] += src_l[: N - idx] * g * wet
        else:
            out_l[idx:] += src_r[: N - idx] * g * wet
    return out_l, out_r


pluck_l, pluck_r = ping_pong(pluck_l, pluck_r, BEAT * 0.75, 0.28, 0.20)
bell_l, bell_r = ping_pong(bell_l, bell_r, BEAT * 1.5, 0.22, 0.14)


def make_ir(dur: float = 1.7, seed: int = 88):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    ir_l = rng.standard_normal(n) * np.exp(-tt * 3.4)
    ir_r = rng.standard_normal(n) * np.exp(-tt * 3.4)
    ir_l = lp(ir_l, 6500, 2)
    ir_r = lp(ir_r, 6200, 2)
    # Pre-delay and diffusion.
    pred = int(0.018 * SR)
    ir_l = np.concatenate([np.zeros(pred), ir_l])[:n]
    ir_r = np.concatenate([np.zeros(pred), ir_r])[:n]
    ir_l /= np.sqrt(np.sum(ir_l**2)) + 1e-9
    ir_r /= np.sqrt(np.sum(ir_r**2)) + 1e-9
    return ir_l, ir_r


ir_l, ir_r = make_ir()
wet_l = signal.fftconvolve(send_l, ir_l, mode="full")[:N]
wet_r = signal.fftconvolve(send_r, ir_r, mode="full")[:N]
wet_l = np.tanh(wet_l * 0.9)
wet_r = np.tanh(wet_r * 0.9)

# Build the control envelope from the kick times for a gentle pump.
side = np.ones(N)
for start, level in zip(KICK_TIMES, KICK_LEVELS):
    i = int(start * SR)
    n = int(0.55 * SR)
    if i >= N:
        continue
    n = min(n, N - i)
    tt = np.arange(n) / SR
    depth = 0.17 * min(1.0, level)
    side[i:i + n] *= 1.0 - depth * np.exp(-tt * 9.0)
side = np.clip(side, 0.75, 1.0)

# The pad and bass breathe with the kick.
pad_l = hp(pad_l, 130, 2)
pad_r = hp(pad_r, 130, 2)
pad_l *= side
pad_r *= side
# A slightly weaker pump on the high plucks.
pluck_l *= 1.0 - (1.0 - side) * 0.4
pluck_r *= 1.0 - (1.0 - side) * 0.4

# Report stem levels so the balance is explicit rather than guessed.
def rms_db(x):
    return round(20.0 * math.log10(max(float(np.sqrt(np.mean(x * x))), 1e-9)), 2)

print(json.dumps({
    "stems": {
        "dry": rms_db((dry_l + dry_r) * 0.5),
        "pad": rms_db((pad_l + pad_r) * 0.5),
        "bass": rms_db(bass),
        "perc": rms_db((perc_l + perc_r) * 0.5),
        "pluck": rms_db((pluck_l + pluck_r) * 0.5),
        "bell": rms_db((bell_l + bell_r) * 0.5),
        "fx": rms_db((fx_l + fx_r) * 0.5),
        "wet": rms_db((wet_l + wet_r) * 0.5),
    }
}, indent=2))

# Sum stems. The continuous pad is deliberately behind the transients.
mix_l = (
    dry_l * 0.80
    + pad_l * 0.80
    + bass * 0.62
    + perc_l * 0.90
    + pluck_l * 1.00
    + bell_l * 0.92
    + fx_l * 1.70
    + wet_l * 0.24
)
mix_r = (
    dry_r * 0.80
    + pad_r * 0.80
    + bass * 0.62
    + perc_r * 0.90
    + pluck_r * 1.00
    + bell_r * 0.92
    + fx_r * 1.70
    + wet_r * 0.24
)

# Remove DC / subsonic rumble. No bus limiting: keep the transients intact.
mix_l = hp(mix_l, 26, 2)
mix_r = hp(mix_r, 26, 2)

# Fade in/out. The final chord is allowed to ring to the last frame.
fade_in = int(0.012 * SR)
fade_out = int(0.14 * SR)
mix_l[:fade_in] *= np.linspace(0, 1, fade_in)
mix_r[:fade_in] *= np.linspace(0, 1, fade_in)
mix_l[-fade_out:] *= np.linspace(1, 0, fade_out)
mix_r[-fade_out:] *= np.linspace(1, 0, fade_out)

# Keep a little inter-channel difference, then normalize.
stereo = np.stack([mix_l, mix_r], axis=1)
peak = float(np.max(np.abs(stereo)))
stereo = stereo / max(peak, 1e-9) * 0.88

# A touch of deterministic dither for 16-bit conversion.
dither = (RNG.standard_normal(stereo.shape) * (1.0 / 32768.0) * 0.6)
stereo = np.clip(stereo + dither, -0.999, 0.999)

wav_path = os.path.join(OUT_DIR, "score_raw.wav")
wavfile.write(wav_path, SR, (stereo * 32767.0).astype(np.int16))

rms = float(np.sqrt(np.mean(stereo**2)))
print(json.dumps({
    "wav": wav_path,
    "duration": DURATION,
    "sample_rate": SR,
    "peak_dbfs": round(20 * math.log10(max(float(np.max(np.abs(stereo))), 1e-9)), 2),
    "rms_dbfs": round(20 * math.log10(max(rms, 1e-9)), 2),
    "channels": 2,
}, indent=2))

# Normalize to a delivery-friendly -14 LUFS in a linear pass.
probe = subprocess.run(
    [
        "ffmpeg", "-hide_banner", "-i", wav_path,
        "-af", "loudnorm=I=-15:TP=-1.0:LRA=7:print_format=json",
        "-f", "null", "-",
    ],
    capture_output=True,
    text=True,
    check=False,
)
text = probe.stderr
measure = {}
import re
for key in ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"]:
    match = re.search(rf'"{key}"\s*:\s*"([-+]?[0-9.]+)"', text)
    if match:
        measure[key] = float(match.group(1))

norm_path = os.path.join(OUT_DIR, "score.wav")
if all(key in measure for key in ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"]):
    filt = (
        f"loudnorm=I=-15:TP=-1.0:LRA=7:linear=true:"
        f"measured_I={measure['input_i']}:measured_TP={measure['input_tp']}:"
        f"measured_LRA={measure['input_lra']}:measured_thresh={measure['input_thresh']}:"
        f"offset={measure['target_offset']}"
    )
    result = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-i", wav_path, "-af", filt, "-ar", "48000", "-ac", "2", norm_path],
        check=False,
        capture_output=True,
        text=True,
    )
    print(json.dumps({"normalized": norm_path, "measured": measure, "ffmpeg_exit": result.returncode}, indent=2))
    if result.returncode != 0:
        print(result.stderr[-2000:])
else:
    # Fallback: a plain, peak-safe copy.
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-i", wav_path, "-af", "volume=-1dB", "-ar", "48000", "-ac", "2", norm_path],
        check=False,
        capture_output=True,
    )
    print(json.dumps({"normalized": norm_path, "measured": None}, indent=2))
