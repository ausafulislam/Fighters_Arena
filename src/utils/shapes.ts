import Phaser from 'phaser';

/** Sharp arcade octagon (cut corners), centred on the local origin. */
export function octagon(
  width: number,
  height: number,
  cut: number,
  cx = 0,
  cy = 0,
): Phaser.Geom.Point[] {
  const hw = width / 2;
  const hh = height / 2;
  const c = Math.min(cut, hw, hh);
  return [
    new Phaser.Geom.Point(cx - hw + c, cy - hh),
    new Phaser.Geom.Point(cx + hw - c, cy - hh),
    new Phaser.Geom.Point(cx + hw, cy - hh + c),
    new Phaser.Geom.Point(cx + hw, cy + hh - c),
    new Phaser.Geom.Point(cx + hw - c, cy + hh),
    new Phaser.Geom.Point(cx - hw + c, cy + hh),
    new Phaser.Geom.Point(cx - hw, cy + hh - c),
    new Phaser.Geom.Point(cx - hw, cy - hh + c),
  ];
}

/** Six-sided HUD button used by the top-right corner icons. */
export function hexagon(
  width: number,
  height: number,
  cut: number,
  cx = 0,
  cy = 0,
): Phaser.Geom.Point[] {
  const hw = width / 2;
  const hh = height / 2;
  return [
    new Phaser.Geom.Point(cx - hw + cut, cy - hh),
    new Phaser.Geom.Point(cx + hw - cut, cy - hh),
    new Phaser.Geom.Point(cx + hw, cy),
    new Phaser.Geom.Point(cx + hw - cut, cy + hh),
    new Phaser.Geom.Point(cx - hw + cut, cy + hh),
    new Phaser.Geom.Point(cx - hw, cy),
  ];
}

export function drawDiamond(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha = 1,
): void {
  graphics.fillStyle(color, alpha);
  graphics.fillPoints(
    [
      new Phaser.Geom.Point(x, y - radius),
      new Phaser.Geom.Point(x + radius, y),
      new Phaser.Geom.Point(x, y + radius),
      new Phaser.Geom.Point(x - radius, y),
    ],
    true,
  );
}
