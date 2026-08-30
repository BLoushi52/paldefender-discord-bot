'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  UserInputError,
  commandData,
  executeCommand,
  parseTargets,
  parseTechnology,
} = require('../src/commands');

function fakeInteraction(commandName, subcommand, values = {}) {
  return {
    commandName,
    options: {
      getSubcommand: () => subcommand,
      getString: (name, required = false) => {
        const value = values[name] ?? null;
        if (required && value === null) throw new Error(`Missing test string: ${name}`);
        return value;
      },
      getInteger: (name, required = false) => {
        const value = values[name] ?? null;
        if (required && value === null) throw new Error(`Missing test integer: ${name}`);
        return value;
      },
      getBoolean: (name) => values[name] ?? null,
    },
  };
}

function fakeApi() {
  const calls = [];
  return {
    calls,
    async get(path, query) {
      calls.push({ method: 'GET', path, query });
      return { ok: true };
    },
    async post(path, body) {
      calls.push({ method: 'POST', path, body });
      return { ok: true };
    },
  };
}

test('registers six groups covering all 27 live endpoints', () => {
  assert.deepEqual(commandData.map((item) => item.name), [
    'server', 'player', 'moderation', 'give', 'technology', 'guild',
  ]);
  assert.equal(commandData.reduce((total, item) => total + item.options.length, 0), 27);
  for (const item of commandData) {
    assert.equal(item.default_member_permissions, '8');
  }
});

test('parses target and technology lists safely', () => {
  assert.deepEqual(parseTargets(' steam_1, gdk_2,steam_1 '), ['steam_1', 'gdk_2']);
  assert.equal(parseTechnology('all'), 'All');
  assert.equal(parseTechnology('Technology_A'), 'Technology_A');
  assert.deepEqual(parseTechnology('Technology_A, Technology_B'), ['Technology_A', 'Technology_B']);
  assert.throws(() => parseTechnology('All, Technology_A'), UserInputError);
});

