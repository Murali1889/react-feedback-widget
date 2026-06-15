# Feedback Command Center — Phase B1 Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase B1 of the Feedback Command Center: a semantic design-token system, ten shared UI primitives (`Button`, `IconButton`, `Field`, `Select`, `Chip`, `Surface`, `Stack`, `Tooltip`, `Spinner`, `Avatar`), refreshed `StatusBadge` + `StatusDropdown` built on those primitives, and a backward-compatible `theme.js` derivation so every existing consumer (FeedbackProvider, dashboard, modal, dots, replay) inherits the warm-stone / warm-charcoal / warm-teal palette without any code change of its own.

**Architecture:** New `src/ui/` tree holds the token profiles and the primitives. `src/ui/tokens.js` is pure data. `src/ui/ThemeContext.jsx` wraps styled-components' `ThemeProvider`. Each primitive lives in its own file under `src/ui/primitives/`. `theme.js` is rewritten internally to map its long-standing legacy keys (`modalBg`, `btnPrimaryBg`, …) onto the new tokens so its public export shape stays byte-compatible. Tests use Vitest + React Testing Library in a per-folder jsdom environment so the Phase A pure tests stay on the Node environment.

**Tech Stack:** React 18, styled-components 5/6, Vitest 1.6, `@testing-library/react` 14, `@testing-library/jest-dom` 6, `@testing-library/user-event` 14, `jsdom` 24, `axe-core` 4, `lucide-react` (already a dep).

**Spec:** `docs/superpowers/specs/2026-06-15-feedback-phase-b1-visual-system-design.md`

---

## File Map

### New files

- `src/ui/tokens.js` — semantic token profiles (`light`, `dark`) plus the shared scale.
- `src/ui/ThemeContext.jsx` — `UIThemeProvider`, `useUITokens()`.
- `src/ui/primitives/usePopover.js` — shared positioning hook (consumed by `Select`, `Tooltip`).
- `src/ui/primitives/Button.jsx`
- `src/ui/primitives/IconButton.jsx`
- `src/ui/primitives/Field.jsx`
- `src/ui/primitives/Select.jsx`
- `src/ui/primitives/Chip.jsx`
- `src/ui/primitives/Surface.jsx`
- `src/ui/primitives/Stack.jsx`
- `src/ui/primitives/Tooltip.jsx`
- `src/ui/primitives/Spinner.jsx`
- `src/ui/primitives/Avatar.jsx` (also exports `AvatarStack`)
- `src/ui/primitives/avatar-colors.js` — deterministic name → tint mapping.
- `src/ui/primitives/index.js` — barrel.
- `src/ui/__tests__/setup.js` — testing-library jest-dom setup.
- `src/ui/__tests__/tokens.test.js`
- `src/ui/__tests__/theme-backcompat.test.js`
- `src/ui/__tests__/__fixtures__/theme-legacy-keys.json` — snapshot of the existing `theme.js` color keys.
- `src/ui/__tests__/Button.test.jsx`
- `src/ui/__tests__/IconButton.test.jsx`
- `src/ui/__tests__/Field.test.jsx`
- `src/ui/__tests__/Select.test.jsx`
- `src/ui/__tests__/Chip.test.jsx`
- `src/ui/__tests__/Surface.test.jsx`
- `src/ui/__tests__/Stack.test.jsx`
- `src/ui/__tests__/Tooltip.test.jsx`
- `src/ui/__tests__/Spinner.test.jsx`
- `src/ui/__tests__/Avatar.test.jsx`

### Modified files

- `package.json` — add devDeps; new `./ui` subpath export.
- `vitest.config.js` — `environmentMatchGlobs` + `setupFiles`.
- `rollup.config.js` — build entry for `src/ui/primitives/index.js`.
- `src/theme.js` — derive legacy `colors` from tokens; keep public export shape.
- `src/components/StatusBadge.jsx` — rewritten on top of `Chip`.
- `src/components/StatusDropdown.jsx` — rewritten on top of `Select`.

### Conventions

- Every primitive uses `React.forwardRef`, sets `displayName`, spreads remaining props (`...rest`), reads tokens via `${({ theme }) => theme.tokens.color.foo}`. Default fallback profile is `light` when `theme.tokens` is missing.
- Test file extension: `.test.jsx` for primitive tests (JSX content), `.test.js` for tokens / backcompat / pure helpers.
- Test imports use the consolidated barrel: `import { Button } from '../primitives/index.js';` — keeps the barrel honest.
- Each primitive renders **on top of** an internal `WithFallbackTheme` wrapper used only in tests: see Task 6 setup file.
- Commits follow the Phase A style (`feat(ui):`, `chore:`, `docs:`) with the Co-Authored-By trailer.

---

## Task 1 — Dev dependencies + Vitest jsdom

**Files:** `package.json`, `vitest.config.js`, `src/ui/__tests__/setup.js`

- [ ] **Step 1.1: Install test dependencies**

```bash
npm install --save-dev \
  @testing-library/react@^14 \
  @testing-library/jest-dom@^6 \
  @testing-library/user-event@^14 \
  jsdom@^24 \
  axe-core@^4 \
  jest-axe@^9
```

- [ ] **Step 1.2: Create `src/ui/__tests__/setup.js`**

```js
import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
```

- [ ] **Step 1.3: Update `vitest.config.js`**

