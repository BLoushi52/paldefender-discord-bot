'use strict';

const path = require('node:path');
const dotenv = require('dotenv');
const { MAX_DISCORD_ATTACHMENT_BYTES } = require('./limits');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

function required(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function discordId(value, key) {
  const resolved = value?.trim() || '';
  if (!/^\d{17,20}$/.test(resolved)) {
    throw new Error(`${key} must be a 17-20 digit Discord ID.`);
  }
  return resolved;
}

function discordIdList(value, key) {
  const ids = (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => discordId(item, key));
  return new Set(ids);
}

function boolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  if (/^(1|true|yes)$/i.test(value)) return true;
  if (/^(0|false|no)$/i.test(value)) return false;
  throw new Error(`Expected a boolean value, received: ${value}`);
}

function integer(value, fallback, key, minimum, maximum) {
  const raw = value == null || value === '' ? String(fallback) : String(value);
  if (!/^\d+$/.test(raw.trim())) {
    throw new Error(`${key} must be an integer from ${minimum} to ${maximum}.`);
  }
  const resolved = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(resolved) || resolved < minimum || resolved > maximum) {
    throw new Error(`${key} must be an integer from ${minimum} to ${maximum}.`);
  }
  return resolved;
}

function text(value, fallback, key, maxLength) {
  const resolved = value?.trim() || fallback;
  if (resolved.length > maxLength) {
    throw new Error(`${key} must be ${maxLength} characters or fewer.`);
  }
  if (/[\r\n\0]/.test(resolved)) {
    throw new Error(`${key} cannot contain line breaks or null characters.`);
  }
  return resolved;
}

function optionalUrl(value) {
  const raw = value?.trim();
  if (!raw) return null;

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('BOT_SUPPORT_URL must be a valid http:// or https:// URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('BOT_SUPPORT_URL must be a credential-free http:// or https:// URL.');
  }
  return url.toString();
}

function isLoopback(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
}

function getConfig(env = process.env) {
  const discordToken = required(env, 'DISCORD_TOKEN');
  const palDefenderToken = required(env, 'PALDEFENDER_TOKEN');
  if (discordToken === palDefenderToken) {
    throw new Error('DISCORD_TOKEN and PALDEFENDER_TOKEN must be different secrets.');
  }

  const rawBaseUrl = env.PALDEFENDER_BASE_URL?.trim() || 'http://127.0.0.1:17993';
  let parsedBaseUrl;

  try {
    parsedBaseUrl = new URL(rawBaseUrl);
  } catch {
    throw new Error('PALDEFENDER_BASE_URL must be a valid http:// or https:// URL.');
  }

  if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
    throw new Error('PALDEFENDER_BASE_URL must use http:// or https://.');
  }
  if (
    parsedBaseUrl.username
    || parsedBaseUrl.password
    || parsedBaseUrl.pathname !== '/'
    || parsedBaseUrl.search
    || parsedBaseUrl.hash
  ) {
    throw new Error('PALDEFENDER_BASE_URL must be an origin without credentials, a path, a query, or a fragment.');
  }

  const allowRemote = boolean(env.PALDEFENDER_ALLOW_REMOTE, false);
  const remote = !isLoopback(parsedBaseUrl.hostname);
  if (remote && !allowRemote) {
    throw new Error(
      'PALDEFENDER_BASE_URL must use localhost/127.0.0.1 unless PALDEFENDER_ALLOW_REMOTE=true.',
    );
  }
  if (
    remote
    && parsedBaseUrl.protocol !== 'https:'
    && !boolean(env.PALDEFENDER_ALLOW_INSECURE_REMOTE, false)
  ) {
    throw new Error(
      'Remote PalDefender URLs must use HTTPS unless PALDEFENDER_ALLOW_INSECURE_REMOTE=true.',
    );
  }

  const timeoutMs = integer(env.PALDEFENDER_TIMEOUT_MS, 7000, 'PALDEFENDER_TIMEOUT_MS', 1000, 30000);
  const maxResponseBytes = integer(
    env.PALDEFENDER_MAX_RESPONSE_BYTES,
    MAX_DISCORD_ATTACHMENT_BYTES,
    'PALDEFENDER_MAX_RESPONSE_BYTES',
    1024,
    MAX_DISCORD_ATTACHMENT_BYTES,
  );

  return Object.freeze({
    discordToken,
    discordClientId: discordId(env.DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID'),
    discordGuildId: discordId(env.DISCORD_GUILD_ID, 'DISCORD_GUILD_ID'),
    allowedUserIds: discordIdList(env.DISCORD_ALLOWED_USER_IDS, 'DISCORD_ALLOWED_USER_IDS'),
    allowedRoleIds: discordIdList(env.DISCORD_ALLOWED_ROLE_IDS, 'DISCORD_ALLOWED_ROLE_IDS'),
    palDefenderBaseUrl: parsedBaseUrl.origin,
    palDefenderToken,
    palDefenderTimeoutMs: timeoutMs,
    palDefenderMaxResponseBytes: maxResponseBytes,
    branding: Object.freeze({
      name: text(env.BOT_BRAND_NAME, 'Palworld Admin', 'BOT_BRAND_NAME', 80),
      activity: text(env.BOT_ACTIVITY_TEXT, 'Managing Palworld', 'BOT_ACTIVITY_TEXT', 128),
      copyright: text(env.BOT_COPYRIGHT_TEXT, '', 'BOT_COPYRIGHT_TEXT', 200) || null,
      supportUrl: optionalUrl(env.BOT_SUPPORT_URL),
    }),
  });
}

module.exports = { discordId, discordIdList, getConfig, isLoopback };
