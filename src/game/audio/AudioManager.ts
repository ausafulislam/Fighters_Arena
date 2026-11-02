import Phaser from 'phaser';

import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import type { AudioSnapshot, MusicState } from '@/types/audio';
import { easeOutQuad } from '@/utils/math';

import { AUDIO_CONFIG } from './audioKeys';
import { AudioUnlock } from './AudioUnlock';

type SoundManager = Phaser.Sound.BaseSoundManager;
type PlayableSound =
  Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.NoAudioSound;

/**
 * Game-level (not scene-level) audio service. Music lives here so it survives
 * scene transitions, never restarts on screen updates, and can be extended with
 * SFX / combat audio in later phases without touching the loading screen.
 */
export class AudioManager {
  private static instance: AudioManager | null = null;

  static getInstance(): AudioManager {
    AudioManager.instance ??= new AudioManager();
    return AudioManager.instance;
  }

  private game: Phaser.Game | null = null;
  private sound: SoundManager | null = null;
  private unlockWatcher: AudioUnlock | null = null;
  private unlockListenerAttached = false;
  private music: PlayableSound | null = null;
  private musicKey: string | null = null;
  private fadeFrame: number | null = null;
  private unlocked = false;
  private requested = false;
  private pendingStart = false;
  private state: MusicState = 'idle';
  private startedAtMs: number | null = null;
  private fadeInMs: number = AUDIO_CONFIG.MUSIC_FADE_IN_MS;
  private currentVolume = 0;

  /** Attach once, as early as the boot scene allows. */
  attach(game: Phaser.Game): void {
    if (this.game) return;
    this.game = game;
    this.sound = game.sound;
    game.sound.setVolume(AUDIO_CONFIG.MASTER_VOLUME);

    this.unlockWatcher = new AudioUnlock(() => void this.tryUnlock());
    this.sound.on(Phaser.Sound.Events.UNLOCKED, this.onPhaserUnlocked);
    this.unlockListenerAttached = true;

    // Some browsers grant autoplay without a gesture - try immediately too.
    void this.tryUnlock();
    this.publish();
  }

  private readonly onPhaserUnlocked = (): void => {
    void this.tryUnlock();
  };

  private get context(): AudioContext | null {
    const manager = this.sound as (SoundManager & { context?: AudioContext }) | null;
    return manager?.context ?? null;
  }

  private get locked(): boolean {
    return this.sound?.locked ?? false;
  }

  /** Resume the context on the first valid interaction; start pending music. */
  private async tryUnlock(): Promise<void> {
    const context = this.context;
    if (context && context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // Autoplay still blocked: wait for the next user interaction.
      }
    }

