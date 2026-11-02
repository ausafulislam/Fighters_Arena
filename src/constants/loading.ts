import { GAME_HEIGHT, GAME_WIDTH } from './game';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

/**
 * All positions are fractions of the fixed 640 x 360 internal resolution.
 * Phaser's FIT scaling then keeps every proportion identical on any landscape
 * screen, and nothing is ever stretched.
 */
export const LOADING_LAYOUT = {
  background: { x: W / 2, y: H / 2 },
  moonGlow: { x: W * 0.5, y: H * 0.145, width: W * 0.345, height: H * 0.47 },
  leftGlow: { x: W * 0.086, y: H * 0.667, width: W * 0.47, height: H * 0.61 },
  rightGlow: { x: W * 0.914, y: H * 0.667, width: W * 0.47, height: H * 0.61 },
  clouds: [
    { x: W * 0.2, y: H * 0.395, width: W * 0.515, alpha: 0.26, speed: 1.9 },
    { x: W * 0.81, y: H * 0.44, width: W * 0.47, alpha: 0.23, speed: -1.4 },
    { x: W * 0.52, y: H * 0.31, width: W * 0.36, alpha: 0.14, speed: 1.1 },
  ],
  warmFlames: [
    { x: W * 0.078, y: H * 0.683 },
    { x: W * 0.234, y: H * 0.644 },
  ],
  violetFlames: [
    { x: W * 0.734, y: H * 0.694 },
    { x: W * 0.93, y: H * 0.7 },
  ],
  kenji: { x: W * 0.128, y: H * 0.628 },
  shadow: { x: W * 0.872, y: H * 0.639 },
  logo: { x: W * 0.5, y: H * 0.406 },
  percentage: { x: W / 2, y: H * 0.733 },
  bar: { x: W * 0.25, y: H * 0.789, width: W * 0.5, height: H * 0.061 },
  tip: { y: H * 0.906 },
  ornaments: { left: W * 0.227, right: W * 0.773 },
} as const;

export const DEPTH = {
  BACKGROUND: 0,
  MOON_GLOW: 1,
  CLOUDS: 2,
  LIGHT_POOLS: 3,
  FLAMES: 5,
  FIGHTERS: 8,
  LOGO: 10,
  ATMOSPHERE: 12,
  HUD: 20,
} as const;

export const LOADING_CONFIG = {
  /** Max displayed progress gained per second (fraction). Never exceeds real progress. */
  PROGRESS_RATE: 0.42,
  COMPLETION_HOLD_MS: 560,
  FADE_OUT_MS: 700,
  LOGO_ENTRANCE_MS: 680,
  PETAL_COUNT: 22,
  EMBER_COUNT: 16,
} as const;

export const LOADING_TIP = {
  label: 'TIP: ',
  body: 'Use Special Attacks for maximum damage!',
} as const;
