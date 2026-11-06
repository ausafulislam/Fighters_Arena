"""Original soundtrack composer for FIGHTER'S ARENA - "Moonlit Duel".

An 80-second, loopable cinematic arcade fighting-game theme rendered entirely
from synthesis (no samples, no third-party audio). D Hirajoshi scale, taiko
ensembles, sub bass, koto plucks, shakuhachi leads, detuned pads, FM bells and
a square-wave arcade lead. Outputs a WAV master plus OGG/MP3 game assets.
"""

from __future__ import annotations

import functools
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
OUTDIR = ROOT / "public" / "assets" / "audio" / "music"
WORK = ROOT / "assets_work" / "audio_work"
OUTDIR.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)

SR = 44100
BPM = 96.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 32
LENGTH = BARS * BAR
N = int(LENGTH * SR)
RNG = np.random.default_rng(20261102)

# D Hirajoshi (1, 2, b3, 5, b6) - dark, unmistakably Japanese.
N = int(LENGTH * SR)
H = {
    "D1": 36.71, "D2": 73.42, "E2": 82.41, "F2": 87.31, "G2": 98.00,
    "A2": 110.00, "Bb2": 116.54, "C3": 130.81, "D3": 146.83, "E3": 164.81,
    "F3": 174.61, "G3": 196.00, "A3": 220.00, "Bb3": 233.08, "C4": 261.63,
    "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00,
    "Bb4": 466.16, "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46,
    "A5": 880.00, "Bb5": 932.33, "D6": 1174.66,
}


def lp(x: np.ndarray, cutoff: float) -> np.ndarray:
    return sosfilt(butter(2, min(cutoff, 20000) / (SR / 2), btype="low", output="sos"), x)


def hp(x: np.ndarray, cutoff: float) -> np.ndarray:
    return sosfilt(butter(2, max(cutoff, 20) / (SR / 2), btype="high", output="sos"), x)


def tarr(dur: float) -> np.ndarray:
    return np.arange(max(1, int(dur * SR)), dtype=np.float32) / SR


@functools.lru_cache(maxsize=256)
def kick(dur: float = 0.48) -> np.ndarray:
    t = tarr(dur)
    f = 46 + 105 * np.exp(-t * 40)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10.5)
    click = RNG.normal(0, 1, len(t)) * np.exp(-t * 220) * 0.14
    return (body * 0.95 + click).astype(np.float32)


@functools.lru_cache(maxsize=256)
def taiko(dur: float = 0.75, deep: float = 0.0) -> np.ndarray:
    t = tarr(dur)
    f = (62 if deep else 78) + (110 if deep else 145) * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (6.5 if deep else 8.5))
    stick = lp(RNG.normal(0, 1, len(t)), 1400) * np.exp(-t * 42) * 0.55
    skin = lp(RNG.normal(0, 1, len(t)), 420) * np.exp(-t * 15) * 0.28
    return (body * 0.9 + stick + skin).astype(np.float32)


@functools.lru_cache(maxsize=256)
def snare(dur: float = 0.28) -> np.ndarray:
    t = tarr(dur)
    noise = hp(RNG.normal(0, 1, len(t)), 1200) * np.exp(-t * 24)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30) * 0.35
    return (noise * 0.45 + tone).astype(np.float32)


@functools.lru_cache(maxsize=256)
def hat(dur: float = 0.09, open_: int = 0) -> np.ndarray:
    d = dur * (2.6 if open_ else 1.0)
    t = tarr(d)
    x = hp(RNG.normal(0, 1, len(t)), 6500) * np.exp(-t * (18 if open_ else 62))
    return (x * 0.28).astype(np.float32)


@functools.lru_cache(maxsize=256)
def shaker(dur: float = 0.14) -> np.ndarray:
    t = tarr(dur)
    x = hp(RNG.normal(0, 1, len(t)), 3200) * (1 - np.exp(-t * 900)) * np.exp(-t * 34)
    return (x * 0.20).astype(np.float32)


