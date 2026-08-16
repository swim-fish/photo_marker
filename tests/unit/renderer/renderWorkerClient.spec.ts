import { describe, expect, it, vi } from 'vitest';

import { RenderWorkerClient } from '../../../src/infrastructure/platform/renderWorkerClient';

describe('sequential render worker client', () => {
  it('uses an injected worker without a global Worker and posts only one full-resolution job at a time', async () => {
    const posted: Array<{ id: number }> = [];
    const worker = {
      onmessage: null as ((event: MessageEvent) => void) | null,
      onerror: null as ((event: ErrorEvent) => void) | null,
      postMessage: vi.fn((request: { id: number }) => posted.push(request)),
      terminate: vi.fn(),
    };
    const client = new RenderWorkerClient(() => worker as unknown as Worker);
    const options = { mode: 'export' as const, orientation: 1 as const, overlays: [] };

    const first = client.render(new Blob(['first'], { type: 'image/jpeg' }), options);
    const second = client.render(new Blob(['second'], { type: 'image/jpeg' }), options);
    await Promise.resolve();
    await Promise.resolve();

    expect(posted).toHaveLength(1);
    worker.onmessage?.({
      data: {
        id: posted[0].id,
        result: { ok: false, error: { code: 'encode-failed', message: 'safe' } },
      },
    } as MessageEvent);
    await first;
    await Promise.resolve();

    expect(posted).toHaveLength(2);
    worker.onmessage?.({
      data: {
        id: posted[1].id,
        result: { ok: false, error: { code: 'encode-failed', message: 'safe' } },
      },
    } as MessageEvent);
    await second;
    client.close();

    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
