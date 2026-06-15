/**
 * Semantic design tokens for the React Visual Feedback UI.
 * Two profiles (light, dark) — both expose the same shape.
 * Tokens are roles, not chromatic values.
 */

const sharedScale = Object.freeze({
  space: Object.freeze({
    0: '0', 1: '2px', 2: '4px', 3: '8px', 4: '12px',
    5: '16px', 6: '20px', 7: '24px', 8: '32px', 9: '48px', 10: '64px',
  }),
  radius: Object.freeze({ sm: '6px', md: '10px', lg: '14px', pill: '999px' }),
  font: Object.freeze({
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
    size: Object.freeze({ xs: '11.5px', sm: '12.5px', base: '14.5px', md: '16px', lg: '20px' }),
    weight: Object.freeze({ regular: 400, medium: 500, semibold: 600 }),
    lineHeight: Object.freeze({ tight: 1.3, base: 1.5 }),
  }),
  motion: Object.freeze({
    fast: '120ms',
    base: '200ms',
    slow: '320ms',
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }),
});

export const light = Object.freeze({
  mode: 'light',
  color: Object.freeze({
    bg: '#fcfcfa', canvas: '#f7f7f3', surface: '#ffffff',
    text: '#1c1917', textMuted: '#57534e', textFaint: '#a8a29e',
    border: '#e7e6df', borderStrong: '#d6d3cd',
    accent: '#0d9488', accentHover: '#0f766e', accentTint: '#ecfdf5',
    accentText: '#0f766e', accentRing: 'rgba(13,148,136,0.22)',
    success: '#16a34a', successBg: 'color-mix(in srgb, #16a34a 10%, #f7f7f3)',
    warning: '#d97706', warningBg: 'color-mix(in srgb, #d97706 10%, #f7f7f3)',
    danger:  '#dc2626', dangerBg:  'color-mix(in srgb, #dc2626 12%, #f7f7f3)',
    selection: 'rgba(13,148,136,0.16)',
    focusRing: 'rgba(13,148,136,0.30)',
  }),
  shadow: Object.freeze({
    0: 'none',
    1: '0 1px 2px rgba(13,148,136,0.18)',
    2: '0 4px 12px rgba(28,25,23,0.06)',
    3: '0 12px 32px rgba(28,25,23,0.12)',
  }),
  ...sharedScale,
});

export const dark = Object.freeze({
  mode: 'dark',
  color: Object.freeze({
    bg: '#1c1917', canvas: '#292524', surface: '#1f1d1b',
    text: '#fafaf9', textMuted: '#a8a29e', textFaint: '#78716c',
    border: '#292524', borderStrong: '#44403c',
    accent: '#2dd4bf', accentHover: '#14b8a6', accentTint: 'rgba(45,212,191,0.10)',
    accentText: '#5eead4', accentRing: 'rgba(45,212,191,0.34)',
    success: '#4ade80', successBg: 'rgba(74,222,128,0.10)',
    warning: '#fb923c', warningBg: 'rgba(251,146,60,0.10)',
    danger:  '#f87171', dangerBg:  'rgba(248,113,113,0.12)',
    selection: 'rgba(45,212,191,0.20)',
    focusRing: 'rgba(45,212,191,0.40)',
  }),
  shadow: Object.freeze({
    0: 'none',
    1: '0 1px 2px rgba(45,212,191,0.24)',
    2: '0 4px 12px rgba(0,0,0,0.32)',
    3: '0 16px 40px rgba(0,0,0,0.48)',
  }),
  ...sharedScale,
});

export const tokens = Object.freeze({ light, dark });

/**
 * Tinted background CSS with a graceful fallback for browsers that
 * lack `color-mix` (older Safari/Firefox). The fallback is the
 * provided color at full alpha; the modern path mixes with transparent.
 */
export function tintedBg(color, mix = '10%', _base = 'var(--bg)') {
  return `
    background-color: ${color};
    @supports (background: color-mix(in srgb, red, blue)) {
      background-color: color-mix(in srgb, ${color} ${mix}, transparent);
    }
  `;
}
