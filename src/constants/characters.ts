import { characterCardTextureKey, characterShowcaseTextureKey } from '@/constants/assets';
import { GAME_HEIGHT, GAME_WIDTH } from '@/constants/game';
import { PALETTE_HEX } from '@/constants/palette';
import type { CharacterConfig, CharacterId, StatKey } from '@/types/characters';
import type { StageLayout } from '@/types/stage';

const W = GAME_WIDTH;
const H = GAME_HEIGHT;

export const CHARACTER_HEADER_TITLE = 'SELECT CHARACTER';
export const CHARACTER_INFO_DEFAULT = 'CHOOSE YOUR FIGHTER';
export const DEFAULT_CHARACTER_ID: CharacterId = 'kenji';

/** Display order of the four statistics; the bars read from character data. */
export const STAT_ROWS: readonly { key: StatKey; label: string }[] = [
  { key: 'power', label: 'POWER' },
  { key: 'speed', label: 'SPEED' },
  { key: 'defense', label: 'DEFENSE' },
  { key: 'range', label: 'RANGE' },
] as const;

/**
 * Single source of truth for the roster. Statistics, accent colours, names,
 * styles and texture keys live here; no UI component duplicates these values.
 * Kenji and Shadow keep the exact Phase 2 artwork and established identity.
 */
const define = (
  config: Omit<CharacterConfig, 'cardTextureKey' | 'showcaseTextureKey'>,
): CharacterConfig => ({
  ...config,
  cardTextureKey: characterCardTextureKey(config.id),
  showcaseTextureKey: characterShowcaseTextureKey(config.id),
});

export const CHARACTERS: readonly CharacterConfig[] = [
  define({
    id: 'kenji',
    name: 'KENJI',
    style: 'BLAZING FIST / KARATE',
    infoText: 'KENJI — MASTER OF THE BLAZING FIST',
    accent: PALETTE_HEX.orange,
    stats: { power: 0.78, speed: 0.9, defense: 0.6, range: 0.55 },
    unlocked: true,
  }),
  define({
    id: 'shadow',
    name: 'SHADOW',
    style: 'SHADOW ARTS / NINJUTSU',
    infoText: 'SHADOW — SILENT MASTER OF NINJUTSU',
    accent: PALETTE_HEX.purple,
    stats: { power: 0.62, speed: 0.96, defense: 0.52, range: 0.78 },
    unlocked: true,
  }),
  define({
    id: 'blaze',
    name: 'BLAZE',
    style: 'PHOENIX FLAME / STRIKING',
    infoText: 'BLAZE — PHOENIX FLAME OF THE ARENA',
    accent: PALETTE_HEX.gold,
    stats: { power: 0.84, speed: 0.82, defense: 0.58, range: 0.7 },
    unlocked: true,
  }),
  define({
    id: 'iron_fist',
    name: 'IRON FIST',
    style: 'IRON GUARD / BRAWLING',
    infoText: 'IRON FIST — UNBREAKABLE IRON GUARD',
    accent: 0x53d08a,
    stats: { power: 0.94, speed: 0.48, defense: 0.92, range: 0.42 },
    unlocked: true,
  }),
  define({
    id: 'storm',
    name: 'STORM',
    style: 'THUNDER STYLE / KICKBOXING',
    infoText: 'STORM — LIGHTNING-FAST THUNDER STYLE',
    accent: 0x38bfff,
    stats: { power: 0.7, speed: 0.88, defense: 0.62, range: 0.8 },
    unlocked: true,
  }),
  define({
    id: 'raven',
    name: 'RAVEN',
    style: 'BLADE DANCE / KENJUTSU',
    infoText: 'RAVEN — SWIFT BLADE OF THE NIGHT',
    accent: 0xb36bff,
    stats: { power: 0.74, speed: 0.86, defense: 0.56, range: 0.94 },
    unlocked: true,
  }),
  define({
    id: 'titan',
    name: 'TITAN',
    style: 'EARTHBREAKER / GRAPPLING',
    infoText: 'TITAN — UNSTOPPABLE EARTHBREAKER',
    accent: 0xff5a3c,
    stats: { power: 0.98, speed: 0.42, defense: 0.88, range: 0.48 },
    unlocked: true,
  }),
] as const;

export const characterIndex = (id: CharacterId): number =>
  CHARACTERS.findIndex((entry) => entry.id === id);

export const characterById = (id: CharacterId): CharacterConfig | undefined =>
  CHARACTERS.find((entry) => entry.id === id);

/** Only unlocked fighters may be picked, by a card or by RANDOM. */
export const UNLOCKED_CHARACTERS: readonly CharacterConfig[] = CHARACTERS.filter(
  (entry) => entry.unlocked,
);

/**
 * All positions are in the fixed 640 x 360 logical space and double to whole
 * framebuffer pixels under the integer camera zoom.
 */
export const CHARACTER_STAGE_LAYOUT = {
  background: { x: W / 2, y: H / 2 },
  moonGlow: { x: W * 0.5, y: H * 0.12, width: W * 0.34, height: H * 0.4 },
  leftGlow: { x: W * 0.08, y: H * 0.7, width: W * 0.4, height: H * 0.5 },
  rightGlow: { x: W * 0.92, y: H * 0.7, width: W * 0.4, height: H * 0.5 },
  cloud: { x: W * 0.3, y: H * 0.3, width: W * 0.52, alpha: 0.14, speed: 1.2 },
} as const satisfies StageLayout;

export const CHARACTER_LAYOUT = {
  header: { x: W / 2, y: 25, width: 300, height: 34, cut: 12 },
  hud: {
    y: 25,
    width: 30,
    height: 28,
    icons: [
      { x: 566, kind: 'volume' as const },
      { x: 610, kind: 'fullscreen' as const },
    ],
  },
  back: { x: 32, y: 25, width: 34, height: 30 },
  showcase: {
    x: 98,
    y: 150,
    width: 180,
    height: 200,
    nameY: 244,
    styleY: 261,
  },
  stats: {
    x: 14,
    y: 274,
    width: 174,
    height: 42,
    labelX: 21,
    barX: 82,
    barWidth: 96,
    barHeight: 5,
    rowHeight: 10,
    firstRowY: 281,
  },
  cards: {
    width: 64,
    height: 76,
    cut: 7,
    topY: 134,
    bottomY: 222,
    topX: [228, 299, 370, 441] as const,
    bottomX: [264, 335, 406] as const,
  },
  random: {
    x: 556,
    y: 170,
    width: 150,
    height: 190,
    iconY: 150,
    labelY: 272,
  },
  info: { x: W / 2, y: 334, width: 300, height: 22, cut: 10 },
} as const;

export const CHARACTER_DEPTH = {
  BACKGROUND: 0,
  SCRIM: 1,
  MOON_GLOW: 2,
  SIDE_GLOW: 3,
  CLOUDS: 4,
  PETALS: 5,
  SHOWCASE_GLOW: 8,
  SHOWCASE: 9,
  SHOWCASE_PANEL: 12,
  CARD_GLOW: 13,
  CARDS: 14,
  RANDOM: 14,
  HEADER: 20,
  INFO: 20,
  HUD: 22,
  POPUP_DIM: 100,
  POPUP: 101,
} as const;

export const CHARACTER_CONFIG = {
  FADE_IN_MS: 360,
  FADE_OUT_MS: 260,
  PETAL_COUNT: 16,
  HOVER_SCALE: 1.06,
  SELECTED_SCALE: 1.02,
  INFO_FADE_MS: 130,
  /** Time constant for frame-rate independent artwork/stat easing. */
  EASE_MS: 170,
} as const;
