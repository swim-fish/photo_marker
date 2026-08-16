import { renderPhoto } from '../renderer/renderPhoto';
import type { WorkerRenderOptions } from '../infrastructure/platform/renderWorkerClient';

type RenderRequest = Readonly<{
  id: number;
  source: Blob;
  options: WorkerRenderOptions;
}>;

const scope = self as unknown as Worker;
let queue: Promise<void> = Promise.resolve();

scope.onmessage = (event: MessageEvent<RenderRequest>) => {
  const request = event.data;
  queue = queue.then(async () => {
    const result = await renderPhoto(request.source, {
      ...request.options,
      workerAvailable: true,
    });
    scope.postMessage({ id: request.id, result });
  });
};
