export interface FullscreenSnapshot {
  supported: boolean;
  active: boolean;
  changeCount: number;
  lastError: string | null;
  requestCount: number;
  exitCount: number;
}

export interface OrientationSnapshot {
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  changeCount: number;
}

export interface QuitSnapshot {
  requested: boolean;
  attempted: boolean;
  outcome: 'idle' | 'attempting' | 'blocked' | 'closed';
  fallbackShown: boolean;
}
