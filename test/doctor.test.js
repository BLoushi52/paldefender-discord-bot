'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { runDoctor } = require('../src/doctor');

test('validates the configured guild and reaches the PalDefender version endpoint', async () => {
  const messages = [];
  let request;
  const config = {
    discordClientId: '123456789012345678',
    discordGuildId: '234567890123456789',
    palDefenderBaseUrl: 'http://127.0.0.1:17993',
    palDefenderToken: 'pal-token',
    palDefenderTimeoutMs: 7000,
    palDefenderMaxResponseBytes: 7340032,
    branding: { name: 'Palworld Admin' },
  };

  await runDoctor({
    config,
    log: (message) => messages.push(message),
    fetchImpl: async (url, options) => {
      request = { url: url.toString(), options };
      return new Response(JSON.stringify({ Version: '1.8.3' }), { status: 200 });
    },
  });

  assert.equal(request.url, 'http://127.0.0.1:17993/v1/pdapi/version');
  assert.equal(request.options.headers.Authorization, 'Bearer pal-token');
  assert.ok(messages.includes('Command scope: guild 234567890123456789'));
  assert.ok(messages.includes('Doctor check passed.'));
});
