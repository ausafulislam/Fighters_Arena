import type Phaser from 'phaser';

/** Small UI textures authored at runtime - available before any file loads. */
export const RUNTIME_TEXTURES = {
  PROGRESS_GRADIENT: 'ui-progress-gradient',
  SOFT_GLOW: 'fx-soft-glow',
  BOTTOM_VIGNETTE: 'ui-bottom-vignette',
} as const;

export function createSoftGlowTexture(scene: Phaser.Scene, size = 128): void {
  const key = RUNTIME_TEXTURES.SOFT_GLOW;
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) return;

  const ctx = texture.getContext();
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

/**
 * Horizontal deep-orange -> orange -> gold fill with a bright top sheen.
 * The image is stretched to the filled width, so the gradient always spans
 * exactly the visible portion of the bar.
 */
export function createProgressGradientTexture(
  scene: Phaser.Scene,
  width: number,
  height: number,
): void {
  const key = RUNTIME_TEXTURES.PROGRESS_GRADIENT;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(
    key,
    Math.max(2, Math.round(width)),
    Math.max(2, Math.round(height)),
  );
  if (!texture) return;

  const w = texture.width;
  const h = texture.height;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, '#D93600');
  gradient.addColorStop(0.28, '#FF5A00');
  gradient.addColorStop(0.7, '#FF8A12');
  gradient.addColorStop(1, '#FFC247');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,240,190,0.42)';
  ctx.fillRect(0, 0, w, Math.max(1, Math.round(h * 0.26)));
  ctx.fillStyle = 'rgba(90,20,0,0.28)';
  ctx.fillRect(0, Math.round(h * 0.78), w, h - Math.round(h * 0.78));
  texture.refresh();
}

/**
 * A soft dark gradient for the bottom of the arena floor. Keeps the small tip
 * text legible over both the bright stone and the warm/violet side lighting.
 */
export function createBottomVignetteTexture(
  scene: Phaser.Scene,
  width: number,
  height: number,
): void {
  const key = RUNTIME_TEXTURES.BOTTOM_VIGNETTE;
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;

  const ctx = texture.getContext();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(16,16,20,0)');
  gradient.addColorStop(0.4, 'rgba(16,16,20,0.5)');
  gradient.addColorStop(1, 'rgba(16,16,20,0.86)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  texture.refresh();
}
