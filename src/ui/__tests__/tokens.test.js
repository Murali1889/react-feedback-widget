import { describe, it, expect } from 'vitest';
import { tokens, light, dark, tintedBg } from '../tokens.js';

const COLOR_KEYS = [
  'bg', 'canvas', 'surface',
  'text', 'textMuted', 'textFaint',
  'border', 'borderStrong',
  'accent', 'accentHover', 'accentTint', 'accentText', 'accentRing',
  'success', 'successBg', 'warning', 'warningBg', 'danger', 'dangerBg',
  'selection', 'focusRing',
];
const SPACE_KEYS = ['0','1','2','3','4','5','6','7','8','9','10'];
const RADIUS_KEYS = ['sm','md','lg','pill'];
const FONT_SIZE_KEYS = ['xs','sm','base','md','lg'];
const FONT_WEIGHT_KEYS = ['regular','medium','semibold'];
const SHADOW_KEYS = ['0','1','2','3'];
const MOTION_KEYS = ['fast','base','slow','ease'];

describe('tokens module', () => {
  it('exports light and dark profiles', () => {
    expect(light.mode).toBe('light');
    expect(dark.mode).toBe('dark');
    expect(tokens.light).toBe(light);
    expect(tokens.dark).toBe(dark);
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ])('%s profile has every required color key', (_, profile) => {
    for (const k of COLOR_KEYS) expect(profile.color[k]).toBeTruthy();
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ])('%s profile has shared scales (space/radius/font/shadow/motion)', (_, profile) => {
    for (const k of SPACE_KEYS) expect(profile.space[k]).toBeDefined();
    for (const k of RADIUS_KEYS) expect(profile.radius[k]).toBeDefined();
    for (const k of FONT_SIZE_KEYS) expect(profile.font.size[k]).toBeDefined();
    for (const k of FONT_WEIGHT_KEYS) expect(profile.font.weight[k]).toBeDefined();
    for (const k of SHADOW_KEYS) expect(profile.shadow[k]).toBeDefined();
    for (const k of MOTION_KEYS) expect(profile.motion[k]).toBeDefined();
  });

  it('profiles are deeply frozen', () => {
    expect(Object.isFrozen(light)).toBe(true);
    expect(Object.isFrozen(dark)).toBe(true);
    expect(Object.isFrozen(light.color)).toBe(true);
    expect(Object.isFrozen(dark.color)).toBe(true);
  });

  it('light and dark profiles share the same color key set', () => {
    expect(Object.keys(light.color).sort()).toEqual(Object.keys(dark.color).sort());
  });

  it('tintedBg returns a CSS string', () => {
    const css = tintedBg('#0d9488', '12%', 'var(--bg)');
    expect(css).toMatch(/background-color: #0d9488/);
    expect(css).toMatch(/color-mix\(in srgb, #0d9488 12%, transparent\)/);
  });
});
