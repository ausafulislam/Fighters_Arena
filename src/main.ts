import Phaser from 'phaser';

import { GAME_CONFIG } from '@/game/config/gameConfig';
import { SCENES } from '@/game/config/sceneRegistry';
import { exposeDebugBridge } from '@/utils/debugBridge';
import { loadUiFont } from '@/utils/fonts';
import '@/styles/main.css';

/**
 * Application entry point. The UI font is loaded before Phaser boots so Text
 * objects are rasterised once with the correct face. Scene registration lives
 * in sceneRegistry.ts so this file never becomes a game-logic dumping ground.
 */
async function bootstrap(): Promise<void> {
  await loadUiFont();

  const game = new Phaser.Game({ ...GAME_CONFIG, scene: SCENES });

  if (import.meta.env.DEV) exposeDebugBridge(game);
}

void bootstrap();
