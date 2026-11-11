import { AUDIO_CONFIG, SFX_FILES } from '@/game/audio/audioKeys';
import type { SfxKey } from '@/game/audio/audioKeys';
import { AudioManager } from '@/game/audio/AudioManager';

/**
 * Single entry point for every sound effect. SFX go through the game-level
 * AudioManager, so the saved mute preference and the master gain apply to
 * combat, UI and music without any scene creating a second sound manager.
 */
export function playSfx(key: SfxKey, volume: number = AUDIO_CONFIG.SFX_VOLUME): void {
  AudioManager.getInstance().playSfx(key, volume);
}

/** Attack configs store the asset filename; resolve it to its cache key. */
export function sfxKeyForFile(name: string): SfxKey | null {
  return SFX_FILES.find((entry) => entry.name === name)?.key ?? null;
}

export function playSfxFile(name: string, volume?: number): void {
  const key = sfxKeyForFile(name);
  if (key) playSfx(key, volume);
}
