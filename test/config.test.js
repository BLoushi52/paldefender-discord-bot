'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { getConfig, isLoopback } = require('../src/config');

const baseEnv = {
  DISCORD_TOKEN: 'discord-token',
  DISCORD_CLIENT_ID: '12345678901234567',
  PALDEFENDER_TOKEN: 'pal-token',
};

test('defaults PalDefender to same-host loopback and parses allowlists', () => {
  const config = getConfig({
    ...baseEnv,
    DISCORD_ALLOWED_USER_IDS: '1, 2',
    DISCORD_ALLOWED_ROLE_IDS: '3',
  });
  assert.equal(config.palDefenderBaseUrl, 'http://127.0.0.1:17993');
  assert.deepEqual([...config.allowedUserIds], ['1', '2']);
  assert.deepEqual([...config.allowedRoleIds], ['3']);
  assert.deepEqual(config.branding, {
    name: 'Palworld Admin',
    activity: 'Managing Palworld',
    copyright: null,
    supportUrl: null,
  });
});

test('loads configurable branding and validates the support URL', () => {
  const config = getConfig({
    ...baseEnv,
    BOT_BRAND_NAME: 'Friend Server Admin',
    BOT_ACTIVITY_TEXT: 'Protecting Friend Server',
    BOT_COPYRIGHT_TEXT: '© 2026 Friend Community',
    BOT_SUPPORT_URL: 'https://example.com/help',
  });
  assert.deepEqual(config.branding, {
    name: 'Friend Server Admin',
    activity: 'Protecting Friend Server',
    copyright: '© 2026 Friend Community',
    supportUrl: 'https://example.com/help',
  });
  assert.throws(
    () => getConfig({ ...baseEnv, BOT_SUPPORT_URL: 'javascript:alert(1)' }),
    /credential-free http/,
  );
});

test('rejects a remote API URL unless explicitly opted in', () => {
  assert.throws(
    () => getConfig({ ...baseEnv, PALDEFENDER_BASE_URL: 'http://10.0.0.5:17993' }),
    /must use localhost/,
  );
  assert.equal(
    getConfig({
      ...baseEnv,
      PALDEFENDER_BASE_URL: 'http://10.0.0.5:17993',
      PALDEFENDER_ALLOW_REMOTE: 'true',
    }).palDefenderBaseUrl,
    'http://10.0.0.5:17993',
  );
});

test('recognizes IPv4 and IPv6 loopback hosts', () => {
  assert.equal(isLoopback('localhost'), true);
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('[::1]'), true);
  assert.equal(isLoopback('192.168.1.2'), false);
});

test('rejects malformed Discord IDs and token reuse', () => {
  assert.throws(
    () => getConfig({ ...baseEnv, DISCORD_CLIENT_ID: 'not-an-id' }),
    /17-20 digit Discord ID/,
  );
  assert.throws(
    () => getConfig({ ...baseEnv, PALDEFENDER_TOKEN: 'discord-token' }),
    /must be different secrets/,
  );
});
