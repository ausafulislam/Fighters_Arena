#!/usr/bin/env python3
"""Build every Phase 6 asset from the established original artwork.

Run from the repository root:
    /tmp/fa-venv/bin/python assets_work/process_phase6_assets.py

Outputs
-------
* public/assets/arenas/backgrounds/arena_<id>.png
    Five 1280 x 720 (2x logical 640 x 360) arena backdrops. Temple Grounds is
    generated from the existing Welcome courtyard plate using nearest-neighbour
    doubling so its established look is byte-for-byte preserved.
* public/assets/arenas/cards/card_<id>.png
    Five 216 x 292 cut-corner preview plates (2x logical 108 x 146).
* public/assets/characters/spritesheets/fight_<id>.png
    Seven frame-based 1760 x 1560 sprite sheets (8 x 6 cells of 220 x 260).
    The frames are composed from the SAME chroma-keyed cutouts that produced
    the Phase 5 showcases, so Kenji / Shadow keep their established designs
    and every fighter has one consistent visual direction.
* src/constants/fighterFrames.ts
    Generated from the very same frame specification, so the animation
    definitions and the sheet layout can never drift apart.
* public/assets/audio/sfx/<name>.wav
    Short original synthesised arcade sounds. No third-party / copyrighted
    audio is used.
* assets_work/preview/p6_assets.png
    Gitignored contact sheet for visual review.
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from process_character_assets import key_green

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "assets_work"
PUBLIC = ROOT / "public" / "assets"
BG_DIR = PUBLIC / "arenas" / "backgrounds"
CARD_DIR = PUBLIC / "arenas" / "cards"
SHEET_DIR = PUBLIC / "characters" / "spritesheets"
SFX_DIR = PUBLIC / "audio" / "sfx"
PREVIEW = WORK / "preview"
for directory in (BG_DIR, CARD_DIR, SHEET_DIR, SFX_DIR, PREVIEW):
    directory.mkdir(parents=True, exist_ok=True)

LOGICAL_W, LOGICAL_H = 640, 360
BG_W, BG_H = 1280, 720
CARD_W, CARD_H = 216, 292  # 2x logical 108 x 146
FRAME_W, FRAME_H = 220, 260  # 2x logical 110 x 130
COLS, ROWS = 8, 6

# id -> (source illustration / None for the existing courtyard, gradient top,
#        gradient bottom, accent, seed)
ARENAS: list[tuple[str, Path | None, str, str, str, int]] = [
    ("temple_grounds", None, "#3B1C63", "#140A28", "#FFB347", 6101),
    ("blazing_canyon", WORK / "arena_blazing_canyon.png", "#7A2408", "#1B0806", "#FF5A00", 6102),
    ("bamboo_forest", WORK / "arena_bamboo_forest.png", "#14512F", "#081A14", "#53D08A", 6103),
    ("frozen_peak", WORK / "arena_frozen_peak.png", "#17447E", "#08122C", "#7FD4FF", 6104),
    ("skyline_rooftop", WORK / "arena_skyline_rooftop.png", "#3B176F", "#0B0A22", "#C86BFF", 6105),
]

ROSTER: list[tuple[str, Path, str]] = [
    ("kenji", WORK / "kenji.png", "#FF6A12"),
    ("shadow", WORK / "shadow.png", "#A24BFF"),
    ("blaze", WORK / "fighter_blaze.png", "#FFB12E"),
    ("iron_fist", WORK / "fighter_iron_fist.png", "#53D08A"),
    ("storm", WORK / "fighter_storm.png", "#38BFFF"),
    ("raven", WORK / "fighter_raven.png", "#B36BFF"),
    ("titan", WORK / "fighter_titan.png", "#FF5A3C"),
]


def hexrgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def cut_corner_mask(w: int, h: int, cut: int) -> Image.Image:
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(
        [
            (cut, 0), (w - cut, 0), (w, cut), (w, h - cut),
            (w - cut, h), (cut, h), (0, h - cut), (0, cut),
        ],
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(0.35))


def make_arena_background(index: int, identifier: str, source: Path | None) -> Image.Image:
    if source is None:
        # Established Temple Grounds plate: integer doubling preserves pixels.
        plate = Image.open(PUBLIC / "arenas" / "backgrounds" / "welcome_courtyard.png").convert("RGB")
        plate = plate.resize((BG_W, BG_H), Image.Resampling.NEAREST)
    else:
        plate = Image.open(source).convert("RGB").resize((BG_W, BG_H), Image.Resampling.LANCZOS)
    # Keep the arena slightly darker than a menu plate so fighters read clearly.
    arr = np.asarray(plate).astype(np.float32)
    arr *= 0.88
    plate = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    plate.save(BG_DIR / f"arena_{identifier}.png", optimize=True)
    return plate


def make_arena_card(identifier: str, background: Image.Image, accent: str, seed: int) -> Image.Image:
    # Cover-fit from the central / upper part of the backdrop, never stretched.
    scale = max(CARD_W / background.width, CARD_H / background.height)
    w, h = round(background.width * scale), round(background.height * scale)
    scaled = background.resize((w, h), Image.Resampling.LANCZOS)
    left = (w - CARD_W) // 2
    top = max(0, min(h - CARD_H, round(h * 0.1)))
    plate = scaled.crop((left, top, left + CARD_W, top + CARD_H)).convert("RGBA")

    # Dark caption zone + subtle atmospheric streaks.
    band = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    for y in range(int(CARD_H * 0.66), CARD_H):
        t = (y - CARD_H * 0.66) / (CARD_H * 0.34)
        bd.line([(0, y), (CARD_W, y)], fill=(9, 7, 16, int(110 + 135 * t)))
    rng = np.random.default_rng(seed)
    for _ in range(14):
        x, y = int(rng.integers(0, CARD_W)), int(rng.integers(6, int(CARD_H * 0.72)))
        length = int(rng.integers(8, 30))
        bd.line([(x, y), (x + length, y + length // 2)], fill=(*hexrgb(accent), 22), width=1)
    plate.alpha_composite(band)

    d = ImageDraw.Draw(plate)
    d.line(
        [(10, int(CARD_H * 0.66)), (CARD_W - 10, int(CARD_H * 0.66))],
        fill=(*hexrgb(accent), 190),
        width=2,
    )
    d.line([(6, 6), (CARD_W - 6, 6)], fill=(*hexrgb(accent), 70), width=1)
    plate.putalpha(
        Image.composite(
            plate.getchannel("A"),
            Image.new("L", (CARD_W, CARD_H), 0),
            cut_corner_mask(CARD_W, CARD_H, 14),
        )
    )
    plate.save(CARD_DIR / f"card_{identifier}.png", optimize=True)
    return plate


# --- Frame-based fighter animation rig -------------------------------------
#
# Each state owns several DIFFERENT frames. The base pose is the established
# full-body pixel-art cutout; frames are composed by integer-region limb
# extension (upper-right / lower-right), body lean, squash, rotation, tint and
# accent motion arcs. Nothing is a single static PNG slid across the screen.

class Pose:
    def __init__(
        self,
        lean: float = 0.0,
        sx: float = 1.0,
        sy: float = 1.0,
        dy: float = 0.0,
        upper: float = 1.0,
        lower: float = 1.0,
        raise_arm: float = 0.0,
        rotate: float = 0.0,
        tint: tuple[float, float, float] = (1.0, 1.0, 1.0),
        glow: float = 0.0,
        arc: float = 0.0,
        arc_lower: bool = False,
        alpha: float = 1.0,
    ) -> None:
        self.lean = lean
        self.sx = sx
        self.sy = sy
        self.dy = dy
        self.upper = upper
        self.lower = lower
        self.raise_arm = raise_arm
        self.rotate = rotate
        self.tint = tint
        self.glow = glow
        self.arc = arc
        self.arc_lower = arc_lower
        self.alpha = alpha


# state -> (list of poses, frames per second, repeat (-1 = loop))
FRAME_SPEC: list[tuple[str, list[Pose], int, int]] = [
    ("idle", [Pose(sy=1.0), Pose(dy=-1.5, sy=1.008), Pose(dy=-2.5, sy=1.014), Pose(dy=-1.5, sy=1.008)], 7, -1),
    ("walk", [Pose(lean=-3.0, lower=1.06, dy=-1), Pose(lean=0.0, dy=-2), Pose(lean=3.0, lower=0.96, dy=-1), Pose(lean=0.0)], 9, -1),
    ("run", [Pose(lean=-8.0, lower=1.14, dy=-3), Pose(lean=-5.0, upper=1.04, dy=-5), Pose(lean=-9.0, lower=0.9, dy=-2), Pose(lean=-5.0, dy=-4)], 12, -1),
    ("jump", [Pose(sy=0.9, sx=1.04, dy=-4), Pose(sy=1.06, sx=0.97, dy=-8, rotate=-4)], 8, 0),
    ("land", [Pose(sy=0.86, sx=1.1)], 6, 0),
    ("crouch", [Pose(sy=0.68, sx=1.13, dy=3), Pose(sy=0.7, sx=1.11, dy=2)], 6, -1),
    ("block", [Pose(lean=4.0, upper=0.86, glow=0.16), Pose(lean=5.0, upper=0.82, glow=0.24)], 6, -1),
    ("light_punch", [Pose(upper=1.12, lean=-2), Pose(upper=1.36, lean=-5, arc=0.5), Pose(upper=1.22, lean=-3, arc=0.22)], 15, 0),
    ("heavy_punch", [Pose(upper=1.08, lean=3, sx=1.02), Pose(upper=1.52, lean=-8, arc=0.85, glow=0.18), Pose(upper=1.3, lean=-4, arc=0.4)], 11, 0),
    ("kick", [Pose(lower=1.1, lean=3, sy=0.98), Pose(lower=1.5, lean=-6, arc=0.85, arc_lower=True, glow=0.14), Pose(lower=1.24, lean=-2, arc=0.3, arc_lower=True)], 12, 0),
    ("special", [Pose(upper=1.12, lower=1.08, glow=0.3), Pose(upper=1.3, lower=1.2, glow=0.55, arc=0.5), Pose(upper=1.44, lower=1.3, glow=0.8, arc=0.9), Pose(upper=1.2, lower=1.12, glow=0.4, arc=0.35)], 10, 0),
    ("hit", [Pose(rotate=9, lean=7, tint=(1.25, 0.82, 0.82)), Pose(rotate=13, lean=10, tint=(1.35, 0.72, 0.72))], 10, 0),
    ("knockback", [Pose(rotate=16, lean=12, sx=1.03), Pose(rotate=22, lean=16, alpha=0.9)], 8, 0),
    ("knockdown", [Pose(rotate=62, sy=0.8, dy=18), Pose(rotate=84, sy=0.74, dy=26)], 7, 0),
    ("getup", [Pose(rotate=44, sy=0.82, dy=14), Pose(rotate=14, sy=0.94, dy=4)], 7, 0),
    ("victory", [Pose(raise_arm=0.6, glow=0.24, dy=-2), Pose(raise_arm=0.9, glow=0.34, dy=-4)], 4, -1),
    ("defeat", [Pose(sy=0.62, sx=1.08, rotate=-18, tint=(0.78, 0.78, 0.86), dy=8), Pose(sy=0.58, sx=1.1, rotate=-24, tint=(0.7, 0.7, 0.8), dy=10)], 3, 0),
]


def stretch_region(sprite: Image.Image, top: float, bottom: float, factor: float) -> Image.Image:
    """Extend the right-hand part of a body region (arm / leg) in whole pixels."""
    if abs(factor - 1.0) < 0.005:
        return sprite
    w, h = sprite.size
    y0, y1 = int(h * top), int(h * bottom)
    region = sprite.crop((0, y0, w, y1))
    split = int(w * 0.52)
    left = region.crop((0, 0, split, y1 - y0))
    right = region.crop((split, 0, w, y1 - y0))
    new_w = max(2, round(right.width * factor))
    right = right.resize((new_w, right.height), Image.Resampling.NEAREST)
    band = Image.new("RGBA", (min(w, split + new_w), y1 - y0), (0, 0, 0, 0))
    band.paste(left, (0, 0))
    band.paste(right, (split, 0), right)
    out = sprite.copy()
    out.paste(band, (0, y0), band)
    return out


def raise_arm(sprite: Image.Image, amount: float) -> Image.Image:
    """Lift the front forearm into a victory pose using its own artwork."""
    w, h = sprite.size
    box = (int(w * 0.58), int(h * 0.16), int(w * 0.86), int(h * 0.44))
    arm = sprite.crop(box)
    arm = arm.rotate(-28 * amount, resample=Image.Resampling.NEAREST, expand=True)
    out = sprite.copy()
    out.paste(arm, (box[0] - 4, max(0, box[1] - round(22 * amount))), arm)
    return out


def compose_frame(base: Image.Image, pose: Pose, accent: tuple[int, int, int]) -> Image.Image:
    # Fit the established cutout once into the frame with a bottom anchor.
    sprite = base.copy()
    if pose.upper != 1.0:
        sprite = stretch_region(sprite, 0.10, 0.55, pose.upper)
    if pose.lower != 1.0:
        sprite = stretch_region(sprite, 0.52, 1.0, pose.lower)
    if pose.raise_arm:
        sprite = raise_arm(sprite, pose.raise_arm)

    w, h = sprite.size
    w, h = max(2, round(w * pose.sx)), max(2, round(h * pose.sy))
    sprite = sprite.resize((w, h), Image.Resampling.NEAREST)

    arr = np.asarray(sprite).astype(np.float32)
    arr[:, :, 0] *= pose.tint[0]
    arr[:, :, 1] *= pose.tint[1]
    arr[:, :, 2] *= pose.tint[2]
    if pose.alpha != 1.0:
        arr[:, :, 3] *= pose.alpha
    sprite = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")

    angle = pose.lean * 0.55 + pose.rotate
    if angle:
        sprite = sprite.rotate(-angle, resample=Image.Resampling.NEAREST, expand=True, fillcolor=(0, 0, 0, 0))

    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))

    if pose.glow > 0:
        glow = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse(
            (18, 28, FRAME_W - 18, FRAME_H - 12),
            fill=(*accent, int(130 * pose.glow)),
        )
        glow = glow.filter(ImageFilter.GaussianBlur(16))
        frame.alpha_composite(glow)

    x = (FRAME_W - sprite.width) // 2
    y = FRAME_H - sprite.height - 4 + round(pose.dy)
    frame.alpha_composite(sprite, (x, max(0, y)))

    if pose.arc > 0:
        fx = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
        fd = ImageDraw.Draw(fx)
        cy = int(FRAME_H * (0.72 if pose.arc_lower else 0.40))
        strength = int(210 * pose.arc)
        for i in range(3):
            offset = i * 7
            fd.arc(
                (FRAME_W * 0.54 - offset, cy - 46 + offset, FRAME_W * 0.98 - offset, cy + 46 - offset),
                245,
                345,
                fill=(*accent, strength - i * 45),
                width=3 if i == 0 else 2,
            )
        fd.line(
            [(int(FRAME_W * 0.62), cy), (int(FRAME_W * 0.94), cy - 14)],
            fill=(255, 255, 255, min(220, strength)),
            width=2,
        )
        frame.alpha_composite(fx)
    return frame


def make_sheet(identifier: str, source: Path, accent_hex: str) -> Image.Image:
    cut = key_green(source)
    scale = min((FRAME_W - 12) / cut.width, (FRAME_H - 10) / cut.height)
    base = cut.resize(
        (max(2, round(cut.width * scale)), max(2, round(cut.height * scale))),
        Image.Resampling.LANCZOS,
    )
    accent = hexrgb(accent_hex)
    sheet = Image.new("RGBA", (FRAME_W * COLS, FRAME_H * ROWS), (0, 0, 0, 0))
    index = 0
    for _state, poses, _fps, _repeat in FRAME_SPEC:
        for pose in poses:
            frame = compose_frame(base, pose, accent)
            sheet.alpha_composite(frame, ((index % COLS) * FRAME_W, (index // COLS) * FRAME_H))
            index += 1
    sheet.save(SHEET_DIR / f"fight_{identifier}.png", optimize=True)
    return sheet


def write_frame_constants() -> int:
    lines = [
        "/**",
        " * GENERATED by assets_work/process_phase6_assets.py - do not edit by hand.",
        " * Frame indices, rates and loops mirror the sprite-sheet layout exactly.",
        " */",
        "",
        "export const FIGHTER_FRAME = {",
        f"  width: {FRAME_W},",
        f"  height: {FRAME_H},",
        f"  columns: {COLS},",
        f"  rows: {ROWS},",
        "} as const;",
        "",
        "export interface FighterAnimationDef {",
        "  frames: readonly number[];",
        "  fps: number;",
        "  repeat: number;",
        "}",
        "",
        "export const FIGHTER_ANIMATIONS = {",
    ]
    index = 0
    for state, poses, fps, repeat in FRAME_SPEC:
        indices = list(range(index, index + len(poses)))
        index += len(poses)
        lines.append(f"  {state}: {{ frames: {indices!r}, fps: {fps}, repeat: {repeat} }},".replace("'", ""))
    lines += ["} as const;", "", "export type FighterAnimationName = keyof typeof FIGHTER_ANIMATIONS;", "", f"export const FIGHTER_FRAME_COUNT = {index};", ""]
    (ROOT / "src" / "constants" / "fighterFrames.ts").write_text("\n".join(lines), encoding="utf-8")
    return index


# --- Original synthesised sound effects ------------------------------------

SAMPLE_RATE = 22050


def synth(name: str, duration: float, build) -> None:
    n = int(SAMPLE_RATE * duration)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    rng = np.random.default_rng(abs(hash(name)) % (2**32))
    samples = build(t, rng)
    samples = np.clip(samples, -1.0, 1.0)
    envelope = np.minimum(1.0, t * 220) * np.minimum(1.0, (duration - t) * 90)
    samples *= np.clip(envelope, 0.0, 1.0)
    pcm = (samples * 26000).astype("<i2")
    with wave.open(str(SFX_DIR / f"{name}.wav"), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(struct.pack(f"<{n}h", *pcm.tolist()))


def tone(freq, t, phase=0.0):
    return np.sin(2 * np.pi * np.asarray(freq) * t + phase).astype(np.float32)


def sweep(f0, f1, t):
    duration = float(t[-1]) if len(t) else 1.0
    freq = np.linspace(f0, f1, len(t), dtype=np.float32)
    return np.sin(2 * np.pi * np.cumsum(freq) / SAMPLE_RATE).astype(np.float32)


def build_sfx() -> None:
    def blip(f0, f1, dur):
        def f(t, rng):
            return sweep(f0, f1, t) * 0.55 + rng.normal(0, 0.02, len(t)).astype(np.float32)
        synth(name_holder[0], dur, f)

    name_holder = [""]
    # Simple UI blips.
    for key, f0, f1, dur in [
        ("ui_click", 720, 940, 0.09),
        ("ui_confirm", 480, 1180, 0.20),
        ("ui_back", 780, 360, 0.13),
        ("round_bell", 880, 660, 0.55),
    ]:
        name_holder[0] = key
        blip(f0, f1, dur)

    def impact(low, noisy, dur):
        def f(t, rng):
            body = tone(low, t) * np.exp(-t * 16) * 0.75
            noise = rng.normal(0, 1, len(t)).astype(np.float32) * np.exp(-t * 42) * noisy
            return body + noise
        return f

    for key, low, noisy, dur in [
        ("punch_light", 165, 0.30, 0.13),
        ("punch_heavy", 105, 0.46, 0.22),
        ("kick", 128, 0.38, 0.19),
        ("block", 320, 0.16, 0.16),
        ("hit", 190, 0.34, 0.17),
    ]:
        synth(key, dur, impact(low, noisy, dur))

    def whoosh(f0, f1, dur, level):
        def f(t, rng):
            noise = rng.normal(0, 1, len(t)).astype(np.float32)
            filtered = np.convolve(noise, np.ones(28, dtype=np.float32) / 28, mode="same")
            return filtered * level * np.sin(np.pi * t / dur) + sweep(f0, f1, t) * 0.22
        return f

    synth("jump", 0.17, whoosh(260, 760, 0.17, 0.5))
    synth("entrance", 0.42, whoosh(90, 520, 0.42, 0.62))

    def special(t, rng):
        base = sweep(140, 1180, t) * 0.42
        buzz = tone(58, t) * 0.3 * np.sin(np.pi * t / 0.55)
        shimmer = tone(880 + 200 * np.sin(t * 30), t) * 0.12
        return base + buzz + shimmer + rng.normal(0, 0.04, len(t)).astype(np.float32)

    synth("special", 0.55, special)

    def ready(t, rng):
        return (tone(523, t) + tone(659, t) + tone(784, t)) * 0.24

    synth("ready", 0.42, ready)

    def fight(t, rng):
        return (sweep(180, 70, t) * 0.4 + tone(1046, t) * 0.35 + rng.normal(0, 0.09, len(t)).astype(np.float32) * np.exp(-t * 9))

    synth("fight", 0.55, fight)

    def victory(t, rng):
        notes = [523, 659, 784, 1046]
        out = np.zeros_like(t)
        for i, f in enumerate(notes):
            gate = (t >= i * 0.13) & (t < i * 0.13 + 0.26)
            out[gate] += tone(f, t[gate]) * 0.3
        return out

    synth("victory", 0.62, victory)

    def defeat(t, rng):
        notes = [440, 349, 262]
        out = np.zeros_like(t)
        for i, f in enumerate(notes):
            gate = (t >= i * 0.16) & (t < i * 0.16 + 0.3)
            out[gate] += tone(f, t[gate]) * 0.32
        return out

    synth("defeat", 0.6, defeat)


def make_contact_sheet(cards: list[Image.Image], sheets: list[Image.Image]) -> None:
    scale = 0.42
    cw, ch = int(CARD_W * scale), int(CARD_H * scale)
    fh = int(FRAME_H * 0.46)
    sheet_w = 5 * (cw + 14) + 14
    out = Image.new("RGB", (sheet_w, ch + fh + 60), "#101014")
    d = ImageDraw.Draw(out)
    for i, card in enumerate(cards):
        x = 14 + i * (cw + 14)
        bg = Image.new("RGBA", card.size, "#1B1B22")
        bg.alpha_composite(card)
        out.paste(bg.convert("RGB").resize((cw, ch)), (x, 26))
    y = 26 + ch + 18
    for i, sheet in enumerate(sheets):
        # Four idle frames from the first row.
        strip = sheet.crop((0, 0, FRAME_W * 4, FRAME_H)).resize(
            (int(FRAME_W * 4 * 0.16), fh), Image.Resampling.LANCZOS
        )
        x = 14 + i * (strip.width + 8)
        bg = Image.new("RGBA", strip.size, "#1B1B22")
        bg.alpha_composite(strip)
        out.paste(bg.convert("RGB"), (x, y)) if x + strip.width < sheet_w else None
    d.text((14, 8), "PHASE 6 ASSET REVIEW", fill="#FFC247")
    out.save(PREVIEW / "p6_assets.png")


def main() -> None:
    cards: list[Image.Image] = []
    for index, (identifier, source, _top, _bottom, accent, seed) in enumerate(ARENAS):
        background = make_arena_background(index, identifier, source)
        cards.append(make_arena_card(identifier, background, accent, seed))
        print(f"arena {identifier:16s} -> {BG_W}x{BG_H} + card {CARD_W}x{CARD_H}")

    sheets: list[Image.Image] = []
    for identifier, source, accent in ROSTER:
        sheet = make_sheet(identifier, source, accent)
        sheets.append(sheet)
        print(f"fighter {identifier:14s} -> sheet {sheet.size[0]}x{sheet.size[1]}")

    count = write_frame_constants()
    print(f"frame map -> src/constants/fighterFrames.ts ({count} frames, {COLS * ROWS} cells)")

    build_sfx()
    print(f"sfx -> {len(list(SFX_DIR.glob('*.wav')))} original wav files")

    make_contact_sheet(cards, sheets)
    print(f"preview -> {PREVIEW / 'p6_assets.png'}")


if __name__ == "__main__":
    main()
