"""Original score + sound design for the Hani Cohen promo.

100 BPM (beat = 0.6s, bar = 2.4s), key of A-flat major.
Every hit lines up with an event in src/timeline.js.
Pure numpy synthesis -> out/music.wav (44.1 kHz stereo).
"""
import numpy as np
import wave
import sys

SR = 44100
END = 49.2
N = int(SR * (END + 0.05))
BEAT = 0.6
BAR = 2.4
rng = np.random.default_rng(7)

buses = {k: np.zeros((2, N)) for k in ('music', 'drums', 'fx')}
sends = np.zeros((2, N))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def tt(n):
    return np.arange(n) / SR


def place(sig, t0, bus='music', gain=1.0, pan=0.0, verb=0.15):
    """sig: mono (n,) or stereo (2, n)."""
    i = int(round(t0 * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    if i < 0:
        sig = sig[:, -i:]
        i = 0
    n = min(sig.shape[1], N - i)
    buses[bus][:, i:i + n] += sig[:, :n] * gain
    sends[:, i:i + n] += sig[:, :n] * gain * verb


def fft_filter(x, lo=None, hi=None, slope=2.0):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    h = np.ones_like(f)
    if hi:
        h *= 1 / np.sqrt(1 + (f / hi) ** (2 * slope))
    if lo:
        h *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** (2 * slope))
    return np.fft.irfft(X * h, len(x))


def sweep_lp(x, f0, f1):
    """time-varying one-pole lowpass (exponential cutoff sweep)."""
    n = len(x)
    fc = f0 * (f1 / f0) ** (np.arange(n) / n)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty(n)
    s = 0.0
    for i in range(n):
        s = a[i] * s + (1 - a[i]) * x[i]
        y[i] = s
    return y


def fade(sig, fin=0.005, fout=0.05):
    n = sig.shape[-1]
    e = np.ones(n)
    a = min(n, int(fin * SR)); b = min(n, int(fout * SR))
    if a: e[:a] = np.linspace(0, 1, a)
    if b: e[-b:] *= np.linspace(1, 0, b)
    return sig * e


# ---------------- instruments ----------------
def piano(m, dur=1.2, vel=0.6, bright=1.0):
    f = mtof(m)
    n = int((dur + 1.8) * SR)
    t = tt(n)
    sig = np.zeros(n)
    B = 0.00012
    for k in range(1, 13):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        amp = (1 / k ** 1.25) * (bright ** (k - 1)) * (0.6 + 0.4 * np.exp(-k * 0.3))
        dec = 0.55 + 0.32 * k + f / 900
        sig += amp * np.exp(-t * dec) * np.sin(2 * np.pi * fk * t + rng.random() * 6.28)
    ham = fft_filter(rng.standard_normal(int(0.012 * SR)), lo=1500, hi=7000) * np.exp(-tt(int(0.012 * SR)) * 300)
    sig[:len(ham)] += ham * 0.15
    rel = np.ones(n)
    rs = int(dur * SR)
    if rs < n:
        rel[rs:] = np.exp(-tt(n - rs) * 6)
    return fade(sig * rel * vel * 0.35, 0.002, 0.05)


def pad(notes, dur, att=0.8, rel=1.2, bright=2600, det=0.11):
    n = int((dur + rel) * SR)
    t = tt(n)
    out = np.zeros((2, n))
    for m in notes:
        f0 = mtof(m)
        for ch in range(2):
            for d in (-det, 0.0, det):
                f = f0 * 2 ** ((d + (0.03 if ch else -0.03)) / 12)
                ph = rng.random() * 6.28
                for k in range(1, 17):
                    fk = f * k
                    if fk > 9000:
                        break
                    amp = (1 / k) * np.exp(-fk / bright)
                    out[ch] += amp * np.sin(2 * np.pi * fk * t + ph * k)
    e = np.minimum(1, t / att)
    e = e * np.where(t > dur, np.exp(-(t - dur) * 4 / rel), 1)
    lfo = 1 + 0.06 * np.sin(2 * np.pi * 0.35 * t)
    return out * e * lfo * 0.045 / max(1, len(notes) ** 0.5)


def pluck(m, vel=0.5, dec=6.0, bright=0.7):
    f = mtof(m)
    n = int(0.9 * SR)
    t = tt(n)
    sig = np.zeros(n)
    for k in range(1, 16):
        fk = f * k
        if fk > 11000:
            break
        sig += (bright ** k / k) * np.exp(-t * (dec + k * 2.2)) * np.sin(2 * np.pi * fk * t)
    return fade(sig * vel * 0.5, 0.001, 0.05)


def bass(m, dur, vel=0.7):
    f = mtof(m)
    n = int((dur + 0.08) * SR)
    t = tt(n)
    sig = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / 0.006) * (0.75 + 0.25 * np.exp(-t * 8))
    e[int(dur * SR):] *= np.linspace(1, 0, n - int(dur * SR))
    return np.tanh(sig * e * 1.4) * vel * 0.32


