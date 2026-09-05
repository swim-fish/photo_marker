import { it, expect } from 'vitest';
import { setMapNetworkLease } from '../../../src/infrastructure/map/networkLease';
import { isRuntimeRequestAllowed } from '../../../src/infrastructure/pwa/serviceWorkerPolicy';
it('fails closed without a controlling worker', async () => {
  expect(await setMapNetworkLease(true)).toBe(false);
});
it('rejects tiles outside the common matrix bounds', () => {
  const base = 'https://wmts.nlsc.gov.tw/wmts/EMAP5/default/GoogleMapsCompatible/';
  expect(isRuntimeRequestAllowed(base + '19/0/0', 'https://local', true)).toBe(true);
  expect(isRuntimeRequestAllowed(base + '20/0/0', 'https://local', true)).toBe(false);
  expect(isRuntimeRequestAllowed(base + '0/1/0', 'https://local', true)).toBe(false);
});
