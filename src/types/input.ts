/** A frame's worth of intent, from keyboard OR virtual touch controls. */
export interface FighterCommand {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  block: boolean;
  light_punch: boolean;
  heavy_punch: boolean;
  kick: boolean;
  special: boolean;
}

export type FighterAction = keyof FighterCommand;

export const EMPTY_COMMAND: FighterCommand = Object.freeze({
  left: false,
  right: false,
  up: false,
  down: false,
  block: false,
  light_punch: false,
  heavy_punch: false,
  kick: false,
  special: false,
});

export interface InputFrame {
  held: FighterCommand;
  pressed: FighterCommand;
}

export interface InputSnapshot {
  keyboardActive: number;
  virtualActive: number;
  pointerCount: number;
  lastSource: 'keyboard' | 'touch' | null;
}
