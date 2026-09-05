import { expect, test } from '../fixtures';
// Exactly one bounded request per layer; no viewport crawl or TLS bypass.
test('checks one real CORS tile for every supported NLSC layer', async ({
  request,
  viewportKind,
}, testInfo) => {
  test.skip(
    viewportKind !== 'desktop' || process.env.RUN_REAL_EMAP5 !== '1',
    'Explicit external-provider release gate.',
  );
  for (const layer of ['EMAP5', 'PHOTO2', 'B5000']) {
    const response = await request.get(
      `https://wmts.nlsc.gov.tw/wmts/${layer}/default/GoogleMapsCompatible/16/28036/54898`,
      { timeout: 15000 },
    );
    await testInfo.attach(`${layer}-status`, {
      body: JSON.stringify({ status: response.status(), headers: response.headers() }),
      contentType: 'application/json',
    });
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toMatch(/^image\/(png|jpeg)/);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
  }
});
