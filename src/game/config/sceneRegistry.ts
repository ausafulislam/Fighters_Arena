import { BootScene } from '@/game/scenes/BootScene';
import { LoadingScene } from '@/game/scenes/LoadingScene';
import { WelcomeScene } from '@/game/scenes/WelcomeScene';
import { GameModeScene } from '@/game/scenes/GameModeScene';
import { CharacterScene } from '@/game/scenes/CharacterScene';
import { ArenaScene } from '@/game/scenes/ArenaScene';
import { ArenaPreviewScene } from '@/game/scenes/ArenaPreviewScene';
import { VsIntroScene } from '@/game/scenes/VsIntroScene';
import { GameplayScene } from '@/game/scenes/GameplayScene';

/** Single scene-registration point. Add new phases here, not in gameConfig. */
export const SCENES = [
  BootScene,
  LoadingScene,
  WelcomeScene,
  GameModeScene,
  CharacterScene,
  ArenaScene,
  ArenaPreviewScene,
  VsIntroScene,
  GameplayScene,
];
