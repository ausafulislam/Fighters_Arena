#!/usr/bin/env python3
"""Procedural pixel-art fighter rig for FIGHTER'S ARENA.

This module is the art pipeline, not runtime game code. It draws a fighter from
a real skeleton (hip, shoulders, elbows, wrists, knees, ankles) using shaped,
outlined, three-tone shaded polygons. Every animation frame is rendered from a
distinct joint pose, so limbs actually move between frames. No frame is a
scaled / rotated / tinted copy of a static illustration.

The output of ``render_frame`` is a transparent 120 x 112 RGBA cell. Phaser
loads the cells as a spritesheet and plays them with real ``anims``. One cell
pixel maps to exactly 2 x 2 framebuffer pixels under the game's integer camera
zoom, so the pixel density is constant.

Character designs are separate per fighter: different proportions, hair,
headwear, clothing construction, accessories, palettes and special-attack
graphics. Kenji and Shadow deliberately keep their established identities
(Kenji: red gi / brown spiky hair / orange; Shadow: purple hooded ninja / mask).
"""

from __future__ import annotations

import math
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Canvas and skeleton
# ---------------------------------------------------------------------------

CW, CH = 120, 112  # one sprite-sheet cell == one authored frame
CX = 60.0  # fighter centre line (also the logical x of the physics body)
FEET_Y = 111.0  # feet sit on the very last row, so origin(0.5, 1) == ground

Pose = dict[str, Any]

# Base fighting guard. All poses are derived from this skeleton so proportions
# never change between animations or between characters beyond explicit design
# multipliers.
BASE: Pose = {
    "hip": (60.0, 64.0),
    "shoulder": (60.0, 36.0),
    "neck": (60.0, 30.0),
    "head": (60.0, 21.0),
    "head_tilt": 0.0,
    "lean": 0.0,
    # near-side (right) arm / leg
    "fs": (66.0, 38.0),
    "fe": (72.0, 51.0),
    "fw": (70.0, 34.0),
    "fh": (63.0, 64.0),
    "fk": (70.0, 84.0),
    "fa": (76.0, 106.0),
    "ft": (85.0, 110.0),
    # far-side (left) arm / leg
    "bs": (54.0, 38.0),
    "be": (48.0, 51.0),
    "bw": (57.0, 32.0),
    "bh": (56.0, 64.0),
    "bk": (48.0, 84.0),
    "ba": (41.0, 106.0),
    "bt": (32.0, 110.0),
    # extra render hints
    "vfx": 0.0,  # 0..1 special-attack intensity
    "vfx_phase": 0.0,
    "dust": 0.0,
    "trail": 0.0,
    "eye": 0.0,  # -1 squint / +1 wide
    "mouth": 0.0,  # -1 frown / +1 shout
}


# The animation specifications were authored against a slightly wider, thinner
# guard. RENDER_BASE is the final, heavier arcade-fighter proportion set. Every
# authored pose is remapped by the per-joint delta, so all animation offsets are
# preserved while the drawn anatomy is substantially more substantial.
LEGACY_BASE: Pose = dict(BASE)
RENDER_BASE: Pose = {
    "hip": (60.0, 66.0),
    "shoulder": (60.0, 36.0),
    "neck": (60.0, 30.0),
    "head": (60.0, 20.0),
    "fs": (72.0, 37.0), "fe": (78.0, 52.0), "fw": (74.0, 33.0),
    "fh": (64.0, 66.0), "fk": (69.0, 85.0), "fa": (75.0, 105.0), "ft": (82.0, 110.0),
    "bs": (48.0, 37.0), "be": (42.0, 52.0), "bw": (55.0, 31.0),
    "bh": (56.0, 66.0), "bk": (49.0, 85.0), "ba": (45.0, 105.0), "bt": (38.0, 110.0),
}


def remap_pose(pose: Pose) -> Pose:
    """Apply the proportion change to an authored pose without losing motion."""
    out = dict(pose)
    for key, old in LEGACY_BASE.items():
        if not isinstance(old, tuple):
            continue
        new = RENDER_BASE[key]
        value = pose[key]
        out[key] = (value[0] + new[0] - old[0], value[1] + new[1] - old[1])
    return out


def P(**changes: Any) -> Pose:
    """Copy the base skeleton and override selected joints."""
    pose = dict(BASE)
    pose.update(changes)
    return pose


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix_pose(a: Pose, b: Pose, t: float) -> Pose:
    out: Pose = {}
    for key in BASE:
        va, vb = a[key], b[key]
        if isinstance(va, tuple):
            out[key] = (lerp(va[0], vb[0], t), lerp(va[1], vb[1], t))
        else:
            out[key] = lerp(float(va), float(vb), t)
    return out


def keyframes(keys: list[Pose], count: int) -> list[Pose]:
    """Evenly resample a list of key poses into ``count`` real frames."""
    if len(keys) == 1:
        return [dict(keys[0]) for _ in range(count)]
    frames: list[Pose] = []
    for index in range(count):
        progress = index / (count - 1) if count > 1 else 0.0
        span = progress * (len(keys) - 1)
        left = min(len(keys) - 1, int(span))
        right = min(len(keys) - 1, left + 1)
        frames.append(mix_pose(keys[left], keys[right], span - left))
    return frames


