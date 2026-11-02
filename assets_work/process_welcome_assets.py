"""Phase 3 asset pipeline (run with the /tmp/fa-venv python).

Produces:
  * public/assets/arenas/backgrounds/welcome_courtyard.png  (640x360 plate)
  * public/assets/ui/menu_icons.png                         (7 x 24x24 sheet)
  * assets_work/preview/welcome_icons.png                   (4x icon inspection)
  * assets_work/preview/welcome_preview.png                 (1280x720 layout check)

The source plate is an original illustration; it is downsampled with
nearest-neighbour filtering and gently graded to match the Phase 2 arena.
All icons are authored as real pixel shapes, not font glyphs or emoji.
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets_work"
OUT = ROOT / "public" / "assets"
PREVIEW = SRC / "preview"
W, H = 640, 360
ICON = 24
ICON_COUNT = 7
S = 2  # preview scale

WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
INK = (16, 16, 20, 255)


def grade(im: Image.Image, saturation: float = 1.08, contrast: float = 1.05) -> Image.Image:
    a = np.asarray(im.convert("RGBA"), dtype=np.float32)
    rgb = a[..., :3]
    luma = rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114
    rgb = luma[..., None] + (rgb - luma[..., None]) * saturation
    rgb = (rgb - 127.5) * contrast + 127.5
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def build_background() -> Image.Image:
    raw = Image.open(SRC / "welcome_courtyard.png").convert("RGB")
    small = raw.resize((W, H), Image.Resampling.NEAREST)
    bg = grade(small).convert("RGB")
    bg.save(OUT / "arenas" / "backgrounds" / "welcome_courtyard.png", optimize=True)
    return bg


# ---------------------------------------------------------------------------
# Pixel icons. Each frame is a 24x24 white silhouette on transparency; Phaser
# tints them per context (white for the menu, gold/orange for the corner HUD).
# ---------------------------------------------------------------------------


def outline(frame: Image.Image) -> Image.Image:
    """Add a 1px dark rim so white icons stay legible on the orange PLAY bar."""
    a = np.asarray(frame.getchannel("A"), dtype=np.uint8)
    dilated = a.copy()
    dilated[1:, :] = np.maximum(dilated[1:, :], a[:-1, :])
    dilated[:-1, :] = np.maximum(dilated[:-1, :], a[1:, :])
    dilated[:, 1:] = np.maximum(dilated[:, 1:], a[:, :-1])
    dilated[:, :-1] = np.maximum(dilated[:, :-1], a[:, 1:])
    rim = np.clip(dilated.astype(np.int16) - a.astype(np.int16), 0, 255).astype(np.uint8)
    base = np.zeros((ICON, ICON, 4), dtype=np.uint8)
    base[..., 0:3] = np.array(INK[:3], dtype=np.uint8)
    base[..., 3] = rim
    out = Image.fromarray(base, "RGBA")
    out.alpha_composite(frame)
    return out


def icon_play(d: ImageDraw.ImageDraw) -> None:
    d.polygon([(8, 4), (8, 20), (20, 12)], fill=WHITE)
    d.line([(9, 6), (9, 18)], fill=(214, 214, 224, 255), width=1)


def icon_settings(d: ImageDraw.ImageDraw) -> None:
    cx = cy = 12
    for i in range(8):
        ang = i * math.pi / 4
        # 4x4 tooth centred on a radius-8 ring.
        px, py = cx + math.cos(ang) * 8.2, cy + math.sin(ang) * 8.2
        d.rectangle([round(px - 2), round(py - 2), round(px + 2), round(py + 2)], fill=WHITE)
    d.ellipse([5, 5, 19, 19], fill=WHITE)
    d.ellipse([9, 9, 15, 15], fill=CLEAR)
    d.ellipse([4, 4, 20, 20], outline=WHITE, width=1)


def icon_trophy(d: ImageDraw.ImageDraw) -> None:
    # Handles.
    d.rectangle([3, 6, 7, 12], fill=WHITE)
    d.rectangle([4, 7, 6, 10], fill=CLEAR)
    d.rectangle([17, 6, 21, 12], fill=WHITE)
    d.rectangle([18, 7, 20, 10], fill=CLEAR)
    # Cup, stem, base.
    d.polygon([(7, 4), (17, 4), (16, 13), (12, 16), (8, 13)], fill=WHITE)
    d.rectangle([11, 15, 13, 19], fill=WHITE)
    d.rectangle([8, 19, 16, 21], fill=WHITE)
    d.rectangle([6, 21, 18, 23], fill=WHITE)
    # Cup rim highlight.
    d.line([(7, 5), (17, 5)], fill=(214, 214, 224, 255), width=1)


def icon_about(d: ImageDraw.ImageDraw) -> None:
    d.ellipse([4, 3, 20, 21], fill=WHITE)
    d.rectangle([11, 10, 13, 17], fill=CLEAR)
    d.ellipse([11, 6, 14, 9], fill=CLEAR)


def icon_quit(d: ImageDraw.ImageDraw) -> None:
    # Door frame (left three sides) plus an arrow leaving to the right.
    d.line([(10, 4), (4, 4), (4, 20), (10, 20)], fill=WHITE, width=2)
    d.polygon([(10, 10), (17, 10), (17, 7), (22, 12), (17, 17), (17, 14), (10, 14)], fill=WHITE)


def icon_volume(d: ImageDraw.ImageDraw) -> None:
    d.polygon([(3, 9), (7, 9), (11, 5), (11, 19), (7, 15), (3, 15)], fill=WHITE)
    d.arc([12, 7, 18, 17], start=-62, end=62, fill=WHITE, width=2)
    d.arc([13, 4, 22, 20], start=-62, end=62, fill=WHITE, width=2)


def icon_fullscreen(d: ImageDraw.ImageDraw) -> None:
    # Four outward corner brackets.
    d.line([(9, 4), (4, 4), (4, 9)], fill=WHITE, width=2)
    d.line([(15, 4), (20, 4), (20, 9)], fill=WHITE, width=2)
    d.line([(4, 15), (4, 20), (9, 20)], fill=WHITE, width=2)
    d.line([(20, 15), (20, 20), (15, 20)], fill=WHITE, width=2)
    d.polygon([(4, 4), (9, 4), (4, 9)], fill=WHITE)
    d.polygon([(20, 4), (20, 9), (15, 4)], fill=WHITE)
    d.polygon([(4, 20), (4, 15), (9, 20)], fill=WHITE)
    d.polygon([(20, 20), (15, 20), (20, 15)], fill=WHITE)


ICON_DRAWERS = [
    icon_play,
    icon_settings,
    icon_trophy,
    icon_about,
    icon_quit,
    icon_volume,
    icon_fullscreen,
]


def build_icons() -> Image.Image:
    sheet = Image.new("RGBA", (ICON * ICON_COUNT, ICON), CLEAR)
    for index, draw in enumerate(ICON_DRAWERS):
        frame = Image.new("RGBA", (ICON, ICON), CLEAR)
        draw(ImageDraw.Draw(frame))
        sheet.paste(outline(frame), (index * ICON, 0))
    sheet.save(OUT / "ui" / "menu_icons.png", optimize=True)
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.Resampling.NEAREST).save(
        PREVIEW / "welcome_icons.png"
    )
    return sheet


# ---------------------------------------------------------------------------
# Quick layout preview (2x native resolution). Uses a generic bold TTF only as
# a stand-in; the real screen uses the Rajdhani / Oxanium webfonts.
# ---------------------------------------------------------------------------


def octagon(d: ImageDraw.ImageDraw, x0: int, y0: int, x1: int, y1: int, c: int) -> list[tuple[int, int]]:
    return [
        (x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c),
        (x1 - c, y1), (x0 + c, y1), (x0, y1 - c), (x0, y0 + c),
    ]


def build_preview(bg: Image.Image, icons: Image.Image) -> None:
    p = bg.resize((W * S, H * S), Image.Resampling.NEAREST).convert("RGBA")
    d = ImageDraw.Draw(p)

    def place(img: Image.Image, cx: float, cy: float, ow: float) -> None:
        ratio = ow / img.width
        size = (max(1, round(img.width * ratio * S)), max(1, round(img.height * ratio * S)))
        rs = img.resize(size, Image.Resampling.NEAREST)
        p.alpha_composite(rs, (round(cx * S - size[0] / 2), round(cy * S - size[1] / 2)))

    # Moon glow.
    glow = Image.new("RGBA", (W, H), CLEAR)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([232, -52, 408, 124], fill=(255, 226, 176, 38))
    place(glow, 320, 36, 176)

    place(Image.open(OUT / "characters" / "spritesheets" / "kenji.png").convert("RGBA"), 108, 240, 254)
    place(Image.open(OUT / "characters" / "spritesheets" / "shadow.png").convert("RGBA"), 532, 240, 273)
    place(Image.open(OUT / "ui" / "logo_fighters_arena.png").convert("RGBA"), 320, 96, 250)

    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    label_font = ImageFont.truetype(font_path, 13 * S)
    small_font = ImageFont.truetype(font_path, 10 * S)

    buttons = [
        ("PLAY", 184, 32, True),
        ("SETTINGS", 218, 26, False),
        ("LEADERBOARD", 247, 26, False),
        ("ABOUT", 276, 26, False),
        ("QUIT", 305, 26, False),
    ]
    for i, (label, cy, bh, primary) in enumerate(buttons):
        bw = 190 if primary else 186
        x0, y0, x1, y1 = round(320 - bw / 2), round(cy - bh / 2), round(320 + bw / 2), round(cy + bh / 2)
        pts = octagon(d, x0 * S, y0 * S, x1 * S, y1 * S, 7 * S)
        fill = (255, 90, 0, 255) if primary else (27, 27, 34, 245)
        d.polygon(pts, fill=fill)
        d.line(pts + [pts[0]], fill=(255, 194, 71, 255) if primary else (122, 112, 138, 255), width=2 * S)
        inner = octagon(d, x0 * S + 4 * S, y0 * S + 4 * S, x1 * S - 4 * S, y1 * S - 4 * S, 6 * S)
        d.line(inner + [inner[0]], fill=(255, 194, 71, 150) if primary else (74, 70, 88, 255), width=S)
        frame = icons.crop((i * ICON, 0, (i + 1) * ICON, ICON))
        p.alpha_composite(
            frame.resize((18 * S, 18 * S), Image.Resampling.NEAREST),
            ((x0 + 14) * S, round(cy * S - 9 * S)),
        )
        d.text((round(320 * S + 10 * S), round(cy * S)), label, font=label_font,
               fill=(255, 255, 255, 255), anchor="mm")

    # Corner HUD hexes.
    for cx, idx in ((566, 5), (610, 6)):
        pts = [(cx * S - 12 * S, 12 * S), (cx * S + 12 * S, 12 * S),
               (cx * S + 15 * S, 26 * S), (cx * S + 12 * S, 40 * S),
               (cx * S - 12 * S, 40 * S), (cx * S - 15 * S, 26 * S)]
        d.polygon(pts, fill=(27, 27, 34, 255))
        d.line(pts + [pts[0]], fill=(255, 194, 71, 255), width=2 * S)
        frame = icons.crop((idx * ICON, 0, (idx + 1) * ICON, ICON))
        p.alpha_composite(frame.resize((16 * S, 16 * S), Image.Resampling.NEAREST),
                          (cx * S - 8 * S, 18 * S))

    # Tagline banner.
    x0, y0, x1, y1 = 238 * S, 330 * S, 402 * S, 352 * S
    pts = octagon(d, x0, y0, x1, y1, 8 * S)
    d.polygon(pts, fill=(16, 16, 20, 235))
    d.line(pts + [pts[0]], fill=(255, 90, 0, 255), width=2 * S)
    d.text((320 * S, 341 * S), "FIGHT. WIN. BE LEGEND.", font=small_font,
           fill=(245, 240, 250, 255), anchor="mm")

    p.convert("RGB").save(PREVIEW / "welcome_preview.png")


def main() -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    bg = build_background()
    icons = build_icons()
    build_preview(bg, icons)
    print(f"background: {W}x{H}")
    print(f"icons: {ICON_COUNT} frames x {ICON}x{ICON} -> {OUT / 'ui' / 'menu_icons.png'}")
    print("preview: assets_work/preview/welcome_preview.png")


if __name__ == "__main__":
    main()
