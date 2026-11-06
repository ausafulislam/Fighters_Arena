import type Phaser from 'phaser';

import { PALETTE_HEX } from '@/constants/palette';
import { DISPLAY_MEDIUM_FONT } from '@/utils/fonts';
import { addIcon } from '@/utils/icons';
import { addUiText } from '@/utils/typography';

import { ArcadeButton } from './ArcadeButton';
import { ModalPopup } from './ModalPopup';

export interface PauseHandlers {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

/**
 * Functional pause menu: RESUME, RESTART MATCH, QUIT TO MAIN MENU.
 *
 * ModalPopup calls the overridden buildContent() from INSIDE its constructor,
 * before a derived class's own fields are initialised. Static chrome is built
 * there; the handler-bound buttons are added by create() after construction.
 */
export class PausePopup extends ModalPopup {
  private readonly handlers: PauseHandlers;
  private readonly state: { actionTaken: boolean };

  private constructor(scene: Phaser.Scene, handlers: PauseHandlers) {
    // ModalPopup reports every dismissal. A button dismissal already runs its
    // own action (resume / restart / quit), so only outside-click and Escape
    // should fall back to a plain resume.
    const state = { actionTaken: false };
    super(scene, {
      width: 300,
      height: 188,
      title: 'PAUSED',
      onDismiss: () => {
        if (!state.actionTaken) handlers.onResume();
      },
    });
    this.handlers = handlers;
    this.state = state;
  }

  /** Construct and finish wiring the handler-bound buttons. */
  static create(scene: Phaser.Scene, handlers: PauseHandlers): PausePopup {
    const popup = new PausePopup(scene, handlers);
    popup.buildButtons();
    return popup;
  }

  protected override buildContent(panel: Phaser.GameObjects.Container): void {
    panel.add(addIcon(this.scene, 0, -56, 'pause', 22, PALETTE_HEX.gold));
    panel.add(
      addUiText(this.scene, 0, -32, 'THE MATCH IS PAUSED', {
        fontFamily: DISPLAY_MEDIUM_FONT,
        fontSize: '11px',
        color: '#DCD6E8',
      }).setOrigin(0.5),
    );
  }

  private buildButtons(): void {
    const make = (
      y: number,
      label: string,
      action: () => void,
      variant: 'primary' | 'dark',
    ): void => {
      new ArcadeButton(this.scene, {
        x: 0,
        y,
        width: 208,
        height: 26,
        label,
        variant,
        fontSize: 12,
        parent: this.content,
        onSelect: () => {
          this.state.actionTaken = true;
          this.close('button');
          action();
        },
      });
    };
    make(2, 'RESUME', this.handlers.onResume, 'primary');
    make(34, 'RESTART MATCH', this.handlers.onRestart, 'dark');
    make(66, 'QUIT TO MAIN MENU', this.handlers.onQuit, 'dark');
  }

  /** Close from outside the popup without firing its onDismiss handler. */
  dismissExternally(): void {
    this.state.actionTaken = true;
    this.close('button');
  }
}
