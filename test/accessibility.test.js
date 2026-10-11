import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
function property(selector, name) {
  let value;
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    if (!selectors.split(',').map(s => s.trim()).includes(selector)) continue;
    for (const declaration of body.split(';')) {
      const [key, raw] = declaration.split(':');
      if (key?.trim() === name) value = raw.trim();
    }
  }
  assert.ok(value, `${selector} must declare ${name}`);
  return value;
}
function luminance(color) {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex;
  assert.match(full, /^[0-9a-f]{6}$/i);
  const channels = full.match(/../g).map(c => parseInt(c, 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

// Test the actual opaque text palette against WCAG 2.2 SC 1.4.3's 4.5:1
// normal-text threshold. Browser layout and assistive technology remain separate checks.
test('secondary buyer-flow text meets normal-text contrast on its shipped backgrounds', () => {
  for (const [foreground, background] of [
    ['.hint', '.panel'], ['.hint', '.review'], ['.hint', '#payment:not(:empty)'],
    ['.offer small', '.panel'], ['.offer small', '.offer.ineligible'],
    ['.stat-label', '.stats>div'], ['.empty-state', '.panel'],
    ['.events .event-empty', '.panel'], ['.events time', '.panel'], ['footer', ':root']
  ]) {
    const ratio = contrast(property(foreground, 'color'), property(background, 'background'));
    assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}:1, requires 4.5:1`);
  }
});
