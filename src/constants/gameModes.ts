import { TEXTURE_KEYS } from '@/constants/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { PALETTE_HEX } from '@/constants/palette';
import type { GameModeConfig } from '@/types/gameModes';
import type { UiIcon } from '@/utils/icons';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

const CARD_WIDTH = 134;
const CARD_HEIGHT = 184;
const CARD_GAP = 10;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const CARD_LEFT = (W - (4 * CARD_WIDTH + 3 * CARD_GAP)) / 2;

/**
 * All positions are in the fixed 640 x 360 logical space. The integer camera
 * zoom renders them at 1280 x 720, so every value here doubles to whole
 * framebuffer pixels - no fractional scaling, no stretched artwork.
 */
export const MODE_LAYOUT = {
  background: { x: W / 2, y: H / 2 },
  moonGlow: { x: W * 0.5, y: H * 0.12, width: W * 0.34, height: H * 0.4 },
  leftGlow: { x: W * 0.08, y: H * 0.7, width: W * 0.4, height: H * 0.5 },
  rightGlow: { x: W * 0.92, y: H * 0.7, width: W * 0.4, height: H * 0.5 },
  cloud: { x: W * 0.3, y: H * 0.3, width: W * 0.52, alpha: 0.14, speed: 1.2 },
  header: { x: W / 2, y: 25, width: 300, height: 34, cut: 12 },
  back: { x: 32, y: 25, width: 34, height: 30 },
  hud: {
    y: 25,
    width: 30,
    height: 28,
    icons: [
      { x: 566, icon: 'volume-2' as UiIcon },
      { x: 610, icon: 'maximize' as UiIcon },
    ],
  },
  cards: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    gap: CARD_GAP,
    centerY: 186,
    cut: 9,
    left: CARD_LEFT,
    stride: CARD_STRIDE,
  },
  info: { x: W / 2, y: 318, width: 344, height: 28, cut: 12 },
} as const;

/** Horizontal centre of card `index`; cards are evenly spaced and symmetric. */
export const cardCenterX = (index: number): number =>
  Math.round(CARD_LEFT + CARD_WIDTH / 2 + index * CARD_STRIDE);

export const MODE_DEPTH = {
  BACKGROUND: 0,
  SCRIM: 1,
  MOON_GLOW: 2,
  SIDE_GLOW: 3,
  CLOUDS: 4,
  PETALS: 5,
  CARD_GLOW: 9,
  CARDS: 10,
  HEADER: 20,
  INFO: 20,
  HUD: 22,
} as const;

export const MODE_CONFIG = {
  FADE_IN_MS: 360,
  FADE_OUT_MS: 260,
  PETAL_COUNT: 18,
  HOVER_SCALE: 1.035,
  SELECTED_SCALE: 1.015,
  INFO_FADE_MS: 130,
} as const;

/** Display-only mode catalogue. No mode is implemented in this phase. */
export const GAME_MODES: readonly GameModeConfig[] = [
  {
    id: 'battle',
    title: 'BATTLE MODE',
    shortDescription: 'Fight in an epic 1v1 battle.',
    infoText: 'FIGHT IN AN EPIC 1V1 BATTLE.',
    icon: 'swords',
    textureKey: TEXTURE_KEYS.CARD_BATTLE,
    accent: PALETTE_HEX.orange,
  },
  {
    id: 'tournament',
    title: 'TOURNAMENT',
    shortDescription: 'Compete to become the champion.',
    infoText: 'COMPETE AGAINST WARRIORS AND BECOME THE CHAMPION.',
    icon: 'trophy',
    textureKey: TEXTURE_KEYS.CARD_TOURNAMENT,
    accent: PALETTE_HEX.purple,
  },
  {
    id: 'versus',
    title: 'VERSUS',
    shortDescription: 'Challenge another player.',
    infoText: 'CHALLENGE ANOTHER PLAYER TO A FIGHT.',
    icon: 'users-round',
    textureKey: TEXTURE_KEYS.CARD_VERSUS,
    accent: 0x2a9dff,
  },
  {
    id: 'survival',
    title: 'SURVIVAL',
    shortDescription: 'Test your fighting skills.',
    infoText: 'TEST YOUR SKILLS AND SEE HOW LONG YOU CAN LAST.',
    icon: 'shield',
    textureKey: TEXTURE_KEYS.CARD_SURVIVAL,
    accent: 0xff3b2e,
  },
] as const;

export const DEFAULT_MODE_INDEX = 0;
