import type { FighterAction } from '@/types/input';

/**
 * Central keyboard map. Changing a control here updates gameplay, the on-screen
 * help and the automated tests; no scene hardcodes a KeyboardEvent.code.
 */
export const KEY_BINDINGS: Readonly<Record<string, readonly string[]>> = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  light_punch: ['KeyJ'],
  heavy_punch: ['KeyK'],
  kick: ['KeyL'],
  special: ['KeyU'],
  block: ['Space'],
  // Escape closes the pause popup through ModalPopup; P toggles pause during
  // play, so a single keypress can never pause and resume at the same time.
  pause: ['KeyP'],
} as const;

export const FIGHTER_ACTIONS: readonly FighterAction[] = [
  'left',
  'right',
  'up',
  'down',
  'block',
  'light_punch',
  'heavy_punch',
  'kick',
  'special',
] as const;

export const ACTION_ICONS = {
  left: 'arrow-left',
  right: 'arrow-right',
  up: 'arrow-up',
  down: 'arrow-down',
  light_punch: 'swords',
  heavy_punch: 'hand',
  kick: 'footprints',
  special: 'zap',
  block: 'shield',
} as const;

export const ACTION_LABELS = {
  left: '',
  right: '',
  up: '',
  down: '',
  light_punch: 'P',
  heavy_punch: 'H',
  kick: 'K',
  special: 'S',
  block: 'B',
} as const;

export const TOUCH_SIZE_SCALE = {
  small: 0.84,
  medium: 1,
  large: 1.18,
} as const;
