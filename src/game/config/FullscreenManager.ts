import type Phaser from 'phaser';

import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import type { FullscreenSnapshot } from '@/types/system';

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

type FullscreenGame = Phaser.Game;

/**
 * The single fullscreen controller used by every screen. The Fullscreen API is
 * requested on the document element (never on the canvas itself), so the
 * 16:9 CSS stage stays letterboxed and the artwork is never stretched.
 *
 * All requests originate from a real pointer/keyboard handler in GameHud;
 * this class never auto-requests fullscreen on load. Rejections and missing
 * browser support are recorded instead of throwing into the game loop.
 */
export class FullscreenManager {
  private static instance: FullscreenManager | null = null;

  static getInstance(): FullscreenManager {
    FullscreenManager.instance ??= new FullscreenManager();
    return FullscreenManager.instance;
  }

  private game: FullscreenGame | null = null;
  private attached = false;
  private lastActive = false;
  private changeCount = 0;
  private requestCount = 0;
  private exitCount = 0;
  private lastError: string | null = null;

  private get doc(): FullscreenDocument {
    return document as FullscreenDocument;
  }

  private get target(): FullscreenElement {
    return document.documentElement as FullscreenElement;
  }

  get isSupported(): boolean {
    const doc = this.doc;
    const target = this.target;
    return Boolean(
      (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) &&
      (typeof target.requestFullscreen === 'function' ||
        typeof target.webkitRequestFullscreen === 'function'),
    );
  }

  get isActive(): boolean {
    return Boolean(this.doc.fullscreenElement ?? this.doc.webkitFullscreenElement ?? null);
  }

  attach(game: FullscreenGame): void {
    if (this.attached) return;
    this.attached = true;
    this.game = game;
    this.lastActive = this.isActive;

    document.addEventListener('fullscreenchange', this.onChange);
    document.addEventListener('webkitfullscreenchange', this.onChange);
    this.publish();
  }

  private readonly onChange = (): void => {
    // Fires for our own requests AND for browser-driven exits (Esc, F11,
    // system UI), so the HUD icon always reflects the real browser state.
    const active = this.isActive;
    if (active !== this.lastActive) {
      this.lastActive = active;
      this.changeCount += 1;
    }
    this.refreshScale();
    this.publish();
  };

  /** FIT scaling is re-measured after the viewport changes; no scene reload. */
  private refreshScale(): void {
    requestAnimationFrame(() => this.game?.scale.refresh());
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  async toggle(): Promise<void> {
    if (!this.isSupported) {
      this.lastError = 'unsupported';
      this.publish();
      return;
    }

    const doc = this.doc;
    try {
      if (this.isActive) {
        this.exitCount += 1;
        if (typeof doc.exitFullscreen === 'function') await doc.exitFullscreen();
        else if (typeof doc.webkitExitFullscreen === 'function') await doc.webkitExitFullscreen();
        this.lastError = null;
      } else {
        this.requestCount += 1;
        const target = this.target;
        if (typeof target.requestFullscreen === 'function') {
          await target.requestFullscreen({ navigationUI: 'hide' });
        } else if (typeof target.webkitRequestFullscreen === 'function') {
          await target.webkitRequestFullscreen();
        }
        this.lastError = null;
      }
    } catch (error) {
      // A denied / cancelled request must not break the menu or throw into
      // Phaser's update loop. The HUD simply stays in its current state.
      this.lastError = error instanceof Error ? error.message : String(error);
    }
    this.onChange();
  }

  getSnapshot(): FullscreenSnapshot {
    return {
      supported: this.isSupported,
      active: this.isActive,
      changeCount: this.changeCount,
      lastError: this.lastError,
      requestCount: this.requestCount,
      exitCount: this.exitCount,
    };
  }

  private publish(): void {
    if (!this.game) return;
    const snapshot = this.getSnapshot();
    this.game.registry.set(REGISTRY_KEYS.FULLSCREEN_STATE, snapshot);
    this.game.events.emit(GAME_EVENTS.FULLSCREEN_CHANGED, snapshot);
    window.dispatchEvent(new CustomEvent('fighters-arena:fullscreen-changed'));
  }

  dispose(): void {
    document.removeEventListener('fullscreenchange', this.onChange);
    document.removeEventListener('webkitfullscreenchange', this.onChange);
    this.attached = false;
    this.game = null;
    FullscreenManager.instance = null;
  }
}
