'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { PermissionFlagsBits } = require('discord.js');
const { PalDefenderApiError } = require('../src/api');
const { createInteractionHandler } = require('../src/index');

const guildId = '234567890123456789';
const config = {
  discordGuildId: guildId,
  allowedUserIds: new Set(),
  allowedRoleIds: new Set(),
  branding: {
    name: 'Palworld *Admin*',
    copyright: null,
    supportUrl: null,
  },
};

function fakeInteraction({ activeGuildId = guildId, command = true } = {}) {
  const calls = [];
  return {
    calls,
    guildId: activeGuildId,
    user: { id: '345678901234567890' },
    member: { roles: [] },
    memberPermissions: {
      has: (permission) => permission === PermissionFlagsBits.Administrator,
    },
    commandName: 'server',
    options: { getSubcommand: () => 'status' },
    deferred: false,
    replied: false,
    inGuild: () => true,
    isChatInputCommand: () => command,
    async reply(payload) {
      this.replied = true;
      calls.push({ operation: 'reply', payload });
    },
    async deferReply(payload) {
      this.deferred = true;
      calls.push({ operation: 'deferReply', payload });
    },
    async editReply(payload) {
      calls.push({ operation: 'editReply', payload });
    },
  };
}

test('rejects an administrator from every guild except the configured one', async () => {
  const interaction = fakeInteraction({ activeGuildId: '456789012345678901' });
  const auditEvents = [];
  const handler = createInteractionHandler({
    config,
    api: { get: async () => assert.fail('API must not be called') },
    auditEvent: (event) => auditEvents.push(event),
  });

  await handler(interaction);

  assert.deepEqual(auditEvents, ['denied']);
  assert.equal(interaction.calls[0].operation, 'reply');
  assert.match(interaction.calls[0].payload.content, /Palworld \\\*Admin\\\*/);
  assert.deepEqual(interaction.calls[0].payload.allowedMentions, { parse: [] });
});

test('executes an authorized command and emits a metadata-only completion audit', async () => {
  const interaction = fakeInteraction();
  const auditEvents = [];
  const handler = createInteractionHandler({
    config,
    api: { get: async () => ({ Version: '1.8.3' }) },
    auditEvent: (event, _interaction, fields) => auditEvents.push({ event, fields }),
  });

  await handler(interaction);

  assert.deepEqual(interaction.calls.map((call) => call.operation), ['deferReply', 'editReply']);
  assert.deepEqual(interaction.calls[1].payload.allowedMentions, { parse: [] });
  assert.equal(auditEvents[0].event, 'command_complete');
  assert.equal(typeof auditEvents[0].fields.durationMs, 'number');
});

test('returns a safe API error without placing its message in audit metadata', async () => {
  const interaction = fakeInteraction();
  const auditEvents = [];
  const handler = createInteractionHandler({
    config,
    api: {
      get: async () => {
        throw new PalDefenderApiError('private *upstream* detail', {
          status: 500,
          code: 'UPSTREAM_FAILURE',
        });
      },
    },
    auditEvent: (event, _interaction, fields) => auditEvents.push({ event, fields }),
  });

  await handler(interaction);

  assert.match(interaction.calls[1].payload.content, /private \\\*upstream\\\* detail/);
  assert.equal(auditEvents[0].event, 'command_failed');
  assert.equal(Object.hasOwn(auditEvents[0].fields, 'message'), false);
});

test('ignores interactions that are not slash commands', async () => {
  const interaction = fakeInteraction({ command: false });
  const handler = createInteractionHandler({ config, api: {} });
  await handler(interaction);
  assert.deepEqual(interaction.calls, []);
});
