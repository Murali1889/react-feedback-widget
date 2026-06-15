# Feedback Command Center — Phase B1: Visual System & Primitives

Date: 2026-06-15
Status: Approved direction; written spec pending user review
Repository: `react-visual-feedback`
Parent spec: `docs/superpowers/specs/2026-06-15-feedback-command-center-design.md`
Predecessor: `docs/superpowers/specs/2026-06-15-feedback-phase-a-foundation-design.md`

## Summary

Phase B1 lays the visual foundation the rest of the Feedback Command Center redesign depends on. It introduces a semantic design-token system, ten shared UI primitives, refreshes the two existing component-library files (`StatusBadge`, `StatusDropdown`) to use them, and keeps the current `theme.js` public surface working untouched. No behavioural change. No rewrite of the capture modal, dashboard, dots, or replay surfaces — those quietly inherit the new palette through the preserved `theme.js` mapping and migrate to direct token use across Phase B2 and B3.

The guiding constraint from the user: a **soft and approachable** visual character — spacious rhythm, warm stone canvas in light mode, warm charcoal in dark mode, warm teal accent. The token system is built so future cycles can swap accent or canvas without touching consumer code.

## Decisions

These were resolved in brainstorming and are not reopened by B1 implementation.

1. **Phase scope:** Phase B is decomposed into B1 (visual system + primitives), B2 (Command Center shell + Triage list + Evidence Stack + Workflow Panel), and B3 (capture modal rebuild). This spec covers B1 only. Dots and replay alignment ship in C.
2. **Visual character:** Spacious. 14px radius for surfaces (10px for inputs/buttons, 6px for chips), 14.5px base text, generous padding.
3. **Light palette:** Warm stone — `#fcfcfa` page, `#f7f7f3` canvas, `#ffffff` raised surface, `#e7e6df` borders, `#1c1917` text on `#57534e` muted.
4. **Dark palette:** Warm charcoal — `#1c1917` page, `#292524` canvas, `#1f1d1b` raised surface, `#44403c` strong borders, `#fafaf9` text on `#a8a29e` muted.
5. **Accent:** Warm teal — `#0d9488` light / `#2dd4bf` dark. Single accent role across primary action, focus rings, link, selection, priority cue.
6. **Primitive set:** Ten primitives — `Button`, `IconButton`, `Field`, `Select`, `Chip`, `Surface`, `Stack`, `Tooltip`, `Spinner`, `Avatar`. Plus `StatusBadge` and `StatusDropdown` refreshed to use them.
7. **Backward compatibility:** `theme.js` keeps its current public shape; `lightTheme.colors.*` and `darkTheme.colors.*` become aliases derived from the new tokens. No consumer file requires a change in B1.
8. **No version bump in B1 alone.** Phase B1 lands on the same 2.3.x minor as Phase A; a 2.4.0 release happens once B2 ships a user-visible UI change.
9. **Test runner:** Vitest continues. Adds React Testing Library + jsdom for primitive tests, scoped via `environmentMatchGlobs` so Phase A's pure tests stay on the Node environment.
10. **Icons:** Keep `lucide-react` (already a dependency). No icon library swap.

## Non-Goals

1. No rewrite of `FeedbackModal`, `FeedbackDashboard`, `FeedbackDots`, `SessionReplay`, `FeedbackProvider`, `RecordingOverlay`, `MobileTrigger`, `UpdatesModal`. They keep their current internal code and inherit the palette via the preserved `theme.js`.
2. No replacement of `styled-components`. Primitives are styled-components based.
3. No new icon library, no Tailwind, no CSS-in-JS engine swap.
4. No animation library beyond CSS keyframes already defined in `theme.js`.
5. No SSR-specific work. Primitives render correctly in SSR but no `'use server'` directives are added.
6. No mobile-specific primitives (touch handles, drawers). Phase B2/B3/C add as needed.
7. No Storybook, Ladle, or component playground. Tests + the existing example apps provide visual coverage.
8. No web-components export, no themeable Sass build.

## Architecture

### New library modules (`src/ui/`)

