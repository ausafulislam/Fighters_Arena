export type MusicState =
  'idle' | 'awaiting-unlock' | 'fading-in' | 'playing' | 'paused' | 'stopped';

export interface AudioSnapshot {
  unlocked: boolean;
  contextState: string;
  locked: boolean;
  musicState: MusicState;
  musicKey: string | null;
  /** Per-sound music volume (the fade-in target), not the master gain. */
  volume: number;
  /** Master gain applied to music AND every SFX. 0 while muted. */
  masterVolume: number;
  muted: boolean;
  requested: boolean;
  startedAtMs: number | null;
  fadeInMs: number;
}
