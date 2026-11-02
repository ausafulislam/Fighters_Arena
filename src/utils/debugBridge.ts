import { REGISTRY_KEYS } from '@/constants/scenes';
import type { AudioSnapshot } from '@/types/audio';
import type { LoadingSnapshot } from '@/types/loading';

interface DebugRegistry {
  registry: { get: (key: string) => unknown };
  scene: { getScenes: (activeOnly: boolean) => Array<{ scene: { key: string } }> };
}

export interface FADebugState {
  loading: LoadingSnapshot | undefined;
  audio: AudioSnapshot | undefined;
  activeScenes: string[];
}

declare global {
  interface Window {
    __FA__?: {
      state: () => FADebugState;
      loadingCompleteEvents: number;
      /** DEV-only raw game handle for inspecting the Web Audio gain node. */
      game: unknown;
    };
  }
}

/** DEV-only inspection hook used by the automated browser verification. */
export function exposeDebugBridge(game: unknown): void {
  const g = game as DebugRegistry;
  let completionEvents = 0;
  window.addEventListener('fighters-arena:loading-complete', () => {
    completionEvents += 1;
  });

  window.__FA__ = {
    game,
    state: () => ({
      loading: g.registry.get(REGISTRY_KEYS.LOADING_STATE) as LoadingSnapshot | undefined,
      audio: g.registry.get(REGISTRY_KEYS.AUDIO_STATE) as AudioSnapshot | undefined,
      activeScenes: g.scene.getScenes(true).map((scene) => scene.scene.key),
    }),
    get loadingCompleteEvents() {
      return completionEvents;
    },
  };
}
