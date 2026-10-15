import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Logger, RequestContextService, SearchService } from '@vendure/core';
import { getSearchReindexIntervalHours, isSearchReindexEnabled } from '../../config/search';

const loggerCtx = 'SearchReindex';

/** Guards against starting more than one timer per process. */
let loopStarted = false;

/**
 * Periodically rebuilds the search index.
 *
 * Why a plain interval rather than Vendure's `DefaultSchedulerPlugin`: that
 * plugin registers cron jobs in a process-global registry, which throws
 * "name already taken" when the server and worker are bootstrapped in the same
 * process — the deployment model this project uses (see `src/index.ts`).
 *
 * Each run first flushes queued index updates (cheap), then performs a full
 * rebuild. Both are idempotent. The loop never blocks startup and never throws:
 * a failure is logged and retried on the next tick.
 */
@Injectable()
export class SearchReindexService implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private searchService: SearchService,
    private requestContextService: RequestContextService,
  ) {}

  onApplicationBootstrap(): void {
    if (loopStarted) {
      return;
    }
    if (!isSearchReindexEnabled()) {
      Logger.info('Periodic search reindex disabled', loggerCtx);
      return;
    }

    loopStarted = true;
    const intervalMs = getSearchReindexIntervalHours() * 60 * 60_000;

    this.timer = setInterval(() => {
      void this.reindex().catch((error) => {
        Logger.warn(`Scheduled reindex failed: ${(error as Error).message}`, loggerCtx);
      });
    }, intervalMs);
    // Never keep the process alive solely for this loop.
    this.timer.unref?.();

    Logger.info(
      `Periodic search reindex scheduled (every ${getSearchReindexIntervalHours()}h)`,
      loggerCtx,
    );
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Enqueues a full index rebuild and waits for the job to settle.
   * Exposed so it can be triggered from a script or a test.
   */
  async reindex(): Promise<void> {
    if (this.running) {
      Logger.info('Reindex already in progress, skipping', loggerCtx);
      return;
    }
    this.running = true;
    const startedAt = Date.now();

    try {
      // A RequestContext is required by the service API; this runs outside any
      // request, so one is created for the admin channel.
      const ctx = await this.requestContextService.create({ apiType: 'admin' });
      const job = await this.searchService.reindex(ctx);

      // The worker runs inline in this project, so the job is processed without
      // a separate process. Poll until it settles (bounded).
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        if (job.isSettled) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      Logger.info(
        `Search reindex ${job.isSettled ? 'settled' : 'still running'} ` +
          `in ${Date.now() - startedAt}ms`,
        loggerCtx,
      );
    } catch (error) {
      Logger.warn(`Search reindex failed: ${(error as Error).message}`, loggerCtx);
      throw error;
    } finally {
      this.running = false;
    }
  }
}
