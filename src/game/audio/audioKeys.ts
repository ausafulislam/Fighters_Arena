/** Audio cache keys and mix levels. */
export const MUSIC_KEYS = {
  THEME: 'music-theme-main',
} as const;

/** Original synthesised SFX, one cache key per sound. */
export const SFX_KEYS = {
  UI_CLICK: 'sfx-ui-click',
  UI_CONFIRM: 'sfx-ui-confirm',
  UI_BACK: 'sfx-ui-back',
  ROUND_BELL: 'sfx-round-bell',
  PUNCH_LIGHT: 'sfx-punch-light',
  PUNCH_HEAVY: 'sfx-punch-heavy',
  KICK: 'sfx-kick',
  BLOCK: 'sfx-block',
  HIT: 'sfx-hit',
  JUMP: 'sfx-jump',
  ENTRANCE: 'sfx-entrance',
  SPECIAL: 'sfx-special',
  READY: 'sfx-ready',
  FIGHT: 'sfx-fight',
  VICTORY: 'sfx-victory',
  DEFEAT: 'sfx-defeat',
  LAND: 'sfx-land',
  WHIFF: 'sfx-whiff',
  COMBO: 'sfx-combo',
  KO: 'sfx-ko',
} as const;

export type SfxKey = (typeof SFX_KEYS)[keyof typeof SFX_KEYS];

/** Filename -> cache key. The loading screen queues exactly these files. */
export const SFX_FILES: readonly { name: string; key: SfxKey }[] = [
  { name: 'ui_click', key: SFX_KEYS.UI_CLICK },
  { name: 'ui_confirm', key: SFX_KEYS.UI_CONFIRM },
  { name: 'ui_back', key: SFX_KEYS.UI_BACK },
  { name: 'round_bell', key: SFX_KEYS.ROUND_BELL },
  { name: 'punch_light', key: SFX_KEYS.PUNCH_LIGHT },
  { name: 'punch_heavy', key: SFX_KEYS.PUNCH_HEAVY },
  { name: 'kick', key: SFX_KEYS.KICK },
  { name: 'block', key: SFX_KEYS.BLOCK },
  { name: 'hit', key: SFX_KEYS.HIT },
  { name: 'jump', key: SFX_KEYS.JUMP },
  { name: 'entrance', key: SFX_KEYS.ENTRANCE },
  { name: 'special', key: SFX_KEYS.SPECIAL },
  { name: 'ready', key: SFX_KEYS.READY },
  { name: 'fight', key: SFX_KEYS.FIGHT },
  { name: 'victory', key: SFX_KEYS.VICTORY },
  { name: 'defeat', key: SFX_KEYS.DEFEAT },
  { name: 'land', key: SFX_KEYS.LAND },
  { name: 'whiff', key: SFX_KEYS.WHIFF },
  { name: 'combo', key: SFX_KEYS.COMBO },
  { name: 'ko', key: SFX_KEYS.KO },
] as const;

/** Semantic sound names used by gameplay code. */
export const SFX = {
  UI_CLICK: SFX_KEYS.UI_CLICK,
  UI_CONFIRM: SFX_KEYS.UI_CONFIRM,
  UI_BACK: SFX_KEYS.UI_BACK,
  ROUND_BELL: SFX_KEYS.ROUND_BELL,
  ENTRANCE: SFX_KEYS.ENTRANCE,
  READY: SFX_KEYS.READY,
  FIGHT: SFX_KEYS.FIGHT,
  JUMP: SFX_KEYS.JUMP,
  BLOCK: SFX_KEYS.BLOCK,
  HIT: SFX_KEYS.HIT,
  VICTORY: SFX_KEYS.VICTORY,
  DEFEAT: SFX_KEYS.DEFEAT,
  SPECIAL: SFX_KEYS.SPECIAL,
  LAND: SFX_KEYS.LAND,
  WHIFF: SFX_KEYS.WHIFF,
  COMBO: SFX_KEYS.COMBO,
  KO: SFX_KEYS.KO,
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
