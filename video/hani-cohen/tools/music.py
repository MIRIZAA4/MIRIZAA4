#!/usr/bin/env python3
"""Original score for the Hani Cohen motion piece.

Luxury cinematic pop, 104 BPM, D major. Every hit is placed on the same beat grid
as the animation (timeline.json), so the picture and the sound stay locked together.
Output: out/music.wav (44.1 kHz, 16-bit stereo).
"""
import json, os, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, 'timeline.json')))
SR = 44100
BPM = TL['bpm']
BEAT = 60.0 / BPM
TOTAL = TL['totalBeats'] * BEAT
N = int((TOTAL + 0.05) * SR)
rs = np.random.default_rng(7)

main = np.zeros((N, 2))
verb = np.zeros((N, 2))
duck_src = np.zeros(N)  # kick positions for sidechain


def bt(b):
    return b * BEAT


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)


def bpf(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)


def place(sig, t, gain=1.0, pan=0.0, send=0.0, bus=None):
    """sig mono or stereo; pan -1..1"""
    i0 = int(t * SR)
    if i0 >= N:
        return
    if sig.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        st = np.stack([sig * l, sig * r], 1) * 1.414
    else:
        st = sig
    n = min(len(st), N - i0)
    if i0 < 0:
        st = st[-i0:]; n = min(len(st), N); i0 = 0
    (bus if bus is not None else main)[i0:i0 + n] += st[:n] * gain
    if send:
        verb[i0:i0 + n] += st[:n] * gain * send


def env_adsr(n, a, d, s, r, sustain_len):
    t = np.arange(n) / SR
    e = np.zeros(n)
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where((t >= a + d), s, e)
    rel = t > sustain_len
    e = np.where(rel, s * np.exp(-(t - sustain_len) / max(r, 1e-4)), e)
    return e


# ---------------------------------------------------------------- instruments
def piano(m, dur=2.5, vel=1.0):
    f = mtof(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > 9000:
            break
        a = (1 / k ** 1.25) * np.exp(-t * (0.9 + 0.55 * k)) * (0.6 + 0.4 * vel)
        out += a * np.sin(2 * np.pi * fk * t + rs.random() * 6)
    out *= np.minimum(1, t / 0.004)
    ham = lp(rs.standard_normal(n) * np.exp(-t * 90), 1800) * 0.25
    out = out + ham
    out *= np.minimum(1, (dur - t) / 0.3)
    return lp(out, 2500 + 2500 * vel) * vel


def saw(f, t, ph):
    return 2 * ((f * t + ph) % 1.0) - 1


def pad(notes, dur, bright=1200, att=1.2, rel=1.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    L = np.zeros(n); R = np.zeros(n)
    for m in notes:
        f = mtof(m)
        for d in (-0.11, -0.04, 0.03, 0.09, 0.14):
            ff = f * 2 ** (d / 12)
            s = saw(ff, t, rs.random())
            pan = d * 5
            L += s * (1 - pan) * 0.5; R += s * (1 + pan) * 0.5
    e = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (dur - t)) / rel)
    lfo = 1 + 0.25 * np.sin(2 * np.pi * 0.2 * t)
    L = lp(L, bright, 2) * e * lfo; R = lp(R, bright, 2) * e * lfo
    sc = 0.06 / max(1, len(notes))
    return np.stack([L, R], 1) * sc * 5


def pluck(m, dur=0.5, bright=1.0):
    f = mtof(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 7):
        out += (1 / k) * np.exp(-t * (7 + k * 4 * bright)) * np.sin(2 * np.pi * f * k * t)
    out *= np.minimum(1, t / 0.002)
    return out * 0.5


def bell(m, dur=3.0):
    f = mtof(m)
    n = int(dur * SR); t = np.arange(n) / SR
    I = 2.2 * np.exp(-t * 2.5)
    s = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t))
    s += 0.4 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 3)
    return s * np.exp(-t * 1.6) * np.minimum(1, t / 0.002) * 0.4


def sub(m, dur):
    f = mtof(m)
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.tanh(3 * np.sin(2 * np.pi * f * t))
    e = np.minimum(1, t / 0.01) * np.exp(-t * 2.2) * 0.7 + 0.3 * np.minimum(1, t / 0.01)
    e *= np.minimum(1, (dur - t) / 0.05)
    return lp(s * e, 400) * 0.55


def kick(vel=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 46 + 130 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 6.5)
    s += lp(rs.standard_normal(n) * np.exp(-t * 300), 4000) * 0.3
    return np.tanh(s * 1.6) * 0.8 * vel


