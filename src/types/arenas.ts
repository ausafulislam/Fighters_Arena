export type ArenaId =
  'temple_grounds' | 'blazing_canyon' | 'bamboo_forest' | 'frozen_peak' | 'skyline_rooftop';

export interface ArenaConfig {
  id: ArenaId;
  name: string;
  category: string;
  description: string;
  /** Short uppercase line for the selection-screen information bar. */
  tagline: string;
  accent: number;
  /** Colour used for ambient particles / glow over this arena. */
  ambient: number;
  backgroundTextureKey: string;
  cardTextureKey: string;
}

export interface ArenaManagerSnapshot {
  selectedId: ArenaId;
  selectedIndex: number;
  selectionCount: number;
  lastSource: 'default' | 'card' | 'arrow' | 'preview' | null;
}

export interface ArenaSceneSnapshot {
  sceneKey: string;
  selectedId: ArenaId;
  selectedIndex: number;
  cardCount: number;
  pressCounts: readonly number[];
  arrowCounts: readonly [number, number];
  confirmCount: number;
  backCount: number;
  transitionedFrom: string | null;
}

export interface ArenaPreviewSnapshot {
  sceneKey: string;
  selectedId: ArenaId;
  selectedIndex: number;
  previewWidth: number;
  previewHeight: number;
  previousCount: number;
  nextCount: number;
  confirmCount: number;
  backCount: number;
  lockText: string;
}

export interface VsIntroSnapshot {
  sceneKey: string;
  playerId: string;
  opponentId: string;
  arenaId: ArenaId;
  stage: string;
  completed: boolean;
}