def kick(vel=1.0, punch=1.0):
    n = int(0.55 * SR)
    t = tt(n)
    f = 44 + 95 * np.exp(-t * 32) * punch
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) * np.exp(-t * 5.5)
    click = fft_filter(rng.standard_normal(n), lo=2000, hi=8000) * np.exp(-t * 400) * 0.25
    return np.tanh((sig + click) * 1.6) * vel * 0.55


def clap(vel=0.6):
    n = int(0.4 * SR)
    t = tt(n)
    noise = fft_filter(rng.standard_normal(n), lo=900, hi=6000)
    e = np.zeros(n)
    for d in (0, 0.009, 0.018):
        e += np.where(t >= d, np.exp(-(t - d) * 120), 0)
    e += np.where(t >= 0.025, np.exp(-(t - 0.025) * 16), 0) * 0.5
    return noise * e * vel * 0.18


def snap(vel=0.5):
    n = int(0.15 * SR)
    t = tt(n)
    return fft_filter(rng.standard_normal(n), lo=1800, hi=5000) * np.exp(-t * 70) * vel * 0.25


def hat(vel=0.3, open_=False):
    n = int((0.35 if open_ else 0.08) * SR)
    t = tt(n)
    return fft_filter(rng.standard_normal(n), lo=7000) * np.exp(-t * (14 if open_ else 70)) * vel * 0.2


def shaker(vel=0.25):
    n = int(0.12 * SR)
    t = tt(n)
    e = np.minimum(1, t / 0.015) * np.exp(-t * 35)
    return fft_filter(rng.standard_normal(n), lo=4000, hi=11000) * e * vel * 0.2


def bell(m, dur=1.5, vel=0.4, ratio=3.5, index=2.0):
    f = mtof(m)
    n = int(dur * SR)
    t = tt(n)
    I = index * np.exp(-t * 3)
    sig = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t))
    sig += 0.3 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 4)
    return fade(sig * np.exp(-t * (3.0 / dur * 1.5)) * vel * 0.22, 0.001, 0.05)


def noise_swell(dur, f0=300, f1=9000, curve=2.0, reverse=False):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    y = sweep_lp(x, f0, f1)
    y = fft_filter(y, lo=150)
    e = (np.arange(n) / n) ** curve
    y = y * e
    if reverse:
        y = y[::-1]
    return y / (np.abs(y).max() + 1e-9)


def whoosh(dur=0.7, f0=400, f1=5000, vel=0.5):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    up = sweep_lp(x, f0, f1)
    k = np.arange(n) / n
    e = np.sin(np.pi * k) ** 1.6
    y = fft_filter(up * e, lo=200)
    y /= np.abs(y).max() + 1e-9
    pan = np.linspace(-0.7, 0.7, n)
    a = (pan + 1) * np.pi / 4
    return np.vstack([y * np.cos(a), y * np.sin(a)]) * vel * 0.35


def riser(dur, m0=56, m1=80, vel=0.5):
    n = int(dur * SR)
    t = tt(n)
    k = t / dur
    f = mtof(m0) * (mtof(m1) / mtof(m0)) ** (k ** 1.6)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + 0.4 * np.sin(2 * ph + 0.5) + 0.2 * np.sin(3 * ph)) * k ** 2.2 * 0.18
    nz = noise_swell(dur, 200, 12000, 2.4) * 0.22
    return (tone + nz) * vel


