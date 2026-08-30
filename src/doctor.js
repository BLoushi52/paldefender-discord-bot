'use strict';

const { PalDefenderClient } = require('./api');
const { getConfig } = require('./config');

async function main() {
  const config = getConfig();
  console.log('Configuration: valid');
  console.log(`Discord application: ${config.discordClientId}`);
  console.log(`Command scope: ${config.discordGuildId ? `guild ${config.discordGuildId}` : 'global'}`);
  console.log(`Brand: ${config.branding.name}`);
  console.log(`PalDefender URL: ${config.palDefenderBaseUrl}`);

  const api = new PalDefenderClient({
    baseUrl: config.palDefenderBaseUrl,
    token: config.palDefenderToken,
    timeoutMs: config.palDefenderTimeoutMs,
  });
  const version = await api.get('/v1/pdapi/version');
  console.log(`PalDefender API: reachable (${JSON.stringify(version)})`);
  console.log('Doctor check passed.');
}

main().catch((error) => {
  console.error(`Doctor check failed: ${error.message}`);
  process.exitCode = 1;
});
