'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { PalDefenderApiError, PalDefenderClient } = require('../src/api');

test('sends bearer auth, JSON, query parameters, and parses the response', async () => {
  let captured;
  const api = new PalDefenderClient({
    baseUrl: 'http://127.0.0.1:17993',
    token: 'secret-token',
    fetchImpl: async (url, options) => {
      captured = { url: url.toString(), options };
      return new Response(JSON.stringify({ Success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  const result = await api.request('POST', '/v1/pdapi/example', {
    query: { active: false, ignored: null },
    body: { Message: 'Hello' },
  });

  assert.deepEqual(result, { Success: true });
  assert.equal(captured.url, 'http://127.0.0.1:17993/v1/pdapi/example?active=false');
  assert.equal(captured.options.headers.Authorization, 'Bearer secret-token');
  assert.equal(captured.options.headers['Content-Type'], 'application/json');
  assert.equal(captured.options.body, '{"Message":"Hello"}');
});

test('sends documented bodyless POST requests without JSON headers or a body', async () => {
  let captured;
  const api = new PalDefenderClient({
    baseUrl: 'http://127.0.0.1:17993',
    token: 'secret-token',
    fetchImpl: async (_url, options) => {
      captured = options;
      return new Response('', { status: 200 });
    },
  });

  await api.post('/v1/pdapi/ReloadConfig');

  assert.equal(captured.body, undefined);
  assert.equal(captured.headers['Content-Type'], undefined);
});

test('turns PalDefender error envelopes into typed errors', async () => {
  const api = new PalDefenderClient({
    baseUrl: 'http://127.0.0.1:17993',
    token: 'secret-token',
    fetchImpl: async () => new Response(JSON.stringify({
      Error: { Code: 'PLAYER_NOT_FOUND', Message: 'No player matched.', Details: { id: 'x' } },
    }), { status: 404 }),
  });

  await assert.rejects(
    api.get('/v1/pdapi/player/x'),
    (error) => {
      assert.ok(error instanceof PalDefenderApiError);
      assert.equal(error.status, 404);
      assert.equal(error.code, 'PLAYER_NOT_FOUND');
      assert.deepEqual(error.details, { id: 'x' });
      return true;
    },
  );
});

test('aborts a stalled request at the configured client timeout', async () => {
  const api = new PalDefenderClient({
    baseUrl: 'http://127.0.0.1:17993',
    token: 'secret-token',
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  });

  await assert.rejects(
    api.get('/v1/pdapi/version'),
    (error) => error instanceof PalDefenderApiError && error.code === 'CLIENT_TIMEOUT',
  );
});

test('rejects a response that exceeds the configured byte limit', async () => {
  const api = new PalDefenderClient({
    baseUrl: 'http://127.0.0.1:17993',
    token: 'secret-token',
    maxResponseBytes: 4,
    fetchImpl: async () => new Response('12345', { status: 200 }),
  });

  await assert.rejects(
    api.get('/v1/pdapi/version'),
    (error) => error instanceof PalDefenderApiError && error.code === 'RESPONSE_TOO_LARGE',
  );
});

test('returns plain text for a successful non-JSON response', async () => {
  const api = new PalDefenderClient({
    baseUrl: 'http://127.0.0.1:17993',
    token: 'secret-token',
    fetchImpl: async () => new Response('reloaded', { status: 200 }),
  });

  assert.equal(await api.post('/v1/pdapi/ReloadConfig'), 'reloaded');
});
