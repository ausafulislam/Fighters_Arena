import { REGISTRY_KEYS } from '@/constants/scenes';
import type { AudioSnapshot } from '@/types/audio';
import type { LoadingSnapshot } from '@/types/loading';
import type { MobileSettings, WelcomeSnapshot } from '@/types/welcome';

interface DebugRegistry {
  registry: { get: (key: string) => unknown };
  scene: { getScenes: (activeOnly: boolean) => Array<{ scene: { key: string } }> };
}

export interface FADebugState {
  loading: LoadingSnapshot | undefined;
  audio: AudioSnapshot | undefined;
  menu: WelcomeSnapshot | undefined;
  mobileSettings: MobileSettings | undefined;
  activeScenes: string[];
}

declare global {
  interface Window {
    __FA__?: {
      state: () => FADebugState;
      loadingCompleteEvents: number;
      welcomeReadyEvents: number;
      /** DEV-only raw game handle for inspecting the Web Audio gain node. */
      game: unknown;
    };
  }
}

/** DEV-only inspection hook used by the automated browser verification. */
export function exposeDebugBridge(game: unknown): void {
  const g = game as DebugRegistry;
  let completionEvents = 0;
  let welcomeEvents = 0;
  window.addEventListener('fighters-arena:loading-complete', () => {
    completionEvents += 1;
  });
  window.addEventListener('fighters-arena:welcome-ready', () => {
    welcomeEvents += 1;
  });

  window.__FA__ = {
    game,
    state: () => ({
      loading: g.registry.get(REGISTRY_KEYS.LOADING_STATE) as LoadingSnapshot | undefined,
      audio: g.registry.get(REGISTRY_KEYS.AUDIO_STATE) as AudioSnapshot | undefined,
      menu: g.registry.get(REGISTRY_KEYS.MENU_STATE) as WelcomeSnapshot | undefined,
      mobileSettings: g.registry.get(REGISTRY_KEYS.MOBILE_SETTINGS) as MobileSettings | undefined,
      activeScenes: g.scene.getScenes(true).map((scene) => scene.scene.key),
    }),
    get loadingCompleteEvents() {
      return completionEvents;
    },
    get welcomeReadyEvents() {
      return welcomeEvents;
    },
  };
}
