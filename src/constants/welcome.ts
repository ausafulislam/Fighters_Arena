import { GAME_HEIGHT, GAME_WIDTH } from './game';
import type { MenuItemConfig } from '@/types/welcome';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

/**
 * All positions are fractions of the fixed 640 x 360 internal resolution.
 * Phaser's FIT scaling keeps every proportion identical on any landscape
 * screen, so characters, logo and UI are never stretched.
 */
export const WELCOME_LAYOUT = {
  background: { x: W / 2, y: H / 2 },
  moonGlow: { x: W * 0.5, y: H * 0.115, width: W * 0.34, height: H * 0.42 },
  leftGlow: { x: W * 0.1, y: H * 0.72, width: W * 0.44, height: H * 0.56 },
  rightGlow: { x: W * 0.9, y: H * 0.72, width: W * 0.44, height: H * 0.56 },
  cloud: { x: W * 0.28, y: H * 0.3, width: W * 0.52, alpha: 0.16, speed: 1.4 },
  kenji: { x: W * 0.169, y: H * 0.667 },
  shadow: { x: W * 0.831, y: H * 0.667 },
  logo: { x: W * 0.5, y: H * 0.267, width: 250 },
  menuX: W / 2,
  cornerHud: {
    y: 26,
    width: 30,
    height: 28,
    icons: [
      { x: 566, frame: 5 },
      { x: 610, frame: 6 },
    ],
  },
  tagline: { x: W / 2, y: 341, width: 164, height: 22 },
} as const;

export const WELCOME_DEPTH = {
  BACKGROUND: 0,
  MOON_GLOW: 1,
  SIDE_GLOW: 2,
  CLOUDS: 3,
  FIGHTERS: 8,
  LOGO: 10,
  ATMOSPHERE: 12,
  MENU: 20,
  CORNER_HUD: 24,
  POPUP_DIM: 100,
  POPUP: 101,
} as const;

export const WELCOME_CONFIG = {
  FADE_IN_MS: 420,
  PETAL_COUNT: 22,
  EMBER_COUNT: 14,
  POPUP_IN_MS: 220,
  POPUP_OUT_MS: 160,
  POPUP_DIM_ALPHA: 0.74,
} as const;

/** Button order, vertical positions and which icon sheet frame each uses. */
export const MENU_ITEMS: readonly MenuItemConfig[] = [
  {
    action: 'play',
    label: 'PLAY',
    y: 184,
    width: 190,
    height: 32,
    iconFrame: 0,
    variant: 'primary',
  },
  {
    action: 'settings',
    label: 'SETTINGS',
    y: 218,
    width: 186,
    height: 26,
    iconFrame: 1,
    variant: 'dark',
  },
  {
    action: 'leaderboard',
    label: 'LEADERBOARD',
    y: 247,
    width: 186,
    height: 26,
    iconFrame: 2,
    variant: 'dark',
  },
  {
    action: 'about',
    label: 'ABOUT',
    y: 276,
    width: 186,
    height: 26,
    iconFrame: 3,
    variant: 'dark',
  },
  { action: 'quit', label: 'QUIT', y: 305, width: 186, height: 26, iconFrame: 4, variant: 'dark' },
] as const;

export const WELCOME_TEXT = {
  tagline: 'FIGHT. WIN. BE LEGEND.',
  aboutTitle: "ABOUT FIGHTER'S ARENA",
  aboutDescription:
    "FIGHTER'S ARENA is a 2D arcade-style fighting game where powerful warriors compete in intense battles. Choose your fighter, master your skills, and become the ultimate arena champion.",
  gameName: "FIGHTER'S ARENA",
  version: '1.0.0',
  settingsTitle: 'SETTINGS',
  close: 'CLOSE',
} as const;

export const POPUP_LAYOUT = {
  about: { width: 400, height: 236 },
  settings: { width: 360, height: 226 },
} as const;
