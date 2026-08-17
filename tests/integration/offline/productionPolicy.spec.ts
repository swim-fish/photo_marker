import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

import { isPrecacheCandidate } from '../../../src/infrastructure/pwa/serviceWorkerPolicy';

let outputDirectory = '';
let indexHtml = '';
let serviceWorker = '';
let assetNames: string[] = [];

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(tmpdir(), 'photo-marker-production-policy-'));
  await build({
    root: process.cwd(),
    configFile: resolve(process.cwd(), 'vite.config.ts'),
    logLevel: 'silent',
    build: { outDir: outputDirectory, emptyOutDir: true },
  });
  indexHtml = await readFile(join(outputDirectory, 'index.html'), 'utf8');
  serviceWorker = await readFile(join(outputDirectory, 'serviceWorker.js'), 'utf8');
  assetNames = await readdir(join(outputDirectory, 'assets'));
}, 30_000);

afterAll(async () => {
  if (outputDirectory) await rm(outputDirectory, { recursive: true, force: true });
});

describe('production local-only policy', () => {
  it('emits the enforced CSP and no runtime CDN, analytics, or server API entrypoint', async () => {
    expect(indexHtml).toContain("connect-src 'none'");
    expect(indexHtml).toMatch(/img-src 'self' blob: data: https:\/\/wmts\.nlsc\.gov\.tw/);
    expect(indexHtml).not.toMatch(/<(?:script|link)[^>]+https?:\/\//i);
    const builtText = await Promise.all(
      assetNames
        .filter((name) => name.endsWith('.js'))
        .map((name) => readFile(join(outputDirectory, 'assets', name), 'utf8')),
    );
    const combined = [indexHtml, serviceWorker, ...builtText].join('\n');
    for (const forbidden of [
      'google-analytics.com',
      'googletagmanager.com',
      'cdn.jsdelivr.net',
      'unpkg.com',
      '/api/upload',
      '/api/photos',
    ]) {
      expect(combined).not.toContain(forbidden);
    }
  });

  it('keeps Leaflet lazy, under budget, and outside the initial document', async () => {
    const initialReferences = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(initialReferences.some((reference) => /leaflet/i.test(reference))).toBe(false);
    const leafletJavaScript = assetNames.find(
      (name) => name.startsWith('leaflet-src-') && name.endsWith('.js'),
    );
    expect(leafletJavaScript).toBeTruthy();
    if (!leafletJavaScript) return;
    const bytes = await readFile(join(outputDirectory, 'assets', leafletJavaScript));
    expect(gzipSync(bytes).byteLength).toBeLessThanOrEqual(60 * 1024);
  });

  it('excludes map tiles and user content from the service-worker shell', () => {
    expect(serviceWorker).not.toContain('GoogleMapsCompatible');
    expect(serviceWorker).not.toContain('wmts.nlsc.gov.tw');
    expect(isPrecacheCandidate('/photos/private-source.png')).toBe(false);
    expect(isPrecacheCandidate('/drafts/private-session')).toBe(false);
    expect(isPrecacheCandidate('https://wmts.nlsc.gov.tw/tile.jpg')).toBe(false);
  });

  it('ships the required font, map, Leaflet, and coordinate notices', async () => {
    const notices = await readFile(resolve(process.cwd(), 'THIRD_PARTY_NOTICES.md'), 'utf8');
    expect(notices).toContain('Noto Sans Traditional Chinese');
    expect(notices).toContain('Leaflet 1.9.4');
    expect(notices).toContain('NLSC EMAP5 external map service');
    expect(notices).toContain('Vendored coordinate core and reference vectors');
  });
});
