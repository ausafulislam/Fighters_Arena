#!/usr/bin/env python3
"""Build the four Game Mode Selection card plates for Phase 4.

The plates are authored at 2x the logical card size (134 x 184 -> 268 x 368)
so they map 1:1 onto the 1280 x 720 render canvas. Each plate is a separate
layered asset: a graded arcade backdrop, an accent radial glow, faint pixel
streaks, one character illustration, a bottom shade for the title band and an
octagon (cut-corner) alpha mask.

Sources:
  - Kenji / Shadow: the exact Phase 2 cutouts (RGBA, unchanged designs).
  - Versus / Survival: original Phase 4 illustrations generated for this screen.

Run from the repository root:
  /tmp/fa-venv/bin/python assets_work/process_game_mode_assets.py
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "assets_work"
OUT = ROOT / "public" / "assets" / "cards"
PREVIEW = WORK / "preview"

W, H = 268, 368  # 2x logical card size
CUT = 18  # 2x of the 9 px logical corner cut


def hexrgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def gradient(top: str, bottom: str) -> np.ndarray:
    """Vertical RGB gradient as a float array."""
    a = np.asarray(hexrgb(top), dtype=np.float32)
    b = np.asarray(hexrgb(bottom), dtype=np.float32)
    t = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None, None]
    plane = a[None, None, :] * (1.0 - t) + b[None, None, :] * t
    return np.broadcast_to(plane, (H, W, 3)).copy()


def radial_glow(cx: float, cy: float, radius: float, color: str, strength: float) -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - cx) / radius) ** 2 + ((yy - cy) / (radius * 1.25)) ** 2)
    falloff = np.clip(1.0 - d, 0.0, 1.0) ** 1.7
    c = np.asarray(hexrgb(color), dtype=np.float32)[None, None, :]
    return falloff[:, :, None] * c * strength


def pixel_streaks(color: str, seed: int) -> Image.Image:
    """A few hard-edged diagonal streaks; deliberately sparse, not noisy."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = np.random.default_rng(seed)
    c = hexrgb(color)
    for _ in range(16):
        x = int(rng.integers(-40, W))
        y = int(rng.integers(30, H - 70))
        length = int(rng.integers(26, 92))
        alpha = int(rng.integers(10, 30))
        width = 1 if rng.random() < 0.7 else 2
        d.line([(x, y), (x + length, y + int(length * 0.52))], fill=(*c, alpha), width=width)
    for _ in range(34):
        x = int(rng.integers(0, W))
        y = int(rng.integers(0, H))
        d.point((x, y), fill=(*c, int(rng.integers(20, 65))))
    return layer


def cut_corner_mask() -> Image.Image:
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(
        [
            (CUT, 0),
            (W - CUT, 0),
            (W, CUT),
            (W, H - CUT),
            (W - CUT, H),
            (CUT, H),
            (0, H - CUT),
            (0, CUT),
        ],
        fill=255,
    )
    return mask


def feather_mask(size: tuple[int, int], feather: int) -> Image.Image:
    w, h = size
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rectangle((feather, feather, w - feather, h - feather), fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather * 0.62))


def contain_box(crop, box) -> tuple[int, int, int, int]:
    """Fit a crop inside a target area without ever distorting its aspect."""
    cw, ch = crop[2] - crop[0], crop[3] - crop[1]
    tw, th = box[2] - box[0], box[3] - box[1]
    scale = min(tw / cw, th / ch)
    w, h = max(1, round(cw * scale)), max(1, round(ch * scale))
    x = box[0] + (tw - w) // 2
    y = box[1]  # top-anchored so heads stay near the top of the card
    return (x, y, x + w, y + h)


def paste_cutout(plate: Image.Image, src: Image.Image, crop, box, alpha_scale=1.0) -> None:
    """Paste an RGBA character cutout, preserving its own alpha and aspect."""
    piece = src.crop(crop).convert("RGBA")
    fitted = contain_box(crop, box)
    piece = piece.resize((fitted[2] - fitted[0], fitted[3] - fitted[1]), Image.Resampling.LANCZOS)
    if alpha_scale != 1.0:
        a = piece.getchannel("A").point(lambda v: int(v * alpha_scale))
        piece.putalpha(a)
    plate.alpha_composite(piece, (fitted[0], fitted[1]))


