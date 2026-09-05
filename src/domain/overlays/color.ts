import type { CanonicalColor } from '../templates/types';
export function validColor(value: CanonicalColor): boolean {
  return (
    [value.red, value.green, value.blue].every(
      (channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255,
    ) &&
    Number.isFinite(value.alpha) &&
    value.alpha >= 0 &&
    value.alpha <= 1
  );
}
export function rgbaString(value: CanonicalColor): string {
  return `rgba(${value.red}, ${value.green}, ${value.blue}, ${value.alpha})`;
}
export function parseRgba(input: string): CanonicalColor | null {
  const match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d*\.?\d+)\s*\)$/i.exec(
    input.trim(),
  );
  if (!match) return null;
  const [, red, green, blue, alpha] = match.map(Number);
  const value = { red, green, blue, alpha };
  return validColor(value) ? value : null;
}
export function rgbHex(value: CanonicalColor): string {
  return (
    '#' +
    [value.red, value.green, value.blue]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
  );
}
export function hsvToRgba(
  hue: number,
  saturation: number,
  brightness: number,
  alpha: number,
): CanonicalColor {
  const s = saturation / 100,
    v = brightness / 100;
  const channel = (n: number) => {
    const k = (n + hue / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return { red: channel(5), green: channel(3), blue: channel(1), alpha };
}
export function rgbaToHsv(value: CanonicalColor): {
  hue: number;
  saturation: number;
  brightness: number;
} {
  const r = value.red / 255,
    g = value.green / 255,
    b = value.blue / 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const hue =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d + (g < b ? 6 : 0)) * 60
        : max === g
          ? ((b - r) / d + 2) * 60
          : ((r - g) / d + 4) * 60;
  return { hue, saturation: max === 0 ? 0 : (d / max) * 100, brightness: max * 100 };
}
