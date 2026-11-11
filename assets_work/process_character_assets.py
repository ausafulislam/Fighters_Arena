#!/usr/bin/env python3
"""Build the Phase 5 character roster assets from the original illustrations.

Every illustration is drawn on a flat pure-green chroma-key field. This script
keys the green out with a despill + soft alpha edge, then produces:

  * a 2x-authored cut-corner CARD plate (one per fighter) with a themed
    vertical gradient, radial accent glow, sparse pixel streaks, a head-and-
    shoulders bust crop and a dark caption band;
  * a 2x-authored transparent SHOWCASE cutout used for the large left-side
    character artwork;
  * one transparent RANDOM silhouette for the right-side mystery pick.

Kenji and Shadow are re-keyed from their original Phase 2 plates, so their
established designs are byte-for-byte the same artwork. The other five fighters
and the mystery silhouette come from the original Phase 5 illustrations in
assets_work/. Output sizes are exactly 2x the logical Phaser dimensions, which
maps 1:1 onto the 1280 x 720 framebuffer under the integer camera zoom.

Run from the repository root:
  /tmp/fa-venv/bin/python assets_work/process_character_assets.py
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "assets_work"
OUT = ROOT / "public" / "assets" / "characters"
CARD_DIR = OUT / "cards"
SHOW_DIR = OUT / "showcase"
PREVIEW = WORK / "preview"
for directory in (CARD_DIR, SHOW_DIR, PREVIEW):
    directory.mkdir(parents=True, exist_ok=True)

CARD_W, CARD_H = 128, 152  # 2x logical 64 x 76
CARD_CUT = 10
SHOW_W, SHOW_H = 360, 400  # 2x logical 180 x 200
RANDOM_W, RANDOM_H = 300, 380  # 2x logical 150 x 190


def hexrgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


# id -> (source illustration, gradient top, gradient bottom, accent glow)
ROSTER: list[tuple[str, Path, str, str, str]] = [
    ("kenji", WORK / "kenji.png", "#7A2408", "#260A06", "#FF6A12"),
    ("shadow", WORK / "shadow.png", "#3B1468", "#140A28", "#A24BFF"),
    ("blaze", WORK / "fighter_blaze.png", "#8C2E08", "#2A0A08", "#FFB12E"),
    ("iron_fist", WORK / "fighter_iron_fist.png", "#184A32", "#0A1B14", "#53D08A"),
    ("storm", WORK / "fighter_storm.png", "#124A82", "#071A38", "#38BFFF"),
    ("raven", WORK / "fighter_raven.png", "#3A1B62", "#120A22", "#B36BFF"),
    ("titan", WORK / "fighter_titan.png", "#7A1E22", "#210A12", "#FF5A3C"),
]


def key_green(path: Path) -> Image.Image:
    """Remove the flat #00FF00 chroma field, despill fringes and crop."""
    src = Image.open(path).convert("RGB")
    rgb = np.asarray(src).astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    # A pixel belongs to the background only when it is bright green with low
    # red and blue. Character greens (Iron Fist's vest) are dark and survive.
    background = (g > 148) & (r < 124) & (b < 124) & (g > r + 70) & (g > b + 70)
    alpha = np.where(background, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.65))
    alpha = np.asarray(alpha_img).astype(np.float32) / 255.0

    # Despill: pull green back towards the red/blue average so antialiased
    # edges never leave a neon outline on the dark courtyard.
    greenish = (g > r + 18) & (g > b + 18) & ~background
    ceiling = ((r + b) / 2 + 26).astype(np.int16)
    g = np.where(greenish, np.minimum(g, ceiling), g)
    rgb = np.stack([r, g, b], axis=2).clip(0, 255).astype(np.uint8)
    rgba = np.dstack([rgb, (alpha * 255).clip(0, 255).astype(np.uint8)])

    cut = Image.fromarray(rgba, "RGBA")
    bbox = cut.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    if bbox is None:
        raise RuntimeError(f"Chroma key produced an empty cutout for {path.name}")
    return cut.crop(bbox)


def contain(src: Image.Image, box_w: int, box_h: int) -> Image.Image:
    """Fit without ever stretching or distorting the artwork."""
    scale = min(box_w / src.width, box_h / src.height)
    w, h = max(1, round(src.width * scale)), max(1, round(src.height * scale))
    return src.resize((w, h), Image.Resampling.LANCZOS)


def paste_centered(dst: Image.Image, src: Image.Image, cx: float, cy: float) -> None:
    dst.paste(src, (round(cx - src.width / 2), round(cy - src.height / 2)), src)


def cover(src: Image.Image, box_w: int, box_h: int, anchor_x: float = 0.5) -> Image.Image:
    """Crop-to-fill (no distortion), biased towards the head end vertically."""
    scale = max(box_w / src.width, box_h / src.height)
    w, h = max(box_w, round(src.width * scale)), max(box_h, round(src.height * scale))
    scaled = src.resize((w, h), Image.Resampling.LANCZOS)
    left = int(round((w - box_w) * anchor_x))
    return scaled.crop((left, 0, left + box_w, box_h))


def gradient(top: str, bottom: str, w: int, h: int) -> np.ndarray:
    a = np.asarray(hexrgb(top), dtype=np.float32)
    b = np.asarray(hexrgb(bottom), dtype=np.float32)
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
    plane = a[None, None, :] * (1.0 - t) + b[None, None, :] * t
    return np.broadcast_to(plane, (h, w, 3)).copy()


