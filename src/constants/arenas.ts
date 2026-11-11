import { PALETTE_HEX } from '@/constants/palette';
import type { ArenaConfig, ArenaId } from '@/types/arenas';

/** Texture keys and URLs are derived from the single arena id. */
export const arenaBackgroundTextureKey = (id: ArenaId): string => `arena-bg-${id}`;
export const arenaCardTextureKey = (id: ArenaId): string => `arena-card-${id}`;

export const DEFAULT_ARENA_ID: ArenaId = 'temple_grounds';

/**
 * Single source of truth for the five arenas. The SAME background texture is
 * used by the preview, the VS intro and the playable match, so the arena that
 * the player locks in is the arena they actually fight in.
 */
export const ARENAS: readonly ArenaConfig[] = [
  {
    id: 'temple_grounds',
    name: 'TEMPLE GROUNDS',
    category: 'CLASSIC ARENA',
    description: 'A traditional temple courtyard where legends are born.',
    tagline: 'MOONLIT COURTYARD',
    accent: PALETTE_HEX.gold,
    ambient: 0xffa64d,
    backgroundTextureKey: arenaBackgroundTextureKey('temple_grounds'),
    cardTextureKey: arenaCardTextureKey('temple_grounds'),
  },
  {
    id: 'blazing_canyon',
    name: 'BLAZING CANYON',
    category: 'LAVA ZONE',
    description: 'Molten rivers and scorched stone beneath a burning sky.',
    tagline: 'VOLCANIC LAVA ZONE',
    accent: PALETTE_HEX.orange,
    ambient: 0xff6a20,
    backgroundTextureKey: arenaBackgroundTextureKey('blazing_canyon'),
    cardTextureKey: arenaCardTextureKey('blazing_canyon'),
  },
  {
    id: 'bamboo_forest',
    name: 'BAMBOO FOREST',
    category: 'NATURAL ARENA',
    description: 'A quiet bamboo grove lit by glowing paper lanterns.',
    tagline: 'LANTERN-LIT GROVE',
    accent: 0x53d08a,
    ambient: 0x7ce0a0,
    backgroundTextureKey: arenaBackgroundTextureKey('bamboo_forest'),
    cardTextureKey: arenaCardTextureKey('bamboo_forest'),
  },
  {
    id: 'frozen_peak',
    name: 'FROZEN PEAK',
    category: 'SNOW ARENA',
    description: 'A snow-covered mountain shrine beneath a pale moon.',
    tagline: 'SNOW-COVERED SHRINE',
    accent: 0x7fd4ff,
    ambient: 0xbfeaff,
    backgroundTextureKey: arenaBackgroundTextureKey('frozen_peak'),
    cardTextureKey: arenaCardTextureKey('frozen_peak'),
  },
  {
    id: 'skyline_rooftop',
    name: 'SKYLINE ROOFTOP',
    category: 'CITY ARENA',
    description: 'A neon rooftop above the sleeping city, slick with rain.',
    tagline: 'NEON CITY ROOFTOP',
    accent: 0xc86bff,
    ambient: 0x9d7bff,
    backgroundTextureKey: arenaBackgroundTextureKey('skyline_rooftop'),
    cardTextureKey: arenaCardTextureKey('skyline_rooftop'),
  },
] as const;

export const arenaIndex = (id: ArenaId): number => ARENAS.findIndex((entry) => entry.id === id);
export const arenaById = (id: ArenaId): ArenaConfig | undefined =>
  ARENAS.find((entry) => entry.id === id);

export const ARENA_LAYOUT = {
  header: { x: 320, y: 25, width: 300, height: 34, cut: 12 },
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
  cards: { width: 108, height: 146, centerY: 176, gap: 8, left: 34, stride: 116, cut: 8 },
  arrows: { y: 176, leftX: 14, rightX: 626, width: 18, height: 30 },
  info: { x: 320, y: 292, width: 370, height: 26, cut: 10 },
  confirm: { x: 320, y: 326, width: 148, height: 28 },
} as const;

export const ARENA_PREVIEW_LAYOUT = {
  header: { x: 320, y: 25, width: 300, height: 34, cut: 12 },
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
  preview: { x: 320, y: 158, width: 320, height: 180, cut: 12 },
  leftPanel: { x: 86, y: 158, width: 132, height: 190 },
  rightPanel: { x: 554, y: 158, width: 132, height: 190 },
  previous: { x: 244, y: 302, width: 26, height: 26 },
  next: { x: 396, y: 302, width: 26, height: 26 },
  confirm: { x: 320, y: 302, width: 134, height: 30 },
  lock: { x: 320, y: 334, width: 260, height: 20 },
} as const;

export const ARENA_DEPTH = {
  BACKGROUND: 0,
  SCRIM: 1,
  MOON_GLOW: 2,
  SIDE_GLOW: 3,
  CLOUDS: 4,
  PETALS: 5,
  PANELS: 8,
  CARD_GLOW: 12,
  CARDS: 14,
  HEADER: 20,
  INFO: 20,
  CONTROLS: 21,
  HUD: 22,
} as const;

