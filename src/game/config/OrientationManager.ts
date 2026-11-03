import type Phaser from 'phaser';

import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import type { OrientationSnapshot } from '@/types/system';

export type ScreenOrientation = 'portrait' | 'landscape';

/**
 * Orientation is derived from the ACTUAL viewport dimensions, never from the
 * user agent or a device-type guess. Resize, orientationchange, visualViewport
 * resize and the CSS orientation media query are all observed because mobile
 * browsers fire different subsets of them.
 *
 * No scene is ever started/stopped here: only a DOM attribute is toggled and
 * Phaser's FIT scaling is re-measured on the way back to landscape. That keeps
 * the loading/music/menu state completely intact across rotations.
 */
export class OrientationManager {
  private static instance: OrientationManager | null = null;

  static getInstance(): OrientationManager {
    OrientationManager.instance ??= new OrientationManager();
    return OrientationManager.instance;
  }

  private game: Phaser.Game | null = null;
  private attached = false;
  private orientation: ScreenOrientation = 'landscape';
  private width = 0;
  private height = 0;
  private changeCount = 0;
  private refreshFrame: number | null = null;
  private mediaQuery: MediaQueryList | null = null;

  get isPortrait(): boolean {
    return this.orientation === 'portrait';
  }

  attach(game: Phaser.Game): void {
    if (this.attached) return;
    this.attached = true;
    this.game = game;

    window.addEventListener('resize', this.apply);
    window.addEventListener('orientationchange', this.apply);
    window.visualViewport?.addEventListener('resize', this.apply);
    this.mediaQuery = window.matchMedia?.('(orientation: portrait)') ?? null;
    this.mediaQuery?.addEventListener?.('change', this.apply);

    this.apply();
  }

  private measure(): { width: number; height: number } {
    const viewport = window.visualViewport;
    return {
      width: Math.round(
        viewport?.width ?? window.innerWidth ?? document.documentElement.clientWidth,
      ),
      height: Math.round(
        viewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight,
      ),
    };
  }

  private readonly apply = (): void => {
    const { width, height } = this.measure();
    const next: ScreenOrientation = height > width ? 'portrait' : 'landscape';
    const changed = next !== this.orientation;
    this.width = width;
    this.height = height;
    this.orientation = next;
    document.documentElement.dataset.faOrientation = next;

    if (changed) this.changeCount += 1;
    // Re-measure FIT scaling after EVERY viewport change (including a resize
    // that stays landscape) so the 16:9 stage is always correct. A DOM overlay
    // toggle is all that portrait needs - no scene reload, no restart.
    this.refreshScale();
    this.publish();
  };

  /** One coalesced re-measure per frame, even for bursts of resize events. */
  private refreshScale(): void {
    if (this.refreshFrame !== null) cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.game?.scale.refresh();
    });
  }

  getSnapshot(): OrientationSnapshot {
    return {
      orientation: this.orientation,
      width: this.width,
      height: this.height,
      changeCount: this.changeCount,
    };
  }

  private publish(): void {
    if (!this.game) return;
    const snapshot = this.getSnapshot();
    this.game.registry.set(REGISTRY_KEYS.ORIENTATION_STATE, snapshot);
    this.game.events.emit(GAME_EVENTS.ORIENTATION_CHANGED, snapshot);
    window.dispatchEvent(new CustomEvent('fighters-arena:orientation-changed'));
  }

  dispose(): void {
    window.removeEventListener('resize', this.apply);
    window.removeEventListener('orientationchange', this.apply);
    window.visualViewport?.removeEventListener('resize', this.apply);
    this.mediaQuery?.removeEventListener?.('change', this.apply);
    if (this.refreshFrame !== null) cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = null;
    this.attached = false;
    this.game = null;
    OrientationManager.instance = null;
  }
}