@functools.lru_cache(maxsize=512)
def bass(freq: float, dur: float) -> np.ndarray:
    t = tarr(dur)
    ph = 2 * np.pi * freq * t
    sig = np.sin(ph) * 0.9 + np.sin(2 * ph) * 0.16 + np.sin(3 * ph) * 0.06
    sig += np.sin(ph * 0.5) * 0.12  # sub octave
    env = (1 - np.exp(-t * 70)) * np.exp(-t * 1.1)
    env *= np.clip((dur - t) / 0.05, 0, 1)
    return (sig * env * 0.72).astype(np.float32)


@functools.lru_cache(maxsize=512)
def koto(freq: float, dur: float) -> np.ndarray:
    """Additive plucked string (koto / shamisen flavour)."""
    t = tarr(dur)
    sig = np.zeros(len(t), dtype=np.float64)
    for h in range(1, 11):
        a = 1.0 / (h ** 1.32)
        decay = 2.0 + h * 0.62
        sig += a * np.sin(2 * np.pi * freq * h * t + h * 0.31) * np.exp(-t * decay)
    pluck = lp(RNG.normal(0, 1, len(t)), 4200) * np.exp(-t * 190) * 0.5
    env = np.clip((dur - t) / 0.04, 0, 1)
    return ((sig * 0.30 + pluck) * env * 1.15).astype(np.float32)


@functools.lru_cache(maxsize=256)
def shakuhachi(freq: float, dur: float) -> np.ndarray:
    t = tarr(dur)
    vib = 1 + 0.007 * np.sin(2 * np.pi * 5.1 * t) * np.clip(t / 0.25, 0, 1)
    phase = 2 * np.pi * np.cumsum(freq * vib) / SR
    tone = np.sin(phase) * 0.75 + np.sin(2 * phase) * 0.16 + np.sin(3 * phase) * 0.06
    breath = lp(RNG.normal(0, 1, len(t)), 2600) * 0.16
    attack = 1 - np.exp(-t * 16)
    release = np.clip((dur - t) / 0.28, 0, 1)
    return ((tone + breath) * attack * release * 0.46).astype(np.float32)


@functools.lru_cache(maxsize=128)
def pad(freqs: tuple[float, ...], dur: float) -> np.ndarray:
    t = tarr(dur)
    sig = np.zeros(len(t), dtype=np.float64)
    for f in freqs:
        for det in (-0.006, 0.0, 0.006):
            ff = f * (1 + det)
            for h in range(1, 7):
                sig += np.sin(2 * np.pi * ff * h * t + h * 0.7) / (h * 3)
    sig = lp(sig, 1150)
    attack = 1 - np.exp(-t * 3.2)
    release = np.clip((dur - t) / 0.6, 0, 1)
    return (sig * attack * release * 0.13).astype(np.float32)


@functools.lru_cache(maxsize=256)
def bell(freq: float, dur: float = 2.6) -> np.ndarray:
    t = tarr(dur)
    mod = np.sin(2 * np.pi * freq * 3.51 * t) * 7.0 * np.exp(-t * 3.0)
    carrier = np.sin(2 * np.pi * freq * t + mod)
    shimmer = np.sin(2 * np.pi * freq * 2.01 * t + mod * 0.35) * 0.35
    return ((carrier + shimmer) * np.exp(-t * 1.7) * 0.34).astype(np.float32)


@functools.lru_cache(maxsize=512)
def square(freq: float, dur: float) -> np.ndarray:
    t = tarr(dur)
    ph = (t * freq) % 1.0
    x = np.where(ph < 0.25, 1.0, -1.0)
    x = lp(x, 3200)
    env = (1 - np.exp(-t * 220)) * np.exp(-t * 4.0) * np.clip((dur - t) / 0.03, 0, 1)
    return (x * env * 0.17).astype(np.float32)