```
src/ui/
├── tokens.js                  # semantic token profiles (light, dark)
├── ThemeContext.jsx           # ThemeProvider wrapper + useUITokens()
├── primitives/
│   ├── Button.jsx
│   ├── IconButton.jsx
│   ├── Field.jsx
│   ├── Select.jsx
│   ├── Chip.jsx
│   ├── Surface.jsx
│   ├── Stack.jsx
│   ├── Tooltip.jsx
│   ├── Spinner.jsx
│   ├── Avatar.jsx
│   ├── usePopover.js          # shared positioning logic (Select + Tooltip)
│   └── index.js               # barrel
└── __tests__/
    ├── tokens.test.js         # both profiles export same keys
    ├── Button.test.jsx
    ├── IconButton.test.jsx
    ├── Field.test.jsx
    ├── Select.test.jsx
    ├── Chip.test.jsx
    ├── Surface.test.jsx
    ├── Stack.test.jsx
    ├── Tooltip.test.jsx
    ├── Spinner.test.jsx
    ├── Avatar.test.jsx
    └── theme-backcompat.test.js  # legacy theme.colors keys still map to tokens
```

All `src/ui/` modules import only from `styled-components`, `react`, and other `src/ui/` files. No imports from `src/integrations/`, `src/lib/`, `src/components/`, or top-level components.

### Modified files (additive only)

