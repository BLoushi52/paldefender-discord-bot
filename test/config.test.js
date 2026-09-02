'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { MAX_DISCORD_ATTACHMENT_BYTES } = require('../src/limits');
const { getConfig, isLoopback } = require('../src/config');

const baseEnv = {
  DISCORD_TOKEN: 'discord-token',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_GUILD_ID: '234567890123456789',
  PALDEFENDER_TOKEN: 'pal-token',
};

test('defaults PalDefender to same-host loopback and parses validated allowlists', () => {
  const config = getConfig({
    ...baseEnv,
    DISCORD_ALLOWED_USER_IDS: '345678901234567890, 456789012345678901',
    DISCORD_ALLOWED_ROLE_IDS: '567890123456789012',
  });
  assert.equal(config.discordGuildId, baseEnv.DISCORD_GUILD_ID);
  assert.equal(config.palDefenderBaseUrl, 'http://127.0.0.1:17993');
  assert.equal(config.palDefenderMaxResponseBytes, MAX_DISCORD_ATTACHMENT_BYTES);
  assert.deepEqual([...config.allowedUserIds], ['345678901234567890', '456789012345678901']);
  assert.deepEqual([...config.allowedRoleIds], ['567890123456789012']);
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

test('requires HTTPS plus an explicit opt-in for a remote API URL', () => {
  assert.throws(
    () => getConfig({ ...baseEnv, PALDEFENDER_BASE_URL: 'https://10.0.0.5:17993' }),
    /PALDEFENDER_ALLOW_REMOTE=true/,
  );
  assert.throws(
    () => getConfig({
      ...baseEnv,
      PALDEFENDER_BASE_URL: 'http://10.0.0.5:17993',
      PALDEFENDER_ALLOW_REMOTE: 'true',
    }),
    /must use HTTPS/,
  );
  assert.equal(
    getConfig({
      ...baseEnv,
      PALDEFENDER_BASE_URL: 'https://10.0.0.5:17993',
      PALDEFENDER_ALLOW_REMOTE: 'true',
    }).palDefenderBaseUrl,
    'https://10.0.0.5:17993',
  );
  assert.equal(
    getConfig({
      ...baseEnv,
      PALDEFENDER_BASE_URL: 'http://10.0.0.5:17993',
      PALDEFENDER_ALLOW_REMOTE: 'true',
      PALDEFENDER_ALLOW_INSECURE_REMOTE: 'true',
    }).palDefenderBaseUrl,
    'http://10.0.0.5:17993',
  );
});

test('rejects API paths, malformed limits, and invalid allowlist IDs', () => {
  assert.throws(
    () => getConfig({ ...baseEnv, PALDEFENDER_BASE_URL: 'http://127.0.0.1:17993/v1' }),
    /without credentials, a path/,
  );
  assert.throws(
    () => getConfig({ ...baseEnv, PALDEFENDER_TIMEOUT_MS: '7000ms' }),
    /must be an integer/,
  );
  assert.throws(
    () => getConfig({ ...baseEnv, PALDEFENDER_MAX_RESPONSE_BYTES: '7340033' }),
    /must be an integer/,
  );
  assert.throws(
    () => getConfig({ ...baseEnv, DISCORD_ALLOWED_ROLE_IDS: 'not-a-role' }),
    /DISCORD_ALLOWED_ROLE_IDS must be a 17-20 digit Discord ID/,
  );
});

test('recognizes IPv4 and IPv6 loopback hosts', () => {
  assert.equal(isLoopback('localhost'), true);
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('[::1]'), true);
  assert.equal(isLoopback('192.168.1.2'), false);
});

test('requires one guild and rejects malformed IDs and token reuse', () => {
  assert.throws(
    () => getConfig({ ...baseEnv, DISCORD_GUILD_ID: '' }),
    /DISCORD_GUILD_ID must be a 17-20 digit Discord ID/,
  );
  assert.throws(
    () => getConfig({ ...baseEnv, DISCORD_CLIENT_ID: 'not-an-id' }),
    /17-20 digit Discord ID/,
  );
  assert.throws(
    () => getConfig({ ...baseEnv, PALDEFENDER_TOKEN: 'discord-token' }),
    /must be different secrets/,
  );
});
