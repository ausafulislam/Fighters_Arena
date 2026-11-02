import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import { POPUP_LAYOUT, WELCOME_TEXT } from '@/constants/welcome';
import { loadMobileSettings, saveMobileSettings } from '@/game/settings/mobileSettings';
import type { MobileSettings, PopupCloseReason } from '@/types/welcome';
import { BODY_FONT } from '@/utils/fonts';

import { ArcadeButton } from './ArcadeButton';
import { ModalPopup } from './ModalPopup';
import { SegmentedControl } from './SegmentedControl';
import { ToggleSwitch } from './ToggleSwitch';

export type SettingsDismiss = (reason: PopupCloseReason) => void;

/**
 * Mobile-only preparation settings. Preferences are persisted immediately;
 * no touch controls, audio options or gameplay options exist in this phase.
 */
export class SettingsPopup extends ModalPopup {
  constructor(scene: Phaser.Scene, onDismiss: SettingsDismiss) {
    super(scene, {
      width: POPUP_LAYOUT.settings.width,
      height: POPUP_LAYOUT.settings.height,
      title: WELCOME_TEXT.settingsTitle,
      onDismiss,
    });
  }

  protected override buildContent(panel: Phaser.GameObjects.Container): void {
    let settings: MobileSettings = loadMobileSettings();

    const persist = (patch: Partial<MobileSettings>): void => {
      settings = saveMobileSettings({ ...settings, ...patch });
      this.scene.game.registry.set(REGISTRY_KEYS.MOBILE_SETTINGS, settings);
      this.scene.game.events.emit(GAME_EVENTS.MOBILE_SETTINGS_CHANGED, settings);
    };

    const left = -this.width / 2 + 22;
    const rows = [
      { label: 'Mobile Controls', y: -38 },
      { label: 'Left-Handed Controls', y: 2 },
      { label: 'Touch Control Size', y: 42 },
    ];
    for (const row of rows) {
      panel.add(
        this.scene.add
          .text(left, row.y, row.label, {
            fontFamily: BODY_FONT,
            fontSize: '12px',
            color: '#E9E5F2',
          })
          .setOrigin(0, 0.5),
      );
    }

    new ToggleSwitch(this.scene, {
      x: this.width / 2 - 43,
      y: rows[0]?.y ?? -38,
      value: settings.showMobileControls,
      onLabel: 'SHOW',
      offLabel: 'HIDE',
      parent: panel,
      onChange: (value) => persist({ showMobileControls: value }),
    });

    new ToggleSwitch(this.scene, {
      x: this.width / 2 - 43,
      y: rows[1]?.y ?? 2,
      value: settings.leftHanded,
      onLabel: 'ON',
      offLabel: 'OFF',
      parent: panel,
      onChange: (value) => persist({ leftHanded: value }),
    });

    new SegmentedControl(this.scene, {
      x: this.width / 2 - 104,
      y: rows[2]?.y ?? 42,
      width: 168,
      height: 22,
      options: [
        { label: 'SMALL', value: 'small' },
        { label: 'MEDIUM', value: 'medium' },
        { label: 'LARGE', value: 'large' },
      ],
      value: settings.touchControlSize,
      parent: panel,
      onChange: (value) => persist({ touchControlSize: value }),
    });

    new ArcadeButton(this.scene, {
      x: 0,
      y: 92,
      width: 96,
      height: 24,
      label: WELCOME_TEXT.close,
      variant: 'compact',
      parent: panel,
      onSelect: () => this.close('button'),
    });
  }
}