@functools.lru_cache(maxsize=32)
def riser(dur: float = 2.4) -> np.ndarray:
    t = tarr(dur)
    noise = lp(RNG.normal(0, 1, len(t)), 900)
    sweep = np.sin(2 * np.pi * np.cumsum(220 + 1500 * (t / dur) ** 2) / SR)
    env = (t / dur) ** 2.2
    return ((noise * 0.34 + sweep * 0.20) * env).astype(np.float32)


@functools.lru_cache(maxsize=32)
def impact(dur: float = 2.2) -> np.ndarray:
    t = tarr(dur)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 90 * np.exp(-t * 16)) / SR) * np.exp(-t * 3.2)
    crash = lp(RNG.normal(0, 1, len(t)), 3800) * np.exp(-t * 3.0) * 0.40
    return ((boom * 0.8 + crash)).astype(np.float32)


# ---------------------------------------------------------------------------
# Mixer
# ---------------------------------------------------------------------------

dry = np.zeros((2, N), dtype=np.float32)
wet = np.zeros((2, N), dtype=np.float32)
bass_bus = np.zeros((2, N), dtype=np.float32)
kick_times: list[float] = []


def place(target: np.ndarray, start: float, sig: np.ndarray, pan: float = 0.0, gain: float = 1.0) -> None:
    s = int(start * SR)
    if s >= N or s < 0:
        return
    n = min(len(sig), N - s)
    if n <= 0:
        return
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    target[0, s : s + n] += sig[:n] * l
    target[1, s : s + n] += sig[:n] * r


def hit(start: float, sig: np.ndarray, pan: float = 0.0, gain: float = 1.0, send: float = 0.0) -> None:
    place(dry, start, sig, pan, gain)
    if send > 0:
        place(wet, start, sig, pan, gain * send)


def tone(start: float, sig: np.ndarray, pan: float = 0.0, gain: float = 1.0, send: float = 0.25) -> None:
    place(dry, start, sig, pan, gain)
    place(wet, start, sig, pan, gain * send)


def b(start: float, sig: np.ndarray, gain: float = 1.0) -> None:
    place(bass_bus, start, sig, 0.0, gain)


def bt(bar: int, beat: float) -> float:
    return bar * BAR + beat * BEAT


# ---------------------------------------------------------------------------
# Arrangement
# ---------------------------------------------------------------------------

# (chord root, chord tones) per bar, 8-bar harmonic cycle
CHORDS: list[tuple[str, tuple[str, ...]]] = [
    ("D2", ("D3", "F3", "A3", "D4")),
    ("Bb2", ("Bb2", "D3", "F3", "Bb3")),
    ("F2", ("F2", "A2", "C3", "F3")),
    ("C3", ("C3", "E3", "G3", "C4")),
    ("D2", ("D3", "F3", "A3", "D4")),
    ("Bb2", ("Bb2", "D3", "F3", "Bb3")),
    ("G2", ("G2", "Bb2", "D3", "G3")),
    ("A2", ("A2", "C3", "E3", "A3")),
]

# Main koto motif - 4 bars of 4 beats each, in beats from phrase start.
PHRASE_A: list[tuple[float, str, float]] = [
    (0.0, "D4", 0.5), (0.5, "F4", 0.5), (1.0, "A4", 0.5), (1.5, "Bb4", 0.5),
    (2.0, "A4", 0.75), (2.75, "F4", 0.25), (3.0, "E4", 0.5), (3.5, "D4", 0.5),
    (4.0, "F4", 0.5), (4.5, "A4", 0.5), (5.0, "D5", 1.0),
    (6.0, "Bb4", 0.5), (6.5, "A4", 0.5), (7.0, "F4", 0.5), (7.5, "E4", 0.5),
    (8.0, "D4", 0.5), (8.5, "F4", 0.5), (9.0, "Bb4", 0.5), (9.5, "A4", 0.5),
    (10.0, "F4", 1.0), (11.0, "E4", 0.5), (11.5, "D4", 0.5),
    (12.0, "A4", 0.5), (12.5, "Bb4", 0.5), (13.0, "D5", 1.0),
    (14.0, "A4", 0.5), (14.5, "F4", 0.5), (15.0, "D4", 1.0),
]

