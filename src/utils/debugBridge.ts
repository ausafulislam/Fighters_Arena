import type Phaser from 'phaser';

import { CHARACTERS } from '@/constants/characters';
import {
  FIGHTER_ANIMATIONS,
  FIGHTER_ANIMATION_NAMES,
  FIGHTER_FRAME_COUNT,
} from '@/constants/fighterFrames';
import { REGISTRY_KEYS } from '@/constants/scenes';
import { fighterAnimKey } from '@/game/animations/FighterAnimator';
import { AudioManager } from '@/game/audio/AudioManager';
import { FullscreenManager } from '@/game/config/FullscreenManager';
import { ArenaSelection } from '@/game/arenas/ArenaSelection';
import { CharacterSelection } from '@/game/characters/CharacterSelection';
import { MatchSetup } from '@/game/match/MatchSetup';
import type { AudioSnapshot } from '@/types/audio';
import type { LoadingSnapshot } from '@/types/loading';
import type { MobileSettings, WelcomeSnapshot } from '@/types/welcome';
import type { GameModeSnapshot } from '@/types/gameModes';
import type { CharacterManagerSnapshot, CharacterSnapshot } from '@/types/characters';
import type {
  ArenaManagerSnapshot,
  ArenaPreviewSnapshot,
  ArenaSceneSnapshot,
  VsIntroSnapshot,
} from '@/types/arenas';
import type { MatchSetupSnapshot, MatchSnapshot } from '@/types/match';
import type { CharacterId } from '@/types/characters';
import type { ArenaId } from '@/types/arenas';
import type { InputSnapshot } from '@/types/input';
import type { FullscreenSnapshot, OrientationSnapshot, QuitSnapshot } from '@/types/system';

interface DebugRegistry {
  registry: { get: (key: string) => unknown };
  scene: { getScenes: (activeOnly: boolean) => Array<{ scene: { key: string } }> };
}

export interface FADebugAnimation {
  name: string;
  key: string;
  exists: boolean;
  frameCount: number;
  frames: number[];
  distinctFrames: number;
  fps: number;
  repeat: number;
  durationMs: number;
}

export interface FADebugAnimationReport {
  frameCount: number;
  animationCount: number;
  characterCount: number;
  allRegistered: boolean;
  allDistinct: boolean;
  characters: Array<{
    id: string;
    allRegistered: boolean;
    animations: FADebugAnimation[];
  }>;
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
  arena: ArenaManagerSnapshot | undefined;
  arenaScene: ArenaSceneSnapshot | undefined;
  arenaPreview: ArenaPreviewSnapshot | undefined;
  vs: VsIntroSnapshot | undefined;
  match: MatchSnapshot | undefined;
  matchSetup: MatchSetupSnapshot | undefined;
  input: InputSnapshot | undefined;
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
      arenaReadyEvents: number;
      previewReadyEvents: number;
      vsReadyEvents: number;
      gameplayReadyEvents: number;
      /** DEV-only raw game handle for inspecting the Web Audio gain node. */
      game: unknown;
      /** DEV-only report proving every fighter has real, distinct Phaser anims. */
      animations: () => FADebugAnimationReport;
      /** DEV-only handle for verifying that SFX respect the mute preference. */
      audioManager: {
        playSfx: (key: string, volume?: number) => void;
        setMuted: (value: boolean) => boolean;
        getSnapshot: () => AudioSnapshot;
      };
      /** DEV-only handles for verifying cross-screen flow state. */
      managers: {
        character: { select: (id: CharacterId) => unknown; getSnapshot: () => unknown };
        arena: { select: (id: ArenaId) => unknown; getSnapshot: () => unknown };
        matchSetup: { getSnapshot: () => unknown };
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
  let arenaEvents = 0;
  let previewEvents = 0;
  let vsEvents = 0;
  let gameplayEvents = 0;
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
  window.addEventListener('fighters-arena:arena-ready', () => {
    arenaEvents += 1;
  });
  window.addEventListener('fighters-arena:preview-ready', () => {
    previewEvents += 1;
  });
  window.addEventListener('fighters-arena:vs-ready', () => {
    vsEvents += 1;
  });
  window.addEventListener('fighters-arena:gameplay-ready', () => {
    gameplayEvents += 1;
  });

  const animationReport = (): FADebugAnimationReport => {
    const active = g.scene.getScenes(true) as Array<{
      anims?: Phaser.Animations.AnimationManager;
    }>;
    const manager =
      (g as unknown as { anims?: Phaser.Animations.AnimationManager }).anims ??
      active.find((scene) => scene.anims)?.anims;
    const characters = CHARACTERS.map((config) => {
      const animations = FIGHTER_ANIMATION_NAMES.map((name): FADebugAnimation => {
        const key = fighterAnimKey(config.id, name);
        const definition = FIGHTER_ANIMATIONS[name];
        const exists = manager?.exists(key) ?? false;
        const frames = exists
          ? (manager?.get(key)?.frames ?? []).map((entry) => Number(entry.frame.name))
          : [];
        return {
          name,
          key,
          exists,
          frameCount: frames.length,
          frames,
          distinctFrames: new Set(frames).size,
          fps: definition.fps,
          repeat: definition.repeat,
          durationMs: definition.durationMs,
        };
      });
      return {
        id: config.id,
        allRegistered: animations.every((entry) => entry.exists),
        animations,
      };
    });
    return {
      frameCount: FIGHTER_FRAME_COUNT,
      animationCount: FIGHTER_ANIMATION_NAMES.length,
      characterCount: characters.length,
      allRegistered: characters.every((entry) =>
        entry.animations.every((anim) => anim.exists && anim.frameCount > 0),
      ),
      allDistinct: characters.every((entry) =>
        entry.animations.every(
          (anim) => anim.distinctFrames === anim.frameCount && anim.frameCount > 0,
        ),
      ),
      characters,
    };
  };

  window.__FA__ = {
    game,
    animations: animationReport,
    audioManager: AudioManager.getInstance(),
    managers: {
      character: CharacterSelection.getInstance(),
      arena: ArenaSelection.getInstance(),
      matchSetup: MatchSetup.getInstance(),
    },
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
      arena: g.registry.get(REGISTRY_KEYS.ARENA_STATE) as ArenaManagerSnapshot | undefined,
      arenaScene: g.registry.get(REGISTRY_KEYS.ARENA_SCENE_STATE) as ArenaSceneSnapshot | undefined,
      arenaPreview: g.registry.get(REGISTRY_KEYS.ARENA_PREVIEW_STATE) as
        ArenaPreviewSnapshot | undefined,
      vs: g.registry.get(REGISTRY_KEYS.VS_STATE) as VsIntroSnapshot | undefined,
      match: g.registry.get(REGISTRY_KEYS.MATCH_STATE) as MatchSnapshot | undefined,
      matchSetup: g.registry.get(REGISTRY_KEYS.MATCH_SETUP) as MatchSetupSnapshot | undefined,
      input: g.registry.get(REGISTRY_KEYS.INPUT_STATE) as InputSnapshot | undefined,
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
    get arenaReadyEvents() {
      return arenaEvents;
    },
    get previewReadyEvents() {
      return previewEvents;
    },
    get vsReadyEvents() {
      return vsEvents;
    },
    get gameplayReadyEvents() {
      return gameplayEvents;
    },
  };
}
