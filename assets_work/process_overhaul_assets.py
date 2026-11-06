#!/usr/bin/env python3
"""Build the complete character-art overhaul assets.

Run from the repository root:
    /tmp/fa-venv/bin/python assets_work/process_overhaul_assets.py

Outputs
-------
* public/assets/characters/spritesheets/fight_<id>.png
    Seven 1200 x 1344 sprite sheets. Each 120 x 112 cell is an individually
    rendered skeleton pose (see fighter_rig.py / fighter_animation_specs.py).
    21 animations x 7 fighters, 112 distinct frames per fighter, 784 frames in
    total. No frame is a transformed copy of another frame.
* public/assets/characters/portraits/portrait_<id>.png
    Head-and-shoulders busts for the gameplay HUD and VS intro.
* public/assets/characters/cards/card_<id>.png + showcase/show_<id>.png
    Regenerated from the SAME rig so selection screens and gameplay share one
    art style. Plate construction is reused from process_character_assets.py.
* public/assets/audio/sfx/*.wav
    Four new original synthesised feedback sounds (land / whiff / combo / ko).
* src/constants/fighterFrames.ts
    Generated frame indices, rates, loops and durations. The sheet layout and
    the runtime animation definitions can never drift apart.
* assets_work/preview/overhaul_*.png  (gitignored review contact sheets)
"""

from __future__ import annotations

import struct
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from fighter_animation_specs import ANIM_META, ANIM_ORDER, build_all
from fighter_rig import CH, CW, DESIGNS, render_frame
from process_character_assets import (
    CARD_CUT,
    CARD_H,
    CARD_W,
    SHOW_H,
    SHOW_W,
    cover,
    cut_corner_mask,
    gradient,
    hexrgb,
    pixel_streaks,
    radial_glow,
)

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "assets_work"
PUBLIC = ROOT / "public" / "assets"
SHEET_DIR = PUBLIC / "characters" / "spritesheets"
PORTRAIT_DIR = PUBLIC / "characters" / "portraits"
CARD_DIR = PUBLIC / "characters" / "cards"
SHOW_DIR = PUBLIC / "characters" / "showcase"
SFX_DIR = PUBLIC / "audio" / "sfx"
PREVIEW = WORK / "preview"
CONSTANTS = ROOT / "src" / "constants" / "fighterFrames.ts"
for directory in (SHEET_DIR, PORTRAIT_DIR, CARD_DIR, SHOW_DIR, SFX_DIR, PREVIEW):
    directory.mkdir(parents=True, exist_ok=True)

COLS, ROWS = 10, 12
CELLS = COLS * ROWS

# Per-character motion amplitude and victory pose: style differences are real
# geometry differences, not just a palette swap.
MOTION = {
    "kenji": (1.0, "fist_raise"),
    "shadow": (1.08, "ninja_pose"),
    "blaze": (1.05, "flame_pose"),
    "iron_fist": (0.84, "flex"),
    "storm": (1.18, "fist_raise"),
    "raven": (1.1, "blade_pose"),
    "titan": (0.78, "flex"),
}

PLATE = {
    "kenji": ("#7A2408", "#260A06", "#FF6A12"),
    "shadow": ("#3B1468", "#140A28", "#A24BFF"),
    "blaze": ("#8C2E08", "#2A0A08", "#FFB12E"),
    "iron_fist": ("#184A32", "#0A1B14", "#53D08A"),
    "storm": ("#124A82", "#071A38", "#38BFFF"),
    "raven": ("#3A1B62", "#120A22", "#B36BFF"),
    "titan": ("#7A1E22", "#210A12", "#FF5A3C"),
}


def nearest_fit(src: Image.Image, box_w: int, box_h: int, anchor_y: float = 0.0) -> Image.Image:
    """Integer-ish nearest-neighbour cover fit, never a blurry stretch."""
    scale = max(box_w / src.width, box_h / src.height)
    w, h = round(src.width * scale), round(src.height * scale)
    scaled = src.resize((max(box_w, w), max(box_h, h)), Image.Resampling.NEAREST)
    left = (scaled.width - box_w) // 2
    top = int(round((scaled.height - box_h) * anchor_y))
    return scaled.crop((left, top, left + box_w, top + box_h))


