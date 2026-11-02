import Phaser from 'phaser';

import { BACKGROUND_COLOR } from '@/constants/palette';
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from '@/constants/scenes';
import { WELCOME_CONFIG } from '@/constants/welcome';
import { loadMobileSettings } from '@/game/settings/mobileSettings';
import { configureSceneCamera } from '@/utils/camera';
import { CornerHud } from '@/game/ui/CornerHud';
import { AboutPopup } from '@/game/ui/AboutPopup';
import { MenuPanel } from '@/game/ui/MenuPanel';
import type { ModalPopup } from '@/game/ui/ModalPopup';
import { SettingsPopup } from '@/game/ui/SettingsPopup';
import { WelcomeStage } from '@/game/ui/WelcomeStage';
import type {
  MenuAction,
  PopupCloseReason,
  PopupKind,
  WelcomeSceneData,
  WelcomeSnapshot,
} from '@/types/welcome';

/**
 * Phase 3 Welcome Screen / Main Menu.
 *
 * The scene owns composition and the action contract; visuals live in
 * WelcomeStage / MenuPanel / CornerHud and both popups share ModalPopup.
 * PLAY, LEADERBOARD and QUIT deliberately have no behaviour beyond their
 * button feedback. The game-level AudioManager is untouched, so the theme
 * started during loading continues across the transition without restarting.
 */
export class WelcomeScene extends Phaser.Scene {
  private stage!: WelcomeStage;
  private menu!: MenuPanel;
  private popup: ModalPopup | null = null;
  private snapshot!: WelcomeSnapshot;
  private transitioning = false;

  constructor() {
    super(SCENE_KEYS.WELCOME);
  }

  init(data?: WelcomeSceneData): void {
    this.popup = null;
    this.transitioning = false;
    this.snapshot = {
      sceneKey: SCENE_KEYS.WELCOME,
      activePopup: null,
      selectedIndex: 0,
      hoveredIndex: null,
      pressCounts: { play: 0, settings: 0, leaderboard: 0, about: 0, quit: 0 },
      popupOpened: 0,
      popupClosed: 0,
      lastCloseReason: null,
      transitionedFrom: data?.from ?? null,
    };
    this.game.registry.set(REGISTRY_KEYS.MOBILE_SETTINGS, loadMobileSettings());
  }

  create(): void {
    configureSceneCamera(this);
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.stage = new WelcomeStage(this);
    new CornerHud(this);
    this.menu = new MenuPanel(this, {
      onAction: (action) => this.handleAction(action),
      onInteraction: () => this.syncMenuState(),
    });

    this.cameras.main.fadeIn(WELCOME_CONFIG.FADE_IN_MS, 16, 16, 20);
    this.game.events.emit(GAME_EVENTS.WELCOME_READY);
    window.dispatchEvent(new CustomEvent('fighters-arena:welcome-ready'));
    this.publish();
  }

  update(time: number, delta: number): void {
    this.stage.update(time, delta);
    this.menu.update(time);
  }

  private handleAction(action: MenuAction): void {
    if (this.transitioning) return;
    this.snapshot.pressCounts[action] += 1;
    if (action === 'play') {
      // Phase 4: PLAY is the one real navigation path - to Game Mode Selection.
      this.goToModeSelect();
    } else if (action === 'about' || action === 'settings') {
      this.openPopup(action);
    } else {
      // LEADERBOARD and QUIT stay display-only with press feedback.
      this.menu.pressAction(action);
    }
    this.publish();
  }

  /** Camera fade out, then hand off. AudioManager is game-level and untouched. */
  private goToModeSelect(): void {
    this.transitioning = true;
    this.menu.pressAction('play');
    this.menu.setInteractiveEnabled(false);
    this.cameras.main.fadeOut(280, 16, 16, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.MODE_SELECT, { from: SCENE_KEYS.WELCOME });
    });
  }

  private openPopup(kind: PopupKind): void {
    if (this.popup) return;
    this.menu.setInteractiveEnabled(false);
    this.snapshot.activePopup = kind;
    this.snapshot.popupOpened += 1;

    const onDismiss = (reason: PopupCloseReason): void => {
      this.snapshot.activePopup = null;
      this.snapshot.popupClosed += 1;
      this.snapshot.lastCloseReason = reason;
      this.popup = null;
      this.menu.setInteractiveEnabled(true);
      this.publish();
    };

    this.popup =
      kind === 'about' ? new AboutPopup(this, onDismiss) : new SettingsPopup(this, onDismiss);
    this.publish();
  }

  private syncMenuState(): void {
    this.snapshot.selectedIndex = this.menu.selection;
    this.snapshot.hoveredIndex = this.menu.hovered;
    this.publish();
  }

  private publish(): void {
    this.game.registry.set(REGISTRY_KEYS.MENU_STATE, {
      ...this.snapshot,
      pressCounts: { ...this.snapshot.pressCounts },
    });
  }
}