def radial_glow(w: int, h: int, color: str, strength: float) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w * 0.5) / (w * 0.62)) ** 2 + ((yy - h * 0.38) / (h * 0.6)) ** 2)
    falloff = np.clip(1.0 - d, 0.0, 1.0) ** 1.6
    c = np.asarray(hexrgb(color), dtype=np.float32)[None, None, :]
    return falloff[:, :, None] * c * strength


def pixel_streaks(w: int, h: int, color: str, seed: int) -> Image.Image:
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = np.random.default_rng(seed)
    c = hexrgb(color)
    for _ in range(12):
        x = int(rng.integers(-20, w))
        y = int(rng.integers(12, h - 42))
        length = int(rng.integers(16, 52))
        d.line([(x, y), (x + length, y + int(length * 0.5))], fill=(*c, int(rng.integers(10, 26))), width=1)
    for _ in range(26):
        d.point(
            (int(rng.integers(0, w)), int(rng.integers(0, h))),
            fill=(*c, int(rng.integers(18, 58))),
        )
    return layer


def cut_corner_mask(w: int, h: int, cut: int) -> Image.Image:
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(
        [
            (cut, 0), (w - cut, 0), (w, cut), (w, h - cut),
            (w - cut, h), (cut, h), (0, h - cut), (0, cut),
        ],
        fill=255,
    )
    return mask.filter(ImageFilter.GaussianBlur(0.4))


def build_card(cut: Image.Image, top: str, bottom: str, accent: str, seed: int) -> Image.Image:
    base = gradient(top, bottom, CARD_W, CARD_H) + radial_glow(CARD_W, CARD_H, accent, 0.34)
    plate = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    plate.alpha_composite(pixel_streaks(CARD_W, CARD_H, accent, seed))

    # Tight head-and-shoulders portrait: take the upper half of the fighter,
    # trim the wide energy arcs at the sides, then cover-fit so the face fills
    # the plate instead of reading as a tiny full-body figure.
    left = int(cut.width * 0.2)
    right = int(cut.width * 0.8)
    bottom = int(cut.height * 0.5)
    bust = cut.crop((left, 0, right, bottom))
    bust = cover(bust, CARD_W - 4, 118, anchor_x=0.54)
    plate.paste(bust, (2, 0), bust)

    # Dark caption band keeps the Phaser-rendered name readable.
    band = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    for y in range(96, CARD_H):
        t = (y - 96) / (CARD_H - 96)
        bd.line([(0, y), (CARD_W, y)], fill=(9, 7, 16, int(90 + 150 * t)))
    plate.alpha_composite(band)

    # Slim accent line above the caption band.
    bd = ImageDraw.Draw(plate)
    bd.line([(8, 98), (CARD_W - 8, 98)], fill=(*hexrgb(accent), 130), width=1)

    plate.putalpha(Image.composite(plate.getchannel("A"), Image.new("L", (CARD_W, CARD_H), 0), cut_corner_mask(CARD_W, CARD_H, CARD_CUT)))
    return plate


def build_showcase(cut: Image.Image, w: int, h: int) -> Image.Image:
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    art = contain(cut, w - 8, h - 10)
    paste_centered(canvas, art, w / 2, h - art.height / 2 - 4)
    return canvas


def main() -> None:
    tiles: list[Image.Image] = []
    for index, (name, source, top, bottom, accent) in enumerate(ROSTER):
        cut = key_green(source)
        card = build_card(cut, top, bottom, accent, 1000 + index)
        card.save(CARD_DIR / f"card_{name}.png")
        show = build_showcase(cut, SHOW_W, SHOW_H)
        show.save(SHOW_DIR / f"show_{name}.png")
        print(f"{name:10s} cutout={cut.size} card={card.size} showcase={show.size}")
        tiles.append(card)

    mystery = key_green(WORK / "random_silhouette.png")
    random_art = build_showcase(mystery, RANDOM_W, RANDOM_H)
    random_art.save(OUT / "random_silhouette.png")
    print(f"random     cutout={mystery.size} showcase={random_art.size}")

    # Contact sheet for visual review (gitignored working output).
    sheet = Image.new("RGB", (CARD_W * 7 + 16 * 8, CARD_H + SHOW_H + 48), "#101014")
    d = ImageDraw.Draw(sheet)
    for i, (name, _, _, _, _) in enumerate(ROSTER):
        x = 16 + i * (CARD_W + 16)
        sheet.paste(Image.open(CARD_DIR / f"card_{name}.png").convert("RGB"), (x, 16))
        show = Image.open(SHOW_DIR / f"show_{name}.png").convert("RGBA")
        bg = Image.new("RGBA", show.size, "#1B1B22")
        bg.alpha_composite(show)
        sheet.paste(bg.convert("RGB").resize((CARD_W, SHOW_H // 3)), (x, CARD_H + 32))
        d.text((x, CARD_H + 20), name.upper(), fill="#FFC247")
    sheet.save(PREVIEW / "p5_character_assets.png")
    print(f"preview -> {PREVIEW / 'p5_character_assets.png'}")


if __name__ == "__main__":
    main()
