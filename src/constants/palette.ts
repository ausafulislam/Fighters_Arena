/**
 * Canonical visual palette (see README -> Visual Style).
 * CSS strings are used for DOM styling; numeric hex values are used by Phaser
 * cameras, graphics, particles and tinting APIs.
 */
export const PALETTE = {
  orange: '#FF5A00',
  deepOrange: '#D93600',
  purple: '#8B2BE2',
  deepPurple: '#4B176F',
  background: '#101014',
  panel: '#1B1B22',
  white: '#FFFFFF',
  gold: '#FFC247',
} as const;

export type PaletteKey = keyof typeof PALETTE;
export type PaletteColor = (typeof PALETTE)[PaletteKey];

export const PALETTE_HEX = {
  orange: 0xff5a00,
  deepOrange: 0xd93600,
  purple: 0x8b2be2,
  deepPurple: 0x4b176f,
  background: 0x101014,
  panel: 0x1b1b22,
  white: 0xffffff,
  gold: 0xffc247,
} as const;

/** Default clear colour for the Phaser game canvas. */
export const BACKGROUND_COLOR = PALETTE.background;
