import { describe, expect, test, vi } from 'vitest';

import { handleShareTargetRequest } from '../../../src/infrastructure/pwa/shareTarget';

function shareRequest(files: readonly File[], path = '/share-target'): Request {
  const data = new FormData();
  for (const file of files) data.append('photos', file);
  const request = new Request(`https://photo-marker.example${path}`, { method: 'POST' });
  Object.defineProperty(request, 'formData', { value: async () => data });
  return request;
}

describe('local Web Share Target handler', () => {
  test('persists declared JPEG/PNG fields before returning a local redirect', async () => {
    const order: string[] = [];
    const persist = vi.fn(async (files: readonly File[]) => {
      order.push('persist');
      expect(files.map((file) => file.name)).toEqual(['one.jpg', 'two.png']);
    });
    const request = shareRequest([
      new File(['jpeg'], 'one.jpg', { type: 'image/jpeg' }),
      new File(['png'], 'two.png', { type: 'image/png' }),
    ]);

    const response = await handleShareTargetRequest(request, { persist });
    order.push('response');
    expect(order).toEqual(['persist', 'response']);
    expect(response?.status).toBe(303);
    expect(response?.headers.get('location')).toBe('/');
    expect(persist).toHaveBeenCalledOnce();
  });

  test('ignores non-matching method/path and rejects undeclared fields or MIME types', async () => {
    const persist = vi.fn();
    await expect(
      handleShareTargetRequest(new Request('https://photo-marker.example/share-target'), {
        persist,
      }),
    ).resolves.toBeNull();
    await expect(
      handleShareTargetRequest(
        shareRequest([new File(['gif'], 'bad.gif', { type: 'image/gif' })]),
        { persist },
      ),
    ).resolves.toMatchObject({ status: 415 });
    await expect(
      handleShareTargetRequest(
        shareRequest([new File(['jpeg'], 'one.jpg', { type: 'image/jpeg' })], '/other'),
        { persist },
      ),
    ).resolves.toBeNull();
    expect(persist).not.toHaveBeenCalled();
  });
});
