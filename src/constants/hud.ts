import type Phaser from 'phaser';

/** Shared geometry for the top-left Back badge and top-right system badges. */
export type HudBadgeKind = 'volume' | 'fullscreen';

export interface HudIconPosition {
  x: number;
  kind: HudBadgeKind;
}

export interface HudLayout {
  y: number;
  width: number;
  height: number;
  icons: readonly HudIconPosition[];
}

export interface HudBackLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const HUD_LAYOUT = {
  y: 25,
  width: 30,
  height: 28,
  icons: [
    { x: 566, kind: 'volume' },
    { x: 610, kind: 'fullscreen' },
  ],
} as const satisfies HudLayout;

export const HUD_BACK_LAYOUT = {
  x: 32,
  y: 25,
  width: 34,
  height: 30,
} as const satisfies HudBackLayout;

export interface GameHudOptions {
  scene: Phaser.Scene;
  hud: HudLayout;
  depth: number;
  back?: HudBackLayout;
  onBack?: () => void;
}
