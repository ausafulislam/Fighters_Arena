export type CharacterId = 'kenji' | 'shadow' | 'blaze' | 'iron_fist' | 'storm' | 'raven' | 'titan';

export type StatKey = 'power' | 'speed' | 'defense' | 'range';

/** All values are 0..1 fractions of the bar; the UI never hardcodes numbers. */
export type CharacterStats = Record<StatKey, number>;

/**
 * Centralised combat + animation profile. Every fighter has its own damage,
 * movement, defence, reach and energy tuning; the shared 21-animation frame
 * map lives in constants/fighterFrames.ts and is keyed by the same character
 * id, so no scene has to duplicate per-fighter animation definitions.
 */
export interface CharacterCombat {
  /** Multiplier on base attack damage. */
  damage: number;
  /** Multiplier on walk / run velocity. */
  moveSpeed: number;
  /** Divisor on incoming damage (higher = tougher). */
  defense: number;
  /** Multiplier on attack hitbox reach. */
  reach: number;
  /** Multiplier on special-energy gained. */
  energyGain: number;
  /** Character-specific special-attack name shown in feedback. */
  specialName: string;
  /** Victory pose variant rendered into this fighter's sheet. */
  victoryPose: string;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  /** Fighting style shown under the large name; defined for every fighter. */
  style: string;
  /** Short uppercase line shown in the bottom information bar. */
  infoText: string;
  accent: number;
  stats: CharacterStats;
  combat: CharacterCombat;
  unlocked: boolean;
  cardTextureKey: string;
  showcaseTextureKey: string;
  portraitTextureKey: string;
}

export interface CharacterSceneData {
  from?: string;
  modeId?: string;
}

export interface CharacterSnapshot {
  sceneKey: string;
  selectedId: CharacterId;
  selectedIndex: number;
  selectionCount: number;
  randomCount: number;
  lastSource: 'default' | 'card' | 'keyboard' | 'random' | null;
  selectedName: string;
  style: string;
  stats: CharacterStats;
  infoText: string;
  cardCount: number;
  hoveredIndex: number | null;
  artwork: { x: number; y: number; width: number; height: number };
  backCount: number;
  continueCount: number;
  transitionedFrom: string | null;
  modeId: string | null;
}

export interface CharacterManagerSnapshot {
  selectedId: CharacterId;
  selectedIndex: number;
  selectionCount: number;
  randomCount: number;
  lastSource: 'default' | 'card' | 'keyboard' | 'random' | null;
}