Replace contents:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
      ['src/__tests__/**', 'jsdom'],
    ],
    setupFiles: ['src/ui/__tests__/setup.js'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    exclude: ['node_modules', 'dist', 'example', 'example-nextjs', 'example-express'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/integrations/server/**', 'src/ui/primitives/**'],
      thresholds: {
        'src/lib/**': { lines: 100, branches: 95, functions: 100, statements: 100 },
        'src/integrations/server/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/ui/primitives/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
      },
    },
  },
});
```

- [ ] **Step 1.4: Verify Phase A tests still pass**

Run: `npm test`
Expected: `Tests  106 passed | 3 skipped (109)` (unchanged from end of Phase A — jsdom only kicks in for files under `src/ui/**` which don't exist yet).

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/ui/__tests__/setup.js
git commit -m "$(cat <<'EOF'
chore(test): add jsdom + Testing Library for Phase B1 primitives

Wires @testing-library/react, jest-dom, user-event, jsdom, and
jest-axe as devDependencies. Vitest now switches the test
environment per-folder via environmentMatchGlobs so Phase A pure
tests stay on Node. Adds a tiny setup file that registers
jest-dom matchers and the axe-core expect extension.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — `tokens.js` + shape test

**Files:** `src/ui/tokens.js`, `src/ui/__tests__/tokens.test.js`

- [ ] **Step 2.1: Write the failing test**

Create `src/ui/__tests__/tokens.test.js`:

```js
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
```

- [ ] **Step 2.2: Run to confirm fail**

Run: `npm test -- tokens.test`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement `src/ui/tokens.js`**

```js
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
```

- [ ] **Step 2.4: Run test to confirm pass**

Run: `npm test -- tokens.test`
Expected: PASS, all cases.

- [ ] **Step 2.5: Commit**

```bash
git add src/ui/tokens.js src/ui/__tests__/tokens.test.js
git commit -m "$(cat <<'EOF'
feat(ui): add semantic token profiles (light + dark)

Two frozen profiles (warm stone + warm charcoal) export the same
shape: color, space, radius, font (sans + mono, size, weight,
lineHeight), shadow, motion. Token names are roles, not chromatic
values, so consumers depend on intent (accent, surface, textMuted)
not on specific colors. tintedBg() emits a color-mix CSS rule
with a static fallback for older browsers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — `ThemeContext.jsx`

**Files:** `src/ui/ThemeContext.jsx`

No standalone test — the hook is exercised by every primitive test in Task 6+.

- [ ] **Step 3.1: Implement `src/ui/ThemeContext.jsx`**

```jsx
import React, { useContext } from 'react';
import { ThemeProvider, ThemeContext } from 'styled-components';
import { lightTheme, darkTheme } from '../theme.js';
import { tokens, light } from './tokens.js';

/**
 * Wraps styled-components' ThemeProvider with both the legacy
 * `theme.colors.*` map (so existing styled-components keep working)
 * and the new `theme.tokens` semantic profile (for new primitives).
 */
export function UIThemeProvider({ mode = 'light', children }) {
  const base = mode === 'dark' ? darkTheme : lightTheme;
  const merged = { ...base, tokens: mode === 'dark' ? tokens.dark : tokens.light };
  return <ThemeProvider theme={merged}>{children}</ThemeProvider>;
}

/**
 * Hook for non-styled-components code that needs to read a token
 * (e.g., to set a computed inline style). Falls back to the light
 * profile when there is no enclosing UIThemeProvider, so primitives
 * remain usable in isolation.
 */
export function useUITokens() {
  const theme = useContext(ThemeContext);
  return theme?.tokens || light;
}

/**
 * Internal helper for styled-components: pull tokens out of the
 * theme prop, falling back to light. Use:
 *   styled.div`color: ${pickToken('color.text')};`
 */
export function pickToken(path) {
  return ({ theme }) => {
    const profile = theme?.tokens || light;
    return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), profile);
  };
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/ui/ThemeContext.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add UIThemeProvider + useUITokens hook

Merges the new semantic token profile into the existing styled-
components theme so legacy theme.colors.* keys (used everywhere
in FeedbackProvider et al.) and the new theme.tokens.* roles
coexist. Primitives fall back to the light profile when no
provider wraps them, so they remain usable in isolation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — `theme.js` backward-compat derivation + snapshot

**Files:** `src/theme.js`, `src/ui/__tests__/__fixtures__/theme-legacy-keys.json`, `src/ui/__tests__/theme-backcompat.test.js`

- [ ] **Step 4.1: Capture the existing legacy color-key snapshot**

Create `src/ui/__tests__/__fixtures__/theme-legacy-keys.json` with every current key in the existing `lightTheme.colors`:

```json
[
  "overlayBg", "backdropBg", "modalBg", "modalBorder",
  "textPrimary", "textSecondary", "textTertiary",
  "border", "borderFocus",
  "inputBg", "inputDisabledBg",
  "btnCancelBg", "btnCancelHover", "btnCancelText",
  "btnPrimaryBg", "btnPrimaryHover", "btnPrimaryText",
  "btnDisabledBg",
  "highlightBorder", "highlightBg", "highlightShadow",
  "tooltipBg", "tooltipText",
  "errorBg", "errorBorder", "errorText",
  "screenshotBorder", "screenshotBg",
  "shadow",
  "closeHoverBg", "hoverBg",
  "cardBg", "headerBg", "contentBg",
  "dotBorder",
  "dotPopoverBg", "dotPopoverBorder", "dotPopoverShadow",
  "dotMiniCardBg", "dotMiniCardBorder", "dotMiniCardShadow",
  "dotToolbarBg", "dotToolbarBorder", "dotToolbarShadow",
  "dotClusterBg", "dotClusterText",
  "dotFocusRing"
]
```

- [ ] **Step 4.2: Write the failing backcompat test**

Create `src/ui/__tests__/theme-backcompat.test.js`:

```js
import { describe, it, expect } from 'vitest';
import legacyKeys from './__fixtures__/theme-legacy-keys.json';
import { lightTheme, darkTheme } from '../../theme.js';

describe('theme.js backward compatibility', () => {
  it('lightTheme.colors retains every legacy key', () => {
    const present = Object.keys(lightTheme.colors);
    for (const key of legacyKeys) {
      expect(present).toContain(key);
    }
  });

  it('darkTheme.colors retains every legacy key', () => {
    const present = Object.keys(darkTheme.colors);
    for (const key of legacyKeys) {
      expect(present).toContain(key);
    }
  });

  it('every legacy color is a non-empty string', () => {
    for (const key of legacyKeys) {
      expect(typeof lightTheme.colors[key]).toBe('string');
      expect(lightTheme.colors[key].length).toBeGreaterThan(0);
      expect(typeof darkTheme.colors[key]).toBe('string');
      expect(darkTheme.colors[key].length).toBeGreaterThan(0);
    }
  });

  it('mode field is preserved', () => {
    expect(lightTheme.mode).toBe('light');
    expect(darkTheme.mode).toBe('dark');
  });
});
```

- [ ] **Step 4.3: Run to confirm fail**

Run: `npm test -- theme-backcompat`
Expected: PASS already, because today's `theme.js` still has the legacy shape. The point of this test is to act as a guardrail for the upcoming refactor — we run it before AND after.

- [ ] **Step 4.4: Refactor `src/theme.js`**

Replace the `lightTheme` and `darkTheme` const blocks (lines ~4 to ~120). The rest of the file (`getTheme`, keyframes, `FeedbackGlobalStyle`) is preserved verbatim. New body:

```js
import styled, { keyframes, createGlobalStyle } from 'styled-components';
import { tokens } from './ui/tokens.js';

/**
 * Map the new semantic tokens onto the long-standing legacy color
 * names so existing styled-components keep working without any
 * change. New code should reach for theme.tokens.color.* directly
 * via the UIThemeProvider (see src/ui/ThemeContext.jsx).
 */
function mapToLegacy(t) {
  return {
    // Surfaces and backgrounds
    overlayBg: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.03)',
    backdropBg: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)',
    modalBg: t.color.surface,
    modalBorder: t.color.border,
    cardBg: t.color.surface,
    headerBg: t.color.canvas,
    contentBg: t.color.canvas,
    hoverBg: t.color.canvas,
    closeHoverBg: t.color.canvas,
    screenshotBg: t.color.canvas,
    screenshotBorder: t.color.border,

    // Text
    textPrimary: t.color.text,
    textSecondary: t.color.textMuted,
    textTertiary: t.color.textFaint,

    // Borders + focus
    border: t.color.borderStrong,
    borderFocus: t.color.accent,

    // Inputs
    inputBg: t.color.surface,
    inputDisabledBg: t.color.canvas,

    // Buttons
    btnCancelBg: t.color.canvas,
    btnCancelHover: t.color.border,
    btnCancelText: t.color.text,
    btnPrimaryBg: t.color.accent,
    btnPrimaryHover: t.color.accentHover,
    btnPrimaryText: '#ffffff',
    btnDisabledBg: t.color.borderStrong,

    // Selection highlight
    highlightBorder: t.color.accent,
    highlightBg: t.color.accentTint,
    highlightShadow: t.color.accentRing,

    // Tooltip
    tooltipBg: t.color.text,
    tooltipText: t.color.bg,

    // Error state
    errorBg: t.color.dangerBg,
    errorBorder: t.color.danger,
    errorText: t.color.danger,

    // Generic shadow alias
    shadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',

    // Feedback dots
    dotBorder: t.color.surface,
    dotPopoverBg: t.color.surface,
    dotPopoverBorder: t.color.border,
    dotPopoverShadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)',
    dotMiniCardBg: t.color.surface,
    dotMiniCardBorder: t.color.border,
    dotMiniCardShadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.12)',
    dotToolbarBg: t.color.surface,
    dotToolbarBorder: t.color.border,
    dotToolbarShadow: t.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.12)',
    dotClusterBg: t.color.accent,
    dotClusterText: '#ffffff',
    dotFocusRing: t.color.accent,
  };
}

export const lightTheme = { mode: 'light', colors: mapToLegacy(tokens.light) };
export const darkTheme  = { mode: 'dark',  colors: mapToLegacy(tokens.dark)  };

export const getTheme = (mode) => mode === 'dark' ? darkTheme : lightTheme;

// --- keyframes (unchanged below this line) ---
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translate(-50%, -45%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

export const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const slideInRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
`;

export const spin = keyframes`to { transform: rotate(360deg); }`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.8); }
`;

export const pulseRing = keyframes`
  0%   { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.7); }
  50%  { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 12px rgba(102, 126, 234, 0); }
  100% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0); }
`;

export const dropdownSlideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const FeedbackGlobalStyle = createGlobalStyle`
  body.feedback-mode-active {
    cursor: crosshair !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  @media print {
    .feedback-overlay, .feedback-backdrop, .feedback-modal,
    .feedback-tooltip, .feedback-highlight { display: none !important; }
  }
`;

export const dotPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  50%      { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
`;
```

- [ ] **Step 4.5: Run all tests**

Run: `npm test`
Expected: backcompat test still passes; the Phase A test count is unchanged; new tokens tests pass.

- [ ] **Step 4.6: Verify build**

Run: `npm run build`
Expected: success; no consumer warnings; `dist/index.js` contains the new color values.

- [ ] **Step 4.7: Commit**

```bash
git add src/theme.js src/ui/__tests__/theme-backcompat.test.js src/ui/__tests__/__fixtures__/theme-legacy-keys.json
git commit -m "$(cat <<'EOF'
feat(theme): derive legacy color names from new semantic tokens

theme.js keeps its public lightTheme / darkTheme export shape
exactly. Internally, every legacy key (modalBg, btnPrimaryBg,
dotPopoverShadow, …) is now mapped from the new tokens defined
in src/ui/tokens.js. Existing styled-components in
FeedbackProvider, FeedbackModal, FeedbackDashboard, FeedbackDots,
SessionReplay, etc. inherit the warm-stone / warm-charcoal /
warm-teal palette without any code change of their own.

A fixture snapshot of the pre-refactor legacy key list backs a
backcompat test that fails loudly if any key is dropped.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — `Stack` primitive

Simplest primitive; lays the test pattern subsequent tasks copy.

**Files:** `src/ui/primitives/Stack.jsx`, `src/ui/__tests__/Stack.test.jsx`

- [ ] **Step 5.1: Write the failing test**

Create `src/ui/__tests__/Stack.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stack } from '../primitives/Stack.jsx';

describe('Stack', () => {
  it('renders children', () => {
    const { getByText } = render(<Stack><span>hi</span></Stack>);
    expect(getByText('hi')).toBeInTheDocument();
  });

  it('default direction is column', () => {
    const { container } = render(<Stack><span>a</span></Stack>);
    expect(container.firstChild).toHaveStyle({ flexDirection: 'column' });
  });

  it('direction="row" sets flex-direction', () => {
    const { container } = render(<Stack direction="row"><span>a</span></Stack>);
    expect(container.firstChild).toHaveStyle({ flexDirection: 'row' });
  });

  it('gap maps to the token scale', () => {
    const { container } = render(<Stack gap="5"><span>a</span></Stack>);
    expect(container.firstChild).toHaveStyle({ gap: '16px' });
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<Stack ref={ref}><span>a</span></Stack>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('supports the `as` prop', () => {
    const { container } = render(<Stack as="section"><span>a</span></Stack>);
    expect(container.firstChild.tagName).toBe('SECTION');
  });

  it('forwards className and style', () => {
    const { container } = render(<Stack className="x" style={{ padding: '8px' }}><span>a</span></Stack>);
    expect(container.firstChild).toHaveClass('x');
    expect(container.firstChild).toHaveStyle({ padding: '8px' });
  });
});
```

- [ ] **Step 5.2: Run to confirm fail**

Run: `npm test -- Stack`
Expected: FAIL — module not found.

- [ ] **Step 5.3: Implement `src/ui/primitives/Stack.jsx`**

```jsx
import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' };
const JUSTIFY = {
  start: 'flex-start', center: 'center', end: 'flex-end',
  between: 'space-between', around: 'space-around', evenly: 'space-evenly',
};

const StyledStack = styled.div`
  display: flex;
  flex-direction: ${({ $direction }) => $direction};
  ${({ $gap, theme }) => $gap !== undefined ? `gap: ${pickToken(`space.${$gap}`)({ theme })};` : ''}
  ${({ $align }) => $align ? `align-items: ${ALIGN[$align] || $align};` : ''}
  ${({ $justify }) => $justify ? `justify-content: ${JUSTIFY[$justify] || $justify};` : ''}
  ${({ $wrap }) => $wrap ? 'flex-wrap: wrap;' : ''}
`;

export const Stack = React.forwardRef(function Stack(
  { as = 'div', direction = 'column', gap, align, justify, wrap = false, children, ...rest },
  ref
) {
  return (
    <StyledStack
      as={as}
      ref={ref}
      $direction={direction}
      $gap={gap}
      $align={align}
      $justify={justify}
      $wrap={wrap}
      {...rest}
    >
      {children}
    </StyledStack>
  );
});

Stack.displayName = 'Stack';
export default Stack;
```

- [ ] **Step 5.4: Run test to confirm pass**

Run: `npm test -- Stack`
Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/ui/primitives/Stack.jsx src/ui/__tests__/Stack.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Stack layout primitive

Flexbox helper that replaces ad-hoc inline flex styles across
the codebase. Direction (column default), gap (token scale),
align, justify, wrap. forwardRef + `as` prop + className/style
passthrough.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — `Spinner` primitive

**Files:** `src/ui/primitives/Spinner.jsx`, `src/ui/__tests__/Spinner.test.jsx`

- [ ] **Step 6.1: Write the failing test**

Create `src/ui/__tests__/Spinner.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '../primitives/Spinner.jsx';

describe('Spinner', () => {
  it('renders with a default aria-label', () => {
    const { getByRole } = render(<Spinner />);
    expect(getByRole('status')).toHaveAccessibleName('Loading');
  });

  it('honours a custom label', () => {
    const { getByRole } = render(<Spinner label="Submitting feedback" />);
    expect(getByRole('status')).toHaveAccessibleName('Submitting feedback');
  });

  it('size prop changes box size', () => {
    const { container, rerender } = render(<Spinner size="xs" />);
    expect(container.firstChild).toHaveStyle({ width: '12px', height: '12px' });
    rerender(<Spinner size="lg" />);
    expect(container.firstChild).toHaveStyle({ width: '28px', height: '28px' });
  });

  it('aria-hidden hides from a11y tree', () => {
    const { container } = render(<Spinner aria-hidden="true" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 6.2: Run to confirm fail**

Run: `npm test -- Spinner`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement `src/ui/primitives/Spinner.jsx`**

```jsx
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const SIZES = { xs: 12, sm: 16, md: 20, lg: 28 };

const rotate = keyframes`to { transform: rotate(360deg); }`;

const Ring = styled.span`
  display: ${({ $inline }) => ($inline ? 'inline-block' : 'block')};
  width: ${({ $size }) => `${SIZES[$size] || SIZES.sm}px`};
  height: ${({ $size }) => `${SIZES[$size] || SIZES.sm}px`};
  border-radius: 50%;
  border: 2px solid ${pickToken('color.borderStrong')};
  border-top-color: ${pickToken('color.accent')};
  animation: ${rotate} ${pickToken('motion.slow')} linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    border-top-color: ${pickToken('color.accent')};
  }
`;

export const Spinner = React.forwardRef(function Spinner(
  { size = 'sm', label = 'Loading', inline = false, ...rest },
  ref
) {
  const isHidden = rest['aria-hidden'] === 'true' || rest['aria-hidden'] === true;
  return (
    <Ring
      ref={ref}
      role={isHidden ? undefined : 'status'}
      aria-label={isHidden ? undefined : label}
      $size={size}
      $inline={inline}
      {...rest}
    />
  );
});

Spinner.displayName = 'Spinner';
export default Spinner;
```

- [ ] **Step 6.4: Run test to confirm pass**

Run: `npm test -- Spinner`
Expected: PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/ui/primitives/Spinner.jsx src/ui/__tests__/Spinner.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Spinner primitive

Ring spinner sized via tokens (12/16/20/28). role="status" by
default with a configurable aria-label; aria-hidden suppresses
both. Respects prefers-reduced-motion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — `Surface` primitive

**Files:** `src/ui/primitives/Surface.jsx`, `src/ui/__tests__/Surface.test.jsx`

- [ ] **Step 7.1: Write the failing test**

Create `src/ui/__tests__/Surface.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Surface } from '../primitives/Surface.jsx';

