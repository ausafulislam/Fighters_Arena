import Phaser from 'phaser';

import { ASSET_URLS } from '@/constants/assets';
import { BACKGROUND_COLOR } from '@/constants/palette';
import { SCENE_KEYS } from '@/constants/scenes';
import { AudioManager } from '@/game/audio/AudioManager';
import { MUSIC_KEYS } from '@/game/audio/audioKeys';
import { configureSceneCamera } from '@/utils/camera';

/**
 * Infrastructure-only boot phase (no visuals, no screen).
 *
 * The soundtrack is decoded here so it is guaranteed to be in the audio cache
 * before the loading screen reaches its 70% music trigger - playback never has
 * to wait for 100%. The audio service is attached here, as early as possible,
 * so its unlock listeners cover interactions during the whole boot sequence.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  init(): void {
    configureSceneCamera(this);
    AudioManager.getInstance().attach(this.game);
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
  }

  preload(): void {
    this.load.audio(MUSIC_KEYS.THEME, [ASSET_URLS.themeOgg, ASSET_URLS.themeMp3]);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn("[FIGHTER'S ARENA] Audio asset could not be decoded:", file.key);
    });
  }

  create(): void {
    this.scene.start(SCENE_KEYS.LOADING);
  }
}
