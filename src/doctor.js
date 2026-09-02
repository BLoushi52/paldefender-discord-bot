'use strict';

const { PalDefenderClient } = require('./api');
const { getConfig } = require('./config');

async function runDoctor({ config = getConfig(), fetchImpl = globalThis.fetch, log = console.log } = {}) {
  log('Configuration: valid');
  log(`Discord application: ${config.discordClientId}`);
  log(`Command scope: guild ${config.discordGuildId}`);
  log(`Brand: ${config.branding.name}`);
  log(`PalDefender URL: ${config.palDefenderBaseUrl}`);

  const api = new PalDefenderClient({
    baseUrl: config.palDefenderBaseUrl,
    token: config.palDefenderToken,
    timeoutMs: config.palDefenderTimeoutMs,
    maxResponseBytes: config.palDefenderMaxResponseBytes,
    fetchImpl,
  });
  const version = await api.get('/v1/pdapi/version');
  log(`PalDefender API: reachable (${JSON.stringify(version)})`);
  log('Doctor check passed.');
}

if (require.main === module) {
  runDoctor().catch((error) => {
    console.error(`Doctor check failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { runDoctor };
