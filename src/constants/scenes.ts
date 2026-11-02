/** Scene keys and game-level integration events. */
export const SCENE_KEYS = {
  BOOT: 'Boot',
  LOADING: 'Loading',
  WELCOME: 'Welcome',
  MODE_SELECT: 'ModeSelect',
} as const;

export const GAME_EVENTS = {
  LOADING_PROGRESS: 'fa:loading-progress',
  LOADING_COMPLETE: 'fa:loading-complete',
  MUSIC_STARTED: 'fa:music-started',
  WELCOME_READY: 'fa:welcome-ready',
  MODE_READY: 'fa:mode-ready',
  MOBILE_SETTINGS_CHANGED: 'fa:mobile-settings-changed',
} as const;

/** Registry keys used for state shared between scenes and the debug bridge. */
export const REGISTRY_KEYS = {
  LOADING_STATE: 'fa:loading-state',
  AUDIO_STATE: 'fa:audio-state',
  MENU_STATE: 'fa:menu-state',
  MODE_STATE: 'fa:mode-state',
  MOBILE_SETTINGS: 'fa:mobile-settings',
} as const;
