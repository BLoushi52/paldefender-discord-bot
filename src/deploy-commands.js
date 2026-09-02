'use strict';

const { REST, Routes } = require('discord.js');
const { commandData } = require('./commands');
const { getConfig } = require('./config');

async function deployCommands({ config = getConfig(), rest, log = console.log } = {}) {
  const client = rest || new REST({ version: '10' }).setToken(config.discordToken);
  const globalRoute = Routes.applicationCommands(config.discordClientId);
  const guildRoute = Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId);

  await client.put(globalRoute, { body: [] });
  const installed = await client.put(guildRoute, { body: commandData });
  log(`Removed global commands and deployed ${installed.length} command groups to guild ${config.discordGuildId}.`);
  return installed;
}

if (require.main === module) {
  deployCommands().catch((error) => {
    console.error(`Command deployment failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { deployCommands };
