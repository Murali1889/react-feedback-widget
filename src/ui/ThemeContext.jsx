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
