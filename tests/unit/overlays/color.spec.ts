import { describe, expect, it } from 'vitest';
import { parseRgba, rgbaString, hsvToRgba } from '../../../src/domain/overlays/color';
describe('canonical RGBA', () => {
  it('retains one alpha and parses the documented example', () => {
    expect(parseRgba('rgba(24, 53, 47, 0.85)')).toEqual({
      red: 24,
      green: 53,
      blue: 47,
      alpha: 0.85,
    });
    expect(parseRgba(rgbaString({ red: 0, green: 0, blue: 0, alpha: 0 }))?.alpha).toBe(0);
  });
  it('rejects incomplete and invalid channel input without coercion', () => {
    for (const value of ['', 'rgba(,2,3,1)', 'rgba(256,1,1,1)', 'rgba(1.5,2,3,1)', 'rgba(1,2,3,2)'])
      expect(parseRgba(value)).toBeNull();
  });
  it('keeps opacity when changing hue', () => {
    expect(hsvToRgba(0, 100, 100, 0.85)).toEqual({ red: 255, green: 0, blue: 0, alpha: 0.85 });
  });
});
