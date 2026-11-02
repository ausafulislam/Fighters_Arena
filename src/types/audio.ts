export type MusicState =
  'idle' | 'awaiting-unlock' | 'fading-in' | 'playing' | 'paused' | 'stopped';

export interface AudioSnapshot {
  unlocked: boolean;
  contextState: string;
  locked: boolean;
  musicState: MusicState;
  musicKey: string | null;
  volume: number;
  requested: boolean;
  startedAtMs: number | null;
  fadeInMs: number;
}