PHRASE_B: list[tuple[float, str, float]] = [
    (0.0, "D5", 0.25), (0.25, "E5", 0.25), (0.5, "F5", 0.5), (1.0, "D5", 0.5),
    (1.5, "Bb4", 0.25), (1.75, "A4", 0.25), (2.0, "F4", 0.5), (2.5, "A4", 0.5),
    (3.0, "Bb4", 0.5), (3.5, "D5", 0.5),
    (4.0, "A5", 0.5), (4.5, "F5", 0.25), (4.75, "E5", 0.25),
    (5.0, "D5", 0.5), (5.5, "Bb4", 0.5), (6.0, "A4", 0.5), (6.5, "F4", 0.5),
    (7.0, "D4", 1.0),
    (8.0, "F5", 0.5), (8.5, "D5", 0.5), (9.0, "Bb4", 0.5), (9.5, "D5", 0.5),
    (10.0, "F5", 0.5), (10.5, "E5", 0.25), (10.75, "D5", 0.25), (11.0, "A4", 1.0),
    (12.0, "Bb4", 0.5), (12.5, "D5", 0.5), (13.0, "F5", 1.0),
    (14.0, "E5", 0.5), (14.5, "D5", 0.5), (15.0, "A4", 1.0),
]

# --- intro: atmosphere, drone and shakuhachi --------------------------------
for bar in range(0, 4):
    chord = CHORDS[bar % 8]
    tone(bt(bar, 0), pad(tuple(H[n] for n in chord[1]), BAR * 1.15), pan=0.0, gain=1.35, send=0.55)
    b(bt(bar, 0), bass(H[chord[0]] / 2, BAR * 0.95), gain=0.42)
    if bar % 2 == 0:
        tone(bt(bar, 0.5), bell(H["D5"]), pan=-0.3, gain=0.7, send=0.8)
    hit(bt(bar, 0), taiko(0.75, 1), pan=0.0, gain=0.55, send=0.55)
for beat, note, dur in [(1.0, "D5", 1.6), (4.0, "Bb4", 1.3), (6.5, "A4", 1.1), (9.0, "F4", 1.2), (12.0, "D5", 2.0)]:
    tone(beat * BEAT, shakuhachi(H[note], dur * BEAT), pan=-0.18, gain=1.15, send=0.7)
hit(0.0, impact(2.2), pan=0.0, gain=0.55, send=0.55)

# --- full groove -------------------------------------------------------------
FULL_BARS = list(range(4, 20)) + list(range(24, 30))
BUILD_BARS = [22, 23]

