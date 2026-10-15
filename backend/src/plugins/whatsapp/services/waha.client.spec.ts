import { WahaClient } from './waha.client';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('WahaClient', () => {
  const baseOptions = {
    baseUrl: 'https://waha.test/',
    apiKey: 'secret-key',
    session: 'default',
  };

  it('POSTs to /api/sendText with the session, chatId and text', async () => {
    const fetchImpl = jest.fn();
    fetchImpl.mockResolvedValueOnce(jsonResponse([{ name: 'default', status: 'WORKING' }]));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ id: { _serialized: 'MSG1' } }));
    const client = new WahaClient({ ...baseOptions, fetchImpl });

    const result = await client.sendText('6281234567890@c.us', 'hello');

    expect(result).toEqual({ success: true, messageId: 'MSG1' });
    const [url, init] = fetchImpl.mock.calls[1];
    expect(url).toBe('https://waha.test/api/sendText');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Api-Key']).toBe('secret-key');
    expect(JSON.parse(init.body)).toEqual({
      session: 'default',
      chatId: '6281234567890@c.us',
      text: 'hello',
    });
  });

  it('strips a trailing slash from the base URL', async () => {
    const fetchImpl = jest.fn();
    fetchImpl.mockResolvedValueOnce(jsonResponse([{ name: 'default', status: 'WORKING' }]));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ id: 'x' }));
    const client = new WahaClient({ ...baseOptions, baseUrl: 'https://waha.test///', fetchImpl });
    await client.sendText('628@c.us', 'hi');
    expect(fetchImpl.mock.calls[0][0]).toBe('https://waha.test/api/sessions');
    expect(fetchImpl.mock.calls[1][0]).toBe('https://waha.test/api/sendText');
  });

  it('returns failure when the API key is missing', async () => {
    const fetchImpl = jest.fn();
    const client = new WahaClient({ ...baseOptions, apiKey: '', fetchImpl });

    const result = await client.sendText('628@c.us', 'hi');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/API key/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects empty chatId or text', async () => {
    const fetchImpl = jest.fn();
    const client = new WahaClient({ ...baseOptions, fetchImpl });

    expect((await client.sendText('', 'hi')).success).toBe(false);
    expect((await client.sendText('628@c.us', '')).success).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('surfaces the WAHA error message on a non-OK response', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'Session not found' }, 404));
    const client = new WahaClient({ ...baseOptions, fetchImpl });

    const result = await client.sendText('628@c.us', 'hi');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Session not found');
  });

  it('falls back to the HTTP status when the error body is empty', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);
    const client = new WahaClient({ ...baseOptions, fetchImpl });

    const result = await client.sendText('628@c.us', 'hi');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/500/);
  });

  it('never throws on transport failure', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new WahaClient({ ...baseOptions, fetchImpl });

    const result = await client.sendText('628@c.us', 'hi');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/ECONNREFUSED/);
  });

  it('reports a timeout when the request aborts', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchImpl = jest.fn().mockRejectedValue(abortError);
    const client = new WahaClient({ ...baseOptions, fetchImpl, timeoutMs: 10 });

    const result = await client.sendText('628@c.us', 'hi');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/timed out/i);
  });

  it('accepts a plain string message id', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ id: 'PLAIN' }));
    const client = new WahaClient({ ...baseOptions, fetchImpl });
    expect((await client.sendText('628@c.us', 'hi')).messageId).toBe('PLAIN');
  });

  describe('getSessions / isSessionWorking', () => {
    it('returns the session list', async () => {
      const sessions = [{ name: 'default', status: 'WORKING' }];
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(sessions));
      const client = new WahaClient({ ...baseOptions, fetchImpl });

      expect(await client.getSessions()).toEqual(sessions);
    });

    it('is true only when the configured session is WORKING', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(jsonResponse([{ name: 'default', status: 'WORKING' }]));
      expect(await new WahaClient({ ...baseOptions, fetchImpl }).isSessionWorking()).toBe(true);

      const stopped = jest
        .fn()
        .mockResolvedValue(jsonResponse([{ name: 'default', status: 'STOPPED' }]));
      expect(await new WahaClient({ ...baseOptions, fetchImpl: stopped }).isSessionWorking()).toBe(
        false,
      );

      const other = jest
        .fn()
        .mockResolvedValue(jsonResponse([{ name: 'other', status: 'WORKING' }]));
      expect(await new WahaClient({ ...baseOptions, fetchImpl: other }).isSessionWorking()).toBe(
        false,
      );
    });

    it('ignores session-name casing (WAHA reports "Default", config says "default")', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(jsonResponse([{ name: 'Default', status: 'WORKING' }]));
      const client = new WahaClient({ ...baseOptions, fetchImpl });

      expect(await client.isSessionWorking()).toBe(true);
    });

    it('returns an empty list when the request fails', async () => {
      const fetchImpl = jest.fn().mockRejectedValue(new Error('down'));
      const client = new WahaClient({ ...baseOptions, fetchImpl });
      expect(await client.getSessions()).toEqual([]);
    });
  });

  describe('session name resolution', () => {
    it('sends using the casing WAHA actually reports', async () => {
      const fetchImpl = jest.fn();
      // First call: GET /api/sessions
      fetchImpl.mockResolvedValueOnce(
        jsonResponse([{ name: 'Default', status: 'WORKING' }]),
      );
      // Second call: POST /api/sendText
      fetchImpl.mockResolvedValueOnce(jsonResponse({ id: 'M9' }));

      const client = new WahaClient({ ...baseOptions, fetchImpl });
      const result = await client.sendText('628@c.us', 'hi');

      expect(result.success).toBe(true);
      expect(fetchImpl.mock.calls[0][0]).toBe('https://waha.test/api/sessions');
      const body = JSON.parse(fetchImpl.mock.calls[1][1].body);
      expect(body.session).toBe('Default');
    });

    it('prefers an exact match when one exists', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse([{ name: 'default', status: 'WORKING' }]))
        .mockResolvedValueOnce(jsonResponse({ id: 'M1' }));

      const client = new WahaClient({ ...baseOptions, fetchImpl });
      await client.sendText('628@c.us', 'hi');

      expect(JSON.parse(fetchImpl.mock.calls[1][1].body).session).toBe('default');
    });

    it('falls back to the configured name when no session matches', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse([{ name: 'something-else', status: 'WORKING' }]))
        .mockResolvedValueOnce(jsonResponse({ id: 'M1' }));

      const client = new WahaClient({ ...baseOptions, fetchImpl });
      await client.sendText('628@c.us', 'hi');

      expect(JSON.parse(fetchImpl.mock.calls[1][1].body).session).toBe('default');
    });

    it('falls back to the configured name when sessions cannot be listed', async () => {
      const fetchImpl = jest
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(jsonResponse({ id: 'M1' }));

      const client = new WahaClient({ ...baseOptions, fetchImpl });
      await client.sendText('628@c.us', 'hi');

      expect(JSON.parse(fetchImpl.mock.calls[1][1].body).session).toBe('default');
    });

    it('caches the resolved name across sends', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse([{ name: 'Default', status: 'WORKING' }]))
        .mockResolvedValueOnce(jsonResponse({ id: 'M1' }))
        .mockResolvedValueOnce(jsonResponse({ id: 'M2' }));

      const client = new WahaClient({ ...baseOptions, fetchImpl });
      await client.sendText('628@c.us', 'one');
      await client.sendText('628@c.us', 'two');

      // 1 sessions lookup + 2 sends = 3 calls (no second lookup).
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      expect(fetchImpl.mock.calls[2][0]).toBe('https://waha.test/api/sendText');
    });

    it('re-resolves after a failed send (stale cache invalidation)', async () => {
      const fetchImpl = jest
        .fn()
        // send #1: resolve → ok
        .mockResolvedValueOnce(jsonResponse([{ name: 'Default', status: 'WORKING' }]))
        // send #1: rejected
        .mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403))
        // send #2: resolve again
        .mockResolvedValueOnce(jsonResponse([{ name: 'Default', status: 'WORKING' }]))
        // send #2: accepted
        .mockResolvedValueOnce(jsonResponse({ id: 'M1' }));

      const client = new WahaClient({ ...baseOptions, fetchImpl });

      expect((await client.sendText('628@c.us', 'one')).success).toBe(false);
      expect((await client.sendText('628@c.us', 'two')).success).toBe(true);
      expect(fetchImpl.mock.calls[2][0]).toBe('https://waha.test/api/sessions');
    });
  });
});
