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
