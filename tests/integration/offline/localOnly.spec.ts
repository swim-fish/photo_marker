import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { EMAP5_TILE_URL } from '../../../src/infrastructure/map/emap5';
import {
  isPrecacheCandidate,
  isRuntimeRequestAllowed,
} from '../../../src/infrastructure/pwa/serviceWorkerPolicy';

describe('local-only production boundary', () => {
  test('allows only self assets and an explicitly open consented EMAP5 preview', () => {
    const origin = 'https://photo-marker.example';
    expect(isRuntimeRequestAllowed(`${origin}/assets/app.js`, origin, false)).toBe(true);
    expect(isRuntimeRequestAllowed('https://wmts.nlsc.gov.tw/anything', origin, false)).toBe(false);
    expect(
      isRuntimeRequestAllowed(
        'https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/16/123/456',
        origin,
        true,
      ),
    ).toBe(true);
    expect(isRuntimeRequestAllowed('https://analytics.example/collect', origin, true)).toBe(false);
  });

  test('never treats user photos, share POSTs, blobs, or map tiles as precache candidates', () => {
    expect(isPrecacheCandidate('/assets/app.js')).toBe(true);
    expect(isPrecacheCandidate('/share-target')).toBe(false);
    expect(isPrecacheCandidate('blob:https://photo-marker.example/photo')).toBe(false);
    expect(isPrecacheCandidate('https://wmts.nlsc.gov.tw/wmts/EMAP5/x')).toBe(false);
    expect(isPrecacheCandidate('/drafts/photo-a.jpg')).toBe(false);
  });

  test('keeps the production CSP network boundary explicit', () => {
    const index = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(index).toContain("connect-src 'none'");
    expect(index).toMatch(/img-src[^;]*https:\/\/wmts\.nlsc\.gov\.tw/);
    expect(EMAP5_TILE_URL).toBe(
      'https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/{z}/{y}/{x}',
    );
  });
});