    this.unlocked = this.locked === false && (!context || context.state === 'running');
    if (this.unlocked && this.pendingStart) {
      this.pendingStart = false;
      this.startMusic();
    } else if (this.unlocked && this.music?.isPaused) {
      this.music.resume();
      this.state = 'playing';
    }
    this.publish();
  }

  /**
   * Ask for the theme to start. Safe to call repeatedly: music is created at
   * most once and is never restarted by progress / scene updates.
   */
  requestMusic(key: string, fadeInMs: number = AUDIO_CONFIG.MUSIC_FADE_IN_MS): void {
    if (this.requested) return;
    this.requested = true;
    this.musicKey = key;
    this.fadeInMs = fadeInMs;
    this.startMusic();
    this.publish();
  }

  private startMusic(): void {
    if (!this.game || !this.musicKey) return;
    if (this.music?.isPlaying) return;

    // Do not fabricate playback that the browser will silently discard.
    if (!this.unlocked || !this.game.cache.audio.exists(this.musicKey)) {
      this.pendingStart = true;
      this.state = 'awaiting-unlock';
      this.publish();
      return;
    }

    const sound = this.sound?.add(this.musicKey, { loop: true, volume: 0 }) as
      PlayableSound | undefined;
    if (!sound) {
      this.state = 'awaiting-unlock';
      this.publish();
      return;
    }

    this.music = sound;
    this.music.play();
    // Phaser re-applies its config on play(); force silence again so the fade
    // always starts at 0 instead of briefly blasting at full volume.
    this.music.setVolume(0);
    this.currentVolume = 0;
    this.state = 'fading-in';
    this.startedAtMs = performance.now();
    this.fadeTo(AUDIO_CONFIG.MUSIC_VOLUME, this.fadeInMs, () => {
      this.state = 'playing';
      this.publish();
    });
    this.game.events.emit(GAME_EVENTS.MUSIC_STARTED, { key: this.musicKey });
    this.publish();
  }

  /** rAF-driven fade: independent of scenes, so it survives transitions. */
  private fadeTo(target: number, durationMs: number, onDone?: () => void): void {
    if (!this.music) return;
    if (this.fadeFrame !== null) cancelAnimationFrame(this.fadeFrame);
    const from = this.currentVolume;
    const start = performance.now();

    const step = (now: number): void => {
      if (!this.music) return;
      const t = Math.min(1, (now - start) / Math.max(1, durationMs));
      this.currentVolume = from + (target - from) * easeOutQuad(t);
      this.music.setVolume(this.currentVolume);
      if (t < 1) {
        this.fadeFrame = requestAnimationFrame(step);
      } else {
        this.fadeFrame = null;
        onDone?.();
      }
      this.publish();
    };
    this.fadeFrame = requestAnimationFrame(step);
  }

  stopMusic(fadeOutMs: number = AUDIO_CONFIG.MUSIC_FADE_OUT_MS): void {
    if (!this.music) return;
    const sound = this.music;
    this.fadeTo(0, fadeOutMs, () => {
      sound.stop();
      sound.destroy();
      if (this.music === sound) this.music = null;
      this.state = 'stopped';
      this.publish();
    });
  }

  pauseMusic(): void {
    if (this.music?.isPlaying) {
      this.music.pause();
      this.state = 'paused';
      this.publish();
    }
  }

  resumeMusic(): void {
    if (this.music?.isPaused) {
      this.music.resume();
      this.state = 'playing';
      this.publish();
    }
  }

  setMusicVolume(value: number): void {
    if (this.fadeFrame !== null) cancelAnimationFrame(this.fadeFrame);
    this.fadeFrame = null;
    this.currentVolume = Math.max(0, Math.min(1, value));
    this.music?.setVolume(this.currentVolume);
    this.publish();
  }

  setMasterVolume(value: number): void {
    this.game?.sound.setVolume(Math.max(0, Math.min(1, value)));
    this.publish();
  }

  /** Extension point for menu, UI and combat sounds in later phases. */
  playSfx(key: string, volume: number = AUDIO_CONFIG.SFX_VOLUME): void {
    if (!this.game || !this.sound || !this.game.cache.audio.exists(key)) return;
    const sfx = this.sound.add(key, { loop: false, volume });
    sfx.play();
    sfx.once(Phaser.Sound.Events.COMPLETE, () => sfx.destroy());
  }

  getSnapshot(): AudioSnapshot {
    return {
      unlocked: this.unlocked,
      contextState: this.context?.state ?? 'unavailable',
      locked: this.locked,
      musicState: this.state,
      musicKey: this.musicKey,
      volume: this.currentVolume,
      requested: this.requested,
      startedAtMs: this.startedAtMs,
      fadeInMs: this.fadeInMs,
    };
  }

  private publish(): void {
    this.game?.registry.set(REGISTRY_KEYS.AUDIO_STATE, this.getSnapshot());
  }

  /** Only used when the whole game is torn down; music normally persists. */
  dispose(): void {
    if (this.fadeFrame !== null) cancelAnimationFrame(this.fadeFrame);
    if (this.unlockListenerAttached) {
      this.sound?.off(Phaser.Sound.Events.UNLOCKED, this.onPhaserUnlocked);
    }
    this.unlockWatcher?.dispose();
    this.music?.destroy();
    this.unlockWatcher = null;
    this.unlockListenerAttached = false;
    AudioManager.instance = null;
  }
}
