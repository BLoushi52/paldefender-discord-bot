'use strict';

const { REST, Routes } = require('discord.js');
const { commandData } = require('./commands');
const { getConfig } = require('./config');

async function deploy() {
  const config = getConfig();
  const rest = new REST({ version: '10' }).setToken(config.discordToken);
  const route = config.discordGuildId
    ? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
    : Routes.applicationCommands(config.discordClientId);

  const installed = await rest.put(route, { body: commandData });
  const scope = config.discordGuildId ? `guild ${config.discordGuildId}` : 'global';
  console.log(`Deployed ${installed.length} command groups to ${scope}.`);
}

deploy().catch((error) => {
  console.error(`Command deployment failed: ${error.message}`);
  process.exitCode = 1;
});
