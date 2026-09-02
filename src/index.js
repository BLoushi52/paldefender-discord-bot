'use strict';

const {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
} = require('discord.js');
const { PalDefenderApiError, PalDefenderClient } = require('./api');
const { isAuthorized } = require('./authorization');
const { executeCommand } = require('./commands');
const { getConfig } = require('./config');
const { errorReply, escapeMarkdown, resultReply } = require('./response');

function audit(event, interaction, fields = {}) {
  const subcommand = interaction.options?.getSubcommand?.(false) || null;
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    discordUserId: interaction.user?.id || null,
    discordGuildId: interaction.guildId || null,
    command: interaction.commandName || null,
    subcommand,
    ...fields,
  }));
}

function createInteractionHandler({ config, api, auditEvent = audit }) {
  return async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!isAuthorized(interaction, config)) {
      auditEvent('denied', interaction);
      await interaction.reply({
        content: `You are not authorized to use ${escapeMarkdown(config.branding.name)} admin commands.`,
        allowedMentions: { parse: [] },
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const startedAt = Date.now();
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await executeCommand(interaction, api);
      await interaction.editReply(resultReply(result, config.branding));
      auditEvent('command_complete', interaction, { durationMs: Date.now() - startedAt });
    } catch (error) {
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorReply(error, config.branding));
        } else {
          await interaction.reply({
            ...errorReply(error, config.branding),
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (replyError) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'error_reply_failed',
          errorType: replyError.name,
          message: replyError.message,
        }));
      }
      auditEvent('command_failed', interaction, {
        durationMs: Date.now() - startedAt,
        errorType: error.name,
        errorCode: error instanceof PalDefenderApiError ? error.code : null,
        httpStatus: error instanceof PalDefenderApiError ? error.status : null,
      });
    }
  };
}

async function main() {
  const config = getConfig();
  const api = new PalDefenderClient({
    baseUrl: config.palDefenderBaseUrl,
    token: config.palDefenderToken,
    timeoutMs: config.palDefenderTimeoutMs,
    maxResponseBytes: config.palDefenderMaxResponseBytes,
  });
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (readyClient) => {
    readyClient.user.setActivity(config.branding.activity, { type: ActivityType.Watching });
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'ready',
      botUser: readyClient.user.tag,
      guildCount: readyClient.guilds.cache.size,
      discordGuildId: config.discordGuildId,
      palDefenderBaseUrl: config.palDefenderBaseUrl,
      brandName: config.branding.name,
    }));
  });

  client.on(Events.InteractionCreate, createInteractionHandler({ config, api }));

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), event: 'shutdown', signal }));
    client.destroy();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  await client.login(config.discordToken);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'startup_failed',
      errorType: error.name,
      message: error.message,
    }));
    process.exitCode = 1;
  });
}

module.exports = { audit, createInteractionHandler, main };