def impact(vel=1.0, crash=0.7, boom=1.0):
    n = int(2.6 * SR)
    t = tt(n)
    f = 30 + 40 * np.exp(-t * 6)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * boom
    cr = fft_filter(rng.standard_normal(n), lo=3500, hi=14000) * np.exp(-t * 2.0) * crash * 0.35
    hit = fft_filter(rng.standard_normal(n), lo=200, hi=3000) * np.exp(-t * 30) * 0.5
    return np.tanh((sub * 0.8 + cr + hit) * 1.2) * vel * 0.6


def shutter(vel=1.0):
    n = int(0.35 * SR)
    t = tt(n)
    out = np.zeros(n)
    for d, a in ((0.0, 1.0), (0.048, 0.7)):
        i = int(d * SR)
        m = n - i
        tl = tt(m)
        b = fft_filter(rng.standard_normal(m), lo=1500, hi=9000) * np.exp(-tl * 260)
        ping = np.sin(2 * np.pi * 3150 * tl) * np.exp(-tl * 90) * 0.4 + np.sin(2 * np.pi * 5200 * tl) * np.exp(-tl * 140) * 0.2
        thump = np.sin(2 * np.pi * 95 * tl) * np.exp(-tl * 40) * 0.6
        out[i:] += (b + ping + thump) * a
    return out * vel * 0.5


def tick(hi=True, vel=0.25):
    n = int(0.05 * SR)
    t = tt(n)
    f = 2600 if hi else 1900
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 160) + fft_filter(rng.standard_normal(n), lo=3000) * np.exp(-t * 500) * 0.4) * vel


def keyclick(vel=0.2):
    n = int(0.04 * SR)
    t = tt(n)
    return fft_filter(rng.standard_normal(n), lo=2500, hi=9000) * np.exp(-t * 220) * vel


def pop(vel=0.5):
    n = int(0.25 * SR)
    t = tt(n)
    f = 380 + 700 * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * vel * 0.4


def thud(vel=0.6):
    n = int(0.5 * SR)
    t = tt(n)
    f = 60 + 50 * np.exp(-t * 25)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    s += fft_filter(rng.standard_normal(n), hi=900) * np.exp(-t * 35) * 0.5
    return s * vel * 0.5


def clang(vel=0.5):
    n = int(1.6 * SR)
    t = tt(n)
    s = np.zeros(n)
    for fr, a, d in ((523, 1, 2.5), (1187, 0.6, 3.5), (1873, 0.4, 5), (2953, 0.3, 7), (4211, 0.2, 9)):
        s += a * np.sin(2 * np.pi * fr * t) * np.exp(-t * d)
    return s * vel * 0.12


PENTA = [68, 70, 72, 75, 77, 80, 82, 84, 87, 89, 92, 94, 96]  # A-flat major pentatonic, high


def sparkle(t0, dur=0.6, count=10, vel=0.35, lo=4, rise=True, pan_sweep=True):
    for i in range(count):
        k = i / max(1, count - 1)
        idx = lo + int((k if rise else rng.random()) * (len(PENTA) - lo - 1))
        place(bell(PENTA[idx], 1.2, vel * (0.6 + 0.4 * rng.random()), ratio=2.0, index=1.2), t0 + k * dur, 'fx', pan=(k * 1.4 - 0.7) if pan_sweep else 0, verb=0.5)


# ---------------- harmony ----------------
CHORDS = {
    'Fm': ([53, 56, 60, 63], 41),
    'Db': ([49, 53, 56, 60], 37),
    'Ab': ([56, 60, 63, 70], 44),
    'Eb': ([51, 55, 58, 65], 39),
}
PROG = ['Fm', 'Db', 'Ab', 'Eb']


def chord_at_bar(b):
    return CHORDS[PROG[b % 4]]


NBARS = int(np.ceil(END / BAR)) + 1


def bar_t(b, beat=0.0):
    return b * BAR + beat * BEAT


