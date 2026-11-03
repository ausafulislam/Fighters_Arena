/**
 * Persisted audio preference. Only the mute flag is player-facing in this
 * phase; the music mix level stays in AUDIO_CONFIG. Reads are validated so a
 * corrupt or stale entry can never leave the game silent by accident.
 */
export const AUDIO_STORAGE_KEY = 'fighters-arena:audio:v1';
export const DEFAULT_MUTED = false;

export function loadAudioPreference(): boolean {
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (raw === null) return DEFAULT_MUTED;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'boolean') return parsed;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).muted === 'boolean'
    ) {
      return (parsed as { muted: boolean }).muted;
    }
    return DEFAULT_MUTED;
  } catch {
    // Private browsing / storage disabled / malformed JSON.
    return DEFAULT_MUTED;
  }
}

/** Returns the value that was actually stored. */
export function saveAudioPreference(muted: boolean): boolean {
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify({ muted }));
  } catch {
    // The preference still applies for this session if storage is unavailable.
  }
  return muted;
}
