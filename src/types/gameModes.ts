import type { UiIcon } from '@/utils/icons';

export type GameModeId = 'battle' | 'tournament' | 'versus' | 'survival';

export interface GameModeConfig {
  id: GameModeId;
  title: string;
  /** Compact sentence shown on the card itself. */
  shortDescription: string;
  /** Exact uppercase copy shown in the bottom information bar. */
  infoText: string;
  icon: UiIcon;
  textureKey: string;
  accent: number;
}

export interface GameModeSceneData {
  /** Scene key the transition came from (informational only). */
  from?: string;
}

/** DEV inspection snapshot; also useful for later phases. */
export interface GameModeSnapshot {
  sceneKey: string;
  selectedIndex: number;
  hoveredIndex: number | null;
  pressCounts: Record<GameModeId, number>;
  description: string;
  backCount: number;
  transitionedFrom: string | null;
}
