'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { commandData } = require('../src/commands');
const { deployCommands } = require('../src/deploy-commands');

test('removes global commands before deploying only to the configured guild', async () => {
  const calls = [];
  const messages = [];
  const rest = {
    async put(route, options) {
      calls.push({ route, body: options.body });
      return options.body;
    },
  };
  const config = {
    discordClientId: '123456789012345678',
    discordGuildId: '234567890123456789',
  };

  const installed = await deployCommands({
    config,
    rest,
    log: (message) => messages.push(message),
  });

  assert.deepEqual(calls, [
    { route: '/applications/123456789012345678/commands', body: [] },
    {
      route: '/applications/123456789012345678/guilds/234567890123456789/commands',
      body: commandData,
    },
  ]);
  assert.equal(installed, commandData);
  assert.match(messages[0], /Removed global commands/);
});
