export type MenuAction = 'play' | 'settings' | 'leaderboard' | 'about' | 'quit';
export type PopupKind = 'about' | 'settings';
export type PopupCloseReason = 'button' | 'outside' | 'escape';
export type TouchControlSize = 'small' | 'medium' | 'large';
export type ButtonVariant = 'primary' | 'dark' | 'compact';

export interface MenuItemConfig {
  action: MenuAction;
  label: string;
  y: number;
  width: number;
  height: number;
  iconFrame: number;
  variant: 'primary' | 'dark';
}

/** Preferences for the future mobile gameplay experience; no controls yet. */
export interface MobileSettings {
  showMobileControls: boolean;
  leftHanded: boolean;
  touchControlSize: TouchControlSize;
}

export interface WelcomeSceneData {
  /** Scene key the transition came from (informational only). */
  from?: string;
}

/** DEV inspection snapshot; also useful for later phases. */
export interface WelcomeSnapshot {
  sceneKey: string;
  activePopup: PopupKind | null;
  selectedIndex: number;
  hoveredIndex: number | null;
  pressCounts: Record<MenuAction, number>;
  popupOpened: number;
  popupClosed: number;
  lastCloseReason: PopupCloseReason | null;
  transitionedFrom: string | null;
}
