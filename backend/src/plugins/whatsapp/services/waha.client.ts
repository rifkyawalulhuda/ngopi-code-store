import { Logger } from '@vendure/core';

const loggerCtx = 'WahaClient';

/** Default request timeout for WAHA calls. */
const DEFAULT_TIMEOUT_MS = 15_000;

/** How long a resolved session name is trusted before re-checking. */
const SESSION_CACHE_TTL_MS = 5 * 60_000;

export interface WahaClientOptions {
  baseUrl: string;
  apiKey: string;
  session: string;
  /** Injectable for testing. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface WahaSendResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

export interface WahaSessionInfo {
  name: string;
  status: string;
  me?: { id?: string; pushName?: string } | null;
}

/**
 * Thin HTTP client for a self-hosted WAHA (WhatsApp HTTP API) instance.
 *
 * Only the two endpoints this project needs are implemented:
 *  - `POST /api/sendText`  — send a plain-text WhatsApp message
 *  - `GET  /api/sessions`  — inspect session status (diagnostics)
 *
 * The client never throws on transport failure: it returns a result object so
 * callers can treat WhatsApp as a best-effort, non-blocking side channel.
 */
export class WahaClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly session: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  /** Session name actually reported by WAHA (may differ in casing). */
  private resolvedSession: string | null = null;
  private resolvedAt = 0;

  constructor(options: WahaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.session = options.session;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Resolves the configured session name against the names WAHA actually
   * reports.
   *
   * WAHA session names are case-sensitive for sending, but the casing is easy to
   * get wrong in config (`default` vs `Default`), and a mismatch surfaces as an
   * opaque `Forbidden`. Matching case-insensitively removes that footgun.
   * Cached briefly, and invalidated on a failed send.
   */
  async resolveSession(): Promise<string> {
    const cacheFresh = this.resolvedSession && Date.now() - this.resolvedAt < SESSION_CACHE_TTL_MS;
    if (cacheFresh) {
      return this.resolvedSession as string;
    }

    const sessions = await this.getSessions();
    if (!sessions.length) {
      // Cannot resolve (offline / bad key) — fall back to the configured name.
      return this.session;
    }

    const exact = sessions.find((s) => s.name === this.session);
    const ci = sessions.find((s) => s.name.toLowerCase() === this.session.toLowerCase());
    const resolved = exact?.name ?? ci?.name ?? this.session;

    this.resolvedSession = resolved;
    this.resolvedAt = Date.now();
    if (resolved !== this.session) {
      Logger.info(
        `Resolved WAHA session "${this.session}" to "${resolved}" (casing differs)`,
        loggerCtx,
      );
    }
    return resolved;
  }

  /** Clears the cached session name so the next call re-resolves it. */
  private invalidateSession(): void {
    this.resolvedSession = null;
    this.resolvedAt = 0;
  }

  /**
   * Sends a text message to a WhatsApp chat.
   *
   * @param chatId WAHA chat id, e.g. `6281234567890@c.us`
   * @param text message body (WhatsApp markdown supported)
   */
  async sendText(chatId: string, text: string): Promise<WahaSendResult> {
    if (!this.apiKey) {
      return { success: false, errorMessage: 'WAHA API key is not configured' };
    }
    if (!chatId || !text) {
      return { success: false, errorMessage: 'chatId and text are required' };
    }

    const session = await this.resolveSession();

    const result = await this.request<WahaSendResult>('/api/sendText', {
      method: 'POST',
      body: JSON.stringify({ session, chatId, text }),
    });

    if (!result.success) {
      // A stale cached name is a plausible cause — drop it for the next attempt.
      this.invalidateSession();
      return result;
    }

    return { success: true, messageId: extractMessageId(result.raw) };
  }

  /** Returns the sessions known to WAHA, for diagnostics / health checks. */
  async getSessions(): Promise<WahaSessionInfo[]> {
    const result = await this.request<WahaSessionInfo[]>('/api/sessions', { method: 'GET' });
    if (!result.success || !Array.isArray(result.raw)) {
      return [];
    }
    return result.raw as WahaSessionInfo[];
  }

  /**
   * True when a session matching the configured name exists and reports
   * `WORKING`. Comparison ignores casing, matching {@link resolveSession}.
   */
  async isSessionWorking(): Promise<boolean> {
    const sessions = await this.getSessions();
    const match = sessions.find(
      (s) => s.name.toLowerCase() === this.session.toLowerCase(),
    );
    return match?.status === 'WORKING';
  }

  private async request<T>(
    path: string,
    init: { method: string; body?: string },
  ): Promise<{ success: boolean; errorMessage?: string; raw?: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: init.body,
        signal: controller.signal,
      });

      const raw = await safeJson(response);

      if (!response.ok) {
        const message =
          (raw as { message?: string } | null)?.message ??
          `WAHA responded with HTTP ${response.status}`;
        Logger.warn(`WAHA request to ${path} failed: ${message}`, loggerCtx);
        return { success: false, errorMessage: message };
      }

      return { success: true, raw };
    } catch (error) {
      const isAbort = (error as Error).name === 'AbortError';
      const message = isAbort
        ? `WAHA request to ${path} timed out after ${this.timeoutMs}ms`
        : `WAHA request to ${path} failed: ${(error as Error).message}`;
      Logger.warn(message, loggerCtx);
      return { success: false, errorMessage: message };
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** WAHA returns `{ id: { _serialized } }` or `{ id: string }` depending on version. */
function extractMessageId(raw: unknown): string | undefined {
  const id = (raw as { id?: unknown } | null)?.id;
  if (typeof id === 'string') return id;
  if (id && typeof id === 'object') {
    const serialized = (id as { _serialized?: string })._serialized;
    if (serialized) return serialized;
  }
  return undefined;
}