def paste_plate(plate: Image.Image, src: Image.Image, crop, box) -> None:
    """Paste a generated illustration with feathered edges (near-black ground)."""
    piece = src.crop(crop).convert("RGBA")
    fitted = contain_box(crop, box)
    tw, th = fitted[2] - fitted[0], fitted[3] - fitted[1]
    piece = piece.resize((tw, th), Image.Resampling.LANCZOS)
    piece.putalpha(feather_mask((tw, th), 30))
    plate.alpha_composite(piece, (fitted[0], fitted[1]))


CARDS = [
    {
        "id": "battle",
        "top": "#5a1607",
        "bottom": "#1a0a0b",
        "glow": "#ff5a00",
        "glow_at": (134, 150),
        "streak": "#ffc247",
        "source": ROOT / "public/assets/characters/spritesheets/kenji.png",
        "crop": (26, 0, 236, 200),
        "box": (9, 10, 259, 300),
        "kind": "cutout",
        "seed": 11,
    },
    {
        "id": "tournament",
        "top": "#330b58",
        "bottom": "#12081d",
        "glow": "#8b2be2",
        "glow_at": (134, 150),
        "streak": "#c47bff",
        "source": ROOT / "public/assets/characters/spritesheets/shadow.png",
        "crop": (28, 0, 256, 200),
        "box": (9, 12, 259, 300),
        "kind": "cutout",
        "seed": 23,
    },
    {
        "id": "versus",
        "top": "#093a72",
        "bottom": "#061224",
        "glow": "#2a9dff",
        "glow_at": (134, 150),
        "streak": "#7fd4ff",
        "source": WORK / "versus_fighter.png",
        "crop": (380, 0, 1090, 768),
        "box": (9, 4, 259, 302),
        "kind": "plate",
        "seed": 37,
    },
    {
        "id": "survival",
        "top": "#4a0a20",
        "bottom": "#16091b",
        "glow": "#ff3b2e",
        "glow_at": (134, 160),
        "streak": "#ff8a3d",
        "source": WORK / "survival_fighter.png",
        "crop": (330, 0, 1080, 768),
        "box": (9, 6, 259, 302),
        "kind": "plate",
        "seed": 49,
    },
]


def build_card(spec: dict) -> Image.Image:
    arr = gradient(spec["top"], spec["bottom"])
    arr += radial_glow(*spec["glow_at"], 150.0, spec["glow"], 0.72)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    plate = Image.fromarray(arr, "RGB").convert("RGBA")
    plate.alpha_composite(pixel_streaks(spec["streak"], spec["seed"]))

    src = Image.open(spec["source"])
    if spec["kind"] == "cutout":
        paste_cutout(plate, src, spec["crop"], spec["box"])
    else:
        paste_plate(plate, src, spec["crop"], spec["box"])

    # Bottom shade keeps the icon and title perfectly legible.
    yy = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]
    ramp = np.clip((yy - 0.50) / 0.50, 0.0, 1.0)
    shade = np.zeros((H, W, 4), dtype=np.uint8)
    shade[:, :, :3] = np.asarray(hexrgb("#0b0810"), dtype=np.uint8)
    shade[:, :, 3] = np.repeat((58 + ramp * 180).astype(np.uint8), W, axis=1)
    shade_img = Image.fromarray(shade, "RGBA")
    plate.alpha_composite(shade_img)

    plate.putalpha(Image.composite(plate.getchannel("A"), Image.new("L", (W, H), 0), cut_corner_mask()))
    return plate


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)

    plates: list[Image.Image] = []
    for spec in CARDS:
        plate = build_card(spec)
        target = OUT / f"card_{spec['id']}.png"
        plate.save(target, optimize=True)
        plates.append(plate)
        print(f"{target.relative_to(ROOT)}  {plate.size}  {target.stat().st_size} bytes")

    gap = 18
    sheet = Image.new("RGB", (W * 4 + gap * 5, H + gap * 2), (16, 16, 20))
    for i, plate in enumerate(plates):
        sheet.paste(plate.convert("RGB"), (gap + i * (W + gap), gap))
    sheet.save(PREVIEW / "p4_cards_preview.png")
    print(f"preview -> {PREVIEW / 'p4_cards_preview.png'}")


if __name__ == "__main__":
    main()