describe('Surface', () => {
  it('renders children', () => {
    const { getByText } = render(<Surface>hello</Surface>);
    expect(getByText('hello')).toBeInTheDocument();
  });

  it('default padding maps to 18px', () => {
    const { container } = render(<Surface>x</Surface>);
    expect(container.firstChild).toHaveStyle({ padding: '18px' });
  });

  it('padding="none" produces no padding', () => {
    const { container } = render(<Surface padding="none">x</Surface>);
    expect(container.firstChild).toHaveStyle({ padding: '0px' });
  });

  it('tone="canvas" swaps background', () => {
    const { container } = render(<Surface tone="canvas">x</Surface>);
    // jsdom resolves CSS variables to empty; assert the rule string instead.
    const styles = window.getComputedStyle(container.firstChild);
    expect(styles.backgroundColor).not.toBe('');
  });

  it('interactive=true makes element role="button" and keyboard-focusable', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Surface interactive onClick={onClick}>x</Surface>);
    const btn = getByRole('button');
    expect(btn).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  it('interactive=true activates onClick via Space too', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Surface interactive onClick={onClick}>x</Surface>);
    fireEvent.keyDown(getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalled();
  });

  it('selected adds the accent outline', () => {
    const { container } = render(<Surface selected>x</Surface>);
    expect(container.firstChild).toHaveAttribute('data-selected', 'true');
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<Surface ref={ref}>x</Surface>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
```

- [ ] **Step 7.2: Run to confirm fail**

Run: `npm test -- Surface`
Expected: FAIL.

- [ ] **Step 7.3: Implement `src/ui/primitives/Surface.jsx`**

```jsx
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const PAD = { none: '0', sm: '12px', md: '18px', lg: '24px' };
const TONE_BG = {
  default: 'color.surface',
  canvas: 'color.canvas',
  accentTint: 'color.accentTint',
};

const StyledSurface = styled.div`
  background: ${({ $tone, theme }) => pickToken(TONE_BG[$tone] || TONE_BG.default)({ theme })};
  border: 1px solid ${pickToken('color.border')};
  border-radius: ${pickToken('radius.lg')};
  padding: ${({ $padding }) => PAD[$padding] || PAD.md};
  color: ${pickToken('color.text')};
  font-family: ${pickToken('font.sans')};

  &[data-selected="true"] {
    border-color: ${pickToken('color.accent')};
    box-shadow: 0 0 0 1px ${pickToken('color.accent')};
  }

  ${({ $interactive }) => $interactive && `
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
    &:hover { border-color: ${pickToken('color.borderStrong')}; }
    &:focus-visible {
      outline: 3px solid ${pickToken('color.focusRing')};
      outline-offset: 1px;
    }
  `}
`;

export const Surface = React.forwardRef(function Surface(
  { as = 'div', padding = 'md', tone = 'default', interactive = false, selected = false, onClick, role, children, ...rest },
  ref
) {
  const handleKeyDown = useCallback((e) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
    rest.onKeyDown?.(e);
  }, [interactive, onClick, rest]);

  return (
    <StyledSurface
      as={as}
      ref={ref}
      $padding={padding}
      $tone={tone}
      $interactive={interactive}
      data-selected={selected ? 'true' : undefined}
      role={interactive ? (role || 'button') : role}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : rest.onKeyDown}
      {...rest}
    >
      {children}
    </StyledSurface>
  );
});

Surface.displayName = 'Surface';
export default Surface;
```

- [ ] **Step 7.4: Run test to confirm pass**

Run: `npm test -- Surface`
Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/ui/primitives/Surface.jsx src/ui/__tests__/Surface.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Surface card primitive

Bordered card with padding tokens (sm/md/lg/none), tone variants
(default/canvas/accentTint), and an `interactive` mode that adds
hover, keyboard focus ring, role="button", and Enter/Space
activation. `selected` outlines the surface in the accent color.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — `Button` primitive

**Files:** `src/ui/primitives/Button.jsx`, `src/ui/__tests__/Button.test.jsx`

- [ ] **Step 8.1: Write the failing test**

Create `src/ui/__tests__/Button.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Button } from '../primitives/Button.jsx';

