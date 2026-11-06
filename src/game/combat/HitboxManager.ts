import Phaser from 'phaser';

import type { Fighter } from '@/game/characters/Fighter';

/**
 * Attack hitboxes exist only during an attack's ACTIVE frames. This module is
 * the single place that decides whether two boxes intersect; combat never
 * registers a hit just because two sprites visually overlap.
 */
export function hitboxIntersects(attacker: Fighter, defender: Fighter): boolean {
  const attackBox = attacker.attackHitbox;
  if (!attackBox) return false;
  return Phaser.Geom.Intersects.RectangleToRectangle(attackBox, defender.bodyBox);
}

export function contactPoint(attacker: Fighter, defender: Fighter): { x: number; y: number } {
  const attackBox = attacker.attackHitbox;
  const body = defender.bodyBox;
  if (!attackBox) return { x: defender.x, y: defender.y - 60 };
  return {
    x: (Math.max(attackBox.left, body.left) + Math.min(attackBox.right, body.right)) / 2,
    y: (Math.max(attackBox.top, body.top) + Math.min(attackBox.bottom, body.bottom)) / 2,
  };
}
