'use strict';

const dotenv = require('dotenv');

dotenv.config({ quiet: true });

function required(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function csv(value) {
  return new Set(
    (value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function discordId(value, key, { optional = false } = {}) {
  const resolved = value?.trim() || '';
  if (!resolved && optional) return null;
  if (!/^\d{17,20}$/.test(resolved)) {
    throw new Error(`${key} must be a 17-20 digit Discord ID.`);
  }
  return resolved;
}

function boolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  if (/^(1|true|yes)$/i.test(value)) return true;
  if (/^(0|false|no)$/i.test(value)) return false;
  throw new Error(`Expected a boolean value, received: ${value}`);
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
  if (parsedBaseUrl.username || parsedBaseUrl.password || parsedBaseUrl.search || parsedBaseUrl.hash) {
    throw new Error('PALDEFENDER_BASE_URL cannot contain credentials, a query, or a fragment.');
  }

  const allowRemote = boolean(env.PALDEFENDER_ALLOW_REMOTE, false);
  if (!allowRemote && !isLoopback(parsedBaseUrl.hostname)) {
    throw new Error(
      'PALDEFENDER_BASE_URL must use localhost/127.0.0.1 unless PALDEFENDER_ALLOW_REMOTE=true.',
    );
  }

  const timeoutMs = Number.parseInt(env.PALDEFENDER_TIMEOUT_MS || '7000', 10);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new Error('PALDEFENDER_TIMEOUT_MS must be an integer from 1000 to 30000.');
  }

  return Object.freeze({
    discordToken,
    discordClientId: discordId(env.DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID'),
    discordGuildId: discordId(env.DISCORD_GUILD_ID, 'DISCORD_GUILD_ID', { optional: true }),
    allowedUserIds: csv(env.DISCORD_ALLOWED_USER_IDS),
    allowedRoleIds: csv(env.DISCORD_ALLOWED_ROLE_IDS),
    palDefenderBaseUrl: parsedBaseUrl.toString().replace(/\/$/, ''),
    palDefenderToken,
    palDefenderTimeoutMs: timeoutMs,
    branding: Object.freeze({
      name: text(env.BOT_BRAND_NAME, 'Palworld Admin', 'BOT_BRAND_NAME', 80),
      activity: text(env.BOT_ACTIVITY_TEXT, 'Managing Palworld', 'BOT_ACTIVITY_TEXT', 128),
      copyright: text(env.BOT_COPYRIGHT_TEXT, '', 'BOT_COPYRIGHT_TEXT', 200) || null,
      supportUrl: optionalUrl(env.BOT_SUPPORT_URL),
    }),
  });
}

module.exports = { discordId, getConfig, isLoopback };
