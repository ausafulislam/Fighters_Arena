import { TEXTURE_KEYS } from '@/constants/assets';
import { POPUP_LAYOUT, WELCOME_TEXT } from '@/constants/welcome';
import { PALETTE_HEX } from '@/constants/palette';
import type { PopupCloseReason } from '@/types/welcome';
import { BODY_FONT, DISPLAY_MEDIUM_FONT } from '@/utils/fonts';

import { ArcadeButton } from './ArcadeButton';
import { ModalPopup } from './ModalPopup';

export type AboutDismiss = (reason: PopupCloseReason) => void;

/** The only informational popup in Phase 3. Not a separate scene or page. */
export class AboutPopup extends ModalPopup {
  constructor(scene: Phaser.Scene, onDismiss: AboutDismiss) {
    super(scene, {
      width: POPUP_LAYOUT.about.width,
      height: POPUP_LAYOUT.about.height,
      title: WELCOME_TEXT.aboutTitle,
      onDismiss,
    });
  }

  protected override buildContent(panel: Phaser.GameObjects.Container): void {
    const logo = this.scene.add.image(0, -44, TEXTURE_KEYS.LOGO).setScale(0.4).setAlpha(0.95);
    panel.add(logo);

    const description = this.scene.add
      .text(0, 1, WELCOME_TEXT.aboutDescription, {
        fontFamily: BODY_FONT,
        fontSize: '13px',
        color: '#E9E5F2',
        align: 'center',
        wordWrap: { width: 338 },
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0);
    panel.add(description);

    const meta = this.scene.add
      .text(0, 72, `${WELCOME_TEXT.gameName}   ·   VERSION ${WELCOME_TEXT.version}`, {
        fontFamily: DISPLAY_MEDIUM_FONT,
        fontSize: '10px',
        color: '#FFC247',
      })
      .setOrigin(0.5);
    panel.add(meta);

    const divider = this.scene.add.graphics();
    divider.lineStyle(1, PALETTE_HEX.deepPurple, 0.9);
    divider.beginPath();
    divider.moveTo(-132, 84);
    divider.lineTo(132, 84);
    divider.strokePath();
    panel.add(divider);

    new ArcadeButton(this.scene, {
      x: 0,
      y: 100,
      width: 96,
      height: 24,
      label: WELCOME_TEXT.close,
      variant: 'compact',
      parent: panel,
      onSelect: () => this.close('button'),
    });
  }
}
