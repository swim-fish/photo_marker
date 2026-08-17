import type {
  DraftRepository,
  DraftResult,
  DraftSaveSummary,
  DraftSnapshot,
} from '../../infrastructure/storage/draftRepository';

export type DraftServiceRepository = Pick<
  DraftRepository,
  'save' | 'restore' | 'restoreLatest' | 'cleanup'
>;

export type DraftServiceOptions = Readonly<{
  repository: DraftServiceRepository;
  debounceMs?: number;
  onSave?: (result: DraftResult<DraftSaveSummary>) => void;
}>;

/** Coordinates small debounced local saves without owning browser lifecycle event listeners. */
export class DraftService {
  private readonly repository: DraftServiceRepository;
  private readonly debounceMs: number;
  private readonly onSave?: DraftServiceOptions['onSave'];
  private pending: DraftSnapshot | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight: Promise<DraftResult<DraftSaveSummary>> | undefined;

  constructor(options: DraftServiceOptions) {
    this.repository = options.repository;
    this.debounceMs = Math.max(0, options.debounceMs ?? 250);
    this.onSave = options.onSave;
  }

  /** Queue a save after the debounce window; callers flush on pointer-up/visibility/export review. */
  scheduleSave(snapshot: DraftSnapshot): void {
    this.pending = snapshot;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, this.debounceMs);
  }

  queueSave(snapshot: DraftSnapshot): void {
    this.scheduleSave(snapshot);
  }

  async flush(snapshot?: DraftSnapshot): Promise<DraftResult<DraftSaveSummary>> {
    if (snapshot) this.pending = snapshot;
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.inFlight) return this.inFlight;
    if (!this.pending) {
      return { ok: true, value: { sessionId: '', revision: 0, persistenceStatus: 'unknown' } };
    }
    this.inFlight = this.drainPending();
    try {
      return await this.inFlight;
    } finally {
      this.inFlight = undefined;
    }
  }

  private async drainPending(): Promise<DraftResult<DraftSaveSummary>> {
    let result: DraftResult<DraftSaveSummary> = {
      ok: true,
      value: { sessionId: '', revision: 0, persistenceStatus: 'unknown' },
    };
    while (this.pending) {
      const pending = this.pending;
      this.pending = undefined;
      result = await this.repository.save(pending);
      this.onSave?.(result);
    }
    return result;
  }

  async restore(sessionId: string): Promise<DraftResult<DraftSnapshot>> {
    return this.repository.restore(sessionId);
  }

  async restoreLatest(): Promise<DraftResult<DraftSnapshot>> {
    return this.repository.restoreLatest();
  }

  async cleanupAfterExport(sessionId: string): Promise<DraftResult<void>> {
    return this.repository.cleanup(sessionId, 'exported');
  }

  async discard(sessionId: string): Promise<DraftResult<void>> {
    return this.repository.cleanup(sessionId, 'discarded');
  }

  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
  }
}

export function createDraftService(options: DraftServiceOptions): DraftService {
  return new DraftService(options);
}
