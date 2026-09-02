'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { PalDefenderApiError } = require('../src/api');
const { UserInputError } = require('../src/commands');
const { MAX_DISCORD_ATTACHMENT_BYTES } = require('../src/limits');
const { errorReply, resultReply } = require('../src/response');

const branding = {
  name: 'Friend *Admin*',
  copyright: '© 2026 Friend Community',
  supportUrl: 'https://example.com/help',
};

test('renders configurable branding safely and disables Discord mentions', () => {
  const reply = resultReply(
    { label: 'PalDefender status', data: { Version: '1.2.3' } },
    branding,
  );

  assert.match(reply.content, /Friend \\\*Admin\\\*/);
  assert.match(reply.content, /© 2026 Friend Community/);
  assert.match(reply.content, /Support: <https:\/\/example\.com\/help>/);
  assert.deepEqual(reply.allowedMentions, { parse: [] });
});

test('attaches large results without enabling mentions', () => {
  const reply = resultReply(
    { label: 'Known players', data: { Players: ['x'.repeat(2000)] } },
    branding,
  );

  assert.equal(reply.files.length, 1);
  assert.equal(reply.files[0].name, 'known-players.json');
  assert.ok(Buffer.isBuffer(reply.files[0].attachment));
  assert.deepEqual(reply.allowedMentions, { parse: [] });
});

test('does not construct an attachment above the safe upload limit', () => {
  const reply = resultReply(
    { label: 'Huge response', data: 'x'.repeat(MAX_DISCORD_ATTACHMENT_BYTES) },
    branding,
  );

  assert.equal(reply.files, undefined);
  assert.match(reply.content, /exceeded the safe Discord attachment limit/);
});

test('escapes user and API error messages and disables mentions', () => {
  const rejected = errorReply(new UserInputError('*invalid* @everyone'), branding);
  assert.match(rejected.content, /\\\*invalid\\\*/);
  assert.deepEqual(rejected.allowedMentions, { parse: [] });

  const apiFailure = errorReply(new PalDefenderApiError('*failed* @everyone', {
    status: 400,
    code: 'BAD_*CODE*',
  }), branding);
  assert.match(apiFailure.content, /\\\*failed\\\*/);
  assert.match(apiFailure.content, /BAD\\_\\\*CODE\\\*/);
  assert.deepEqual(apiFailure.allowedMentions, { parse: [] });
});

test('attaches large API error details and hides unexpected error details', () => {
  const apiFailure = errorReply(new PalDefenderApiError('failed', {
    status: 500,
    details: { diagnostic: 'x'.repeat(2000) },
  }), branding);
  assert.equal(apiFailure.files[0].name, 'paldefender-error.json');

  const unexpected = errorReply(new Error('sensitive internal text'), branding);
  assert.doesNotMatch(unexpected.content, /sensitive internal text/);
  assert.deepEqual(unexpected.allowedMentions, { parse: [] });
});