def rotate_pose(pose: Pose, degrees: float, pivot: tuple[float, float] | None = None) -> Pose:
    """Rotate the entire skeleton about the hip (used for knockdown/get-up)."""
    px, py = pivot or (60.0, 66.0)
    angle = math.radians(degrees)
    co, si = math.cos(angle), math.sin(angle)
    out = dict(pose)
    for key, value in pose.items():
        if not isinstance(value, tuple):
            continue
        dx, dy = value[0] - px, value[1] - py
        out[key] = (px + dx * co - dy * si, py + dx * si + dy * co)
    out["head_tilt"] = float(pose["head_tilt"]) + degrees
    return out


def drop_pose(pose: Pose, dy: float, dx: float = 0.0) -> Pose:
    out = dict(pose)
    for key, value in pose.items():
        if isinstance(value, tuple):
            out[key] = (value[0] + dx, value[1] + dy)
    return out


# ---------------------------------------------------------------------------
# Character designs (single source of truth for art + identity)
# ---------------------------------------------------------------------------

Palette = dict[str, Any]

DESIGNS: dict[str, Palette] = {
    "kenji": {
        "skin": "#E8A46A", "skin_light": "#FFC98F", "skin_shadow": "#A9603A",
        "hair": "#5A3218", "hair_light": "#8A5127", "hair_shadow": "#321A0E",
        "cloth": "#C8352B", "cloth_light": "#F05A3C", "cloth_shadow": "#7C1C1E",
        "cloth2": "#F2E7D2", "cloth2_light": "#FFFFFF", "cloth2_shadow": "#B9A98C",
        "accent": "#FF5A00", "accent_light": "#FFB347", "metal": "#C9D3E0",
        "belt": "#241622", "sole": "#20161C", "outline": "#1A0F16",
        "hair_style": "spiky", "headwear": "headband", "torso_style": "gi",
        "extra": ["wraps", "flame_aura"], "special": "fireball",
        "bulk": 1.0, "head_scale": 1.0, "leg_scale": 1.0, "victory": "fist_raise",
    },
    "shadow": {
        "skin": "#D79B72", "skin_light": "#F0BC90", "skin_shadow": "#8E5C48",
        "hair": "#2C1348", "hair_light": "#4B2170", "hair_shadow": "#170A28",
        "cloth": "#4B176F", "cloth_light": "#7A34B0", "cloth_shadow": "#2A0C42",
        "cloth2": "#8B2BE2", "cloth2_light": "#C58BFF", "cloth2_shadow": "#4B176F",
        "accent": "#8B2BE2", "accent_light": "#D9A6FF", "metal": "#A9B4CC",
        "belt": "#1B1030", "sole": "#140C20", "outline": "#120A1C",
        "hair_style": "hood", "headwear": "mask", "torso_style": "ninja",
        "extra": ["scarf", "tabi"], "special": "shadow_slash", "forehead_plate": True,
        "bulk": 0.9, "head_scale": 0.96, "leg_scale": 1.04, "victory": "ninja_pose",
    },
    "blaze": {
        "skin": "#D98A55", "skin_light": "#FFB87C", "skin_shadow": "#8C4A2C",
        "hair": "#E23B12", "hair_light": "#FFB12E", "hair_shadow": "#8A1B08",
        "cloth": "#7A1E16", "cloth_light": "#C93A1E", "cloth_shadow": "#3C0E10",
        "cloth2": "#FF7A18", "cloth2_light": "#FFD067", "cloth2_shadow": "#A52E08",
        "accent": "#FF5A00", "accent_light": "#FFC247", "metal": "#E0A45A",
        "belt": "#2A1010", "sole": "#1E0D0C", "outline": "#1C0B0A",
        "hair_style": "flame", "headwear": "none", "torso_style": "vest",
        "extra": ["gauntlets", "flame_aura"], "special": "flame_burst",
        "bulk": 1.02, "head_scale": 1.0, "leg_scale": 1.0, "victory": "flame_pose",
    },
    "iron_fist": {
        "skin": "#C68A5E", "skin_light": "#EFC094", "skin_shadow": "#7A4A32",
        "hair": "#2A2622", "hair_light": "#4A4038", "hair_shadow": "#151210",
        "cloth": "#2E4A3E", "cloth_light": "#4E7460", "cloth_shadow": "#182A22",
        "cloth2": "#9FB0BD", "cloth2_light": "#E2EEF6", "cloth2_shadow": "#5E6E7C",
        "accent": "#53D08A", "accent_light": "#A7F0C6", "metal": "#B9C7D6",
        "belt": "#20262A", "sole": "#191E22", "outline": "#12181A",
        "hair_style": "short", "headwear": "none", "torso_style": "armor",
        "extra": ["gauntlets", "plates"], "special": "shockwave",
        "bulk": 1.16, "head_scale": 0.94, "leg_scale": 0.96, "victory": "flex",
    },
    "storm": {
        "skin": "#EAA878", "skin_light": "#FFD5A6", "skin_shadow": "#A56545",
        "hair": "#D7E9F5", "hair_light": "#FFFFFF", "hair_shadow": "#7EA8CC",
        "cloth": "#1C5FA6", "cloth_light": "#3AA3E8", "cloth_shadow": "#0D2C58",
        "cloth2": "#F2F7FF", "cloth2_light": "#FFFFFF", "cloth2_shadow": "#A8C6E2",
        "accent": "#38BFFF", "accent_light": "#C6F0FF", "metal": "#D7E8F7",
        "belt": "#102744", "sole": "#101C2E", "outline": "#101A2C",
        "hair_style": "spiky_light", "headwear": "visor", "torso_style": "suit",
        "extra": ["wraps", "sparks"], "special": "lightning",
        "bulk": 0.92, "head_scale": 0.98, "leg_scale": 1.08, "victory": "fist_raise",
    },
    "raven": {
        "skin": "#C99278", "skin_light": "#E7BBA0", "skin_shadow": "#7C5347",
        "hair": "#191324", "hair_light": "#35284A", "hair_shadow": "#0B0812",
        "cloth": "#201830", "cloth_light": "#3B2C56", "cloth_shadow": "#100C1A",
        "cloth2": "#8B2BE2", "cloth2_light": "#C58BFF", "cloth2_shadow": "#4B176F",
        "accent": "#B36BFF", "accent_light": "#E7C6FF", "metal": "#9AA6BE",
        "belt": "#100A1C", "sole": "#0C0814", "outline": "#0D0914",
        "hair_style": "hood", "headwear": "mask", "torso_style": "cloak",
        "extra": ["cape", "blade", "mask_lower"], "special": "blade_arc",
        "bulk": 0.96, "head_scale": 0.98, "leg_scale": 1.04, "victory": "blade_pose",
    },
    "titan": {
        "skin": "#B5794E", "skin_light": "#DDA472", "skin_shadow": "#6E4029",
        "hair": "#2B1B16", "hair_light": "#4B3024", "hair_shadow": "#150C0A",
        "cloth": "#6B2A22", "cloth_light": "#A04A34", "cloth_shadow": "#3B1412",
        "cloth2": "#C9A06A", "cloth2_light": "#F2D09A", "cloth2_shadow": "#7A5A38",
        "accent": "#FF5A3C", "accent_light": "#FFB08A", "metal": "#8E7A62",
        "belt": "#25160F", "sole": "#1E120C", "outline": "#170D0A",
        "hair_style": "short", "headwear": "none", "torso_style": "bare",
        "extra": ["straps", "boots_big", "gauntlets"], "special": "quake",
        "bulk": 1.34, "head_scale": 0.86, "leg_scale": 0.92, "victory": "flex",
    },
}


def rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


class Painter:
    """Small pixel-art drawing toolkit: hard edges, outlines, 3-tone shading."""

    def __init__(self, design: Palette):
        self.d = design
        self.canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        self.layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.layer)
        self.outline = rgb(design["outline"])
        self.bulk = float(design["bulk"])

    def poly(self, points: list[tuple[float, float]], fill: tuple[int, int, int], width: int = 1) -> None:
        pts = [(round(x), round(y)) for x, y in points]
        self.draw.polygon(pts, fill=fill)
        self.draw.line(pts + [pts[0]], fill=self.outline, width=width, joint="curve")

    @staticmethod
    def perp(p0: tuple[float, float], p1: tuple[float, float]) -> tuple[float, float]:
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        length = math.hypot(dx, dy) or 1.0
        return (-dy / length, dx / length)

    def limb(
        self,
        p0: tuple[float, float],
        p1: tuple[float, float],
        w0: float,
        w1: float,
        base: str,
        light: str,
        shadow: str,
    ) -> None:
        """Tapered limb segment with a dark outline, lit edge and shaded edge."""
        nx, ny = self.perp(p0, p1)
        def off(p: tuple[float, float], w: float, sign: float) -> tuple[float, float]:
            return (p[0] + nx * w * sign, p[1] + ny * w * sign)

        pts = [off(p0, w0 / 2, 1), off(p1, w1 / 2, 1), off(p1, w1 / 2, -1), off(p0, w0 / 2, -1)]
        self.poly(pts, rgb(self.d[base]))
        # Lit strip on the +normal side, shaded strip on the -normal side.
        hi = [off(p0, w0 / 2, 1), off(p1, w1 / 2, 1), off(p1, w1 / 2 - 1.6, 1), off(p0, w0 / 2 - 1.6, 1)]
        sh = [off(p0, w0 / 2, -1), off(p1, w1 / 2, -1), off(p1, w1 / 2 - 1.6, -1), off(p0, w0 / 2 - 1.6, -1)]
        self.draw.polygon([(round(x), round(y)) for x, y in hi], fill=rgb(self.d[light]))
        self.draw.polygon([(round(x), round(y)) for x, y in sh], fill=rgb(self.d[shadow]))

    def ellipse(
        self,
        cx: float,
        cy: float,
        rx: float,
        ry: float,
        base: str,
        light: str,
        shadow: str,
    ) -> None:
        box = (round(cx - rx), round(cy - ry), round(cx + rx), round(cy + ry))
        self.draw.ellipse(box, fill=rgb(self.d[base]), outline=self.outline, width=1)
        # Upper-left highlight and lower-right shadow crescents.
        self.draw.pieslice(
            (round(cx - rx + 1), round(cy - ry + 1), round(cx + rx - 1), round(cy + ry - 1)),
            190, 290, fill=rgb(self.d[light]),
        )
        self.draw.pieslice(
            (round(cx - rx + 1), round(cy - ry + 1), round(cx + rx - 1), round(cy + ry - 1)),
            10, 100, fill=rgb(self.d[shadow]),
        )

    def line(self, points: list[tuple[float, float]], color: str, width: int = 1) -> None:
        self.draw.line([(round(x), round(y)) for x, y in points], fill=rgb(self.d[color]), width=width)

    def dot(self, x: float, y: float, color: tuple[int, int, int], size: int = 1) -> None:
        self.draw.rectangle((round(x), round(y), round(x) + size - 1, round(y) + size - 1), fill=color)

    # -- body parts ---------------------------------------------------------

    def foot(self, ankle: tuple[float, float], toe: tuple[float, float], big: bool = False) -> None:
        """A real boot: cuff, shaped upper, toe cap and a solid sole."""
        ax, ay = ankle
        tx, ty = toe
        h = 7.5 if big else 6.5
        self.poly([
            (ax - 4, ay - h), (ax + 4, ay - h), (ax + 5, ay - 1),
            (tx + 4, ty - 3), (tx + 5, ty + 1), (tx - 5, ty + 2), (ax - 5, ay + 2),
        ], rgb(self.d["cloth_shadow"]))
        self.poly([
            (ax - 3, ay - h + 1), (ax + 3, ay - h + 1), (ax + 4, ay - 2),
            (tx + 3, ty - 3), (tx + 3, ty), (tx - 4, ty + 1), (ax - 4, ay + 1),
        ], rgb(self.d["cloth"]))
        # Boot cuff and highlight on the upper.
        self.line([(ax - 4, ay - h + 2), (ax + 4, ay - h + 2)], "cloth2", 2)
        self.line([(ax + 1, ay - h + 3), (tx + 1, ty - 2)], "cloth_light", 2)
        self.line([(tx - 4, ty + 1), (tx + 4, ty + 1)], "sole", 2)
        self.dot(tx + 2, ty - 3, rgb(self.d["accent"]), 2)

    def leg(self, hip: tuple[float, float], knee: tuple[float, float], ankle: tuple[float, float], toe: tuple[float, float], front: bool, big: bool = False) -> None:
        w = (13.5 if big else 12.0) * (1.0 if front else 0.9)
        self.limb(hip, knee, w, w * 0.82, "cloth", "cloth_light", "cloth_shadow")
        self.limb(knee, ankle, w * 0.82, w * 0.62, "cloth", "cloth_light", "cloth_shadow")
        # Knee pad in the SAME cloth family (no white dot), plus fabric folds.
        self.poly([
            (knee[0] - w * 0.38, knee[1] - 3), (knee[0] + w * 0.38, knee[1] - 3),
            (knee[0] + w * 0.32, knee[1] + 4), (knee[0] - w * 0.32, knee[1] + 4),
        ], rgb(self.d["cloth_shadow"]))
        self.line([(knee[0] - w * 0.3, knee[1] - 2), (knee[0] + w * 0.3, knee[1] - 2)],
                  "cloth_light" if front else "cloth_shadow", 1)
        self.line([(hip[0] + 2, hip[1] + 8), (knee[0] + 1, knee[1] - 5)], "cloth_shadow", 1)
        self.foot(ankle, toe, big)

    def arm(
        self,
        shoulder: tuple[float, float],
        elbow: tuple[float, float],
        wrist: tuple[float, float],
        front: bool,
        gauntlet: bool = False,
        wrap: bool = False,
        plate: bool = False,
    ) -> None:
        w = (11.5 if front else 10.0) * (1.0 + (self.bulk - 1.0) * 0.7)
        upper = "cloth2" if plate else "cloth"
        # Deltoid / shoulder pad makes the arm read as attached to the torso.
        self.ellipse(shoulder[0], shoulder[1], w * 0.62, w * 0.55,
                     upper, "cloth_light" if not plate else "cloth2_light",
                     "cloth_shadow" if not plate else "cloth2_shadow")
        self.limb(shoulder, elbow, w, w * 0.86, upper,
                  "cloth_light" if not plate else "cloth2_light",
                  "cloth_shadow" if not plate else "cloth2_shadow")
        # Sleeve cuff at the elbow.
        self.line([(elbow[0] - 3, elbow[1] - 2), (elbow[0] + 3, elbow[1] + 2)],
                  "cloth2" if not plate else "metal", 2)
        if gauntlet or plate:
            self.limb(elbow, wrist, w * 0.86, w * 0.72, "cloth2", "cloth2_light", "cloth2_shadow")
            self.line([(elbow[0] - 1, elbow[1]), (wrist[0] - 1, wrist[1])], "metal", 2)
        else:
            self.limb(elbow, wrist, w * 0.86, w * 0.7, "skin", "skin_light", "skin_shadow")
            self.line([(elbow[0] + 2, elbow[1] + 2), (wrist[0] + 1, wrist[1])], "skin_shadow", 1)
            if wrap:
                self.line([(elbow[0] + 4, elbow[1] + 3), (wrist[0] + 1, wrist[1])], "cloth2", 3)
                self.line([(elbow[0] + 5, elbow[1] + 5), (wrist[0] + 1, wrist[1] + 1)], "cloth2_shadow", 1)
        # Fist: octagonal, shaded, with a knuckle line.
        r = 5.6 if front else 4.9
        fx, fy = wrist
        pts = [
            (fx - r, fy - r * 0.7), (fx + r * 0.2, fy - r), (fx + r, fy - r * 0.35),
            (fx + r, fy + r * 0.5), (fx - r * 0.1, fy + r), (fx - r, fy + r * 0.35),
        ]
        self.poly(pts, rgb(self.d[("cloth2" if gauntlet or plate else "skin")]))
        self.line([(fx - r * 0.6, fy - r * 0.45), (fx + r * 0.6, fy - r * 0.45)],
                  "cloth2_light" if gauntlet or plate else "skin_light", 1)
        self.dot(fx + r * 0.25, fy + r * 0.35, rgb(self.d["skin_shadow"]), 2)

    def torso(self, pose: Pose) -> None:
        d = self.d
        hx, hy = pose["hip"]
        sx, sy = pose["shoulder"]
        lean = float(pose["lean"])
        shoulder_half = (12.0 + (self.bulk - 1.0) * 6.0)
        waist_half = 8.6 * self.bulk
        # Side-view torso: chest pushes forward (+x), back is straighter.
        pts = [
            (sx - shoulder_half, sy - 2),
            (sx + shoulder_half * 0.65, sy - 4),
            (sx + shoulder_half + 2.5, sy + 7),
            (hx + waist_half + 1.0, hy - 2),
            (hx + waist_half, hy + 2),
            (hx - waist_half, hy + 2),
            (sx - shoulder_half - 1.0, sy + 8),
        ]
        self.poly(pts, rgb(d["cloth"]))
        # Lit chest plate and shadowed back.
        self.draw.polygon(
            [(round(x), round(y)) for x, y in pts[:4] + [(hx + 1, hy - 2)]],
            fill=rgb(d["cloth_light"]),
        )
        self.draw.polygon(
            [(round(sx - shoulder_half), round(sy + 5)), (round(hx - waist_half), round(hy)),
             (round(hx - waist_half + 3), round(hy)), (round(sx - shoulder_half + 3), round(sy + 5))],
            fill=rgb(d["cloth_shadow"]),
        )
        style = d["torso_style"]
        if style == "gi":
            # Crossed white gi collar, chest fold and a small undershirt V.
            self.poly([(sx - 6, sy - 2), (sx + 3, sy + 12), (sx + 8, sy + 8), (sx + 1, sy - 3)],
                      rgb(d["cloth2"]))
            self.poly([(sx + 6, sy - 2), (sx - 2, sy + 13), (sx + 2, sy + 15), (sx + 9, sy + 1)],
                      rgb(d["cloth2_shadow"]))
            self.line([(sx - 5, sy + 1), (sx + 3, sy + 12)], "cloth2_light", 1)
            self.line([(sx - 8, sy + 12), (sx + 7, sy + 9)], "cloth_shadow", 1)
            self.line([(sx - 7, sy + 18), (sx + 6, sy + 16)], "cloth_shadow", 1)
        elif style == "ninja":
            # Wrapped chest band and diagonal strap.
            self.line([(sx - 8, sy + 5), (sx + 8, sy + 1)], "cloth2", 3)
            self.line([(sx - 7, sy + 12), (sx + 8, sy + 8)], "cloth2_shadow", 2)
            self.poly([(sx - 8, sy + 2), (sx + 7, sy - 1), (sx + 7, sy + 2), (sx - 8, sy + 5)],
                      rgb(d["cloth2"]))
        elif style == "armor":
            # Steel breastplate with a bright ridge and rivets.
            self.poly([(sx - 8, sy + 1), (sx + 7, sy - 2), (sx + 9, sy + 12), (sx - 7, sy + 14)],
                      rgb(d["cloth2"]))
            self.line([(sx - 5, sy + 2), (sx + 6, sy + 1)], "cloth2_light", 2)
            self.line([(sx - 5, sy + 12), (sx + 7, sy + 11)], "cloth2_shadow", 2)
            for rx, ry in [(-6, 3), (6, 2), (-6, 11), (6, 10)]:
                self.dot(sx + rx, sy + ry, rgb(d["metal"]), 2)
        elif style == "vest" or style == "bare":
            # Open vest / bare chest with muscle shading.
            self.poly([(sx - 7, sy + 1), (sx - 1, sy + 3), (sx + 1, sy + 16), (sx - 6, sy + 16)],
                      rgb(d["cloth_shadow"]))
            self.line([(sx + 1, sy + 5), (sx + 7, sy + 4)], "skin_shadow", 2)
            self.line([(sx - 1, sy + 11), (sx + 4, sy + 10)], "skin_shadow", 1)
            self.ellipse(sx + 3, sy + 6, 4, 3, "skin", "skin_light", "skin_shadow")
        elif style == "suit":
            self.poly([(sx - 6, sy + 1), (sx + 6, sy - 1), (sx + 7, sy + 14), (sx - 6, sy + 15)],
                      rgb(d["cloth2"]))
            self.line([(sx, sy), (sx, sy + 14)], "accent", 2)
            self.dot(sx + 3, sy + 5, rgb(d["accent_light"]), 2)
        elif style == "cloak":
            self.poly([(sx - 9, sy - 1), (sx + 8, sy - 3), (sx + 9, sy + 15), (sx - 8, sy + 16)],
                      rgb(d["cloth_shadow"]))
            self.poly([(sx - 5, sy + 2), (sx + 4, sy + 1), (sx + 5, sy + 13), (sx - 4, sy + 14)],
                      rgb(d["cloth"]))
            self.line([(sx - 2, sy + 3), (sx + 3, sy + 11)], "cloth2", 2)
        # Belt always closes the torso.
        self.poly([(hx - waist_half - 1, hy - 3), (hx + waist_half + 1, hy - 3),
                   (hx + waist_half + 1, hy + 3), (hx - waist_half - 1, hy + 3)], rgb(d["belt"]))
        self.line([(hx - waist_half, hy - 2), (hx + waist_half, hy - 2)], "accent", 1)
        if "straps" in d["extra"]:
            self.line([(sx - 6, sy), (hx + 5, hy)], "cloth2", 2)

    def head(self, pose: Pose) -> None:
        d = self.d
        hx, hy = pose["head"]
        nx, ny = pose["neck"]
        scale = float(d["head_scale"])
        rx, ry = 10.4 * scale, 11.2 * scale
        # Neck, then head.
        self.limb((nx, ny), (hx, hy + ry * 0.7), 7.0, 7.0, "skin", "skin_light", "skin_shadow")
        self.ellipse(hx, hy, rx, ry, "skin", "skin_light", "skin_shadow")
        # Ear on the back side.
        self.ellipse(hx - rx + 1, hy + 1, 2.0, 2.6, "skin", "skin_light", "skin_shadow")

        hair = d["hair_style"]
        if hair == "spiky" or hair == "spiky_light":
            spikes = [
                (hx - rx - 1, hy - 2), (hx - 7, hy - ry - 4), (hx - 3, hy - ry),
                (hx + 1, hy - ry - 7), (hx + 4, hy - ry - 1), (hx + 8, hy - ry - 5),
                (hx + rx + 2, hy - ry + 2), (hx + rx, hy + 1), (hx + 4, hy - 4),
                (hx - 4, hy - 3),
            ]
            self.poly(spikes, rgb(d["hair"]))
            self.poly([(hx - 6, hy - ry - 2), (hx + 1, hy - ry - 6), (hx + 4, hy - ry),
                       (hx - 2, hy - ry + 2)], rgb(d["hair_light"]))
        elif hair == "flame":
            flames = [
                (hx - rx - 2, hy + 1), (hx - 9, hy - ry - 3), (hx - 5, hy - ry - 8),
                (hx - 1, hy - ry - 3), (hx + 3, hy - ry - 11), (hx + 6, hy - ry - 4),
                (hx + 10, hy - ry - 8), (hx + rx + 2, hy - ry + 1), (hx + rx, hy + 2),
                (hx + 3, hy - 4), (hx - 4, hy - 3),
            ]
            self.poly(flames, rgb(d["hair"]))
            self.poly([(hx - 4, hy - ry - 3), (hx + 3, hy - ry - 9), (hx + 6, hy - ry - 3),
                       (hx + 1, hy - ry + 1)], rgb(d["hair_light"]))
            self.dot(hx + 7, hy - ry - 6, rgb(d["accent_light"]), 2)
        elif hair == "short":
            self.poly([(hx - rx - 1, hy - 2), (hx - rx, hy - ry - 2), (hx - 2, hy - ry - 4),
                       (hx + rx, hy - ry - 1), (hx + rx + 1, hy - 1), (hx + rx - 2, hy - 4),
                       (hx - 3, hy - 5)], rgb(d["hair"]))
            self.line([(hx - 6, hy - ry), (hx + 5, hy - ry - 1)], "hair_light", 1)
        elif hair == "hood":
            self.poly([
                (hx - rx - 3, hy + ry + 2), (hx - rx - 2, hy - ry - 3),
                (hx - 3, hy - ry - 6), (hx + rx + 1, hy - ry - 2),
                (hx + rx + 3, hy + ry + 1), (hx + rx - 1, hy + ry - 1),
                (hx + rx - 2, hy - 2), (hx + rx - 4, hy - 5),
                (hx - rx + 2, hy - 4), (hx - rx + 1, hy + ry),
            ], rgb(d["hair"]))
            self.line([(hx - rx, hy - ry + 1), (hx - 3, hy - ry - 4),
                       (hx + rx - 1, hy - ry)], "hair_light", 2)

        # Face: eye, brow, nose, mouth. Only near-side features in a side view.
        eye_y = hy - 1.0
        squint = float(pose["eye"])
        self.draw.rectangle((round(hx + 2), round(eye_y - 2), round(hx + 7), round(eye_y + 2)),
                            fill=rgb(d["cloth2_light"]), outline=self.outline)
        self.draw.rectangle((round(hx + 5), round(eye_y - 2), round(hx + 7),
                             round(eye_y + (0 if squint < 0 else 2))), fill=self.outline)
        self.dot(hx + 6, eye_y - 1, rgb(d["accent_light"]), 1)
        brow_y = eye_y - 4
        self.line([(hx + 1, brow_y + (1.5 if squint < 0 else 0)), (hx + 8, brow_y - 1.5)],
                  "hair_shadow", 2)
        # Nose bridge / cheek shadow gives the head a real side-view profile.
        self.poly([(hx + rx - 2, hy + 1), (hx + rx + 1, hy + 4), (hx + rx - 2, hy + 5)],
                  rgb(d["skin"]))
        self.line([(hx + 2, hy + 6), (hx + 6, hy + 7)], "skin_shadow", 1)
        mouth = float(pose["mouth"])
        if mouth > 0.25:
            self.draw.ellipse((round(hx + 3), round(hy + 4), round(hx + 7), round(hy + 7)),
                              fill=self.outline)
            self.draw.rectangle((round(hx + 4), round(hy + 5), round(hx + 6), round(hy + 6)),
                                fill=rgb(d["cloth2_light"]))
        else:
            self.line([(hx + 3, hy + 5.5), (hx + 7, hy + 5.5 + mouth)], "skin_shadow", 1)

        if d["headwear"] == "headband":
            # Slim cloth band across the forehead with two thin trailing tails.
            self.poly([(hx - rx, hy - 7), (hx + rx, hy - 8),
                       (hx + rx, hy - 4), (hx - rx, hy - 3)], rgb(d["cloth2"]))
            self.line([(hx - rx, hy - 6), (hx + rx, hy - 7)], "accent", 1)
            self.poly([(hx - rx, hy - 6), (hx - rx - 8, hy + 2),
                       (hx - rx - 6, hy + 7), (hx - rx, hy - 3)], rgb(d["accent"]))
            self.poly([(hx - rx, hy - 4), (hx - rx - 5, hy + 4),
                       (hx - rx - 3, hy + 8), (hx - rx, hy - 1)], rgb(d["accent_light"]))
        elif d["headwear"] == "mask":
            self.poly([(hx - rx, hy + 1), (hx + rx, hy + 1), (hx + rx - 1, hy + ry + 1),
                       (hx - rx + 1, hy + ry + 2)], rgb(d["cloth"]))
            self.line([(hx - rx + 1, hy + 4), (hx + rx - 1, hy + 3)], "cloth_light", 1)
            self.line([(hx - rx + 2, hy + 7), (hx + rx - 2, hy + 6)], "cloth_shadow", 1)
            if "mask_lower" in d["extra"]:
                self.line([(hx + 1, hy + 2), (hx + 6, hy + 2)], "cloth2", 1)
        elif d["headwear"] == "visor":
            self.poly([(hx - 2, hy - 3), (hx + rx + 2, hy - 4), (hx + rx + 2, hy + 1),
                       (hx - 1, hy + 1)], rgb(d["cloth2_shadow"]))
            self.line([(hx, hy - 2), (hx + rx, hy - 3)], "accent_light", 2)
            self.dot(hx + rx, hy - 2, rgb(d["accent_light"]), 2)
        if d.get("forehead_plate"):
            # Shadow's engraved ninja forehead protector: a unique silhouette.
            self.poly([(hx - rx + 1, hy - 8), (hx + rx - 1, hy - 9),
                       (hx + rx - 1, hy - 4), (hx - rx + 1, hy - 3)], rgb(d["metal"]))
            self.line([(hx - rx + 2, hy - 7), (hx + rx - 2, hy - 8)], "cloth2_light", 1)
            self.dot(hx + 2, hy - 6, rgb(d["accent_light"]), 3)
            self.poly([(hx - rx + 1, hy - 7), (hx - rx - 8, hy - 5),
                       (hx - rx - 8, hy - 2), (hx - rx + 1, hy - 4)], rgb(d["cloth2"]))

    def extras(self, pose: Pose) -> None:
        d = self.d
        sx, sy = pose["shoulder"]
        hx, hy = pose["hip"]
        extra = d["extra"]
        if "scarf" in extra or "cape" in extra:
            wave = math.sin(float(pose["vfx_phase"]) * 6.28) * 2.0
            end_x = sx - 20 - abs(wave)
            end_y = sy + (6 if "cape" in extra else 0) + wave
            self.poly([
                (sx - 7, sy - 2), (sx - 9, sy + 5), (end_x + 6, end_y + 5),
                (end_x, end_y + 2), (end_x + 8, end_y - 2), (sx - 8, sy - 5),
            ], rgb(d["cloth2"] if "scarf" in extra else d["cloth_shadow"]))
            self.line([(sx - 8, sy), (end_x + 7, end_y)], "cloth2_light", 1)
        if "blade" in extra:
            wx, wy = pose["fw"]
            self.line([(wx, wy), (wx + 15, wy - 12)], "metal", 2)
            self.line([(wx + 15, wy - 12), (wx + 22, wy - 20)], "cloth2_light", 2)
            self.line([(wx - 3, wy + 3), (wx + 4, wy - 4)], "belt", 2)
        if "sparks" in extra:
            for i in range(3):
                a = float(pose["vfx_phase"]) * 6.28 + i * 2.1
                self.dot(sx + 10 + math.cos(a) * 5, sy + 3 + math.sin(a) * 6,
                         rgb(d["accent_light"]), 2)

    def effects(self, pose: Pose) -> None:
        """Character-specific special-attack artwork baked into real frames."""
        intensity = float(pose["vfx"])
        if intensity <= 0.02:
            return
        d = self.d
        kind = d["special"]
        phase = float(pose["vfx_phase"])
        fx, fy = pose["fw"]
        cx, cy = fx + 12, fy
        accent = rgb(d["accent"])
        light = rgb(d["accent_light"])
        strength = int(200 * intensity)
        draw = self.draw

        if kind == "fireball":
            for ring in range(3):
                r = (7 + ring * 4) * intensity + phase * 2
                draw.ellipse((round(cx - r), round(cy - r), round(cx + r), round(cy + r)),
                             outline=(*accent, strength // (ring + 1)), width=2)
            draw.ellipse((round(cx - 5 * intensity), round(cy - 5 * intensity),
                          round(cx + 5 * intensity), round(cy + 5 * intensity)),
                         fill=(*light, min(255, strength + 40)))
            for i in range(5):
                a = phase * 6.28 + i * 1.25
                draw.line([(round(cx + math.cos(a) * 6), round(cy + math.sin(a) * 6)),
                           (round(cx + math.cos(a) * (10 + 6 * intensity)),
                            round(cy + math.sin(a) * (10 + 6 * intensity)))],
                          fill=(*light, strength), width=2)
        elif kind == "shadow_slash" or kind == "blade_arc":
            r = 20 + 16 * intensity
            draw.arc((round(cx - r), round(cy - r), round(cx + r), round(cy + r)),
                     start=-70 + phase * 30, end=70 + phase * 30,
                     fill=(*light, strength), width=3)
            draw.arc((round(cx - r - 5), round(cy - r - 5), round(cx + r + 5), round(cy + r + 5)),
                     start=-50, end=60, fill=(*accent, strength // 2), width=2)
            for i in range(4):
                t = i / 4
                draw.line([(round(cx - 14 + t * 28), round(cy + 12 - t * 26)),
                           (round(cx - 8 + t * 28), round(cy + 6 - t * 26))],
                          fill=(*accent, strength), width=1)
        elif kind == "flame_burst":
            for i in range(9):
                a = i * (6.28 / 9) + phase * 2
                length = (8 + 16 * intensity) * (0.7 + 0.3 * math.sin(i * 3.1))
                self.poly([
                    (cx + math.cos(a) * 4, cy + math.sin(a) * 4),
                    (cx + math.cos(a - 0.22) * length, cy + math.sin(a - 0.22) * length),
                    (cx + math.cos(a + 0.22) * length, cy + math.sin(a + 0.22) * length),
                ], accent)
            draw.ellipse((round(cx - 7), round(cy - 7), round(cx + 7), round(cy + 7)),
                         fill=(*light, min(255, strength)))
        elif kind == "shockwave":
            for ring in range(3):
                r = (6 + ring * 7) * (0.5 + intensity) + phase * 3
                draw.arc((round(cx - r), round(cy - r * 0.62), round(cx + r), round(cy + r * 0.62)),
                         start=190, end=350, fill=(*rgb(d["metal"]), strength), width=2)
            for i in range(6):
                x = cx - 18 + i * 7
                draw.line([(round(x), round(cy + 8)), (round(x + 3), round(cy - 8 * intensity))],
                          fill=(*light, strength), width=2)
        elif kind == "lightning":
            pts: list[tuple[int, int]] = []
            for i in range(7):
                pts.append((round(cx - 12 + i * 6), round(cy + math.sin(i * 2.3 + phase * 8) * 9)))
            draw.line(pts, fill=(*light, 255), width=3)
            draw.line([(p[0], p[1] + 3) for p in pts], fill=(*accent, strength), width=1)
            for i in (1, 3, 5):
                draw.line([pts[i], (pts[i][0] + 6, pts[i][1] - 8)], fill=(*light, strength), width=2)
        elif kind == "quake":
            for row in range(3):
                y = 100 + row * 4
                draw.line([(round(cx - 30 - row * 6), y), (round(cx + 30 + row * 6), y)],
                          fill=(*accent, strength // (row + 1)), width=2)
            for i in range(7):
                x = cx - 26 + i * 9
                height = (6 + (i % 3) * 5) * intensity
                self.poly([(x, 108), (x + 4, 108 - height), (x + 8, 108)], accent)

        if float(pose["trail"]) > 0.05:
            for i in range(3):
                self.line([(fx - 8 - i * 7, fy - 6 + i * 3), (fx - 2 - i * 7, fy + 4 + i * 3)],
                          "accent_light", 1)
        if float(pose["dust"]) > 0.05:
            for i in range(5):
                x = 44 + i * 8 + math.sin(i + phase * 4) * 3
                y = 106 - (i % 2) * 3
                self.draw.ellipse((round(x), round(y), round(x + 4), round(y + 2)),
                                  fill=(*rgb(d["cloth2_light"]), int(140 * pose["dust"])))

    def finish(self) -> Image.Image:
        """Add a unified dark silhouette outline + subtle accent rim light."""
        alpha = self.layer.getchannel("A")
        dilated = alpha.filter(ImageFilter.MaxFilter(3))
        ring = ImageChops.subtract(dilated, alpha)
        # Dark outline ring.
        outline = Image.new("RGBA", (CW, CH), (*self.outline, 255))
        outline.putalpha(ring)
        # Accent rim on the forward-facing (right) side of the outline.
        gradient = Image.new("L", (CW, CH), 0)
        gd = ImageDraw.Draw(gradient)
        for x in range(CW):
            weight = max(0.0, min(1.0, (x - 58) / 52))
            gd.line([(x, 0), (x, CH)], fill=int(160 * weight))
        rim = Image.new("RGBA", (CW, CH), (*rgb(self.d["accent"]), 255))
        rim.putalpha(ImageChops.multiply(ring, gradient))
        base = Image.alpha_composite(outline, rim)
        return Image.alpha_composite(base, self.layer)


def render_frame(character_id: str, pose: Pose) -> Image.Image:
    design = DESIGNS[character_id]
    pose = remap_pose(pose)
    p = Painter(design)
    extra = design["extra"]
    big = "boots_big" in extra or design["bulk"] > 1.2
    gauntlet = "gauntlets" in extra
    wrap = "wraps" in extra
    plate = "plates" in extra

    # Painter's order for a side view: far leg, far arm, torso, near leg,
    # head, near arm, accessories, effects.
    p.leg(pose["bh"], pose["bk"], pose["ba"], pose["bt"], front=False, big=big)
    p.arm(pose["bs"], pose["be"], pose["bw"], front=False, gauntlet=gauntlet, wrap=wrap, plate=plate)
    p.torso(pose)
    p.leg(pose["fh"], pose["fk"], pose["fa"], pose["ft"], front=True, big=big)
    p.head(pose)
    p.arm(pose["fs"], pose["fe"], pose["fw"], front=True, gauntlet=gauntlet, wrap=wrap, plate=plate)
    p.extras(pose)
    p.effects(pose)
    return p.finish()