- `src/theme.js` — gains an internal block that maps every existing `lightTheme.colors.*` / `darkTheme.colors.*` name to the new tokens. The exported objects keep their current shape. Existing animations (`fadeIn`, `slideUp`, etc.) stay.
- `src/components/StatusBadge.jsx` — rewritten on top of `Chip`. Public props (`status`, `customStatuses`, `size`) unchanged.
- `src/components/StatusDropdown.jsx` — rewritten on top of `Select`. Public props (`status`, `onChange`, `customStatuses`, `disabled`) unchanged.
- `vitest.config.js` — adds `environmentMatchGlobs: [['src/ui/**', 'jsdom']]` so primitive tests run in jsdom while Phase A pure tests stay on Node.
- `package.json` — adds `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `axe-core`, `@testing-library/user-event` as devDependencies.
- `rollup.config.js` — adds a build entry for `src/ui/primitives/index.js` → `dist/ui/index.{js,esm.js}`. Adds the `./ui` subpath export to `package.json`.

### What does NOT change

- `src/FeedbackProvider.jsx`, `FeedbackModal.jsx`, `FeedbackDashboard.jsx`, `FeedbackDots.jsx`, `SessionReplay.jsx`, `FeedbackTrigger.jsx`, `MobileTrigger.jsx`, `RecordingOverlay.jsx`, `UpdatesModal.jsx`, `SubmissionQueue.jsx`, `ErrorToast.jsx`, `CanvasOverlay.jsx` — untouched in B1.
- `src/integrations/**`, `src/lib/**` — untouched.
- Existing `__tests__/FeedbackFeatures.test.js` — stays skipped in B1 (it depends on @testing-library/react which arrives in this phase, but un-skipping is a Phase B2 task to keep B1 narrowly scoped).
- All consumer-facing APIs of `FeedbackProvider`, `IntegrationClient`, server adapter — unchanged.

## Token System

Tokens are **semantic**, not chromatic. `tokens.color.surface` (a role) not `tokens.color.white` (a value).

### `src/ui/tokens.js` shape

```js
// Profile = a flat map of role → CSS value, plus nested space/radius/font/shadow/motion.
const sharedScale = {
  space:  { 0: '0', 1: '2px', 2: '4px', 3: '8px', 4: '12px', 5: '16px', 6: '20px', 7: '24px', 8: '32px', 9: '48px', 10: '64px' },
  radius: { sm: '6px', md: '10px', lg: '14px', pill: '999px' },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
    size: { xs: '11.5px', sm: '12.5px', base: '14.5px', md: '16px', lg: '20px' },
    weight: { regular: 400, medium: 500, semibold: 600 },
    lineHeight: { tight: 1.3, base: 1.5 },
  },
  motion: { fast: '120ms', base: '200ms', slow: '320ms', ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
};

export const light = {
  mode: 'light',
  color: {
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
  },
  shadow: {
    0: 'none',
    1: '0 1px 2px rgba(13,148,136,0.18)',
    2: '0 4px 12px rgba(28,25,23,0.06)',
    3: '0 12px 32px rgba(28,25,23,0.12)',
  },
  ...sharedScale,
};

export const dark = {
  mode: 'dark',
  color: {
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
  },
  shadow: {
    0: 'none',
    1: '0 1px 2px rgba(45,212,191,0.24)',
    2: '0 4px 12px rgba(0,0,0,0.32)',
    3: '0 16px 40px rgba(0,0,0,0.48)',
  },
  ...sharedScale,
};

export const tokens = { light, dark };
```

### `color-mix` fallback

`color-mix(in srgb, ...)` has 96%+ browser support but lacks support in older Safari/Firefox. The successBg/warningBg/dangerBg values include a precomputed hex fallback in the `dark` profile (where color-mix would be redundant against a static dark canvas anyway). For the light profile, the tokens module ships both — `color-mix` for modern browsers via CSS, with a `@supports not (color-mix(in srgb, red, blue))` fallback declaration emitted by each primitive's styled-component that uses these tokens.

In practice this is implemented once in a small `tintedBg(token)` helper in `src/ui/tokens.js`:

```js
export const tintedBg = (color, mix = '10%', base = 'var(--bg)') => `
  background-color: ${color};
  @supports (background: color-mix(in srgb, red, blue)) {
    background-color: color-mix(in srgb, ${color} ${mix}, transparent);
  }
`;
```

### `useUITokens()`

```js
import { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { tokens } from './tokens.js';

export function useUITokens() {
  const theme = useContext(ThemeContext);
  return theme?.mode === 'dark' ? tokens.dark : tokens.light;
}
```

Used by primitives that need to read a token outside a styled-component (e.g., for setting an inline `style` value computed from `name`). Styled-components themselves consume tokens via `${({ theme }) => theme.tokens.color.accent}` where `theme.tokens` is the active profile injected by `ThemeContext.jsx`.

### `ThemeContext.jsx`

Wraps styled-components' `ThemeProvider` and merges the active token profile into the theme object so existing `theme.colors.modalBg`-style usage and new `theme.tokens.color.accent` usage coexist:

```jsx
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from '../theme.js';
import { tokens } from './tokens.js';

export function UIThemeProvider({ mode = 'light', children }) {
  const base = mode === 'dark' ? darkTheme : lightTheme;
  const merged = { ...base, tokens: mode === 'dark' ? tokens.dark : tokens.light };
  return <ThemeProvider theme={merged}>{children}</ThemeProvider>;
}
```

`FeedbackProvider` continues to use the existing `ThemeProvider` from styled-components directly in B1. B2 migrates it to `UIThemeProvider`. The split exists so that primitives used standalone (outside `FeedbackProvider`) still get a sensible theme by either inheriting an outer `UIThemeProvider` or falling back to light tokens.

## Primitive Components

Every primitive:
- Default export the component, named export `displayName` for devtools.
- Uses `React.forwardRef` so consumers can attach refs.
- Spreads remaining props onto the root element (`...rest`).
- Reads tokens via `${({ theme }) => theme.tokens.color.foo}` in styled-components.
- Accepts `className` and `style` for escape-hatch overrides.
- A11y by default: focus rings on every interactive element; `aria-` attributes wired from props.

### `Button`

```ts
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}
```

Heights: `sm` 32px, `md` 40px (default), `lg` 48px. Padding `(size === 'sm' ? '0 12px' : size === 'lg' ? '0 22px' : '0 18px')`. Border radius `radius.md`. Font weight 500.

States:
- Hover: variant-specific (primary → `accentHover`, secondary → `canvas` background, ghost → `canvas`, danger → `dangerBg`).
- Focus-visible: 3px `accentRing` outline.
- Active: 2px translate-down feel via `transform: translateY(1px)`.
- Disabled: `opacity: 0.5; cursor: not-allowed; pointer-events: none`.
- Loading: replaces left content with `<Spinner size="sm" />`; button keeps its measured width (no layout jump); sets `aria-busy="true"` and `disabled`.

### `IconButton`

```ts
interface IconButtonProps {
  'aria-label': string;       // required
  icon: ReactNode;            // required
  variant?: 'default' | 'subtle' | 'accent';
  size?: 'sm' | 'md';
  tooltip?: string;           // auto-wraps in Tooltip if provided
  disabled?: boolean;
  active?: boolean;
}
```

Square button: `sm` 28px, `md` 32px. Background per variant. Dev-only `console.error` if `aria-label` is missing or empty. If `tooltip` is provided, internally renders `<Tooltip content={tooltip}><button ... /></Tooltip>`.

### `Field`

```ts
interface FieldProps {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode | boolean;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  // ...all standard input/textarea props except onChange (preserved as-is)
}
```

Layout: label (top, optional, with `*` suffix when `required`), input row (prefix + input/textarea + suffix), helperText OR errorText (bottom, errorText takes precedence). Generates a stable `id` via `useId()`; wires `htmlFor`, `aria-describedby`, and `aria-invalid`.

Multiline mode renders `<textarea>` with `min-height: 80px` and autosize that grows up to 8 lines (`maxRows`).

Prefix/suffix slots accept any node and sit inside the input container at `padding: 0 12px`.

### `Select`

```ts
interface SelectOption<V = string> {
  value: V;
  label: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}
interface SelectProps<V = string> {
  options: SelectOption<V>[];
  value?: V | V[];                    // V[] when multiple
  onChange: (next: V | V[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  align?: 'left' | 'right';           // popover alignment
  width?: string;                     // CSS width of the trigger
  renderTrigger?: (open: boolean, selected: SelectOption | SelectOption[] | null) => ReactNode;
}
```

Trigger is a button styled like an input. Clicking opens a popover anchored below; arrow keys navigate options; Enter selects; Esc closes; Tab cycles. `renderTrigger` lets `StatusDropdown` provide its bespoke trigger UI while reusing the popover behaviour.

`multiple` mode shows checkboxes inside option rows; popover stays open across multi-clicks; Enter on an option toggles selection.

Popover positioning via shared `usePopover` hook. Default alignment `left`, flips to `right` near viewport right edge. Closes on outside click and Esc. Uses a portal so it can escape parent `overflow: hidden`.

### `Chip`

```ts
interface ChipProps {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  dot?: boolean;
  onRemove?: () => void;
  // optional onClick for filter-style chips
}
```

Heights: `sm` 22px, `md` 26px. `dot` adds a 6px filled circle to the left in the variant color. `onRemove` adds an inline 14px close button on the right with `aria-label="Remove ${children}"`. Padding `0 10px` (`md`) or `0 8px` (`sm`).

### `Surface`

```ts
interface SurfaceProps {
  as?: ElementType;            // default 'div'
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'canvas' | 'accentTint';
  interactive?: boolean;
  selected?: boolean;
}
```

Border-first card. Padding values: `sm` 12px, `md` 18px (default), `lg` 24px. Border `1px solid border`. Border-radius `radius.lg`. `tone` swaps the background. `interactive` adds hover (`canvas` background, `borderStrong` border), `cursor: pointer`, keyboard focus styles, `role="button"` (when `interactive` and no other role passed). `selected` outlines the surface with the accent color.

### `Stack`

```ts
interface StackProps {
  as?: ElementType;
  direction?: 'row' | 'column';   // default 'column'
  gap?: keyof typeof tokens.space; // '0' | '1' | ... | '10'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
}
```

Renders `<div style={{ display: 'flex', flexDirection, gap, alignItems, justifyContent, flexWrap }}>`. Pure layout primitive; replaces ad-hoc inline flex styles across the codebase as primitives are adopted.

### `Tooltip`

```ts
interface TooltipProps {
  content: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';   // default 'top'
  delay?: number;             // default 300ms
  children: ReactElement;
}
```

Hovering / focusing the child after `delay` shows the tooltip in a portal anchored to the child's `getBoundingClientRect()`. Hides immediately on `mouseleave`/`blur`/`Esc`. `prefers-reduced-motion` → instant in, instant out, no animation. Uses `usePopover`.

### `Spinner`

```ts
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';     // 12, 16 (default), 20, 28
  label?: string;                        // aria-label, default 'Loading'
  inline?: boolean;                      // display: inline-flex if true
}
```

Conic-gradient circular spinner; CSS-only animation that respects `prefers-reduced-motion` (replaced with a static three-dot pulse).

### `Avatar`

```ts
interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';    // 20, 28, 32 (default), 40
  tone?: 'accent' | 'neutral';         // background color base
}

// Sub-export
interface AvatarStackProps {
  children: ReactNode;
  max?: number;                        // overflow → "+N" tile
  size?: AvatarProps['size'];
}
```

When `src` is provided, renders `<img>` with `onError` falling back to initials. Initials = first letter of first word + first letter of last word (cap 2). Background color derived deterministically by hashing `name` to one of 8 tint tones (computed in `src/ui/primitives/avatar-colors.js`). Text color is the matching `*Text` token.

`AvatarStack` overlaps children with `-8px` margin; if `children.length > max`, slices to `max - 1` and appends a `+N` tile.

## StatusBadge + StatusDropdown Refresh

### `StatusBadge.jsx`

Rewritten internally as a `Chip` with a custom mapping table:

```jsx
const STATUS_TO_VARIANT = {
  new: { variant: 'accent', dot: true },
  open: { variant: 'neutral', dot: true },
  in_progress: { variant: 'warning', dot: true },
  under_review: { variant: 'neutral', dot: true },
  on_hold: { variant: 'neutral', dot: true },
  resolved: { variant: 'success', dot: true },
  closed: { variant: 'neutral', dot: false },
  wont_fix: { variant: 'neutral', dot: false },
};
```

Public props (`status`, `size`, `customStatuses`) unchanged. `customStatuses` lookup falls back to `neutral` variant.

### `StatusDropdown.jsx`

Wraps `Select`. `renderTrigger` produces the badge-styled trigger that current consumers expect. Multi-statuses unchanged. The bespoke popover code is deleted (~120 lines).

## Backward Compatibility

`theme.js` keeps its current export shape. Internally:

```js
import { tokens } from './ui/tokens.js';

const mapToLegacy = (t) => ({
  overlayBg: 'rgba(0, 0, 0, 0.03)',  // unchanged
  backdropBg: 'rgba(0, 0, 0, 0.6)',  // unchanged
  modalBg: t.color.surface,
  modalBorder: t.color.border,
  textPrimary: t.color.text,
  textSecondary: t.color.textMuted,
  textTertiary: t.color.textFaint,
  border: t.color.borderStrong,
  borderFocus: t.color.accent,
  inputBg: t.color.surface,
  inputDisabledBg: t.color.canvas,
  btnCancelBg: t.color.canvas,
  btnCancelHover: t.color.border,
  btnCancelText: t.color.text,
  btnPrimaryBg: t.color.accent,
  btnPrimaryHover: t.color.accentHover,
  btnPrimaryText: '#ffffff',
  btnDisabledBg: t.color.borderStrong,
  // ... every other current key mapped
});

export const lightTheme = { mode: 'light', colors: mapToLegacy(tokens.light) };
export const darkTheme  = { mode: 'dark',  colors: mapToLegacy(tokens.dark)  };
```

A test (`theme-backcompat.test.js`) asserts that every key present in the pre-B1 `lightTheme.colors` shape is still present in the new derived shape. If a key is missing, the test fails, surfacing the gap before consumers break.

Existing animations (`fadeIn`, `slideUp`, `slideDown`, `slideInRight`, `scaleIn`, `spin`, `pulse`, `pulseRing`, `dropdownSlideIn`, `dotPulse`) and `FeedbackGlobalStyle` are exported unchanged.

## Error Handling and Dev Ergonomics

- **Missing ThemeContext fallback.** Primitives import a default light token profile and use it if `theme.tokens` is undefined. They log a one-time `[react-visual-feedback/ui] No ThemeContext detected; falling back to light tokens.` warning per primitive type per session (suppressible via `__suppressUiWarnings`). This makes primitives usable in isolation (e.g., a host using `<Button>` without the FeedbackProvider wrapper).
- **`IconButton` without `aria-label`.** Throws in development (`process.env.NODE_ENV !== 'production'`); silently allows in production to avoid breaking running apps. Same pattern for `Field` without label and without `aria-label`.
- **Token typos.** `useUITokens()` returns the frozen profile object, so a typo like `tokens.color.acent` returns `undefined` and React renders nothing-shaped — visible immediately in dev. No try/catch noise.
- **`Select.value` shape mismatch.** Dev-only warning when `multiple={true}` and `value` is not an array (or vice versa).
- **`Avatar` failed image load.** Silent fallback to initials. No warning (host has no recourse).

## Testing

### Test setup

`vitest.config.js` adds:

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
    coverage: { /* unchanged from Phase A */ },
  },
});
```

`src/ui/__tests__/setup.js`:
```js
import '@testing-library/jest-dom/vitest';
```

devDependencies added:
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`
- `axe-core`