for bar in range(4, 32):
    chord = CHORDS[bar % 8]
    root, fifth = H[chord[0]], H[chord[0]] * 1.5
    in_full = bar in FULL_BARS
    in_build = bar in BUILD_BARS
    breakdown = bar in (20, 21)
    climax = bar in (24, 25, 26, 27, 28, 29)
    outro = bar in (30, 31)

    # Pads always present, wider in the climax.
    pad_gain = 0.9 if in_full else (1.5 if (breakdown or outro) else 1.15)
    tone(bt(bar, 0), pad(tuple(H[n] for n in chord[1]), BAR * 1.12), pan=0.0, gain=pad_gain, send=0.50)
    if climax:
        tone(bt(bar, 0), pad(tuple(H[n] * 2 for n in chord[1][:3]), BAR * 1.05), pan=0.38, gain=0.35, send=0.6)

    # Bass ostinato (absent during the breakdown).
    if not breakdown and not outro:
        for beat, freq, dur in [
            (0.0, root, 0.9), (1.5, root, 0.35), (2.0, fifth, 0.55),
            (3.0, root, 0.55), (3.5, fifth, 0.35),
        ]:
            b(bt(bar, beat), bass(freq, dur * BEAT), gain=0.95)

    # Drums.
    if in_full or in_build:
        strength = 1.0 if in_full else 0.72
        for beat in (0.0, 1.5, 2.0, 3.5):
            if in_build and beat == 3.5 and bar == 22:
                continue
            hit(bt(bar, beat), kick(), gain=0.95 * strength)
            kick_times.append(bt(bar, beat))
        for beat in (1.0, 3.0):
            hit(bt(bar, beat), snare(), pan=0.06, gain=0.8 * strength, send=0.22)
        steps = 16 if climax else 8
        for i in range(steps):
            beat = i * 4 / steps
            is_off = i % 2 == 1
            sig = hat(0.09, 1 if (climax and i % 8 == 6) else 0)
            hit(bt(bar, beat), sig, pan=0.28 if is_off else -0.22, gain=(0.72 if is_off else 0.95) * strength, send=0.14)
            if climax and i % 2 == 1:
                hit(bt(bar, beat), shaker(), pan=-0.35, gain=0.35)
        # Taiko ensemble: downbeat plus an end-of-phrase fill.
        hit(bt(bar, 0), taiko(0.75, 1), pan=-0.12, gain=(0.85 if climax else 0.68), send=0.30)
        if climax or bar % 4 == 3:
            for beat in (2.75, 3.0, 3.25, 3.5, 3.75):
                hit(bt(bar, beat), taiko(0.5, 0), pan=0.16, gain=0.42, send=0.28)

    # Breakdown: bare taiko + shakuhachi.
    if breakdown:
        hit(bt(bar, 0), taiko(0.75, 1), pan=-0.1, gain=0.72, send=0.6)
        hit(bt(bar, 2), taiko(0.75, 1), pan=0.1, gain=0.5, send=0.6)

    # Section-start bells and impacts.
    if bar in (4, 12, 20, 24, 28):
        tone(bt(bar, 0), bell(H["D5"]), pan=-0.32, gain=0.75, send=0.85)
        if bar in (24, 28):
            hit(bt(bar, 0), impact(2.2), gain=0.8, send=0.5)
    if bar in (23, 27):
        tone(bt(bar, 0), riser(2.4), pan=0.0, gain=0.55, send=0.35)

    # Outro: dissolve back to atmosphere so the loop point is inaudible.
    if outro:
        if bar == 30:
            tone(bt(bar, 0.5), shakuhachi(H["D5"], 2.2 * BEAT), pan=-0.2, gain=0.9, send=0.8)
        tone(bt(bar, 2), bell(H["A4"]), pan=0.3, gain=0.45, send=0.9)


def emit_phrase(start_bar: int, phrase: list[tuple[float, str, float]], gain: float = 1.0, square_lead: bool = False) -> None:
    for beat, note, dur in phrase:
        t = start_bar * BAR + beat * BEAT
        f = H[note]
        tone(t, koto(f, dur * BEAT * 1.5), pan=-0.14 + 0.28 * (beat % 2), gain=0.92 * gain, send=0.42)
        if square_lead:
            tone(t, square(f * 2, dur * BEAT * 0.9), pan=0.24, gain=0.85, send=0.18)


emit_phrase(4, PHRASE_A)
emit_phrase(8, PHRASE_A, gain=0.95)
emit_phrase(12, PHRASE_B, gain=1.0, square_lead=True)
emit_phrase(16, PHRASE_B, gain=0.95, square_lead=True)
emit_phrase(24, PHRASE_A, gain=1.15, square_lead=True)
emit_phrase(28, PHRASE_B, gain=1.05, square_lead=True)

# ---------------------------------------------------------------------------
# Sidechain duck, reverb, mastering and seamless loop
# ---------------------------------------------------------------------------

