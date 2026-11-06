"""Phase 2 asset pipeline (run with the /tmp/fa-venv python).

Turns the raw AI-generated pixel-art plates into crisp, 640x360-native game
assets: chroma-key cutouts, nearest-neighbour downsampling, palette grading and
procedurally drawn pixel FX textures. Also emits a composite layout preview.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets_work"
OUT = ROOT / "public" / "assets"
W, H = 640, 360

# ---------------------------------------------------------------------------
# Chroma key
# ---------------------------------------------------------------------------


def key_color(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    corners = np.concatenate(
        [
            a[:16, :16].reshape(-1, 3),
            a[:16, -16:].reshape(-1, 3),
            a[-16:, :16].reshape(-1, 3),
            a[-16:, -16:].reshape(-1, 3),
        ]
    )
    return np.median(corners, axis=0)


def chroma_key(im: Image.Image) -> Image.Image:
    """Remove the green plate, estimating partial alpha on antialiased edges."""
    rgb = np.asarray(im.convert("RGB"), dtype=np.float32)
    key = key_color(im)
    k_gray = float(key[1])
    max_rb = np.maximum(rgb[..., 0], rgb[..., 2])
    green_dom = rgb[..., 1] - max_rb

    # Fully opaque when green isn't dominant; fully clear on pure plate.
    t0, t1 = 8.0, 105.0
    alpha = np.clip((t1 - green_dom) / (t1 - t0), 0.0, 1.0)
    # The plate is bright; dark near-black pixels are never plate.
    alpha = np.where(rgb[..., 1] < k_gray * 0.42, 1.0, alpha)
    alpha[alpha < 0.06] = 0.0

    # Un-premultiply against the measured plate colour and despill.
    a = np.maximum(alpha, 1e-3)
    clean = np.empty_like(rgb)
    for c in range(3):
        clean[..., c] = (rgb[..., c] - (1.0 - alpha) * key[c]) / a
    clean[..., 1] = np.minimum(clean[..., 1], np.maximum(clean[..., 0], clean[..., 2]) + 14)
    clean = np.clip(clean, 0, 255)

    rgba = np.dstack([clean, alpha * 255.0]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def cutout(path: Path) -> Image.Image:
    im = chroma_key(Image.open(path).convert("RGB"))
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"empty cutout: {path}")
    l, t, r, b = bbox
    return im.crop((max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2)))


def pixel_resize(im: Image.Image, w: int, h: int) -> Image.Image:
    """Nearest-neighbour downsample so every edge stays a hard pixel edge."""
    return im.resize((w, h), Image.Resampling.NEAREST)


def fit(im: Image.Image, width: int | None = None, height: int | None = None) -> Image.Image:
    ratio = im.width / im.height
    if width is not None:
        height = max(1, round(width / ratio))
    elif height is not None:
        width = max(1, round(height * ratio))
    return pixel_resize(im, int(width), int(height))


# ---------------------------------------------------------------------------
# Colour grading (gentle, keeps the generated palette but unifies the screen)
# ---------------------------------------------------------------------------


def grade(im: Image.Image, saturation: float = 1.06, contrast: float = 1.04) -> Image.Image:
    a = np.asarray(im.convert("RGBA"), dtype=np.float32)
    rgb = a[..., :3]
    luma = rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114
    rgb = luma[..., None] + (rgb - luma[..., None]) * saturation
    rgb = (rgb - 127.5) * contrast + 127.5
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


# ---------------------------------------------------------------------------
# Procedural pixel FX (authored at 1x, no antialiasing anywhere)
# ---------------------------------------------------------------------------


def make_glow(size: int = 128) -> Image.Image:
    """White radial falloff: tintable with Phaser setTint + ADD blending."""
    yy, xx = np.mgrid[0:size, 0:size]
    d = np.sqrt((xx - (size - 1) / 2) ** 2 + (yy - (size - 1) / 2) ** 2) / (size / 2)
    fall = np.clip(1.0 - d, 0, 1) ** 2.1
    # Quantise to 16 steps so it reads as pixel art rather than a soft blur.
    fall = np.round(fall * 15) / 15
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[..., 0:3] = 255
    rgba[..., 3] = (fall * 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def make_petal() -> Image.Image:
    """7x7 white petal silhouette; runtime tint supplies the pink shades."""
    rows = [
        "..###..",
        ".#####.",
        "#######",
        "#######",
        ".#####.",
        "..###..",
        "...#...",
    ]
    im = Image.new("RGBA", (7, 7), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "#":
                v = 255 if (x + y) % 3 else 214
                px[x, y] = (v, v, v, 255 if ch == "#" else 0)
    return im


def make_ember() -> Image.Image:
    rows = [".###.", "#####", "#####", ".###."]
    im = Image.new("RGBA", (5, 4), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "#":
                px[x, y] = (255, 255, 255, 255)
    return im


def make_flames(frame_w: int = 16, frame_h: int = 24, frames: int = 4) -> Image.Image:
    """Tiny 4-frame brazier flame sheet, real pixel shapes, warm palette."""
    sheet = Image.new("RGBA", (frame_w * frames, frame_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(sheet)
    cols = [
        (255, 194, 71, 255),   # gold
        (255, 138, 0, 255),    # orange
        (255, 90, 0, 255),     # #FF5A00
        (217, 54, 0, 255),     # #D93600
    ]
    for f in range(frames):
        ox = f * frame_w
        sway = (f - 1.5) * 1.1
        # outer flame
        d.polygon(
            [
                (ox + 8 + sway, 2),
                (ox + 13 + sway * 0.4, 11),
                (ox + 13, 21),
                (ox + 8, 23),
                (ox + 3, 21),
                (ox + 3 - sway * 0.4, 11),
            ],
            fill=cols[3],
        )
        # mid flame
        d.polygon(
            [
                (ox + 8 - sway * 0.5, 6 + f % 2),
                (ox + 11, 15),
                (ox + 8, 22),
                (ox + 5, 15),
            ],
            fill=cols[2],
        )
        # hot core
        d.polygon(
            [(ox + 8 + sway * 0.3, 10), (ox + 10, 17), (ox + 8, 22), (ox + 6, 17)],
            fill=cols[0],
        )
        d.point((ox + 8, 19), fill=(255, 255, 255, 255))
        # a spark
        d.point((ox + 11 + (f % 2), 4 + (f % 3)), fill=cols[1])
    return sheet


def hue_shift(im: Image.Image, shift: float) -> Image.Image:
    """Re-colour the warm flame sheet into the violet spirit-flame variant."""
    rgba = np.asarray(im.convert("RGBA"), dtype=np.uint8).copy()
    hsv = np.asarray(Image.fromarray(rgba[..., :3], "RGB").convert("HSV"), dtype=np.float32)
    hsv[..., 0] = (hsv[..., 0] + shift) % 256
    rgb = np.asarray(Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB"), dtype=np.uint8)
    out = np.dstack([rgb, rgba[..., 3]])
    return Image.fromarray(out, "RGBA")


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------


def main() -> None:
    (OUT / "arenas" / "backgrounds").mkdir(parents=True, exist_ok=True)
    (OUT / "characters" / "spritesheets").mkdir(parents=True, exist_ok=True)
    (OUT / "ui").mkdir(parents=True, exist_ok=True)
    (OUT / "fonts").mkdir(parents=True, exist_ok=True)
    (OUT / "audio" / "music").mkdir(parents=True, exist_ok=True)
    preview_dir = ROOT / "assets_work" / "preview"
    preview_dir.mkdir(parents=True, exist_ok=True)

    # --- full-screen background -------------------------------------------
    bg = pixel_resize(Image.open(SRC / "arena_background.png").convert("RGB"), W, H)
    bg = grade(bg.convert("RGBA"), saturation=1.08, contrast=1.05).convert("RGB")
    bg.save(OUT / "arenas" / "backgrounds" / "arena_night.png", optimize=True)

    # --- cutouts -----------------------------------------------------------
    specs = [
        ("kenji.png", "characters/spritesheets/kenji.png", ("height", 214), 1.10),
        ("shadow.png", "characters/spritesheets/shadow.png", ("height", 214), 1.10),
        ("logo.png", "ui/logo_fighters_arena.png", ("width", 300), 1.06),
        ("clouds.png", "arenas/backgrounds/cloud_bank.png", ("width", 360), 0.94),
    ]
    processed: dict[str, Image.Image] = {}
    for src, dest, (mode, value), sat in specs:
        cut = cutout(SRC / src)
        kwargs = {mode: value}
        small = fit(cut, **kwargs)
        small = grade(small, saturation=sat, contrast=1.05)
        small.save(OUT / dest, optimize=True)
        processed[src] = small
        print(f"{src:24s} cut={cut.size} -> {small.size}  {dest}")

    # --- procedural FX -----------------------------------------------------
    make_glow().save(OUT / "ui" / "glow.png", optimize=True)
    make_petal().save(OUT / "ui" / "petal.png", optimize=True)
    make_ember().save(OUT / "ui" / "ember.png", optimize=True)
    warm = make_flames()
    warm.save(OUT / "arenas" / "backgrounds" / "flames.png", optimize=True)
    hue_shift(warm, 168).save(OUT / "arenas" / "backgrounds" / "flames_violet.png", optimize=True)

    # --- layout preview (2x, so it is easy to eyeball) ---------------------
    S = 2
    canvas = Image.new("RGBA", (W * S, H * S), (16, 16, 20, 255))
    canvas.alpha_composite(pixel_resize(bg.convert("RGBA"), W * S, H * S))

    def put(img: Image.Image, cx: float, cy: float, alpha: float = 1.0, tint=None):
        im = pixel_resize(img, img.width * S, img.height * S)
        if tint is not None:
            a = np.asarray(im, dtype=np.float32).copy()
            a[..., 0] *= tint[0] / 255
            a[..., 1] *= tint[1] / 255
            a[..., 2] *= tint[2] / 255
            im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")
        if alpha < 1.0:
            a = np.asarray(im, dtype=np.float32).copy()
            a[..., 3] *= alpha
            im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")
        x = round(cx * S - im.width / 2)
        y = round(cy * S - im.height / 2)
        canvas.alpha_composite(im, (x, y))

    glow = Image.open(OUT / "ui" / "glow.png")
    put(pixel_resize(glow, 220, 170), 320, 52, alpha=0.22, tint=(255, 226, 176))
    put(pixel_resize(glow, 300, 220), 55, 240, alpha=0.26, tint=(255, 90, 0))
    put(pixel_resize(glow, 300, 220), 585, 240, alpha=0.28, tint=(139, 43, 226))

    clouds = processed["clouds.png"]
    put(fit(clouds, width=330), 130, 142, alpha=0.26, tint=(150, 130, 205))
    put(fit(clouds, width=300), 520, 158, alpha=0.23, tint=(150, 130, 205))

    # brazier / spirit flames over the baked background flames
    warm = Image.open(OUT / "arenas" / "backgrounds" / "flames.png").crop((0, 0, 16, 24))
    violet = Image.open(OUT / "arenas" / "backgrounds" / "flames_violet.png").crop((16, 0, 32, 24))
    for x, y, im in [(50, 246, warm), (150, 232, warm), (470, 250, violet), (595, 252, violet)]:
        put(pixel_resize(glow, 54, 40), x, y, alpha=0.28, tint=(255, 140, 30) if im is warm else (160, 70, 255))
        put(im, x, y)

    put(processed["shadow.png"], 558, 230)
    put(processed["kenji.png"], 82, 226)
    put(processed["logo.png"], 320, 146)

    # progress bar
    d = ImageDraw.Draw(canvas)
    bx0, by0, bx1, by1 = (int(v * S) for v in (160, 284, 480, 306))
    d.rounded_rectangle((bx0 - 4 * S, by0 - 4 * S, bx1 + 4 * S, by1 + 4 * S), radius=7 * S, fill=(255, 140, 20, 40))
    d.rounded_rectangle((bx0 - 2, by0 - 2, bx1 + 2, by1 + 2), radius=6 * S, fill=(16, 16, 20, 240), outline=(255, 194, 71, 210), width=2)
    d.rounded_rectangle((bx0, by0, bx1, by1), radius=4 * S, fill=(27, 27, 34, 255), outline=(150, 140, 160, 255), width=1)
    fw = round((bx1 - bx0 - 8 * S) * 0.70)
    d.rounded_rectangle((bx0 + 4 * S, by0 + 4 * S, bx0 + 4 * S + fw, by1 - 4 * S), radius=2 * S, fill=(255, 150, 0, 255))
    d.rectangle((bx0 + 4 * S, by0 + 4 * S, bx0 + 4 * S + fw, by0 + 7 * S), fill=(255, 205, 90, 120))

    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    pct_font = ImageFont.truetype(font_path, 25 * S)
    tip_font = ImageFont.truetype(font_path, 11 * S)
    d.text((320 * S, 264 * S), "70%", font=pct_font, fill=(255, 255, 255, 255), anchor="mm", stroke_width=2 * S, stroke_fill=(20, 12, 30, 255))
    tip_label, tip_body = "TIP: ", "Use Special Attacks for maximum damage!"
    lw = d.textlength(tip_label, font=tip_font)
    bw = d.textlength(tip_body, font=tip_font)
    tx = 320 * S - (lw + bw) / 2
    d.text((tx, 326 * S), tip_label, font=tip_font, fill=(255, 194, 71, 255), anchor="lm")
    d.text((tx + lw, 326 * S), tip_body, font=tip_font, fill=(245, 240, 250, 255), anchor="lm")
    # diamond ornaments + rules
    for dx in (148, 492):
        cx, cy, r = dx * S, 326 * S, 4 * S
        d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=(255, 194, 71, 255))
    d.line((158 * S, 326 * S, 188 * S, 326 * S), fill=(255, 194, 71, 150), width=1)
    d.line((452 * S, 326 * S, 482 * S, 326 * S), fill=(255, 194, 71, 150), width=1)

    # falling petals
    petal = pixel_resize(Image.open(OUT / "ui" / "petal.png").convert("RGBA"), 5 * S, 5 * S)
    rng = np.random.default_rng(7)
    for _ in range(26):
        x = rng.uniform(10, W - 10)
        y = rng.uniform(4, H - 40)
        p = petal.copy()
        a = np.asarray(p, dtype=np.float32).copy()
        c = [(255, 130, 190), (240, 90, 165), (200, 70, 140)][int(rng.integers(0, 3))]
        a[..., 0] *= c[0] / 255
        a[..., 1] *= c[1] / 255
        a[..., 2] *= c[2] / 255
        a[..., 3] *= 0.75
        p = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")
        canvas.alpha_composite(p, (round(x * S), round(y * S)))

    canvas.convert("RGB").save(preview_dir / "loading_preview.png")
    print("\npreview ->", preview_dir / "loading_preview.png")
    for p in sorted(OUT.rglob("*.png")):
        print(f"  {p.relative_to(OUT)}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
