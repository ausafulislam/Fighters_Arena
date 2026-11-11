export type LoadingPhase = 'loading' | 'completing' | 'complete';

export interface LoadingSceneData {
  /** Optional scene key to start after the completion animation. */
  nextSceneKey?: string;
}

export interface LoadingSnapshot {
  phase: LoadingPhase;
  sceneKey: string;
  realProgress: number;
  displayProgress: number;
  loadedFiles: number;
  totalFiles: number;
  musicArmedAtProgress: number | null;
  musicStartedAtProgress: number | null;
  assetsReady: boolean;
  loadErrors: number;
  nextSceneStarted: boolean;
}
