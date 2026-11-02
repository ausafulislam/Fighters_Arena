/** Scene keys and game-level integration events. */
export const SCENE_KEYS = {
  BOOT: 'Boot',
  LOADING: 'Loading',
  // Registered in a later phase; kept here so the handoff contract is explicit.
  WELCOME: 'Welcome',
} as const;

export const GAME_EVENTS = {
  LOADING_PROGRESS: 'fa:loading-progress',
  LOADING_COMPLETE: 'fa:loading-complete',
  MUSIC_STARTED: 'fa:music-started',
} as const;

/** Registry keys used for state shared between scenes and the debug bridge. */
export const REGISTRY_KEYS = {
  LOADING_STATE: 'fa:loading-state',
  AUDIO_STATE: 'fa:audio-state',
} as const;
