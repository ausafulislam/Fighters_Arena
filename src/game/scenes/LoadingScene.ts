import Phaser from 'phaser';

import { ASSET_URLS, FLAME_FRAME, TEXTURE_KEYS } from '@/constants/assets';
import { LOADING_CONFIG } from '@/constants/loading';
import { BACKGROUND_COLOR } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { AUDIO_CONFIG, MUSIC_KEYS } from '@/game/audio/audioKeys';
import { AudioManager } from '@/game/audio/AudioManager';
import { NEXT_SCENE_KEY, startNextScene } from '@/game/config/gameFlow';
import { FighterShowcase } from '@/game/ui/FighterShowcase';
import { LoadingAtmosphere } from '@/game/ui/LoadingAtmosphere';
import { LoadingBackground } from '@/game/ui/LoadingBackground';
import { LoadingHud } from '@/game/ui/LoadingHud';
import { LogoMark } from '@/game/ui/LogoMark';
import { ProgressBar } from '@/game/ui/ProgressBar';
import type { LoadingPhase, LoadingSceneData, LoadingSnapshot } from '@/types/loading';
import { configureSceneCamera } from '@/utils/camera';
import { applyIconFiltering, loadUiIcons } from '@/utils/icons';
import { clamp } from '@/utils/math';

/**
 * Reusable loading screen.
 *
 * Progress is a rate-limited follower of Phaser's REAL loader progress: the
 * displayed value can never exceed what has actually loaded, and 100% is only
 * possible after the loader's COMPLETE event. Music is armed by the real 70%
 * loader event and fired when the on-screen bar reaches 70%.
 */
export class LoadingScene extends Phaser.Scene {
  private background!: LoadingBackground;
  private atmosphere!: LoadingAtmosphere;
  private fighters!: FighterShowcase;
  private logo!: LogoMark;
  private bar!: ProgressBar;
  private hud!: LoadingHud;

