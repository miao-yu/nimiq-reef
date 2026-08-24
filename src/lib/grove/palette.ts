import type { GrovePalette } from './types';

const VARS: Record<keyof GrovePalette, string> = {
  skyTop: '--sky-top',
  skyBottom: '--sky-bottom',
  soil: '--soil',
  soilDark: '--soil-dark',
  leaf1: '--leaf-1',
  leaf2: '--leaf-2',
  leaf3: '--leaf-3',
  trunk: '--trunk',
  bloomA: '--bloom-a',
  bloomB: '--bloom-b',
};

/** Fallbacks so the server-side share renderer works without a DOM. */
export const LIGHT_PALETTE: GrovePalette = {
  skyTop: '#E8F0E5',
  skyBottom: '#FAFCF7',
  soil: '#D6DCC8',
  soilDark: '#BFC8AE',
  leaf1: '#3E8A5C',
  leaf2: '#2C6845',
  leaf3: '#6BAE81',
  trunk: '#6B5B45',
  bloomA: '#D2941F',
  bloomB: '#E9C468',
};

export const DARK_PALETTE: GrovePalette = {
  skyTop: '#0F1C14',
  skyBottom: '#080F0B',
  soil: '#1A2820',
  soilDark: '#121D16',
  leaf1: '#4FB27C',
  leaf2: '#37855A',
  leaf3: '#7BD4A2',
  trunk: '#7A6244',
  bloomA: '#E8B04A',
  bloomB: '#F3D07E',
};

/** Read the live palette off CSS custom properties so themes just work. */
export function paletteFromCss(el: Element = document.documentElement): GrovePalette {
  const style = getComputedStyle(el);
  const out = {} as GrovePalette;
  (Object.keys(VARS) as (keyof GrovePalette)[]).forEach((key) => {
    const value = style.getPropertyValue(VARS[key]).trim();
    out[key] = value || LIGHT_PALETTE[key];
  });
  return out;
}
