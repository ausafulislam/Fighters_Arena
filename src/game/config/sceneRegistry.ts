import { BootScene } from '@/game/scenes/BootScene';
import { LoadingScene } from '@/game/scenes/LoadingScene';
import { WelcomeScene } from '@/game/scenes/WelcomeScene';

/** Scenes registered for this phase. Add new phases here, not in gameConfig. */
export const SCENES = [BootScene, LoadingScene, WelcomeScene];
