/**
 * Watches for the first valid user interaction so the Web Audio context can be
 * unlocked. Browsers that refuse autoplay keep the audio pending until this
 * fires; browsers that already allow playback work without it.
 */
const INTERACTION_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'keydown'] as const;

export type UnlockAttempt = () => void;

export class AudioUnlock {
  private readonly attempt: UnlockAttempt;
  private disposed = false;

  private readonly onInteraction = (): void => {
    if (!this.disposed) this.attempt();
  };

  private readonly onVisibilityChange = (): void => {
    // Some mobile browsers suspend the context when the tab is backgrounded.
    if (!document.hidden && !this.disposed) this.attempt();
  };

  constructor(attempt: UnlockAttempt) {
    this.attempt = attempt;
    for (const event of INTERACTION_EVENTS) {
      window.addEventListener(event, this.onInteraction, { capture: true, passive: true });
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const event of INTERACTION_EVENTS) {
      window.removeEventListener(event, this.onInteraction, { capture: true });
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