export const ARENA_CONFIG = {
  FADE_IN_MS: 340,
  FADE_OUT_MS: 260,
  HOVER_SCALE: 1.035,
  SELECTED_SCALE: 1.02,
  PREVIEW_FADE_MS: 180,
} as const;

export const LOCK_IN_TEXT = 'LOCK IN YOUR ARENA';

/**
 * Layered, non-interactive environment motion. Everything sits behind the
 * fighters (depth < MATCH_DEPTH.FIGHTERS), so ambience can never hide a sprite
 * animation. Values are in the 640 x 360 logical space.
 */
export interface ArenaAmbienceConfig {
  /** Far parallax cloud / mist bank. */
  clouds: number;
  cloudColor: number;
  cloudSpeed: number;
  /** Near falling / drifting particles. */
  particle: 'petal' | 'ember' | 'leaf' | 'snow' | 'rain';
  particleCount: number;
  particleColor: number;
  particleSpeed: number;
  particleSway: number;
  /** Flickering lantern / neon lights. */
  lanterns: number;
  lanternColor: number;
  /** Low ground haze / dust motes. */
  groundMotes: number;
}

export const ARENA_AMBIENCE: Record<ArenaId, ArenaAmbienceConfig> = {
  temple_grounds: {
    clouds: 3,
    cloudColor: 0x9682cd,
    cloudSpeed: 2.2,
    particle: 'petal',
    particleCount: 18,
    particleColor: 0xff8cc8,
    particleSpeed: 10,
    particleSway: 4,
    lanterns: 3,
    lanternColor: 0xffb347,
    groundMotes: 6,
  },
  blazing_canyon: {
    clouds: 2,
    cloudColor: 0x9b3a1e,
    cloudSpeed: 1.4,
    particle: 'ember',
    particleCount: 22,
    particleColor: 0xff6a20,
    particleSpeed: 22,
    particleSway: 5,
    lanterns: 0,
    lanternColor: 0xff5a00,
    groundMotes: 8,
  },
  bamboo_forest: {
    clouds: 2,
    cloudColor: 0x4c8f6a,
    cloudSpeed: 1.0,
    particle: 'leaf',
    particleCount: 16,
    particleColor: 0x7ce0a0,
    particleSpeed: 9,
    particleSway: 6,
    lanterns: 4,
    lanternColor: 0xffc247,
    groundMotes: 5,
  },
  frozen_peak: {
    clouds: 4,
    cloudColor: 0x7fa8cc,
    cloudSpeed: 3.0,
    particle: 'snow',
    particleCount: 26,
    particleColor: 0xbfeaff,
    particleSpeed: 13,
    particleSway: 3,
    lanterns: 0,
    lanternColor: 0x7fd4ff,
    groundMotes: 6,
  },
  skyline_rooftop: {
    clouds: 3,
    cloudColor: 0x5b4b8c,
    cloudSpeed: 2.6,
    particle: 'rain',
    particleCount: 20,
    particleColor: 0x9d7bff,
    particleSpeed: 46,
    particleSway: 0,
    lanterns: 5,
    lanternColor: 0xc86bff,
    groundMotes: 4,
  },
} as const;

/** Three environment features per arena, used by the preview right panel. */
export const ARENA_FEATURES: Record<
  ArenaId,
  readonly { icon: string; label: string; detail: string }[]
> = {
  temple_grounds: [
    { icon: 'sparkles', label: 'Moonlit', detail: 'Environment' },
    { icon: 'trees', label: 'Cherry', detail: 'Blossoms' },
    { icon: 'flame', label: 'Lantern', detail: 'Lighting' },
  ],
  blazing_canyon: [
    { icon: 'flame', label: 'Molten', detail: 'Lava Flow' },
    { icon: 'mountain', label: 'Volcanic', detail: 'Cliffs' },
    { icon: 'sparkles', label: 'Ember', detail: 'Particles' },
  ],
  bamboo_forest: [
    { icon: 'trees', label: 'Dense', detail: 'Bamboo' },
    { icon: 'flame', label: 'Lantern', detail: 'Lighting' },
    { icon: 'sparkles', label: 'Misty', detail: 'Atmosphere' },
  ],
  frozen_peak: [
    { icon: 'snowflake', label: 'Snowy', detail: 'Environment' },
    { icon: 'mountain', label: 'Alpine', detail: 'Backdrop' },
    { icon: 'sparkles', label: 'Icy', detail: 'Atmosphere' },
  ],
  skyline_rooftop: [
    { icon: 'building-2', label: 'Neon', detail: 'Cityscape' },
    { icon: 'sparkles', label: 'Rain', detail: 'Reflections' },
    { icon: 'flame', label: 'Lantern', detail: 'Lighting' },
  ],
} as const;
