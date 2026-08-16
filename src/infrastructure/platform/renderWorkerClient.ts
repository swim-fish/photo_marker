import type { Result } from '../../domain/result';
import { failure } from '../../domain/result';
import {
  renderPhoto,
  type RenderPhotoOptions,
  type RenderPhotoValue,
} from '../../renderer/renderPhoto';

export type WorkerRenderOptions = Omit<RenderPhotoOptions, 'resources' | 'workerAvailable'>;

type RenderRequest = Readonly<{
  id: number;
  source: Blob;
  options: WorkerRenderOptions;
}>;

type RenderResponse = Readonly<{
  id: number;
  result: Result<RenderPhotoValue, 'decode-failed' | 'encode-failed'>;
}>;

type Pending = Readonly<{
  resolve: (result: RenderResponse['result']) => void;
}>;

export type RenderWorkerFactory = () => Worker;

function defaultWorkerFactory(): Worker {
  return new Worker(new URL('../../workers/photo-renderer.worker.ts', import.meta.url), {
    type: 'module',
  });
}

export class RenderWorkerClient {
  private worker: Worker | null = null;
  private requestId = 0;
  private tail: Promise<void> = Promise.resolve();
  private readonly pending = new Map<number, Pending>();

  constructor(private readonly workerFactory: RenderWorkerFactory = defaultWorkerFactory) {}

  render(source: Blob, options: WorkerRenderOptions): Promise<RenderResponse['result']> {
    const result = this.tail.then(() => this.performRender(source, options));
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  close(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pending.values()) pending.resolve(failure('encode-failed'));
    this.pending.clear();
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    try {
      const worker = this.workerFactory();
      worker.onmessage = (event: MessageEvent<RenderResponse>) => {
        const pending = this.pending.get(event.data.id);
        if (!pending) return;
        this.pending.delete(event.data.id);
        pending.resolve(event.data.result);
      };
      worker.onerror = () => this.close();
      this.worker = worker;
      return worker;
    } catch {
      return null;
    }
  }

  private performRender(
    source: Blob,
    options: WorkerRenderOptions,
  ): Promise<RenderResponse['result']> {
    const worker = this.ensureWorker();
    if (!worker) return renderPhoto(source, { ...options, workerAvailable: false });
    const id = ++this.requestId;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve });
      const request: RenderRequest = { id, source, options };
      worker.postMessage(request);
    });
  }
}

export function createRenderWorkerClient(factory?: RenderWorkerFactory): RenderWorkerClient {
  return new RenderWorkerClient(factory);
}