### Required test cases per primitive

- **Render-and-forward-ref**: each primitive renders without crashing and forwards a ref to its root DOM node.
- **Default tokens applied**: rendering under the default ThemeProvider produces the expected `color` / `background-color` / `border-radius` computed styles (verified via `getComputedStyle`).
- **Dark mode swap**: same component re-rendered under `UIThemeProvider mode="dark"` produces dark-token values.
- **Variant matrix**: every variant of `Button`, `Chip`, `Surface`, `IconButton` renders with distinct computed styles.
- **A11y**: every primitive's default render passes `axe-core` with zero violations. Interactive primitives also test keyboard activation (Space/Enter on Button, Esc on Select close, arrow keys on Select navigation).
- **Behavioural**:
  - `Button loading` sets `aria-busy="true"`, replaces children with spinner, preserves width.
  - `IconButton` without `aria-label` throws in dev.
  - `Field` wires `id`, `htmlFor`, `aria-describedby`, `aria-invalid`.
  - `Select` open/close, arrow navigation, selection, multi-select toggling, outside-click close, Esc close.
  - `Chip onRemove` triggers callback.
  - `Surface interactive` is keyboard focusable and Enter/Space activates `onClick`.
  - `Tooltip` show/hide on hover (with delay) and focus.
  - `Avatar` initials fallback when image fails; deterministic background color across two renders.
  - `AvatarStack` overflow renders the `+N` tile correctly.

