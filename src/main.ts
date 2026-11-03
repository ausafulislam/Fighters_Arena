import Phaser from 'phaser';

import { CharacterSelection } from '@/game/characters/CharacterSelection';
import { GAME_CONFIG } from '@/game/config/gameConfig';
import { SCENES } from '@/game/config/sceneRegistry';
import { FullscreenManager } from '@/game/config/FullscreenManager';
import { OrientationManager } from '@/game/config/OrientationManager';
import { QuitController } from '@/game/config/QuitController';
import { exposeDebugBridge } from '@/utils/debugBridge';
import { loadUiFont } from '@/utils/fonts';
import '@/styles/main.css';

/**
 * Application entry point. The UI font is loaded before Phaser boots so Text
 * objects are rasterised once with the correct face. Scene registration lives
 * in sceneRegistry.ts; game-level services (audio, fullscreen, orientation,
 * quit, character selection) attach once here and are shared by every screen.
 */
async function bootstrap(): Promise<void> {
  await loadUiFont();

  const game = new Phaser.Game({ ...GAME_CONFIG, scene: SCENES });

  OrientationManager.getInstance().attach(game);
  FullscreenManager.getInstance().attach(game);
  QuitController.getInstance().attach(game);
  CharacterSelection.getInstance().attach(game);

  if (import.meta.env.DEV) exposeDebugBridge(game);
}

void bootstrap();
