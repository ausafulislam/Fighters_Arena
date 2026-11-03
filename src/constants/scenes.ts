/** Scene keys and game-level integration events. */
export const SCENE_KEYS = {
  BOOT: 'Boot',
  LOADING: 'Loading',
  WELCOME: 'Welcome',
  MODE_SELECT: 'ModeSelect',
  CHARACTER_SELECT: 'CharacterSelect',
} as const;

export const GAME_EVENTS = {
  LOADING_PROGRESS: 'fa:loading-progress',
  LOADING_COMPLETE: 'fa:loading-complete',
  MUSIC_STARTED: 'fa:music-started',
  AUDIO_CHANGED: 'fa:audio-changed',
  FULLSCREEN_CHANGED: 'fa:fullscreen-changed',
  ORIENTATION_CHANGED: 'fa:orientation-changed',
  CHARACTER_CHANGED: 'fa:character-changed',
  QUIT_CHANGED: 'fa:quit-changed',
  WELCOME_READY: 'fa:welcome-ready',
  MODE_READY: 'fa:mode-ready',
  CHARACTER_READY: 'fa:character-ready',
  MOBILE_SETTINGS_CHANGED: 'fa:mobile-settings-changed',
} as const;

/** Registry keys used for state shared between scenes and the debug bridge. */
export const REGISTRY_KEYS = {
  LOADING_STATE: 'fa:loading-state',
  AUDIO_STATE: 'fa:audio-state',
  FULLSCREEN_STATE: 'fa:fullscreen-state',
  ORIENTATION_STATE: 'fa:orientation-state',
  QUIT_STATE: 'fa:quit-state',
  CHARACTER_STATE: 'fa:character-state',
  CHARACTER_SCENE_STATE: 'fa:character-scene-state',
  MENU_STATE: 'fa:menu-state',
  MODE_STATE: 'fa:mode-state',
  MOBILE_SETTINGS: 'fa:mobile-settings',
} as const;
