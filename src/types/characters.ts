export type CharacterId = 'kenji' | 'shadow' | 'blaze' | 'iron_fist' | 'storm' | 'raven' | 'titan';

export type StatKey = 'power' | 'speed' | 'defense' | 'range';

/** All values are 0..1 fractions of the bar; the UI never hardcodes numbers. */
export type CharacterStats = Record<StatKey, number>;

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  /** Fighting style shown under the large name; defined for every fighter. */
  style: string;
  /** Short uppercase line shown in the bottom information bar. */
  infoText: string;
  accent: number;
  stats: CharacterStats;
  unlocked: boolean;
  cardTextureKey: string;
  showcaseTextureKey: string;
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
