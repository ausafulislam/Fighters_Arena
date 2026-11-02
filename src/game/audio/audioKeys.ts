/** Audio cache keys and mix levels. SFX keys get added in later phases. */
export const MUSIC_KEYS = {
  THEME: 'music-theme-main',
} as const;

export const SFX_KEYS = {
  // Reserved for menu / UI / combat sounds in later phases.
} as const;

export const AUDIO_CONFIG = {
  /** Music is armed at this real loader progress and fired at the on-screen 70%. */
  MUSIC_TRIGGER_PROGRESS: 0.7,
  MUSIC_FADE_IN_MS: 2200,
  MUSIC_FADE_OUT_MS: 900,
  MUSIC_VOLUME: 0.55,
  MASTER_VOLUME: 0.85,
  SFX_VOLUME: 0.7,
} as const;
