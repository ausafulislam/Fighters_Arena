#!/usr/bin/env python3
"""Frame-by-frame animation specifications for every FIGHTER'S ARENA fighter.

Each builder returns a list of *distinct* skeleton poses. Those poses are
rendered by fighter_rig.render_frame() into separate sprite-sheet cells; the
game then plays the cells with Phaser ``anims``. Nothing here is a position
tween, a CSS transition or a duplicated static PNG.

Animation order, frame counts and frame rates are exported to TypeScript by
process_overhaul_assets.py so the sheet layout and the runtime definitions can
never drift apart.
"""

from __future__ import annotations

import math
from typing import Any

from fighter_rig import BASE, P, drop_pose, keyframes, mix_pose, rotate_pose

TAU = math.pi * 2

# name -> (frame count, frames per second, repeat, description)
# repeat -1 == loop forever; 0 == play once and hold the last frame.
ANIM_META: dict[str, tuple[int, int, int, str]] = {
    "idle": (8, 8, -1, "looping fighting stance with breathing and guard motion"),
    "breathing": (4, 5, -1, "subtle idle breathing variation"),
    "walk_forward": (6, 10, -1, "advancing walk, alternating legs and arms"),
    "walk_backward": (6, 9, -1, "retreating walk, reverse leg cycle"),
    "run": (6, 14, -1, "forward run with deeper leg lift and lean"),
    "jump_takeoff": (3, 20, 0, "crouch, push-off and full leg extension"),
    "jump_airborne": (4, 8, -1, "tucked airborne loop"),
    "falling": (3, 10, 0, "legs extending downwards on descent"),
    "landing": (3, 12, 0, "absorb impact and return to guard"),
    "crouch": (4, 6, -1, "low crouching guard with breathing"),
    "block": (4, 7, -1, "crossed-arm block with weight shift"),
    "light_punch": (6, 20, 0, "startup, extension, active fist, recovery"),
    "heavy_punch": (7, 14, 0, "deep wind-up and committed straight"),
    "kick": (7, 14, 0, "knee lift, extension, hold, recoil"),
    "special": (9, 12, 0, "charge, release and signature VFX"),
    "hit": (4, 12, 0, "head snap and upper-body recoil"),
    "knockback": (4, 10, 0, "stagger backwards with flailing arms"),
    "knockdown": (5, 9, 0, "rotate to the floor and settle"),
    "getup": (6, 9, 0, "push up from the floor to the guard"),
    "victory": (8, 6, -1, "character-specific looping victory pose"),
    "defeat": (5, 6, 0, "slump, kneel and fall"),
}

ANIM_ORDER = list(ANIM_META)


def _bob(t: float, amount: float = 1.0) -> float:
    return math.sin(t * TAU) * amount


