import type Phaser from 'phaser';

import { FIGHTER_ACTIONS, KEY_BINDINGS } from '@/constants/controls';
import { REGISTRY_KEYS } from '@/constants/scenes';
import { EMPTY_COMMAND } from '@/types/input';
import type { FighterAction, FighterCommand, InputFrame, InputSnapshot } from '@/types/input';

const ACTION_SET: ReadonlySet<string> = new Set<string>(FIGHTER_ACTIONS);

/**
 * One input service for keyboard AND multi-touch virtual controls. Held state
 * is source-agnostic; `pressed` is true only on the frame an action goes down,
 * so holding an attack button can never spam attacks without a cooldown.
 */
export class InputManager {
  private scene: Phaser.Scene | null = null;
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly keyboardActions = new Map<string, string>();
  private keyboardActive = 0;
  private virtualActive = 0;
  private lastSource: 'keyboard' | 'touch' | null = null;
  private pointerCount = 0;

  attach(scene: Phaser.Scene): void {
    if (this.scene) return;
    this.scene = scene;
    for (const [action, codes] of Object.entries(KEY_BINDINGS)) {
      for (const code of codes) this.keyboardActions.set(code, action);
    }
    scene.input.keyboard?.on('keydown', this.onKeyDown, this);
    scene.input.keyboard?.on('keyup', this.onKeyUp, this);
    // Several simultaneous fingers: d-pad + attack + block.
    scene.input.addPointer(4);
    window.addEventListener('blur', this.clearAll);
    this.publish();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const action = this.keyboardActions.get(event.code);
    if (!action) return;
    event.preventDefault?.();
    if (event.repeat || this.held.has(action)) return;
    this.held.add(action);
    this.pressed.add(action);
    this.keyboardActive += 1;
    this.lastSource = 'keyboard';
    this.publish();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const action = this.keyboardActions.get(event.code);
    if (!action) return;
    this.held.delete(action);
    this.publish();
  };

  /** Called by MobileControls on pointer down / up / out. */
  setVirtual(action: FighterAction, down: boolean): void {
    if (!ACTION_SET.has(action)) return;
    if (down) {
      if (this.held.has(action)) return;
      this.held.add(action);
      this.pressed.add(action);
      this.virtualActive += 1;
      this.lastSource = 'touch';
    } else {
      this.held.delete(action);
    }
    this.publish();
  }

  setPointerCount(value: number): void {
    this.pointerCount = value;
    this.publish();
  }

  /** Consume-and-clear just-pressed actions for this frame. */
  read(): InputFrame {
    const held: FighterCommand = { ...EMPTY_COMMAND };
    const pressed: FighterCommand = { ...EMPTY_COMMAND };
    for (const action of FIGHTER_ACTIONS) {
      held[action] = this.held.has(action);
      pressed[action] = this.pressed.has(action);
    }
    this.pressed.clear();
    return { held, pressed };
  }

  consumePause(): boolean {
    const had = this.pressed.has('pause');
    this.pressed.delete('pause');
    return had;
  }

  private readonly clearAll = (): void => {
    this.held.clear();
    this.pressed.clear();
    this.publish();
  };

  getSnapshot(): InputSnapshot {
    return {
      keyboardActive: this.keyboardActive,
      virtualActive: this.virtualActive,
      pointerCount: this.pointerCount,
      lastSource: this.lastSource,
    };
  }

  private publish(): void {
    if (!this.scene) return;
    this.scene.game.registry.set(REGISTRY_KEYS.INPUT_STATE, this.getSnapshot());
  }

  destroy(): void {
    this.scene?.input.keyboard?.off('keydown', this.onKeyDown, this);
    this.scene?.input.keyboard?.off('keyup', this.onKeyUp, this);
    window.removeEventListener('blur', this.clearAll);
    this.clearAll();
    this.scene = null;
  }
}
