import Phaser from 'phaser';

import { MENU_ITEMS, WELCOME_DEPTH, WELCOME_LAYOUT, WELCOME_TEXT } from '@/constants/welcome';
import { PALETTE_HEX } from '@/constants/palette';
import type { MenuAction } from '@/types/welcome';
import { MENU_FONT } from '@/utils/fonts';
import { drawDiamond, octagon } from '@/utils/shapes';

import { ArcadeButton } from './ArcadeButton';
import { addUiText } from '@/utils/typography';

interface MenuPanelCallbacks {
  onAction: (action: MenuAction) => void;
  onInteraction: () => void;
}

/**
 * The five-button vertical menu, keyboard selection and the bottom tagline.
 * Buttons that have no behaviour this phase still receive hover / press
 * feedback through ArcadeButton; the scene owns what an action actually does.
 */
export class MenuPanel {
  private readonly scene: Phaser.Scene;
  private readonly callbacks: MenuPanelCallbacks;
  private readonly buttons: ArcadeButton[] = [];
  private readonly tagline: Phaser.GameObjects.Graphics;
  private readonly taglineText: Phaser.GameObjects.Text;
  private selectedIndex = 0;
  private hoveredIndex: number | null = null;
  private enabled = true;

  constructor(scene: Phaser.Scene, callbacks: MenuPanelCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;

    MENU_ITEMS.forEach((item, index) => {
      const button = new ArcadeButton(scene, {
        x: WELCOME_LAYOUT.menuX,
        y: item.y,
        width: item.width,
        height: item.height,
        label: item.label,
        variant: item.variant,
        icon: item.icon,
        iconTint: item.action === 'leaderboard' ? PALETTE_HEX.gold : PALETTE_HEX.white,
        onSelect: () => {
          this.callbacks.onAction(item.action);
        },
        onHover: (hovered) => {
          this.hoveredIndex = hovered
            ? index
            : this.hoveredIndex === index
              ? null
              : this.hoveredIndex;
          this.callbacks.onInteraction();
        },
      });
      this.buttons.push(button);
    });
    this.applySelection();

    const { x, y, width, height } = WELCOME_LAYOUT.tagline;
    this.tagline = scene.add.graphics().setDepth(WELCOME_DEPTH.MENU - 1);
    const pts = octagon(width, height, 8, x, y);
    this.tagline.fillStyle(PALETTE_HEX.background, 0.92);
    this.tagline.fillPoints(pts, true);
    this.tagline.lineStyle(1.5, PALETTE_HEX.orange, 1);
    this.tagline.strokePoints(pts, true);
    drawDiamond(this.tagline, x - width / 2 + 1, y, 4, PALETTE_HEX.gold);
    drawDiamond(this.tagline, x + width / 2 - 1, y, 4, PALETTE_HEX.gold);

    this.taglineText = addUiText(scene, x, y, WELCOME_TEXT.tagline, {
      fontFamily: MENU_FONT,
      fontSize: '12px',
      fontStyle: 'italic',
      color: '#F5F0FA',
    })
      .setOrigin(0.5)
      .setDepth(WELCOME_DEPTH.MENU)
      .setShadow(0, 1, '#000000', 3, false, true);

    scene.input.keyboard?.addCapture(['UP', 'DOWN', 'SPACE', 'ENTER', 'W', 'S']);
    scene.input.keyboard?.on('keydown', this.onKeyDown, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.detachKeyboard, this);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const code = event.code;
    if (code === 'ArrowUp' || code === 'KeyW') {
      this.setSelection((this.selectedIndex + MENU_ITEMS.length - 1) % MENU_ITEMS.length);
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.setSelection((this.selectedIndex + 1) % MENU_ITEMS.length);
    } else if (code === 'Enter' || code === 'Space') {
      const item = MENU_ITEMS[this.selectedIndex];
      if (!item) return;
      this.buttons[this.selectedIndex]?.press();
      this.callbacks.onAction(item.action);
    }
    this.callbacks.onInteraction();
  };

  private applySelection(): void {
    this.buttons.forEach((button, index) => button.setSelected(index === this.selectedIndex));
  }

  setSelection(index: number): void {
    this.selectedIndex = index;
    this.applySelection();
    this.callbacks.onInteraction();
  }

  setInteractiveEnabled(value: boolean): void {
    this.enabled = value;
    this.hoveredIndex = null;
    for (const button of this.buttons) button.setEnabled(value);
    this.taglineText.setAlpha(value ? 1 : 0.72);
    this.callbacks.onInteraction();
  }

  pressAction(action: MenuAction): void {
    const index = MENU_ITEMS.findIndex((item) => item.action === action);
    if (index >= 0) this.buttons[index]?.press();
  }

  update(timeMs: number): void {
    for (const button of this.buttons) button.update(timeMs);
    // Slow breathing of the tagline banner keeps the bottom edge alive.
    this.taglineText.setAlpha((this.enabled ? 0.92 : 0.65) + Math.sin(timeMs * 0.0016) * 0.08);
  }

  get selection(): number {
    return this.selectedIndex;
  }

  get hovered(): number | null {
    return this.hoveredIndex;
  }

  /** GameObjects are owned by the scene; only detach the global key listener. */
  private detachKeyboard(): void {
    this.scene.input.keyboard?.off('keydown', this.onKeyDown, this);
  }
}
