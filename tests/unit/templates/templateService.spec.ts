import { describe, expect, it } from 'vitest';
import { sanitizeTemplate, applyTemplate } from '../../../src/domain/templates/templateService';
import { defaultTemplate } from '../../../src/domain/templates/types';
describe('template data isolation', () => {
  it('persists only style fields, never photo content or coordinates', () => {
    const result = sanitizeTemplate({
      ...defaultTemplate,
      photoId: 'private',
      latitude: 25,
      cornerTexts: { 'top-left': 'secret' },
    });
    expect(result).toEqual(defaultTemplate);
    expect(JSON.stringify(result)).not.toMatch(/private|secret|latitude/);
  });
  it('rejects malformed color, text and placement contracts', () => {
    expect(
      sanitizeTemplate({
        ...defaultTemplate,
        appearance: {
          ...defaultTemplate.appearance,
          backgroundColor: { red: 256, green: 1, blue: 1, alpha: 1 },
        },
      }),
    ).toBeNull();
    expect(
      sanitizeTemplate({
        ...defaultTemplate,
        watermark: { ...defaultTemplate.watermark, mode: 'repeat', kind: 'image' },
      }),
    ).toBeNull();
  });
  it('applies appearance while preserving photo location and edited text', () => {
    const current = {
      template: defaultTemplate,
      texts: { label: 'field A' },
      coordinate: { latitude: 25, longitude: 121 },
    };
    const result = applyTemplate({ ...defaultTemplate, name: 'new' }, current);
    expect(result?.texts).toEqual(current.texts);
    expect(result?.coordinate).toEqual(current.coordinate);
    expect(current.template.name).toBe('戶外紀錄');
  });
});

it('stores explicit template corner defaults and applies them without copying photo coordinates', () => {
  const defaults = {
    'top-left': 'Site A',
    'top-right': 'Inspector',
    'bottom-left': '',
    'bottom-right': 'Record',
  };
  const template = { ...defaultTemplate, defaultTexts: defaults };
  const clean = sanitizeTemplate(template);
  expect(clean).toMatchObject({ defaultTexts: defaults });
  const current = {
    template: defaultTemplate,
    texts: { ...defaults, 'top-left': 'Photo text' },
    coordinate: { latitude: 25, longitude: 121 },
  };
  const result = applyTemplate(template, current);
  expect(result?.texts).toEqual(defaults);
  expect(result?.coordinate).toEqual(current.coordinate);
  expect(current.texts['top-left']).toBe('Photo text');
  expect(
    sanitizeTemplate({ ...template, defaultTexts: { ...defaults, 'top-left': 123 } }),
  ).toBeNull();
});

it('persists the wrapping preference and rejects unsupported values', () => {
  expect(sanitizeTemplate({ ...defaultTemplate, coordinateWrap: 'nowrap' })).toMatchObject({
    coordinateWrap: 'nowrap',
  });
  expect(sanitizeTemplate({ ...defaultTemplate, coordinateWrap: 'arbitrary' })).toBeNull();
});