duck = np.ones(N, dtype=np.float32)
for kt in kick_times:
    s = int(kt * SR)
    n = min(int(0.24 * SR), N - s)
    if n > 0:
        env = 1 - 0.28 * np.exp(-np.arange(n, dtype=np.float32) / SR * 22)
        duck[s : s + n] = np.minimum(duck[s : s + n], env)
bass_bus *= duck[None, :]
dry += bass_bus

# Synthesised impulse response: early reflections + exponentially decaying noise.
ir_len = int(1.85 * SR)
ir = RNG.normal(0, 1, ir_len).astype(np.float32) * np.exp(-np.arange(ir_len, dtype=np.float32) / SR * 3.6)
ir = lp(ir, 5200)
for delay, amp in [(0.017, 0.5), (0.029, 0.38), (0.041, 0.3), (0.067, 0.22)]:
    d = int(delay * SR)
    ir[d:] += ir[:-d] * amp
ir /= max(1e-6, np.sqrt(np.sum(ir**2)))
ir *= 0.32

n_fft = 1 << int(np.ceil(np.log2(N + ir_len)))
IR = np.fft.rfft(ir, n_fft)
reverbed = np.zeros_like(wet)
for ch in (0, 1):
    spec = np.fft.rfft(wet[ch], n_fft)
    reverbed[ch] = np.fft.irfft(spec * IR, n_fft)[:N]

master = dry + reverbed

# --- mastering EQ: tame the low-mid mud, lift presence and air ---------------
eq_f = np.fft.rfftfreq(N, 1 / SR)
log_f = np.log10(eq_f + 1.0)
tilt = np.clip(
    (log_f - np.log10(120)) / (np.log10(7000) - np.log10(120)),
    0.0,
    1.0,
)
eq_db = -3.0 + 8.5 * tilt
eq_db -= 2.6 * np.exp(-(((log_f - np.log10(180)) / 0.19) ** 2))
eq_db -= 6.0 * np.clip((40 - eq_f) / 25.0, 0.0, 1.0)
eq_gain = 10 ** (eq_db / 20.0)
master = np.fft.irfft(np.fft.rfft(master, axis=1) * eq_gain[None, :], n=N, axis=1)

master = np.tanh(master * 1.25) / np.tanh(1.25)
peak = float(np.max(np.abs(master)))
master *= 0.88 / max(peak, 1e-6)

# De-click edges.
edge = int(0.02 * SR)
master[:, :edge] *= np.linspace(0, 1, edge, dtype=np.float32)
master[:, -edge:] *= np.linspace(1, 0, edge, dtype=np.float32)

# Crossfade the quiet outro into the intro for a genuinely seamless loop.
CROSS = int(2.0 * SR)
tail = master[:, -CROSS:].copy()
loop = master[:, :-CROSS].copy()
ramp_out = np.linspace(1, 0, CROSS, dtype=np.float32)
ramp_in = np.linspace(0, 1, CROSS, dtype=np.float32)
loop[:, :CROSS] = loop[:, :CROSS] * ramp_in + tail * ramp_out
master = np.ascontiguousarray(loop, dtype=np.float32)

# Write 16-bit stereo WAV.
pcm = np.clip(master.T, -1, 1)
pcm_i = (pcm * 32767).astype("<i2")
wav_path = WORK / "theme_master.wav"
with wave.open(str(wav_path), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm_i.tobytes())

print(f"master: {master.shape[1] / SR:.2f}s, peak={np.max(np.abs(master)):.3f}, rms={np.sqrt(np.mean(master**2)):.4f}")

# Encode game formats with the bundled ffmpeg.
import imageio_ffmpeg  # noqa: E402

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
for name, args in [
    ("theme_main.ogg", ["-c:a", "libvorbis", "-qscale:a", "5"]),
    ("theme_main.mp3", ["-c:a", "libmp3lame", "-b:a", "160k"]),
]:
    dst = OUTDIR / name
    cmd = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav_path), *args, str(dst)]
    subprocess.run(cmd, check=True)
    print(f"  {name}: {dst.stat().st_size // 1024} KB")
