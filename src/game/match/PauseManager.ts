/**
 * Pause state separated from match rules. A user pause is intentional and
 * must NEVER be auto-cleared; an orientation pause is temporary and is only
 * released when the device returns to landscape AND the user had not paused.
 */
export class PauseManager {
  private userPaused = false;
  private orientationPaused = false;
  pauseCount = 0;
  resumeCount = 0;
  orientationCount = 0;

  get paused(): boolean {
    return this.userPaused || this.orientationPaused;
  }

  get pausedByUser(): boolean {
    return this.userPaused;
  }

  get pausedByOrientation(): boolean {
    return this.orientationPaused;
  }

  toggle(): boolean {
    if (this.userPaused) {
      this.userPaused = false;
      this.resumeCount += 1;
    } else {
      this.userPaused = true;
      this.pauseCount += 1;
    }
    return this.paused;
  }

  pause(): void {
    if (this.userPaused) return;
    this.userPaused = true;
    this.pauseCount += 1;
  }

  resume(): void {
    if (!this.userPaused) return;
    this.userPaused = false;
    this.resumeCount += 1;
  }

  /** Called from the global ORIENTATION_CHANGED event. */
  setPortrait(portrait: boolean): void {
    if (portrait === this.orientationPaused) return;
    this.orientationPaused = portrait;
    this.orientationCount += 1;
  }

  reset(): void {
    this.userPaused = false;
    this.orientationPaused = false;
  }
}
