import { REGISTRY_KEYS } from '@/constants/scenes';
import { AudioManager } from '@/game/audio/AudioManager';
import { FullscreenManager } from '@/game/config/FullscreenManager';
import type { AudioSnapshot } from '@/types/audio';
import type { LoadingSnapshot } from '@/types/loading';
import type { MobileSettings, WelcomeSnapshot } from '@/types/welcome';
import type { GameModeSnapshot } from '@/types/gameModes';
import type { CharacterManagerSnapshot, CharacterSnapshot } from '@/types/characters';
import type { FullscreenSnapshot, OrientationSnapshot, QuitSnapshot } from '@/types/system';

interface DebugRegistry {
  registry: { get: (key: string) => unknown };
  scene: { getScenes: (activeOnly: boolean) => Array<{ scene: { key: string } }> };
}

export interface FADebugState {
  loading: LoadingSnapshot | undefined;
  audio: AudioSnapshot | undefined;
  menu: WelcomeSnapshot | undefined;
  mode: GameModeSnapshot | undefined;
  character: CharacterSnapshot | undefined;
  characterManager: CharacterManagerSnapshot | undefined;
  mobileSettings: MobileSettings | undefined;
  fullscreen: FullscreenSnapshot | undefined;
  orientation: OrientationSnapshot | undefined;
  quit: QuitSnapshot | undefined;
  activeScenes: string[];
}

declare global {
  interface Window {
    __FA__?: {
      state: () => FADebugState;
      loadingCompleteEvents: number;
      welcomeReadyEvents: number;
      modeReadyEvents: number;
      characterReadyEvents: number;
      /** DEV-only raw game handle for inspecting the Web Audio gain node. */
      game: unknown;
      /** DEV-only handle for verifying that SFX respect the mute preference. */
      audioManager: {
        playSfx: (key: string, volume?: number) => void;
        setMuted: (value: boolean) => boolean;
        getSnapshot: () => AudioSnapshot;
      };
    };
  }
}

/** DEV-only inspection hook used by the automated browser verification. */
export function exposeDebugBridge(game: unknown): void {
  const g = game as DebugRegistry;
  let completionEvents = 0;
  let welcomeEvents = 0;
  let modeEvents = 0;
  let characterEvents = 0;
  window.addEventListener('fighters-arena:loading-complete', () => {
    completionEvents += 1;
  });
  window.addEventListener('fighters-arena:welcome-ready', () => {
    welcomeEvents += 1;
  });
  window.addEventListener('fighters-arena:mode-ready', () => {
    modeEvents += 1;
  });
  window.addEventListener('fighters-arena:character-ready', () => {
    characterEvents += 1;
  });

  window.__FA__ = {
    game,
    audioManager: AudioManager.getInstance(),
    state: () => ({
      loading: g.registry.get(REGISTRY_KEYS.LOADING_STATE) as LoadingSnapshot | undefined,
      audio: g.registry.get(REGISTRY_KEYS.AUDIO_STATE) as AudioSnapshot | undefined,
      menu: g.registry.get(REGISTRY_KEYS.MENU_STATE) as WelcomeSnapshot | undefined,
      mode: g.registry.get(REGISTRY_KEYS.MODE_STATE) as GameModeSnapshot | undefined,
      character: g.registry.get(REGISTRY_KEYS.CHARACTER_SCENE_STATE) as
        CharacterSnapshot | undefined,
      characterManager: g.registry.get(REGISTRY_KEYS.CHARACTER_STATE) as
        CharacterManagerSnapshot | undefined,
      mobileSettings: g.registry.get(REGISTRY_KEYS.MOBILE_SETTINGS) as MobileSettings | undefined,
      // Capability flags have no DOM event, so `supported` is read live.
      // `active` stays event-driven because the HUD must react to the
      // fullscreenchange event, not to a DOM property read.
      fullscreen: {
        ...((g.registry.get(REGISTRY_KEYS.FULLSCREEN_STATE) as FullscreenSnapshot | undefined) ?? {
          supported: false,
          active: false,
          changeCount: 0,
          lastError: null,
          requestCount: 0,
          exitCount: 0,
        }),
        supported: FullscreenManager.getInstance().isSupported,
      },
      orientation: g.registry.get(REGISTRY_KEYS.ORIENTATION_STATE) as
        OrientationSnapshot | undefined,
      quit: g.registry.get(REGISTRY_KEYS.QUIT_STATE) as QuitSnapshot | undefined,
      activeScenes: g.scene.getScenes(true).map((scene) => scene.scene.key),
    }),
    get loadingCompleteEvents() {
      return completionEvents;
    },
    get welcomeReadyEvents() {
      return welcomeEvents;
    },
    get modeReadyEvents() {
      return modeEvents;
    },
    get characterReadyEvents() {
      return characterEvents;
    },
  };
}