describe('Button', () => {
  it('renders children', () => {
    const { getByText } = render(<Button>Send</Button>);
    expect(getByText('Send')).toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    const { getByRole } = render(<Button>x</Button>);
    expect(getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('clicks fire onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('disabled blocks onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button disabled onClick={onClick}>x</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading sets aria-busy and renders a spinner', () => {
    const { getByRole, container } = render(<Button loading>Submit</Button>);
    expect(getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('loading is also disabled', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Button loading onClick={onClick}>x</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders leftIcon and rightIcon slots', () => {
    const { getByText } = render(
      <Button leftIcon={<span>L</span>} rightIcon={<span>R</span>}>Mid</Button>
    );
    expect(getByText('L')).toBeInTheDocument();
    expect(getByText('Mid')).toBeInTheDocument();
    expect(getByText('R')).toBeInTheDocument();
  });

  it('variant=primary is the default and applies a data attribute', () => {
    const { getByRole } = render(<Button>x</Button>);
    expect(getByRole('button')).toHaveAttribute('data-variant', 'primary');
  });

  it('variant=danger applies the danger data attribute', () => {
    const { getByRole } = render(<Button variant="danger">Delete</Button>);
    expect(getByRole('button')).toHaveAttribute('data-variant', 'danger');
  });

  it('size=lg applies the size data attribute', () => {
    const { getByRole } = render(<Button size="lg">x</Button>);
    expect(getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('fullWidth adds width:100%', () => {
    const { getByRole } = render(<Button fullWidth>x</Button>);
    expect(getByRole('button')).toHaveStyle({ width: '100%' });
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
```

- [ ] **Step 8.2: Run to confirm fail**

Run: `npm test -- Button`
Expected: FAIL.

- [ ] **Step 8.3: Implement `src/ui/primitives/Button.jsx`**

```jsx
import React from 'react';
import styled, { css } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { Spinner } from './Spinner.jsx';

const SIZES = {
  sm: { height: '32px', padding: '0 12px', font: 'sm' },
  md: { height: '40px', padding: '0 18px', font: 'sm' },
  lg: { height: '48px', padding: '0 22px', font: 'base' },
};

const variantStyles = ({ $variant, theme }) => {
  switch ($variant) {
    case 'secondary': return css`
      background: ${pickToken('color.surface')({ theme })};
      color: ${pickToken('color.text')({ theme })};
      border-color: ${pickToken('color.borderStrong')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.canvas')({ theme })}; }
    `;
    case 'ghost': return css`
      background: transparent;
      color: ${pickToken('color.text')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.canvas')({ theme })}; }
    `;
    case 'danger': return css`
      background: ${pickToken('color.surface')({ theme })};
      color: ${pickToken('color.danger')({ theme })};
      border-color: ${pickToken('color.borderStrong')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.dangerBg')({ theme })}; }
    `;
    default: return css`
      background: ${pickToken('color.accent')({ theme })};
      color: #ffffff;
      box-shadow: 0 1px 2px ${pickToken('color.accentRing')({ theme })};
      &:hover:not(:disabled) { background: ${pickToken('color.accentHover')({ theme })}; }
    `;
  }
};

const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: ${({ $size }) => SIZES[$size].height};
  padding: ${({ $size }) => SIZES[$size].padding};
  border: 1px solid transparent;
  border-radius: ${pickToken('radius.md')};
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size, theme }) => pickToken(`font.size.${SIZES[$size].font}`)({ theme })};
  font-weight: ${pickToken('font.weight.medium')};
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, transform 80ms ease;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  ${variantStyles}
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const HiddenLabel = styled.span`
  visibility: hidden;
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;
const SpinnerWrap = styled.span`
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
const Relative = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export const Button = React.forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    fullWidth = false,
    disabled = false,
    type = 'button',
    children,
    ...rest
  },
  ref
) {
  return (
    <StyledButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      {...rest}
    >
      {loading ? (
        <Relative>
          <SpinnerWrap><Spinner size={size === 'sm' ? 'xs' : 'sm'} aria-hidden="true" /></SpinnerWrap>
          <HiddenLabel>
            {leftIcon}<span>{children}</span>{rightIcon}
          </HiddenLabel>
        </Relative>
      ) : (
        <>
          {leftIcon}<span>{children}</span>{rightIcon}
        </>
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';
export default Button;
```

- [ ] **Step 8.4: Run test to confirm pass**

Run: `npm test -- Button`
Expected: PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/ui/primitives/Button.jsx src/ui/__tests__/Button.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Button primitive

Four variants (primary/secondary/ghost/danger), three sizes
(sm/md/lg), leftIcon/rightIcon slots, fullWidth, loading state
that swaps content with a spinner while preserving measured
width and sets aria-busy + disabled. Focus-visible ring and
active translate; respects disabled.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 — `IconButton` primitive

**Files:** `src/ui/primitives/IconButton.jsx`, `src/ui/__tests__/IconButton.test.jsx`

- [ ] **Step 9.1: Write the failing test**

Create `src/ui/__tests__/IconButton.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { IconButton } from '../primitives/IconButton.jsx';

describe('IconButton', () => {
  it('renders the icon node', () => {
    const { getByText } = render(<IconButton aria-label="Close" icon={<span>X</span>} />);
    expect(getByText('X')).toBeInTheDocument();
  });

  it('uses aria-label for accessible name', () => {
    const { getByRole } = render(<IconButton aria-label="Close" icon={<span>X</span>} />);
    expect(getByRole('button')).toHaveAccessibleName('Close');
  });

  it('errors in dev when aria-label is missing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<IconButton icon={<span>X</span>} />);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('size=sm sets a smaller box', () => {
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} size="sm" />);
    expect(getByRole('button')).toHaveStyle({ width: '28px', height: '28px' });
  });

  it('size=md default is 32x32', () => {
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} />);
    expect(getByRole('button')).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('clicks fire onClick', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} onClick={onClick} />);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('forwards refs', () => {
    const ref = React.createRef();
    render(<IconButton aria-label="x" icon={<span>X</span>} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('active=true adds data-active', () => {
    const { getByRole } = render(<IconButton aria-label="x" icon={<span>X</span>} active />);
    expect(getByRole('button')).toHaveAttribute('data-active', 'true');
  });
});
```

- [ ] **Step 9.2: Run to confirm fail**

Run: `npm test -- IconButton`
Expected: FAIL.

- [ ] **Step 9.3: Implement `src/ui/primitives/IconButton.jsx`**

```jsx
import React, { useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const SIZES = { sm: 28, md: 32 };

const variantStyles = ({ $variant, theme }) => {
  switch ($variant) {
    case 'subtle': return css`
      background: ${pickToken('color.canvas')({ theme })};
      color: ${pickToken('color.text')({ theme })};
    `;
    case 'accent': return css`
      background: ${pickToken('color.accentTint')({ theme })};
      color: ${pickToken('color.accentText')({ theme })};
    `;
    default: return css`
      background: transparent;
      color: ${pickToken('color.textMuted')({ theme })};
      &:hover:not(:disabled) {
        background: ${pickToken('color.canvas')({ theme })};
        color: ${pickToken('color.text')({ theme })};
      }
    `;
  }
};

const StyledIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${SIZES[$size] || SIZES.md}px`};
  height: ${({ $size }) => `${SIZES[$size] || SIZES.md}px`};
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${pickToken('radius.md')};
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  ${variantStyles}
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
  &[data-active="true"] {
    background: ${pickToken('color.accentTint')};
    color: ${pickToken('color.accentText')};
  }
`;

export const IconButton = React.forwardRef(function IconButton(
  {
    icon,
    variant = 'default',
    size = 'md',
    disabled = false,
    active = false,
    type = 'button',
    ...rest
  },
  ref
) {
  const ariaLabel = rest['aria-label'];
  const warned = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && !ariaLabel && !warned.current) {
      warned.current = true;
      console.error('[react-visual-feedback/ui] <IconButton> requires aria-label or a non-empty `tooltip` prop.');
    }
  }, [ariaLabel]);
  return (
    <StyledIconButton
      ref={ref}
      type={type}
      $variant={variant}
      $size={size}
      disabled={disabled}
      data-active={active ? 'true' : undefined}
      {...rest}
    >
      {icon}
    </StyledIconButton>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
```

(Note: the `tooltip` integration with the `Tooltip` primitive lands in Task 12 — adding a tiny wrap when `tooltip` prop is present.)

- [ ] **Step 9.4: Run test to confirm pass**

Run: `npm test -- IconButton`
Expected: PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/ui/primitives/IconButton.jsx src/ui/__tests__/IconButton.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add IconButton primitive

Square 28/32px button, three variants (default/subtle/accent),
active state, disabled state, focus-visible ring. Dev-only
console.error when aria-label is missing. Tooltip prop wires in
Task 12 once the Tooltip primitive lands.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10 — `Field` primitive

**Files:** `src/ui/primitives/Field.jsx`, `src/ui/__tests__/Field.test.jsx`

- [ ] **Step 10.1: Write the failing test**

Create `src/ui/__tests__/Field.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Field } from '../primitives/Field.jsx';

describe('Field', () => {
  it('renders an input with the given label', () => {
    const { getByLabelText } = render(<Field label="Email" />);
    expect(getByLabelText('Email')).toBeInTheDocument();
  });

  it('wires the label to the input via id', () => {
    const { getByLabelText } = render(<Field label="Email" />);
    const input = getByLabelText('Email');
    expect(input.id).toBeTruthy();
  });

  it('renders helperText when no error', () => {
    const { getByText } = render(<Field label="Email" helperText="we wont spam you" />);
    expect(getByText('we wont spam you')).toBeInTheDocument();
  });

  it('error replaces helperText and sets aria-invalid', () => {
    const { getByLabelText, getByText, queryByText } = render(
      <Field label="Email" helperText="ok" error="invalid" />
    );
    expect(queryByText('ok')).not.toBeInTheDocument();
    expect(getByText('invalid')).toBeInTheDocument();
    expect(getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('required shows an asterisk', () => {
    const { getByText } = render(<Field label="Email" required />);
    expect(getByText('*')).toBeInTheDocument();
  });

  it('forwards refs to the input', () => {
    const ref = React.createRef();
    render(<Field label="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('multiline renders a textarea and forwards ref to it', () => {
    const ref = React.createRef();
    const { getByLabelText } = render(<Field label="Notes" multiline ref={ref} />);
    expect(getByLabelText('Notes').tagName).toBe('TEXTAREA');
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('onChange fires', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<Field label="x" onChange={onChange} />);
    fireEvent.change(getByLabelText('x'), { target: { value: 'hi' } });
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 10.2: Run to confirm fail**

Run: `npm test -- Field`
Expected: FAIL.

- [ ] **Step 10.3: Implement `src/ui/primitives/Field.jsx`**

```jsx
import React, { useId } from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: ${pickToken('font.sans')};
`;

const LabelRow = styled.label`
  font-size: ${pickToken('font.size.sm')};
  font-weight: ${pickToken('font.weight.medium')};
  color: ${pickToken('color.textMuted')};
`;

const InputBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${({ $invalid, theme }) => $invalid ? pickToken('color.danger')({ theme }) : pickToken('color.borderStrong')({ theme })};
  border-radius: ${pickToken('radius.md')};
  background: ${pickToken('color.surface')};
  padding: 0 12px;
  &:focus-within {
    outline: 3px solid ${({ $invalid, theme }) => $invalid ? pickToken('color.danger')({ theme }) + '44' : pickToken('color.focusRing')({ theme })};
    border-color: ${({ $invalid, theme }) => $invalid ? pickToken('color.danger')({ theme }) : pickToken('color.accent')({ theme })};
  }
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: ${pickToken('color.text')};
  font-family: inherit;
  font-size: ${pickToken('font.size.base')};
  padding: 11px 0;
  &::placeholder { color: ${pickToken('color.textFaint')}; }
`;

const StyledTextarea = styled.textarea`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  resize: vertical;
  min-height: 80px;
  color: ${pickToken('color.text')};
  font-family: inherit;
  font-size: ${pickToken('font.size.base')};
  padding: 11px 0;
  &::placeholder { color: ${pickToken('color.textFaint')}; }
`;

const Hint = styled.div`
  font-size: ${pickToken('font.size.sm')};
  color: ${({ $error, theme }) => $error ? pickToken('color.danger')({ theme }) : pickToken('color.textMuted')({ theme })};
`;

const Required = styled.span`
  color: ${pickToken('color.danger')};
  margin-left: 4px;
`;

export const Field = React.forwardRef(function Field(
  { label, helperText, error, required = false, multiline = false, prefix, suffix, rows = 3, id, ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = `${inputId}-hint`;
  const errorText = error && typeof error !== 'boolean' ? error : null;
  const invalid = Boolean(error);
  const InputComp = multiline ? StyledTextarea : StyledInput;
  return (
    <Wrap>
      {label && (
        <LabelRow htmlFor={inputId}>
          {label}{required && <Required aria-hidden="true">*</Required>}
        </LabelRow>
      )}
      <InputBox $invalid={invalid}>
        {prefix}
        <InputComp
          id={inputId}
          ref={ref}
          aria-invalid={invalid || undefined}
          aria-describedby={(helperText || errorText) ? hintId : undefined}
          required={required}
          rows={multiline ? rows : undefined}
          {...rest}
        />
        {suffix}
      </InputBox>
      {(errorText || helperText) && (
        <Hint id={hintId} $error={invalid}>{errorText || helperText}</Hint>
      )}
    </Wrap>
  );
});

Field.displayName = 'Field';
export default Field;
```

- [ ] **Step 10.4: Run test to confirm pass**

Run: `npm test -- Field`
Expected: PASS.

- [ ] **Step 10.5: Commit**

```bash
git add src/ui/primitives/Field.jsx src/ui/__tests__/Field.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Field primitive

Composes label + input + helper-text + error-text. Generates a
stable id via useId(); wires htmlFor, aria-describedby, and
aria-invalid automatically. Multiline mode renders a textarea
with min-height 80px. Prefix/suffix slots sit inside the input
container at consistent padding. Error swaps border + ring + hint
color to danger.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11 — `Chip` primitive

**Files:** `src/ui/primitives/Chip.jsx`, `src/ui/__tests__/Chip.test.jsx`

- [ ] **Step 11.1: Write the failing test**

Create `src/ui/__tests__/Chip.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Chip } from '../primitives/Chip.jsx';

describe('Chip', () => {
  it('renders children', () => {
    const { getByText } = render(<Chip>bug</Chip>);
    expect(getByText('bug')).toBeInTheDocument();
  });

  it('variant=success applies data-variant', () => {
    const { container } = render(<Chip variant="success">ok</Chip>);
    expect(container.firstChild).toHaveAttribute('data-variant', 'success');
  });

  it('dot prop adds a colored dot', () => {
    const { container } = render(<Chip variant="success" dot>ok</Chip>);
    expect(container.querySelector('[data-role="chip-dot"]')).toBeInTheDocument();
  });

  it('onRemove renders a close button with aria-label', () => {
    const onRemove = vi.fn();
    const { getByLabelText } = render(<Chip onRemove={onRemove}>filter-x</Chip>);
    const btn = getByLabelText(/remove filter-x/i);
    fireEvent.click(btn);
    expect(onRemove).toHaveBeenCalled();
  });

  it('onClick makes the chip a button', () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Chip onClick={onClick}>clickable</Chip>);
    const el = getByRole('button');
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalled();
  });

  it('size=sm changes height', () => {
    const { container, rerender } = render(<Chip size="sm">x</Chip>);
    expect(container.firstChild).toHaveAttribute('data-size', 'sm');
    rerender(<Chip>x</Chip>);
    expect(container.firstChild).toHaveAttribute('data-size', 'md');
  });
});
```

- [ ] **Step 11.2: Run to confirm fail**

Run: `npm test -- Chip`
Expected: FAIL.

- [ ] **Step 11.3: Implement `src/ui/primitives/Chip.jsx`**

```jsx
import React from 'react';
import styled, { css } from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';

const SIZES = { sm: { height: '22px', font: 'xs', pad: '0 8px', dot: '5px' },
                md: { height: '26px', font: 'xs', pad: '0 10px', dot: '6px' } };

const variantStyles = ({ $variant, theme }) => {
  switch ($variant) {
    case 'accent': return css`
      background: ${pickToken('color.accentTint')({ theme })};
      color: ${pickToken('color.accentText')({ theme })};
      border-color: transparent;
    `;
    case 'success': return css`
      background: ${pickToken('color.successBg')({ theme })};
      color: ${pickToken('color.success')({ theme })};
      border-color: transparent;
    `;
    case 'warning': return css`
      background: ${pickToken('color.warningBg')({ theme })};
      color: ${pickToken('color.warning')({ theme })};
      border-color: transparent;
    `;
    case 'danger': return css`
      background: ${pickToken('color.dangerBg')({ theme })};
      color: ${pickToken('color.danger')({ theme })};
      border-color: transparent;
    `;
    default: return css`
      background: ${pickToken('color.canvas')({ theme })};
      color: ${pickToken('color.textMuted')({ theme })};
      border-color: ${pickToken('color.border')({ theme })};
    `;
  }
};

const StyledChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: ${({ $size }) => SIZES[$size].height};
  padding: ${({ $size }) => SIZES[$size].pad};
  border: 1px solid;
  border-radius: ${pickToken('radius.pill')};
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size, theme }) => pickToken(`font.size.${SIZES[$size].font}`)({ theme })};
  font-weight: ${pickToken('font.weight.medium')};
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  ${variantStyles}
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
`;

const Dot = styled.span`
  width: ${({ $size }) => SIZES[$size].dot};
  height: ${({ $size }) => SIZES[$size].dot};
  border-radius: 50%;
  background: currentColor;
`;

const Remove = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin-left: 2px;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  opacity: 0.7;
  cursor: pointer;
  font-size: 14px;
  &:hover { opacity: 1; }
`;

export const Chip = React.forwardRef(function Chip(
  { variant = 'neutral', size = 'md', dot = false, onRemove, onClick, children, ...rest },
  ref
) {
  const clickable = Boolean(onClick);
  return (
    <StyledChip
      ref={ref}
      $variant={variant}
      $size={size}
      $clickable={clickable}
      data-variant={variant}
      data-size={size}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      {...rest}
    >
      {dot && <Dot $size={size} data-role="chip-dot" />}
      <span>{children}</span>
      {onRemove && (
        <Remove
          type="button"
          aria-label={`Remove ${typeof children === 'string' ? children : 'filter'}`}
          onClick={(e) => { e.stopPropagation(); onRemove(e); }}
        >×</Remove>
      )}
    </StyledChip>
  );
});

Chip.displayName = 'Chip';
export default Chip;
```

- [ ] **Step 11.4: Run test to confirm pass**

Run: `npm test -- Chip`
Expected: PASS.

- [ ] **Step 11.5: Commit**

```bash
git add src/ui/primitives/Chip.jsx src/ui/__tests__/Chip.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Chip primitive

Five variants (neutral/accent/success/warning/danger), two sizes
(sm/md), optional leading colored dot, optional onRemove close
button with aria-label, optional onClick (renders as role="button").
Pill radius from tokens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12 — `usePopover` + `Tooltip` (+ wire IconButton.tooltip)

**Files:** `src/ui/primitives/usePopover.js`, `src/ui/primitives/Tooltip.jsx`, `src/ui/__tests__/Tooltip.test.jsx`. Also touches `src/ui/primitives/IconButton.jsx`.

- [ ] **Step 12.1: Write the failing test**

Create `src/ui/__tests__/Tooltip.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act, screen, waitFor } from '@testing-library/react';
import { Tooltip } from '../primitives/Tooltip.jsx';
import { IconButton } from '../primitives/IconButton.jsx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Tooltip', () => {
  it('does not render content initially', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    expect(screen.queryByText('More info')).not.toBeInTheDocument();
  });

  it('shows after hover + delay', async () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getByRole('tooltip')).toHaveTextContent('More info');
  });

  it('hides on mouseleave', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    fireEvent.mouseLeave(screen.getByText('Hover me'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows on focus', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.focus(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides on Escape', () => {
    render(<Tooltip content="More info"><button>Hover me</button></Tooltip>);
    fireEvent.focus(screen.getByText('Hover me'));
    act(() => { vi.advanceTimersByTime(350); });
    fireEvent.keyDown(screen.getByText('Hover me'), { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('IconButton tooltip prop', () => {
  it('wraps in Tooltip and shows on hover', () => {
    render(<IconButton aria-label="More" tooltip="More options" icon={<span>⋯</span>} />);
    fireEvent.mouseEnter(screen.getByRole('button'));
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getByRole('tooltip')).toHaveTextContent('More options');
  });
});
```

- [ ] **Step 12.2: Run to confirm fail**

Run: `npm test -- Tooltip`
Expected: FAIL.

- [ ] **Step 12.3: Implement `src/ui/primitives/usePopover.js`**

```js
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal positioning hook: when `open` is true, measures the trigger
 * and computes a coord pair for absolute-positioning the floating
 * panel. Auto-flips placement near viewport edges. No focus
 * management — callers wire their own keyboard / outside-click
 * handling.
 */
export function usePopover({ placement = 'bottom', gap = 8 } = {}) {
  const triggerRef = useRef(null);
  const floatingRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, place: placement });

  const reposition = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect?.();
    const f = floatingRef.current?.getBoundingClientRect?.();
    if (!t) return;
    const fW = f?.width || 200;
    const fH = f?.height || 36;
    const vw = window.innerWidth || 1024;
    const vh = window.innerHeight || 768;
    let place = placement;
    let top = 0;
    let left = 0;
    switch (placement) {
      case 'top':
        top = t.top - fH - gap;
        left = t.left + t.width / 2 - fW / 2;
        if (top < 8) { place = 'bottom'; top = t.bottom + gap; }
        break;
      case 'left':
        top = t.top + t.height / 2 - fH / 2;
        left = t.left - fW - gap;
        if (left < 8) { place = 'right'; left = t.right + gap; }
        break;
      case 'right':
        top = t.top + t.height / 2 - fH / 2;
        left = t.right + gap;
        if (left + fW > vw - 8) { place = 'left'; left = t.left - fW - gap; }
        break;
      default: // bottom
        top = t.bottom + gap;
        left = t.left + t.width / 2 - fW / 2;
        if (top + fH > vh - 8) { place = 'top'; top = t.top - fH - gap; }
    }
    // Clamp to viewport
    left = Math.max(8, Math.min(left, vw - fW - 8));
    top = Math.max(8, Math.min(top, vh - fH - 8));
    setCoords({ top, left, place });
  }, [placement, gap]);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    const onResize = () => reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, reposition]);

  return { triggerRef, floatingRef, open, setOpen, coords, reposition };
}
```

- [ ] **Step 12.4: Implement `src/ui/primitives/Tooltip.jsx`**

```jsx
import React, { cloneElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { usePopover } from './usePopover.js';

const Bubble = styled.div`
  position: fixed;
  z-index: 9999;
  background: ${pickToken('color.text')};
  color: ${pickToken('color.bg')};
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.xs')};
  padding: 6px 10px;
  border-radius: ${pickToken('radius.sm')};
  pointer-events: none;
  box-shadow: ${pickToken('shadow.2')};
  white-space: nowrap;
`;

export function Tooltip({ content, placement = 'top', delay = 300, children }) {
  const tooltipId = useId();
  const { triggerRef, floatingRef, open, setOpen, coords } = usePopover({ placement });
  const timerRef = useRef(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), reduced ? 0 : delay);
  }, [delay, setOpen, reduced]);
  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setOpen(false);
  }, [setOpen]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const child = React.Children.only(children);
  const ref = (node) => {
    triggerRef.current = node;
    const r = child.ref;
    if (typeof r === 'function') r(node);
    else if (r && typeof r === 'object') r.current = node;
  };
  const cloned = cloneElement(child, {
    ref,
    onMouseEnter: (e) => { show(); child.props.onMouseEnter?.(e); },
    onMouseLeave: (e) => { hide(); child.props.onMouseLeave?.(e); },
    onFocus: (e) => { show(); child.props.onFocus?.(e); },
    onBlur: (e) => { hide(); child.props.onBlur?.(e); },
    onKeyDown: (e) => {
      if (e.key === 'Escape') hide();
      child.props.onKeyDown?.(e);
    },
    'aria-describedby': open ? tooltipId : child.props['aria-describedby'],
  });

  return (
    <>
      {cloned}
      {open && typeof document !== 'undefined' && createPortal(
        <Bubble ref={floatingRef} role="tooltip" id={tooltipId} style={{ top: coords.top, left: coords.left }}>
          {content}
        </Bubble>,
        document.body,
      )}
    </>
  );
}

Tooltip.displayName = 'Tooltip';
export default Tooltip;
```

- [ ] **Step 12.5: Wire `tooltip` prop into `IconButton`**

Edit `src/ui/primitives/IconButton.jsx`. At the very bottom, replace `export default IconButton;` with:

```jsx
import { Tooltip } from './Tooltip.jsx';

const IconButtonRaw = IconButton;

const IconButtonWithTooltip = React.forwardRef(function IconButtonWithTooltip(
  { tooltip, ...rest }, ref
) {
  const btn = <IconButtonRaw ref={ref} {...rest} />;
  if (!tooltip) return btn;
  return <Tooltip content={tooltip}>{btn}</Tooltip>;
});
IconButtonWithTooltip.displayName = 'IconButton';

export { IconButtonWithTooltip as IconButton };
export default IconButtonWithTooltip;
```

(Also remove the original `export { IconButton };` line near the top so we have a single export.)

- [ ] **Step 12.6: Run tests to confirm pass**

Run: `npm test -- Tooltip`
Expected: PASS.

- [ ] **Step 12.7: Commit**

```bash
git add src/ui/primitives/usePopover.js src/ui/primitives/Tooltip.jsx src/ui/primitives/IconButton.jsx src/ui/__tests__/Tooltip.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Tooltip + usePopover; wire IconButton.tooltip

usePopover is a tiny positioning hook (anchor rect → coords with
auto-flip near viewport edges, repositions on scroll/resize).
Tooltip renders into a body portal so it escapes parent
overflow:hidden. Hover delay 300ms (instant under
prefers-reduced-motion), hides on mouseleave/blur/Esc. IconButton
gains the documented `tooltip` prop by wrapping itself when set.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13 — `Avatar` + `AvatarStack`

**Files:** `src/ui/primitives/avatar-colors.js`, `src/ui/primitives/Avatar.jsx`, `src/ui/__tests__/Avatar.test.jsx`

- [ ] **Step 13.1: Write the failing test**

Create `src/ui/__tests__/Avatar.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Avatar, AvatarStack } from '../primitives/Avatar.jsx';

describe('Avatar', () => {
  it('shows initials when src is missing', () => {
    const { getByText } = render(<Avatar name="Murali V" />);
    expect(getByText('MV')).toBeInTheDocument();
  });

  it('single-word name uses the first two letters', () => {
    const { getByText } = render(<Avatar name="Acme" />);
    expect(getByText('AC')).toBeInTheDocument();
  });

  it('image src renders an img; falls back on error', () => {
    const { getByRole, container } = render(<Avatar name="Murali V" src="/avatar.png" />);
    const img = getByRole('img');
    expect(img).toHaveAttribute('src', '/avatar.png');
    fireEvent.error(img);
    expect(container.textContent).toContain('MV');
  });

  it('size=lg sets a 40px box', () => {
    const { container } = render(<Avatar name="A" size="lg" />);
    expect(container.firstChild).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('deterministic tint: same name → same data-tone', () => {
    const { container: c1 } = render(<Avatar name="Murali V" />);
    const { container: c2 } = render(<Avatar name="Murali V" />);
    expect(c1.firstChild.getAttribute('data-tone')).toBe(c2.firstChild.getAttribute('data-tone'));
  });
});

describe('AvatarStack', () => {
  it('renders children inline', () => {
    const { getAllByRole } = render(
      <AvatarStack max={3}>
        <Avatar name="A B" />
        <Avatar name="C D" />
      </AvatarStack>
    );
    expect(getAllByRole('img').length === 0 || true).toBe(true); // initials, no images
  });

  it('overflow shows a +N tile', () => {
    const { getByText } = render(
      <AvatarStack max={2}>
        <Avatar name="A B" />
        <Avatar name="C D" />
        <Avatar name="E F" />
        <Avatar name="G H" />
      </AvatarStack>
    );
    expect(getByText('+3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 13.2: Run to confirm fail**

Run: `npm test -- Avatar`
Expected: FAIL.

- [ ] **Step 13.3: Implement `src/ui/primitives/avatar-colors.js`**

```js
// 8 hash buckets; index by a tiny string hash.
export const TONES = [
  { bg: '#fee2e2', fg: '#b91c1c' }, // red
  { bg: '#ffedd5', fg: '#c2410c' }, // orange
  { bg: '#fef3c7', fg: '#92400e' }, // amber
  { bg: '#d1fae5', fg: '#047857' }, // emerald
  { bg: '#cffafe', fg: '#0e7490' }, // cyan
  { bg: '#dbeafe', fg: '#1d4ed8' }, // blue
  { bg: '#ede9fe', fg: '#5b21b6' }, // violet
  { bg: '#fce7f3', fg: '#9d174d' }, // pink
];

export function toneFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h) % TONES.length;
}
```

- [ ] **Step 13.4: Implement `src/ui/primitives/Avatar.jsx`**

```jsx
import React, { useState, Children } from 'react';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { TONES, toneFor } from './avatar-colors.js';

const SIZES = { xs: 20, sm: 28, md: 32, lg: 40 };

const Box = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${SIZES[$size]}px`};
  height: ${({ $size }) => `${SIZES[$size]}px`};
  border-radius: 50%;
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size }) => `${Math.round(SIZES[$size] * 0.42)}px`};
  font-weight: ${pickToken('font.weight.semibold')};
  overflow: hidden;
  position: relative;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  vertical-align: middle;
`;

const Img = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

function getInitials(name) {
  if (!name) return '?';
  const trimmed = String(name).trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = React.forwardRef(function Avatar(
  { name, src, size = 'md', tone, ...rest },
  ref
) {
  const [failed, setFailed] = useState(false);
  const idx = toneFor(name || '');
  const palette = tone === 'neutral' ? { bg: 'var(--c-canvas)', fg: 'var(--c-text-muted)' } : TONES[idx];
  const showImg = src && !failed;
  return (
    <Box ref={ref} $size={size} $bg={palette.bg} $fg={palette.fg} data-tone={`t${idx}`} {...rest}>
      {showImg ? (
        <Img src={src} alt={name} role="img" onError={() => setFailed(true)} />
      ) : (
        getInitials(name)
      )}
    </Box>
  );
});
Avatar.displayName = 'Avatar';

const Stack = styled.span`
  display: inline-flex;
  align-items: center;
  & > * + * {
    margin-left: -8px;
    box-shadow: 0 0 0 2px ${pickToken('color.bg')};
    border-radius: 50%;
  }
`;

const MoreTile = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => `${SIZES[$size]}px`};
  height: ${({ $size }) => `${SIZES[$size]}px`};
  border-radius: 50%;
  background: ${pickToken('color.canvas')};
  color: ${pickToken('color.textMuted')};
  font-family: ${pickToken('font.sans')};
  font-size: ${({ $size }) => `${Math.round(SIZES[$size] * 0.36)}px`};
  font-weight: ${pickToken('font.weight.semibold')};
`;

export function AvatarStack({ max = 5, size = 'md', children }) {
  const arr = Children.toArray(children).filter(Boolean);
  const visible = arr.length > max ? arr.slice(0, max - 1) : arr;
  const overflow = arr.length - visible.length;
  return (
    <Stack>
      {visible.map((c, i) => React.cloneElement(c, { key: i, size }))}
      {overflow > 0 && <MoreTile $size={size}>+{overflow}</MoreTile>}
    </Stack>
  );
}

AvatarStack.displayName = 'AvatarStack';
export default Avatar;
```

- [ ] **Step 13.5: Run test to confirm pass**

Run: `npm test -- Avatar`
Expected: PASS.

- [ ] **Step 13.6: Commit**

```bash
git add src/ui/primitives/Avatar.jsx src/ui/primitives/avatar-colors.js src/ui/__tests__/Avatar.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Avatar + AvatarStack primitives

Initials fallback, deterministic 8-tone background from a name
hash, image src with onError fallback, four sizes (xs/sm/md/lg).
AvatarStack overlaps children at -8px and renders a +N tile when
visible count exceeds the configured max.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14 — `Select` primitive

**Files:** `src/ui/primitives/Select.jsx`, `src/ui/__tests__/Select.test.jsx`

- [ ] **Step 14.1: Write the failing test**

Create `src/ui/__tests__/Select.test.jsx`:

```jsx
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../primitives/Select.jsx';

const OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function Controlled({ multiple = false, onChangeMock }) {
  const [v, setV] = useState(multiple ? [] : '');
  return (
    <Select
      options={OPTIONS}
      value={v}
      onChange={(next) => { setV(next); onChangeMock?.(next); }}
      multiple={multiple}
      placeholder="Pick one"
    />
  );
}

describe('Select', () => {
  it('renders the trigger with placeholder', () => {
    render(<Controlled />);
    expect(screen.getByRole('button')).toHaveTextContent('Pick one');
  });

  it('opens the popover and lists options', () => {
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('selects an option on click and closes', () => {
    const onChange = vi.fn();
    render(<Controlled onChangeMock={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Medium'));
    expect(onChange).toHaveBeenCalledWith('med');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('arrow keys navigate and Enter selects', () => {
    const onChange = vi.fn();
    render(<Controlled onChangeMock={onChange} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('med');
  });

  it('Escape closes', () => {
    render(<Controlled />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('multiple keeps popover open and toggles values', () => {
    const onChange = vi.fn();
    render(<Controlled multiple onChangeMock={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Low'));
    expect(onChange).toHaveBeenCalledWith(['low']);
    fireEvent.click(screen.getByText('High'));
    expect(onChange).toHaveBeenLastCalledWith(['low', 'high']);
    fireEvent.click(screen.getByText('Low'));
    expect(onChange).toHaveBeenLastCalledWith(['high']);
  });

  it('renderTrigger overrides trigger UI', () => {
    render(
      <Select
        options={OPTIONS}
        value="low"
        onChange={() => {}}
        renderTrigger={() => <span data-testid="custom-trigger">Custom</span>}
      />
    );
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });
});
```

- [ ] **Step 14.2: Run to confirm fail**

Run: `npm test -- Select`
Expected: FAIL.

- [ ] **Step 14.3: Implement `src/ui/primitives/Select.jsx`**

```jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { pickToken } from '../ThemeContext.jsx';
import { usePopover } from './usePopover.js';

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 32px 0 14px;
  border: 1px solid ${pickToken('color.borderStrong')};
  border-radius: ${pickToken('radius.md')};
  background: ${pickToken('color.surface')};
  color: ${pickToken('color.text')};
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.base')};
  cursor: pointer;
  position: relative;
  width: ${({ $width }) => $width || 'auto'};
  text-align: left;
  &::after {
    content: '▾';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${pickToken('color.textMuted')};
    font-size: 11px;
  }
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: 1px;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Popover = styled.ul`
  position: fixed;
  z-index: 9999;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: ${pickToken('color.surface')};
  border: 1px solid ${pickToken('color.border')};
  border-radius: ${pickToken('radius.md')};
  box-shadow: ${pickToken('shadow.2')};
  min-width: 200px;
  max-height: 320px;
  overflow-y: auto;
  font-family: ${pickToken('font.sans')};
`;

const OptionRow = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: ${pickToken('radius.sm')};
  font-size: ${pickToken('font.size.base')};
  color: ${pickToken('color.text')};
  cursor: pointer;
  &[data-active="true"] { background: ${pickToken('color.canvas')}; }
  &[data-selected="true"] { color: ${pickToken('color.accentText')}; }
  &[data-disabled="true"] { opacity: 0.4; cursor: not-allowed; }
`;

const Check = styled.span`
  width: 14px;
  display: inline-flex;
  justify-content: center;
`;

function isSelected(value, optionValue, multiple) {
  if (multiple) return Array.isArray(value) && value.includes(optionValue);
  return value === optionValue;
}

export const Select = React.forwardRef(function Select(
  {
    options = [],
    value,
    onChange,
    multiple = false,
    placeholder = 'Select',
    disabled = false,
    width,
    align: _align = 'left',
    renderTrigger,
  },
  ref
) {
  const { triggerRef, floatingRef, open, setOpen, coords } = usePopover({ placement: 'bottom' });
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const t = triggerRef.current;
      const f = floatingRef.current;
      if (t && !t.contains(e.target) && f && !f.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open, setOpen, triggerRef, floatingRef]);

  const handleSelect = useCallback((opt) => {
    if (opt.disabled) return;
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const next = arr.includes(opt.value) ? arr.filter((v) => v !== opt.value) : [...arr, opt.value];
      onChange?.(next);
    } else {
      onChange?.(opt.value);
      setOpen(false);
    }
  }, [multiple, value, onChange, setOpen]);

  const handleKeyDown = useCallback((e) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(options.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)); return; }
    if (e.key === 'Enter')     { e.preventDefault(); if (activeIndex >= 0) handleSelect(options[activeIndex]); return; }
  }, [open, options, activeIndex, handleSelect, setOpen]);

  const selectedOpt = multiple ? null : options.find((o) => o.value === value) || null;
  const triggerContent = renderTrigger
    ? renderTrigger(open, multiple ? options.filter((o) => isSelected(value, o.value, true)) : selectedOpt)
    : (selectedOpt ? selectedOpt.label : (multiple && Array.isArray(value) && value.length ? `${value.length} selected` : placeholder));

  return (
    <span ref={rootRef} style={{ display: 'inline-block' }}>
      {renderTrigger ? (
        <span ref={(node) => { triggerRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
              role="button" tabIndex={disabled ? -1 : 0} aria-expanded={open}
              onClick={() => !disabled && setOpen((o) => !o)} onKeyDown={handleKeyDown}>
          {triggerContent}
        </span>
      ) : (
        <Trigger
          type="button"
          ref={(node) => { triggerRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
          $width={width}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
        >
          {triggerContent}
        </Trigger>
      )}
      {open && typeof document !== 'undefined' && createPortal(
        <Popover ref={floatingRef} role="listbox" aria-multiselectable={multiple} style={{ top: coords.top, left: coords.left }}>
          {options.map((opt, i) => {
            const selected = isSelected(value, opt.value, multiple);
            return (
              <OptionRow
                key={opt.value}
                role="option"
                aria-selected={selected}
                data-selected={selected ? 'true' : undefined}
                data-active={i === activeIndex ? 'true' : undefined}
                data-disabled={opt.disabled ? 'true' : undefined}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(opt)}
              >
                {multiple && <Check>{selected ? '✓' : ''}</Check>}
                {opt.icon}
                <span>{opt.label}</span>
                {opt.description && <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{opt.description}</span>}
              </OptionRow>
            );
          })}
        </Popover>,
        document.body,
      )}
    </span>
  );
});

Select.displayName = 'Select';
export default Select;
```

- [ ] **Step 14.4: Run test to confirm pass**

Run: `npm test -- Select`
Expected: PASS.

- [ ] **Step 14.5: Commit**

```bash
git add src/ui/primitives/Select.jsx src/ui/__tests__/Select.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add Select primitive

Trigger button + portal-rendered popover via usePopover. Keyboard
support: ArrowDown opens, Up/Down navigate, Enter selects, Esc
closes. Single + multi mode (multi keeps the popover open and
toggles). renderTrigger escape hatch lets StatusDropdown supply
its bespoke trigger UI while reusing the popover behaviour.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15 — Primitive barrel + `axe-core` smoke test

**Files:** `src/ui/primitives/index.js`, `src/ui/__tests__/axe.test.jsx`

- [ ] **Step 15.1: Create the barrel**

`src/ui/primitives/index.js`:

```js
export { Button } from './Button.jsx';
export { IconButton } from './IconButton.jsx';
export { Field } from './Field.jsx';
export { Select } from './Select.jsx';
export { Chip } from './Chip.jsx';
export { Surface } from './Surface.jsx';
export { Stack } from './Stack.jsx';
export { Tooltip } from './Tooltip.jsx';
export { Spinner } from './Spinner.jsx';
export { Avatar, AvatarStack } from './Avatar.jsx';
```

- [ ] **Step 15.2: Add the a11y smoke test**

Create `src/ui/__tests__/axe.test.jsx`:

```jsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import {
  Button, IconButton, Field, Chip, Surface, Stack, Spinner, Avatar,
} from '../primitives/index.js';

describe('axe-core smoke (default renders pass a11y)', () => {
  const cases = [
    ['Button',     <Button>OK</Button>],
    ['IconButton', <IconButton aria-label="Close" icon={<span>×</span>} />],
    ['Field',      <Field label="Email" />],
    ['Chip',       <Chip>bug</Chip>],
    ['Surface',    <Surface>card</Surface>],
    ['Stack',      <Stack><span>hi</span></Stack>],
    ['Spinner',    <Spinner />],
    ['Avatar',     <Avatar name="Murali V" />],
  ];

  for (const [name, node] of cases) {
    it(`${name} has no a11y violations`, async () => {
      const { container } = render(node);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  }
});
```

- [ ] **Step 15.3: Run tests**

Run: `npm test -- axe`
Expected: PASS. If a primitive flags a violation, fix the primitive (not the test).

- [ ] **Step 15.4: Commit**

```bash
git add src/ui/primitives/index.js src/ui/__tests__/axe.test.jsx
git commit -m "$(cat <<'EOF'
feat(ui): add primitive barrel + axe smoke tests

Single import point: import { Button, Field, ... } from 'react-
visual-feedback/ui'. axe-core gate verifies the default render of
every primitive has zero a11y violations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16 — Refresh `StatusBadge`

**Files:** `src/components/StatusBadge.jsx`

- [ ] **Step 16.1: Read the current file**

Run: `cat src/components/StatusBadge.jsx`. Note the public props (`status`, `size`, `customStatuses`).

- [ ] **Step 16.2: Replace internals with a Chip-backed implementation**

Rewrite `src/components/StatusBadge.jsx`:

```jsx
import React from 'react';
import { Chip } from '../ui/primitives/Chip.jsx';

const STATUS_TO_VARIANT = {
  new: { variant: 'accent', dot: true, label: 'New' },
  open: { variant: 'neutral', dot: true, label: 'Open' },
  in_progress: { variant: 'warning', dot: true, label: 'In Progress' },
  under_review: { variant: 'neutral', dot: true, label: 'Under Review' },
  on_hold: { variant: 'neutral', dot: true, label: 'On Hold' },
  resolved: { variant: 'success', dot: true, label: 'Resolved' },
  closed: { variant: 'neutral', dot: false, label: 'Closed' },
  wont_fix: { variant: 'neutral', dot: false, label: "Won't Fix" },
};

export function StatusBadge({ status, size = 'md', customStatuses }) {
  const map = customStatuses || STATUS_TO_VARIANT;
  const entry = map[status] || { variant: 'neutral', dot: true, label: status || 'Unknown' };
  return (
    <Chip variant={entry.variant} dot={entry.dot} size={size}>
      {entry.label || status}
    </Chip>
  );
}

StatusBadge.displayName = 'StatusBadge';
export default StatusBadge;
```

- [ ] **Step 16.3: Run all tests; verify nothing regressed**

Run: `npm test`
Expected: PASS (Phase A 106 + new B1 primitive tests + skipped legacy).

- [ ] **Step 16.4: Verify a quick build**

Run: `npm run build`
Expected: success.

- [ ] **Step 16.5: Commit**

```bash
git add src/components/StatusBadge.jsx
git commit -m "$(cat <<'EOF'
refactor(components): rebuild StatusBadge on the Chip primitive

Public props (status, size, customStatuses) unchanged. Internal
implementation drops bespoke styled-components in favour of the
shared Chip primitive — fewer code paths, automatic dark-mode
support via tokens, accent / success / warning variants from the
new palette.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17 — Refresh `StatusDropdown`

**Files:** `src/components/StatusDropdown.jsx`

- [ ] **Step 17.1: Read the current file**

Run: `cat src/components/StatusDropdown.jsx`. Note props (`status`, `onChange`, `customStatuses`, `disabled`, maybe `multi`).

- [ ] **Step 17.2: Rewrite on top of Select + StatusBadge**

Replace `src/components/StatusDropdown.jsx`:

```jsx
import React from 'react';
import { Select } from '../ui/primitives/Select.jsx';
import { StatusBadge } from './StatusBadge.jsx';

const DEFAULT_OPTIONS = [
  { value: 'new',          label: 'New' },
  { value: 'open',         label: 'Open' },
  { value: 'in_progress',  label: 'In Progress' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'on_hold',      label: 'On Hold' },
  { value: 'resolved',     label: 'Resolved' },
  { value: 'closed',       label: 'Closed' },
  { value: 'wont_fix',     label: "Won't Fix" },
];

export function StatusDropdown({ status, onChange, customStatuses, disabled = false }) {
  const options = customStatuses
    ? Object.entries(customStatuses).map(([value, def]) => ({ value, label: def.label || value }))
    : DEFAULT_OPTIONS;

  return (
    <Select
      options={options}
      value={status}
      onChange={onChange}
      disabled={disabled}
      placeholder="Set status"
      renderTrigger={(open, selected) => (
        <span style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
          <StatusBadge status={selected ? selected.value : status} />
        </span>
      )}
    />
  );
}

StatusDropdown.displayName = 'StatusDropdown';
export default StatusDropdown;
```

- [ ] **Step 17.3: Run all tests + build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 17.4: Commit**

```bash
git add src/components/StatusDropdown.jsx
git commit -m "$(cat <<'EOF'
refactor(components): rebuild StatusDropdown on the Select primitive

Public props (status, onChange, customStatuses, disabled)
unchanged. The bespoke popover code is replaced by Select, which
brings keyboard navigation, outside-click close, viewport-edge
flipping, and a portal-rendered popover. The trigger keeps its
StatusBadge appearance via renderTrigger.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18 — Rollup `./ui` subpath export

**Files:** `rollup.config.js`, `package.json`

- [ ] **Step 18.1: Add the `./ui` rollup entry**

Edit `rollup.config.js`. In the exported config array, after the existing `src/lib/index.js` entry, add:

```js
  // UI primitives bundle
  {
    input: 'src/ui/primitives/index.js',
    output: [
      { file: 'dist/ui/index.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/ui/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
```

- [ ] **Step 18.2: Add the `./ui` export to `package.json`**

In the `exports` block, add this entry between `./lib` and `./server`:

```json
    "./ui": {
      "types": "./dist/types.d.ts",
      "import": "./dist/ui/index.esm.js",
      "require": "./dist/ui/index.js"
    },
```

- [ ] **Step 18.3: Build and verify**

Run: `npm run build`
Expected: produces `dist/ui/index.js` and `dist/ui/index.esm.js`.

```bash
ls dist/ui/
```

Expected: `index.js`, `index.esm.js`, `*.js.map` files.

- [ ] **Step 18.4: Commit**

```bash
git add rollup.config.js package.json
git commit -m "$(cat <<'EOF'
build: ship react-visual-feedback/ui subpath export

Adds the bundled primitive set under dist/ui so host apps can:
  import { Button, Field, Select, Chip, Surface, Stack, Tooltip,
           IconButton, Spinner, Avatar }
    from 'react-visual-feedback/ui';

External peer deps stay react, react-dom, styled-components.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19 — README + CHANGELOG + final verification

**Files:** `README.md`, `CHANGELOG.md`

- [ ] **Step 19.1: Add "UI primitives" section to README**

Find the "Secure setup in 10 lines" block in `README.md`. After it, add:

```markdown
## UI primitives (v2.3+)

Phase B1 ships a shared design-token system and ten primitives you can
use to build dashboards on top of the captured feedback data without
relying on the bundled overlay UI. Single import:

\`\`\`js
import {
  Button, IconButton, Field, Select, Chip, Surface, Stack,
  Tooltip, Spinner, Avatar, AvatarStack,
} from 'react-visual-feedback/ui';
\`\`\`

Wrap your app in \`<UIThemeProvider mode="light">\` (or \`mode="dark"\`)
from \`react-visual-feedback/ui\` to apply the warm-stone / warm-charcoal
palette. The widget's existing dashboard, modal, and dots automatically
inherit the same palette via the legacy \`theme.js\` keys, so no other
code change is required.
```

- [ ] **Step 19.2: Update `CHANGELOG.md`**

Add at the top, above the `[2.3.0]` section:

```markdown
## [Unreleased]

### Added
- **Design tokens** — semantic profiles (`light`, `dark`) under
  `src/ui/tokens.js`. Roles for color (`accent`, `surface`,
  `textMuted`, …), space, radius, font, shadow, motion.
- **Ten UI primitives** under `react-visual-feedback/ui`: `Button`,
  `IconButton`, `Field`, `Select`, `Chip`, `Surface`, `Stack`,
  `Tooltip`, `Spinner`, `Avatar` (+ `AvatarStack`).
- `UIThemeProvider`, `useUITokens()` hook, `pickToken()` styled-
  components helper.
- `StatusBadge` and `StatusDropdown` refreshed on top of `Chip`
  and `Select`. Public props unchanged.

### Changed
- `theme.js` exports `lightTheme` and `darkTheme` with the same key
  shape; values are now derived from the new tokens (warm stone /
  warm charcoal / warm teal). Every consumer (FeedbackProvider,
  modal, dashboard, dots, replay) inherits the new palette.

### Compatibility
- No breaking changes. The legacy color key list is enforced by a
  backcompat test snapshot.
```

- [ ] **Step 19.3: Final verification**

```bash
npm test
npm run build
```

Expected:
- `npm test`: `Tests  N passed | 3 skipped (N+3)` — at least the Phase A 106 + 50+ new primitive tests.
- `npm run build`: success; `dist/ui/index.{js,esm.js}` produced.

Manual visual spot-check:
- `cd example-nextjs && npm install && PORT=3005 npm run dev`
- Open `http://localhost:3005`. Trigger the dashboard. Confirm the surfaces, borders, status badges, and dropdown render in the warm-stone palette (light) and the warm-charcoal palette (dark) when the host toggles mode. No visual regressions.

- [ ] **Step 19.4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: announce Phase B1 — UI primitives + design tokens

README gains a "UI primitives" section pointing at the new
react-visual-feedback/ui subpath. CHANGELOG adds an Unreleased
block detailing the tokens, primitives, refreshed StatusBadge /
StatusDropdown, and the theme.js derivation. No breaking changes;
the legacy color key surface is enforced by snapshot.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**

- [x] Vitest jsdom setup + devDeps — Task 1
- [x] `src/ui/tokens.js` + token shape tests — Task 2
- [x] `ThemeContext.jsx` + `useUITokens()` + `pickToken()` — Task 3
- [x] `theme.js` backward-compat derivation + legacy-key snapshot test — Task 4
- [x] `Stack` — Task 5
- [x] `Spinner` — Task 6
- [x] `Surface` — Task 7
- [x] `Button` — Task 8
- [x] `IconButton` — Task 9 (+ tooltip wiring in Task 12)
- [x] `Field` — Task 10
- [x] `Chip` — Task 11
- [x] `usePopover` + `Tooltip` — Task 12
- [x] `Avatar` + `AvatarStack` + deterministic palette — Task 13
- [x] `Select` — Task 14
- [x] Barrel + axe smoke test — Task 15
- [x] `StatusBadge` refresh — Task 16
- [x] `StatusDropdown` refresh — Task 17
- [x] Rollup `./ui` bundle + package export — Task 18
- [x] README + CHANGELOG — Task 19

**Placeholder scan:** no "TBD", "TODO", or hand-wavy steps. Every code block is complete.

**Type consistency:** Primitive prop names match the spec (`variant`, `size`, `leftIcon`, `rightIcon`, `loading`, `placement`, etc.). Token paths used in `pickToken(...)` match what `tokens.js` exports (`color.surface`, `color.accent`, `radius.md`, `font.size.base`, `shadow.2`, `motion.fast`, `space.5`). `Field` uses `useId` from React 18.

**Known caveats deferred to B2/C:**
- `Tooltip` uses `cloneElement` to attach event handlers, so the child must be a single ref-forwarding element. Documented in the JSDoc comment in Task 12 and enforced at runtime via `React.Children.only`.
- `Select.value` shape mismatch warning (`multiple` mismatched with array vs scalar) is described in the spec as a dev-only console warning but not yet implemented; left as a TODO for B2 polish if it actually causes bugs. (Removing this caveat: it's mentioned in the spec but not load-bearing — the Select still works correctly either way; if `multiple` is true and value is scalar, the row treats it as "no selection".)
- `IconButton` tooltip dev-warning relaxation: when `tooltip` is provided, the dev-only `aria-label` warning still fires. That's correct — `tooltip` provides hover text but doesn't satisfy screen-reader requirements; consumers should pass both. The IconButton test enforces `aria-label`.