# pads through the whole piece with section dynamics
def pad_level(t):
    if t < 3.6: return 0.8
    if t < 9.6: return 0.9
    if t < 16.8: return 1.0
    if t < 22.8: return 0.85
    if t < 27.6: return 0.9
    if t < 33.6: return 0.9
    if t < 38.4: return 0.8
    if t < 41.4: return 1.1
    if t < 43.2: return 1.25
    return 1.0


for b in range(NBARS):
    t0 = bar_t(b)
    if t0 >= END:
        break
    notes, root = chord_at_bar(b)
    if b == 20:
        notes = CHORDS['Ab'][0]
    br = 1400 if t0 < 3.6 else 2600 if t0 < 9.6 else 3400
    dur = BAR + (1.6 if b == 20 else 0.1)
    place(pad(notes + [notes[0] - 12], dur, att=0.5 if b else 1.4, rel=1.0, bright=br), t0, 'music', gain=pad_level(t0 + 0.1), verb=0.35)

# ---------------- 01 intro (0 - 3.6) ----------------
for i in range(6):
    place(tick(i % 2 == 0, 0.18 + i * 0.02), i * BEAT, 'fx', pan=0.3 if i % 2 else -0.3, verb=0.3)
intro = [(0.3, 72, 0.45), (0.9, 75, 0.4), (1.5, 77, 0.45), (2.1, 72, 0.35), (2.7, 77, 0.45), (3.0, 80, 0.4), (3.3, 84, 0.5)]
for t0, m, v in intro:
    place(piano(m, 1.4, v, bright=0.85), t0, 'music', pan=0.15, verb=0.45)
place(noise_swell(1.25, 300, 12000, 3.0) * 0.18, 3.6 - 1.25, 'fx', verb=0.3)
place(riser(1.2, 60, 84, 0.35), 2.4, 'fx', verb=0.3)

# ---------------- click ----------------
place(shutter(1.2), 3.6, 'fx', verb=0.25)
place(impact(0.65, crash=0.35, boom=0.9), 3.6, 'fx', verb=0.3)