const cases = [
  ['server', 'status', {}, { method: 'GET', path: '/v1/pdapi/version', query: undefined }],
  ['server', 'broadcast', { message: 'hello' }, { method: 'POST', path: '/v1/pdapi/Broadcast', body: { Message: 'hello' } }],
  ['server', 'alert', { message: 'warning' }, { method: 'POST', path: '/v1/pdapi/Alert', body: { Message: 'warning' } }],
  ['server', 'reload', {}, { method: 'POST', path: '/v1/pdapi/ReloadConfig', body: undefined }],
  ['player', 'list', {}, { method: 'GET', path: '/v1/pdapi/players', query: undefined }],
  ['player', 'info', { player: 'steam_1' }, { method: 'GET', path: '/v1/pdapi/player/steam_1', query: undefined }],
  ['player', 'items', { player: 'steam_1' }, { method: 'GET', path: '/v1/pdapi/items/steam_1', query: undefined }],
  ['player', 'pals', { player: 'steam_1' }, { method: 'GET', path: '/v1/pdapi/pals/steam_1', query: undefined }],
  ['player', 'techs', { player: 'steam_1' }, { method: 'GET', path: '/v1/pdapi/techs/steam_1', query: undefined }],
  ['player', 'progression', { player: 'steam_1' }, { method: 'GET', path: '/v1/pdapi/progression/steam_1', query: undefined }],
  ['player', 'message', { targets: 'steam_1,gdk_2', send_type: 'PlayerChat', message: 'hi' }, {
    method: 'POST', path: '/v1/pdapi/SendPlayerMessage', body: {
      SendType: 'PlayerChat', Message: 'hi', UserIDs: ['steam_1', 'gdk_2'],
    },
  }],
  ['moderation', 'kick', { player: 'steam_1', reason: 'rule' }, {
    method: 'POST', path: '/v1/pdapi/kick/steam_1', body: { Reason: 'rule' },
  }],
  ['moderation', 'ban', { player: 'steam_1', reason: 'rule', ban_resolved_ip: true }, {
    method: 'POST', path: '/v1/pdapi/ban/steam_1', body: { Reason: 'rule', IP: true },
  }],
  ['moderation', 'ban-ip', { ip: '203.0.113.4', reason: 'rule', user_id: 'steam_1' }, {
    method: 'POST', path: '/v1/pdapi/banip/203.0.113.4', body: { Reason: 'rule', UserId: 'steam_1' },
  }],
  ['moderation', 'unban', { user_id: 'steam_1', reason: 'appeal' }, {
    method: 'POST', path: '/v1/pdapi/unban/steam_1', body: { Reason: 'appeal' },
  }],
  ['moderation', 'unban-ip', { ip: '203.0.113.4', reason: 'appeal' }, {
    method: 'POST', path: '/v1/pdapi/unbanip/203.0.113.4', body: { Reason: 'appeal' },
  }],
  ['moderation', 'ban-list', { active: false, user_id: 'steam_1', query: 'test' }, {
    method: 'GET', path: '/v1/pdapi/banlist', query: { active: false, userId: 'steam_1', q: 'test' },
  }],
  ['give', 'item', { player: 'steam_1', item_id: 'Money', count: 10 }, {
    method: 'POST', path: '/v1/pdapi/give/items/steam_1', body: { Items: [{ ItemID: 'Money', Count: 10 }] },
  }],
  ['give', 'pal', { player: 'steam_1', pal_id: 'Foxparks', level: 12 }, {
    method: 'POST', path: '/v1/pdapi/give/pals/steam_1', body: { Pals: [{ PalID: 'Foxparks', Level: 12 }] },
  }],
  ['give', 'pal-template', { player: 'steam_1', template: 'reward.json' }, {
    method: 'POST', path: '/v1/pdapi/give/paltemplate/steam_1', body: { PalTemplates: ['reward.json'] },
  }],
  ['give', 'pal-egg', { player: 'steam_1', egg_id: 'PalEgg_Fire_01', pal_id: 'Foxparks', level: 12 }, {
    method: 'POST', path: '/v1/pdapi/give/paleggs/steam_1', body: {
      PalEggs: [{ EggID: 'PalEgg_Fire_01', PalID: 'Foxparks', Level: 12 }],
    },
  }],
  ['give', 'progression', { player: 'steam_1', exp: 100, relic_type: 'MoveSpeed', relic_amount: 2 }, {
    method: 'POST', path: '/v1/pdapi/give/progression/steam_1', body: { EXP: 100, Relics: { MoveSpeed: 2 } },
  }],
  ['technology', 'learn', { player: 'steam_1', technology: 'Technology_A,Technology_B' }, {
    method: 'POST', path: '/v1/pdapi/learntech/steam_1', body: { Technology: ['Technology_A', 'Technology_B'] },
  }],
  ['technology', 'forget', { player: 'steam_1', technology: 'All' }, {
    method: 'POST', path: '/v1/pdapi/forgettech/steam_1', body: { Technology: 'All' },
  }],
  ['guild', 'list', {}, { method: 'GET', path: '/v1/pdapi/guilds', query: undefined }],
  ['guild', 'info', { guild_id: 'guild/one' }, { method: 'GET', path: '/v1/pdapi/guild/guild%2Fone', query: undefined }],
  ['guild', 'delete-base', { base_camp_id: 'camp-guid', confirm: 'DELETE' }, {
    method: 'POST', path: '/v1/pdapi/deletebase/camp-guid', body: undefined,
  }],
];

test('every endpoint command emits the documented method, path, query, and body shape', async () => {
  assert.equal(cases.length, 27);
  for (const [group, subcommand, values, expected] of cases) {
    const api = fakeApi();
    await executeCommand(fakeInteraction(group, subcommand, values), api);
    assert.deepEqual(api.calls, [expected], `${group} ${subcommand}`);
  }
});

test('requires exact destructive confirmation and valid paired fields', async () => {
  await assert.rejects(
    executeCommand(fakeInteraction('guild', 'delete-base', { base_camp_id: 'x', confirm: 'yes' }), fakeApi()),
    UserInputError,
  );
  await assert.rejects(
    executeCommand(fakeInteraction('give', 'pal-egg', { player: 'x', egg_id: 'egg' }), fakeApi()),
    UserInputError,
  );
  await assert.rejects(
    executeCommand(fakeInteraction('give', 'progression', { player: 'x', relic_type: 'MoveSpeed' }), fakeApi()),
    UserInputError,
  );
});