def clap():
    n = int(0.35 * SR); t = np.arange(n) / SR
    nz = rs.standard_normal(n)
    e = np.zeros(n)
    for d in (0, 0.011, 0.022):
        e += np.where(t >= d, np.exp(-(t - d) * 70), 0)
    e += np.exp(-t * 14) * 0.5
    return bpf(nz * e, 900, 4200) * 0.55


def hat(open_=False):
    n = int((0.3 if open_ else 0.06) * SR); t = np.arange(n) / SR
    s = hp(rs.standard_normal(n), 7500, 2) * np.exp(-t * (12 if open_ else 70))
    return s * 0.35


def shutter():
    """mechanical mirror-slap + curtain: two clicks ~55 ms apart with a body thunk"""
    n = int(0.25 * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for d, g, f in ((0.0, 1.0, 210), (0.055, 0.75, 160)):
        tt = t - d
        m = tt >= 0
        click = np.zeros(n)
        click[m] = rs.standard_normal(m.sum()) * np.exp(-tt[m] * 600)
        thunk = np.zeros(n)
        thunk[m] = np.sin(2 * np.pi * f * tt[m]) * np.exp(-tt[m] * 60)
        out += g * (hp(click, 1800) * 0.9 + thunk * 0.6)
        rat = np.zeros(n)
        rat[m] = bpf(rs.standard_normal(m.sum()), 2500, 6000) * np.exp(-tt[m] * 90) * 0.25
        out += g * rat
    return out


def whoosh(dur=0.8, lo=400, hi=3000, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    x = t / dur
    e = np.sin(np.pi * x) ** 2
    nz = rs.standard_normal(n)
    a = bpf(nz, lo, hi) * e
    b = hp(nz, hi) * e * (x if up else 1 - x)
    return (a + 0.5 * b) * 0.6


def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = t / dur
    f = 180 * (12 ** x)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.5 * np.sin(ph * 1.5)) * x ** 2 * 0.25
    nz = hp(rs.standard_normal(n), 1200) * x ** 2.5 * 0.35
    trem = 1 + 0.3 * np.sin(2 * np.pi * (4 + 12 * x) * t)
    return (tone + nz) * trem


def impact():
    n = int(2.2 * SR); t = np.arange(n) / SR
    f = 30 + 60 * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 1.6)
    s += lp(rs.standard_normal(n), 900) * np.exp(-t * 5) * 0.5
    return np.tanh(s * 1.4) * 0.8


def shimmer(dur=2.0, base=86):
    out = np.zeros(int(dur * SR) + SR)
    for i in range(14):
        m = base + rs.choice([0, 2, 4, 7, 9, 12, 14])
        s = bell(m, 1.4) * 0.25
        i0 = int(rs.random() * dur * SR)
        out[i0:i0 + len(s)] += s[:len(out) - i0]
    return out


def tick(f=2600):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * 0.4


def thud():
    n = int(0.3 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 18) * 0.7


# ---------------------------------------------------------------- harmony
CH = [  # (piano voicing, pad voicing, bass root)
    ([62, 69, 73, 76, 78], [50, 57, 61, 64, 66], 38),   # Dmaj9
    ([59, 66, 69, 73, 74], [47, 54, 57, 61, 62], 35),   # Bm9
    ([55, 62, 66, 69, 74], [43, 50, 54, 57, 62], 31),   # Gmaj9
    ([57, 64, 66, 69, 74], [45, 52, 54, 57, 62], 33),   # A6sus
]