def groove(t_from, t_to, style):
    """drums + bass + plucks on the beat grid between t_from and t_to."""
    b0 = int(round(t_from / BEAT))
    b1 = int(round(t_to / BEAT))
    for b in range(b0, b1):
        tb = b * BEAT
        bar = int(tb // BAR + 1e-6)
        beat_in_bar = b % 4
        notes, root = chord_at_bar(bar)
        if style in ('A', 'B', 'drop', 'print', 'cta'):
            if beat_in_bar in (0, 2) or style == 'print':
                place(kick(0.95 if beat_in_bar == 0 else 0.85), tb, 'drums', verb=0.05)
            if style in ('drop', 'B', 'cta') and beat_in_bar == 1:
                place(kick(0.55, 0.7), tb + BEAT * 0.75, 'drums', verb=0.05)
            if beat_in_bar in (1, 3) and (style != 'A' or tb >= 4.8):
                place(clap(0.75 if style != 'A' else 0.55), tb, 'drums', pan=0.05, verb=0.25)
            for s in range(4 if style in ('drop', 'print') else 2):
                ts = tb + s * BEAT / (4 if style in ('drop', 'print') else 2)
                accent = 1.0 if s % 2 else 0.6
                place(hat(0.35 * accent if style != 'A' else 0.2 * accent), ts, 'drums', pan=0.35, verb=0.05)
            if style in ('drop', 'print'):
                place(hat(0.22, True), tb + BEAT / 2, 'drums', pan=-0.3, verb=0.1)
            place(shaker(0.25), tb + BEAT * 0.5, 'drums', pan=-0.45, verb=0.1)
            # bass
            if style in ('drop', 'print'):
                for s in range(2):
                    m = root + (12 if s == 1 else 0)
                    place(bass(m, BEAT / 2 - 0.03, 0.75), tb + s * BEAT / 2, 'music', verb=0.0)
            else:
                if beat_in_bar in (0, 2):
                    place(bass(root, BEAT * 1.9, 0.7), tb, 'music', verb=0.0)
            # plucked arpeggio
            arp = notes + [n + 12 for n in notes]
            steps = 4 if style in ('drop', 'print') else 2
            for s in range(steps):
                idx = (b * steps + s) % len(arp)
                place(pluck(arp[idx] + 12, 0.32 if style == 'A' else 0.42, dec=7, bright=0.75), tb + s * BEAT / steps, 'music', pan=(0.4 if s % 2 else -0.4), verb=0.3)
        elif style == 'edit':
            if beat_in_bar == 0:
                place(kick(0.75), tb, 'drums', verb=0.05)
            if beat_in_bar == 2:
                place(snap(0.7), tb, 'drums', pan=0.1, verb=0.35)
            place(hat(0.16), tb + BEAT / 2, 'drums', pan=0.4, verb=0.05)
            if beat_in_bar in (0, 2):
                place(bass(root, BEAT * 1.9, 0.5), tb, 'music', verb=0.0)
            arp = notes + [n + 12 for n in notes]
            for s in range(2):
                place(pluck(arp[(b * 2 + s) % len(arp)] + 12, 0.3, dec=5, bright=0.7), tb + s * BEAT / 2, 'music', pan=(0.35 if s else -0.35), verb=0.4)
        elif style == 'phone':
            if beat_in_bar in (1, 3):
                place(snap(0.55), tb, 'drums', pan=-0.1, verb=0.35)
            place(shaker(0.18), tb + BEAT / 2, 'drums', pan=0.4, verb=0.1)
            if beat_in_bar == 0:
                place(bass(root, BEAT * 3.8, 0.45), tb, 'music', verb=0.0)
        elif style == 'map':
            place(hat(0.18), tb + BEAT / 2, 'drums', pan=0.3, verb=0.1)
            if beat_in_bar == 0:
                place(kick(0.6), tb, 'drums', verb=0.05)
                place(bass(root, BEAT * 3.8, 0.5), tb, 'music', verb=0.0)
            arp = notes + [n + 12 for n in notes] + [n + 24 for n in notes[:2]]
            for s in range(4):
                place(pluck(arp[(b * 4 + s) % len(arp)] + 12, 0.25, dec=4, bright=0.65), tb + s * BEAT / 4, 'music', pan=np.sin(b + s), verb=0.5)


def chord_stabs(t_from, t_to, vel=0.4):
    for b in range(int(round(t_from / BAR)), int(round(t_to / BAR)) + 1):
        tb = b * BAR
        notes, _ = chord_at_bar(b)
        for off in (0.0, 1.5):
            ts = tb + off * BEAT
            if t_from - 1e-6 <= ts < t_to:
                for m in notes:
                    place(piano(m + 12, 0.5, vel * (1 if off == 0 else 0.7), bright=0.8), ts, 'music', pan=-0.1, verb=0.35)


# ---------------- 02 orbit (3.6 - 8.4) + build ----------------
groove(3.6, 8.4, 'A')
chord_stabs(3.6, 8.4, 0.35)
# build into the drop
for i, tb in enumerate(np.arange(8.4, 9.45, BEAT / 4)):
    place(snap(0.25 + i * 0.04), tb, 'drums', pan=0.0, verb=0.2)
for tb in np.arange(9.0, 9.45, BEAT / 8):
    place(snap(0.6), tb, 'drums', verb=0.2)
place(riser(1.2, 56, 92, 0.6), 8.4, 'fx', verb=0.35)
place(kick(0.9), 8.4, 'drums')
place(kick(0.9), 9.0, 'drums')

# ---------------- 03 drop / hologram (9.6 - 16.8) ----------------
place(impact(1.0, crash=0.9, boom=1.1), 9.6, 'fx', verb=0.35)
sparkle(9.62, 0.5, 9, 0.3)
groove(9.6, 15.6, 'drop')
for f in (10.8, 11.7, 12.6, 13.5, 14.4):
    place(whoosh(0.3, 800, 7000, 0.6), f - 0.25, 'fx', verb=0.2)
    notes, _ = chord_at_bar(int(f // BAR))
    for m in notes:
        place(pluck(m + 24, 0.32, dec=3, bright=0.85), f, 'fx', verb=0.4)
    place(bell(notes[-1] + 24, 1.0, 0.35, ratio=2.0, index=1.5), f, 'fx', verb=0.5)
    place(impact(0.25, crash=0.4, boom=0.3), f, 'fx', verb=0.2)
# hero approach: hats only + riser, reverse swell into the match cut
groove(15.6, 16.8, 'map')
place(riser(1.2, 68, 87, 0.35), 15.6, 'fx', verb=0.4)
place(noise_swell(0.8, 400, 10000, 3.0) * 0.18, 16.0, 'fx', verb=0.3)

# ---------------- 04 editing (16.8 - 22.8) ----------------
place(impact(0.4, crash=0.45, boom=0.6), 16.8, 'fx', verb=0.4)
place(tick(True, 0.35), 16.8, 'fx')
groove(16.8, 21.6, 'edit')
chord_stabs(16.8, 21.6, 0.28)
kc = np.random.default_rng(3)
for tb in np.arange(17.4, 20.1, BEAT / 4):
    if kc.random() < 0.7:
        place(keyclick(0.12 + kc.random() * 0.1), tb + kc.random() * 0.02, 'fx', pan=kc.random() - 0.5, verb=0.1)
place(whoosh(1.5, 300, 4000, 0.45), 18.05, 'fx', verb=0.3)
sparkle(19.35, 1.1, 12, 0.18, lo=6, rise=False)
place(bell(84, 1.4, 0.35, ratio=2.0, index=1.0), 20.25, 'fx', verb=0.5)
place(bell(91, 1.4, 0.25, ratio=2.0, index=1.0), 20.4, 'fx', verb=0.5)
# upload arpeggio + riser
for i, m in enumerate([68, 72, 75, 80, 84, 87, 92, 96]):
    place(pluck(m, 0.3, dec=5, bright=0.8), 21.75 + i * BEAT / 4, 'fx', pan=-0.5 + i * 0.14, verb=0.4)
place(riser(1.0, 70, 90, 0.3), 21.8, 'fx', verb=0.4)
place(whoosh(0.5, 1000, 9000, 0.5), 22.45, 'fx', verb=0.3)

# ---------------- 05 phone (22.8 - 27.6) ----------------
groove(22.8, 27.6, 'phone')
place(bell(87, 1.2, 0.4, ratio=2.0, index=0.8), 23.0, 'fx', pan=0.1, verb=0.4)
place(bell(92, 1.4, 0.4, ratio=2.0, index=0.8), 23.12, 'fx', pan=0.1, verb=0.4)
place(tick(True, 0.3), 23.55, 'fx')
place(whoosh(0.4, 600, 5000, 0.35), 23.6, 'fx', verb=0.2)
for i, tp in enumerate([24.3, 24.75, 25.2, 25.65, 26.1]):
    place(pop(0.6), tp, 'fx', pan=-0.3 + i * 0.15, verb=0.2)
    place(bell(PENTA[5 + i], 0.8, 0.3, ratio=2.0, index=1.0), tp + 0.02, 'fx', pan=-0.3 + i * 0.15, verb=0.45)
for m in [79, 80, 84]:
    pass
# piano melody on top (soft)
for t0, m in [(22.9, 77), (23.5, 80), (24.0, 79), (24.6, 80), (25.2, 84), (25.8, 82), (26.4, 80)]:
    place(piano(m, 0.9, 0.3, 0.8), t0, 'music', pan=0.2, verb=0.45)
# approval chime
for i, m in enumerate([68, 72, 75, 80, 84]):
    place(bell(m + 12, 1.6, 0.35, ratio=2.0, index=1.2), 26.45 + i * 0.06, 'fx', pan=-0.4 + i * 0.2, verb=0.5)
for i in range(5):
    place(whoosh(0.55, 500, 6000, 0.3), 26.95 + i * 0.12, 'fx', verb=0.25)

# ---------------- 06 album (27.6 - 33.6) ----------------
place(impact(0.3, crash=0.4, boom=0.5), 27.6, 'fx', verb=0.3)
groove(27.6, 32.4, 'B')
chord_stabs(27.6, 31.2, 0.3)
for i in range(5):
    place(thud(0.45), 28.55 + i * 0.18, 'fx', pan=-0.3 + i * 0.15, verb=0.2)
    place(tick(i % 2 == 0, 0.15), 28.55 + i * 0.18, 'fx', verb=0.2)
place(whoosh(1.0, 300, 2500, 0.4), 30.7, 'fx', verb=0.3)
place(thud(0.9), 31.7, 'fx', verb=0.3)
sparkle(31.75, 0.9, 10, 0.22)
place(whoosh(1.2, 600, 8000, 0.45), 32.2, 'fx', verb=0.35)
groove(32.4, 33.0, 'phone')
place(thud(0.7), 33.0, 'fx', verb=0.2)
place(clang(0.4), 33.0, 'fx', verb=0.4)
for i, m in enumerate([80, 84, 87]):
    place(bell(m, 1.2, 0.3, ratio=2.0, index=1.0), 33.2 + i * 0.07, 'fx', verb=0.5)
place(riser(0.6, 70, 94, 0.45), 33.0, 'fx', verb=0.3)
place(noise_swell(0.4, 500, 12000, 2.0) * 0.25, 33.2, 'fx', verb=0.2)

# ---------------- 07 print (33.6 - 38.4) ----------------
place(impact(0.85, crash=0.8, boom=1.0), 33.6, 'fx', verb=0.3)
groove(33.6, 38.4, 'print')
for tb in np.arange(33.6, 35.9, BEAT / 2):
    place(clang(0.12), tb + BEAT / 4, 'drums', pan=0.6 if int(tb / BEAT * 2) % 2 else -0.6, verb=0.15)
place(whoosh(0.6, 300, 3000, 0.4), 35.4, 'fx', verb=0.2)
place(impact(1.0, crash=0.9, boom=1.2), 35.95, 'fx', verb=0.35)
place(clang(1.0), 35.95, 'fx', verb=0.5)
sparkle(36.0, 0.8, 12, 0.25)
place(whoosh(0.5, 300, 3000, 0.4), 36.7, 'fx', verb=0.2)
place(thud(0.8), 37.65, 'fx', verb=0.25)
for i, m in enumerate([68, 70, 72, 75, 77, 80, 82, 84, 87, 89, 92]):
    place(pluck(m, 0.25, dec=4, bright=0.8), 37.85 + i * 0.03, 'fx', pan=-0.6 + i * 0.12, verb=0.5)

# ---------------- 08 delivery (38.4 - 41.4) ----------------
place(whoosh(1.2, 200, 3000, 0.4), 38.4, 'fx', verb=0.4)
groove(38.4, 40.2, 'map')
place(whoosh(1.4, 400, 5000, 0.35), 39.0, 'fx', verb=0.4)
# doorstep build: heartbeat + riser
for tb in (40.2, 40.5, 40.8, 41.1):
    place(kick(0.55, 0.6), tb, 'drums', verb=0.1)
    place(kick(0.4, 0.6), tb + 0.15, 'drums', verb=0.1)
place(riser(1.2, 63, 87, 0.45), 40.2, 'fx', verb=0.4)
place(noise_swell(0.7, 500, 12000, 3.0) * 0.25, 40.75, 'fx', verb=0.4)

# ---------------- break: home (41.4 - 43.2) ----------------
place(impact(0.45, crash=0.7, boom=0.4), T_HOME := 41.4, 'fx', verb=0.6)
sparkle(41.42, 1.2, 14, 0.25)
for t0, m, v in [(41.45, 72, 0.5), (41.75, 77, 0.55), (42.05, 80, 0.45), (42.35, 84, 0.5), (42.65, 82, 0.45), (42.95, 80, 0.4)]:
    place(piano(m, 1.2, v, 0.85), t0, 'music', pan=0.1, verb=0.55)
for m in [49, 56, 60, 65]:
    place(piano(m, 1.6, 0.35, 0.8), 41.45, 'music', pan=-0.15, verb=0.55)
place(noise_swell(0.6, 400, 12000, 3.0) * 0.25, 42.6, 'fx', verb=0.4)

# ---------------- 09 CTA (43.2 - 49.2) ----------------
place(impact(0.5, crash=0.6, boom=0.6), 43.2, 'fx', verb=0.5)
sparkle(43.22, 0.7, 10, 0.25)
for t0, m, v in [(43.3, 80, 0.5), (43.9, 84, 0.45), (44.5, 82, 0.45), (45.1, 80, 0.45), (45.5, 87, 0.5), (46.1, 84, 0.45), (46.7, 82, 0.45)]:
    place(piano(m, 1.1, v, 0.85), t0, 'music', pan=0.1, verb=0.5)
groove(44.4, 47.4, 'cta')
chord_stabs(44.4, 47.4, 0.28)
sparkle(45.5, 0.9, 12, 0.3)
place(pop(0.5), 46.4, 'fx', verb=0.3)
place(bell(92, 1.2, 0.3, ratio=2.0, index=1.0), 46.42, 'fx', verb=0.5)
place(noise_swell(0.5, 500, 12000, 3.0) * 0.25, 46.9, 'fx', verb=0.3)
place(shutter(1.2), 47.4, 'fx', verb=0.3)
place(impact(0.9, crash=0.8, boom=1.1), 47.4, 'fx', verb=0.45)
sparkle(47.42, 0.9, 12, 0.3)
for m in [44, 56, 63, 68, 72, 75, 80]:
    place(piano(m, 1.8, 0.4 if m > 50 else 0.5, 0.85), 47.4, 'music', verb=0.55)
place(bass(32, 1.8, 0.6), 47.4, 'music', verb=0.0)

# ---------------- mix ----------------
t_all = tt(N)
# sidechain ducking of the music bus by the kick (approximate from drum energy)
dr = np.abs(buses['drums']).sum(0)
lowkick = fft_filter(buses['drums'].sum(0), hi=150)
envk = np.abs(lowkick)
win = int(0.01 * SR)
envk = np.convolve(envk, np.ones(win) / win, mode='same')
envk = envk / (envk.max() + 1e-9)
# smooth release
duck = np.empty(N)
s = 0.0
a_rel = np.exp(-1 / (0.12 * SR))
for i in range(0, N, 32):
    v = envk[i]
    s = max(v, s * a_rel ** 32)
    duck[i:i + 32] = s
duck = 1 - 0.45 * np.clip(duck * 1.6, 0, 1)
music = buses['music'] * duck

# reverb: stereo exponentially decaying noise, lowpassed
ir_len = int(2.6 * SR)
ti = tt(ir_len)
ir = np.vstack([rng.standard_normal(ir_len), rng.standard_normal(ir_len)]) * np.exp(-ti * 6.9 / 2.4)
ir = np.vstack([fft_filter(ir[0], lo=200, hi=6500), fft_filter(ir[1], lo=200, hi=6500)])
ir[:, :int(0.02 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(1, keepdims=True))
L = 1 << int(np.ceil(np.log2(N + ir_len)))
wet = np.vstack([np.fft.irfft(np.fft.rfft(sends[c], L) * np.fft.rfft(ir[c], L), L)[:N] for c in range(2)])

mix = music * 1.0 + buses['drums'] * 0.9 + buses['fx'] * 0.85 + wet * 0.55
# gentle glue: high shelf for air, tanh soft clip, normalize
mix = np.vstack([fft_filter(mix[c], lo=28) for c in range(2)])
peak = np.abs(mix).max()
mix = mix / peak * 1.25
mix = np.tanh(mix)
mix = mix / np.abs(mix).max() * 0.93
# fade in/out
fi = int(0.02 * SR)
mix[:, :fi] *= np.linspace(0, 1, fi)
fo = int(0.9 * SR)
mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5

out = sys.argv[1] if len(sys.argv) > 1 else 'out/music.wav'
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

# loudness report per section
for a, b in [(0, 3.6), (3.6, 9.6), (9.6, 16.8), (16.8, 22.8), (22.8, 27.6), (27.6, 33.6), (33.6, 38.4), (38.4, 41.4), (41.4, 43.2), (43.2, 49.2)]:
    seg = mix[:, int(a * SR):int(b * SR)]
    print(f'{a:5.1f}-{b:5.1f}  rms {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9):6.1f} dBFS')
print('wrote', out)