### Token + theme tests

- `tokens.test.js`: verifies `light` and `dark` profiles export the same key paths (deep walk); verifies every key under `color`, `space`, `radius`, `font`, `shadow`, `motion`; verifies frozen.
- `theme-backcompat.test.js`: imports the current `lightTheme.colors` shape from a baseline JSON snapshot (`src/ui/__tests__/__fixtures__/theme-legacy-keys.json`, generated by reading the current `theme.js` once before refactor and committed alongside it); asserts every key still exists in the post-refactor `lightTheme.colors`.

### Verification commands

- `npm test` — full suite (Node pure tests + jsdom primitive tests).
- `npm run build` — verifies `dist/ui/index.{js,esm.js}` is produced.
- `npm run test:coverage` — reports per-folder coverage; the existing Phase A thresholds remain, and a new threshold `'src/ui/primitives/**': { lines: 95, branches: 90 }` is added.

## Documentation

- README gains a "UI primitives" section under the existing "Secure setup" example with a one-line description per primitive and a link to `src/ui/primitives/index.js` for the import surface:
  ```js
  import { Button, Field, Select, Chip, Surface, Stack, Tooltip, IconButton, Spinner, Avatar }
    from 'react-visual-feedback/ui';
  ```
- CHANGELOG.md adds an unreleased `[2.3.x]` section (the actual version bump happens when B2 ships).

