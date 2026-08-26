import type { TankPalette } from './types';

const VARS: Record<keyof TankPalette, string> = {
  waterTop: '--tank-water-top',
  waterMid: '--tank-water-mid',
  waterDeep: '--tank-water-deep',
  sand: '--tank-sand',
  sandDark: '--tank-sand-dark',
  shaft: '--tank-shaft',
  caustic: '--tank-caustic',
  glass: '--tank-glass',
  bubble: '--tank-bubble',
  plantA: '--tank-plant-a',
  plantB: '--tank-plant-b',
  plantC: '--tank-plant-c',
  room: '--tank-room',
};

/**
 * A tank is lit from above and dark below, so unlike the rest of the UI it does
 * not flip with the theme — an aquarium in a bright room still has deep water
 * in it. The room *behind* the glass is what changes.
 */
export const TANK_PALETTE: TankPalette = {
  waterTop: '#1E7089',
  waterMid: '#124760',
  waterDeep: '#0A2739',
  sand: '#2C4150',
  sandDark: '#1D2D3A',
  shaft: '#96E1F5',
  caustic: '#A6E8FA',
  glass: '#B4E1F0',
  bubble: '#C8F0FF',
  plantA: '#3E8F63',
  plantB: '#2F7350',
  plantC: '#63B183',
  room: '#050F16',
};

export const TANK_PALETTE_LIGHT_ROOM: TankPalette = {
  ...TANK_PALETTE,
  room: '#DCE7ED',
};

/** Read live values off CSS custom properties so tokens stay the source. */
export function paletteFromCss(el: Element = document.documentElement): TankPalette {
  const style = getComputedStyle(el);
  const out = {} as TankPalette;
  (Object.keys(VARS) as (keyof TankPalette)[]).forEach((key) => {
    out[key] = style.getPropertyValue(VARS[key]).trim() || TANK_PALETTE[key];
  });
  return out;
}
