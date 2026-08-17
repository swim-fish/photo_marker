export type OfflineReadinessResult =
  | Readonly<{ status: 'ready'; workerVersion: string }>
  | Readonly<{
      status: 'not-ready';
      reason:
        | 'insecure-context'
        | 'service-worker-unavailable'
        | 'shell-incomplete'
        | 'database-unavailable';
    }>;

export type WorkerReadinessReport = Readonly<{
  version: string;
  shellComplete: boolean;
}>;

export type OfflineReadinessDependencies = Readonly<{
  isSecureContext: boolean;
  requestWorkerReport: () => Promise<WorkerReadinessReport | null>;
  openDatabase: () => Promise<unknown>;
}>;

export async function establishOfflineReadiness(
  dependencies: OfflineReadinessDependencies,
): Promise<OfflineReadinessResult> {
  if (!dependencies.isSecureContext) return { status: 'not-ready', reason: 'insecure-context' };
  let report: WorkerReadinessReport | null;
  try {
    report = await dependencies.requestWorkerReport();
  } catch {
    return { status: 'not-ready', reason: 'service-worker-unavailable' };
  }
  if (!report) return { status: 'not-ready', reason: 'service-worker-unavailable' };
  if (!report.shellComplete) return { status: 'not-ready', reason: 'shell-incomplete' };
  try {
    await dependencies.openDatabase();
  } catch {
    return { status: 'not-ready', reason: 'database-unavailable' };
  }
  return { status: 'ready', workerVersion: report.version };
}

export async function requestWorkerReadiness(
  serviceWorkers: ServiceWorkerContainer,
  timeoutMs = 3_000,
): Promise<WorkerReadinessReport | null> {
  const registration = await Promise.race([
    serviceWorkers.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
  ]);
  if (!registration) return null;
  const worker = serviceWorkers.controller ?? registration.active;
  if (!worker) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(null), timeoutMs);
    channel.port1.onmessage = (event: MessageEvent<WorkerReadinessReport>) => {
      window.clearTimeout(timeout);
      resolve(event.data);
    };
    worker.postMessage({ type: 'PHOTO_MARKER_READINESS' }, [channel.port2]);
  });
}