def idle(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        b = _bob(i / count)
        out.append(P(
            hip=(60.0, 64.0 + 1.1 * b * amp),
            shoulder=(60.0 + 0.7 * b, 36.0 - 2.2 * b * amp),
            neck=(60.0 + 0.7 * b, 30.0 - 2.2 * b * amp),
            head=(60.0 + 0.8 * b, 21.0 - 2.5 * b * amp),
            fs=(66.0, 38.0 - 2.0 * b * amp),
            fe=(72.0, 51.0 - 0.9 * b),
            fw=(70.0 + 1.6 * b, 34.0 - 2.0 * b * amp),
            bs=(54.0, 38.0 - 1.9 * b * amp),
            be=(48.0, 51.0 - 0.9 * b),
            bw=(57.0 + 1.3 * b, 32.0 - 1.8 * b * amp),
            eye=0.15 + 0.25 * b,
            mouth=0.0,
        ))
    return out


def breathing(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        b = _bob(i / count, 0.55) * amp
        out.append(P(
            hip=(60.0, 64.0 + 0.35 * b),
            shoulder=(60.0, 36.0 - 0.9 * b),
            neck=(60.0, 30.0 - 0.9 * b),
            head=(60.0 - 0.6 * b, 21.0 - 1.0 * b),
            head_tilt=-1.5 * b,
            fs=(66.0, 38.0 - 0.8 * b), fw=(70.0, 34.0 - 0.7 * b),
            bs=(54.0, 38.0 - 0.8 * b), bw=(57.0, 32.0 - 0.7 * b),
            eye=-0.1,
        ))
    return out


def _walk_phase(t: float, direction: int, amp: float) -> dict[str, Any]:
    s = math.sin(t * TAU) * direction
    lift_f = max(0.0, s)
    lift_b = max(0.0, -s)
    return P(
        hip=(60.0 + 1.6 * s, 64.0 + 1.4 * abs(math.cos(t * TAU))),
        shoulder=(60.0 + 3.0 * s, 36.0 - 0.8 * abs(math.cos(t * TAU))),
        neck=(60.0 + 3.0 * s, 30.0 - 0.8),
        head=(60.0 + 3.2 * s, 21.0 - 0.8 * abs(math.cos(t * TAU))),
        # near leg
        fh=(63.0 + 1.6 * s, 64.0),
        fk=(70.0 + 9.0 * s * amp, 84.0 - 3.0 * lift_f),
        fa=(76.0 + 12.0 * s * amp, 106.0 - 7.0 * lift_f),
        ft=(85.0 + 12.0 * s * amp, 110.0 - 7.0 * lift_f),
        # far leg
        bh=(56.0 + 1.6 * s, 64.0),
        bk=(48.0 - 9.0 * s * amp, 84.0 - 3.0 * lift_b),
        ba=(41.0 - 12.0 * s * amp, 106.0 - 7.0 * lift_b),
        bt=(32.0 - 12.0 * s * amp, 110.0 - 7.0 * lift_b),
        # counter-swinging arms
        fs=(66.0 + 3.0 * s, 38.0),
        fe=(72.0 - 5.0 * s * amp, 51.0 - 2.0 * lift_b),
        fw=(70.0 - 6.0 * s * amp, 34.0 - 3.0 * lift_b),
        bs=(54.0 + 3.0 * s, 38.0),
        be=(48.0 + 5.0 * s * amp, 51.0 - 2.0 * lift_f),
        bw=(57.0 + 6.0 * s * amp, 32.0 - 3.0 * lift_f),
        eye=0.2,
    )


def walk(count: int, direction: int, amp: float = 1.0) -> list[dict[str, Any]]:
    return [_walk_phase(i / count, direction, amp) for i in range(count)]


def run(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        t = i / count
        s = math.sin(t * TAU)
        lift_f, lift_b = max(0.0, s), max(0.0, -s)
        out.append(P(
            hip=(60.0 + 2.0 * s, 66.0 + 2.2 * abs(math.cos(t * TAU))),
            shoulder=(65.0 + 3.0 * s, 38.0),
            neck=(64.0 + 3.0 * s, 32.0),
            head=(64.0 + 3.0 * s, 23.0),
            lean=5.0,
            fh=(63.0, 66.0),
            fk=(74.0 + 13.0 * s * amp, 80.0 - 7.0 * lift_f),
            fa=(80.0 + 16.0 * s * amp, 102.0 - 14.0 * lift_f),
            ft=(89.0 + 16.0 * s * amp, 108.0 - 14.0 * lift_f),
            bh=(56.0, 66.0),
            bk=(46.0 - 13.0 * s * amp, 80.0 - 7.0 * lift_b),
            ba=(38.0 - 16.0 * s * amp, 102.0 - 14.0 * lift_b),
            bt=(29.0 - 16.0 * s * amp, 108.0 - 14.0 * lift_b),
            fs=(70.0, 40.0), fe=(76.0 - 9.0 * s, 48.0), fw=(72.0 - 11.0 * s, 32.0),
            bs=(58.0, 40.0), be=(50.0 + 9.0 * s, 48.0), bw=(55.0 + 11.0 * s, 30.0),
            eye=0.4, mouth=0.2, dust=0.35 * (lift_f + lift_b),
        ))
    return out


def _crouch_pose(amount: float = 1.0) -> dict[str, Any]:
    """amount 0 = standing guard, 1 = full crouch."""
    return P(
        hip=(60.0, 64.0 + 20.0 * amount),
        shoulder=(59.0 - 2.0 * amount, 36.0 + 20.0 * amount),
        neck=(59.0 - 2.0 * amount, 30.0 + 20.0 * amount),
        head=(59.0 - 2.0 * amount, 21.0 + 20.0 * amount),
        fh=(63.0, 64.0 + 20.0 * amount),
        fk=(72.0 + 4.0 * amount, 84.0 + 9.0 * amount),
        fa=(78.0, 106.0), ft=(87.0, 110.0),
        bh=(56.0, 64.0 + 20.0 * amount),
        bk=(46.0 - 4.0 * amount, 84.0 + 9.0 * amount),
        ba=(39.0, 106.0), bt=(30.0, 110.0),
        fs=(65.0, 38.0 + 20.0 * amount),
        fe=(71.0, 51.0 + 18.0 * amount),
        fw=(69.0, 34.0 + 22.0 * amount),
        bs=(53.0, 38.0 + 20.0 * amount),
        be=(47.0, 51.0 + 18.0 * amount),
        bw=(56.0, 32.0 + 22.0 * amount),
        eye=-0.2,
    )


def jump_takeoff(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    crouch = _crouch_pose(0.8)
    push = P(
        hip=(60.0, 70.0), shoulder=(61.0, 42.0), neck=(61.0, 36.0), head=(61.0, 27.0),
        fh=(63.0, 70.0), fk=(71.0, 88.0), fa=(77.0, 107.0), ft=(86.0, 111.0),
        bh=(56.0, 70.0), bk=(48.0, 88.0), ba=(41.0, 107.0), bt=(32.0, 111.0),
        fs=(67.0, 44.0), fe=(70.0, 58.0), fw=(66.0, 62.0),
        bs=(55.0, 44.0), be=(51.0, 58.0), bw=(48.0, 60.0),
        eye=0.4, dust=0.7,
    )
    extend = P(
        hip=(60.0, 62.0), shoulder=(62.0, 34.0), neck=(62.0, 28.0), head=(62.0, 19.0),
        fh=(63.0, 62.0), fk=(70.0, 84.0), fa=(76.0, 106.0), ft=(85.0, 110.0),
        bh=(56.0, 62.0), bk=(49.0, 84.0), ba=(42.0, 106.0), bt=(33.0, 110.0),
        fs=(68.0, 36.0), fe=(73.0, 24.0), fw=(78.0, 14.0),
        bs=(56.0, 36.0), be=(51.0, 24.0), bw=(46.0, 16.0),
        eye=0.6, mouth=0.4, dust=1.0,
    )
    return keyframes([crouch, push, extend], count)


def jump_airborne(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        b = _bob(i / count, 1.0) * amp
        out.append(P(
            hip=(60.0, 62.0 + b), shoulder=(62.0, 34.0 + b), neck=(62.0, 28.0 + b),
            head=(62.0, 19.0 + b),
            fh=(63.0, 62.0 + b), fk=(74.0, 76.0 + b), fa=(80.0, 90.0 + b), ft=(88.0, 94.0 + b),
            bh=(56.0, 62.0 + b), bk=(48.0, 78.0 + b), ba=(42.0, 92.0 + b), bt=(34.0, 96.0 + b),
            fs=(68.0, 36.0 + b), fe=(75.0, 30.0 + b), fw=(82.0, 24.0 + b),
            bs=(56.0, 36.0 + b), be=(50.0, 30.0 + b), bw=(44.0, 26.0 + b),
            eye=0.4, mouth=0.3,
        ))
    return out


def falling(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    start = P(
        hip=(60.0, 62.0), shoulder=(61.0, 34.0), neck=(61.0, 28.0), head=(61.0, 19.0),
        fh=(63.0, 62.0), fk=(72.0, 80.0), fa=(78.0, 98.0), ft=(86.0, 102.0),
        bh=(56.0, 62.0), bk=(49.0, 82.0), ba=(43.0, 100.0), bt=(35.0, 104.0),
        fs=(67.0, 36.0), fe=(73.0, 26.0), fw=(78.0, 18.0),
        bs=(55.0, 36.0), be=(49.0, 28.0), bw=(44.0, 22.0),
        eye=0.5, mouth=0.3,
    )
    end = P(
        hip=(60.0, 64.0), shoulder=(60.0, 36.0), neck=(60.0, 30.0), head=(60.0, 21.0),
        fh=(63.0, 64.0), fk=(70.0, 84.0), fa=(76.0, 106.0), ft=(85.0, 110.0),
        bh=(56.0, 64.0), bk=(48.0, 84.0), ba=(41.0, 106.0), bt=(32.0, 110.0),
        fs=(66.0, 38.0), fe=(72.0, 50.0), fw=(70.0, 34.0),
        bs=(54.0, 38.0), be=(48.0, 50.0), bw=(57.0, 32.0),
        eye=-0.3, mouth=0.2,
    )
    return keyframes([start, end], count)


def landing(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    return keyframes([_crouch_pose(0.85), _crouch_pose(0.45), P(dust=0.9)], count)


def crouch(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        b = _bob(i / count, 0.18)
        pose = _crouch_pose(1.0 + b)
        pose["eye"] = -0.2 + b
        out.append(pose)
    return out


def block(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        b = _bob(i / count, 1.0)
        out.append(P(
            hip=(58.0, 65.0 + 0.4 * b), shoulder=(57.0, 37.0 + 0.5 * b),
            neck=(57.0, 31.0 + 0.5 * b), head=(57.0, 22.0 + 0.5 * b),
            fh=(61.0, 65.0), fk=(69.0, 85.0), fa=(75.0, 106.0), ft=(84.0, 110.0),
            bh=(54.0, 65.0), bk=(47.0, 85.0), ba=(40.0, 106.0), bt=(31.0, 110.0),
            fs=(63.0, 39.0), fe=(72.0 + b, 44.0), fw=(76.0 + b, 28.0),
            bs=(51.0, 39.0), be=(58.0 + b, 45.0), bw=(68.0 + b, 31.0),
            eye=-0.8, mouth=-0.4,
        ))
    return out


def _punch_pose(reach: float, windup: float = 0.0) -> dict[str, Any]:
    """Front-arm straight with an optional wind-up (negative reach)."""
    fx = 70.0 + reach
    return P(
        hip=(60.0 + max(0.0, reach) * 0.06, 64.0),
        shoulder=(60.0 + max(0.0, reach) * 0.1 - windup * 2.0, 36.0),
        neck=(60.0 + max(0.0, reach) * 0.1 - windup * 2.0, 30.0),
        head=(60.0 + max(0.0, reach) * 0.08 - windup * 2.0, 21.0),
        fs=(66.0, 38.0),
        fe=(72.0 + reach * 0.42, 44.0 - reach * 0.08),
        fw=(fx, 38.0 - reach * 0.03),
        bs=(54.0, 38.0), be=(48.0 - windup * 3.0, 51.0), bw=(55.0, 32.0),
        eye=0.6 if reach > 10 else 0.2,
        mouth=0.8 if reach > 25 else 0.0,
        trail=min(1.0, max(0.0, reach / 30)),
    )


def light_punch(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    keys = [
        P(lean=0.0),
        _punch_pose(-6.0, windup=1.0),
        _punch_pose(14.0 * amp),
        _punch_pose(36.0 * amp),
        _punch_pose(20.0 * amp),
        P(),
    ]
    return keyframes(keys, count)


def heavy_punch(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    wind = P(
        hip=(57.0, 67.0), shoulder=(55.0, 39.0), neck=(55.0, 33.0), head=(55.0, 24.0),
        fs=(61.0, 41.0), fe=(62.0, 55.0), fw=(58.0, 46.0),
        bs=(49.0, 41.0), be=(44.0, 53.0), bw=(50.0, 40.0),
        fh=(60.0, 67.0), fk=(68.0, 87.0), fa=(74.0, 106.0), ft=(83.0, 110.0),
        bh=(53.0, 67.0), bk=(45.0, 87.0), ba=(38.0, 106.0), bt=(29.0, 110.0),
        eye=-0.6, mouth=-0.4,
    )
    strike = _punch_pose(42.0 * amp)
    strike["hip"] = (64.0, 64.0)
    strike["dust"] = 0.7
    keys = [P(), wind, _punch_pose(4.0), _punch_pose(28.0 * amp), strike,
            _punch_pose(24.0 * amp), P()]
    return keyframes(keys, count)


def _kick_pose(reach: float, lift: float) -> dict[str, Any]:
    return P(
        hip=(59.0, 64.0 - lift * 0.06),
        shoulder=(58.0, 36.0 - lift * 0.05), neck=(58.0, 30.0 - lift * 0.05),
        head=(58.0, 21.0 - lift * 0.05),
        fs=(64.0, 38.0), fe=(69.0, 49.0), fw=(66.0, 34.0),
        bs=(52.0, 38.0), be=(45.0, 47.0), bw=(50.0, 28.0),
        fh=(62.0, 64.0),
        fk=(70.0 + reach * 0.28, 84.0 - lift),
        fa=(76.0 + reach * 0.72, 106.0 - lift * 1.05),
        ft=(85.0 + reach * 0.82, 110.0 - lift * 1.1),
        bh=(55.0, 64.0), bk=(47.0, 84.0), ba=(40.0, 106.0), bt=(31.0, 110.0),
        eye=0.4, mouth=0.7, trail=min(1.0, reach / 30),
    )


def kick(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    keys = [
        P(),
        _kick_pose(2.0 * amp, 12.0),
        _kick_pose(14.0 * amp, 32.0),
        _kick_pose(34.0 * amp, 48.0),
        _kick_pose(36.0 * amp, 50.0),
        _kick_pose(12.0 * amp, 18.0),
        P(),
    ]
    return keyframes(keys, count)


def special(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    charge = P(
        hip=(58.0, 70.0), shoulder=(56.0, 42.0), neck=(56.0, 36.0), head=(56.0, 27.0),
        fs=(62.0, 44.0), fe=(58.0, 58.0), fw=(52.0, 50.0),
        bs=(50.0, 44.0), be=(44.0, 58.0), bw=(40.0, 48.0),
        fh=(61.0, 70.0), fk=(69.0, 90.0), fa=(75.0, 106.0), ft=(84.0, 110.0),
        bh=(53.0, 70.0), bk=(45.0, 90.0), ba=(38.0, 106.0), bt=(29.0, 110.0),
        eye=-0.8, mouth=1.0, vfx=0.28, vfx_phase=0.0,
    )
    release = _punch_pose(38.0 * amp)
    release["hip"] = (64.0, 62.0)
    release["vfx"] = 1.0
    release["vfx_phase"] = 0.55
    release["dust"] = 0.9
    keys = [
        charge,
        mix_pose(charge, P(vfx=0.55, vfx_phase=0.2, mouth=1.0), 0.5),
        mix_pose(charge, release, 0.4),
        release,
        mix_pose(release, P(vfx=0.85, vfx_phase=0.8), 0.65),
        mix_pose(release, P(vfx=0.45, vfx_phase=1.0), 0.8),
        _punch_pose(18.0),
        P(vfx=0.12, vfx_phase=1.0),
        P(),
    ]
    return keyframes(keys, count)


def hit(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    keys = [
        P(),
        P(hip=(58.0, 64.0), shoulder=(55.0, 37.0), neck=(54.0, 31.0), head=(52.0, 23.0),
          head_tilt=-8.0, fs=(62.0, 39.0), fe=(66.0, 30.0), fw=(62.0, 22.0),
          bs=(50.0, 39.0), be=(44.0, 30.0), bw=(42.0, 24.0), eye=-1.0, mouth=1.0),
        P(hip=(56.0, 65.0), shoulder=(52.0, 38.0), neck=(51.0, 32.0), head=(49.0, 24.0),
          head_tilt=-12.0, fs=(59.0, 40.0), fe=(60.0, 28.0), fw=(56.0, 20.0),
          bs=(47.0, 40.0), be=(40.0, 30.0), bw=(36.0, 26.0), eye=-1.0, mouth=1.0),
        P(hip=(57.0, 64.0), shoulder=(54.0, 37.0), neck=(53.0, 31.0), head=(52.0, 22.0),
          head_tilt=-6.0, fs=(61.0, 39.0), fe=(64.0, 33.0), fw=(60.0, 26.0),
          bs=(49.0, 39.0), be=(44.0, 33.0), bw=(42.0, 28.0), eye=-0.7, mouth=0.6),
    ]
    return keyframes(keys, count)


def knockback(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    keys = [
        hit(4)[2],
        P(hip=(54.0, 66.0), shoulder=(49.0, 39.0), neck=(48.0, 33.0), head=(46.0, 25.0),
          head_tilt=-15.0, fs=(55.0, 41.0), fe=(52.0, 26.0), fw=(46.0, 18.0),
          bs=(43.0, 41.0), be=(34.0, 34.0), bw=(30.0, 40.0),
          fh=(57.0, 66.0), fk=(66.0, 86.0), fa=(72.0, 106.0), ft=(81.0, 110.0),
          bh=(51.0, 66.0), bk=(40.0, 84.0), ba=(33.0, 106.0), bt=(24.0, 110.0),
          eye=-1.0, mouth=1.0),
        P(hip=(53.0, 68.0), shoulder=(48.0, 41.0), neck=(47.0, 35.0), head=(45.0, 27.0),
          head_tilt=-18.0, fs=(54.0, 43.0), fe=(50.0, 28.0), fw=(42.0, 22.0),
          bs=(42.0, 43.0), be=(32.0, 36.0), bw=(26.0, 44.0),
          fh=(56.0, 68.0), fk=(64.0, 88.0), fa=(70.0, 106.0), ft=(79.0, 110.0),
          bh=(50.0, 68.0), bk=(38.0, 86.0), ba=(31.0, 106.0), bt=(22.0, 110.0),
          eye=-1.0, mouth=0.8, dust=0.6),
        P(hip=(55.0, 66.0), shoulder=(51.0, 39.0), neck=(50.0, 33.0), head=(48.0, 25.0),
          head_tilt=-10.0, fs=(57.0, 41.0), fe=(54.0, 30.0), fw=(48.0, 22.0),
          bs=(45.0, 41.0), be=(37.0, 34.0), bw=(32.0, 38.0),
          eye=-0.8, mouth=0.4),
    ]
    return keyframes(keys, count)


def knockdown(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        t = i / (count - 1)
        angle = 88.0 * t
        pose = drop_pose(rotate_pose(P(eye=-1.0, mouth=0.7, dust=0.8 * (1 - t)), angle), 25.0 * t, -3.0 * t)
        out.append(pose)
    return out


def getup(count: int, amp: float = 1.0) -> list[dict[str, Any]]:
    out = []
    for i in range(count):
        t = i / (count - 1)
        angle = 88.0 * (1 - t)
        pose = drop_pose(rotate_pose(P(eye=-0.6, mouth=0.2), angle), 25.0 * (1 - t), -3.0 * (1 - t))
        if t > 0.75:
            pose = mix_pose(pose, P(dust=0.5), (t - 0.75) * 4)
        out.append(pose)
    return out


def victory(count: int, amp: float = 1.0, style: str = "fist_raise") -> list[dict[str, Any]]:
    variants: dict[str, dict[str, Any]] = {
        "fist_raise": P(fs=(66.0, 38.0), fe=(70.0, 24.0), fw=(72.0, 9.0),
                        bs=(54.0, 38.0), be=(50.0, 44.0), bw=(52.0, 34.0)),
        "flex": P(fs=(66.0, 38.0), fe=(76.0, 34.0), fw=(70.0, 30.0),
                  bs=(54.0, 38.0), be=(44.0, 34.0), bw=(50.0, 30.0)),
        "ninja_pose": P(fs=(66.0, 38.0), fe=(74.0, 40.0), fw=(64.0, 28.0),
                        bs=(54.0, 38.0), be=(46.0, 44.0), bw=(56.0, 32.0)),
        "blade_pose": P(fs=(66.0, 38.0), fe=(74.0, 26.0), fw=(82.0, 14.0),
                        bs=(54.0, 38.0), be=(48.0, 48.0), bw=(52.0, 36.0)),
        "flame_pose": P(fs=(66.0, 38.0), fe=(78.0, 30.0), fw=(86.0, 20.0),
                        bs=(54.0, 38.0), be=(42.0, 32.0), bw=(34.0, 22.0)),
    }
    target = variants.get(style, variants["fist_raise"])
    target = dict(target)
    target.update({"mouth": 1.0, "eye": 0.5, "vfx": 0.18, "vfx_phase": 0.0})
    out = []
    for i in range(count):
        b = _bob(i / count, 1.0)
        pose = mix_pose(P(), target, min(1.0, 0.55 + 0.35 * (i / count)))
        pose["hip"] = (pose["hip"][0], pose["hip"][1] + 0.9 * b)
        pose["head"] = (pose["head"][0], pose["head"][1] - 1.0 * b)
        pose["vfx_phase"] = i / count
        out.append(pose)
    return out


def defeat(count: int, amp: float = 1.0, style: str = "fist_raise") -> list[dict[str, Any]]:
    """Character-specific collapse: each style falls at its own angle with its
    own arm silhouette (ninja folds, Titan drops heavily, Raven drops the blade)."""
    profiles: dict[str, tuple[float, float, float, tuple[float, float], tuple[float, float]]] = {
        "fist_raise": (78.0, 24.0, -2.0, (66.0, 70.0), (44.0, 70.0)),
        "ninja_pose": (84.0, 22.0, -5.0, (60.0, 64.0), (50.0, 62.0)),
        "blade_pose": (72.0, 27.0, 4.0, (72.0, 74.0), (38.0, 68.0)),
        "flame_pose": (88.0, 20.0, 3.0, (70.0, 62.0), (40.0, 74.0)),
        "flex": (70.0, 29.0, -3.0, (74.0, 72.0), (36.0, 72.0)),
    }
    angle, drop, dx, front_wrist, back_wrist = profiles.get(
        style, profiles["fist_raise"]
    )
    slump = P(
        hip=(58.0, 70.0), shoulder=(56.0, 43.0), neck=(55.0, 37.0), head=(54.0, 29.0),
        head_tilt=-10.0,
        fs=(62.0, 45.0), fe=(64.0, 60.0), fw=front_wrist,
        bs=(50.0, 45.0), be=(46.0, 60.0), bw=back_wrist,
        fh=(61.0, 70.0), fk=(66.0, 90.0), fa=(72.0, 106.0), ft=(81.0, 110.0),
        bh=(53.0, 70.0), bk=(45.0, 90.0), ba=(38.0, 106.0), bt=(29.0, 110.0),
        eye=-1.0, mouth=-0.5,
    )
    fallen = drop_pose(
        rotate_pose(P(eye=-1.0, mouth=-0.8, fw=front_wrist, bw=back_wrist), angle),
        drop,
        dx,
    )
    return keyframes([P(), slump, mix_pose(slump, fallen, 0.55), fallen, fallen], count)


BUILDERS = {
    "idle": idle, "breathing": breathing,
    "walk_forward": lambda n, a: walk(n, 1, a),
    "walk_backward": lambda n, a: walk(n, -1, a),
    "run": run, "jump_takeoff": jump_takeoff, "jump_airborne": jump_airborne,
    "falling": falling, "landing": landing, "crouch": crouch, "block": block,
    "light_punch": light_punch, "heavy_punch": heavy_punch, "kick": kick,
    "special": special, "hit": hit, "knockback": knockback,
    "knockdown": knockdown, "getup": getup, "victory": victory, "defeat": defeat,
}


def build_all(character_id: str, amplitude: float = 1.0, victory_style: str = "fist_raise") -> list[tuple[str, list[dict[str, Any]]]]:
    result: list[tuple[str, list[dict[str, Any]]]] = []
    for name in ANIM_ORDER:
        count = ANIM_META[name][0]
        if name == "idle":
            frames = idle(count, amplitude)
        elif name == "victory":
            frames = victory(count, amplitude, victory_style)
        elif name == "defeat":
            frames = defeat(count, amplitude, victory_style)
        else:
            frames = BUILDERS[name](count, amplitude)
        assert len(frames) == count, f"{name}: {len(frames)} != {count}"
        result.append((name, frames))
    return result
