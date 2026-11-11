import type Phaser from 'phaser';

import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import type { QuitSnapshot } from '@/types/system';

const CLOSE_VERIFY_MS = 360;

interface QuitWindow extends Window {
  /** Hosts (kiosk / embedded shells) can opt in to scripted closing. */
  __FA_ALLOW_CLOSE__?: boolean;
}

/**
 * Owns the QUIT flow. Browsers normally refuse to close a tab that a script
 * did not open, so we only call window.close() in a permitted context and then
 * VERIFY the result. When the tab is still open the popup shows the manual
 * fallback - it never claims the game closed and never blanks the screen.
 */
export class QuitController {
  private static instance: QuitController | null = null;

  static getInstance(): QuitController {
    QuitController.instance ??= new QuitController();
    return QuitController.instance;
  }

  private game: Phaser.Game | null = null;
  private snapshot: QuitSnapshot = {
    requested: false,
    attempted: false,
    outcome: 'idle',
    fallbackShown: false,
  };

  attach(game: Phaser.Game): void {
    if (this.game) return;
    this.game = game;
    this.publish();
  }

  /** True only for script-opened windows or explicitly opted-in hosts. */
  private get closePermitted(): boolean {
    const host = window as QuitWindow;
    return window.opener !== null && window.opener !== undefined
      ? true
      : host.__FA_ALLOW_CLOSE__ === true;
  }

  async attemptQuit(): Promise<QuitSnapshot['outcome']> {
    this.snapshot = {
      ...this.snapshot,
      requested: true,
      outcome: 'attempting',
      fallbackShown: false,
    };
    this.publish();

    if (this.closePermitted) {
      this.snapshot.attempted = true;
      try {
        window.close();
      } catch {
        // A blocked close is silent in most browsers; an exception is handled
        // the same way: we verify the tab is still open just below.
      }
    }

    await new Promise<void>((resolve) => window.setTimeout(resolve, CLOSE_VERIFY_MS));

    // Never pretend success: window.closed is the only honest signal.
    const outcome: QuitSnapshot['outcome'] = window.closed ? 'closed' : 'blocked';
    this.snapshot = { ...this.snapshot, outcome };
    this.publish();
    return outcome;
  }

  markFallbackShown(): void {
    this.snapshot = { ...this.snapshot, fallbackShown: true };
    this.publish();
  }

  getSnapshot(): QuitSnapshot {
    return { ...this.snapshot };
  }

  private publish(): void {
    if (!this.game) return;
    const snapshot = this.getSnapshot();
    this.game.registry.set(REGISTRY_KEYS.QUIT_STATE, snapshot);
    this.game.events.emit(GAME_EVENTS.QUIT_CHANGED, snapshot);
    window.dispatchEvent(new CustomEvent('fighters-arena:quit-changed'));
  }

  dispose(): void {
    this.game = null;
    QuitController.instance = null;
  }
}