  private readonly revealed = new Set<string>();
  private nextSceneKey: string = NEXT_SCENE_KEY;
  private phase: LoadingPhase = 'loading';
  private realProgress = 0;
  private displayProgress = 0;
  private loadedFiles = 0;
  private totalFiles = 0;
  private assetsReady = false;
  private loadErrors = 0;
  private musicArmedAt: number | null = null;
  private musicStartedAt: number | null = null;
  private nextSceneStarted = false;
  private completionTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super(SCENE_KEYS.LOADING);
  }

  init(data?: LoadingSceneData): void {
    this.nextSceneKey = data?.nextSceneKey ?? NEXT_SCENE_KEY;
    this.revealed.clear();
    this.phase = 'loading';
    this.realProgress = 0;
    this.displayProgress = 0;
    this.loadedFiles = 0;
    this.totalFiles = 0;
    this.assetsReady = false;
    this.loadErrors = 0;
    this.musicArmedAt = null;
    this.musicStartedAt = null;
    this.nextSceneStarted = false;
    this.completionTimer = null;
  }

  preload(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);

    // Graphics / Text UI needs no files, so the bar is live during real loading.
    this.background = new LoadingBackground(this);
    this.atmosphere = new LoadingAtmosphere(this);
    this.fighters = new FighterShowcase(this);
    this.logo = new LogoMark(this);
    this.bar = new ProgressBar(this);
    this.hud = new LoadingHud(this);

    const loader = this.load;
    loader.on(Phaser.Loader.Events.FILE_COMPLETE, this.onFileComplete, this);
    loader.on(Phaser.Loader.Events.PROGRESS, this.onLoadProgress, this);
    loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onLoadError, this);
    loader.once(Phaser.Loader.Events.COMPLETE, this.onLoadComplete, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.removeLoaderListeners, this);

    loader.image(TEXTURE_KEYS.ARENA_NIGHT, ASSET_URLS.arenaNight);
    loader.image(TEXTURE_KEYS.CLOUD_BANK, ASSET_URLS.cloudBank);
    loader.image(TEXTURE_KEYS.GLOW, ASSET_URLS.glow);
    loader.image(TEXTURE_KEYS.KENJI, ASSET_URLS.kenji);
    loader.image(TEXTURE_KEYS.SHADOW, ASSET_URLS.shadow);
    loader.image(TEXTURE_KEYS.LOGO, ASSET_URLS.logo);
    loader.image(TEXTURE_KEYS.PETAL, ASSET_URLS.petal);
    loader.image(TEXTURE_KEYS.EMBER, ASSET_URLS.ember);
    loader.spritesheet(TEXTURE_KEYS.FLAMES_WARM, ASSET_URLS.flamesWarm, {
      frameWidth: FLAME_FRAME.width,
      frameHeight: FLAME_FRAME.height,
    });
    loader.spritesheet(TEXTURE_KEYS.FLAMES_VIOLET, ASSET_URLS.flamesViolet, {
      frameWidth: FLAME_FRAME.width,
      frameHeight: FLAME_FRAME.height,
    });
    // Phase 3 / 4 screen assets are preloaded here too, so every later screen
    // appears immediately at 100% with no second loading phase or blank flash.
    loader.image(TEXTURE_KEYS.WELCOME_COURTYARD, ASSET_URLS.welcomeCourtyard);
    loader.image(TEXTURE_KEYS.CARD_BATTLE, ASSET_URLS.cardBattle);
    loader.image(TEXTURE_KEYS.CARD_TOURNAMENT, ASSET_URLS.cardTournament);
    loader.image(TEXTURE_KEYS.CARD_VERSUS, ASSET_URLS.cardVersus);
    loader.image(TEXTURE_KEYS.CARD_SURVIVAL, ASSET_URLS.cardSurvival);
    // Lucide SVG icons replace the old low-resolution raster icon sheet.
    loadUiIcons(loader);

    // 11 Phase 2 files + courtyard + 4 card plates + 12 Lucide SVGs.
    this.totalFiles = 27;
    this.publish();
  }

  private readonly onFileComplete = (key: string): void => {
    this.loadedFiles += 1;
    this.revealAsset(key);
    this.publish();
  };

  private readonly onLoadProgress = (value: number): void => {
    this.realProgress = clamp(value, 0, 1);
    if (this.musicArmedAt === null && this.realProgress >= AUDIO_CONFIG.MUSIC_TRIGGER_PROGRESS) {
      this.musicArmedAt = this.realProgress;
    }
    this.game.events.emit(GAME_EVENTS.LOADING_PROGRESS, this.realProgress);
    this.publish();
  };

  private readonly onLoadError = (file: Phaser.Loader.File): void => {
    this.loadErrors += 1;
    console.warn(`[FIGHTER'S ARENA] Failed to load asset: ${file.key}`);
  };

  private readonly onLoadComplete = (): void => {
    this.assetsReady = true;
    this.realProgress = 1;
    // Safety net: reveal anything whose FILE_COMPLETE event was missed.
    this.ensureAllVisuals();
    this.publish();
  };

  private readonly removeLoaderListeners = (): void => {
    this.load.off(Phaser.Loader.Events.FILE_COMPLETE, this.onFileComplete, this);
    this.load.off(Phaser.Loader.Events.PROGRESS, this.onLoadProgress, this);
    this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.onLoadError, this);
    this.load.off(Phaser.Loader.Events.COMPLETE, this.onLoadComplete, this);
    this.completionTimer?.remove();
    this.completionTimer = null;
  };

  private revealAsset(key: string): void {
    if (this.revealed.has(key)) return;
    this.revealed.add(key);
    switch (key) {
      case TEXTURE_KEYS.ARENA_NIGHT:
        this.background.revealArena();
        break;
      case TEXTURE_KEYS.GLOW:
        this.background.revealGlows();
        break;
      case TEXTURE_KEYS.CLOUD_BANK:
        this.background.revealClouds();
        break;
      case TEXTURE_KEYS.FLAMES_WARM:
      case TEXTURE_KEYS.FLAMES_VIOLET:
        this.background.revealFlames(key);
        break;
      case TEXTURE_KEYS.KENJI:
      case TEXTURE_KEYS.SHADOW:
        this.fighters.reveal(key);
        break;
      case TEXTURE_KEYS.LOGO:
        this.logo.reveal();
        break;
      case TEXTURE_KEYS.PETAL:
        this.atmosphere.revealPetals();
        break;
      case TEXTURE_KEYS.EMBER:
        this.atmosphere.revealEmbers();
        break;
      default:
        break;
    }
  }

  private ensureAllVisuals(): void {
    for (const key of Object.values(TEXTURE_KEYS)) this.revealAsset(key);
  }

  create(): void {
    applyIconFiltering(this);
    this.ensureAllVisuals();
    this.background.startAnimations();
    this.logo.playEntrance();
    this.cameras.main.fadeIn(260, 16, 16, 20);
    this.publish();
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;

    if (this.phase === 'loading') {
      // Honest progress: never faster than the real loader, never above it.
      this.displayProgress = Math.min(
        this.realProgress,
        this.displayProgress + LOADING_CONFIG.PROGRESS_RATE * dt,
      );
      if (this.assetsReady && this.realProgress >= 1 && this.displayProgress >= 0.9995) {
        this.displayProgress = 1;
      }
      this.bar.setProgress(this.displayProgress);
      this.hud.setProgress(this.displayProgress);

      if (
        this.musicStartedAt === null &&
        this.musicArmedAt !== null &&
        this.displayProgress >= AUDIO_CONFIG.MUSIC_TRIGGER_PROGRESS
      ) {
        this.musicStartedAt = this.displayProgress;
        AudioManager.getInstance().requestMusic(MUSIC_KEYS.THEME);
      }

      if (this.displayProgress >= 1 && this.assetsReady) this.beginCompletion();
    }

    this.background.update(time, delta);
    this.atmosphere.update(time, delta);
    this.fighters.update(time);
    this.logo.update(time);
    this.publish();
  }

  private beginCompletion(): void {
    this.phase = 'completing';
    this.bar.setProgress(1);
    this.hud.setProgress(1);
    this.bar.flash();
    this.hud.pulse();

    this.completionTimer = this.time.delayedCall(LOADING_CONFIG.COMPLETION_HOLD_MS, () => {
      this.cameras.main.fadeOut(LOADING_CONFIG.FADE_OUT_MS, 16, 16, 20);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.phase = 'complete';
        this.game.events.emit(GAME_EVENTS.LOADING_COMPLETE);
        window.dispatchEvent(new CustomEvent('fighters-arena:loading-complete'));
        this.handOff();
      });
    });
    this.publish();
  }

  private handOff(): void {
    this.nextSceneStarted = startNextScene(this, this.nextSceneKey);
    if (!this.nextSceneStarted) {
      // The soundtrack lives on the game-level AudioManager and keeps playing.
      console.info(
        `[FIGHTER'S ARENA] Loading complete. Scene "${this.nextSceneKey}" is not registered.`,
      );
    }
    this.publish();
  }

  private publish(): void {
    const snapshot: LoadingSnapshot = {
      phase: this.phase,
      sceneKey: SCENE_KEYS.LOADING,
      realProgress: this.realProgress,
      displayProgress: this.displayProgress,
      loadedFiles: this.loadedFiles,
      totalFiles: this.totalFiles,
      musicArmedAtProgress: this.musicArmedAt,
      musicStartedAtProgress: this.musicStartedAt,
      assetsReady: this.assetsReady,
      loadErrors: this.loadErrors,
      nextSceneStarted: this.nextSceneStarted,
    };
    this.game.registry.set(REGISTRY_KEYS.LOADING_STATE, snapshot);
  }
}
