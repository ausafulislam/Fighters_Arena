/** Shared layout contract for the layered moonlit courtyard backdrop. */
export interface StageLayout {
  background: { x: number; y: number };
  moonGlow: { x: number; y: number; width: number; height: number };
  leftGlow: { x: number; y: number; width: number; height: number };
  rightGlow: { x: number; y: number; width: number; height: number };
  cloud: { x: number; y: number; width: number; alpha: number; speed: number };
}

export interface StageDepth {
  BACKGROUND: number;
  SCRIM: number;
  MOON_GLOW: number;
  SIDE_GLOW: number;
  CLOUDS: number;
  PETALS: number;
}
