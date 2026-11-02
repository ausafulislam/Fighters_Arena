import { SCENE_KEYS } from '@/constants/scenes';

/** The screen that follows loading. Registered in the next development phase. */
export const NEXT_SCENE_KEY: string = SCENE_KEYS.WELCOME;

interface SceneHandle {
  scene: {
    manager: { keys: Record<string, unknown> };
    start: (key: string) => void;
  };
}

/**
 * Hand off to the next screen only when it actually exists. Returns false when
 * the target has not been implemented yet, so the loading screen can fade out
 * cleanly instead of throwing on a missing scene key.
 */
export function startNextScene(scene: SceneHandle, key: string): boolean {
  if (!scene.scene.manager.keys[key]) return false;
  scene.scene.start(key);
  return true;
}
