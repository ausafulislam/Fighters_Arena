import { POPUP_LAYOUT, WELCOME_TEXT } from '@/constants/welcome';
import { PALETTE_HEX } from '@/constants/palette';
import { QuitController } from '@/game/config/QuitController';
import type { PopupCloseReason } from '@/types/welcome';
import { BODY_FONT, DISPLAY_MEDIUM_FONT } from '@/utils/fonts';
import { addIcon } from '@/utils/icons';
import { addUiText } from '@/utils/typography';

import { ArcadeButton } from './ArcadeButton';
import { ModalPopup } from './ModalPopup';

export type QuitDismiss = (reason: PopupCloseReason) => void;

/**
 * Real QUIT confirmation. YES asks the browser to close the tab (only in a
 * permitted context) and then VERIFIES the result. If the tab is still open,
 * the same popup turns into an honest manual-close message - the player is
 * never left on a blank screen and no success is claimed.
 */
export class QuitPopup extends ModalPopup {
  private yesButton: ArcadeButton | null = null;
  private cancelButton: ArcadeButton | null = null;
  private resolving = false;

  constructor(scene: Phaser.Scene, onDismiss: QuitDismiss) {
    super(scene, {
      width: POPUP_LAYOUT.quit.width,
      height: POPUP_LAYOUT.quit.height,
      title: WELCOME_TEXT.quitTitle,
      onDismiss,
    });
  }

  protected override buildContent(panel: Phaser.GameObjects.Container): void {
    panel.add(addIcon(this.scene, 0, -38, 'log-out', 26, PALETTE_HEX.orange));

    const message = addUiText(this.scene, 0, -6, WELCOME_TEXT.quitMessage, {
      fontFamily: DISPLAY_MEDIUM_FONT,
      fontSize: '13px',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: this.width - 48 },
    }).setOrigin(0.5);
    panel.add(message);

    const divider = this.scene.add.graphics();
    divider.lineStyle(1, PALETTE_HEX.deepPurple, 0.9);
    divider.beginPath();
    divider.moveTo(-this.width / 2 + 30, 16);
    divider.lineTo(this.width / 2 - 30, 16);
    divider.strokePath();
    panel.add(divider);

    this.yesButton = new ArcadeButton(this.scene, {
      x: -62,
      y: 44,
      width: 100,
      height: 24,
      label: WELCOME_TEXT.yes,
      variant: 'compact',
      parent: panel,
      onSelect: () => void this.confirmQuit(),
    });
    this.cancelButton = new ArcadeButton(this.scene, {
      x: 62,
      y: 44,
      width: 100,
      height: 24,
      label: WELCOME_TEXT.cancel,
      variant: 'compact',
      parent: panel,
      onSelect: () => this.close('button'),
    });
  }

  private async confirmQuit(): Promise<void> {
    if (this.resolving) return;
    this.resolving = true;
    this.yesButton?.setEnabled(false);
    this.cancelButton?.setEnabled(false);

    const outcome = await QuitController.getInstance().attemptQuit();
    if (outcome === 'closed') return;
    this.showFallback();
  }

  private showFallback(): void {
    QuitController.getInstance().markFallbackShown();
    this.content.removeAll(true);

    this.content.add(addIcon(this.scene, 0, -36, 'info', 24, PALETTE_HEX.gold));
    this.content.add(
      addUiText(this.scene, 0, -2, WELCOME_TEXT.quitFallback, {
        fontFamily: BODY_FONT,
        fontSize: '12px',
        color: '#E9E5F2',
        align: 'center',
        wordWrap: { width: this.width - 44 },
        lineSpacing: 2,
      }).setOrigin(0.5),
    );

    new ArcadeButton(this.scene, {
      x: 0,
      y: 48,
      width: 100,
      height: 24,
      label: WELCOME_TEXT.close,
      variant: 'compact',
      parent: this.content,
      onSelect: () => this.close('button'),
    });
  }
}