def build_sheet(character_id: str) -> tuple[Image.Image, dict[str, list[int]], Image.Image]:
    amp, victory_style = MOTION[character_id]
    animations = build_all(character_id, amp, victory_style)
    sheet = Image.new("RGBA", (CW * COLS, CH * ROWS), (0, 0, 0, 0))
    frames: dict[str, list[int]] = {}
    index = 0
    idle_frame: Image.Image | None = None
    for name, poses in animations:
        indices: list[int] = []
        for pose in poses:
            frame = render_frame(character_id, pose)
            if idle_frame is None:
                idle_frame = frame
            sheet.alpha_composite(frame, ((index % COLS) * CW, (index // COLS) * CH))
            indices.append(index)
            index += 1
        frames[name] = indices
    assert index <= CELLS, f"{character_id}: {index} frames exceeds {CELLS} cells"
    assert idle_frame is not None
    return sheet, frames, idle_frame


def build_portrait(idle: Image.Image) -> Image.Image:
    # Head + shoulders, authored at 1x then doubled with nearest-neighbour.
    bust = idle.crop((36, 2, 86, 52))
    return bust.resize((100, 100), Image.Resampling.NEAREST)


def build_card(idle: Image.Image, top: str, bottom: str, accent: str, seed: int) -> Image.Image:
    base = gradient(top, bottom, CARD_W, CARD_H) + radial_glow(CARD_W, CARD_H, accent, 0.34)
    plate = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    plate.alpha_composite(pixel_streaks(CARD_W, CARD_H, accent, seed))
    bust = idle.crop((34, 2, 88, 56))
    bust = nearest_fit(bust, CARD_W - 4, 118, anchor_y=0.18)
    plate.paste(bust, (2, 0), bust)
    band = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    for y in range(96, CARD_H):
        t = (y - 96) / (CARD_H - 96)
        bd.line([(0, y), (CARD_W, y)], fill=(9, 7, 16, int(90 + 150 * t)))
    plate.alpha_composite(band)
    bd = ImageDraw.Draw(plate)
    bd.line([(8, 98), (CARD_W - 8, 98)], fill=(*hexrgb(accent), 130), width=1)
    plate.putalpha(
        Image.composite(
            plate.getchannel("A"),
            Image.new("L", (CARD_W, CARD_H), 0),
            cut_corner_mask(CARD_W, CARD_H, CARD_CUT),
        )
    )
    return plate


def build_showcase(idle: Image.Image) -> Image.Image:
    art = idle.resize((CW * 3, CH * 3), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (SHOW_W, SHOW_H), (0, 0, 0, 0))
    x = (SHOW_W - art.width) // 2
    y = SHOW_H - art.height - 6
    canvas.alpha_composite(art, (x, y))
    return canvas


# --- New original sound effects ------------------------------------------

SAMPLE_RATE = 22050


def synth(name: str, duration: float, build) -> None:
    n = int(SAMPLE_RATE * duration)
    t = np.linspace(0.0, duration, n, endpoint=False, dtype=np.float32)
    rng = np.random.default_rng(abs(hash(name)) % (2**32))
    samples = np.clip(build(t, rng), -1.0, 1.0)
    envelope = np.minimum(1.0, t * 220) * np.minimum(1.0, (duration - t) * 90)
    samples *= np.clip(envelope, 0.0, 1.0)
    pcm = (samples * 26000).astype("<i2")
    with wave.open(str(SFX_DIR / f"{name}.wav"), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(struct.pack(f"<{n}h", *pcm.tolist()))


def tone(freq, t):
    return np.sin(2 * np.pi * np.asarray(freq) * t).astype(np.float32)


def sweep(f0, f1, t):
    freq = np.linspace(f0, f1, len(t), dtype=np.float32)
    return np.sin(2 * np.pi * np.cumsum(freq) / SAMPLE_RATE).astype(np.float32)


def build_new_sfx() -> None:
    def land(t, rng):
        return tone(72, t) * np.exp(-t * 22) * 0.7 + rng.normal(0, 1, len(t)).astype(np.float32) * np.exp(-t * 55) * 0.3

    def whiff(t, rng):
        noise = rng.normal(0, 1, len(t)).astype(np.float32)
        filtered = np.convolve(noise, np.ones(22, dtype=np.float32) / 22, mode="same")
        return filtered * 0.5 * np.sin(np.pi * t / 0.16) + sweep(420, 170, t) * 0.16

    def combo(t, rng):
        out = np.zeros_like(t)
        for i, f in enumerate((660, 880, 1175)):
            gate = (t >= i * 0.055) & (t < i * 0.055 + 0.1)
            out[gate] += tone(f, t[gate]) * 0.32
        return out

    def ko(t, rng):
        return (sweep(180, 52, t) * 0.5 + tone(58, t) * 0.35
                + rng.normal(0, 1, len(t)).astype(np.float32) * np.exp(-t * 8) * 0.12)

    synth("land", 0.18, land)
    synth("whiff", 0.16, whiff)
    synth("combo", 0.26, combo)
    synth("ko", 0.7, ko)


# --- Generated TypeScript animation definitions -------------------------

def write_constants(frames: dict[str, list[int]]) -> None:
    lines = [
        "/**",
        " * GENERATED by assets_work/process_overhaul_assets.py - do not edit by hand.",
        " * Every entry points at genuinely different rendered skeleton poses.",
        " * Frame indices, rates, loops and durations mirror the sheet exactly.",
        " */",
        "",
        "export const FIGHTER_FRAME = {",
        f"  width: {CW},",
        f"  height: {CH},",
        f"  columns: {COLS},",
        f"  rows: {ROWS},",
        "} as const;",
        "",
        "export interface FighterAnimationDef {",
        "  frames: readonly number[];",
        "  fps: number;",
        "  repeat: number;",
        "  /** Whole-animation playback time in milliseconds. */",
        "  durationMs: number;",
        "  description: string;",
        "}",
        "",
        "export const FIGHTER_ANIMATIONS = {",
    ]
    for name in ANIM_ORDER:
        count, fps, repeat, description = ANIM_META[name]
        duration = round(count * 1000 / fps)
        indices = ", ".join(str(i) for i in frames[name])
        lines.append(
            f"  {name}: {{ frames: [{indices}], fps: {fps}, repeat: {repeat}, "
            f"durationMs: {duration}, description: '{description}' }},"
        )
    lines += [
        "} as const;",
        "",
        "export type FighterAnimationName = keyof typeof FIGHTER_ANIMATIONS;",
        "",
        f"export const FIGHTER_FRAME_COUNT = {sum(len(v) for v in frames.values())};",
        "",
        "export const FIGHTER_ANIMATION_NAMES = Object.keys(FIGHTER_ANIMATIONS) as FighterAnimationName[];",
        "",
    ]
    CONSTANTS.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    first_frames: dict[str, list[int]] = {}
    roster_preview = Image.new("RGB", (CW * 7 * 2 + 8 * 8, CH * 2 + 34), "#101014")
    d = ImageDraw.Draw(roster_preview)
    for index, (character_id, design) in enumerate(DESIGNS.items()):
        amp, victory_style = MOTION[character_id]
        sheet, frames, idle = build_sheet(character_id)
        sheet.save(SHEET_DIR / f"fight_{character_id}.png", optimize=True)
        build_portrait(idle).save(PORTRAIT_DIR / f"portrait_{character_id}.png", optimize=True)
        top, bottom, accent = PLATE[character_id]
        build_card(idle, top, bottom, accent, 4200 + index).save(
            CARD_DIR / f"card_{character_id}.png", optimize=True
        )
        build_showcase(idle).save(SHOW_DIR / f"show_{character_id}.png", optimize=True)
        if not first_frames:
            first_frames = frames
        bg = Image.new("RGBA", (CW, CH), (27, 27, 34, 255))
        bg.alpha_composite(idle)
        big = bg.convert("RGB").resize((CW * 2, CH * 2), Image.Resampling.NEAREST)
        x = 8 + index * (CW * 2 + 8)
        roster_preview.paste(big, (x, 24))
        d.text((x, 8), design.get("special", character_id).upper(), fill="#FFC247")
        print(f"{character_id:10s} {sum(len(v) for v in frames.values())} frames, "
              f"{len(frames)} animations, sheet={sheet.size}")
    roster_preview.save(PREVIEW / "overhaul_roster.png")

    # Animation strip: every frame of five representative animations for Kenji.
    sheet = Image.open(SHEET_DIR / "fight_kenji.png").convert("RGBA")
    strip_names = ["idle", "walk_forward", "light_punch", "special", "knockdown", "victory"]
    max_count = max(len(first_frames[n]) for n in strip_names)
    strip = Image.new("RGB", (CW * max_count, (CH + 18) * len(strip_names)), "#101014")
    ds = ImageDraw.Draw(strip)
    for row, name in enumerate(strip_names):
        y = row * (CH + 18)
        ds.text((4, y + 3), name, fill="#FFC247")
        for col, frame_index in enumerate(first_frames[name]):
            cell = sheet.crop(((frame_index % COLS) * CW, (frame_index // COLS) * CH,
                               (frame_index % COLS) * CW + CW, (frame_index // COLS) * CH + CH))
            bg = Image.new("RGBA", (CW, CH), (27, 27, 34, 255))
            bg.alpha_composite(cell)
            strip.paste(bg.convert("RGB"), (col * CW, y + 16))
    strip.save(PREVIEW / "overhaul_animation_strip.png")

    # Loading-screen fighters use the SAME new rig artwork (2x, no distortion).
    for character_id in ("kenji", "shadow"):
        idle = render_frame(character_id, build_all(character_id)[0][1][0])
        idle.resize((CW * 2, CH * 2), Image.Resampling.NEAREST).save(
            SHEET_DIR / f"{character_id}.png", optimize=True
        )

    build_new_sfx()
    write_constants(first_frames)
    print(f"constants -> {CONSTANTS}")
    print("new sfx  -> land, whiff, combo, ko")


if __name__ == "__main__":
    main()