def chord_at(b):
    return CH[int(b // 4) % 4]


SIL0, SIL1 = TL['events']['silence']


def active(b):
    return not (SIL0 <= b < SIL1)


# ---------------------------------------------------------------- arrangement
# pads (whole piece except silence), one per bar
for bar in range(0, 20):
    b0 = bar * 4
    if b0 >= SIL0:
        break
    pv = chord_at(b0)[1]
    bright = 700 if b0 < 14 else 1500 if b0 < 48 else 2200
    dur = min(4, SIL0 - b0) * BEAT + 1.2
    place(pad(pv, dur, bright=bright, att=1.0 if b0 else 2.2), bt(b0), 0.32 if b0 < 14 else 0.6, send=0.5)

# intro: low drone + breath
place(sub(38, bt(4) + 1.0) * 0.6, 0, 0.3)
nz = lp(rs.standard_normal(int(bt(4) * SR)), 900) * np.linspace(0, 1, int(bt(4) * SR)) ** 2 * 0.08
place(nz, 0, 1.0, send=0.6)
place(shimmer(2.5, 90), bt(0.5), 0.35, send=0.8)

# piano: arpeggios 4–14, chords on bars elsewhere
for b in np.arange(4, 14, 0.5):
    pv = chord_at(b)[0]
    i = int((b - 4) * 2)
    order = [0, 2, 1, 3, 2, 4, 3, 1]
    m = pv[order[i % 8]]
    place(piano(m + 12 * (i % 8 == 5), 2.2, 0.55 + 0.1 * (i % 2 == 0)), bt(b), 0.32, pan=(order[i % 8] - 2) * 0.2, send=0.5)
place(piano(50, 4, 1.0), bt(4), 0.5, send=0.6)
for m in CH[0][0]:
    place(piano(m, 4, 0.8), bt(4) + 0.01, 0.25, send=0.6)

for bar_b in range(14, 71, 4):
    pv = chord_at(bar_b)[0]
    for k, m in enumerate(pv):
        place(piano(m, 3.0, 0.7), bt(bar_b) + k * 0.012, 0.2, pan=(k - 2) * 0.25, send=0.45)
    if 40 <= bar_b < 63:  # piano answers on the "and" of 3 in the middle sections
        place(piano(pv[-1] + 12, 1.5, 0.6), bt(bar_b + 2.5), 0.18, pan=0.3, send=0.6)

# drums
def drums(b0, b1, kick_on=True, clap_on=True, hats=True, open_hat=True, kvel=1.0):
    b = b0
    while b < b1:
        if not active(b):
            b += 1; continue
        if kick_on:
            place(kick(kvel), bt(b), 0.75)
            duck_src[int(bt(b) * SR)] = 1
        if clap_on and int(b) % 2 == 1:
            place(clap(), bt(b), 0.65, pan=0.05, send=0.25)
        if hats:
            place(hat(), bt(b + 0.5), 0.75, pan=0.3)
            if open_hat and int(b) % 4 == 3:
                place(hat(True), bt(b + 0.5), 0.35, pan=0.35)
            place(hat(), bt(b + 0.75), 0.35, pan=-0.3)
        b += 1

drums(8, 14, kick_on=True, clap_on=False, hats=False, kvel=0.55)   # heartbeat
drums(14, 40)
drums(40, 48, kick_on=False, clap_on=True, hats=True, open_hat=False)
drums(44, 48, kick_on=True, clap_on=False, hats=False, kvel=0.8)
drums(48, 63)
drums(63, 71, kick_on=True, clap_on=False, hats=True, open_hat=False, kvel=0.7)

# bass: 8th pulse from the drop
bass = np.zeros((N, 2))
for b in np.arange(14, 71, 0.5):
    if not active(b):
        continue
    if 40 <= b < 44:
        if b % 4 != 0:
            continue
        place(sub(chord_at(b)[2], bt(4) * 0.98), bt(b), 0.4, bus=bass)
        continue
    root = chord_at(b)[2]
    m = root + (12 if (b % 2 == 1.5) else 0)
    place(sub(m, BEAT * 0.48), bt(b), 0.36, bus=bass)

# plucks: 16th arps in the hologram + album sections
plk = np.zeros((N, 2))
for b in np.arange(14, 63, 0.25):
    if 40 <= b < 48 and b % 1 != 0:
        continue
    if 30 <= b < 40 and b % 0.5 != 0:
        continue
    pv = chord_at(b)[0]
    i = int(b * 4)
    patt = [0, 2, 4, 2, 1, 3, 4, 3]
    m = pv[patt[i % 8]] + 12
    place(pluck(m, 0.4, 1.0), bt(b), 0.42, pan=np.sin(i * 0.7) * 0.6, send=0.35, bus=plk)

# mechanical print rhythm
for b in np.arange(56.5, 60, 0.25):
    place(lp(tick(900), 2500), bt(b), 0.5 if b % 1 == 0 else 0.25, pan=-0.2)
    place(thud() * 0.3, bt(b), 0.5 if b % 1 == 0 else 0.25)
roll = lp(rs.standard_normal(int(bt(3.5) * SR)), 300) * 0.25
roll *= np.sin(np.linspace(0, np.pi, len(roll)))
place(roll, bt(56.5), 1.0)

# risers
for a, b in TL['events']['risers']:
    place(riser(bt(b - a)), bt(a), 0.55, send=0.5)

# impacts
place(impact(), bt(14), 0.9, send=0.4)
place(impact() * 0.7, bt(61), 0.7, send=0.5)
place(impact(), bt(72), 0.6, send=0.6)

# shutter clicks
for b in TL['events']['shutter']:
    place(shutter(), bt(b) - 0.003, 1.1, send=0.3)
for b in TL['events']['heroes']:
    place(shutter(), bt(b), 0.7, send=0.3, pan=0.1)
    place(whoosh(0.5, 600, 4000), bt(b) - 0.25, 0.5, send=0.3)

# transitions
for b, d in ((5.9, 1.0), (28.4, 1.2), (39.2, 1.0), (47.6, 1.2), (50, 1.2), (55.4, 1.0), (59.4, 0.8), (66, 1.0), (69, 1.0)):
    place(whoosh(bt(d), 400, 3500), bt(b), 0.55, pan=0, send=0.4)

# UI & story sfx
for b in TL['events']['words']['edit']:
    place(thud(), bt(b), 0.6)
    place(tick(3200), bt(b), 0.8, send=0.3)
for b in np.arange(30.8, 33.6, 0.25):
    place(tick(2200 + 300 * (int(b * 4) % 3)), bt(b), 0.25, pan=-0.4)
place(whoosh(bt(1.4), 1500, 6000), bt(33.8), 0.25, pan=0.3)       # brush
place(whoosh(bt(1.4), 800, 3000), bt(36), 0.35, pan=-0.3)         # slider
place(bell(93, 3), bt(44), 0.7, send=0.7)                          # approve "ding"
place(bell(86, 3), bt(44) + 0.04, 0.5, send=0.7)
place(shimmer(1.2, 93), bt(44.2), 0.4, send=0.8)
for b in (52.2, 52.7, 53.1, 53.4):
    place(thud(), bt(b + 0.35), 0.5)
place(shimmer(2.0, 88), bt(61), 0.6, send=0.8)
place(whoosh(bt(1.2), 2000, 7000), bt(64.8), 0.4, pan=0.3)       # ribbon
place(shimmer(1.5, 90), bt(70.4), 0.6, send=0.9)

# finale
for k, m in enumerate([38, 50, 57, 61, 64, 66, 69, 73, 78]):
    place(piano(m, 5.0, 0.95), bt(72) + k * 0.018, 0.2 if m > 45 else 0.3, pan=(k - 4) * 0.12, send=0.7)
place(pad(CH[0][1], bt(6) + 0.5, bright=1800, att=0.4, rel=2.5), bt(72), 0.6, send=0.6)
place(shimmer(3.0, 93), bt(73), 0.45, send=0.9)
place(bell(81, 4), bt(74.6), 0.35, send=0.8)

# ---------------------------------------------------------------- mix
# sidechain duck for bass, pads (in main) and plucks
dk = np.zeros(N)
idx = np.nonzero(duck_src)[0]
tt = np.arange(int(0.35 * SR)) / SR
shape = 0.55 * np.exp(-tt * 9)
for i in idx:
    n = min(len(shape), N - i)
    dk[i:i + n] = np.maximum(dk[i:i + n], shape[:n])
duck = (1 - dk)[:, None]
main[:] = main * (0.75 + 0.25 * duck)
mix = main + bass * duck + plk * duck

# reverb
ir_len = int(2.8 * SR)
t = np.arange(ir_len) / SR
irs = []
for ch in range(2):
    ir = rs.standard_normal(ir_len) * np.exp(-t * 2.4)
    ir = lp(ir, 5500)
    ir[: int(0.012 * SR)] = 0
    irs.append(ir / np.sqrt(np.sum(ir ** 2)))
wet = np.stack([fftconvolve(hp(verb[:, c], 250), irs[c])[:N] for c in range(2)], 1)
mix = mix + wet * 0.55

# hard silence window for the dramatic pause, with tiny fades
s0, s1 = int(bt(SIL0) * SR), int(bt(SIL1) * SR) - int(0.01 * SR)
f = int(0.03 * SR)
mix[s0 - f:s0] *= np.linspace(1, 0, f)[:, None]
mix[s0:s1] *= 0.02
# re-place the downbeat after the pause so it hits clean
mix[s1:s1 + f] *= np.linspace(0, 1, f)[:, None]

# master: gentle glue + soft clip + normalise
mix = np.tanh(mix * 0.9) / 0.9
peak = np.max(np.abs(mix))
mix = mix / peak * 0.89
fo = int(1.2 * SR)
mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]

os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
import wave
path = os.path.join(ROOT, 'out', 'music.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print(path, f'{len(mix) / SR:.2f}s')