## Scope for First Implementation Plan

The writing-plans skill will break B1 into ordered, independently-testable units. Suggested ordering:

1. Add dev dependencies (`@testing-library/react`, `jest-dom`, `user-event`, `jsdom`, `axe-core`); update `vitest.config.js`.
2. Create `src/ui/tokens.js` and `tokens.test.js`.
3. Create `src/ui/ThemeContext.jsx`.
4. Generate the `__fixtures__/theme-legacy-keys.json` snapshot from current `theme.js`.
5. Refactor `src/theme.js` to derive from `tokens.js`; add `theme-backcompat.test.js`; verify no behavioural change by running existing tests.
6. Implement `Stack` (simplest, foundation for others) + tests.
7. Implement `Spinner` + tests.
8. Implement `Surface` + tests.
9. Implement `Button` + tests.
10. Implement `IconButton` + tests.
11. Implement `Field` + tests.
12. Implement `Chip` + tests.
13. Implement `Avatar` + `AvatarStack` + tests.
14. Implement `usePopover` shared hook + `Tooltip` + tests.
15. Implement `Select` (uses `usePopover`) + tests.
16. Refresh `StatusBadge.jsx` on top of `Chip`; verify existing consumers unchanged.
17. Refresh `StatusDropdown.jsx` on top of `Select`; verify existing consumers unchanged.
18. Update `rollup.config.js` and `package.json` `exports` for the `./ui` subpath.
19. Update README with the primitives section; CHANGELOG; final build + visual spot-check via the example apps.

## Self-Review Notes

- No placeholders remain.
- Phase B1 is foundation only; no behavioural change. The existing capture-modal/dashboard/dots inherit the new palette via `theme.js` derivation.
- All current public APIs preserved (`FeedbackProvider` props, `IntegrationClient` config, server adapter, `lightTheme` / `darkTheme` shape).
- The 10 primitives are each scoped to one file with one clear purpose.
- Token system is semantic; consumers depend on roles, not chromatic values.
- A11y is built into every primitive by default and gated by axe-core in tests.
- Decisions from brainstorming are recorded as Decision items, not buried in prose.
