import Phaser from 'phaser';

import { GAME_CONFIG } from '@/game/config/gameConfig';
import '@/styles/main.css';

/**
 * Phase 1 engine bootstrap - the only runtime entry point in the project.
 *
 * It creates the Phaser game instance from the shared configuration and does
 * nothing else. Scenes, characters, arenas, input, audio and gameplay systems
 * are deliberately not registered at this phase; those belong to later phases.
 */
const game = new Phaser.Game(GAME_CONFIG);

export default game;
